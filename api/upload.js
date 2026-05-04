const formidable = require("formidable")
const fs = require("fs")
const { put } = require("@vercel/blob")
const { kv } = require("@vercel/kv")

module.exports.config = {
  api: {
    bodyParser: false
  }
}

module.exports = async function handler(req, res) {
  try {

    const form = new formidable.IncomingForm({ multiples: false })

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

    if (!data.bio_arquivos) {
  data.bio_arquivos = {}
}

if (tipo === "bio1") {
  data.bio_arquivos.bio1 = blob.url
}

if (tipo === "bio2") {
  data.bio_arquivos.bio2 = blob.url
}

await kv.set(key, data)

    // estrutura segura
    data.receitas = Array.isArray(data.receitas) ? data.receitas : []
    data.notas = Array.isArray(data.notas) ? data.notas : []
    data.exames = Array.isArray(data.exames) ? data.exames : []
    data.bio = data.bio || {}

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

if (data.bio_arquivos?.bio1 && data.bio_arquivos?.bio2) {

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
              file_url: data.bio_arquivos.bio1
        },
{
  type: "input_file",
  file_url: data.bio_arquivos.bio2
  },

             {
                type: "input_text",
                text: `

                Você está analisando DOIS exames de bioimpedância:

                - Um de composição corporal, e outro de gordura visceral (se houver)
                - Um de gordura visceral (onde tem os gráficos)
                - no quadro de gráficos (Abdominal - Análise Abdominal), extraia somente p NGV (nível de gordura Visceral)

IMPORTANTE:
- Extraia APENAS o valor de gordura visceral.
- NÃO use valores de gráficos ou barras.
- NÃO estime valores.
- NÃO invente números.
- Usar apenas números claramente escritos

Procure especificamente por:

- NGV (nível de gordura visceral)

No exame, o valor correto normalmente é um número inteiro (ex: 7).

Retorne APENAS:

{
  "gordura_visceral": ""
}

Se não encontrar, deixe vazio.

Você está analisando DOIS exames de bioimpedância.

Seu objetivo é extrair dados clínicos e padronizar para os campos abaixo.

━━━━━━━━━━━━━━━━━━━
📌 MAPEAMENTO OBRIGATÓRIO
━━━━━━━━━━━━━━━━━━━

Use estas equivalências:

- massa_muscular:
  • MME
  • Massa muscular esquelética
  • Skeletal muscle mass

- massa_livre_gordura:
  • Massa livre de gordura
  • Fat-free mass

- massa_gorda_kg:
  • Massa de gordura (kg)

- gordura_corporal:
  • Percentual de gordura corporal
  • Body fat %

- pmg:
  • Percentual de massa gorda
  • PMG

- massa_celular:
  • BCM
  • Massa celular corporal

- cintura:
  • Circunferência abdominal
  • Circunferência da cintura

- rcq:
  • Relação cintura-quadril
  • WHR

- gordura_visceral:
  • NGV
  • Nível de gordura visceral

- proteina:
  • Proteína corporal

- mineral:
  • Conteúdo mineral

- tmb:
  • Taxa metabólica basal
  • TMB

- gasto_energetico:
  • Gasto energético total diário

- pontuacao:
  • Pontuação total

- grau_obesidade:
  • Grau de obesidade

- controle_peso:
  • Controle de peso

- controle_gordura:
  • Controle de gordura

- controle_muscular:
  • Controle muscular

━━━━━━━━━━━━━━━━━━━
⚠️ REGRAS CRÍTICAS
━━━━━━━━━━━━━━━━━━━

- NÃO inventar valores
- NÃO usar gráficos
- NÃO converter números
- NÃO usar escalas visuais

- Sempre procurar dados em:
  • tabelas
  • colunas laterais
  • seções segmentares

- NÃO deixar vazio se houver valor visível

━━━━━━━━━━━━━━━━━━━
🎯 PRIORIDADES
━━━━━━━━━━━━━━━━━━━

Para evitar erros:

- massa_muscular → SEMPRE usar MME se existir
- gordura_visceral → usar apenas NGV (valor inteiro, ex: 9)
- NÃO usar:
  • 0.79 (isso é RCQ)
  • 79.7 (erro comum)

━━━━━━━━━━━━━━━━━━━
📦 RETORNO (OBRIGATÓRIO)
━━━━━━━━━━━━━━━━━━━

Retorne JSON válido:

{
  "altura": "",
  "sexo": "",
  "data_exame": "",
  "hora_exame": "",
  "peso": "",

  "gordura_corporal": "",
  "massa_muscular": "",
  "massa_livre_gordura": "",
  "massa_gorda_kg": "",

  "agua_corporal": "",
  "agua_intracelular": "",
  "agua_extracelular": "",
  "indice_aec": "",

  "proteina": "",
  "mineral": "",

  "tmb": "",
  "gasto_energetico": "",
  "idade_metabolica": "",
  "massa_celular": "",

  "imc": "",
  "gordura_visceral": "",
  "rcq": "",
  "cintura": "",
  "pmg": "",
  "grau_obesidade": "",

  "peso_alvo": "",
  "controle_peso": "",
  "controle_gordura": "",
  "controle_muscular": "",

  "pontuacao": "",

  "braco_direito": "",
  "braco_esquerdo": "",
  "coxa_direita": "",
  "coxa_esquerda": "",
  "tronco": ""
}

Se algum campo realmente não existir no exame, deixe vazio.

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
  // 🔥 LIMPA A RESPOSTA DA IA
  texto = texto.replace(/```json/g, "")
  texto = texto.replace(/```/g, "")
  texto = texto.trim()

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
dataAtual.bio = {
  ...(dataAtual.bio || {}),
  ...dadosBio
}

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
