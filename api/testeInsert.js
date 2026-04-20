import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {

  try {

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    )

    const { data, error } = await supabase
      .from("financeiro_consultas")
      .insert([
        {
          paciente: "Valdésio Xavier",
          prontuario: 9999,
          valor: 300,
          data: "2025-02-15",
          status: "pago",
          data_pagamento: "2025-02-15"
        }
      ])

    if (error) {
      console.error(error)
      return res.status(500).json(error)
    }

    return res.json({
      sucesso: true,
      data
    })

  } catch (err) {
    return res.status(500).json(err.message)
  }
}