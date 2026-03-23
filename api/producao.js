export default async function handler(req, res){

  try{

    const token = process.env.FEEGOW_TOKEN

    function formatarDataBR(date){
      const d = String(date.getDate()).padStart(2,'0')
      const m = String(date.getMonth()+1).padStart(2,'0')
      const y = date.getFullYear()
      return `${d}-${m}-${y}`
    }

    const inicio = new Date("2025-01-01")
    const hoje = new Date()

    let total = {
      consultas: 0,
      retornos: 0,
      cancelamentos: 0
    }

    const meses = {}

    for(let d = new Date(inicio); d <= hoje; d.setDate(d.getDate()+1)){

      const dataStr = formatarDataBR(d)

      const response = await fetch(
        `https://api.feegow.com/v1/api/appoints/search?data_start=${dataStr}&data_end=${dataStr}`,
        {
          headers:{
            "Content-Type":"application/json",
            "x-access-token":token
          }
        }
      )

      const json = await response.json()
      const lista = json.content || []

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

    }

    return res.status(200).json({
      total,
      meses
    })

  }catch(e){

    console.log("ERRO PRODUÇÃO:", e)

    return res.status(500).json({ erro:"erro interno" })

  }

}
