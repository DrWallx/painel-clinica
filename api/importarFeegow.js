import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {

  try {

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    )

    const token = process.env.FEEGOW_TOKEN

    // 🔥 TESTE: 1 dia só
    const dataInicio = "01-02-2025"
    const dataFim = "30-02-2025"

    const url = `https://api.feegow.com/v1/api/appoints/search?data_start=${dataInicio}&data_end=${dataFim}`

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token
      }
    })

    const json = await response.json()

    console.log("FEGOW:", json.content)

    if (!json.content) {
      return res.json({ erro: "Sem dados" })
    }

    // 🔥 FILTRO SIMPLES
    const filtrado = json.content.filter(item => {
      return item.status_id !== 11 // remove cancelados
    })

    console.log("FILTRADO:", filtrado.length)

    // 🔥 CONVERSÃO
    const dados = filtrado.map(item => {

      const [dia, mes, ano] = item.data.split("-")
      const dataFormatada = `${ano}-${mes}-${dia}`

      const valor = Number(
        item.valor_total_agendamento
          .replace("R$", "")
          .replace(".", "")
          .replace(",", ".")
          .trim()
      )

      return {
        paciente_id: item.paciente_id,
        nome: item.paciente_nome || "Sem nome",
        valor: valor,
        data_consulta: dataFormatada,
        mes: Number(mes),
        ano: Number(ano),
        pago: false,
        data_pagamento: null
      }

    })

    const { error } = await supabase
      .from("financeiro_consultas")
      .insert(dados)

    if (error) {
      console.error(error)
      return res.status(500).json(error)
    }

    return res.json({
      sucesso: true,
      inseridos: dados.length
    })

  } catch (err) {
    console.error(err)
    return res.status(500).json(err.message)
  }
}