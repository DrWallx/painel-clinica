const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Dados sintéticos: consultas de códigos diferentes, retorno e cancelamento.
const rows = [
  { procedimento_id: 23, status_id: 3, valor_total_agendamento: 'R$ 300,00' },
  { procedimento_id: '27', status_id: '7', valor_total_agendamento: '300.00' },
  { procedimento_id: 99, status_id: 1, valor_total_agendamento: 450 },
  { procedimento_id: '22', status_id: 3, valor_total_agendamento: 'R$ 100,00' },
  { procedimento_id: 27, status_id: '11', valor_total_agendamento: 'R$ 300,00' }
];

test('resumo mensal inclui todos os códigos e não soma retorno ou cancelamento', async () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1].split('/* START */')[0];
  const elements = {};
  const context = vm.createContext({
    document: { getElementById: id => elements[id] ||= {} },
    fetch: async () => ({ json: async () => ({ content: rows }) })
  });
  vm.runInContext(script, context);
  await context.carregarMes();
  assert.equal(elements.consultasMes.innerText, 3);
  assert.equal(elements.retornosMes.innerText, 1);
  assert.equal(elements.cancelamentosMes.innerText, 1);
  assert.equal(elements.faturamentoMes.innerText, '1050.00');
  assert.equal(context.converterValor('R$ 1.234,56'), 1234.56);
  assert.equal(context.converterValor(null), 0);
});

test('produção agrega consultas de qualquer código e separa retornos/cancelamentos', async () => {
  let calls = 0;
  const context = vm.createContext({
    process: { env: {} }, console,
    fetch: async () => ({ json: async () => ({ content: calls++ === 0 ? rows : [] }) })
  });
  vm.runInContext(fs.readFileSync('api/producao.js', 'utf8').replace('export default ', ''), context);
  let result;
  await context.handler({}, { status: () => ({ json: value => { result = value; } }) });
  assert.equal(result.total.consultas, 3);
  assert.equal(result.total.retornos, 1);
  assert.equal(result.total.cancelamentos, 1);
});

test('importador inclui outros códigos, excluindo retorno e cancelamento com IDs em texto', async () => {
  let inserted;
  const fixture = rows.map(row => ({ ...row, data: '20-04-2026', paciente_id: 1,
    valor_total_agendamento: 'R$ 300,00' }));
  const context = vm.createContext({
    process: { env: {} }, console: { log() {}, error() {} },
    createClient: () => ({ from: () => ({ insert: async data => { inserted = data; return {}; } }) }),
    fetch: async url => ({ json: async () => ({ content: url.includes('appoints') ? fixture : { nome: 'Teste' } }) })
  });
  const source = fs.readFileSync('api/importarFeegow.js', 'utf8')
    .replace(/import .*from .*\r?\n/, '').replace('export default ', '');
  vm.runInContext(source, context);
  await context.handler({}, { json() {}, status: () => ({ json() {} }) });
  assert.equal(inserted.length, 3);
  assert.equal(inserted.reduce((sum, row) => sum + row.valor, 0), 900);
});
