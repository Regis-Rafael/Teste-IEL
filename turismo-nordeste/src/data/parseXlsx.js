import * as XLSX from 'xlsx';

const MONTH_ORDER = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export async function loadDashboardData() {
  const response = await fetch('/data.xlsx');
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'arraybuffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const rawRows = rows.slice(1).map(r => ({
    mes: r[0],
    estado: r[1],
    cidade: r[2],
    tipo: r[3],
    receita: Number(r[4]) || 0,
    clientes: Number(r[5]) || 0,
    ocupacao: Number(r[6]) || 0,
    avaliacao: Number(r[7]) || 0,
  })).filter(r => r.mes);

  const estadosList = [...new Set(rawRows.map(r => r.estado))];
  const cidadesList = [...new Set(rawRows.map(r => r.cidade))];
  const mesesList = MONTH_ORDER.filter(m => rawRows.some(r => r.mes === m));

  return { rawRows, estadosList, cidadesList, mesesList };
}

export function aggregate(subset) {
  const MONTH_ORDER = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  const receita_mes = {};
  const clientes_mes = {};
  const tipo_receita = {};
  const estado_receita = {};
  const top_cidades = {};

  MONTH_ORDER.forEach(m => {
    receita_mes[m] = 0;
    clientes_mes[m] = 0;
  });

  subset.forEach(r => {
    receita_mes[r.mes] = (receita_mes[r.mes] || 0) + r.receita;
    clientes_mes[r.mes] = (clientes_mes[r.mes] || 0) + r.clientes;
    tipo_receita[r.tipo] = (tipo_receita[r.tipo] || 0) + r.receita;
    estado_receita[r.estado] = (estado_receita[r.estado] || 0) + r.receita;
    top_cidades[r.cidade] = (top_cidades[r.cidade] || 0) + r.receita;
  });

  const totalReceita = subset.reduce((s, r) => s + r.receita, 0);
  const totalClientes = subset.reduce((s, r) => s + r.clientes, 0);
  const avgOcupacao = subset.reduce((s, r) => s + r.ocupacao, 0) / (subset.length || 1);
  const avgAvaliacao = subset.reduce((s, r) => s + r.avaliacao, 0) / (subset.length || 1);

  return {
    kpi: { receita: totalReceita, clientes: totalClientes, ocupacao: avgOcupacao, avaliacao: avgAvaliacao },
    receita_mes,
    clientes_mes,
    tipo_receita,
    estado_receita,
    top_cidades,
  };
}
