import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'startup-financial-model',
  title: 'Startup Financial Model',
  description:
    'Interactive P&L projector with revenue growth, burn rate, headcount sliders, and auto-generated runway charts.',
  category: 'dashboard',
  thumbnailEmoji: '📈',
  editorScrollTarget: '// 📈 FINANCIAL MODEL ENGINE',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '📈 Model your startup finances. Adjust growth, burn rate, and headcount to see your runway and projections.',
    ctaLabel: '▶ Run Projections',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Startup Financial Model</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>
    window.onerror = function(msg, src, line, col, err) {
      window.parent.postMessage({ type: 'runtime-error', message: String(msg), source: src, line: line, column: col }, '*');
    };
    window.onunhandledrejection = function(e) {
      window.parent.postMessage({ type: 'runtime-error', message: String(e.reason) }, '*');
    };
  <\/script>
  <style>
    body { margin: 0; background: #0b1120; color: #e2e8f0; font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #1e293b; }
    ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
    input[type=range] { -webkit-appearance: none; background: transparent; width: 100%; }
    input[type=range]::-webkit-slider-track { height: 4px; background: #334155; border-radius: 2px; }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; margin-top: -6px; cursor: pointer; }
    @keyframes fadeIn { 0% { opacity:0; transform:translateY(8px); } 100% { opacity:1; transform:translateY(0); } }
    .fade-in { animation: fadeIn 0.3s ease-out; }
    .metric-positive { color: #34d399; }
    .metric-negative { color: #f87171; }
    .death-row { background: rgba(239,68,68,0.15) !important; }
    canvas { image-rendering: auto; }
  </style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
// 📈 FINANCIAL MODEL ENGINE
// Full startup P&L projector with 24-month runway, scenario comparison, and canvas charts.

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ── Pre-loaded Scenarios ──
const PRESETS = {
  'bootstrapped-saas': {
    label: 'Bootstrapped SaaS',
    startingCash: 150000, monthlyRevenueStart: 5000, revenueGrowthRate: 12,
    monthlyBurnRate: 25000, teamSize: 3, avgSalary: 90000, otherMonthlyCosts: 5000,
    seedAmount: 0, seedMonth: 0, seriesAAmount: 0, seriesAMonth: 0, cogsPercent: 30,
  },
  'vc-marketplace': {
    label: 'VC-Backed Marketplace',
    startingCash: 500000, monthlyRevenueStart: 2000, revenueGrowthRate: 20,
    monthlyBurnRate: 80000, teamSize: 8, avgSalary: 120000, otherMonthlyCosts: 15000,
    seedAmount: 2000000, seedMonth: 1, seriesAAmount: 8000000, seriesAMonth: 12, cogsPercent: 30,
  },
  'deep-tech': {
    label: 'Deep Tech / Hardware',
    startingCash: 1000000, monthlyRevenueStart: 0, revenueGrowthRate: 5,
    monthlyBurnRate: 150000, teamSize: 12, avgSalary: 140000, otherMonthlyCosts: 40000,
    seedAmount: 3000000, seedMonth: 1, seriesAAmount: 15000000, seriesAMonth: 18, cogsPercent: 30,
  },
};

const DEFAULT_PARAMS = { ...PRESETS['bootstrapped-saas'], cogsPercent: 30 };

// ── Utility Helpers ──
function fmt(n) {
  if (Math.abs(n) >= 1e6) return (n < 0 ? '-' : '') + '$' + (Math.abs(n) / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n < 0 ? '-' : '') + '$' + (Math.abs(n) / 1e3).toFixed(0) + 'K';
  return '$' + n.toFixed(0);
}
function pct(n) { return n.toFixed(1) + '%'; }

// ── Projection Engine ──
function computeProjection(p) {
  const rows = [];
  let cash = p.startingCash;
  let revenue = p.monthlyRevenueStart;
  let deathMonth = null;
  let breakEvenMonth = null;

  for (let m = 1; m <= 24; m++) {
    // Funding injections
    if (p.seedAmount > 0 && m === p.seedMonth) cash += p.seedAmount;
    if (p.seriesAAmount > 0 && m === p.seriesAMonth) cash += p.seriesAAmount;

    const cogs = revenue * (p.cogsPercent / 100);
    const grossProfit = revenue - cogs;
    const salaries = (p.teamSize * p.avgSalary) / 12;
    const otherOpex = p.otherMonthlyCosts;
    const totalExpenses = salaries + otherOpex + cogs;
    const netIncome = revenue - totalExpenses;
    cash += netIncome;

    if (cash <= 0 && deathMonth === null) deathMonth = m;
    if (netIncome >= 0 && breakEvenMonth === null && m > 1) breakEvenMonth = m;

    rows.push({
      month: m, revenue, cogs, grossProfit, salaries, otherOpex, totalExpenses,
      netIncome, cashBalance: cash,
      fundingEvent: (p.seedAmount > 0 && m === p.seedMonth) ? 'Seed' :
                    (p.seriesAAmount > 0 && m === p.seriesAMonth) ? 'Series A' : null,
    });

    // Grow revenue for next month
    revenue = revenue * (1 + p.revenueGrowthRate / 100);
  }

  const lastRow = rows[rows.length - 1];
  const currentBurn = rows.length > 0 ? Math.max(0, rows[0].totalExpenses - rows[0].revenue) : 0;
  const runway = deathMonth || 'N/A';
  const totalFundingNeeded = breakEvenMonth
    ? 0
    : Math.max(0, -Math.min(...rows.map(r => r.cashBalance)));

  return { rows, deathMonth, breakEvenMonth, runway, currentBurn, totalFundingNeeded };
}

// ── Slider Component ──
function Slider({ label, value, onChange, min, max, step, format }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-blue-300 font-semibold">{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step || 1}
        value={value} onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

// ── Canvas Charts ──
function BarChart({ rows, width, height }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const W = width, H = height;
    ctx.clearRect(0, 0, W, H);
    const pad = { top: 30, right: 20, bottom: 40, left: 60 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;
    const maxVal = Math.max(...rows.map(r => Math.max(r.revenue, r.totalExpenses)), 1);
    const barW = Math.max(2, (cw / rows.length) * 0.35);

    // Grid
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + ch - (ch * i / 4);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#64748b'; ctx.font = '10px monospace'; ctx.textAlign = 'right';
      ctx.fillText(fmt(maxVal * i / 4), pad.left - 6, y + 3);
    }

    rows.forEach((r, i) => {
      const x = pad.left + (i + 0.5) * (cw / rows.length);
      const revH = (r.revenue / maxVal) * ch;
      const expH = (r.totalExpenses / maxVal) * ch;

      ctx.fillStyle = '#34d399';
      ctx.fillRect(x - barW, pad.top + ch - revH, barW, revH);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(x, pad.top + ch - expH, barW, expH);

      if (i % 3 === 0) {
        ctx.fillStyle = '#64748b'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
        ctx.fillText('M' + r.month, x, H - pad.bottom + 16);
      }
    });

    // Legend
    ctx.fillStyle = '#34d399'; ctx.fillRect(pad.left, 6, 10, 10);
    ctx.fillStyle = '#e2e8f0'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
    ctx.fillText('Revenue', pad.left + 14, 15);
    ctx.fillStyle = '#f87171'; ctx.fillRect(pad.left + 90, 6, 10, 10);
    ctx.fillStyle = '#e2e8f0'; ctx.fillText('Expenses', pad.left + 104, 15);
  }, [rows, width, height]);
  return <canvas ref={canvasRef} width={width} height={height} />;
}

function LineChart({ rows, deathMonth, width, height }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const W = width, H = height;
    ctx.clearRect(0, 0, W, H);
    const pad = { top: 30, right: 20, bottom: 40, left: 60 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;
    const vals = rows.map(r => r.cashBalance);
    const minV = Math.min(...vals, 0);
    const maxV = Math.max(...vals, 1);
    const range = maxV - minV || 1;

    // Grid
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const v = minV + range * i / 4;
      const y = pad.top + ch - ((v - minV) / range) * ch;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#64748b'; ctx.font = '10px monospace'; ctx.textAlign = 'right';
      ctx.fillText(fmt(v), pad.left - 6, y + 3);
    }

    // Zero line
    const zeroY = pad.top + ch - ((0 - minV) / range) * ch;
    ctx.strokeStyle = '#475569'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad.left, zeroY); ctx.lineTo(W - pad.right, zeroY); ctx.stroke();
    ctx.setLineDash([]);

    // Cash line
    ctx.beginPath(); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2;
    rows.forEach((r, i) => {
      const x = pad.left + (i / (rows.length - 1)) * cw;
      const y = pad.top + ch - ((r.cashBalance - minV) / range) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under curve
    const lastX = pad.left + cw;
    const lastY = pad.top + ch - ((vals[vals.length - 1] - minV) / range) * ch;
    ctx.lineTo(lastX, pad.top + ch); ctx.lineTo(pad.left, pad.top + ch); ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0, 'rgba(96,165,250,0.15)'); grad.addColorStop(1, 'rgba(96,165,250,0)');
    ctx.fillStyle = grad; ctx.fill();

    // Death marker
    if (deathMonth) {
      const dx = pad.left + ((deathMonth - 1) / (rows.length - 1)) * cw;
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([6, 3]);
      ctx.beginPath(); ctx.moveTo(dx, pad.top); ctx.lineTo(dx, pad.top + ch); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('RUNWAY END', dx, pad.top - 6);
    }

    // X labels
    rows.forEach((r, i) => {
      if (i % 3 === 0) {
        const x = pad.left + (i / (rows.length - 1)) * cw;
        ctx.fillStyle = '#64748b'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
        ctx.fillText('M' + r.month, x, H - pad.bottom + 16);
      }
    });

    // Title
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText('Cash Runway', pad.left, 15);
  }, [rows, deathMonth, width, height]);
  return <canvas ref={canvasRef} width={width} height={height} />;
}

function BurnChart({ rows, width, height }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const W = width, H = height;
    ctx.clearRect(0, 0, W, H);
    const pad = { top: 30, right: 20, bottom: 40, left: 60 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;
    const burns = rows.map(r => Math.max(0, r.totalExpenses - r.revenue));
    const maxB = Math.max(...burns, 1);

    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + ch - (ch * i / 4);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#64748b'; ctx.font = '10px monospace'; ctx.textAlign = 'right';
      ctx.fillText(fmt(maxB * i / 4), pad.left - 6, y + 3);
    }

    // Area fill
    ctx.beginPath();
    burns.forEach((b, i) => {
      const x = pad.left + (i / (burns.length - 1)) * cw;
      const y = pad.top + ch - (b / maxB) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + cw, pad.top + ch); ctx.lineTo(pad.left, pad.top + ch); ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0, 'rgba(251,146,60,0.4)'); grad.addColorStop(1, 'rgba(251,146,60,0)');
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2;
    burns.forEach((b, i) => {
      const x = pad.left + (i / (burns.length - 1)) * cw;
      const y = pad.top + ch - (b / maxB) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    rows.forEach((r, i) => {
      if (i % 3 === 0) {
        const x = pad.left + (i / (rows.length - 1)) * cw;
        ctx.fillStyle = '#64748b'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
        ctx.fillText('M' + r.month, x, H - pad.bottom + 16);
      }
    });
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText('Net Burn Rate', pad.left, 15);
  }, [rows, width, height]);
  return <canvas ref={canvasRef} width={width} height={height} />;
}

function PieChart({ row, width, height }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2, cy = height / 2 + 10, r = Math.min(width, height) / 2 - 30;
    const slices = [
      { label: 'Salaries', value: row.salaries, color: '#3b82f6' },
      { label: 'COGS', value: row.cogs, color: '#f59e0b' },
      { label: 'Other OpEx', value: row.otherOpex, color: '#8b5cf6' },
    ].filter(s => s.value > 0);
    const total = slices.reduce((s, x) => s + x.value, 0) || 1;
    let angle = -Math.PI / 2;

    slices.forEach(s => {
      const sweep = (s.value / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + sweep);
      ctx.closePath(); ctx.fillStyle = s.color; ctx.fill();
      // Label
      const mid = angle + sweep / 2;
      const lx = cx + (r * 0.65) * Math.cos(mid);
      const ly = cy + (r * 0.65) * Math.sin(mid);
      if (sweep > 0.3) {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
        ctx.fillText(Math.round(s.value / total * 100) + '%', lx, ly);
      }
      angle += sweep;
    });

    // Legend
    let ly = 12;
    ctx.font = '11px monospace'; ctx.textAlign = 'left';
    slices.forEach(s => {
      ctx.fillStyle = s.color; ctx.fillRect(8, ly - 8, 10, 10);
      ctx.fillStyle = '#e2e8f0'; ctx.fillText(s.label + ' ' + fmt(s.value), 22, ly);
      ly += 16;
    });
  }, [row, width, height]);
  return <canvas ref={canvasRef} width={width} height={height} />;
}

// ── Metric Card ──
function MetricCard({ label, value, sub, positive }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-center">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={"text-xl font-bold " + (positive === true ? 'metric-positive' : positive === false ? 'metric-negative' : 'text-blue-300')}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

// ── Main App ──
function App() {
  const [params, setParams] = useState({ ...DEFAULT_PARAMS });
  const [scenarios, setScenarios] = useState([]);
  const [activePreset, setActivePreset] = useState('bootstrapped-saas');

  const updateParam = useCallback((key, val) => {
    setParams(prev => ({ ...prev, [key]: val }));
  }, []);

  const projection = useMemo(() => computeProjection(params), [params]);

  const saveScenario = () => {
    if (scenarios.length >= 3) return;
    setScenarios(prev => [...prev, {
      id: Date.now(), label: 'Scenario ' + (prev.length + 1),
      params: { ...params }, projection: { ...projection },
    }]);
  };

  const clearScenarios = () => setScenarios([]);

  const loadPreset = (key) => {
    setActivePreset(key);
    setParams({ ...PRESETS[key] });
  };

  const chartW = 380, chartH = 220;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left Sidebar: Inputs ── */}
      <div className="w-80 flex-shrink-0 bg-slate-900/80 border-r border-slate-700 overflow-y-auto p-4">
        <h1 className="text-lg font-extrabold text-blue-400 mb-1">Startup Financial Model</h1>
        <p className="text-xs text-slate-500 mb-4">24-month P&L projector</p>

        {/* Presets */}
        <div className="mb-4">
          <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Presets</div>
          <div className="flex flex-col gap-1">
            {Object.entries(PRESETS).map(([k, v]) => (
              <button key={k} onClick={() => loadPreset(k)}
                className={"text-left text-xs px-3 py-2 rounded-md border transition-all " +
                  (activePreset === k
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600')}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-700 pt-3">
          <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Cash & Revenue</div>
          <Slider label="Starting Cash" value={params.startingCash} min={100000} max={10000000} step={50000}
            onChange={v => updateParam('startingCash', v)} format={fmt} />
          <Slider label="Monthly Revenue (start)" value={params.monthlyRevenueStart} min={0} max={100000} step={1000}
            onChange={v => updateParam('monthlyRevenueStart', v)} format={fmt} />
          <Slider label="Revenue Growth Rate" value={params.revenueGrowthRate} min={0} max={30} step={0.5}
            onChange={v => updateParam('revenueGrowthRate', v)} format={v => pct(v)} />
        </div>

        <div className="border-t border-slate-700 pt-3 mt-2">
          <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Costs</div>
          <Slider label="COGS %" value={params.cogsPercent} min={0} max={80} step={1}
            onChange={v => updateParam('cogsPercent', v)} format={v => v + '%'} />
          <Slider label="Team Size" value={params.teamSize} min={1} max={50} step={1}
            onChange={v => updateParam('teamSize', v)} format={v => v + ' people'} />
          <Slider label="Avg Salary (annual)" value={params.avgSalary} min={50000} max={200000} step={5000}
            onChange={v => updateParam('avgSalary', v)} format={fmt} />
          <Slider label="Other Monthly Costs" value={params.otherMonthlyCosts} min={0} max={100000} step={1000}
            onChange={v => updateParam('otherMonthlyCosts', v)} format={fmt} />
        </div>

        <div className="border-t border-slate-700 pt-3 mt-2">
          <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Funding Rounds</div>
          <Slider label="Seed Amount" value={params.seedAmount} min={0} max={5000000} step={50000}
            onChange={v => updateParam('seedAmount', v)} format={fmt} />
          <Slider label="Seed Month" value={params.seedMonth} min={0} max={24} step={1}
            onChange={v => updateParam('seedMonth', v)} format={v => v === 0 ? 'None' : 'M' + v} />
          <Slider label="Series A Amount" value={params.seriesAAmount} min={0} max={20000000} step={100000}
            onChange={v => updateParam('seriesAAmount', v)} format={fmt} />
          <Slider label="Series A Month" value={params.seriesAMonth} min={0} max={24} step={1}
            onChange={v => updateParam('seriesAMonth', v)} format={v => v === 0 ? 'None' : 'M' + v} />
        </div>

        <div className="border-t border-slate-700 pt-3 mt-3">
          <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Scenarios</div>
          <button onClick={saveScenario}
            disabled={scenarios.length >= 3}
            className="w-full text-xs px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all mb-2">
            Save Current ({scenarios.length}/3)
          </button>
          {scenarios.length > 0 && (
            <button onClick={clearScenarios}
              className="w-full text-xs px-3 py-2 rounded-md border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-all">
              Clear All Scenarios
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-5 gap-3 mb-4 fade-in">
          <MetricCard label="Runway" value={projection.deathMonth ? projection.deathMonth + ' mo' : '24+ mo'}
            positive={!projection.deathMonth} sub={projection.deathMonth ? 'Cash hits $0' : 'Sustainable'} />
          <MetricCard label="Monthly Burn" value={fmt(projection.currentBurn)}
            positive={projection.currentBurn === 0} sub="Month 1 net burn" />
          <MetricCard label="Revenue Growth" value={pct(params.revenueGrowthRate)}
            positive={params.revenueGrowthRate > 10} sub="Month-over-month" />
          <MetricCard label="Break-even" value={projection.breakEvenMonth ? 'M' + projection.breakEvenMonth : 'Never'}
            positive={!!projection.breakEvenMonth}
            sub={projection.breakEvenMonth ? 'Net income >= 0' : 'Within 24 months'} />
          <MetricCard label="Funding Gap" value={projection.totalFundingNeeded > 0 ? fmt(projection.totalFundingNeeded) : '$0'}
            positive={projection.totalFundingNeeded === 0}
            sub="To reach profitability" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
            <BarChart rows={projection.rows} width={chartW} height={chartH} />
          </div>
          <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
            <LineChart rows={projection.rows} deathMonth={projection.deathMonth} width={chartW} height={chartH} />
          </div>
          <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
            <BurnChart rows={projection.rows} width={chartW} height={chartH} />
          </div>
          <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
            <PieChart row={projection.rows[0]} width={chartW} height={chartH} />
          </div>
        </div>

        {/* Scenario Comparison */}
        {scenarios.length > 0 && (
          <div className="mb-4 fade-in">
            <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Scenario Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-400">Metric</th>
                    <th className="text-right py-2 px-3 text-blue-400">Current</th>
                    {scenarios.map(s => (
                      <th key={s.id} className="text-right py-2 px-3 text-slate-400">{s.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Runway', current: projection.deathMonth ? projection.deathMonth + ' mo' : '24+', get: s => s.projection.deathMonth ? s.projection.deathMonth + ' mo' : '24+' },
                    { label: 'Monthly Burn', current: fmt(projection.currentBurn), get: s => fmt(s.projection.currentBurn) },
                    { label: 'Break-even', current: projection.breakEvenMonth ? 'M' + projection.breakEvenMonth : 'N/A', get: s => s.projection.breakEvenMonth ? 'M' + s.projection.breakEvenMonth : 'N/A' },
                    { label: 'End Cash (M24)', current: fmt(projection.rows[23]?.cashBalance || 0), get: s => fmt(s.projection.rows[23]?.cashBalance || 0) },
                    { label: 'End Revenue (M24)', current: fmt(projection.rows[23]?.revenue || 0), get: s => fmt(s.projection.rows[23]?.revenue || 0) },
                    { label: 'Team Size', current: params.teamSize, get: s => s.params.teamSize },
                    { label: 'Funding Gap', current: fmt(projection.totalFundingNeeded), get: s => fmt(s.projection.totalFundingNeeded) },
                  ].map(row => (
                    <tr key={row.label} className="border-b border-slate-800 hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-slate-400">{row.label}</td>
                      <td className="py-2 px-3 text-right text-blue-300 font-semibold">{row.current}</td>
                      {scenarios.map(s => (
                        <td key={s.id} className="py-2 px-3 text-right text-slate-300">{row.get(s)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* P&L Table */}
        <div className="fade-in">
          <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">24-Month P&L Projection</h3>
          <div className="overflow-x-auto border border-slate-700 rounded-lg">
            <table className="w-full text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-800/80">
                  <th className="py-2 px-3 text-left text-slate-400 sticky left-0 bg-slate-800/80 z-10">Month</th>
                  <th className="py-2 px-3 text-right text-slate-400">Revenue</th>
                  <th className="py-2 px-3 text-right text-slate-400">COGS</th>
                  <th className="py-2 px-3 text-right text-slate-400">Gross Profit</th>
                  <th className="py-2 px-3 text-right text-slate-400">Salaries</th>
                  <th className="py-2 px-3 text-right text-slate-400">Other OpEx</th>
                  <th className="py-2 px-3 text-right text-slate-400">Total Exp.</th>
                  <th className="py-2 px-3 text-right text-slate-400">Net Income</th>
                  <th className="py-2 px-3 text-right text-slate-400">Cash Balance</th>
                  <th className="py-2 px-3 text-center text-slate-400">Event</th>
                </tr>
              </thead>
              <tbody>
                {projection.rows.map(r => {
                  const isDeath = projection.deathMonth === r.month;
                  const isDead = projection.deathMonth && r.month >= projection.deathMonth;
                  return (
                    <tr key={r.month}
                      className={(isDeath ? 'death-row ' : '') + (isDead ? 'opacity-60 ' : '') + 'border-b border-slate-800/50 hover:bg-slate-800/20'}>
                      <td className={"py-1.5 px-3 font-semibold sticky left-0 z-10 " +
                        (isDeath ? 'text-red-400 bg-red-500/10' : 'text-slate-300 bg-slate-900/60')}>
                        M{r.month} {isDeath && '💀'}
                      </td>
                      <td className="py-1.5 px-3 text-right text-green-400">{fmt(r.revenue)}</td>
                      <td className="py-1.5 px-3 text-right text-yellow-400">{fmt(r.cogs)}</td>
                      <td className="py-1.5 px-3 text-right text-slate-300">{fmt(r.grossProfit)}</td>
                      <td className="py-1.5 px-3 text-right text-blue-300">{fmt(r.salaries)}</td>
                      <td className="py-1.5 px-3 text-right text-purple-300">{fmt(r.otherOpex)}</td>
                      <td className="py-1.5 px-3 text-right text-slate-300">{fmt(r.totalExpenses)}</td>
                      <td className={"py-1.5 px-3 text-right font-semibold " + (r.netIncome >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {fmt(r.netIncome)}
                      </td>
                      <td className={"py-1.5 px-3 text-right font-semibold " + (r.cashBalance > 0 ? 'text-blue-300' : 'text-red-500')}>
                        {fmt(r.cashBalance)}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        {r.fundingEvent && (
                          <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                            {r.fundingEvent}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
<\/script>
</body>
</html>`;
