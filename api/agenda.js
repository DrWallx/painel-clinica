export default async function handler(req, res) {

const token = process.env.FEEGOW_TOKEN;

try {

const hoje = new Date();
const data = hoje.toISOString().split("T")[0];

const url = `https://api.feegow.com/v1/api/appoints/search?data_start=${data}&data_end=${data}`;

const response = await fetch(url,{
method:"GET",
headers:{
"x-access-token": token,
"Content-Type":"application/json"
}
});

const result = await response.json();

res.status(200).json(result);

} catch(error){

res.status(500).json({error:"Erro ao conectar ao Feegow"});

}

}
