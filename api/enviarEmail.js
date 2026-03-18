import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {

try{

const { paciente_id, tipo } = req.query

/* ===================== */
/* BUSCAR PACIENTE */
/* ===================== */

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

const pacienteResponse = await fetch(`${baseUrl}/api/paciente?paciente_id=${paciente_id}`)
const paciente = await pacienteResponse.json()

const emailPaciente = paciente.email

/* ===================== */
/* LINKS DOS PDFs */
/* ===================== */

const receitaURL = `https://blob.vercel-storage.com/${paciente_id}_receita.pdf`
const notaURL = `https://blob.vercel-storage.com/${paciente_id}_nota.pdf`

/* ===================== */
/* HTML PROFISSIONAL */
/* ===================== */

let html = `
<div style="font-family:Arial;max-width:600px;margin:auto;background:#ffffff;padding:20px;border-radius:10px">

<h2 style="color:#3b82f6">Clínica Haux</h2>

<p>Olá <b>${paciente.nome}</b>,</p>

<p>Seus documentos da consulta estão disponíveis abaixo:</p>
`

if(tipo === "receita" || tipo === "ambos"){
html += `
<a href="${receitaURL}" 
style="display:block;margin:10px 0;padding:12px;background:#3b82f6;color:white;text-decoration:none;border-radius:5px;text-align:center">
📄 Baixar Receita
</a>
`
}

if(tipo === "nota" || tipo === "ambos"){
html += `
<a href="${notaURL}" 
style="display:block;margin:10px 0;padding:12px;background:#10b981;color:white;text-decoration:none;border-radius:5px;text-align:center">
🧾 Baixar Nota Fiscal
</a>
`
}

html += `
<p style="margin-top:20px;font-size:14px;color:#555">
Se tiver qualquer dúvida, estamos à disposição.
</p>

<hr>

<p style="font-size:12px;color:#999">
Clínica Haux<br>
Cuidado completo para sua saúde
</p>

</div>
`

/* ===================== */
/* ENVIO EMAIL */
/* ===================== */

await resend.emails.send({

from: 'Clínica Haux <hauxlife@hauxlife.com.br>',
reply_to: 'drwall@hauxlife.com.br',

to: emailPaciente,

subject: 'Seus documentos da consulta',

html

})

console.log("EMAIL ENVIADO PARA:", emailPaciente)

return res.status(200).json({ success: true })

}catch(error){

console.log("ERRO EMAIL:", error)

return res.status(500).json({
success:false,
error:error.message
})

}

}
