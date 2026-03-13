export default async function handler(req, res) {

const token = process.env.FEEGOW_TOKEN;

try {

const response = await fetch("https://api.feegow.com/v1/api/appoints",{
method:"GET",
headers:{
"x-access-token": token,
"Content-Type":"application/json"
}
});

const data = await response.json();

res.status(200).json(data);

} catch(error){

res.status(500).json({error:"Erro ao conectar ao Feegow"});

}

}
