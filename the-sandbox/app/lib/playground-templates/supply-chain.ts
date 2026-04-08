import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'supply-chain',
  title: 'Supply Chain Disruption Visualizer',
  description:
    'Interactive network graph of a supply chain. Simulate disruptions and watch cascade effects propagate.',
  category: 'simulation',
  thumbnailEmoji: '🔗',
  editorScrollTarget: '// 🔗 SUPPLY CHAIN NETWORK ENGINE',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '🔗 Click any node to disrupt it. Watch how failures cascade through the supply chain network.',
    ctaLabel: '▶ Load Network',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Supply Chain Disruption Visualizer</title>
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
    body { margin: 0; background: #0b1120; color: #e2e8f0; font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
    canvas { display: block; }
    @keyframes pulseDisrupt {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.3s ease-out; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #1e293b; }
    ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
  </style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
// 🔗 SUPPLY CHAIN NETWORK ENGINE
// Force-directed graph with disruption cascade simulation

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ─── Node & Edge Definitions ───────────────────────────────────────
const NODE_TYPES = {
  supplier:     { color: '#f97316', glow: '#f9731640', icon: '📦', label: 'Supplier' },
  manufacturer: { color: '#3b82f6', glow: '#3b82f640', icon: '🏭', label: 'Manufacturer' },
  distributor:  { color: '#22c55e', glow: '#22c55e40', icon: '🚚', label: 'Distributor' },
  retailer:     { color: '#a855f7', glow: '#a855f740', icon: '🏪', label: 'Retailer' },
};

const DISRUPTED_COLOR = '#ef4444';
const DISRUPTED_GLOW  = '#ef444460';

function createInitialNodes() {
  return [
    // Suppliers (5)
    { id: 's1', name: 'Steel Corp',        type: 'supplier',     x: 120, y: 80,  vx: 0, vy: 0, capacity: 100, throughput: 850 },
    { id: 's2', name: 'Polymer Ltd',       type: 'supplier',     x: 120, y: 200, vx: 0, vy: 0, capacity: 100, throughput: 620 },
    { id: 's3', name: 'Silicon Works',     type: 'supplier',     x: 120, y: 320, vx: 0, vy: 0, capacity: 100, throughput: 940 },
    { id: 's4', name: 'Timber Co',         type: 'supplier',     x: 120, y: 440, vx: 0, vy: 0, capacity: 100, throughput: 510 },
    { id: 's5', name: 'Chemical Intl',     type: 'supplier',     x: 120, y: 560, vx: 0, vy: 0, capacity: 100, throughput: 730 },
    // Manufacturers (3)
    { id: 'm1', name: 'AutoBuild Inc',     type: 'manufacturer', x: 350, y: 150, vx: 0, vy: 0, capacity: 100, throughput: 1200 },
    { id: 'm2', name: 'TechAssembly',      type: 'manufacturer', x: 350, y: 320, vx: 0, vy: 0, capacity: 100, throughput: 1450 },
    { id: 'm3', name: 'HomeCraft Mfg',     type: 'manufacturer', x: 350, y: 490, vx: 0, vy: 0, capacity: 100, throughput: 980 },
    // Distributors (4)
    { id: 'd1', name: 'FastFreight',       type: 'distributor',  x: 580, y: 100, vx: 0, vy: 0, capacity: 100, throughput: 2100 },
    { id: 'd2', name: 'GlobalShip',        type: 'distributor',  x: 580, y: 250, vx: 0, vy: 0, capacity: 100, throughput: 1800 },
    { id: 'd3', name: 'QuickDeliver',      type: 'distributor',  x: 580, y: 400, vx: 0, vy: 0, capacity: 100, throughput: 1600 },
    { id: 'd4', name: 'RegionalDist',      type: 'distributor',  x: 580, y: 550, vx: 0, vy: 0, capacity: 100, throughput: 1350 },
    // Retailers (6)
    { id: 'r1', name: 'MegaMart',          type: 'retailer',     x: 810, y: 60,  vx: 0, vy: 0, capacity: 100, throughput: 3200 },
    { id: 'r2', name: 'CityShop',          type: 'retailer',     x: 810, y: 170, vx: 0, vy: 0, capacity: 100, throughput: 1900 },
    { id: 'r3', name: 'TechZone',          type: 'retailer',     x: 810, y: 280, vx: 0, vy: 0, capacity: 100, throughput: 2400 },
    { id: 'r4', name: 'HomeDepot+',        type: 'retailer',     x: 810, y: 390, vx: 0, vy: 0, capacity: 100, throughput: 2800 },
    { id: 'r5', name: 'GreenGrocer',       type: 'retailer',     x: 810, y: 500, vx: 0, vy: 0, capacity: 100, throughput: 1100 },
    { id: 'r6', name: 'ValueMart',         type: 'retailer',     x: 810, y: 610, vx: 0, vy: 0, capacity: 100, throughput: 1500 },
  ];
}

const EDGES_DEF = [
  // Suppliers → Manufacturers
  { from: 's1', to: 'm1' }, { from: 's1', to: 'm2' },
  { from: 's2', to: 'm1' }, { from: 's2', to: 'm3' },
  { from: 's3', to: 'm2' }, { from: 's3', to: 'm1' },
  { from: 's4', to: 'm3' }, { from: 's4', to: 'm2' },
  { from: 's5', to: 'm3' }, { from: 's5', to: 'm1' },
  // Manufacturers → Distributors
  { from: 'm1', to: 'd1' }, { from: 'm1', to: 'd2' },
  { from: 'm2', to: 'd2' }, { from: 'm2', to: 'd3' },
  { from: 'm3', to: 'd3' }, { from: 'm3', to: 'd4' },
  { from: 'm1', to: 'd3' },
  // Distributors → Retailers
  { from: 'd1', to: 'r1' }, { from: 'd1', to: 'r2' },
  { from: 'd2', to: 'r2' }, { from: 'd2', to: 'r3' },
  { from: 'd3', to: 'r3' }, { from: 'd3', to: 'r4' },
  { from: 'd3', to: 'r5' }, { from: 'd4', to: 'r4' },
  { from: 'd4', to: 'r5' }, { from: 'd4', to: 'r6' },
  { from: 'd1', to: 'r6' }, { from: 'd2', to: 'r1' },
];

// ─── Force Layout Physics ──────────────────────────────────────────
const REPULSION = 18000;
const SPRING_K = 0.004;
const SPRING_REST = 180;
const DAMPING = 0.85;
const CENTER_GRAVITY = 0.0008;

function applyForces(nodes, edges, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  for (let i = 0; i < nodes.length; i++) {
    let fx = 0, fy = 0;
    // Repulsion from all other nodes
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = REPULSION / (dist * dist);
      fx += (dx / dist) * force;
      fy += (dy / dist) * force;
    }
    // Spring attraction along edges
    for (const edge of edges) {
      let other = null;
      if (edge.from === nodes[i].id) other = nodes.find(n => n.id === edge.to);
      else if (edge.to === nodes[i].id) other = nodes.find(n => n.id === edge.from);
      if (!other) continue;
      const dx = other.x - nodes[i].x;
      const dy = other.y - nodes[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const displacement = dist - SPRING_REST;
      fx += (dx / dist) * displacement * SPRING_K;
      fy += (dy / dist) * displacement * SPRING_K;
    }
    // Center gravity
    fx += (cx - nodes[i].x) * CENTER_GRAVITY;
    fy += (cy - nodes[i].y) * CENTER_GRAVITY;
    // Layer gravity — keep types in columns
    const layerX = { supplier: width * 0.12, manufacturer: width * 0.37, distributor: width * 0.62, retailer: width * 0.87 };
    fx += (layerX[nodes[i].type] - nodes[i].x) * 0.01;

    if (!nodes[i].pinned) {
      nodes[i].vx = (nodes[i].vx + fx) * DAMPING;
      nodes[i].vy = (nodes[i].vy + fy) * DAMPING;
      nodes[i].x += nodes[i].vx;
      nodes[i].y += nodes[i].vy;
      // Bounds
      nodes[i].x = Math.max(40, Math.min(width - 40, nodes[i].x));
      nodes[i].y = Math.max(40, Math.min(height - 40, nodes[i].y));
    }
  }
}

// ─── Cascade Engine ────────────────────────────────────────────────
function computeCascade(nodes, edges, disruptedIds) {
  const affected = new Map(); // id → { delay, capacityLoss }
  disruptedIds.forEach(id => affected.set(id, { delay: 0, capacityLoss: 80 + Math.random() * 20 }));

  let frontier = [...disruptedIds];
  let wave = 0;
  while (frontier.length > 0 && wave < 10) {
    wave++;
    const next = [];
    for (const fid of frontier) {
      const downstream = edges.filter(e => e.from === fid).map(e => e.to);
      for (const did of downstream) {
        if (!affected.has(did)) {
          const loss = Math.max(15, affected.get(fid).capacityLoss * (0.5 + Math.random() * 0.3));
          affected.set(did, { delay: wave * 1200, capacityLoss: Math.min(95, loss) });
          next.push(did);
        }
      }
    }
    frontier = next;
  }
  return affected;
}

// ─── Scenario Definitions ──────────────────────────────────────────
const SCENARIOS = [
  { name: 'Port Closure', desc: 'All raw material suppliers shut down', getIds: () => ['s1','s2','s3','s4','s5'] },
  { name: 'Factory Fire', desc: 'Single manufacturer goes offline', getIds: () => ['m2'] },
  { name: 'Natural Disaster', desc: 'Regional cluster disrupted', getIds: () => ['s1','s3','m1','d1'] },
  { name: 'Pandemic', desc: 'Random 40% of nodes disrupted', getIds: (nodes) => {
    const shuffled = [...nodes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.ceil(nodes.length * 0.4)).map(n => n.id);
  }},
];

// ─── Flow Particles ────────────────────────────────────────────────
function createParticles(edges, nodes) {
  return edges.map(e => ({
    from: e.from, to: e.to,
    progress: Math.random(),
    speed: 0.003 + Math.random() * 0.003,
  }));
}

// ─── Canvas Renderer ───────────────────────────────────────────────
function drawNetwork(ctx, nodes, edges, particles, disrupted, cascadeMap, selectedId, hoveredId, time, recovering) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Background grid
  ctx.strokeStyle = '#1e293b40';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
  for (let gy = 0; gy < h; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }

  // Column labels
  ctx.font = '11px system-ui';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.fillText('SUPPLIERS', w * 0.12, 22);
  ctx.fillText('MANUFACTURERS', w * 0.37, 22);
  ctx.fillText('DISTRIBUTORS', w * 0.62, 22);
  ctx.fillText('RETAILERS', w * 0.87, 22);

  const nodeMap = {};
  nodes.forEach(n => nodeMap[n.id] = n);

  // Draw edges
  for (const edge of edges) {
    const a = nodeMap[edge.from];
    const b = nodeMap[edge.to];
    if (!a || !b) continue;
    const aDisrupted = disrupted.has(a.id) || cascadeMap.has(a.id);
    const bDisrupted = disrupted.has(b.id) || cascadeMap.has(b.id);
    const bothDisrupted = aDisrupted && bDisrupted;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    if (bothDisrupted) {
      ctx.strokeStyle = '#ef444440';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
    } else {
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, NODE_TYPES[a.type].color + '60');
      grad.addColorStop(1, NODE_TYPES[b.type].color + '60');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Directional arrow at midpoint
    if (!bothDisrupted) {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(angle);
      ctx.fillStyle = NODE_TYPES[b.type].color + '80';
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Draw flow particles
  if (!recovering) {
    for (const p of particles) {
      const a = nodeMap[p.from];
      const b = nodeMap[p.to];
      if (!a || !b) continue;
      const aDisrupted = disrupted.has(a.id) || cascadeMap.has(a.id);
      const bDisrupted = disrupted.has(b.id) || cascadeMap.has(b.id);
      if (aDisrupted && bDisrupted) continue;
      const px = a.x + (b.x - a.x) * p.progress;
      const py = a.y + (b.y - a.y) * p.progress;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = NODE_TYPES[b.type].color + 'cc';
      ctx.fill();
    }
  }

  // Draw nodes
  const nodeRadius = 26;
  for (const node of nodes) {
    const isDisrupted = disrupted.has(node.id);
    const isCascaded = cascadeMap.has(node.id);
    const isSelected = selectedId === node.id;
    const isHovered = hoveredId === node.id;
    const conf = NODE_TYPES[node.type];
    let fillColor = conf.color;
    let glowColor = conf.glow;

    if (isDisrupted || isCascaded) {
      fillColor = DISRUPTED_COLOR;
      glowColor = DISRUPTED_GLOW;
    }

    // Glow
    const glowSize = (isDisrupted ? 18 + Math.sin(time * 0.005) * 8 : isHovered ? 14 : 10);
    ctx.shadowColor = isDisrupted || isCascaded ? DISRUPTED_COLOR : conf.color;
    ctx.shadowBlur = glowSize;

    // Outer ring for selected
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff80';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(node.x - 5, node.y - 5, 2, node.x, node.y, nodeRadius);
    gradient.addColorStop(0, fillColor + 'dd');
    gradient.addColorStop(1, fillColor + '88');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Disruption pulse ring
    if (isDisrupted) {
      const pulseR = nodeRadius + 4 + Math.sin(time * 0.008) * 10;
      ctx.beginPath();
      ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = DISRUPTED_COLOR + '40';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Node icon
    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(conf.icon, node.x, node.y - 2);

    // Node label
    ctx.font = 'bold 9px system-ui';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(node.name, node.x, node.y + nodeRadius + 12);

    // Capacity badge
    const cap = isDisrupted ? Math.round(100 - (cascadeMap.get(node.id)?.capacityLoss || 85))
      : isCascaded ? Math.round(100 - cascadeMap.get(node.id).capacityLoss) : node.capacity;
    if (cap < 100) {
      const badgeColor = cap < 30 ? '#ef4444' : cap < 60 ? '#eab308' : '#22c55e';
      ctx.font = 'bold 10px system-ui';
      ctx.fillStyle = badgeColor;
      ctx.fillText(cap + '%', node.x, node.y + nodeRadius + 23);
    }
  }
}

// ─── Main App Component ────────────────────────────────────────────
function App() {
  const canvasRef = useRef(null);
  const nodesRef = useRef(createInitialNodes());
  const particlesRef = useRef([]);
  const [disrupted, setDisrupted] = useState(new Set());
  const [cascadeMap, setCascadeMap] = useState(new Map());
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [recovering, setRecovering] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState(0);
  const [metrics, setMetrics] = useState({ timeToImpact: 0, revenueLoss: 0, nodesAffected: 0, resilience: 100 });
  const rafRef = useRef(null);
  const dragRef = useRef(null);
  const sizeRef = useRef({ w: 960, h: 680 });
  const timeRef = useRef(0);

  // Initialize particles
  useEffect(() => {
    particlesRef.current = createParticles(EDGES_DEF, nodesRef.current);
  }, []);

  // Update metrics when disruption changes
  useEffect(() => {
    const totalNodes = nodesRef.current.length;
    const affected = cascadeMap.size;
    const retailers = nodesRef.current.filter(n => n.type === 'retailer');
    let maxDelay = 0;
    let totalLoss = 0;
    cascadeMap.forEach((val, id) => {
      const node = nodesRef.current.find(n => n.id === id);
      if (node) {
        totalLoss += node.throughput * (val.capacityLoss / 100);
        if (node.type === 'retailer' && val.delay > maxDelay) maxDelay = val.delay;
      }
    });
    disrupted.forEach(id => {
      const node = nodesRef.current.find(n => n.id === id);
      if (node) totalLoss += node.throughput * 0.85;
    });
    const resilience = Math.max(0, Math.round(100 - (affected / totalNodes) * 100));
    setMetrics({
      timeToImpact: maxDelay > 0 ? (maxDelay / 1000).toFixed(1) + 's' : disrupted.size > 0 ? 'Immediate' : '—',
      revenueLoss: '$' + (totalLoss * 1000).toLocaleString(),
      nodesAffected: affected + disrupted.size,
      resilience,
    });
  }, [disrupted, cascadeMap]);

  // Canvas resize
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w;
      canvas.height = h;
      sizeRef.current = { w, h };
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Animation loop
  useEffect(() => {
    const loop = () => {
      timeRef.current += 16;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }
      const { w, h } = sizeRef.current;

      applyForces(nodesRef.current, EDGES_DEF, w, h);

      // Advance particles
      for (const p of particlesRef.current) {
        p.progress += p.speed;
        if (p.progress >= 1) p.progress = 0;
      }

      drawNetwork(ctx, nodesRef.current, EDGES_DEF, particlesRef.current, disrupted, cascadeMap, selectedId, hoveredId, timeRef.current, recovering);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [disrupted, cascadeMap, selectedId, hoveredId, recovering]);

  // Hit test
  const getNodeAt = useCallback((x, y) => {
    for (const node of nodesRef.current) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < 26 * 26) return node;
    }
    return null;
  }, []);

  // Click to disrupt
  const handleCanvasClick = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = getNodeAt(x, y);
    if (node) {
      setSelectedId(node.id);
      if (!recovering) {
        const newDisrupted = new Set(disrupted);
        if (newDisrupted.has(node.id)) {
          newDisrupted.delete(node.id);
        } else {
          newDisrupted.add(node.id);
        }
        setDisrupted(newDisrupted);
        const cascade = computeCascade(nodesRef.current, EDGES_DEF, [...newDisrupted]);
        newDisrupted.forEach(id => cascade.delete(id));
        setCascadeMap(cascade);
      }
    } else {
      setSelectedId(null);
    }
  }, [disrupted, recovering, getNodeAt]);

  // Mouse move for hover + drag
  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (dragRef.current) {
      dragRef.current.x = x;
      dragRef.current.y = y;
      dragRef.current.pinned = true;
      return;
    }
    const node = getNodeAt(x, y);
    setHoveredId(node ? node.id : null);
    canvasRef.current.style.cursor = node ? 'pointer' : 'default';
  }, [getNodeAt]);

  const handleMouseDown = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const node = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
    if (node) { dragRef.current = node; node.pinned = true; }
  }, [getNodeAt]);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) { dragRef.current.pinned = false; dragRef.current = null; }
  }, []);

  // Run scenario
  const runScenario = useCallback((scenario) => {
    setRecovering(false);
    setRecoveryProgress(0);
    const ids = scenario.getIds(nodesRef.current);
    const newDisrupted = new Set(ids);
    setDisrupted(newDisrupted);
    const cascade = computeCascade(nodesRef.current, EDGES_DEF, ids);
    ids.forEach(id => cascade.delete(id));
    setCascadeMap(cascade);
    if (ids.length > 0) setSelectedId(ids[0]);
  }, []);

  // Recovery mode
  const startRecovery = useCallback(() => {
    if (disrupted.size === 0 && cascadeMap.size === 0) return;
    setRecovering(true);
    setRecoveryProgress(0);
    const allAffected = [...disrupted, ...cascadeMap.keys()];
    const total = allAffected.length;
    let recovered = 0;
    const interval = setInterval(() => {
      recovered++;
      setRecoveryProgress(Math.round((recovered / total) * 100));
      if (recovered <= allAffected.length) {
        const id = allAffected[recovered - 1];
        setDisrupted(prev => { const n = new Set(prev); n.delete(id); return n; });
        setCascadeMap(prev => { const n = new Map(prev); n.delete(id); return n; });
      }
      if (recovered >= total) {
        clearInterval(interval);
        setTimeout(() => { setRecovering(false); setRecoveryProgress(0); }, 600);
      }
    }, 800);
  }, [disrupted, cascadeMap]);

  // Reset
  const resetAll = useCallback(() => {
    setDisrupted(new Set());
    setCascadeMap(new Map());
    setSelectedId(null);
    setRecovering(false);
    setRecoveryProgress(0);
    nodesRef.current = createInitialNodes();
  }, []);

  // Selected node info
  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    const node = nodesRef.current.find(n => n.id === selectedId);
    if (!node) return null;
    const upstream = EDGES_DEF.filter(e => e.to === node.id).map(e => nodesRef.current.find(n => n.id === e.from)?.name).filter(Boolean);
    const downstream = EDGES_DEF.filter(e => e.from === node.id).map(e => nodesRef.current.find(n => n.id === e.to)?.name).filter(Boolean);
    const isDisrupted = disrupted.has(node.id) || cascadeMap.has(node.id);
    const capacityLoss = disrupted.has(node.id) ? 85 : cascadeMap.get(node.id)?.capacityLoss || 0;
    return { ...node, upstream, downstream, isDisrupted, capacityLoss, currentCapacity: Math.round(100 - capacityLoss) };
  }, [selectedId, disrupted, cascadeMap]);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {/* Left sidebar */}
      <div style={{ width: 280, minWidth: 280, background: '#111827', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #1e293b' }}>
          <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#f1f5f9' }}>🔗 Supply Chain Visualizer</h1>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>Click nodes to disrupt. Watch cascades propagate.</p>
        </div>

        {/* Metrics */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cascade Metrics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <MetricCard label="Time to Impact" value={metrics.timeToImpact} color="#3b82f6" />
            <MetricCard label="Revenue Loss" value={metrics.revenueLoss} color="#ef4444" />
            <MetricCard label="Nodes Affected" value={metrics.nodesAffected + '/' + nodesRef.current.length} color="#eab308" />
            <MetricCard label="Resilience" value={metrics.resilience + '%'} color={metrics.resilience > 70 ? '#22c55e' : metrics.resilience > 40 ? '#eab308' : '#ef4444'} />
          </div>
        </div>

        {/* Scenarios */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scenarios</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SCENARIOS.map((s, i) => (
              <button key={i} onClick={() => runScenario(s)}
                style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                onMouseEnter={e => e.target.style.background = '#334155'}
                onMouseLeave={e => e.target.style.background = '#1e293b'}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{s.name}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
          <button onClick={startRecovery}
            style={{ flex: 1, background: disrupted.size > 0 || cascadeMap.size > 0 ? '#22c55e20' : '#1e293b', border: '1px solid #22c55e60', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#22c55e', fontSize: 12, fontWeight: 600 }}>
            {recovering ? 'Recovering ' + recoveryProgress + '%' : '🔄 Recover'}
          </button>
          <button onClick={resetAll}
            style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
            ↺ Reset
          </button>
        </div>

        {/* Legend */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid #1e293b' }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</h3>
          {Object.entries(NODE_TYPES).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: val.color, boxShadow: '0 0 6px ' + val.color + '80' }} />
              <span style={{ fontSize: 11, color: '#cbd5e1' }}>{val.icon} {val.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: DISRUPTED_COLOR, boxShadow: '0 0 6px ' + DISRUPTED_COLOR + '80' }} />
            <span style={{ fontSize: 11, color: '#cbd5e1' }}>⚠️ Disrupted</span>
          </div>
        </div>

        {/* Selected node info */}
        {selectedNode && (
          <div className="fade-in" style={{ padding: '12px 16px', borderTop: '1px solid #1e293b', flex: 1, overflowY: 'auto' }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Node Info</h3>
            <div style={{ background: '#1e293b', borderRadius: 10, padding: 12, border: '1px solid #334155' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{NODE_TYPES[selectedNode.type].icon} {selectedNode.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{NODE_TYPES[selectedNode.type].label}</div>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Status</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: selectedNode.isDisrupted ? '#ef4444' : '#22c55e' }}>
                    {selectedNode.isDisrupted ? '⚠️ Disrupted' : '✅ Operational'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Capacity</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: selectedNode.currentCapacity < 50 ? '#ef4444' : '#22c55e' }}>
                    {selectedNode.currentCapacity}%
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Throughput</div>
                <div style={{ fontSize: 12, color: '#e2e8f0' }}>{selectedNode.throughput.toLocaleString()} units/day</div>
              </div>
              {/* Capacity bar */}
              <div style={{ marginTop: 8, background: '#0f172a', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{
                  width: selectedNode.currentCapacity + '%',
                  height: '100%',
                  background: selectedNode.currentCapacity < 30 ? '#ef4444' : selectedNode.currentCapacity < 60 ? '#eab308' : '#22c55e',
                  borderRadius: 4,
                  transition: 'width 0.5s ease'
                }} />
              </div>
              {selectedNode.upstream.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>Dependencies ({selectedNode.upstream.length})</div>
                  {selectedNode.upstream.map((name, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#94a3b8', padding: '1px 0' }}>← {name}</div>
                  ))}
                </div>
              )}
              {selectedNode.downstream.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>Feeds Into ({selectedNode.downstream.length})</div>
                  {selectedNode.downstream.map((name, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#94a3b8', padding: '1px 0' }}>→ {name}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ width: '100%', height: '100%' }}
        />
        {/* Recovery overlay */}
        {recovering && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#22c55e20', border: '1px solid #22c55e60', borderRadius: 10, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>🔄 Recovery in progress...</div>
            <div style={{ width: 120, height: 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: recoveryProgress + '%', height: '100%', background: '#22c55e', borderRadius: 3, transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: '#22c55e' }}>{recoveryProgress}%</div>
          </div>
        )}
        {/* Empty state */}
        {disrupted.size === 0 && cascadeMap.size === 0 && !recovering && (
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 20px', fontSize: 12, color: '#94a3b8', textAlign: 'center', pointerEvents: 'none' }}>
            Click any node to disrupt it, or choose a scenario from the left panel
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '8px 10px', border: '1px solid #334155' }}>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
<\/script>
</body>
</html>`;
