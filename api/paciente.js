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

const paciente = data.content

res.status(200).json({

nome: paciente.nome,
email: paciente.email,
telefone: paciente.telefone,
nascimento: paciente.data_nascimento

})

}
