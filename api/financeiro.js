import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {

  try {

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

    // 🔥 filtro opcional
    const { mes, ano } = req.query

    let query = supabase
      .from("financeiro_consultas")
      .select("*")

    if (mes) query = query.eq("mes", mes)
    if (ano) query = query.eq("ano", ano)

    const { data, error } = await query

    if (error) {
      console.error("Erro Supabase:", error)
      return res.status(500).json(error)
    }

    return res.status(200).json(data)

  } catch (err) {
    console.error("Erro geral:", err)
    return res.status(500).json({
      erro: "Erro interno",
      detalhe: err.message
    })
  }
}