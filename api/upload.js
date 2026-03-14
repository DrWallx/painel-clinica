import formidable from "formidable"
import fs from "fs"
import path from "path"

export const config = {
api: {
bodyParser: false
}
}

export default async function handler(req,res){

try{

const form = formidable({ multiples:false })

form.parse(req,(err,fields,files)=>{

if(err){
console.log(err)
return res.status(500).json({erro:"Erro no upload"})
}

const paciente_id = fields.paciente_id
const tipo = fields.tipo

const file = files.file[0]

let pasta = ""

if(tipo === "receita"){
pasta = "uploads/receitas"
}

if(tipo === "nota"){
pasta = "uploads/notas"
}

const destino = path.join(process.cwd(),pasta,`${paciente_id}.pdf`)

fs.copyFileSync(file.filepath,destino)

res.status(200).json({success:true})

})

}catch(error){

console.log(error)

res.status(500).json({erro:error.message})

}

}
