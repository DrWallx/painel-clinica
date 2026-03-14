import formidable from "formidable";
import fs from "fs";
import { put } from "@vercel/blob";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    const form = formidable({ multiples: false });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ erro: "Erro no upload" });
      }

      const paciente_id = fields.paciente_id;
      const tipo = fields.tipo;

      const file = files.file[0];

      const nomeArquivo = `${paciente_id}_${tipo}.pdf`;

      const blob = await put(nomeArquivo, fs.createReadStream(file.filepath), {
        access: "public",
      });

      res.status(200).json({
        success: true,
        url: blob.url,
      });
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ erro: error.message });
  }
}
