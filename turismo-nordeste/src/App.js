import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { loadDashboardData, aggregate } from './data/parseXlsx';
import { THEMES, ESTADO_COLORS, TIPO_COLORS } from './data/themes';
import './index.css';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler
);

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTH_KEYS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_PT_MAP = Object.fromEntries(MONTH_KEYS.map((k, i) => [k, MONTHS_PT[i]]));

const fmt = (n) => {
  if (n >= 1e6) return 'R$ ' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return 'R$ ' + (n / 1e3).toFixed(0) + 'K';
  return 'R$ ' + n.toFixed(0);
};
const fmtK = (n) => {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
};
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '0,0,0';
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, accentColor, t }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{
      background: t.surface, border: `1px solid ${hov ? t.borderHover : t.border}`,
      borderRadius: 16, padding: '22px 24px', position: 'relative', overflow: 'hidden',
      transition: 'transform 0.2s, border-color 0.25s, box-shadow 0.25s',
      transform: hov ? 'translateY(-3px)' : 'none',
      boxShadow: hov ? '0 8px 32px rgba(0,0,0,0.18)' : 'none',
    }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:accentColor }} />
      <div style={{ fontSize:'0.7rem', color:t.muted, textTransform:'uppercase', letterSpacing:'0.09em', fontWeight:500, marginBottom:10 }}>{label}</div>
      <div style={{ fontSize:'2rem', fontWeight:800, letterSpacing:'-0.04em', lineHeight:1, fontFamily:"'JetBrains Mono', monospace", color:accentColor }}>{value}</div>
      <div style={{ fontSize:'0.72rem', color:t.muted, marginTop:6, fontWeight:300 }}>{sub}</div>
      <div style={{ position:'absolute', right:20, top:'50%', transform:'translateY(-50%)', fontSize:'2.4rem', opacity:0.07, userSelect:'none' }}>{icon}</div>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
function Card({ children, t, style = {} }) {
  return (
    <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:22, transition:'background 0.4s, border-color 0.4s', ...style }}>
      {children}
    </div>
  );
}
function CardTitle({ dot, children, t }) {
  return (
    <div style={{ display:'flex', alignItems:'center', marginBottom:18 }}>
      {dot && <span style={{ width:8, height:8, borderRadius:'50%', background:dot, marginRight:8, flexShrink:0 }} />}
      <span style={{ fontSize:'0.78rem', fontWeight:600, color:t.text, textTransform:'uppercase', letterSpacing:'0.07em' }}>{children}</span>
    </div>
  );
}

// ─── Filter Section ──────────────────────────────────────────────────────────
function FilterSection({ label, options, active, onChange, t, multi = false, renderOption }) {
  const allSelected = active.length === 0;
  const toggle = (val) => {
    if (!multi) { onChange(active[0] === val ? [] : [val]); return; }
    if (active.includes(val)) onChange(active.filter(v => v !== val));
    else onChange([...active, val]);
  };
  const display = renderOption || (v => v);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
      <span style={{ fontSize:'0.65rem', color:t.muted, textTransform:'uppercase', letterSpacing:'0.08em', flexShrink:0, minWidth:44 }}>{label}</span>
      <button onClick={() => onChange([])} style={{
        background: allSelected ? `rgba(${hexToRgb(t.accent)},0.13)` : t.surface,
        border: `1px solid ${allSelected ? t.accent : t.border}`,
        color: allSelected ? t.accent : t.muted,
        padding:'5px 13px', borderRadius:7, fontSize:'0.73rem', fontWeight:500,
        transition:'all 0.18s', cursor:'pointer',
      }}>Todos</button>
      {options.map(opt => {
        const sel = active.includes(opt);
        return (
          <button key={opt} onClick={() => toggle(opt)} style={{
            background: sel ? `rgba(${hexToRgb(t.accent)},0.13)` : t.surface,
            border: `1px solid ${sel ? t.accent : t.border}`,
            color: sel ? t.accent : t.muted,
            padding:'5px 13px', borderRadius:7, fontSize:'0.73rem', fontWeight:500,
            transition:'all 0.18s', cursor:'pointer',
          }}>{display(opt)}</button>
        );
      })}
    </div>
  );
}

// ─── Active Filters Badge ────────────────────────────────────────────────────
function ActiveFilters({ estados, cidades, meses, onClear, t }) {
  const count = estados.length + cidades.length + meses.length;
  if (count === 0) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10, flexWrap:'wrap' }}>
      <span style={{ fontSize:'0.65rem', color:t.accent, textTransform:'uppercase', letterSpacing:'0.08em' }}>
        {count} filtro{count > 1 ? 's' : ''} ativo{count > 1 ? 's' : ''}:
      </span>
      {estados.map(e => <Tag key={e} label={e} color={t.accent} t={t} />)}
      {cidades.map(c => <Tag key={c} label={c} color={t.accent2} t={t} />)}
      {meses.map(m => <Tag key={m} label={MONTH_PT_MAP[m]} color={t.accent3} t={t} />)}
      <button onClick={onClear} style={{
        background:'transparent', border:`1px solid ${t.border}`, color:t.muted,
        padding:'3px 10px', borderRadius:6, fontSize:'0.68rem', cursor:'pointer',
        transition:'all 0.15s',
      }}>Limpar tudo</button>
    </div>
  );
}
function Tag({ label, color, t }) {
  return (
    <span style={{ background:`rgba(${hexToRgb(color)},0.12)`, color, border:`1px solid rgba(${hexToRgb(color)},0.3)`, borderRadius:5, padding:'3px 9px', fontSize:'0.68rem', fontWeight:600 }}>
      {label}
    </span>
  );
}

// ─── Charts ──────────────────────────────────────────────────────────────────
function RevenueLineChart({ data, activeMeses, t }) {
  const keys = activeMeses.length ? activeMeses : MONTH_KEYS;
  const labels = keys.map(k => MONTH_PT_MAP[k]);
  const vals = keys.map(k => data.receita_mes[k] || 0);
  const chartData = {
    labels,
    datasets: [{
      data: vals,
      borderColor: t.accent2,
      backgroundColor: (ctx) => {
        const { ctx: c, chartArea } = ctx.chart;
        if (!chartArea) return 'transparent';
        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, t.gradStart); g.addColorStop(1, t.gradEnd);
        return g;
      },
      borderWidth: 2.5, pointBackgroundColor: t.accent2,
      pointRadius: 4, pointHoverRadius: 7, fill: true, tension: 0.4,
    }]
  };
  return (
    <div style={{ height:220 }}>
      <Line data={chartData} options={{
        responsive:true, maintainAspectRatio:false,
        plugins: { legend:{display:false}, tooltip:{ callbacks:{label:ctx=>' R$ '+(ctx.raw/1e6).toFixed(3)+'M'}, backgroundColor:t.tooltipBg, borderColor:t.tooltipBorder, borderWidth:1, titleColor:t.tooltipTitle, bodyColor:t.accent2, padding:10 }},
        scales: {
          x:{grid:{color:t.chartGrid},ticks:{color:t.muted,font:{size:11}}},
          y:{grid:{color:t.chartGrid},ticks:{color:t.muted,callback:v=>'R$ '+(v/1e6).toFixed(1)+'M',font:{size:11}}}
        }
      }} />
    </div>
  );
}

function ClientesBarChart({ data, activeMeses, t }) {
  const keys = activeMeses.length ? activeMeses : MONTH_KEYS;
  const labels = keys.map(k => MONTH_PT_MAP[k]);
  const vals = keys.map(k => data.clientes_mes[k] || 0);
  const chartData = {
    labels,
    datasets:[{ data:vals, backgroundColor:labels.map((_,i)=>`hsla(${170+i*7},65%,52%,0.78)`), borderRadius:5, borderSkipped:false }]
  };
  return (
    <div style={{ height:200 }}>
      <Bar data={chartData} options={{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{label:ctx=>' '+fmtK(ctx.raw)+' clientes'}, backgroundColor:t.tooltipBg, borderColor:t.tooltipBorder, borderWidth:1, titleColor:t.tooltipTitle, padding:10 }},
        scales:{
          x:{grid:{display:false},ticks:{color:t.muted,font:{size:10}}},
          y:{grid:{color:t.chartGrid},ticks:{color:t.muted,callback:v=>fmtK(v),font:{size:10}}}
        }
      }} />
    </div>
  );
}

function TipoDonut({ data, themeName, t }) {
  const labels = Object.keys(data.tipo_receita);
  const vals = labels.map(k => data.tipo_receita[k]);
  const colors = labels.map(k => TIPO_COLORS[k]?.[themeName] || t.accent);
  const total = vals.reduce((a,b)=>a+b,0);
  return (
    <div>
      <div style={{ height:180, position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Doughnut
          data={{ labels, datasets:[{ data:vals, backgroundColor:colors, borderWidth:0, hoverOffset:10 }] }}
          options={{ cutout:'68%', plugins:{ legend:{display:false}, tooltip:{ callbacks:{label:ctx=>' '+(ctx.raw/1e6).toFixed(2)+'M ('+(ctx.raw/total*100).toFixed(1)+'%)'}, backgroundColor:t.tooltipBg, borderColor:t.tooltipBorder, borderWidth:1, titleColor:t.tooltipTitle, padding:10 }}}}
        />
        <div style={{ position:'absolute', textAlign:'center', pointerEvents:'none' }}>
          <div style={{ fontSize:'1.05rem', fontWeight:800, color:t.text, fontFamily:"'JetBrains Mono', monospace" }}>{(total/1e6).toFixed(1)}M</div>
          <div style={{ fontSize:'0.63rem', color:t.muted, textTransform:'uppercase', letterSpacing:'0.07em' }}>total</div>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12 }}>
        {labels.map((l,i)=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:10, height:10, borderRadius:'50%', background:colors[i], flexShrink:0 }} />
            <span style={{ fontSize:'0.78rem', color:t.text, flex:1 }}>{l}</span>
            <span style={{ fontSize:'0.72rem', fontFamily:"'JetBrains Mono', monospace", color:colors[i] }}>{(vals[i]/1e6).toFixed(1)}M</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EstadoGrid({ data, themeName, t }) {
  const entries = Object.entries(data.estado_receita).filter(([,v])=>v>0);
  const total = entries.reduce((s,[,v])=>s+v,0);
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
      {entries.map(([estado,val])=>{
        const color = ESTADO_COLORS[estado]?.[themeName] || t.accent;
        const pct = (val/total*100).toFixed(1);
        return (
          <div key={estado} style={{ background:t.surface2, borderRadius:12, padding:'14px 16px', border:`1px solid ${t.border}`, transition:'background 0.4s' }}>
            <div style={{ fontSize:'1.1rem', fontWeight:700, color, marginBottom:2 }}>{estado}</div>
            <div style={{ fontSize:'1.2rem', fontWeight:800, fontFamily:"'JetBrains Mono', monospace", color:t.text, lineHeight:1 }}>{(val/1e6).toFixed(1)}M</div>
            <div style={{ fontSize:'0.65rem', color:t.muted, marginTop:3 }}>{pct}% do total</div>
            <div style={{ marginTop:8, height:4, background:'rgba(128,128,128,0.12)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:2, transition:'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RankCidades({ data, t }) {
  const entries = Object.entries(data.top_cidades).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const max = entries[0]?.[1] || 1;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
      {entries.map(([cidade,val],i)=>(
        <div key={cidade} style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'0.68rem', color:t.muted, width:16, textAlign:'right', flexShrink:0 }}>{i+1}</span>
          <span style={{ fontSize:'0.78rem', color:t.text, width:130, flexShrink:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{cidade}</span>
          <div style={{ flex:1, background:'rgba(128,128,128,0.1)', borderRadius:4, height:6, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(val/max*100).toFixed(0)}%`, background:`linear-gradient(90deg,${t.accent2},${t.accent})`, borderRadius:4, transition:'width 0.7s cubic-bezier(.4,0,.2,1)' }} />
          </div>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'0.7rem', color:t.accent, width:55, textAlign:'right', flexShrink:0 }}>{(val/1e6).toFixed(2)}M</span>
        </div>
      ))}
    </div>
  );
}

function ThemeSwitcher({ current, onChange, t }) {
  return (
    <div style={{ display:'flex', gap:6 }}>
      {Object.entries(THEMES).map(([key,theme])=>(
        <button key={key} onClick={()=>onChange(key)} title={theme.name} style={{
          background: current===key ? t.accent : t.surface2,
          border:`1px solid ${current===key ? t.accent : t.border}`,
          borderRadius:8, padding:'5px 10px', fontSize:'1rem',
          color: current===key ? '#fff' : t.muted,
          transition:'all 0.2s', lineHeight:1, cursor:'pointer',
        }}>{theme.icon}</button>
      ))}
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────
function Skeleton({ t }) {
  const pulse = { animation:'pulse 1.5s ease-in-out infinite', background:`linear-gradient(90deg,${t.surface} 25%,${t.surface2} 50%,${t.surface} 75%)`, backgroundSize:'200% 100%', borderRadius:12 };
  return (
    <div style={{ padding:24 }}>
      <style>{`@keyframes pulse{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}`}</style>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:32 }}>
        <div style={{ ...pulse, width:260, height:40 }} /><div style={{ ...pulse, width:120, height:36 }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[0,1,2,3].map(i=><div key={i} style={{ ...pulse, height:110 }} />)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ ...pulse, height:280 }}/><div style={{ ...pulse, height:280 }}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
        {[0,1,2].map(i=><div key={i} style={{ ...pulse, height:260 }} />)}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [themeName, setThemeName] = useState('dark');

  // Filters — empty array = "Todos"
  const [filterEstados, setFilterEstados] = useState([]);
  const [filterCidades, setFilterCidades] = useState([]);
  const [filterMeses, setFilterMeses] = useState([]);

  const t = THEMES[themeName];

  useEffect(() => {
    loadDashboardData()
      .then(d => { setRawData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Derived: filter raw rows based on active filters
  const filteredRows = useMemo(() => {
    if (!rawData) return [];
    return rawData.rawRows.filter(r => {
      if (filterEstados.length && !filterEstados.includes(r.estado)) return false;
      if (filterCidades.length && !filterCidades.includes(r.cidade)) return false;
      if (filterMeses.length && !filterMeses.includes(r.mes)) return false;
      return true;
    });
  }, [rawData, filterEstados, filterCidades, filterMeses]);

  const currentData = useMemo(() => {
    if (!filteredRows.length && rawData) return aggregate(rawData.rawRows);
    return aggregate(filteredRows);
  }, [filteredRows, rawData]);

  // Available cities depend on selected estados
  const availableCidades = useMemo(() => {
    if (!rawData) return [];
    const src = filterEstados.length
      ? rawData.rawRows.filter(r => filterEstados.includes(r.estado))
      : rawData.rawRows;
    return [...new Set(src.map(r => r.cidade))];
  }, [rawData, filterEstados]);

  // When estado changes, drop cities that no longer belong
useEffect(() => {
    if (filterCidades.length && availableCidades.length) {
      const valid = filterCidades.filter(c => availableCidades.includes(c));
      if (valid.length !== filterCidades.length) {
        setFilterCidades(valid);
      }
    }
  }, [availableCidades, filterCidades]);

  const hasFilters = filterEstados.length + filterCidades.length + filterMeses.length > 0;
  const noResults = hasFilters && filteredRows.length === 0;

  const appStyle = { background:t.bg, color:t.text, minHeight:'100vh', padding:'24px', transition:'background 0.4s, color 0.4s' };

  if (loading) return <div style={appStyle}><Skeleton t={t} /></div>;
  if (error) return <div style={{ ...appStyle, display:'flex', alignItems:'center', justifyContent:'center', color:'#f87171' }}>Erro ao carregar dados: {error}</div>;

  const { estadosList, mesesList } = rawData;
  const { kpi } = currentData;

  const showEstadoGrid = filterEstados.length === 0 && filterCidades.length === 0;

  return (
    <div style={appStyle}>
      {/* HEADER */}
      <header style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:22, paddingBottom:20, borderBottom:`1px solid ${t.border}`, flexWrap:'wrap', gap:16 }}>
        <div>
          <h1 style={{ fontSize:'1.7rem', fontWeight:800, letterSpacing:'-0.03em', background:`linear-gradient(135deg,${t.text} 30%,${t.accent})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1 }}>
            Dashboard Turismo Nordeste
          </h1>
          <p style={{ color:t.muted, fontSize:'0.72rem', marginTop:6, fontWeight:300, letterSpacing:'0.07em', textTransform:'uppercase' }}>
            Análise de desempenho · CE · PE · PI · RN · 2024
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <ThemeSwitcher current={themeName} onChange={setThemeName} t={t} />
          <span style={{ background:`rgba(${hexToRgb(t.accent)},0.12)`, color:t.accent, fontSize:'0.68rem', fontWeight:600, padding:'5px 12px', borderRadius:20, border:`1px solid rgba(${hexToRgb(t.accent)},0.25)`, letterSpacing:'0.08em', textTransform:'uppercase' }}>
            ● Dados Reais
          </span>
        </div>
      </header>

      {/* FILTERS PANEL */}
      <Card t={t} style={{ marginBottom:22, padding:'18px 22px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <span style={{ fontSize:'0.72rem', fontWeight:600, color:t.text, textTransform:'uppercase', letterSpacing:'0.07em' }}>🔍 Filtros</span>
          {hasFilters && (
            <button onClick={()=>{ setFilterEstados([]); setFilterCidades([]); setFilterMeses([]); }} style={{ background:'transparent', border:`1px solid ${t.border}`, color:t.muted, padding:'4px 12px', borderRadius:6, fontSize:'0.68rem', cursor:'pointer' }}>
              Limpar tudo
            </button>
          )}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <FilterSection label="Estado" options={estadosList} active={filterEstados} onChange={setFilterEstados} t={t} multi />
          <FilterSection label="Cidade" options={availableCidades} active={filterCidades} onChange={setFilterCidades} t={t} multi />
          <FilterSection label="Mês" options={mesesList} active={filterMeses} onChange={setFilterMeses} t={t} multi
            renderOption={m => MONTH_PT_MAP[m]} />
        </div>
        <ActiveFilters estados={filterEstados} cidades={filterCidades} meses={filterMeses} onClear={()=>{setFilterEstados([]);setFilterCidades([]);setFilterMeses([]);}} t={t} />
      </Card>

      {/* NO RESULTS */}
      {noResults && (
        <div style={{ textAlign:'center', padding:'60px 0', color:t.muted, fontSize:'0.9rem' }}>
          Nenhum dado para a combinação de filtros selecionada.
        </div>
      )}

      {!noResults && <>
        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }} className="kpi-grid">
          <KpiCard label="Receita Total" value={fmt(kpi.receita)} sub={`${filteredRows.length || rawData.rawRows.length} registros`} icon="💰" accentColor={t.accent} t={t} />
          <KpiCard label="Clientes Atendidos" value={fmtK(kpi.clientes)} sub="total de hóspedes" icon="👥" accentColor={t.accent2} t={t} />
          <KpiCard label="Taxa de Ocupação" value={kpi.ocupacao.toFixed(1)+'%'} sub="média no período" icon="🏨" accentColor={t.accent3} t={t} />
          <KpiCard label="Avaliação Média" value={kpi.avaliacao.toFixed(2)} sub="escala 1–5" icon="⭐" accentColor={t.accent4} t={t} />
        </div>

        {/* MAIN GRID */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }} className="main-grid">
          <Card t={t}>
            <CardTitle dot={t.accent2} t={t}>Receita Mensal (R$)</CardTitle>
            <RevenueLineChart data={currentData} activeMeses={filterMeses} t={t} />
          </Card>
          <Card t={t}>
            <CardTitle dot={t.accent} t={t}>Mix por Tipo</CardTitle>
            <TipoDonut data={currentData} themeName={themeName} t={t} />
          </Card>
        </div>

        {/* BOTTOM GRID */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }} className="bottom-grid">
          <Card t={t}>
            <CardTitle dot={t.accent3} t={t}>Clientes por Mês</CardTitle>
            <ClientesBarChart data={currentData} activeMeses={filterMeses} t={t} />
          </Card>
          <Card t={t}>
            <CardTitle dot={t.accent4} t={t}>
              {showEstadoGrid ? 'Receita por Estado' : `Distribuição de Estados`}
            </CardTitle>
            {showEstadoGrid
              ? <EstadoGrid data={currentData} themeName={themeName} t={t} />
              : <RankCidades data={currentData} t={t} />
            }
          </Card>
          <Card t={t}>
            <CardTitle dot={t.accent2} t={t}>Ranking de Cidades</CardTitle>
            <RankCidades data={currentData} t={t} />
          </Card>
        </div>
      </>}

      {/* FOOTER */}
      <footer style={{ marginTop:28, paddingTop:16, borderTop:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <span style={{ fontSize:'0.68rem', color:t.muted }}>Fonte: base_case_turismo.xlsx · dados carregados dinamicamente</span>
        <span style={{ fontSize:'0.68rem', color:t.muted }}>Dashboard Turismo Nordeste © 2024</span>
      </footer>

      <style>{`
        @media (max-width: 1024px) { .main-grid { grid-template-columns: 1fr !important; } .bottom-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 700px) { .kpi-grid { grid-template-columns: repeat(2,1fr) !important; } .bottom-grid { grid-template-columns: 1fr !important; } .main-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 400px) { .kpi-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
