export default async function handler(req, res) {

const token = process.env.FEEGOW_TOKEN;

let data = req.query.data;

/* SE NÃO RECEBER DATA USA HOJE */

if(!data){

const hoje = new Date();

const dia = String(hoje.getDate()).padStart(2,'0');
const mes = String(hoje.getMonth()+1).padStart(2,'0');
const ano = hoje.getFullYear();

data = `${dia}-${mes}-${ano}`;

}

/* CHAMA API DO FEEGOW */

const agendaResponse = await fetch(
`https://api.feegow.com/v1/api/appoints/search?data_start=${data}&data_end=${data}`,
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

/* FILTRO CORRETO DE DATA */

const agendaFiltrada = [];

agendaData.content.forEach(item => {

if(item.data === data){
agendaFiltrada.push(item);
}

});

/* BUSCA NOME DO PACIENTE */

for(const agendamento of agendaFiltrada){

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

agendaData.content = agendaFiltrada;

res.status(200).json(agendaData);

}
