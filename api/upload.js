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

    // 🔥 garante estrutura segura
    data.receitas = Array.isArray(data.receitas) ? data.receitas : []
    data.notas = Array.isArray(data.notas) ? data.notas : []
    data.exames = Array.isArray(data.exames) ? data.exames : []

    // 🔥 salva conforme tipo (sem duplicar)
    if (tipo === "receita" && !data.receitas.includes(blob.url)) {
      data.receitas.push(blob.url)
    }

    if (tipo === "nota" && !data.notas.includes(blob.url)) {
      data.notas.push(blob.url)
    }

    if (tipo === "exame" && !data.exames.includes(blob.url)) {
      data.exames.push(blob.url)
    }

    await kv.set(key, data)

    console.log("SALVO NO KV:", data)

    /* ===================== */
    /* EMAIL AUTOMATICO */
    /* ===================== */

    try {
      const baseUrl = "https://project-dvdik.vercel.app"

      await fetch(`${baseUrl}/api/enviarEmail?paciente_id=${paciente_id}`)

      console.log("EMAIL ENVIADO")

    } catch (e) {
      console.log("ERRO EMAIL:", e.message)
    }

    /* ===================== */
    /* RESPONSE */
    /* ===================== */

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
