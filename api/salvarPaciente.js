import { kv } from '@vercel/kv'

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({})
  }

  try {

    const {
      nome,
      paciente_id,
      retorno_valido,
      data_limite_retorno,
      receitas,
      exames,
      notas
    } = req.body

    if (!paciente_id) {
      return res.status(400).json({ error: "paciente_id obrigatório" })
    }

    const key = `paciente:${paciente_id}`

    let data = await kv.get(key) || {}

    /* ===================== */
    /* NOME */
    /* ===================== */

    if (nome !== undefined && nome !== "") {
      data.nome = nome
    }

    /* ===================== */
    /* RETORNO */
    /* ===================== */

    if (retorno_valido !== undefined) {
  data.retorno_valido = retorno_valido === true || retorno_valido === "true" || retorno_valido === "on"
}

    if (data_limite_retorno !== undefined) {
  data.data_limite_retorno = data_limite_retorno
  data.dias_limite_retorno = data_limite_retorno // 🔥 mantém compatibilidade
}

    /* ===================== */
    /* LISTAS */
    /* ===================== */

    if (receitas !== undefined) {
      data.receitas = Array.isArray(receitas) ? receitas : []
    }

    if (exames !== undefined) {
      data.exames = Array.isArray(exames) ? exames : []
    }

    if (notas !== undefined) {
      data.notas = Array.isArray(notas) ? notas : []
    }

    /* ===================== */
    /* GARANTE ESTRUTURA */
    /* ===================== */

    if (!data.receitas) data.receitas = []
    if (!data.exames) data.exames = []
    if (!data.notas) data.notas = []

    /* ===================== */
    /* 🔥 HISTÓRICO (NOVO) */
    /* ===================== */

    if (!data.historico) data.historico = []

    const temEnvio =
      (receitas && receitas.length) ||
      (exames && exames.length) ||
      (notas && notas.length)

    if (temEnvio) {

      data.historico.push({
        data: new Date().toISOString(),
        receitas: receitas || [],
        exames: exames || [],
        notas: notas || []
      })

    }

    /* ===================== */
    /* SALVAR */
    /* ===================== */

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
