export default async function handler(req, res){

const token = process.env.FEEGOW_TOKEN
const paciente_id = req.query.paciente_id

/* BUSCAR PACIENTE */

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

if(!pacienteData.success){
return res.status(200).json({})
}

const p = pacienteData.content

/* BUSCAR AGENDAMENTO PARA PEGAR RETORNO */

const hoje = new Date()

const dia = String(hoje.getDate()).padStart(2,'0')
const mes = String(hoje.getMonth()+1).padStart(2,'0')
const ano = hoje.getFullYear()

const data = `${dia}-${mes}-${ano}`

const agendaResponse = await fetch(
`https://api.feegow.com/v1/api/appoints/search?data_start=${data}&data_end=${data}&paciente_id=${paciente_id}`,
{
headers:{
"Content-Type":"application/json",
"x-access-token":token
}
}
)

const agendaData = await agendaResponse.json()

let dias_limite_retorno = null

if(agendaData.content && agendaData.content.length > 0){
dias_limite_retorno = agendaData.content[0].dias_limite_retorno
}

res.status(200).json({

nome: p.nome,
nascimento: p.nascimento,
cpf: p.documentos?.cpf || "",

email: p.email?.[0] || "",
telefone: p.celulares?.[0] || "",

cep: p.cep,
rua: p.endereco,
numero: p.numero,
bairro: p.bairro,
cidade: p.cidade,
estado: p.estado,

dias_limite_retorno

})

}
