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

    // 🔥 TRANSFORMA EM PROMISE (mais estável na Vercel)
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve({ fields, files })
      })
    })

    /* ===================== */
    /* CORREÇÃO FIELDS */
    /* ===================== */

    const paciente_id = Array.isArray(fields.paciente_id)
      ? fields.paciente_id[0]
      : fields.paciente_id

    let tipo = Array.isArray(fields.tipo)
  ? fields.tipo[0]
  : fields.tipo

// 🔥 GARANTE QUE SEMPRE TENHA UM VALOR
if (!tipo) {
  tipo = "receita" // pode usar "receita" como padrão
}

    /* ===================== */
    /* CORREÇÃO FILE */
    /* ===================== */

    const file = Array.isArray(files.file)
      ? files.file[0]
      : files.file

    if (!file) {
      return res.status(400).json({ erro: "Arquivo não enviado" })
    }

    /* ===================== */
    /* EXTENSÃO DINÂMICA */
    /* ===================== */

    const ext = file.originalFilename
      ? file.originalFilename.split(".").pop()
      : "pdf"

    const nomeArquivo = `${paciente_id}_${tipo}.${ext}`

    /* ===================== */
    /* UPLOAD PARA BLOB */
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
    /* SALVAR NO KV */
    /* ===================== */

    try {

      const key = `paciente:${paciente_id}`

      let data = await kv.get(key) || {}

      data[`${tipo}_url`] = blob.url
      console.log("SALVANDO NO KV:", tipo, blob.url)

      let data = await kv.get(key) || {}

console.log("DADOS ANTES:", data)

data[`${tipo}_url`] = blob.url

console.log("SALVANDO NO KV:", tipo, blob.url)

await kv.set(key, data)
      await kv.set(key, data)

      console.log("SALVO NO KV:", data)

    } catch (kvError) {

      console.log("ERRO KV:", kvError.message)

    }

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
