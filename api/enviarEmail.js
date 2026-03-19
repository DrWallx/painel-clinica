import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {

  try {

    const { paciente_id } = req.query

    const baseUrl = "https://project-dvdik.vercel.app"

    const pacienteResponse = await fetch(`${baseUrl}/api/paciente?paciente_id=${paciente_id}`)
    const paciente = await pacienteResponse.json()

    const emailPaciente = paciente.email

    const receitas = paciente.receitas || []
    const exames = paciente.exames || []
    const notas = paciente.notas || []

    let html = `
    <div style="font-family:Arial;max-width:600px;margin:auto">

    <h2>Clínica Haux</h2>

    <p>Olá <b>${paciente.nome}</b>,</p>

    <p>Seus documentos:</p>
    `

    /* RECEITAS (LINK) */
    if (receitas.length) {
      html += `<h3>Receitas</h3>`
      receitas.forEach(url => {
        html += `<p><a href="${url}">📄 Abrir Receita</a></p>`
      })
    }

    /* EXAMES (LINK) */
    if (exames.length) {
      html += `<h3>Exames</h3>`
      exames.forEach(url => {
        html += `<p><a href="${url}">🧪 Ver Exame</a></p>`
      })
    }

    html += `</div>`

    /* NOTAS (ANEXO) */
    let attachments = []

    for (const url of notas) {
      const response = await fetch(url)
      const buffer = await response.arrayBuffer()

      attachments.push({
        filename: "nota.pdf",
        content: Buffer.from(buffer)
      })
    }

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

    return res.status(500).json({
      error: error.message
    })

  }

}
