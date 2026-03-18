import { kv } from '@vercel/kv'

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({})
  }

  try {

    const {
      paciente_id,
      retorno_valido
    } = req.body

    const key = `paciente:${paciente_id}`

    let data = await kv.get(key) || {}

    if (retorno_valido !== undefined) {
      data.retorno_valido = retorno_valido
    }

    await kv.set(key, data)

    return res.status(200).json({ success: true })

  } catch (error) {

    console.log(error)

    return res.status(500).json({
      error: error.message
    })

  }

}
