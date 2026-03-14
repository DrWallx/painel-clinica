import fs from "fs"
import path from "path"
import nodemailer from "nodemailer"

export default async function handler(req,res){

const { paciente_id, tipo } = req.query

const token = process.env.FEEGOW_TOKEN

/* BUSCAR PACIENTE NO FEEGOW */

const pacienteResponse = await fetch(
`https://api.feegow.com/v1/api/patient/search?paciente_id=${paciente_id}`,
{
headers:{
"Content-Type":"application/json",
"x-access-token":token
}
}
)

const pacienteData = await pacienteResponse.json()

const paciente = pacienteData.content

const emailPaciente = paciente.email?.[0]

if(!emailPaciente){
return res.status(400).json({erro:"Paciente sem email"})
}

/* ANEXOS */

const anexos = []

if(tipo === "receita" || tipo === "ambos"){

const receita = path.join(process.cwd(),"uploads/receitas",`${paciente_id}.pdf`)

if(fs.existsSync(receita)){

anexos.push({
filename:"receita.pdf",
path:receita
})

}

}

if(tipo === "nota" || tipo === "ambos"){

const nota = path.join(process.cwd(),"uploads/notas",`${paciente_id}.pdf`)

if(fs.existsSync(nota)){

anexos.push({
filename:"nota_fiscal.pdf",
path:nota
})

}

}

/* CONFIGURA EMAIL */

const transporter = nodemailer.createTransport({

service:"gmail",

auth:{
user:process.env.EMAIL_USER,
pass:process.env.EMAIL_PASS
}

})

/* ENVIA EMAIL */

await transporter.sendMail({

from:process.env.EMAIL_USER,
to: emailPaciente,

subject:"Documentos da consulta",

text:`
Olá ${paciente.nome},

Segue em anexo os documentos da sua consulta.

Qualquer dúvida estamos à disposição.

Atenciosamente
Clínica
`,

attachments: anexos

})

res.status(200).json({success:true})

}
