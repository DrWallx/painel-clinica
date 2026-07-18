const FEEGOW_URL = "https://api.feegow.com/v1/api"

function formatarDataBR(data) {
  const dia = String(data.getDate()).padStart(2, "0")
  const mes = String(data.getMonth() + 1).padStart(2, "0")
  return `${dia}-${mes}-${data.getFullYear()}`
}

function converterData(data) {
  if (!data) return null
  const [dia, mes, ano] = data.split("-").map(Number)
  if (!dia || !mes || !ano) return null
  return new Date(ano, mes - 1, dia)
}

function mesesEntre(inicio, fim) {
  const periodos = []
  const atual = new Date(inicio.getFullYear(), inicio.getMonth(), 1)

  while (atual <= fim) {
    const primeiroDia = new Date(atual.getFullYear(), atual.getMonth(), 1)
    const ultimoDiaDoMes = new Date(atual.getFullYear(), atual.getMonth() + 1, 0)
    const ultimoDia = ultimoDiaDoMes > fim ? fim : ultimoDiaDoMes

    periodos.push({
      inicio: formatarDataBR(primeiroDia < inicio ? inicio : primeiroDia),
      fim: formatarDataBR(ultimoDia)
    })

    atual.setMonth(atual.getMonth() + 1)
  }

  return periodos
}

async function buscarFeegow(caminho, token) {
  const response = await fetch(`${FEEGOW_URL}${caminho}`, {
    headers: {
      "Content-Type": "application/json",
      "x-access-token": token
    }
  })

  const json = await response.json()
  if (!response.ok || json.success === false) {
    throw new Error(json.message || `Erro Feegow (${response.status})`)
  }

  return json.content || []
}

async function executarEmLotes(itens, tamanho, executar) {
  const resultados = []

  for (let i = 0; i < itens.length; i += tamanho) {
    const lote = itens.slice(i, i + tamanho)
    resultados.push(...await Promise.all(lote.map(executar)))
  }

  return resultados
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET")
      return res.status(405).json({ erro: "Método não permitido" })
    }

    const token = process.env.FEEGOW_TOKEN
    if (!token) {
      return res.status(500).json({ erro: "FEEGOW_TOKEN não configurado" })
    }

    const dias = Math.max(1, Number(req.query.dias) || 60)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    // Início do histórico disponível para esta análise.
    const inicio = new Date(2025, 1, 1)
    const limite = new Date(hoje)
    limite.setDate(limite.getDate() - dias)

    const periodos = mesesEntre(inicio, hoje)
    const respostas = await executarEmLotes(periodos, 4, periodo => {
      const params = new URLSearchParams({
        data_start: periodo.inicio,
        data_end: periodo.fim
      })
      return buscarFeegow(`/appoints/search?${params}`, token)
    })

    const ultimaConsultaPorPaciente = new Map()

    respostas.flat().forEach(item => {
      const dataConsulta = converterData(item.data)
      const status = Number(item.status_id)

      const atendeRegra =
        Number(item.procedimento_id) === 23 &&
        Number(item.local_id) === 2 &&
        Number(item.especialidade_id) === 104 &&
        (status === 1 || status === 3) &&
        dataConsulta &&
        dataConsulta <= hoje

      if (!atendeRegra) return

      const pacienteId = Number(item.paciente_id)
      const atual = ultimaConsultaPorPaciente.get(pacienteId)

      if (!atual || dataConsulta > atual.data) {
        ultimaConsultaPorPaciente.set(pacienteId, {
          paciente_id: pacienteId,
          data: dataConsulta,
          ultima_data: item.data,
          status_id: status
        })
      }
    })

    const inativos = [...ultimaConsultaPorPaciente.values()]
      .filter(item => item.data < limite)
      .sort((a, b) => a.data - b.data)

    const pacientes = await executarEmLotes(inativos, 10, async item => {
      const params = new URLSearchParams({ paciente_id: String(item.paciente_id) })
      const content = await buscarFeegow(`/patient/search?${params}`, token)
      const paciente = Array.isArray(content) ? content[0] : content

      return {
        paciente_id: item.paciente_id,
        nome: paciente?.nome || "Paciente sem nome",
        ultima_data: item.ultima_data,
        status_id: item.status_id,
        telefone: paciente?.celulares?.[0] || paciente?.telefones?.[0] || "",
        email: paciente?.email?.[0] || ""
      }
    })

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600")
    return res.status(200).json({
      pacientes,
      total: pacientes.length,
      dias,
      periodo_inicio: formatarDataBR(inicio),
      atualizado_em: new Date().toISOString()
    })
  } catch (error) {
    console.error("Erro ao buscar pacientes inativos:", error)
    return res.status(500).json({
      erro: "Não foi possível consultar os pacientes no Feegow",
      detalhe: error.message
    })
  }
}
