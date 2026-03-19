export default async function handler(req, res){

try{

const token = process.env.FEEGOW_TOKEN
const paciente_id = req.query.paciente_id

let p = {}
let dias_limite_retorno = null

/* ===================== */
/* FEEGOW (PROTEGIDO) */
/* ===================== */

try{

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

if(pacienteData.success){
p = pacienteData.content
}

}catch(e){
console.log("ERRO FEEGOW:", e.message)
}

/* ===================== */
/* AGENDA (PROTEGIDO) */
/* ===================== */

try{

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

if(agendaData.content?.length){
dias_limite_retorno = agendaData.content[0].dias_limite_retorno
}

}catch(e){
console.log("ERRO AGENDA:", e.message)
}

/* ===================== */
/* KV (PROTEGIDO) */
/* ===================== */

let local = {}

try {
  const { kv } = await import("@vercel/kv")
  local = await kv.get(`paciente:${paciente_id}`) || {}
} catch (e) {
  console.log("KV ERRO:", e.message)
}

/* ===================== */
/* RETORNO SEGURO */
/* ===================== */

return res.status(200).json({

nome: p?.nome || "",
nascimento: p?.nascimento || "",
cpf: p?.documentos?.cpf || "",

email: p?.email?.[0] || "",
telefone: p?.celulares?.[0] || "",

cep: p?.cep || "",
rua: p?.endereco || "",
numero: p?.numero || "",
bairro: p?.bairro || "",
cidade: p?.cidade || "",
estado: p?.estado || "",

dias_limite_retorno,

receita_url: local?.receita_url || null,
nota_url: local?.nota_url || null

})

}catch(error){

console.log("ERRO GERAL:", error)

return res.status(500).json({
erro:error.message
})

}

}
