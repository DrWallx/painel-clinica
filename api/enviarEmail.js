import fs from "fs"
import path from "path"
import nodemailer from "nodemailer"

export default async function handler(req,res){

const { paciente_id, tipo } = req.query

const dbPath = path.join(process.cwd(),"database","pacientes.json")
const db = JSON.parse(fs.readFileSync(dbPath))

const paciente = db[paciente_id]

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

const transporter = nodemailer.createTransport({

service:"gmail",

auth:{
user:process.env.EMAIL_USER,
pass:process.env.EMAIL_PASS
}

})

await transporter.sendMail({

from:process.env.EMAIL_USER,
to:"email_do_paciente",
subject:"Documentos da consulta",
text:"Segue em anexo os documentos da sua consulta.",
attachments:anexos

})

res.status(200).json({success:true})

}
