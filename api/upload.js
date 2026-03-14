import formidable from "formidable"
import fs from "fs"
import path from "path"

export const config = {
api: {
bodyParser: false
}
}

export default async function handler(req,res){

const form = new formidable.IncomingForm()

form.parse(req, async (err,fields,files)=>{

const paciente_id = fields.paciente_id
const tipo = fields.tipo

const file = files.file

let pasta = ""

if(tipo === "receita"){
pasta = "uploads/receitas"
}

if(tipo === "nota"){
pasta = "uploads/notas"
}

const novoNome = `${paciente_id}.pdf`

const destino = path.join(process.cwd(),pasta,novoNome)

fs.renameSync(file.filepath,destino)

res.status(200).json({success:true})

})

}
