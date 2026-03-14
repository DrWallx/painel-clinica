export default async function handler(req, res) {

const token = process.env.FEEGOW_TOKEN;

let { data, data_start, data_end } = req.query;

/* SE RECEBER APENAS DATA (AGENDA DO DIA) */

if(data && !data_start && !data_end){

data_start = data;
data_end = data;

}

/* SE NÃO RECEBER NADA USA HOJE */

if(!data && !data_start && !data_end){

const hoje = new Date();

const dia = String(hoje.getDate()).padStart(2,'0');
const mes = String(hoje.getMonth()+1).padStart(2,'0');
const ano = hoje.getFullYear();

data_start = `${dia}-${mes}-${ano}`;
data_end = `${dia}-${mes}-${ano}`;

}

/* CHAMA API DO FEEGOW */

const agendaResponse = await fetch(
`https://api.feegow.com/v1/api/appoints/search?data_start=${data_start}&data_end=${data_end}`,
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

/* FILTRO DE DATA (SOMENTE QUANDO FOR UM DIA ESPECÍFICO) */

let agendaFiltrada = agendaData.content;

if(data){

agendaFiltrada = [];

agendaData.content.forEach(item => {

if(item.data === data){
agendaFiltrada.push(item);
}

});

}

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
