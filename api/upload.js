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

    form.parse(req, async (err, fields, files) => {

      if (err) {
        console.log("ERRO FORM:", err)
        return res.status(500).json({ erro: "Erro no upload" })
      }

      /* ===================== */
      /* CORREÇÃO FIELDS */
      /* ===================== */

      const paciente_id = Array.isArray(fields.paciente_id)
        ? fields.paciente_id[0]
        : fields.paciente_id

      const tipo = Array.isArray(fields.tipo)
        ? fields.tipo[0]
        : fields.tipo

      const file = files.file?.[0]

      if (!file) {
        return res.status(400).json({ erro: "Arquivo não enviado" })
      }

      const nomeArquivo = `${paciente_id}_${tipo}.pdf`

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
      /* SALVAR NO KV */
      /* ===================== */

      try {

        const key = `paciente:${paciente_id}`

        let data = await kv.get(key) || {}

        data[`${tipo}_url`] = blob.url

        await kv.set(key, data)

        console.log("SALVO NO KV:", data)

      } catch (kvError) {

        console.log("ERRO KV:", kvError.message)

      }

      return res.status(200).json({
        success: true,
        url: blob.url
      })

    })

  } catch (error) {

    console.log("ERRO GERAL:", error)

    return res.status(500).json({
      erro: error.message
    })

  }

}
