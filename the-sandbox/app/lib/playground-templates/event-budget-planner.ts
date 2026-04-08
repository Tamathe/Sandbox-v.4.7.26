import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'event-budget-planner',
  title: 'Student Org Event Budget Planner',
  description: 'Plan event budgets with line items, auto-totals, spending breakdown charts, and exportable reports.',
  category: 'dashboard',
  thumbnailEmoji: '🎉',
  editorScrollTarget: '// 🎉 BUDGET PLANNER ENGINE',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '🎉 Plan your student org event budget. Add line items, categorize spending, and export the report.',
    ctaLabel: '▶ Start Planning',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Student Org Event Budget Planner</title>
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
    body { margin: 0; background: #f8fafc; color: #1e293b; font-family: system-ui, -apple-system, sans-serif; }
    @keyframes fadeIn { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.3s ease-out; }
    @media print {
      .no-print { display: none !important; }
      body { background: #fff; }
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    // 🎉 BUDGET PLANNER ENGINE
    const { useState, useEffect, useRef, useCallback, useMemo } = React;

    const UK_BLUE = '#0033A0';
    const UK_BLUE_LIGHT = '#e8eef8';
    const UK_BLUE_HOVER = '#002680';

    const DEFAULT_CATEGORIES = [
      { id: 'venue', name: 'Venue & Space', color: '#0033A0' },
      { id: 'food', name: 'Food & Catering', color: '#e63946' },
      { id: 'marketing', name: 'Marketing & Promotion', color: '#f77f00' },
      { id: 'entertainment', name: 'Entertainment & Speakers', color: '#7209b7' },
      { id: 'supplies', name: 'Supplies & Materials', color: '#2a9d8f' },
      { id: 'transport', name: 'Transportation', color: '#457b9d' },
      { id: 'decor', name: 'Decorations', color: '#e9c46a' },
      { id: 'tech', name: 'Technology & AV', color: '#264653' },
      { id: 'contingency', name: 'Contingency', color: '#6c757d' },
    ];

    const PRESET_TEMPLATES = [
      {
        name: 'Philanthropy Gala',
        eventName: 'Annual Philanthropy Gala',
        orgName: 'Student Activities Board',
        budget: 5000,
        attendance: 200,
        items: [
          { categoryId: 'venue', description: 'Ballroom rental (4 hrs)', qty: 1, unitCost: 1200 },
          { categoryId: 'food', description: 'Catered dinner (per plate)', qty: 200, unitCost: 8 },
          { categoryId: 'food', description: 'Beverages & desserts', qty: 1, unitCost: 400 },
          { categoryId: 'entertainment', description: 'DJ / live music', qty: 1, unitCost: 600 },
          { categoryId: 'decor', description: 'Table centerpieces', qty: 20, unitCost: 15 },
          { categoryId: 'decor', description: 'Stage backdrop & lighting', qty: 1, unitCost: 250 },
          { categoryId: 'marketing', description: 'Printed invitations', qty: 250, unitCost: 1.2 },
          { categoryId: 'marketing', description: 'Social media ads', qty: 1, unitCost: 100 },
          { categoryId: 'supplies', description: 'Name badges & programs', qty: 200, unitCost: 0.5 },
          { categoryId: 'contingency', description: 'Emergency fund', qty: 1, unitCost: 500 },
        ],
      },
      {
        name: 'Club Meeting',
        eventName: 'Weekly Club Meeting',
        orgName: 'Computer Science Club',
        budget: 200,
        attendance: 30,
        items: [
          { categoryId: 'food', description: 'Pizza (large)', qty: 5, unitCost: 14 },
          { categoryId: 'food', description: 'Drinks (case)', qty: 2, unitCost: 8 },
          { categoryId: 'supplies', description: 'Printed handouts', qty: 30, unitCost: 0.5 },
          { categoryId: 'marketing', description: 'Flyers', qty: 50, unitCost: 0.3 },
          { categoryId: 'contingency', description: 'Misc', qty: 1, unitCost: 20 },
        ],
      },
      {
        name: 'Campus Concert',
        eventName: 'Spring Fest Campus Concert',
        orgName: 'Student Government Association',
        budget: 15000,
        attendance: 500,
        items: [
          { categoryId: 'venue', description: 'Outdoor stage rental', qty: 1, unitCost: 3000 },
          { categoryId: 'entertainment', description: 'Headliner artist fee', qty: 1, unitCost: 5000 },
          { categoryId: 'entertainment', description: 'Opening act', qty: 1, unitCost: 1500 },
          { categoryId: 'tech', description: 'Sound system rental', qty: 1, unitCost: 2000 },
          { categoryId: 'tech', description: 'Lighting rig', qty: 1, unitCost: 1000 },
          { categoryId: 'food', description: 'Food truck vouchers', qty: 500, unitCost: 2 },
          { categoryId: 'marketing', description: 'Banner printing', qty: 10, unitCost: 40 },
          { categoryId: 'marketing', description: 'Radio / social ads', qty: 1, unitCost: 300 },
          { categoryId: 'transport', description: 'Shuttle service', qty: 2, unitCost: 200 },
          { categoryId: 'supplies', description: 'Wristbands', qty: 500, unitCost: 0.5 },
          { categoryId: 'contingency', description: 'Weather / emergency', qty: 1, unitCost: 1500 },
        ],
      },
      {
        name: 'Study Session / Review',
        eventName: 'Finals Study Session',
        orgName: 'Academic Excellence Society',
        budget: 100,
        attendance: 20,
        items: [
          { categoryId: 'food', description: 'Coffee & snacks', qty: 1, unitCost: 40 },
          { categoryId: 'supplies', description: 'Whiteboard markers', qty: 4, unitCost: 3 },
          { categoryId: 'supplies', description: 'Printed study guides', qty: 20, unitCost: 1 },
          { categoryId: 'contingency', description: 'Extra supplies', qty: 1, unitCost: 10 },
        ],
      },
    ];

    let nextId = 1;
    const genId = () => 'item-' + (nextId++);

    // ─── PIE CHART ───
    function PieChart({ data, size = 220 }) {
      const canvasRef = useRef(null);
      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, size, size);

        const total = data.reduce((s, d) => s + d.value, 0);
        if (total === 0) {
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.font = '14px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('No data', size / 2, size / 2 + 5);
          return;
        }
        let startAngle = -Math.PI / 2;
        const cx = size / 2, cy = size / 2, r = size / 2 - 10;
        data.filter(d => d.value > 0).forEach(d => {
          const slice = (d.value / total) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, startAngle, startAngle + slice);
          ctx.closePath();
          ctx.fillStyle = d.color;
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
          if (slice > 0.18) {
            const midAngle = startAngle + slice / 2;
            const lx = cx + Math.cos(midAngle) * r * 0.6;
            const ly = cy + Math.sin(midAngle) * r * 0.6;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(Math.round((d.value / total) * 100) + '%', lx, ly + 4);
          }
          startAngle += slice;
        });
      }, [data, size]);
      return React.createElement('canvas', { ref: canvasRef, style: { width: size, height: size } });
    }

    // ─── BAR CHART ───
    function BarChart({ categories, items, budget, width = 360, height = 200 }) {
      const canvasRef = useRef(null);
      const catTotals = useMemo(() => {
        const map = {};
        categories.forEach(c => { map[c.id] = 0; });
        items.forEach(i => { if (map[i.categoryId] !== undefined) map[i.categoryId] += i.qty * i.unitCost; });
        return map;
      }, [categories, items]);

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const cats = categories.filter(c => catTotals[c.id] > 0);
        if (cats.length === 0) return;
        const maxVal = Math.max(...cats.map(c => catTotals[c.id]));
        const barW = Math.min(30, (width - 40) / cats.length - 8);
        const chartH = height - 40;
        const startX = 30;

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = 10 + (chartH / 4) * i;
          ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(width - 10, y); ctx.stroke();
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px system-ui';
          ctx.textAlign = 'right';
          ctx.fillText('$' + Math.round(maxVal * (1 - i / 4)), startX - 4, y + 3);
        }

        cats.forEach((c, i) => {
          const x = startX + 10 + i * (barW + 8);
          const barH = maxVal > 0 ? (catTotals[c.id] / maxVal) * chartH : 0;
          const y = 10 + chartH - barH;
          ctx.fillStyle = c.color;
          ctx.beginPath();
          ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
          ctx.fill();
          ctx.save();
          ctx.translate(x + barW / 2, height - 2);
          ctx.rotate(-Math.PI / 4);
          ctx.fillStyle = '#64748b';
          ctx.font = '8px system-ui';
          ctx.textAlign = 'right';
          ctx.fillText(c.name.split(' ')[0], 0, 0);
          ctx.restore();
        });
      }, [categories, items, catTotals, width, height]);
      return React.createElement('canvas', { ref: canvasRef, style: { width, height } });
    }

    // ─── GAUGE CHART ───
    function GaugeChart({ percent, size = 160 }) {
      const canvasRef = useRef(null);
      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = (size * 0.65) * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, size, size * 0.65);
        const cx = size / 2, cy = size * 0.55, r = size * 0.4;
        const startA = Math.PI, endA = 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(cx, cy, r, startA, endA);
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineCap = 'round';
        ctx.stroke();
        const clamped = Math.min(Math.max(percent, 0), 150);
        const color = clamped <= 80 ? '#22c55e' : clamped <= 100 ? '#f59e0b' : '#ef4444';
        const fillEnd = startA + (Math.min(clamped, 100) / 100) * Math.PI;
        ctx.beginPath();
        ctx.arc(cx, cy, r, startA, fillEnd);
        ctx.lineWidth = 14;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 20px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(clamped) + '%', cx, cy - 4);
        ctx.fillStyle = '#64748b';
        ctx.font = '10px system-ui';
        ctx.fillText('utilized', cx, cy + 12);
      }, [percent, size]);
      return React.createElement('canvas', { ref: canvasRef, style: { width: size, height: size * 0.65 } });
    }

    // ─── LINE ITEM ROW ───
    function LineItemRow({ item, categories, onUpdate, onDelete }) {
      return (
        <tr className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
          <td className="py-2 px-2">
            <input className="w-full border rounded px-2 py-1 text-sm" value={item.description}
              onChange={e => onUpdate({ ...item, description: e.target.value })}
              placeholder="Description" />
          </td>
          <td className="py-2 px-2 w-20">
            <input type="number" min="0" className="w-full border rounded px-2 py-1 text-sm text-right"
              value={item.qty} onChange={e => onUpdate({ ...item, qty: Math.max(0, Number(e.target.value)) })} />
          </td>
          <td className="py-2 px-2 w-24">
            <input type="number" min="0" step="0.01" className="w-full border rounded px-2 py-1 text-sm text-right"
              value={item.unitCost} onChange={e => onUpdate({ ...item, unitCost: Math.max(0, Number(e.target.value)) })} />
          </td>
          <td className="py-2 px-2 w-24 text-right font-medium text-sm">
            {'$' + (item.qty * item.unitCost).toFixed(2)}
          </td>
          <td className="py-2 px-1 w-10">
            <button onClick={onDelete} className="text-red-400 hover:text-red-600 text-lg leading-none" title="Delete">✕</button>
          </td>
        </tr>
      );
    }

    // ─── CATEGORY SECTION ───
    function CategorySection({ category, items, onAddItem, onUpdateItem, onDeleteItem }) {
      const [expanded, setExpanded] = useState(items.length > 0);
      const catTotal = items.reduce((s, i) => s + i.qty * i.unitCost, 0);
      return (
        <div className="mb-3 border rounded-xl overflow-hidden fade-in" style={{ borderColor: category.color + '40' }}>
          <button onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
            style={{ background: expanded ? category.color + '08' : 'transparent' }}>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: category.color }}></span>
              <span className="font-semibold text-sm">{category.name}</span>
              <span className="text-xs text-gray-400 ml-1">({items.length} item{items.length !== 1 ? 's' : ''})</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm" style={{ color: category.color }}>{'$' + catTotal.toFixed(2)}</span>
              <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
            </div>
          </button>
          {expanded && (
            <div className="px-4 pb-3">
              {items.length > 0 && (
                <table className="w-full mb-2">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b">
                      <th className="text-left py-1 px-2 font-medium">Description</th>
                      <th className="text-right py-1 px-2 font-medium w-20">Qty</th>
                      <th className="text-right py-1 px-2 font-medium w-24">Unit Cost</th>
                      <th className="text-right py-1 px-2 font-medium w-24">Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <LineItemRow key={item.id} item={item} categories={[category]}
                        onUpdate={updated => onUpdateItem(updated)}
                        onDelete={() => onDeleteItem(item.id)} />
                    ))}
                  </tbody>
                </table>
              )}
              <button onClick={() => onAddItem(category.id)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                style={{ color: UK_BLUE }}>
                + Add Line Item
              </button>
            </div>
          )}
        </div>
      );
    }

    // ─── MAIN APP ───
    function App() {
      const [eventName, setEventName] = useState('');
      const [orgName, setOrgName] = useState('');
      const [eventDate, setEventDate] = useState('');
      const [attendance, setAttendance] = useState(100);
      const [totalBudget, setTotalBudget] = useState(2000);
      const [categories, setCategories] = useState([...DEFAULT_CATEGORIES]);
      const [items, setItems] = useState([]);
      const [status, setStatus] = useState('Draft');
      const [treasurerNotes, setTreasurerNotes] = useState('');
      const [customCatName, setCustomCatName] = useState('');
      const [showTemplates, setShowTemplates] = useState(true);

      const totalSpent = useMemo(() => items.reduce((s, i) => s + i.qty * i.unitCost, 0), [items]);
      const remaining = totalBudget - totalSpent;
      const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
      const perPerson = attendance > 0 ? totalSpent / attendance : 0;

      const pieData = useMemo(() => {
        return categories.map(c => ({
          label: c.name,
          color: c.color,
          value: items.filter(i => i.categoryId === c.id).reduce((s, i) => s + i.qty * i.unitCost, 0),
        })).filter(d => d.value > 0);
      }, [categories, items]);

      const loadPreset = (preset) => {
        setEventName(preset.eventName);
        setOrgName(preset.orgName);
        setTotalBudget(preset.budget);
        setAttendance(preset.attendance);
        setItems(preset.items.map(i => ({ ...i, id: genId() })));
        setStatus('Draft');
        setTreasurerNotes('');
        setShowTemplates(false);
      };

      const startBlank = () => {
        setEventName('');
        setOrgName('');
        setTotalBudget(2000);
        setAttendance(100);
        setItems([]);
        setStatus('Draft');
        setTreasurerNotes('');
        setShowTemplates(false);
      };

      const addItem = (categoryId) => {
        setItems(prev => [...prev, { id: genId(), categoryId, description: '', qty: 1, unitCost: 0 }]);
      };

      const updateItem = (updated) => {
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      };

      const deleteItem = (id) => {
        setItems(prev => prev.filter(i => i.id !== id));
      };

      const addCustomCategory = () => {
        if (!customCatName.trim()) return;
        const hues = ['#8338ec', '#ff006e', '#3a86ff', '#fb5607', '#06d6a0'];
        const color = hues[categories.length % hues.length];
        setCategories(prev => [...prev, { id: 'custom-' + Date.now(), name: customCatName.trim(), color }]);
        setCustomCatName('');
      };

      const handleExport = () => {
        window.print();
      };

      const statusColors = { Draft: '#6c757d', Submitted: '#f59e0b', Approved: '#22c55e' };

      // ─── TEMPLATE PICKER ───
      if (showTemplates) {
        return (
          <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eef8 100%)' }}>
            <div className="max-w-2xl w-full">
              <div className="text-center mb-8">
                <div className="text-5xl mb-3">🎉</div>
                <h1 className="text-2xl font-extrabold" style={{ color: UK_BLUE }}>Event Budget Planner</h1>
                <p className="text-gray-500 mt-1">Choose a template or start from scratch</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PRESET_TEMPLATES.map(p => (
                  <button key={p.name} onClick={() => loadPreset(p)}
                    className="bg-white border-2 rounded-2xl p-5 text-left hover:shadow-lg hover:border-blue-300 transition-all group">
                    <div className="font-bold text-sm mb-1 group-hover:text-blue-700" style={{ color: UK_BLUE }}>{p.name}</div>
                    <div className="text-xs text-gray-500">Budget: <span className="font-semibold">\${p.budget.toLocaleString()}</span> &middot; {p.attendance} attendees</div>
                    <div className="text-xs text-gray-400 mt-1">{p.items.length} line items pre-loaded</div>
                  </button>
                ))}
                <button onClick={startBlank}
                  className="bg-white border-2 border-dashed rounded-2xl p-5 text-left hover:shadow-lg hover:border-blue-300 transition-all group col-span-1 sm:col-span-2">
                  <div className="font-bold text-sm mb-1" style={{ color: UK_BLUE }}>Custom Blank Budget</div>
                  <div className="text-xs text-gray-500">Start from scratch with your own event details</div>
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ─── MAIN PLANNER ───
      return (
        <div className="min-h-screen pb-12" style={{ background: '#f8fafc' }}>
          {/* HEADER */}
          <div className="no-print" style={{ background: UK_BLUE }}>
            <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <h1 className="text-white font-extrabold text-lg leading-tight">Event Budget Planner</h1>
                  <p className="text-blue-200 text-xs">Student Organization Budget Tool</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTemplates(true)}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors">
                  Templates
                </button>
                <button onClick={handleExport}
                  className="text-xs bg-white text-blue-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                  Export / Print
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-6 mt-6">
            {/* EVENT INFO */}
            <div className="bg-white border-2 rounded-2xl p-5 mb-5">
              <h2 className="font-extrabold text-sm mb-3 uppercase tracking-wide" style={{ color: UK_BLUE }}>Event Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="col-span-2 md:col-span-1">
                  <label className="text-xs text-gray-500 mb-1 block">Event Name</label>
                  <input className="w-full border-2 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none"
                    value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Annual Spring Formal" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Organization</label>
                  <input className="w-full border-2 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none"
                    value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Student Activities Board" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Event Date</label>
                  <input type="date" className="w-full border-2 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none"
                    value={eventDate} onChange={e => setEventDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Expected Attendance</label>
                  <input type="number" min="1" className="w-full border-2 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none text-right"
                    value={attendance} onChange={e => setAttendance(Math.max(1, Number(e.target.value)))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Total Budget ($)</label>
                  <input type="number" min="0" step="100" className="w-full border-2 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none text-right"
                    value={totalBudget} onChange={e => setTotalBudget(Math.max(0, Number(e.target.value)))} />
                </div>
              </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-white border-2 rounded-2xl p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">Total Budget</div>
                <div className="text-xl font-extrabold" style={{ color: UK_BLUE }}>{'$' + totalBudget.toLocaleString()}</div>
              </div>
              <div className="bg-white border-2 rounded-2xl p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">Total Spent</div>
                <div className="text-xl font-extrabold" style={{ color: totalSpent > totalBudget ? '#ef4444' : '#1e293b' }}>
                  {'$' + totalSpent.toFixed(2)}
                </div>
              </div>
              <div className="bg-white border-2 rounded-2xl p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">Remaining</div>
                <div className={'text-xl font-extrabold ' + (remaining >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {remaining >= 0 ? '+' : '-'}\${ Math.abs(remaining).toFixed(2)}
                </div>
              </div>
              <div className="bg-white border-2 rounded-2xl p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">Per Person</div>
                <div className="text-xl font-extrabold text-gray-700">{'$' + perPerson.toFixed(2)}</div>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="bg-white border-2 rounded-2xl p-4 mb-5">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-gray-600">Budget Utilization</span>
                <span className={'font-bold ' + (utilization > 100 ? 'text-red-600' : utilization > 80 ? 'text-yellow-600' : 'text-green-600')}>
                  {utilization.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: Math.min(utilization, 100) + '%',
                    background: utilization > 100 ? '#ef4444' : utilization > 80 ? '#f59e0b' : '#22c55e',
                  }} />
              </div>
              {utilization > 100 && (
                <div className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                  ⚠ Over budget by \${ (totalSpent - totalBudget).toFixed(2)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* LEFT COLUMN — LINE ITEMS */}
              <div className="lg:col-span-2">
                <div className="bg-white border-2 rounded-2xl p-5 mb-5">
                  <h2 className="font-extrabold text-sm mb-4 uppercase tracking-wide" style={{ color: UK_BLUE }}>Budget Categories & Line Items</h2>
                  {categories.map(cat => (
                    <CategorySection key={cat.id} category={cat}
                      items={items.filter(i => i.categoryId === cat.id)}
                      onAddItem={addItem} onUpdateItem={updateItem} onDeleteItem={deleteItem} />
                  ))}
                  {/* Add custom category */}
                  <div className="flex gap-2 mt-3 no-print">
                    <input className="flex-1 border-2 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none"
                      value={customCatName} onChange={e => setCustomCatName(e.target.value)}
                      placeholder="Add custom category..." onKeyDown={e => e.key === 'Enter' && addCustomCategory()} />
                    <button onClick={addCustomCategory}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
                      style={{ background: UK_BLUE }}>Add</button>
                  </div>
                </div>

                {/* APPROVAL WORKFLOW */}
                <div className="bg-white border-2 rounded-2xl p-5">
                  <h2 className="font-extrabold text-sm mb-3 uppercase tracking-wide" style={{ color: UK_BLUE }}>Approval Workflow</h2>
                  <div className="flex items-center gap-2 mb-4">
                    {['Draft', 'Submitted', 'Approved'].map((s, i) => (
                      <React.Fragment key={s}>
                        <button onClick={() => setStatus(s)}
                          className={'px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ' +
                            (status === s ? 'text-white' : 'text-gray-500 bg-white')}
                          style={status === s ? { background: statusColors[s], borderColor: statusColors[s] } : {}}>
                          {s}
                        </button>
                        {i < 2 && <span className="text-gray-300">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Treasurer Notes / Review Comments</label>
                    <textarea className="w-full border-2 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none"
                      rows={3} value={treasurerNotes} onChange={e => setTreasurerNotes(e.target.value)}
                      placeholder="Add notes for the treasurer or advisor review..." />
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: statusColors[status] }}></span>
                    <span className="font-semibold">Status: {status}</span>
                    {status === 'Approved' && <span className="text-green-600 font-semibold ml-2">✓ Budget approved</span>}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN — CHARTS */}
              <div>
                <div className="bg-white border-2 rounded-2xl p-5 mb-5">
                  <h3 className="font-extrabold text-xs mb-3 uppercase tracking-wide" style={{ color: UK_BLUE }}>Spending by Category</h3>
                  <div className="flex justify-center">
                    <PieChart data={pieData} size={200} />
                  </div>
                  <div className="mt-3 space-y-1">
                    {pieData.map(d => (
                      <div key={d.label} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }}></span>
                        <span className="flex-1 truncate text-gray-600">{d.label}</span>
                        <span className="font-semibold">\${d.value.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border-2 rounded-2xl p-5 mb-5">
                  <h3 className="font-extrabold text-xs mb-3 uppercase tracking-wide" style={{ color: UK_BLUE }}>Category Breakdown</h3>
                  <BarChart categories={categories} items={items} budget={totalBudget} width={280} height={180} />
                </div>

                <div className="bg-white border-2 rounded-2xl p-5">
                  <h3 className="font-extrabold text-xs mb-3 uppercase tracking-wide" style={{ color: UK_BLUE }}>Budget Gauge</h3>
                  <div className="flex justify-center">
                    <GaugeChart percent={utilization} size={180} />
                  </div>
                  <div className="text-center text-xs text-gray-500 mt-1">
                    {utilization <= 80 ? 'On track — plenty of room' :
                     utilization <= 100 ? 'Approaching limit — review spending' :
                     'Over budget — reduce line items'}
                  </div>
                </div>
              </div>
            </div>

            {/* PRINT FOOTER */}
            <div className="hidden print:block mt-8 border-t-2 pt-4 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>{eventName || 'Event Budget'} &mdash; {orgName || 'Student Organization'}</span>
                <span>Generated {new Date().toLocaleDateString()}</span>
              </div>
              <div className="mt-1">
                Status: <strong>{status}</strong> &middot; Total: <strong>\${totalSpent.toFixed(2)}</strong> of <strong>\${totalBudget.toLocaleString()}</strong>
              </div>
              {treasurerNotes && <div className="mt-2"><em>Notes: {treasurerNotes}</em></div>}
            </div>
          </div>
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  <\/script>
</body>
</html>`;
