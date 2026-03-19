import { kv } from '@vercel/kv'

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({})
  }

  try {

    const {
      paciente_id,
      retorno_valido,
      receitas,
      exames
    } = req.body

    if (!paciente_id) {
      return res.status(400).json({ error: "paciente_id obrigatório" })
    }

    const key = `paciente:${paciente_id}`

    // 🔥 pega dados atuais
    let data = await kv.get(key) || {}

    // 🔥 NÃO perde dados antigos
    if (retorno_valido !== undefined) {
      data.retorno_valido = retorno_valido
    }

    if (receitas) {
      data.receitas = receitas
    }

    if (exames) {
      data.exames = exames
    }

    await kv.set(key, data)

    console.log("SALVO:", data)

    return res.status(200).json({ success: true })

  } catch (error) {

    console.log("ERRO:", error)

    return res.status(500).json({
      error: error.message
    })

  }

}
