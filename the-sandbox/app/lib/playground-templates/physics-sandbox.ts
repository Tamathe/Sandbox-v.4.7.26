import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'physics-sandbox',
  title: 'Physics Sandbox',
  description:
    'Interactive projectile motion, pendulum, and spring-mass simulations with adjustable parameters and real-time graphs.',
  category: 'simulation',
  thumbnailEmoji: '🎯',
  editorScrollTarget: '// 🎯 PHYSICS ENGINE',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '🎯 Choose a physics simulation, adjust parameters, and watch the physics unfold in real-time.',
    ctaLabel: '▶ Start Simulation',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Physics Sandbox</title>
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
    body { margin: 0; background: #0f172a; color: #e2e8f0; font-family: system-ui, sans-serif; }
    canvas { display: block; }
    input[type="range"] {
      -webkit-appearance: none; appearance: none; height: 6px;
      background: #334155; border-radius: 3px; outline: none;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none; width: 16px; height: 16px;
      background: #3b82f6; border-radius: 50%; cursor: pointer;
    }
    input[type="range"]::-moz-range-thumb {
      width: 16px; height: 16px; background: #3b82f6; border-radius: 50%; cursor: pointer; border: none;
    }
    .tab-active { background: #3b82f6; color: white; }
    .tab-inactive { background: #1e293b; color: #94a3b8; }
    .tab-inactive:hover { background: #334155; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    // 🎯 PHYSICS ENGINE
    // Three simulation modes: Projectile Motion, Pendulum, Spring-Mass

    const { useState, useEffect, useRef, useCallback } = React;

    /* ─── Utility Helpers ─── */
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const degToRad = (d) => (d * Math.PI) / 180;
    const radToDeg = (r) => (r * 180) / Math.PI;

    /* ─── Slider Component ─── */
    function Slider({ label, value, min, max, step, unit, onChange, disabled }) {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">{label}</span>
            <span className="text-blue-400 font-mono">{typeof value === 'number' ? value.toFixed(step < 1 ? 1 : 0) : value} {unit}</span>
          </div>
          <input
            type="range" min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full"
          />
        </div>
      );
    }

    /* ─── Graph Component (canvas-based) ─── */
    function Graph({ data, xLabel, yLabel, color, title, width, height }) {
      const canvasRef = useRef(null);

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length === 0) return;
        const ctx = canvas.getContext('2d');
        const W = width || canvas.width;
        const H = height || canvas.height;
        canvas.width = W;
        canvas.height = H;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);

        const pad = { top: 24, right: 12, bottom: 28, left: 44 };
        const gW = W - pad.left - pad.right;
        const gH = H - pad.top - pad.bottom;

        const xs = data.map(d => d.x);
        const ys = data.map(d => d.y);
        let xMin = Math.min(...xs), xMax = Math.max(...xs);
        let yMin = Math.min(...ys), yMax = Math.max(...ys);
        if (xMax === xMin) xMax = xMin + 1;
        if (yMax === yMin) { yMin -= 1; yMax += 1; }
        const yPad = (yMax - yMin) * 0.1;
        yMin -= yPad; yMax += yPad;

        // Grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = pad.top + (gH / 4) * i;
          ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + gW, y); ctx.stroke();
        }

        // Axes labels
        ctx.fillStyle = '#64748b';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(xLabel || 'x', pad.left + gW / 2, H - 4);
        for (let i = 0; i <= 4; i++) {
          const val = yMax - ((yMax - yMin) / 4) * i;
          const y = pad.top + (gH / 4) * i;
          ctx.textAlign = 'right';
          ctx.fillText(val.toFixed(1), pad.left - 4, y + 3);
        }

        // Title
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(title || '', pad.left + gW / 2, 14);

        // Data line
        ctx.strokeStyle = color || '#3b82f6';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        data.forEach((d, i) => {
          const px = pad.left + ((d.x - xMin) / (xMax - xMin)) * gW;
          const py = pad.top + ((yMax - d.y) / (yMax - yMin)) * gH;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }, [data, color, title, xLabel, yLabel, width, height]);

      return <canvas ref={canvasRef} width={width || 320} height={height || 160} className="rounded" />;
    }

    /* ═══════════════════════════════════════════════════════
       MODE 1: PROJECTILE MOTION
       ═══════════════════════════════════════════════════════ */
    function ProjectileMode() {
      const canvasRef = useRef(null);
      const animRef = useRef(null);
      const [angle, setAngle] = useState(45);
      const [velocity, setVelocity] = useState(25);
      const [gravity, setGravity] = useState(9.8);
      const [running, setRunning] = useState(false);
      const [time, setTime] = useState(0);
      const [trail, setTrail] = useState([]);
      const [stats, setStats] = useState({ h: 0, d: 0, t: 0, v: 0 });
      const [heightData, setHeightData] = useState([]);
      const [distData, setDistData] = useState([]);
      const stateRef = useRef({ t: 0, trail: [], heightData: [], distData: [] });

      const cannonX = 60;
      const groundY = 340;
      const scale = 8; // pixels per meter

      const drawScene = useCallback((ctx, W, H, st) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);

        // Ground
        ctx.fillStyle = '#1e3a2f';
        ctx.fillRect(0, groundY, W, H - groundY);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();

        // Distance markers
        ctx.fillStyle = '#334155';
        ctx.font = '9px system-ui';
        ctx.textAlign = 'center';
        for (let d = 0; d <= 60; d += 10) {
          const px = cannonX + d * scale;
          if (px > W) break;
          ctx.beginPath(); ctx.moveTo(px, groundY); ctx.lineTo(px, groundY + 6); ctx.stroke();
          ctx.fillText(d + 'm', px, groundY + 16);
        }

        // Cannon base
        ctx.fillStyle = '#475569';
        ctx.fillRect(cannonX - 15, groundY - 12, 30, 12);
        ctx.beginPath(); ctx.arc(cannonX, groundY - 12, 10, 0, Math.PI * 2); ctx.fill();

        // Cannon barrel
        const rad = degToRad(angle);
        const barrelLen = 30;
        ctx.save();
        ctx.translate(cannonX, groundY - 12);
        ctx.rotate(-rad);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, -4, barrelLen, 8);
        ctx.restore();

        // Predicted trajectory (dotted)
        if (!running || st.t < 0.1) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          const vx = velocity * Math.cos(rad);
          const vy = velocity * Math.sin(rad);
          for (let pt = 0; pt < 200; pt++) {
            const tt = pt * 0.05;
            const px = cannonX + vx * tt * scale;
            const py = groundY - 12 - (vy * tt - 0.5 * gravity * tt * tt) * scale;
            if (py > groundY) break;
            if (pt === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Trail
        if (st.trail.length > 1) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          st.trail.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.px, p.py); else ctx.lineTo(p.px, p.py);
          });
          ctx.stroke();

          // Trail dots
          st.trail.forEach((p, i) => {
            if (i % 3 === 0) {
              ctx.beginPath();
              ctx.arc(p.px, p.py, 2, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(251, 191, 36, 0.6)';
              ctx.fill();
            }
          });
        }

        // Projectile
        if (running && st.t > 0) {
          const vx = velocity * Math.cos(rad);
          const vy = velocity * Math.sin(rad);
          const px = cannonX + vx * st.t * scale;
          const py = groundY - 12 - (vy * st.t - 0.5 * gravity * st.t * st.t) * scale;
          if (py <= groundY) {
            // Velocity vector
            const cvx = vx;
            const cvy = vy - gravity * st.t;
            const vmag = Math.sqrt(cvx * cvx + cvy * cvy);
            const vScale = 20 / Math.max(vmag, 1);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + cvx * vScale, py - cvy * vScale);
            ctx.stroke();
            // Arrowhead
            const aAngle = Math.atan2(-cvy, cvx);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(px + cvx * vScale, py - cvy * vScale);
            ctx.lineTo(px + cvx * vScale - 6 * Math.cos(aAngle - 0.4), py - cvy * vScale + 6 * Math.sin(aAngle - 0.4));
            ctx.lineTo(px + cvx * vScale - 6 * Math.cos(aAngle + 0.4), py - cvy * vScale + 6 * Math.sin(aAngle + 0.4));
            ctx.fill();

            // Ball
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }

        // Stats overlay
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(W - 160, 8, 152, 76);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(W - 160, 8, 152, 76);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        const rad2 = degToRad(angle);
        const vx = velocity * Math.cos(rad2);
        const vy = velocity * Math.sin(rad2);
        const curH = Math.max(0, vy * st.t - 0.5 * gravity * st.t * st.t);
        const curD = vx * st.t;
        const curVy = vy - gravity * st.t;
        const curV = Math.sqrt(vx * vx + curVy * curVy);
        ctx.fillText('Height: ' + curH.toFixed(1) + ' m', W - 152, 28);
        ctx.fillText('Distance: ' + curD.toFixed(1) + ' m', W - 152, 42);
        ctx.fillText('Time: ' + st.t.toFixed(2) + ' s', W - 152, 56);
        ctx.fillText('Speed: ' + curV.toFixed(1) + ' m/s', W - 152, 70);
      }, [angle, velocity, gravity, running]);

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 380;
        drawScene(ctx, canvas.width, canvas.height, stateRef.current);
      }, [angle, velocity, gravity, drawScene]);

      useEffect(() => {
        if (!running) return;
        const rad = degToRad(angle);
        const vx = velocity * Math.cos(rad);
        const vy = velocity * Math.sin(rad);
        let lastTime = performance.now();

        const animate = (now) => {
          const dt = Math.min((now - lastTime) / 1000, 0.05);
          lastTime = now;
          const st = stateRef.current;
          st.t += dt;

          const h = vy * st.t - 0.5 * gravity * st.t * st.t;
          const d = vx * st.t;
          const px = cannonX + d * scale;
          const py = groundY - 12 - h * scale;

          if (h < 0) {
            setRunning(false);
            setTime(st.t);
            return;
          }

          st.trail.push({ px, py });
          st.heightData.push({ x: st.t, y: Math.max(0, h) });
          st.distData.push({ x: st.t, y: d });

          setTime(st.t);
          setTrail([...st.trail]);
          setHeightData([...st.heightData]);
          setDistData([...st.distData]);

          const curVy = vy - gravity * st.t;
          setStats({ h: Math.max(0, h), d, t: st.t, v: Math.sqrt(vx * vx + curVy * curVy) });

          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            drawScene(ctx, canvas.width, canvas.height, st);
          }

          animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
      }, [running, angle, velocity, gravity, drawScene]);

      const handleStart = () => {
        stateRef.current = { t: 0, trail: [], heightData: [], distData: [] };
        setTrail([]); setHeightData([]); setDistData([]); setTime(0);
        setStats({ h: 0, d: 0, t: 0, v: 0 });
        setRunning(true);
      };

      const handleReset = () => {
        setRunning(false);
        cancelAnimationFrame(animRef.current);
        stateRef.current = { t: 0, trail: [], heightData: [], distData: [] };
        setTrail([]); setHeightData([]); setDistData([]); setTime(0);
        setStats({ h: 0, d: 0, t: 0, v: 0 });
      };

      return (
        <div className="flex flex-col gap-3">
          <canvas ref={canvasRef} className="w-full rounded-lg border border-slate-700" />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 bg-slate-800/50 rounded-lg p-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parameters</h3>
              <Slider label="Launch Angle" value={angle} min={0} max={90} step={1} unit="deg" onChange={setAngle} disabled={running} />
              <Slider label="Initial Velocity" value={velocity} min={1} max={50} step={0.5} unit="m/s" onChange={setVelocity} disabled={running} />
              <Slider label="Gravity" value={gravity} min={1} max={20} step={0.1} unit="m/s2" onChange={setGravity} disabled={running} />
              <div className="flex gap-2 mt-1">
                {!running ? (
                  <button onClick={handleStart} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 rounded-lg transition">
                    Launch
                  </button>
                ) : (
                  <button onClick={() => setRunning(false)} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold py-2 rounded-lg transition">
                    Pause
                  </button>
                )}
                <button onClick={handleReset} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-2 rounded-lg transition">
                  Reset
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Graph data={heightData.length > 0 ? heightData : [{ x: 0, y: 0 }]} title="Height vs Time" xLabel="t (s)" yLabel="h (m)" color="#22c55e" width={320} height={140} />
              <Graph data={distData.length > 0 ? distData : [{ x: 0, y: 0 }]} title="Distance vs Time" xLabel="t (s)" yLabel="d (m)" color="#3b82f6" width={320} height={140} />
            </div>
          </div>
        </div>
      );
    }

    /* ═══════════════════════════════════════════════════════
       MODE 2: PENDULUM
       ═══════════════════════════════════════════════════════ */
    function PendulumMode() {
      const canvasRef = useRef(null);
      const animRef = useRef(null);
      const [length, setLength] = useState(2.0);
      const [initAngle, setInitAngle] = useState(30);
      const [gravity, setGravity] = useState(9.8);
      const [damping, setDamping] = useState(0.02);
      const [running, setRunning] = useState(false);
      const [angleData, setAngleData] = useState([]);
      const stateRef = useRef({ theta: 0, omega: 0, t: 0, data: [] });

      const pivotX = 280;
      const pivotY = 40;
      const pixPerMeter = 80;

      const drawPendulum = useCallback((ctx, W, H, st) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);

        // Ceiling
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, pivotY - 4, W, 4);

        // Pivot
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#64748b';
        ctx.fill();

        const bobX = pivotX + Math.sin(st.theta) * length * pixPerMeter;
        const bobY = pivotY + Math.cos(st.theta) * length * pixPerMeter;

        // String
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        // Velocity vector (tangential)
        const vMag = st.omega * length * pixPerMeter * 0.3;
        const tangX = Math.cos(st.theta);
        const tangY = -Math.sin(st.theta);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bobX, bobY);
        ctx.lineTo(bobX + tangX * vMag, bobY + tangY * vMag);
        ctx.stroke();
        if (Math.abs(vMag) > 3) {
          const aAng = Math.atan2(tangY * vMag, tangX * vMag);
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.moveTo(bobX + tangX * vMag, bobY + tangY * vMag);
          ctx.lineTo(bobX + tangX * vMag - 6 * Math.cos(aAng - 0.4), bobY + tangY * vMag - 6 * Math.sin(aAng - 0.4));
          ctx.lineTo(bobX + tangX * vMag - 6 * Math.cos(aAng + 0.4), bobY + tangY * vMag - 6 * Math.sin(aAng + 0.4));
          ctx.fill();
        }

        // Acceleration vector (centripetal + tangential combined as gravity component)
        const alpha = -(gravity / length) * Math.sin(st.theta) - damping * st.omega;
        const aTangMag = alpha * length * pixPerMeter * 0.15;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bobX, bobY);
        ctx.lineTo(bobX + tangX * aTangMag, bobY + tangY * aTangMag);
        ctx.stroke();

        // Bob
        ctx.beginPath();
        ctx.arc(bobX, bobY, 16, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, 16);
        grad.addColorStop(0, '#60a5fa');
        grad.addColorStop(1, '#1d4ed8');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Angle arc
        if (Math.abs(st.theta) > 0.02) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          const startA = Math.PI / 2 - Math.max(st.theta, 0);
          const endA = Math.PI / 2 - Math.min(st.theta, 0);
          ctx.arc(pivotX, pivotY, 30, startA, endA);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#fbbf24';
          ctx.font = '11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(radToDeg(st.theta).toFixed(1) + '\u00B0', pivotX, pivotY + 50);
        }

        // Stats
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(8, 8, 160, 76);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(8, 8, 160, 76);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        const period = 2 * Math.PI * Math.sqrt(length / gravity);
        ctx.fillText('Angle: ' + radToDeg(st.theta).toFixed(1) + '\u00B0', 16, 28);
        ctx.fillText('Angular vel: ' + st.omega.toFixed(2) + ' rad/s', 16, 42);
        ctx.fillText('Period: ' + period.toFixed(2) + ' s', 16, 56);
        ctx.fillText('Time: ' + st.t.toFixed(2) + ' s', 16, 70);

        // Legend
        ctx.fillStyle = '#22c55e'; ctx.fillRect(W - 130, H - 40, 8, 8);
        ctx.fillStyle = '#94a3b8'; ctx.font = '9px system-ui';
        ctx.textAlign = 'left'; ctx.fillText('Velocity', W - 118, H - 33);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(W - 130, H - 26, 8, 8);
        ctx.fillStyle = '#94a3b8'; ctx.fillText('Acceleration', W - 118, H - 19);
      }, [length, gravity, damping]);

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 380;
        if (!running) {
          stateRef.current.theta = degToRad(initAngle);
          stateRef.current.omega = 0;
        }
        drawPendulum(ctx, canvas.width, canvas.height, stateRef.current);
      }, [length, initAngle, gravity, damping, drawPendulum, running]);

      useEffect(() => {
        if (!running) return;
        let lastTime = performance.now();
        const dt = 1 / 60;

        const animate = (now) => {
          const st = stateRef.current;
          // RK4 integration for accurate pendulum physics
          const f = (theta, omega) => {
            const alpha = -(gravity / length) * Math.sin(theta) - damping * omega;
            return { dTheta: omega, dOmega: alpha };
          };

          const k1 = f(st.theta, st.omega);
          const k2 = f(st.theta + dt / 2 * k1.dTheta, st.omega + dt / 2 * k1.dOmega);
          const k3 = f(st.theta + dt / 2 * k2.dTheta, st.omega + dt / 2 * k2.dOmega);
          const k4 = f(st.theta + dt * k3.dTheta, st.omega + dt * k3.dOmega);

          st.theta += (dt / 6) * (k1.dTheta + 2 * k2.dTheta + 2 * k3.dTheta + k4.dTheta);
          st.omega += (dt / 6) * (k1.dOmega + 2 * k2.dOmega + 2 * k3.dOmega + k4.dOmega);
          st.t += dt;

          // Sample data at reasonable intervals
          if (st.data.length === 0 || st.t - st.data[st.data.length - 1].x > 0.03) {
            st.data.push({ x: st.t, y: radToDeg(st.theta) });
            setAngleData([...st.data]);
          }

          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            drawPendulum(ctx, canvas.width, canvas.height, st);
          }

          animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
      }, [running, length, gravity, damping, drawPendulum]);

      const handleStart = () => {
        if (!running) {
          stateRef.current = { theta: degToRad(initAngle), omega: 0, t: 0, data: [] };
          setAngleData([]);
        }
        setRunning(true);
      };

      const handleReset = () => {
        setRunning(false);
        cancelAnimationFrame(animRef.current);
        stateRef.current = { theta: degToRad(initAngle), omega: 0, t: 0, data: [] };
        setAngleData([]);
      };

      return (
        <div className="flex flex-col gap-3">
          <canvas ref={canvasRef} className="w-full rounded-lg border border-slate-700" />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 bg-slate-800/50 rounded-lg p-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parameters</h3>
              <Slider label="String Length" value={length} min={0.5} max={5} step={0.1} unit="m" onChange={setLength} disabled={running} />
              <Slider label="Initial Angle" value={initAngle} min={5} max={90} step={1} unit="deg" onChange={setInitAngle} disabled={running} />
              <Slider label="Gravity" value={gravity} min={1} max={20} step={0.1} unit="m/s2" onChange={setGravity} disabled={running} />
              <Slider label="Damping" value={damping} min={0} max={0.5} step={0.01} unit="" onChange={setDamping} disabled={running} />
              <div className="flex gap-2 mt-1">
                {!running ? (
                  <button onClick={handleStart} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 rounded-lg transition">
                    Release
                  </button>
                ) : (
                  <button onClick={() => setRunning(false)} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold py-2 rounded-lg transition">
                    Pause
                  </button>
                )}
                <button onClick={handleReset} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-2 rounded-lg transition">
                  Reset
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Graph data={angleData.length > 0 ? angleData : [{ x: 0, y: initAngle }]} title="Angle vs Time (decaying sinusoid)" xLabel="t (s)" yLabel="angle (deg)" color="#a78bfa" width={320} height={290} />
            </div>
          </div>
        </div>
      );
    }

    /* ═══════════════════════════════════════════════════════
       MODE 3: SPRING-MASS SYSTEM
       ═══════════════════════════════════════════════════════ */
    function SpringMassMode() {
      const canvasRef = useRef(null);
      const animRef = useRef(null);
      const [springK, setSpringK] = useState(10);
      const [mass, setMass] = useState(2);
      const [initDisp, setInitDisp] = useState(3);
      const [damping, setDamping] = useState(0.3);
      const [running, setRunning] = useState(false);
      const [dispData, setDispData] = useState([]);
      const stateRef = useRef({ x: 0, v: 0, t: 0, data: [] });

      const wallX = 40;
      const eqX = 280; // equilibrium position on screen
      const blockW = 50;
      const blockH = 40;
      const railY = 200;
      const pixPerMeter = 50;

      const drawSpring = useCallback((ctx, startX, endX, y, coils) => {
        const numCoils = coils || 12;
        const springLen = endX - startX;
        const coilW = 12;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        const segLen = springLen / (numCoils * 2 + 2);
        let cx = startX + segLen;
        ctx.lineTo(cx, y);
        for (let i = 0; i < numCoils; i++) {
          ctx.lineTo(cx + segLen, y - coilW);
          cx += segLen;
          ctx.lineTo(cx + segLen, y + coilW);
          cx += segLen;
        }
        ctx.lineTo(cx + segLen, y);
        ctx.stroke();
      }, []);

      const drawScene = useCallback((ctx, W, H, st) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);

        // Floor
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, railY + blockH / 2 + 2, W, H - railY - blockH / 2);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, railY + blockH / 2 + 2);
        ctx.lineTo(W, railY + blockH / 2 + 2);
        ctx.stroke();

        // Wall
        ctx.fillStyle = '#475569';
        ctx.fillRect(wallX - 10, railY - 60, 10, 120 + blockH);
        // Hatching
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
          const yy = railY - 55 + i * 18;
          ctx.beginPath();
          ctx.moveTo(wallX - 10, yy);
          ctx.lineTo(wallX - 2, yy + 12);
          ctx.stroke();
        }

        // Equilibrium marker
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.beginPath();
        ctx.moveTo(eqX, railY - 50);
        ctx.lineTo(eqX, railY + blockH / 2 + 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fbbf24';
        ctx.font = '9px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('x = 0', eqX, railY - 55);

        // Displacement scale
        ctx.fillStyle = '#334155';
        ctx.font = '9px system-ui';
        for (let d = -4; d <= 6; d += 2) {
          if (d === 0) continue;
          const px = eqX + d * pixPerMeter;
          if (px < wallX + 20 || px > W - 10) continue;
          ctx.beginPath();
          ctx.moveTo(px, railY + blockH / 2 + 2);
          ctx.lineTo(px, railY + blockH / 2 + 8);
          ctx.strokeStyle = '#334155';
          ctx.stroke();
          ctx.textAlign = 'center';
          ctx.fillText(d + 'm', px, railY + blockH / 2 + 18);
        }

        const blockX = eqX + st.x * pixPerMeter;

        // Spring
        drawSpring(ctx, wallX, blockX - blockW / 2, railY, 14);

        // Spring force arrow
        const springForce = -springK * st.x;
        const fScale = pixPerMeter * 0.15;
        const fPx = springForce * fScale;
        if (Math.abs(fPx) > 3) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(blockX, railY - blockH / 2 - 15);
          ctx.lineTo(blockX + fPx, railY - blockH / 2 - 15);
          ctx.stroke();
          const aDir = fPx > 0 ? 0 : Math.PI;
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.moveTo(blockX + fPx, railY - blockH / 2 - 15);
          ctx.lineTo(blockX + fPx - 8 * Math.cos(aDir - 0.4), railY - blockH / 2 - 15 - 8 * Math.sin(aDir - 0.4));
          ctx.lineTo(blockX + fPx - 8 * Math.cos(aDir + 0.4), railY - blockH / 2 - 15 + 8 * Math.sin(aDir + 0.4));
          ctx.fill();
          ctx.fillStyle = '#3b82f6';
          ctx.font = '9px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('F_spring', blockX + fPx / 2, railY - blockH / 2 - 22);
        }

        // Damping force arrow
        const dampForce = -damping * st.v;
        const dPx = dampForce * fScale;
        if (Math.abs(dPx) > 3) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(blockX, railY + blockH / 2 + 25);
          ctx.lineTo(blockX + dPx, railY + blockH / 2 + 25);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#ef4444';
          ctx.font = '9px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('F_damp', blockX + dPx / 2, railY + blockH / 2 + 40);
        }

        // Block
        const grad = ctx.createLinearGradient(blockX - blockW / 2, railY - blockH / 2, blockX + blockW / 2, railY + blockH / 2);
        grad.addColorStop(0, '#4ade80');
        grad.addColorStop(1, '#16a34a');
        ctx.fillStyle = grad;
        ctx.fillRect(blockX - blockW / 2, railY - blockH / 2, blockW, blockH);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(blockX - blockW / 2, railY - blockH / 2, blockW, blockH);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(mass + ' kg', blockX, railY + 4);

        // Stats overlay
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(W - 180, 8, 172, 100);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(W - 180, 8, 172, 100);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        const omega = Math.sqrt(springK / mass);
        const period = 2 * Math.PI / omega;
        const energy = 0.5 * springK * st.x * st.x + 0.5 * mass * st.v * st.v;
        ctx.fillText('Disp: ' + st.x.toFixed(2) + ' m', W - 172, 28);
        ctx.fillText('Velocity: ' + st.v.toFixed(2) + ' m/s', W - 172, 42);
        ctx.fillText('Period: ' + period.toFixed(2) + ' s', W - 172, 56);
        ctx.fillText('Energy: ' + energy.toFixed(2) + ' J', W - 172, 70);
        ctx.fillText('Time: ' + st.t.toFixed(2) + ' s', W - 172, 84);
        ctx.fillText('\\u03C9 = ' + omega.toFixed(2) + ' rad/s', W - 172, 98);

        // Legend
        ctx.fillStyle = '#3b82f6'; ctx.fillRect(8, H - 40, 8, 8);
        ctx.fillStyle = '#94a3b8'; ctx.font = '9px system-ui';
        ctx.textAlign = 'left'; ctx.fillText('Spring Force', 20, H - 33);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(8, H - 26, 8, 8);
        ctx.fillStyle = '#94a3b8'; ctx.fillText('Damping Force', 20, H - 19);
      }, [springK, mass, damping, drawSpring]);

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 380;
        if (!running) {
          stateRef.current.x = initDisp;
          stateRef.current.v = 0;
        }
        drawScene(ctx, canvas.width, canvas.height, stateRef.current);
      }, [springK, mass, initDisp, damping, drawScene, running]);

      useEffect(() => {
        if (!running) return;
        const dt = 1 / 60;

        const animate = () => {
          const st = stateRef.current;

          // RK4 integration
          const f = (x, v) => {
            const a = (-springK * x - damping * v) / mass;
            return { dx: v, dv: a };
          };
          const k1 = f(st.x, st.v);
          const k2 = f(st.x + dt / 2 * k1.dx, st.v + dt / 2 * k1.dv);
          const k3 = f(st.x + dt / 2 * k2.dx, st.v + dt / 2 * k2.dv);
          const k4 = f(st.x + dt * k3.dx, st.v + dt * k3.dv);

          st.x += (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
          st.v += (dt / 6) * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv);
          st.t += dt;

          if (st.data.length === 0 || st.t - st.data[st.data.length - 1].x > 0.03) {
            st.data.push({ x: st.t, y: st.x });
            setDispData([...st.data]);
          }

          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            drawScene(ctx, canvas.width, canvas.height, st);
          }

          animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
      }, [running, springK, mass, damping, drawScene]);

      const handleStart = () => {
        stateRef.current = { x: initDisp, v: 0, t: 0, data: [] };
        setDispData([]);
        setRunning(true);
      };

      const handleReset = () => {
        setRunning(false);
        cancelAnimationFrame(animRef.current);
        stateRef.current = { x: initDisp, v: 0, t: 0, data: [] };
        setDispData([]);
      };

      return (
        <div className="flex flex-col gap-3">
          <canvas ref={canvasRef} className="w-full rounded-lg border border-slate-700" />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 bg-slate-800/50 rounded-lg p-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parameters</h3>
              <Slider label="Spring Constant (k)" value={springK} min={1} max={50} step={0.5} unit="N/m" onChange={setSpringK} disabled={running} />
              <Slider label="Mass" value={mass} min={0.5} max={10} step={0.1} unit="kg" onChange={setMass} disabled={running} />
              <Slider label="Initial Displacement" value={initDisp} min={0.5} max={5} step={0.1} unit="m" onChange={setInitDisp} disabled={running} />
              <Slider label="Damping Coefficient" value={damping} min={0} max={5} step={0.1} unit="Ns/m" onChange={setDamping} disabled={running} />
              <div className="flex gap-2 mt-1">
                {!running ? (
                  <button onClick={handleStart} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 rounded-lg transition">
                    Release
                  </button>
                ) : (
                  <button onClick={() => setRunning(false)} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold py-2 rounded-lg transition">
                    Pause
                  </button>
                )}
                <button onClick={handleReset} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-2 rounded-lg transition">
                  Reset
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Graph data={dispData.length > 0 ? dispData : [{ x: 0, y: initDisp }]} title="Displacement vs Time" xLabel="t (s)" yLabel="x (m)" color="#4ade80" width={320} height={290} />
            </div>
          </div>
        </div>
      );
    }

    /* ═══════════════════════════════════════════════════════
       MAIN APP — Tab Selector + Mode Rendering
       ═══════════════════════════════════════════════════════ */
    function App() {
      const [mode, setMode] = useState('projectile');

      const tabs = [
        { key: 'projectile', label: 'Projectile Motion', icon: '🎯' },
        { key: 'pendulum', label: 'Pendulum', icon: '🔔' },
        { key: 'spring', label: 'Spring-Mass', icon: '🔩' },
      ];

      return (
        <div className="min-h-screen bg-slate-950 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="text-2xl font-extrabold text-white">Physics Sandbox</h1>
              <p className="text-sm text-slate-400 mt-1">Interactive simulations with real-time visualization</p>
            </div>

            {/* Tab Selector */}
            <div className="flex gap-1 mb-4 bg-slate-900 p-1 rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setMode(tab.key)}
                  className={\`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all \${
                    mode === tab.key ? 'tab-active shadow-lg' : 'tab-inactive'
                  }\`}
                >
                  <span className="mr-1.5">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Active Mode */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
              {mode === 'projectile' && <ProjectileMode />}
              {mode === 'pendulum' && <PendulumMode />}
              {mode === 'spring' && <SpringMassMode />}
            </div>

            {/* Physics Info Footer */}
            <div className="mt-3 text-center">
              <p className="text-xs text-slate-600">
                {mode === 'projectile' && 'x = v\\u2080 cos(\\u03B8) \\u00B7 t \\u2003 y = v\\u2080 sin(\\u03B8) \\u00B7 t - \\u00BD g t\\u00B2'}
                {mode === 'pendulum' && '\\u03B1 = -(g/L) sin(\\u03B8) - b\\u03C9 \\u2003 RK4 integration for nonlinear dynamics'}
                {mode === 'spring' && 'F = -kx - bv \\u2003 m a = -kx - b dx/dt \\u2003 RK4 integration'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  <\/script>
</body>
</html>`;
