import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'circuit-simulator',
  title: 'Interactive Circuit Simulator',
  description: 'Drag-and-drop circuit builder with resistors, capacitors, LEDs, and real-time voltage/current calculations.',
  category: 'simulation',
  thumbnailEmoji: '⚡',
  editorScrollTarget: '// ⚡ CIRCUIT SIMULATION ENGINE',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '⚡ Build circuits by dragging components onto the breadboard. Watch voltage and current update in real-time.',
    ctaLabel: '▶ Start Building',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Interactive Circuit Simulator</title>
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
    body { margin: 0; background: #0a0e1a; color: #e2e8f0; font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
    * { box-sizing: border-box; }

    @keyframes ledGlow {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.4); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseSelect {
      0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
      50% { box-shadow: 0 0 0 6px rgba(59,130,246,0); }
    }
    .fade-in { animation: fadeIn 0.3s ease-out; }
    .component-selected { animation: pulseSelect 1.5s ease-in-out infinite; }
    .led-active { animation: ledGlow 1s ease-in-out infinite; }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #1a1f2e; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    // ⚡ CIRCUIT SIMULATION ENGINE
    const { useState, useRef, useEffect, useCallback, useMemo } = React;

    /* ─── Constants ─── */
    const GRID = 40;
    const COLS = 20;
    const ROWS = 14;
    const CANVAS_W = COLS * GRID;
    const CANVAS_H = ROWS * GRID;

    const COMPONENT_TYPES = {
      battery:   { label: 'Battery',    icon: '🔋', color: '#facc15', defaultValue: 9,     unit: 'V',  hasPolarity: true },
      resistor:  { label: 'Resistor',   icon: '⏚',  color: '#f97316', defaultValue: 100,   unit: 'Ω',  hasPolarity: false },
      capacitor: { label: 'Capacitor',  icon: '⊥',  color: '#38bdf8', defaultValue: 10,    unit: 'μF', hasPolarity: false },
      led:       { label: 'LED',        icon: '💡', color: '#4ade80', defaultValue: 2,     unit: 'V',  hasPolarity: true },
      wire:      { label: 'Wire',       icon: '─',  color: '#94a3b8', defaultValue: 0,     unit: '',   hasPolarity: false },
    };

    /* ─── Unique ID ─── */
    let _uid = 0;
    const uid = () => 'c' + (++_uid);

    /* ─── Grid helpers ─── */
    const snap = (v) => Math.round(v / GRID) * GRID;
    const gridKey = (gx, gy) => gx + ',' + gy;

    /* ─── Circuit solver (series path detection + Ohm's law) ─── */
    function solveCircuit(components, wires) {
      // Build adjacency from wire endpoints
      const adj = {};
      const addAdj = (a, b) => {
        if (!adj[a]) adj[a] = new Set();
        if (!adj[b]) adj[b] = new Set();
        adj[a].add(b);
        adj[b].add(a);
      };

      // Each component has two terminals: (gx, gy) and (gx+1, gy) for horizontal placement
      const compAtNode = {};
      components.forEach(c => {
        const k1 = gridKey(c.gx, c.gy);
        const k2 = gridKey(c.gx + 1, c.gy);
        addAdj(k1, k2);
        if (!compAtNode[k1]) compAtNode[k1] = [];
        if (!compAtNode[k2]) compAtNode[k2] = [];
        compAtNode[k1].push(c.id);
        compAtNode[k2].push(c.id);
      });

      wires.forEach(w => {
        addAdj(gridKey(w.gx1, w.gy1), gridKey(w.gx2, w.gy2));
      });

      // Find battery
      const battery = components.find(c => c.type === 'battery');
      if (!battery) return { valid: false, totalR: 0, current: 0, voltages: {} };

      const bStart = gridKey(battery.gx, battery.gy);
      const bEnd = gridKey(battery.gx + 1, battery.gy);

      // BFS from battery positive to battery negative
      const visited = new Set();
      const queue = [[bEnd, []]];
      visited.add(bEnd);
      let path = null;

      while (queue.length > 0) {
        const [node, trail] = queue.shift();
        if (node === bStart && trail.length > 0) {
          path = trail;
          break;
        }
        const neighbors = adj[node] || new Set();
        for (const nb of neighbors) {
          if (!visited.has(nb) || (nb === bStart && trail.length > 1)) {
            const newTrail = [...trail, { from: node, to: nb }];
            if (nb === bStart) {
              path = newTrail;
              queue.length = 0;
              break;
            }
            if (!visited.has(nb)) {
              visited.add(nb);
              queue.push([nb, newTrail]);
            }
          }
        }
      }

      if (!path) return { valid: false, totalR: 0, current: 0, voltages: {} };

      // Collect components in path
      const compById = {};
      components.forEach(c => compById[c.id] = c);

      const pathCompIds = new Set();
      path.forEach(seg => {
        const k = gridKey(
          Math.min(parseInt(seg.from.split(',')[0]), parseInt(seg.to.split(',')[0])),
          parseInt(seg.from.split(',')[1])
        );
        // Check which components span this segment
        components.forEach(c => {
          const ck1 = gridKey(c.gx, c.gy);
          const ck2 = gridKey(c.gx + 1, c.gy);
          if ((seg.from === ck1 && seg.to === ck2) || (seg.from === ck2 && seg.to === ck1)) {
            pathCompIds.add(c.id);
          }
        });
      });

      // Series calculation
      let totalR = 0;
      const voltages = {};
      const pathComps = [...pathCompIds].map(id => compById[id]).filter(Boolean);

      pathComps.forEach(c => {
        if (c.type === 'resistor') totalR += c.value;
        else if (c.type === 'led') totalR += 50; // LED internal resistance approx
      });

      if (totalR === 0) totalR = 1; // prevent divide by zero
      const V = battery.value;
      const current = V / totalR;

      pathComps.forEach(c => {
        if (c.type === 'resistor') {
          voltages[c.id] = { v: current * c.value, i: current };
        } else if (c.type === 'led') {
          voltages[c.id] = { v: current * 50, i: current, lit: current > 0.005 };
        } else if (c.type === 'battery') {
          voltages[c.id] = { v: V, i: current };
        } else if (c.type === 'capacitor') {
          voltages[c.id] = { v: 0, i: current, charge: c.value * V };
        }
      });

      return { valid: true, totalR, current, voltages, pathCompIds };
    }

    /* ─── Component Palette ─── */
    function Palette({ selected, onSelect }) {
      return (
        <div className="flex flex-col gap-2 p-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Components</div>
          {Object.entries(COMPONENT_TYPES).map(([key, def]) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={\`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all \${
                selected === key
                  ? 'bg-blue-600/30 border border-blue-500 text-blue-300 component-selected'
                  : 'bg-slate-800/60 border border-slate-700 text-slate-300 hover:bg-slate-700/60 hover:border-slate-600'
              }\`}
            >
              <span className="text-lg w-7 text-center" style={{ color: def.color }}>{def.icon}</span>
              <span>{def.label}</span>
              {key !== 'wire' && (
                <span className="ml-auto text-xs text-slate-500">{def.defaultValue}{def.unit}</span>
              )}
            </button>
          ))}
        </div>
      );
    }

    /* ─── Properties Panel ─── */
    function PropertiesPanel({ component, onUpdate, onDelete }) {
      if (!component) return (
        <div className="p-3 text-center text-slate-500 text-sm">
          <div className="text-2xl mb-2">👆</div>
          Click a placed component to edit its properties
        </div>
      );

      const def = COMPONENT_TYPES[component.type];
      return (
        <div className="p-3 fade-in">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Properties</div>
          <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl" style={{ color: def.color }}>{def.icon}</span>
              <span className="font-semibold text-sm">{def.label}</span>
            </div>
            {component.type !== 'wire' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Value ({def.unit})
                </label>
                <input
                  type="number"
                  value={component.value}
                  onChange={(e) => onUpdate(component.id, { value: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  min="0"
                  step={component.type === 'capacitor' ? 0.1 : 1}
                />
              </div>
            )}
            <div className="text-xs text-slate-500">
              Grid: ({component.gx}, {component.gy})
            </div>
            <button
              onClick={() => onDelete(component.id)}
              className="w-full mt-1 px-3 py-1.5 bg-red-900/40 border border-red-800 text-red-400 text-xs rounded hover:bg-red-900/60 transition-colors"
            >
              Remove Component
            </button>
          </div>
        </div>
      );
    }

    /* ─── Readout Panel ─── */
    function Readout({ solution }) {
      if (!solution.valid) return (
        <div className="p-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Circuit Analysis</div>
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700 text-center">
            <div className="text-amber-400 text-sm font-medium mb-1">⚠ Open Circuit</div>
            <div className="text-xs text-slate-500">Connect a battery to components in a closed loop to see calculations.</div>
          </div>
        </div>
      );

      return (
        <div className="p-3 fade-in">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Circuit Analysis</div>
          <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Resistance</span>
              <span className="text-orange-400 font-mono font-bold">{solution.totalR.toFixed(1)} Ω</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Current</span>
              <span className="text-yellow-400 font-mono font-bold">{(solution.current * 1000).toFixed(2)} mA</span>
            </div>
            <div className="h-px bg-slate-700 my-1"></div>
            {Object.entries(solution.voltages).map(([id, data]) => (
              <div key={id} className="text-xs text-slate-500 flex justify-between">
                <span>{id.slice(0, 6)}</span>
                <span className="text-slate-400">{data.v.toFixed(2)}V / {(data.i * 1000).toFixed(1)}mA</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    /* ─── Canvas Renderer ─── */
    function CircuitCanvas({ components, wires, selectedId, wiringMode, wiringStart, solution, onCellClick, onComponentClick }) {
      const canvasRef = useRef(null);

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = CANVAS_W * dpr;
        canvas.height = CANVAS_H * dpr;
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = '#0f1623';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Grid dots
        for (let x = 0; x <= COLS; x++) {
          for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.arc(x * GRID, y * GRID, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
          }
        }

        // Breadboard strips (horizontal rows)
        for (let y = 2; y <= ROWS - 2; y++) {
          ctx.strokeStyle = '#1a2233';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(GRID, y * GRID);
          ctx.lineTo((COLS - 1) * GRID, y * GRID);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Center divider
        const midY = Math.floor(ROWS / 2) * GRID;
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(CANVAS_W, midY);
        ctx.stroke();

        // Power rails labels
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px system-ui';
        ctx.fillText('+', 4, GRID + 4);
        ctx.fillStyle = '#3b82f6';
        ctx.fillText('−', 4, (ROWS - 1) * GRID + 4);

        // Draw wires
        wires.forEach(w => {
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(w.gx1 * GRID, w.gy1 * GRID);
          ctx.lineTo(w.gx2 * GRID, w.gy2 * GRID);
          ctx.stroke();
          // Wire nodes
          [{ x: w.gx1, y: w.gy1 }, { x: w.gx2, y: w.gy2 }].forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x * GRID, p.y * GRID, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#64748b';
            ctx.fill();
          });
        });

        // Draw components
        components.forEach(comp => {
          const def = COMPONENT_TYPES[comp.type];
          const x1 = comp.gx * GRID;
          const y = comp.gy * GRID;
          const x2 = (comp.gx + 1) * GRID;
          const isSelected = comp.id === selectedId;
          const voltData = solution.voltages?.[comp.id];
          const inPath = solution.pathCompIds?.has(comp.id);

          // Highlight selection
          if (isSelected) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.strokeRect(x1 - 12, y - 14, (x2 - x1) + 24, 28);
          }

          // Terminal dots
          ctx.beginPath();
          ctx.arc(x1, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = inPath ? '#22d3ee' : '#475569';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x2, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = inPath ? '#22d3ee' : '#475569';
          ctx.fill();

          const cx = (x1 + x2) / 2;

          if (comp.type === 'battery') {
            // Battery symbol: two vertical lines
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(cx - 6, y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 6, y); ctx.lineTo(x2, y); ctx.stroke();
            // Tall line (positive)
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx - 6, y - 10); ctx.lineTo(cx - 6, y + 10); ctx.stroke();
            // Short line (negative)
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx + 6, y - 6); ctx.lineTo(cx + 6, y + 6); ctx.stroke();
            // + / - labels
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 9px system-ui';
            ctx.fillText('+', cx - 14, y - 10);
            ctx.fillText('−', cx + 9, y - 10);
          } else if (comp.type === 'resistor') {
            // Zigzag resistor
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(cx - 14, y);
            const zigH = 7;
            const zigW = 4.5;
            let zx = cx - 14;
            for (let i = 0; i < 6; i++) {
              const dir = i % 2 === 0 ? -zigH : zigH;
              ctx.lineTo(zx + zigW, y + dir);
              zx += zigW;
            }
            ctx.lineTo(cx + 14, y);
            ctx.lineTo(x2, y);
            ctx.stroke();
            // Color bands
            const bandColors = ['#ef4444', '#a855f7', '#f97316'];
            bandColors.forEach((col, i) => {
              ctx.fillStyle = col;
              ctx.fillRect(cx - 10 + i * 7, y - 4, 3, 8);
            });
          } else if (comp.type === 'capacitor') {
            // Parallel plates
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(cx - 4, y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 4, y); ctx.lineTo(x2, y); ctx.stroke();
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx - 4, y - 9); ctx.lineTo(cx - 4, y + 9); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 4, y - 9); ctx.lineTo(cx + 4, y + 9); ctx.stroke();
          } else if (comp.type === 'led') {
            // LED triangle
            const isLit = voltData?.lit;
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(cx - 8, y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 8, y); ctx.lineTo(x2, y); ctx.stroke();
            // Triangle
            ctx.beginPath();
            ctx.moveTo(cx - 8, y - 8);
            ctx.lineTo(cx - 8, y + 8);
            ctx.lineTo(cx + 6, y);
            ctx.closePath();
            ctx.fillStyle = isLit ? def.color : '#1e3a2a';
            ctx.fill();
            ctx.strokeStyle = def.color;
            ctx.stroke();
            // Bar
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(cx + 7, y - 8); ctx.lineTo(cx + 7, y + 8); ctx.stroke();
            // Glow effect
            if (isLit) {
              const brightness = Math.min(voltData.i * 800, 1);
              const grad = ctx.createRadialGradient(cx, y, 0, cx, y, 25);
              grad.addColorStop(0, 'rgba(74, 222, 128, ' + (brightness * 0.5) + ')');
              grad.addColorStop(1, 'rgba(74, 222, 128, 0)');
              ctx.fillStyle = grad;
              ctx.fillRect(cx - 25, y - 25, 50, 50);
              // Emission arrows
              ctx.strokeStyle = 'rgba(74, 222, 128, ' + (brightness * 0.6) + ')';
              ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(cx + 2, y - 12); ctx.lineTo(cx + 10, y - 18); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(cx + 4, y - 9); ctx.lineTo(cx + 13, y - 14); ctx.stroke();
            }
          }

          // Value label below component
          if (comp.type !== 'wire') {
            const valDef = COMPONENT_TYPES[comp.type];
            ctx.fillStyle = isSelected ? '#93c5fd' : '#64748b';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(comp.value + valDef.unit, cx, y + 22);
            ctx.textAlign = 'left';
          }

          // Voltage/current annotation if solved
          if (voltData && comp.type !== 'battery') {
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 9px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(voltData.v.toFixed(1) + 'V', cx, y - 18);
            ctx.fillStyle = '#fbbf24';
            ctx.fillText((voltData.i * 1000).toFixed(1) + 'mA', cx, y - 28);
            ctx.textAlign = 'left';
          }
        });

        // Wiring mode indicator — show pending wire start
        if (wiringMode && wiringStart) {
          ctx.beginPath();
          ctx.arc(wiringStart.gx * GRID, wiringStart.gy * GRID, 7, 0, Math.PI * 2);
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

      }, [components, wires, selectedId, wiringMode, wiringStart, solution]);

      const handleClick = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;
        const gx = Math.round(mx / GRID);
        const gy = Math.round(my / GRID);

        // Check if clicking an existing component
        const clicked = components.find(c =>
          gy === c.gy && gx >= c.gx && gx <= c.gx + 1
        );
        if (clicked && !wiringMode) {
          onComponentClick(clicked.id);
          return;
        }

        onCellClick(gx, gy);
      };

      return (
        <canvas
          ref={canvasRef}
          style={{ width: CANVAS_W, height: CANVAS_H, cursor: wiringMode ? 'crosshair' : 'pointer' }}
          onClick={handleClick}
        />
      );
    }

    /* ─── Main App ─── */
    function App() {
      const [components, setComponents] = useState([]);
      const [wires, setWires] = useState([]);
      const [selectedTool, setSelectedTool] = useState('resistor');
      const [selectedCompId, setSelectedCompId] = useState(null);
      const [wiringMode, setWiringMode] = useState(false);
      const [wiringStart, setWiringStart] = useState(null);

      // Solve circuit on every change
      const solution = useMemo(() => solveCircuit(components, wires), [components, wires]);

      const handleCellClick = useCallback((gx, gy) => {
        if (wiringMode) {
          if (!wiringStart) {
            setWiringStart({ gx, gy });
          } else {
            if (wiringStart.gx !== gx || wiringStart.gy !== gy) {
              setWires(prev => [...prev, {
                id: uid(),
                gx1: wiringStart.gx, gy1: wiringStart.gy,
                gx2: gx, gy2: gy,
              }]);
            }
            setWiringStart(null);
          }
          return;
        }

        if (selectedTool === 'wire') {
          setWiringMode(true);
          setWiringStart({ gx, gy });
          return;
        }

        // Check if cell occupied
        const occupied = components.some(c => c.gy === gy && (c.gx === gx || c.gx + 1 === gx || c.gx === gx - 1));
        if (occupied) return;

        // Clamp so component doesn't go off grid
        const placeX = Math.min(gx, COLS - 1);

        const def = COMPONENT_TYPES[selectedTool];
        const newComp = {
          id: uid(),
          type: selectedTool,
          gx: placeX,
          gy: gy,
          value: def.defaultValue,
        };
        setComponents(prev => [...prev, newComp]);
        setSelectedCompId(newComp.id);
      }, [selectedTool, wiringMode, wiringStart, components]);

      const handleComponentClick = useCallback((id) => {
        setSelectedCompId(id);
      }, []);

      const handleUpdateComponent = useCallback((id, updates) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      }, []);

      const handleDeleteComponent = useCallback((id) => {
        setComponents(prev => prev.filter(c => c.id !== id));
        setSelectedCompId(null);
      }, []);

      const handleClear = useCallback(() => {
        setComponents([]);
        setWires([]);
        setSelectedCompId(null);
        setWiringMode(false);
        setWiringStart(null);
      }, []);

      const handleLoadDemo = useCallback(() => {
        handleClear();
        // Demo: battery → resistor → LED → wired back
        const demoComps = [
          { id: uid(), type: 'battery',  gx: 3,  gy: 4, value: 9 },
          { id: uid(), type: 'resistor', gx: 6,  gy: 4, value: 220 },
          { id: uid(), type: 'led',      gx: 9,  gy: 4, value: 2 },
          { id: uid(), type: 'resistor', gx: 6,  gy: 8, value: 470 },
        ];
        const demoWires = [
          { id: uid(), gx1: 4, gy1: 4, gx2: 6, gy2: 4 },  // battery+ to R1
          { id: uid(), gx1: 7, gy1: 4, gx2: 9, gy2: 4 },  // R1 to LED
          { id: uid(), gx1: 10, gy1: 4, gx2: 10, gy2: 8 }, // LED to bottom row
          { id: uid(), gx1: 10, gy1: 8, gx2: 7, gy2: 8 },  // to R2
          { id: uid(), gx1: 6, gy1: 8, gx2: 3, gy2: 8 },   // R2 to left
          { id: uid(), gx1: 3, gy1: 8, gx2: 3, gy2: 4 },   // back to battery-
        ];
        setComponents(demoComps);
        setWires(demoWires);
      }, []);

      const selectedComp = components.find(c => c.id === selectedCompId);

      return (
        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚡</span>
              <div>
                <h1 className="text-sm font-bold text-slate-200">Circuit Simulator</h1>
                <p className="text-xs text-slate-500">Place components and wire them to build circuits</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {wiringMode && (
                <div className="flex items-center gap-2 px-3 py-1 bg-cyan-900/40 border border-cyan-700 rounded-full text-xs text-cyan-300">
                  <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                  Wiring Mode — click two points
                  <button
                    onClick={() => { setWiringMode(false); setWiringStart(null); }}
                    className="ml-1 text-cyan-400 hover:text-cyan-200 font-bold"
                  >✕</button>
                </div>
              )}
              <button
                onClick={handleLoadDemo}
                className="px-3 py-1.5 bg-indigo-600/30 border border-indigo-500 text-indigo-300 text-xs font-medium rounded-lg hover:bg-indigo-600/50 transition-colors"
              >
                Load Demo Circuit
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-1.5 bg-slate-800 border border-slate-600 text-slate-400 text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors"
              >
                Clear Board
              </button>
            </div>
          </div>

          {/* Main layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left sidebar — palette */}
            <div className="w-48 border-r border-slate-800 bg-slate-900/50 flex flex-col overflow-y-auto">
              <Palette selected={selectedTool} onSelect={(t) => {
                setSelectedTool(t);
                setWiringMode(false);
                setWiringStart(null);
                if (t === 'wire') {
                  setWiringMode(true);
                }
              }} />
              <div className="border-t border-slate-800 mt-2">
                <PropertiesPanel
                  component={selectedComp}
                  onUpdate={handleUpdateComponent}
                  onDelete={handleDeleteComponent}
                />
              </div>
            </div>

            {/* Canvas area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex items-center justify-center bg-[#0a0e1a] overflow-auto p-4">
                <div className="rounded-xl border-2 border-slate-800 overflow-hidden shadow-2xl shadow-black/40" style={{ background: '#0f1623' }}>
                  <CircuitCanvas
                    components={components}
                    wires={wires}
                    selectedId={selectedCompId}
                    wiringMode={wiringMode}
                    wiringStart={wiringStart}
                    solution={solution}
                    onCellClick={handleCellClick}
                    onComponentClick={handleComponentClick}
                  />
                </div>
              </div>

              {/* Bottom status bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-4 text-slate-500">
                  <span>Components: <span className="text-slate-300 font-medium">{components.length}</span></span>
                  <span>Wires: <span className="text-slate-300 font-medium">{wires.length}</span></span>
                  <span>Grid: {COLS}×{ROWS}</span>
                </div>
                <div className="flex items-center gap-2">
                  {solution.valid ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full"></span>
                      Circuit Complete — {(solution.current * 1000).toFixed(1)} mA
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="inline-block w-2 h-2 bg-amber-400 rounded-full"></span>
                      Open Circuit
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right sidebar — readout */}
            <div className="w-52 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
              <Readout solution={solution} />

              {/* Instructions */}
              <div className="p-3 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">How to Use</div>
                <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
                  <li>Select a component from the left palette</li>
                  <li>Click on the grid to place it</li>
                  <li>Select <span className="text-slate-300">Wire</span> to connect terminals</li>
                  <li>Form a closed loop with a battery</li>
                  <li>Watch real-time V/I calculations</li>
                </ol>
              </div>

              {/* Formulas */}
              <div className="p-3 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Formulas</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ohm's Law</span>
                    <span className="text-cyan-400 font-mono">V = IR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Series R</span>
                    <span className="text-orange-400 font-mono">R = R1+R2+...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Power</span>
                    <span className="text-yellow-400 font-mono">P = IV</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Capacitor</span>
                    <span className="text-blue-400 font-mono">Q = CV</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  <\/script>
</body>
</html>`;
