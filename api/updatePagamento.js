import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {

  try {

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    )

    const { id, pago, data_pagamento } = req.body

    const { data, error } = await supabase
      .from("financeiro_consultas")
      .update({
        pago,
        data_pagamento
      })
      .eq("id", id)

    if (error) {
      return res.status(500).json(error)
    }

    return res.json({ sucesso: true, data })

  } catch (err) {
    return res.status(500).json(err.message)
  }
}