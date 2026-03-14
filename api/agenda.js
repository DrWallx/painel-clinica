export default async function handler(req, res) {

const token = process.env.FEEGOW_TOKEN;

let { data, data_start, data_end } = req.query;

/* CASO RECEBA APENAS UMA DATA */

if(data && !data_start && !data_end){

data_start = data;
data_end = data;

}

/* CASO NÃO RECEBA NADA → USA HOJE */

if(!data && !data_start && !data_end){

const hoje = new Date();

const dia = String(hoje.getDate()).padStart(2,'0');
const mes = String(hoje.getMonth()+1).padStart(2,'0');
const ano = hoje.getFullYear();

data_start = `${dia}-${mes}-${ano}`;
data_end = `${dia}-${mes}-${ano}`;

}

/* CHAMADA API FEEGOW */

const agendaResponse = await fetch(
`https://api.feegow.com/v1/api/appoints/search?data_start=${data_start}&data_end=${data_end}&limit=500`,
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

/* FILTRO DE DATA (quando usa data única) */

let agendaFiltrada = agendaData.content;

if(data){

agendaFiltrada = agendaData.content.filter(item => item.data === data);

}

/* BUSCAR NOME DO PACIENTE */

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

/* RETORNO FINAL */

agendaData.content = agendaFiltrada;

res.status(200).json(agendaData);

}
