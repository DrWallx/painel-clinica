import { kv } from "@vercel/kv"

export default async function handler(req, res){

  try{

    const token = process.env.FEEGOW_TOKEN

    const data_inicio = "01-01-2025"
    const hoje = new Date()

    function formatarDataBR(date){
      const d = String(date.getDate()).padStart(2,'0')
      const m = String(date.getMonth()+1).padStart(2,'0')
      const y = date.getFullYear()
      return `${d}-${m}-${y}`
    }

    const data_fim = formatarDataBR(hoje)

    const response = await fetch(
      `https://api.feegow.com/v1/api/appoints/search?data_start=${data_inicio}&data_end=${data_fim}`,
      {
        headers:{
          "Content-Type":"application/json",
          "x-access-token":token
        }
      }
    )

    const data = await response.json()

    const lista = data.content || []

    let total = {
      consultas: 0,
      retornos: 0,
      cancelamentos: 0
    }

    const meses = {}

    lista.forEach(a => {

      const dataAt = new Date(a.data.split("-").reverse().join("-"))
      const mes = dataAt.toLocaleString('pt-BR',{ month:'short', year:'numeric' })

      if(!meses[mes]){
        meses[mes] = {
          consultas: 0,
          retornos: 0,
          cancelamentos: 0
        }
      }

      // 🔥 lógica
      if(a.status === "Cancelado"){
        total.cancelamentos++
        meses[mes].cancelamentos++
      }
      else if(a.tipo === "Retorno"){
        total.retornos++
        meses[mes].retornos++
      }
      else{
        total.consultas++
        meses[mes].consultas++
      }

    })

    return res.status(200).json({
      total,
      meses
    })

  }catch(e){

    console.log("ERRO PRODUÇÃO:", e)

    return res.status(500).json({ erro:"erro interno" })

  }

}
