import formidable from "formidable"
import fs from "fs"
import { put } from "@vercel/blob"
import { kv } from "@vercel/kv"

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function handler(req, res) {
  try {

    const form = formidable({ multiples: false })

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve({ fields, files })
      })
    })

    const paciente_id = Array.isArray(fields.paciente_id)
      ? fields.paciente_id[0]
      : fields.paciente_id

    let tipo = Array.isArray(fields.tipo)
      ? fields.tipo[0]
      : fields.tipo

    if (!tipo) tipo = "receita"

    const file = Array.isArray(files.file)
      ? files.file[0]
      : files.file

    if (!file) {
      return res.status(400).json({ erro: "Arquivo não enviado" })
    }

    const ext = file.originalFilename
      ? file.originalFilename.split(".").pop()
      : "pdf"

    const nomeArquivo = `${paciente_id}_${Date.now()}.${ext}`

    /* ===================== */
    /* UPLOAD BLOB */
    /* ===================== */

    const blob = await put(
      nomeArquivo,
      fs.createReadStream(file.filepath),
      {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN
      }
    )

    console.log("UPLOAD OK:", blob.url)

    /* ===================== */
    /* KV */
    /* ===================== */

    const key = `paciente:${paciente_id}`

    let data = await kv.get(key) || {}

    // estrutura segura
    data.receitas = Array.isArray(data.receitas) ? data.receitas : []
    data.notas = Array.isArray(data.notas) ? data.notas : []
    data.exames = Array.isArray(data.exames) ? data.exames : []
    data.bio = data.bio || null

    if (tipo === "receita" && !data.receitas.includes(blob.url)) {
      data.receitas.push(blob.url)
    }

    if (tipo === "nota" && !data.notas.includes(blob.url)) {
      data.notas.push(blob.url)
    }

    if (tipo === "exame" && !data.exames.includes(blob.url)) {
      data.exames.push(blob.url)
    }

    
    /* ===================== */
/* 🧠 IA BIOIMPEDANCIA */
/* ===================== */

if (tipo === "bio") {

  try {

    console.log("PROCESSANDO BIOIMPEDANCIA IA...")

    const iaResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                file_url: blob.url
              },
              {
                type: "input_text",
                text: `
Você é um especialista em bioimpedância.

Leia este exame COMPLETO e extraia TODOS os dados possíveis.

Retorne JSON estruturado assim:

{


  "altura": "",
  "sexo": "",
  "data_exame": "",
  "hora_exame": ""
  "peso": "",
  
  "gordura_corporal": "",
  "massa_muscular": "",
  "agua_corporal": "",
  "proteina": "",
  "mineral": "",

  "tmb": "",
  "gasto_energetico": "",
  "idade_metabolica": "",
  "massa_celular": "",

  "imc": "",
  "gordura_visceral": "",
  "rcq": "",

  "agua_intracelular": "",
  "agua_extracelular": "",
  "indice_aec": "",

  "peso_alvo": "",
  "controle_gordura": "",
  "controle_muscular": "",

  "braco_direito": "",
  "braco_esquerdo": "",
  "coxa_direita": "",
  "coxa_esquerda": "",
  "tronco": ""
}

Se algum campo não existir, deixe vazio.
Retorne APENAS JSON válido.


`
              }
            ]
          }
        ]
      })
    })

    const iaData = await iaResponse.json()

    console.log("IA RAW:", iaData)

    // 🔥 VERIFICAR ERRO DA IA
    if (iaData.error) {
      console.log("ERRO IA:", iaData.error.message)
      return res.status(500).json({
        erro: iaData.error.message
      })
    }

    let texto = ""

    if (iaData.output_text) {
      texto = iaData.output_text
    } else if (iaData.output?.length) {
      texto = iaData.output[0]?.content?.[0]?.text || ""
    }

    let dadosBio = {}

    try {
      dadosBio = JSON.parse(texto)
    } catch (e) {
      console.log("ERRO PARSE IA:", texto)
      dadosBio = {}
    }

    console.log("RESULTADO IA:", dadosBio)

   // 🔥 RECARREGA O KV ATUALIZADO
let dataAtual = await kv.get(key) || {}

// 🔥 GARANTE ESTRUTURA
dataAtual.receitas = Array.isArray(dataAtual.receitas) ? dataAtual.receitas : []
dataAtual.exames = Array.isArray(dataAtual.exames) ? dataAtual.exames : []
dataAtual.notas = Array.isArray(dataAtual.notas) ? dataAtual.notas : []

// 🔥 SALVA BIO
dataAtual.bio = dadosBio

console.log("SALVANDO BIO FINAL:", dataAtual)

await kv.set(key, dataAtual)

  } catch (e) {
    console.log("ERRO IA BIO:", e.message)
  }
const final = await kv.get(key)
console.log("SALVO NO KV REAL:", final)
}
    /* ===================== */
    /* ⚠️ REMOVIDO EMAIL AUTOMÁTICO */
    /* ===================== */
    // 🔥 aqui estava o problema
    // agora o envio só acontece via botão

    return res.status(200).json({
      success: true,
      url: blob.url
    })

  } catch (error) {

    console.log("ERRO GERAL:", error)

    return res.status(500).json({
      erro: error.message
    })

  }
}
