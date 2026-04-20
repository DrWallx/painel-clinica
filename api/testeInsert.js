import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  )

  const { data, error } = await supabase
    .from("financeiro_consultas")
    .insert([
      {
        paciente_id: 1,
        prontuario: "9999",
        nome: "Valdésio Xavier",
        valor: 300,
        data_consulta: "2025-02-15",
        mes: 2,
        ano: 2025,
        pago: true,
        data_pagamento: "2025-02-15"
      }
    ])

  if (error) {
    return res.status(500).json(error)
  }

  return res.json(data)
}