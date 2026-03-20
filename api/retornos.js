import fs from "fs"
import path from "path"

export default function handler(req, res){

  const filePath = path.join(process.cwd(), "database", "pacientes.json")

  if(!fs.existsSync(filePath)){
    return res.status(200).json([])
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))

  const hoje = new Date()

  const retornos = data
    .filter(p => p.retorno_valido) // só quem tem direito
    .map(p => {

      let data_limite = p.data_limite_retorno

      // fallback caso não exista (não quebra nada)
      if(!data_limite && p.data_consulta){
        const d = new Date(p.data_consulta)
        d.setDate(d.getDate() + 7)
        data_limite = d
      }

      return {
        id: p.id || p.paciente_id,
        nome: p.nome,
        data_limite_retorno: data_limite
      }

    })
    .filter(p => p.data_limite_retorno) // evita erro no front

  res.status(200).json(retornos)
}
