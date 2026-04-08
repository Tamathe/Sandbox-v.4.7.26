import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'budget-allocation',
  title: 'University Budget Allocation Challenge',
  description:
    'Multi-round budget simulator with consequence matrix, KPI tracking, radar charts, and crisis scenarios.',
  category: 'dashboard',
  thumbnailEmoji: '📊',
  editorScrollTarget: '// 📊 BUDGET CONSEQUENCE ENGINE',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '📊 You are the CFO of a university. Allocate $500M across 8 categories and see the consequences.',
    ctaLabel: '▶ Start Budget Round',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>University Budget Allocation Challenge</title>
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
    body { margin: 0; background: #0f172a; color: #e2e8f0; font-family: system-ui, -apple-system, sans-serif; }
    @keyframes pulseRed {
      0% { box-shadow: inset 0 0 0 0 rgba(239,68,68,0); }
      30% { box-shadow: inset 0 0 120px 40px rgba(239,68,68,0.25); }
      100% { box-shadow: inset 0 0 0 0 rgba(239,68,68,0); }
    }
    @keyframes pulseGold {
      0% { box-shadow: inset 0 0 0 0 rgba(250,204,21,0); }
      30% { box-shadow: inset 0 0 120px 40px rgba(250,204,21,0.2); }
      100% { box-shadow: inset 0 0 0 0 rgba(250,204,21,0); }
    }
    @keyframes slideDown {
      0% { transform: translateY(-30px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes kpiFlashGreen {
      0% { background: rgba(16,185,129,0.3); }
      100% { background: transparent; }
    }
    @keyframes kpiFlashRed {
      0% { background: rgba(239,68,68,0.3); }
      100% { background: transparent; }
    }
    .pulse-red { animation: pulseRed 1.5s ease-out; }
    .pulse-gold { animation: pulseGold 1.5s ease-out; }
    .slide-down { animation: slideDown 0.5s ease-out; }
    .fade-in { animation: fadeIn 0.6s ease-out; }
    .kpi-up { animation: kpiFlashGreen 0.8s ease-out; }
    .kpi-down { animation: kpiFlashRed 0.8s ease-out; }
    .glass-panel {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(148, 163, 184, 0.15);
    }
    input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      height: 6px;
      border-radius: 3px;
      background: #334155;
      outline: none;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      border: 2px solid #1e3a5f;
      box-shadow: 0 0 6px rgba(59,130,246,0.5);
    }
    input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      border: 2px solid #1e3a5f;
      box-shadow: 0 0 6px rgba(59,130,246,0.5);
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useReducer, useEffect, useRef, useCallback, useMemo } = React;

    // ============================================================
    // 📊 BUDGET CONSEQUENCE ENGINE
    // ============================================================

    const CATEGORIES = [
      { key: 'financialAid', label: 'Financial Aid', icon: '🎓', color: '#3b82f6' },
      { key: 'athletics', label: 'Athletics', icon: '🏈', color: '#f59e0b' },
      { key: 'research', label: 'Research', icon: '🔬', color: '#8b5cf6' },
      { key: 'facultySalaries', label: 'Faculty Salaries', icon: '👨‍🏫', color: '#10b981' },
      { key: 'facilities', label: 'Facilities', icon: '🏛️', color: '#6366f1' },
      { key: 'technology', label: 'Technology', icon: '💻', color: '#06b6d4' },
      { key: 'studentServices', label: 'Student Services', icon: '🤝', color: '#ec4899' },
      { key: 'marketing', label: 'Marketing', icon: '📢', color: '#f97316' },
    ];

    const KPIS = [
      { key: 'enrollment', label: 'Enrollment', icon: '📈', benchmark: 68 },
      { key: 'graduationRate', label: 'Graduation Rate', icon: '🎓', benchmark: 72 },
      { key: 'researchOutput', label: 'Research Output', icon: '📄', benchmark: 65 },
      { key: 'alumniGiving', label: 'Alumni Giving', icon: '💰', benchmark: 55 },
      { key: 'studentSatisfaction', label: 'Student Satisfaction', icon: '😊', benchmark: 70 },
      { key: 'facultyRetention', label: 'Faculty Retention', icon: '🏠', benchmark: 63 },
    ];

    const INFLUENCE = {
      financialAid:    { enrollment: 0.35, graduationRate: 0.25, studentSatisfaction: 0.15 },
      athletics:       { alumniGiving: 0.30, enrollment: 0.10, facultyRetention: -0.05 },
      research:        { researchOutput: 0.40, facultyRetention: 0.20 },
      facultySalaries: { facultyRetention: 0.35, researchOutput: 0.15 },
      facilities:      { studentSatisfaction: 0.25, enrollment: 0.10 },
      technology:      { graduationRate: 0.10, researchOutput: 0.10, studentSatisfaction: 0.05 },
      studentServices: { graduationRate: 0.20, studentSatisfaction: 0.20 },
      marketing:       { enrollment: 0.20, alumniGiving: 0.05 },
    };

    function computeKPIs(allocations) {
      const kpis = {};
      KPIS.forEach(k => { kpis[k.key] = 0; });

      CATEGORIES.forEach(cat => {
        const pct = allocations[cat.key] || 0;
        // Diminishing returns: use log curve above 20%
        let effectivePct = pct;
        if (pct > 20) {
          effectivePct = 20 + Math.log(1 + (pct - 20) / 10) * 10;
        }
        const influences = INFLUENCE[cat.key] || {};
        Object.entries(influences).forEach(([kpiKey, weight]) => {
          kpis[kpiKey] += effectivePct * weight;
        });
      });

      // Normalize to 0-100
      Object.keys(kpis).forEach(k => {
        kpis[k] = Math.max(0, Math.min(100, Math.round(kpis[k] * 3.2 + 15)));
      });
      return kpis;
    }

    const DEFAULT_ALLOC = {};
    CATEGORIES.forEach(c => { DEFAULT_ALLOC[c.key] = 12.5; });

    const INITIAL_STATE = {
      round: 1,
      totalBudget: 500000000,
      allocations: { ...DEFAULT_ALLOC },
      kpis: computeKPIs(DEFAULT_ALLOC),
      roundHistory: [],
      crisisApplied: false,
      giftApplied: false,
      giftCategories: [],
      showTransition: null,
      prevKpis: computeKPIs(DEFAULT_ALLOC),
    };

    function budgetReducer(state, action) {
      switch (action.type) {
        case 'SET_ALLOCATION': {
          const newAlloc = { ...state.allocations, [action.category]: action.value };
          const newKpis = computeKPIs(newAlloc);
          return { ...state, allocations: newAlloc, kpis: newKpis };
        }
        case 'SUBMIT_ROUND': {
          const snapshot = {
            round: state.round,
            budget: state.totalBudget,
            allocations: { ...state.allocations },
            kpis: { ...state.kpis },
          };
          const newHistory = [...state.roundHistory, snapshot];

          if (state.round === 1) {
            return {
              ...state,
              round: 2,
              totalBudget: 425000000,
              roundHistory: newHistory,
              crisisApplied: true,
              showTransition: 'crisis',
              prevKpis: { ...state.kpis },
            };
          } else if (state.round === 2) {
            return {
              ...state,
              round: 3,
              totalBudget: 475000000,
              roundHistory: newHistory,
              giftApplied: false,
              showTransition: 'gift',
              prevKpis: { ...state.kpis },
            };
          } else if (state.round === 3) {
            return {
              ...state,
              round: 'final',
              roundHistory: newHistory,
              showTransition: null,
              prevKpis: { ...state.kpis },
            };
          }
          return state;
        }
        case 'APPLY_GIFT': {
          const cats = action.categories;
          const giftPerCat = 50000000 / 2;
          const giftPctPerCat = (giftPerCat / state.totalBudget) * 100;
          const newAlloc = { ...state.allocations };
          cats.forEach(c => {
            newAlloc[c] = Math.round((newAlloc[c] + giftPctPerCat) * 10) / 10;
          });
          const newKpis = computeKPIs(newAlloc);
          return { ...state, allocations: newAlloc, kpis: newKpis, giftApplied: true, giftCategories: cats };
        }
        case 'CLEAR_TRANSITION': {
          return { ...state, showTransition: null };
        }
        case 'RESET': {
          return { ...INITIAL_STATE, kpis: computeKPIs(DEFAULT_ALLOC), prevKpis: computeKPIs(DEFAULT_ALLOC) };
        }
        default:
          return state;
      }
    }

    // ============================================================
    // 📉 RADAR CHART (Pure SVG)
    // ============================================================

    function RadarChart({ datasets, labels }) {
      const cx = 160, cy = 160, maxR = 120;
      const n = labels.length;
      const angles = labels.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);

      function pointsForData(data) {
        return angles.map((a, i) => {
          const val = (data[i] || 0) / 100;
          const r = val * maxR;
          return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
        });
      }

      function polyString(pts) {
        return pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      }

      // Grid rings
      const rings = [20, 40, 60, 80, 100];

      return (
        <svg viewBox="0 0 320 320" className="w-full" style={{ maxWidth: 320 }}>
          {/* Grid rings */}
          {rings.map(r => (
            <polygon
              key={r}
              fill="none"
              stroke="rgba(148,163,184,0.15)"
              strokeWidth="1"
              points={polyString(angles.map(a => [cx + (r / 100) * maxR * Math.cos(a), cy + (r / 100) * maxR * Math.sin(a)]))}
            />
          ))}
          {/* Axis lines */}
          {angles.map((a, i) => (
            <line
              key={i}
              x1={cx} y1={cy}
              x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)}
              stroke="rgba(148,163,184,0.2)" strokeWidth="1"
            />
          ))}
          {/* Data polygons */}
          {datasets.map((ds, di) => {
            const pts = pointsForData(ds.values);
            return (
              <g key={di}>
                <polygon
                  fill={ds.fill}
                  stroke={ds.stroke}
                  strokeWidth="2"
                  points={polyString(pts)}
                />
                {pts.map((p, pi) => (
                  <circle key={pi} cx={p[0]} cy={p[1]} r="3" fill={ds.stroke} />
                ))}
              </g>
            );
          })}
          {/* Labels */}
          {angles.map((a, i) => {
            const lx = cx + (maxR + 22) * Math.cos(a);
            const ly = cy + (maxR + 22) * Math.sin(a);
            const anchor = Math.abs(Math.cos(a)) < 0.1 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
            return (
              <text
                key={i}
                x={lx} y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill="#94a3b8"
                fontSize="10"
                fontWeight="600"
              >
                {labels[i]}
              </text>
            );
          })}
        </svg>
      );
    }

    // ============================================================
    // 🎛️ UI COMPONENTS
    // ============================================================

    function RoundBanner({ round, totalBudget, showTransition }) {
      const roundLabels = { 1: 'Round 1 — Baseline', 2: 'Round 2 — Funding Crisis', 3: 'Round 3 — Donor Gift', final: 'Final Report' };
      const roundColors = { 1: '#3b82f6', 2: '#ef4444', 3: '#f59e0b', final: '#10b981' };

      return (
        <div
          className={\`rounded-2xl p-4 mb-4 slide-down \${showTransition === 'crisis' ? 'pulse-red' : ''} \${showTransition === 'gift' ? 'pulse-gold' : ''}\`}
          style={{ background: \`linear-gradient(135deg, \${roundColors[round]}22, \${roundColors[round]}11)\`, border: \`1px solid \${roundColors[round]}44\` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: roundColors[round] }}>
                {roundLabels[round]}
              </div>
              {round !== 'final' && (
                <div className="text-2xl font-extrabold text-white mt-1">
                  \${(totalBudget / 1000000).toFixed(0)}M Total Budget
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map(r => (
                <div
                  key={r}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: r === round || (round === 'final') ? roundColors[r] : 'transparent',
                    border: \`2px solid \${roundColors[r]}\`,
                    color: r === round || (round === 'final') ? '#fff' : roundColors[r],
                    opacity: r <= (round === 'final' ? 3 : round) ? 1 : 0.3,
                  }}
                >
                  {r}
                </div>
              ))}
            </div>
          </div>
          {round === 2 && showTransition === 'crisis' && (
            <div className="mt-2 text-sm text-red-300 fade-in">
              ⚠️ State funding cut by 15%. Budget reduced from $500M to $425M. Reallocate wisely.
            </div>
          )}
          {round === 3 && showTransition === 'gift' && (
            <div className="mt-2 text-sm text-yellow-300 fade-in">
              🎁 Anonymous $50M donor gift! Choose 2 categories to receive the funds.
            </div>
          )}
        </div>
      );
    }

    function CategorySlider({ category, value, totalBudget, onChange }) {
      const dollars = (value / 100) * totalBudget;
      return (
        <div className="glass-panel rounded-xl p-3 mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{category.icon}</span>
              <span className="text-sm font-semibold text-gray-200">{category.label}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold" style={{ color: category.color }}>{value.toFixed(1)}%</span>
              <span className="text-xs text-gray-500 ml-2">\${(dollars / 1000000).toFixed(1)}M</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="0.5"
            value={value}
            onChange={(e) => onChange(category.key, parseFloat(e.target.value))}
            className="w-full"
            style={{ accentColor: category.color }}
          />
        </div>
      );
    }

    function KPICard({ kpi, value, prevValue, benchmark }) {
      const delta = value - prevValue;
      const deltaStr = delta > 0 ? '+' + delta : String(delta);
      const flashClass = delta > 0 ? 'kpi-up' : delta < 0 ? 'kpi-down' : '';
      const vsBenchmark = value - benchmark;

      return (
        <div className={\`glass-panel rounded-xl p-3 text-center \${flashClass}\`} key={value}>
          <div className="text-lg mb-1">{kpi.icon}</div>
          <div className="text-xs text-gray-400 mb-1">{kpi.label}</div>
          <div className="text-2xl font-extrabold text-white">{value}</div>
          <div className="flex items-center justify-center gap-2 mt-1">
            {delta !== 0 && (
              <span className={\`text-xs font-bold \${delta > 0 ? 'text-green-400' : 'text-red-400'}\`}>
                {delta > 0 ? '▲' : '▼'} {deltaStr}
              </span>
            )}
            <span className={\`text-xs \${vsBenchmark >= 0 ? 'text-blue-400' : 'text-gray-500'}\`}>
              vs R1: {vsBenchmark >= 0 ? '+' : ''}{vsBenchmark}
            </span>
          </div>
        </div>
      );
    }

    function GiftPicker({ onApply, categories }) {
      const [selected, setSelected] = useState([]);

      function toggle(key) {
        setSelected(prev => {
          if (prev.includes(key)) return prev.filter(k => k !== key);
          if (prev.length >= 2) return prev;
          return [...prev, key];
        });
      }

      return (
        <div className="glass-panel rounded-2xl p-4 mb-4 fade-in">
          <div className="text-sm font-bold text-yellow-400 mb-2">🎁 Select 2 categories to receive the $50M gift:</div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {categories.map(c => (
              <button
                key={c.key}
                onClick={() => toggle(c.key)}
                className={\`rounded-xl p-2 text-center text-xs font-semibold transition-all \${
                  selected.includes(c.key)
                    ? 'ring-2 ring-yellow-400 bg-yellow-400/10 text-yellow-300'
                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                }\`}
              >
                <div className="text-lg mb-1">{c.icon}</div>
                {c.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => onApply(selected)}
            disabled={selected.length !== 2}
            className={\`w-full py-2 rounded-xl font-bold text-sm transition-all \${
              selected.length === 2
                ? 'bg-yellow-500 text-black hover:bg-yellow-400 cursor-pointer'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }\`}
          >
            Apply Gift to {selected.length}/2 Categories
          </button>
        </div>
      );
    }

    function FinalReport({ roundHistory, currentKpis }) {
      const kpiLabels = KPIS.map(k => k.label);
      const kpiKeys = KPIS.map(k => k.key);
      const benchmarkValues = KPIS.map(k => k.benchmark);

      const datasets = roundHistory.map((snap, i) => ({
        values: kpiKeys.map(k => snap.kpis[k]),
        fill: ['rgba(59,130,246,0.15)', 'rgba(239,68,68,0.15)', 'rgba(250,204,21,0.15)'][i],
        stroke: ['#3b82f6', '#ef4444', '#f59e0b'][i],
        label: ['Round 1', 'Round 2', 'Round 3'][i],
      }));

      datasets.push({
        values: benchmarkValues,
        fill: 'rgba(148,163,184,0.08)',
        stroke: 'rgba(148,163,184,0.4)',
        label: 'R1 Benchmark',
      });

      // Grade calculation
      const finalKpis = roundHistory[roundHistory.length - 1]?.kpis || currentKpis;
      const avgScore = Math.round(kpiKeys.reduce((s, k) => s + (finalKpis[k] || 0), 0) / kpiKeys.length);
      const grade = avgScore >= 80 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 60 ? 'C' : avgScore >= 50 ? 'D' : 'F';
      const gradeColor = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444' };

      // Narrative
      const bestKpi = kpiKeys.reduce((best, k) => (finalKpis[k] > finalKpis[best] ? k : best), kpiKeys[0]);
      const worstKpi = kpiKeys.reduce((worst, k) => (finalKpis[k] < finalKpis[worst] ? k : worst), kpiKeys[0]);
      const bestLabel = KPIS.find(k => k.key === bestKpi)?.label;
      const worstLabel = KPIS.find(k => k.key === worstKpi)?.label;

      return (
        <div className="fade-in">
          {/* Grade banner */}
          <div className="glass-panel rounded-2xl p-6 mb-4 text-center">
            <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">Overall Performance</div>
            <div className="text-6xl font-extrabold" style={{ color: gradeColor[grade] }}>{grade}</div>
            <div className="text-lg text-gray-300 mt-1">Average KPI Score: {avgScore}/100</div>
            <div className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              Your university excelled in <strong className="text-green-400">{bestLabel}</strong> but struggled with <strong className="text-red-400">{worstLabel}</strong>.
              {avgScore >= 70 ? ' Strong leadership under pressure!' : avgScore >= 55 ? ' Room for strategic improvement.' : ' The board may request a new CFO...'}
            </div>
          </div>

          {/* Comparison table */}
          <div className="glass-panel rounded-2xl p-4 mb-4 overflow-x-auto">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Round-by-Round Comparison</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs">
                  <th className="text-left pb-2">KPI</th>
                  {roundHistory.map((_, i) => (
                    <th key={i} className="text-center pb-2">R{i + 1}</th>
                  ))}
                  <th className="text-center pb-2">Benchmark</th>
                  <th className="text-center pb-2">Delta</th>
                </tr>
              </thead>
              <tbody>
                {KPIS.map(kpi => {
                  const last = roundHistory[roundHistory.length - 1]?.kpis[kpi.key] || 0;
                  const first = roundHistory[0]?.kpis[kpi.key] || 0;
                  const totalDelta = last - first;
                  return (
                    <tr key={kpi.key} className="border-t border-slate-700/50">
                      <td className="py-2 text-gray-300">{kpi.icon} {kpi.label}</td>
                      {roundHistory.map((snap, i) => (
                        <td key={i} className="text-center py-2 font-semibold text-white">{snap.kpis[kpi.key]}</td>
                      ))}
                      <td className="text-center py-2 text-gray-500">{kpi.benchmark}</td>
                      <td className={\`text-center py-2 font-bold \${totalDelta >= 0 ? 'text-green-400' : 'text-red-400'}\`}>
                        {totalDelta >= 0 ? '▲' : '▼'} {totalDelta >= 0 ? '+' : ''}{totalDelta}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Radar overlay */}
          <div className="glass-panel rounded-2xl p-4 mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Performance Radar — All Rounds</div>
            <div className="flex justify-center">
              <RadarChart datasets={datasets} labels={kpiLabels} />
            </div>
            <div className="flex justify-center gap-4 mt-3">
              {datasets.map((ds, i) => (
                <div key={i} className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ background: ds.stroke }}></div>
                  <span className="text-gray-400">{ds.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Budget allocation comparison */}
          <div className="glass-panel rounded-2xl p-4 mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Budget Allocation History</div>
            <div className="grid grid-cols-8 gap-1">
              {CATEGORIES.map(cat => (
                <div key={cat.key} className="text-center">
                  <div className="text-lg">{cat.icon}</div>
                  <div className="text-xs text-gray-500 mb-1">{cat.label.split(' ')[0]}</div>
                  {roundHistory.map((snap, i) => (
                    <div key={i} className="text-xs font-semibold" style={{ color: ['#3b82f6', '#ef4444', '#f59e0b'][i] }}>
                      {snap.allocations[cat.key].toFixed(1)}%
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ============================================================
    // 🏛️ APP COMPONENT
    // ============================================================

    function App() {
      const [state, dispatch] = useReducer(budgetReducer, INITIAL_STATE);
      const { round, totalBudget, allocations, kpis, roundHistory, showTransition, prevKpis, giftApplied } = state;

      // Clear transition animation
      useEffect(() => {
        if (showTransition) {
          const t = setTimeout(() => dispatch({ type: 'CLEAR_TRANSITION' }), 2000);
          return () => clearTimeout(t);
        }
      }, [showTransition]);

      const totalPct = useMemo(() => {
        return Object.values(allocations).reduce((s, v) => s + v, 0);
      }, [allocations]);

      const canSubmit = Math.abs(totalPct - 100) < 0.1;
      const overBudget = totalPct > 100.1;

      function handleSliderChange(key, val) {
        if (round === 'final') return;
        dispatch({ type: 'SET_ALLOCATION', category: key, value: val });
      }

      function handleSubmit() {
        if (!canSubmit) return;
        dispatch({ type: 'SUBMIT_ROUND' });
      }

      function handleGiftApply(cats) {
        dispatch({ type: 'APPLY_GIFT', categories: cats });
      }

      function handleReset() {
        dispatch({ type: 'RESET' });
      }

      // Radar data
      const kpiKeys = KPIS.map(k => k.key);
      const kpiLabels = KPIS.map(k => k.label);
      const currentDataset = {
        values: kpiKeys.map(k => kpis[k]),
        fill: 'rgba(59,130,246,0.2)',
        stroke: '#3b82f6',
        label: 'Your Allocation',
      };
      const benchmarkDataset = {
        values: KPIS.map(k => k.benchmark),
        fill: 'rgba(148,163,184,0.08)',
        stroke: 'rgba(148,163,184,0.4)',
        label: 'R1 Benchmark',
      };

      return (
        <div className={\`min-h-screen p-4 \${showTransition === 'crisis' ? 'pulse-red' : ''} \${showTransition === 'gift' ? 'pulse-gold' : ''}\`} style={{ background: '#0f172a' }}>
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-xl font-extrabold text-white">📊 University Budget Allocation Challenge</h1>
                <p className="text-xs text-gray-400">Allocate funds, see the consequences, navigate crises.</p>
              </div>
              <button
                onClick={handleReset}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-white cursor-pointer"
              >
                Reset
              </button>
            </div>

            {/* Round banner */}
            <RoundBanner round={round} totalBudget={totalBudget} showTransition={showTransition} />

            {round === 'final' ? (
              <FinalReport roundHistory={roundHistory} currentKpis={kpis} />
            ) : (
              <>
                {/* Gift picker for Round 3 */}
                {round === 3 && !giftApplied && (
                  <GiftPicker onApply={handleGiftApply} categories={CATEGORIES} />
                )}

                {/* Main layout: sliders left, KPIs + radar right */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {/* Left: Sliders */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Budget Categories</span>
                      <div className={\`text-sm font-bold \${overBudget ? 'text-red-400' : canSubmit ? 'text-green-400' : 'text-yellow-400'}\`}>
                        Total: {totalPct.toFixed(1)}% {canSubmit ? '✓' : overBudget ? '(over!)' : ''}
                      </div>
                    </div>

                    {/* Budget total bar */}
                    <div className="w-full h-2 rounded-full mb-3 overflow-hidden" style={{ background: '#1e293b' }}>
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{
                          width: Math.min(totalPct, 100) + '%',
                          background: overBudget ? '#ef4444' : canSubmit ? '#10b981' : '#f59e0b',
                        }}
                      ></div>
                    </div>

                    {CATEGORIES.map(cat => (
                      <CategorySlider
                        key={cat.key}
                        category={cat}
                        value={allocations[cat.key]}
                        totalBudget={totalBudget}
                        onChange={handleSliderChange}
                      />
                    ))}

                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className={\`w-full mt-3 py-3 rounded-xl font-bold text-sm transition-all \${
                        canSubmit
                          ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-lg shadow-blue-600/20'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }\`}
                    >
                      {round === 3 ? 'Submit Final Round →' : \`Submit Round \${round} →\`}
                    </button>
                  </div>

                  {/* Right: KPIs + Radar */}
                  <div className="lg:col-span-2">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Key Performance Indicators</div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {KPIS.map(kpi => (
                        <KPICard
                          key={kpi.key + '-' + kpis[kpi.key]}
                          kpi={kpi}
                          value={kpis[kpi.key]}
                          prevValue={prevKpis[kpi.key]}
                          benchmark={KPIS.find(k => k.key === kpi.key).benchmark}
                        />
                      ))}
                    </div>

                    <div className="glass-panel rounded-2xl p-3">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Performance Radar</div>
                      <div className="flex justify-center">
                        <RadarChart datasets={[benchmarkDataset, currentDataset]} labels={kpiLabels} />
                      </div>
                      <div className="flex justify-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs">
                          <div className="w-3 h-3 rounded-full" style={{ background: '#3b82f6' }}></div>
                          <span className="text-gray-400">You</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(148,163,184,0.4)' }}></div>
                          <span className="text-gray-400">R1 Peers</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="mt-4 text-center text-xs text-gray-600">
              University Budget Allocation Challenge — CATS-AI Sandbox
            </div>
          </div>
        </div>
      );
    }

    // ============================================================
    // 🔌 MOUNT
    // ============================================================

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  <\/script>
</body>
</html>`;
