import { kv } from "@vercel/kv"

export default async function handler(req, res){

  try{

    const keys = await kv.keys("paciente:*")

    let removidos = []
    let mantidos = []

    for(const key of keys){

      const p = await kv.get(key)

      if(!p){
        continue
      }

      const data = p.data_limite_retorno

      // ❌ CASOS INVÁLIDOS
      const invalido =
        !data ||
        data === "undefined" ||
        typeof data !== "string" ||
        !data.includes("-")

      let dataConvertida = null

      if(!invalido){
        dataConvertida = new Date(data.split("-").reverse().join("-"))
      }

      if(invalido || isNaN(dataConvertida)){

        await kv.del(key)

        removidos.push({
          id: key,
          data: data
        })

      }else{

        mantidos.push({
          id: key,
          data: data
        })

      }

    }

    return res.status(200).json({
      removidos,
      mantidos,
      total_removidos: removidos.length,
      total_mantidos: mantidos.length
    })

  }catch(e){

    return res.status(500).json({ erro: e.message })

  }

}
