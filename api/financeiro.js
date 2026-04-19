import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

export default async function handler(req, res) {

  if (req.method === "GET") {

    const { mes, ano } = req.query

    const { data, error } = await supabase
      .from("financeiro_consultas")
      .select("*")
      .eq("mes", mes)
      .eq("ano", ano)
      .order("data_consulta", { ascending: true })

    if (error) return res.status(500).json(error)

    return res.json(data)
  }

  if (req.method === "POST") {

    const body = req.body

    const { error } = await supabase
      .from("financeiro_consultas")
      .upsert({
        agendamento_id: body.agendamento_id,
        paciente_id: body.paciente_id,
        prontuario: body.prontuario,
        nome: body.nome,
        data_consulta: body.data_consulta,
        valor: body.valor,
        mes: body.mes,
        ano: body.ano,
        pago: body.pago,
        data_pagamento: body.data_pagamento
      })

    if (error) return res.status(500).json(error)

    return res.json({ ok: true })
  }

}