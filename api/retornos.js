import fs from "fs"
import path from "path"

export default async function handler(req, res){

  const filePath = path.join(process.cwd(), "database", "pacientes.json")

  if(!fs.existsSync(filePath)){
    return res.status(200).json([])
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))

  const hoje = new Date()

  const pacientesComRetorno = data.filter(p => p.retorno_valido)

  const listaFinal = []

  for(const p of pacientesComRetorno){

    try{

      // 🔴 AQUI você conecta com Feegow
      const response = await fetch(`https://api.feegow.com/v1/paciente/${p.id}`, {
        headers:{
          "Authorization": `Bearer ${process.env.FEEGOW_TOKEN}`
        }
      })

      const feegow = await response.json()

      const data_limite = new Date(feegow.data_retorno) // 🔴 ajustar campo real

      // 👉 NÃO MOSTRAR vencidos
      if(data_limite < hoje) continue

      listaFinal.push({
        id: p.id,
        nome: p.nome,
        data_limite_retorno: data_limite
      })

    }catch(e){
      console.log("Erro Feegow:", e)
    }

  }

  res.status(200).json(listaFinal)
}
