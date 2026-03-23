export default async function handler(req, res){

  try{

    const token = process.env.FEEGOW_TOKEN

    function formatarDataBR(date){
      const d = String(date.getDate()).padStart(2,'0')
      const m = String(date.getMonth()+1).padStart(2,'0')
      const y = date.getFullYear()
      return `${d}-${m}-${y}`
    }

    function ultimoDiaMes(ano, mes){
      return new Date(ano, mes + 1, 0)
    }

    const inicio = new Date(2025, 0, 1)
    const hoje = new Date()

    let total = {
      consultas: 0,
      retornos: 0,
      cancelamentos: 0
    }

    const meses = {}

    let atual = new Date(inicio)

    while(atual <= hoje){

      const ano = atual.getFullYear()
      const mes = atual.getMonth()

      const primeiroDia = new Date(ano, mes, 1)
      const ultimoDia = ultimoDiaMes(ano, mes)

      const data_inicio = formatarDataBR(primeiroDia)
      const data_fim = formatarDataBR(ultimoDia > hoje ? hoje : ultimoDia)

      const response = await fetch(
        `https://api.feegow.com/v1/api/appoints/search?data_start=${data_inicio}&data_end=${data_fim}`,
        {
          headers:{
            "Content-Type":"application/json",
            "x-access-token":token
          }
        }
      )

      const json = await response.json()
      const lista = json.content || []

      const nomeMes = primeiroDia.toLocaleString('pt-BR',{ month:'long', year:'numeric' })

      if(!meses[nomeMes]){
        meses[nomeMes] = {
          consultas: 0,
          retornos: 0,
          cancelamentos: 0
        }
      }

      lista.forEach(a => {

        if(a.status === "Cancelado"){
          total.cancelamentos++
          meses[nomeMes].cancelamentos++
        }
        else if(a.tipo === "Retorno"){
          total.retornos++
          meses[nomeMes].retornos++
        }
        else{
          total.consultas++
          meses[nomeMes].consultas++
        }

      })

      // 🔥 avança mês
      atual.setMonth(atual.getMonth() + 1)

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
