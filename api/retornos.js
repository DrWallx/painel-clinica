import fs from "fs"
import path from "path"

export default function handler(req, res){

  const filePath = path.join(process.cwd(), "database", "pacientes.json")

  if(!fs.existsSync(filePath)){
    return res.status(200).json([])
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))

  const hoje = new Date()

  const listaFinal = data
    .filter(p => p.retorno_valido == true)
    .map(p => {

      if(!p.data_limite_retorno) return null

      const limite = new Date(p.data_limite_retorno)

      if(limite < hoje) return null

      return {
        id: p.id || p.paciente_id,
        nome: p.nome,
        data_limite_retorno: limite
      }

    })
    .filter(p => p !== null)

  return res.status(200).json(listaFinal)
}
