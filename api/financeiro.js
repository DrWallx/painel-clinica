import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {

  console.log("ENV URL:", process.env.SUPABASE_URL)
  console.log("ENV KEY:", process.env.SUPABASE_KEY ? "OK" : "MISSING")

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    return res.status(500).json({
      erro: "ENV não carregada"
    })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  )

  const { data, error } = await supabase
    .from("financeiro_consultas")
    .select("*")

  if (error) {
    return res.status(500).json(error)
  }

  return res.json(data)
}