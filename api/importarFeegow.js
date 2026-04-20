import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {

  try {

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    )

    const token = process.env.FEEGOW_TOKEN

    // 🔥 TESTE: 1 dia só
    const dataInicio = "19-02-2025"
    const dataFim = "19-02-2025"

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

    // 🔥 FILTRO CORRETO
    const filtrado = json.content.filter(item => {
      return (
        item.procedimento_id === 23 && // 🔥 só consulta
        item.status_id !== 11          // ❌ remove cancelado
      )
    })

    console.log("FILTRADO:", filtrado.length)

    // 🔥 BUSCAR NOMES DOS PACIENTES
    const idsUnicos = [...new Set(filtrado.map(i => i.paciente_id))]

    const pacientesMap = {}

    for (let id of idsUnicos) {

      const resp = await fetch(
        `https://api.feegow.com/v1/api/patient/search?patient_id=${id}`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-access-token": token
          }
        }
      )

      const jsonPaciente = await resp.json()

      pacientesMap[id] = jsonPaciente?.content?.nome || "Sem nome"
    }

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
  prontuario: String(item.paciente_id), // 🔥 AQUI
  nome: pacientesMap[item.paciente_id] || "Sem nome",
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