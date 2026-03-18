import fs from "fs"
import path from "path"

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({})
  }

  try {

    const {
      paciente_id,
      retorno_valido
    } = req.body

    const dbPath = path.join(process.cwd(), "database", "pacientes.json")

    const db = JSON.parse(fs.readFileSync(dbPath))

    if (!db[paciente_id]) {
      db[paciente_id] = {}
    }

    if (retorno_valido !== undefined) {
      db[paciente_id].retorno_valido = retorno_valido
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
