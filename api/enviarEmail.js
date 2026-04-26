import { Resend } from 'resend'
import { kv } from '@vercel/kv'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {

  try {

    const { paciente_id, tipo } = req.query

    /* ===================== */
    /* KV DIRETO (BLINDADO) */
    /* ===================== */

    const key = `paciente:${paciente_id}`
    const local = await kv.get(key) || {}

    console.log("KV DIRETO:", local)

  let receitas = []
  let exames = []
  let notas = []

  if (tipo === "receita") {
  receitas = local.receitas?.slice(-1) || []
}

  if (tipo === "exame") {
  exames = local.exames?.slice(-1) || []
}

  if (tipo === "nota") {
  notas = local.notas?.slice(-1) || []
}

  if (tipo === "todos") {
  receitas = local.receitas?.slice(-1) || []
  exames = local.exames?.slice(-1) || []
  notas = local.notas?.slice(-1) || []
}

    /* ===================== */
    /* PACIENTE */
    /* ===================== */

    const baseUrl = "https://project-dvdik.vercel.app"

    const pacienteResponse = await fetch(`${baseUrl}/api/paciente?paciente_id=${paciente_id}`)
    const paciente = await pacienteResponse.json()

    const emailPaciente = paciente.email

    console.log("EMAIL PACIENTE:", emailPaciente)

    /* ===================== */
    /* HTML (NOVO PREMIUM) */
    /* ===================== */

    let html = `
    <div style="font-family:Arial;max-width:600px;margin:auto;background:#ffffff;padding:20px;border-radius:10px">

    <div style="text-align:center;margin-bottom:20px">
  <img src="https://project-dvdik.vercel.app/Email%20Signature%20Logo.png"
       alt="Clínica Haux"
       style="max-width:180px;">
</div>

    <p>Olá <b>${paciente.nome}</b>,</p>

    <p>Seus documentos estão disponíveis abaixo:</p> Não se preocupe é link seguro!
    `

    if (receitas.length) {
      html += `<h3 style="margin-top:20px">📄 Receitas</h3>`
      receitas.forEach(url => {
        html += `
        <a href="${url}" style="
        display:block;
        margin:10px 0;
        padding:12px;
        background:#3b82f6;
        color:white;
        text-decoration:none;
        border-radius:6px;
        text-align:center;
        font-weight:bold;
        ">
        📄 Baixar Receita
        </a>`
      })
    }

    if (exames.length) {
      html += `<h3 style="margin-top:20px">🧪 Exames</h3>`
      exames.forEach(url => {
        html += `
        <a href="${url}" style="
        display:block;
        margin:10px 0;
        padding:12px;
        background:#6366f1;
        color:white;
        text-decoration:none;
        border-radius:6px;
        text-align:center;
        font-weight:bold;
        ">
        🧪 Ver Exame
        </a>`
      })
    }

    if (notas.length) {
      html += `
      <h3 style="margin-top:20px">🧾 Nota Fiscal</h3>

      <p style="margin-bottom:10px">
      Sua nota fiscal está em anexo neste e-mail.
      </p>

      <div style="
      margin-top:10px;
      padding:12px;
      background:#10b981;
      color:white;
      border-radius:6px;
      text-align:center;
      font-weight:bold;
      ">
      🧾 Nota Fiscal Anexada
      </div>
      `
    }

    html += `
    <p style="margin-top:20px;font-size:14px;color:#555">
    Se precisar de algo, estamos à disposição.
    </p>

    <hr>

    <p style="font-size:12px;color:#999">
    Clínica Haux
    </p>

    </div>
    `

    /* ===================== */
    /* ANEXOS (NOTAS) */
    /* ===================== */

    let attachments = []

// =========================
// RECEITAS
// =========================
for (let i = 0; i < receitas.length; i++) {

  const url = receitas[i]

  try {

    console.log("BAIXANDO RECEITA:", url)

    const response = await fetch(url)

    if (!response.ok) continue

    const buffer = await response.arrayBuffer()

    attachments.push({
      filename: `receita_${i + 1}.pdf`,
      content: Buffer.from(buffer)
    })

  } catch (e) {
    console.log("ERRO RECEITA:", e.message)
  }

}

// =========================
// EXAMES
// =========================
for (let i = 0; i < exames.length; i++) {

  const url = exames[i]

  try {

    console.log("BAIXANDO EXAME:", url)

    const response = await fetch(url)

    if (!response.ok) continue

    const buffer = await response.arrayBuffer()

    attachments.push({
      filename: `exame_${i + 1}.pdf`,
      content: Buffer.from(buffer)
    })

  } catch (e) {
    console.log("ERRO EXAME:", e.message)
  }

}

// =========================
// NOTAS (igual já estava)
// =========================
for (let i = 0; i < notas.length; i++) {

  const url = notas[i]

  try {

    console.log("BAIXANDO NOTA:", url)

    const response = await fetch(url, { cache: "no-store" })

    if (!response.ok) continue

    const buffer = await response.arrayBuffer()

    attachments.push({
      filename: `nota_${i + 1}.pdf`,
      content: Buffer.from(buffer)
    })

  } catch (e) {
    console.log("ERRO NOTA:", e.message)
  }

}

console.log("TOTAL ANEXOS:", attachments.length)
    
    /* ===================== */
    /* ENVIO */
    /* ===================== */

    // 🚨 BLOQUEIO DE SEGURANÇA
  if (!attachments || attachments.length === 0) {
  console.log("⚠️ Nenhum arquivo para envio")

  return res.status(400).json({
    erro: "Nenhum arquivo disponível para envio"
  })
}

    await resend.emails.send({
      from: 'Clínica Haux <hauxlife@hauxlife.com.br>',
      to: [emailPaciente],
      subject: 'Seus documentos',
      html,
      attachments
    })

    /* ===================== */
    /* HISTÓRICO (NOVO) */
    /* ===================== */

    if (!local.historico_envios) {
      local.historico_envios = []
    }

    local.historico_envios.push({
      data: new Date().toISOString(),
      receitas: [...receitas],
      exames: [...exames],
      notas: [...notas]
    })

    /* ===================== */
    /* CONTROLE */
    /* ===================== */

    local.ultimo_envio = new Date().toISOString()
    local.total_notas_enviadas = notas.length

    await kv.set(key, local)

    console.log("HISTÓRICO SALVO:", local.historico_envios)

    return res.status(200).json({ success: true })

  } catch (error) {

    console.log("ERRO EMAIL:", error)

    return res.status(500).json({
      error: error.message
    })

  }

}
