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
        paciente: "Teste Sistema",
        valor: 150,
        data: "2026-04-19",
        mes: 4,
        ano: 2026,
        status: "pago"
      }
    ])

  if (error) {
    return res.status(500).json(error)
  }

  return res.json(data)
}