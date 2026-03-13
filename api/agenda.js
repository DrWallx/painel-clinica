export default async function handler(req, res) {

const token = process.env.FEEGOW_TOKEN;

const response = await fetch("https://api.feegow.com/v1/api/appointments",{
headers:{
"x-access-token": token
}
});

const data = await response.json();

res.status(200).json(data);

}
