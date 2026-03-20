import { kv } from "@vercel/kv"

export default async function handler(req, res){

  try{

    const hoje = new Date()

    // 🔥 pega todos os pacientes do KV
    const keys = await kv.keys("paciente:*")

    const listaFinal = []

    for(const key of keys){

      const p = await kv.get(key)

      if(!p) continue

      if(p.retorno_valido != true) continue

      if(!p.data_limite_retorno) continue

      const limite = new Date(p.data_limite_retorno)

      if(limite < hoje) continue

      listaFinal.push({
        id: key.replace("paciente:",""),
        nome: p.nome || "Sem nome",
        data_limite_retorno: limite
      })

    }

    return res.status(200).json(listaFinal)

  }catch(e){

    console.log("ERRO RETORNOS:", e)

    return res.status(500).json({ erro: "erro interno" })

  }

}
