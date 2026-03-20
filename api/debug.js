import { kv } from "@vercel/kv"

export default async function handler(req, res){

  const keys = await kv.keys("paciente:*")

  const dados = []

  for(const key of keys){
    const p = await kv.get(key)
    dados.push({ key, ...p })
  }

  res.status(200).json(dados)
}
