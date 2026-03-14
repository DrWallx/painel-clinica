export default async function handler(req, res){

const token = process.env.FEEGOW_TOKEN
const paciente_id = req.query.paciente_id

const response = await fetch(
`https://api.feegow.com/v1/api/patient/search?paciente_id=${paciente_id}`,
{
headers:{
"Content-Type":"application/json",
"x-access-token":token
}
}
)

const data = await response.json()

if(!data.success){
return res.status(200).json({})
}

const p = data.content

res.status(200).json({

nome: p.nome,
email: p.email,
telefone: p.telefone1,
nascimento: p.data_nascimento,
cpf: p.cpf,

cep: p.cep,
rua: p.endereco,
numero: p.numero,
bairro: p.bairro,
cidade: p.cidade,
estado: p.estado,

dias_limite_retorno: p.dias_limite_retorno

})

}
