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

    const nomeArquivo = `${paciente_id}_${tipo}.${ext}`

    /* ===================== */
    /* UPLOAD */
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
    /* SALVAR KV */
    /* ===================== */

    const key = `paciente:${paciente_id}`

    let data = await kv.get(key) || {}

    data[`${tipo}_url`] = blob.url

    await kv.set(key, data)

    console.log("SALVO NO KV:", data)

    /* ===================== */
    /* 🔥 ENVIO AUTOMÁTICO */
    /* ===================== */

    try {

      const baseUrl = "https://project-dvdik.vercel.app"

      await fetch(`${baseUrl}/api/enviarEmail?paciente_id=${paciente_id}&tipo=${tipo}`)

      console.log("EMAIL ENVIADO AUTOMATICAMENTE")

    } catch (emailError) {

      console.log("ERRO AO ENVIAR EMAIL:", emailError.message)

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
