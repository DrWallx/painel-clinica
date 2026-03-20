import fs from "fs"
import path from "path"

export default async function handler(req, res){

  const filePath = path.join(process.cwd(), "database", "pacientes.json")

  if(!fs.existsSync(filePath)){
    return res.status(200).json([])
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))

  // 👉 filtra só quem tem retorno ativo no seu sistema
  const pacientesComRetorno = data.filter(p => p.retorno_valido)

  // 👉 aqui você deve integrar com a Feegow
  // (vou deixar estrutura pronta pra você plugar)

  const listaFinal = []

  for(const p of pacientesComRetorno){

    try{

      // 🔹 EXEMPLO (ajustar conforme sua API da Feegow)
      const response = await fetch(`https://api.feegow.com/v1/paciente/${p.id}`, {
        headers:{
          "Authorization": `Bearer ${process.env.FEEGOW_TOKEN}`
        }
      })

      const feegow = await response.json()

      const data_limite = feegow?.data_retorno // 🔴 AJUSTAR NOME DO CAMPO REAL

      if(!data_limite) continue

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
