import { createClient } from '@supabase/supabase-js'

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

function converterDataHora(data, horario = "00:00:00") {
  const dataConvertida = converterData(data)
  if (!dataConvertida) return null

  const [hora = 0, minuto = 0, segundo = 0] = horario.split(":").map(Number)
  dataConvertida.setHours(hora, minuto, segundo, 0)
  return dataConvertida
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

async function buscarPacientesInativos(req, res) {
  const token = process.env.FEEGOW_TOKEN
  if (!token) {
    return res.status(500).json({ erro: "FEEGOW_TOKEN não configurado" })
  }

  const dias = Math.max(1, Number(req.query.dias) || 60)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

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

  const pacientesDoGrupo = new Set()
  const ultimaConsultaPorPaciente = new Map()

  respostas.flat().forEach(item => {
    const dataConsulta = converterData(item.data)
    const status = Number(item.status_id)
    const procedimento = Number(item.procedimento_id)
    const atendimentoComProfissional =
      (procedimento === 22 || procedimento === 23) &&
      Number(item.profissional_id) === 1 &&
      (status === 1 || status === 3) &&
      dataConsulta &&
      dataConsulta <= hoje

    if (!atendimentoComProfissional) return

    const pacienteId = Number(item.paciente_id)

    // Local e especialidade definem o grupo de pacientes acompanhado.
    // A consulta mais recente pode ser presencial ou telemedicina.
    if (
      procedimento === 23 &&
      Number(item.local_id) === 2 &&
      Number(item.especialidade_id) === 104
    ) {
      pacientesDoGrupo.add(pacienteId)
    }

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
    .filter(item => pacientesDoGrupo.has(item.paciente_id) && item.data < limite)
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
}

async function buscarNovosCancelados(res) {
  const token = process.env.FEEGOW_TOKEN
  if (!token) {
    return res.status(500).json({ erro: "FEEGOW_TOKEN não configurado" })
  }

  const hoje = new Date()
  hoje.setHours(23, 59, 59, 999)
  const inicio = new Date(2025, 1, 1)
  const fimFuturo = new Date(hoje)
  fimFuturo.setFullYear(fimFuturo.getFullYear() + 1)

  const periodosHistoricos = mesesEntre(inicio, hoje)
  const respostasHistoricas = await executarEmLotes(periodosHistoricos, 4, periodo => {
    const params = new URLSearchParams({
      data_start: periodo.inicio,
      data_end: periodo.fim
    })
    return buscarFeegow(`/appoints/search?${params}`, token)
  })

  // Buscas mensais incluem reagendamentos futuros sem exceder o período aceito pelo Feegow.
  const inicioFuturo = new Date(hoje)
  inicioFuturo.setDate(inicioFuturo.getDate() + 1)
  inicioFuturo.setHours(0, 0, 0, 0)
  const periodosFuturos = mesesEntre(inicioFuturo, fimFuturo)
  const respostasFuturas = await executarEmLotes(periodosFuturos, 4, periodo => {
    const params = new URLSearchParams({
      data_start: periodo.inicio,
      data_end: periodo.fim
    })
    return buscarFeegow(`/appoints/search?${params}`, token)
  })
  const agendamentos = [...respostasHistoricas.flat(), ...respostasFuturas.flat()]

  const candidatos = new Map()

  agendamentos.forEach(item => {
    const canceladoEm = converterDataHora(item.data, item.horario)
    const primeiroAgendamento = Number(item.primeiro_agendamento) === 1
    const cancelamentoInicial =
      primeiroAgendamento &&
      Number(item.procedimento_id) === 23 &&
      Number(item.profissional_id) === 1 &&
      Number(item.status_id) === 11 &&
      canceladoEm &&
      canceladoEm <= hoje

    if (!cancelamentoInicial) return

    const pacienteId = Number(item.paciente_id)
    const atual = candidatos.get(pacienteId)
    if (!atual || canceladoEm > atual.canceladoEm) {
      candidatos.set(pacienteId, {
        paciente_id: pacienteId,
        agendamento_id: Number(item.agendamento_id),
        data_cancelamento: item.data,
        canceladoEm
      })
    }
  })

  const semReagendamento = [...candidatos.values()]
    .filter(candidato => {
      return !agendamentos.some(item => {
        if (Number(item.paciente_id) !== candidato.paciente_id) return false
        if (Number(item.profissional_id) !== 1) return false
        if (![22, 23].includes(Number(item.procedimento_id))) return false
        if (Number(item.agendamento_id) === candidato.agendamento_id) return false

        const dataAgendamento = converterDataHora(item.data, item.horario)
        return dataAgendamento && dataAgendamento > candidato.canceladoEm
      })
    })
    .sort((a, b) => b.canceladoEm - a.canceladoEm)

  const pacientes = await executarEmLotes(semReagendamento, 10, async item => {
    const params = new URLSearchParams({ paciente_id: String(item.paciente_id) })
    const content = await buscarFeegow(`/patient/search?${params}`, token)
    const paciente = Array.isArray(content) ? content[0] : content
    const diasDesdeCancelamento = Math.max(
      0,
      Math.floor((hoje.getTime() - item.canceladoEm.getTime()) / 86400000)
    )

    return {
      paciente_id: item.paciente_id,
      nome: paciente?.nome || "Paciente sem nome",
      data_cancelamento: item.data_cancelamento,
      dias_desde_cancelamento: diasDesdeCancelamento,
      telefone: paciente?.celulares?.[0] || paciente?.telefones?.[0] || "",
      email: paciente?.email?.[0] || ""
    }
  })

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600")
  return res.status(200).json({
    pacientes,
    total: pacientes.length,
    periodo_inicio: formatarDataBR(inicio),
    atualizado_em: new Date().toISOString()
  })
}

export default async function handler(req, res) {

  try {

    if (req.query.tipo === "inativos") {
      return await buscarPacientesInativos(req, res)
    }

    if (req.query.tipo === "novos_cancelados") {
      return await buscarNovosCancelados(res)
    }

    console.log("ENV URL:", process.env.SUPABASE_URL)
    console.log("ENV KEY:", process.env.SUPABASE_KEY ? "OK" : "MISSING")

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      return res.status(500).json({
        erro: "ENV não carregada"
      })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    )

    // 🔥 filtro opcional
    const { mes, ano } = req.query

    let query = supabase
      .from("financeiro_consultas")
      .select("*")

    if (mes) query = query.eq("mes", mes)
    if (ano) query = query.eq("ano", ano)

    const { data, error } = await query

    if (error) {
      console.error("Erro Supabase:", error)
      return res.status(500).json(error)
    }

    return res.status(200).json(data)

  } catch (err) {
    console.error("Erro geral:", err)
    return res.status(500).json({
      erro: "Erro interno",
      detalhe: err.message
    })
  }
}
