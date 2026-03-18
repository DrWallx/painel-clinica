import formidable from "formidable"
import fs from "fs"
import path from "path"
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

      /* 🔥 SALVAR DIRETO NO BANCO (SEM FETCH) */

      const dbPath = path.join(process.cwd(),"database","pacientes.json")
      const db = JSON.parse(fs.readFileSync(dbPath))

      if(!db[paciente_id]){
        db[paciente_id] = {}
      }

      db[paciente_id][`${tipo}_url`] = blob.url

      fs.writeFileSync(dbPath, JSON.stringify(db,null,2))

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
