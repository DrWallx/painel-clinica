export default async function handler(req, res) {

const token = process.env.FEEGOW_TOKEN;

const hoje = new Date().toLocaleDateString("pt-BR").split('/').reverse().join('-');

const agendaResponse = await fetch(
`https://api.feegow.com/v1/api/appoints/search?data_start=${hoje}&data_end=${hoje}`,
{
headers:{
"Content-Type":"application/json",
"x-access-token":token
}
}
);

const agendaData = await agendaResponse.json();

if(!agendaData.content){
return res.status(200).json(agendaData);
}

for(const agendamento of agendaData.content){

try{

const pacienteResponse = await fetch(
`https://api.feegow.com/v1/api/patient/search?paciente_id=${agendamento.paciente_id}`,
{
headers:{
"Content-Type":"application/json",
"x-access-token":token
}
}
);

const pacienteData = await pacienteResponse.json();

if(pacienteData.success && pacienteData.content){

agendamento.paciente_nome = pacienteData.content.nome;

}else{

agendamento.paciente_nome = "Paciente";

}

}catch{

agendamento.paciente_nome = "Paciente";

}

}

res.status(200).json(agendaData);

}
