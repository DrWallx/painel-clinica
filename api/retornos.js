import { kv } from "@vercel/kv"

export default async function handler(req, res){

  try{

    const hoje = new Date()
    hoje.setHours(0,0,0,0) // 🔥 evita erro de horário

    const keys = await kv.keys("paciente:*")

    const listaFinal = []

    for(const key of keys){

      const p = await kv.get(key)

      if(!p) continue

      const retornoAtivo = p.retorno_valido === true || p.retorno_valido === "true"
      if(!retornoAtivo) continue

      if(!p.data_limite_retorno) continue

      let limite = null

      // 🔥 suporta BR (18-04-2026)
      if(
        typeof p.data_limite_retorno === "string" &&
        p.data_limite_retorno.length === 10 &&
        p.data_limite_retorno.includes("-")
      ){
        const [dia, mes, ano] = p.data_limite_retorno.split("-")
        limite = new Date(`${ano}-${mes}-${dia}`)
      }
      // 🔥 suporta ISO (2026-04-19T...)
      else{
        limite = new Date(p.data_limite_retorno)
      }

      // 🔥 proteção total
      if(!limite || isNaN(limite)) continue

      limite.setHours(0,0,0,0) // 🔥 padroniza

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
