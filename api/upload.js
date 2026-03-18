import formidable from "formidable"
import fs from "fs"
import { put } from "@vercel/blob"

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
        console.log(err)
        return res.status(500).json({ erro: "Erro no upload" })
      }

      const paciente_id = fields.paciente_id
      const tipo = fields.tipo

      const file = files.file[0]

      if (!file) {
        return res.status(400).json({ erro: "Arquivo não enviado" })
      }

      const nomeArquivo = `${paciente_id}_${tipo}.pdf`

      const blob = await put(
        nomeArquivo,
        fs.createReadStream(file.filepath),
        {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN
        }
      )

      /* SALVA URL NO BANCO */

      const baseUrl = process.env.BASE_URL

      await fetch(`${baseUrl}/api/salvarPaciente`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          paciente_id,
          [`${tipo}_url`]: blob.url
        })
      })

      return res.status(200).json({
        success: true,
        url: blob.url
      })

    })

  } catch (error) {

    console.log(error)

    return res.status(500).json({
      erro: error.message
    })

  }

}
