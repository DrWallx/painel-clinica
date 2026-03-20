import { Resend } from 'resend'
import { kv } from '@vercel/kv'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {

  try {

    const { paciente_id } = req.query

    /* ===================== */
    /* KV DIRETO (BLINDADO) */
    /* ===================== */

    const key = `paciente:${paciente_id}`
    const local = await kv.get(key) || {}

    console.log("KV DIRETO:", local)

    const receitas = local.receitas || []
    const exames = local.exames || []
    const notas = local.notas || []

    /* ===================== */
    /* PACIENTE (FEEGOW) */
    /* ===================== */

    const baseUrl = "https://project-dvdik.vercel.app"

    const pacienteResponse = await fetch(`${baseUrl}/api/paciente?paciente_id=${paciente_id}`)
    const paciente = await pacienteResponse.json()

    const emailPaciente = paciente.email

    /* ===================== */
    /* HTML */
    /* ===================== */

    let html = `
    <div style="font-family:Arial;max-width:600px;margin:auto">

    <h2 style="color:#3b82f6">Clínica Haux</h2>

    <p>Olá <b>${paciente.nome}</b>,</p>

    <p>Seus documentos:</p>
    `

    // RECEITAS
    if (receitas.length) {
      html += `<h3>Receitas</h3>`
      receitas.forEach(url => {
        html += `<p><a href="${url}">📄 Abrir Receita</a></p>`
      })
    }

    // EXAMES
    if (exames.length) {
      html += `<h3>Exames</h3>`
      exames.forEach(url => {
        html += `<p><a href="${url}">🧪 Ver Exame</a></p>`
      })
    }

    html += `</div>`

    /* ===================== */
    /* ANEXOS (NOTAS) */
    /* ===================== */

    let attachments = []

    for (let i = 0; i < notas.length; i++) {

      const url = notas[i]

      try {

        console.log("BAIXANDO NOTA:", url)

        const response = await fetch(url, { cache: "no-store" })

        if (!response.ok) {
          console.log("ERRO DOWNLOAD:", response.status)
          continue
        }

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

    await resend.emails.send({
      from: 'Clínica Haux <hauxlife@hauxlife.com.br>',
      to: emailPaciente,
      subject: 'Seus documentos',
      html,
      attachments
    })

    return res.status(200).json({ success: true })

  } catch (error) {

    console.log("ERRO EMAIL:", error)

    // 🔥 salva histórico de envio
const key = `paciente:${paciente_id}`

let data = await kv.get(key) || {}

data.ultimo_envio = new Date().toISOString()
data.total_notas_enviadas = notas.length

await kv.set(key, data)

console.log("HISTÓRICO SALVO:", data.ultimo_envio)

    return res.status(500).json({
      error: error.message
    })

  }

}
