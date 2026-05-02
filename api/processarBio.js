export default async function handler(req, res) {
  try {
    const { fileUrl } = req.body

    if (!fileUrl) {
      return res.status(400).json({ erro: "fileUrl obrigatória" })
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
Leia este exame de bioimpedância e extraia os dados.

Retorne APENAS JSON no formato:

{
  "peso": "",
  "gordura_corporal": "",
  "massa_muscular": "",
  "agua_corporal": "",
  "idade_metabolica": ""
}
                `
              },
              {
                type: "input_image",
                image_url: fileUrl
              }
            ]
          }
        ]
      })
    })

    const data = await response.json()

    const texto = data.output[0].content[0].text

    const json = JSON.parse(texto)

    return res.json(json)

  } catch (err) {
    console.error(err)
    return res.status(500).json({ erro: err.message })
  }
}