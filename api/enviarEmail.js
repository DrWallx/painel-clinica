import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {

  try {

    const { paciente_id, tipo } = req.query

    const baseUrl = "https://project-dvdik.vercel.app"

    // 🔥 SEMPRE BUSCA DADO ATUALIZADO
    const pacienteResponse = await fetch(`${baseUrl}/api/paciente?paciente_id=${paciente_id}`)
    const paciente = await pacienteResponse.json()

    console.log("PACIENTE EMAIL DATA:", paciente)

    const emailPaciente = paciente.email

    // 🔥 SUPORTE ANTIGO + NOVO
    const receitas = paciente.receitas || (paciente.receita_url ? [paciente.receita_url] : [])
    const exames = paciente.exames || []
    const notas = paciente.notas || (paciente.nota_url ? [paciente.nota_url] : [])

    console.log("NOTAS ENCONTRADAS:", notas)

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
    if ((tipo === "receita" || !tipo) && receitas.length) {
      html += `<h3>Receitas</h3>`
      receitas.forEach(url => {
        html += `<p><a href="${url}">📄 Abrir Receita</a></p>`
      })
    }

    // EXAMES
    if (!tipo && exames.length) {
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

    if ((tipo === "nota" || !tipo) && notas.length) {

      for (let i = 0; i < notas.length; i++) {

        const url = notas[i]

        try {

          console.log("BAIXANDO NOTA:", url)

          const response = await fetch(url)

          if (!response.ok) {
            console.log("ERRO FETCH NOTA:", response.status)
            continue
          }

          const buffer = await response.arrayBuffer()

          attachments.push({
            filename: `nota_${i + 1}.pdf`,
            content: Buffer.from(buffer)
          })

        } catch (e) {
          console.log("ERRO AO BAIXAR NOTA:", e.message)
        }

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

    return res.status(500).json({
      error: error.message
    })

  }

}
