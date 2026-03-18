import fs from "fs"
import path from "path"

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({})
  }

  try {

    const {
      paciente_id,
      retorno_valido,
      receita_url,
      nota_url
    } = req.body

    const dbPath = path.join(process.cwd(), "database", "pacientes.json")

    const db = JSON.parse(fs.readFileSync(dbPath))

    if (!db[paciente_id]) {
      db[paciente_id] = {}
    }

    if (retorno_valido !== undefined) {
      db[paciente_id].retorno_valido = retorno_valido
    }

    if (receita_url) {
      db[paciente_id].receita_url = receita_url
    }

    if (nota_url) {
      db[paciente_id].nota_url = nota_url
    }

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))

    return res.status(200).json({ success: true })

  } catch (error) {

    console.log(error)

    return res.status(500).json({
      error: error.message
    })

  }

}
