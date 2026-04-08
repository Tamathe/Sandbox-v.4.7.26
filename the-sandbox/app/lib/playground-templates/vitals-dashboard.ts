import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'vitals-dashboard',
  title: 'Patient Vitals Dashboard Simulator',
  description: 'Realistic patient monitor with animated ECG, SpO2, respiration, and blood pressure waveforms. Simulate clinical scenarios.',
  category: 'simulation',
  thumbnailEmoji: '🫀',
  editorScrollTarget: '// 🫀 VITALS SIMULATION ENGINE',
  warmStartConfig: {
    previewRatio: 0.7,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '🫀 A realistic patient monitor. Select a clinical scenario and watch the vitals respond in real-time.',
    ctaLabel: '▶ Start Monitor',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Patient Vitals Dashboard Simulator</title>
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
    body { margin: 0; background: #000; color: #fff; font-family: 'Courier New', monospace; overflow: hidden; }
    @keyframes alarm-flash { 0%,100% { border-color: #ff0000; } 50% { border-color: #330000; } }
    .alarm-active { animation: alarm-flash 0.5s ease-in-out infinite; border-width: 3px; }
    @keyframes pulse-num { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
    .pulse-num { animation: pulse-num 1s ease-in-out infinite; }
    canvas { display: block; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    ::-webkit-scrollbar-track { background: #111; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback, useMemo } = React;

    // ============================================================
    // 🫀 VITALS SIMULATION ENGINE
    // ============================================================

    const SCENARIOS = {
      normal: {
        name: 'Normal Stable Patient',
        hr: { target: 72, variance: 3 },
        spo2: { target: 98, variance: 1 },
        rr: { target: 14, variance: 1 },
        systolic: { target: 120, variance: 5 },
        diastolic: { target: 80, variance: 3 },
        temp: { target: 98.6, variance: 0.2 },
        etco2: { target: 38, variance: 2 },
        ecgType: 'normal',
        transitionSpeed: 0.03,
      },
      septic: {
        name: 'Septic Shock',
        hr: { target: 128, variance: 8 },
        spo2: { target: 89, variance: 3 },
        rr: { target: 28, variance: 3 },
        systolic: { target: 78, variance: 10 },
        diastolic: { target: 45, variance: 5 },
        temp: { target: 103.2, variance: 0.5 },
        etco2: { target: 22, variance: 3 },
        ecgType: 'sinus_tachy',
        transitionSpeed: 0.015,
      },
      cardiac_arrest: {
        name: 'Cardiac Arrest',
        hr: { target: 0, variance: 0 },
        spo2: { target: 0, variance: 0 },
        rr: { target: 0, variance: 0 },
        systolic: { target: 0, variance: 0 },
        diastolic: { target: 0, variance: 0 },
        temp: { target: 96.8, variance: 0.1 },
        etco2: { target: 8, variance: 2 },
        ecgType: 'flatline',
        transitionSpeed: 0.06,
      },
      respiratory_failure: {
        name: 'Respiratory Failure',
        hr: { target: 115, variance: 6 },
        spo2: { target: 78, variance: 4 },
        rr: { target: 6, variance: 2 },
        systolic: { target: 105, variance: 8 },
        diastolic: { target: 68, variance: 5 },
        temp: { target: 99.0, variance: 0.3 },
        etco2: { target: 55, variance: 4 },
        ecgType: 'sinus_tachy',
        transitionSpeed: 0.02,
      },
      anaphylaxis: {
        name: 'Anaphylaxis',
        hr: { target: 140, variance: 10 },
        spo2: { target: 84, variance: 5 },
        rr: { target: 32, variance: 4 },
        systolic: { target: 65, variance: 12 },
        diastolic: { target: 35, variance: 8 },
        temp: { target: 99.5, variance: 0.3 },
        etco2: { target: 20, variance: 3 },
        ecgType: 'sinus_tachy',
        transitionSpeed: 0.025,
      },
      hemorrhagic: {
        name: 'Hemorrhagic Shock',
        hr: { target: 135, variance: 8 },
        spo2: { target: 91, variance: 3 },
        rr: { target: 26, variance: 3 },
        systolic: { target: 70, variance: 10 },
        diastolic: { target: 40, variance: 6 },
        temp: { target: 97.0, variance: 0.3 },
        etco2: { target: 25, variance: 3 },
        ecgType: 'sinus_tachy',
        transitionSpeed: 0.018,
      },
    };

    const NORMAL_RANGES = {
      hr: { low: 60, high: 100 },
      spo2: { low: 94, high: 100 },
      rr: { low: 12, high: 20 },
      systolic: { low: 90, high: 140 },
      diastolic: { low: 60, high: 90 },
      temp: { low: 97.0, high: 99.5 },
      etco2: { low: 35, high: 45 },
    };

    const INTERVENTIONS = [
      { id: 'epi', label: 'Administer Epi', icon: '💉', effect: { hr: 15, systolic: 20, diastolic: 10, spo2: 3 } },
      { id: 'fluids', label: 'Start Fluids', icon: '💧', effect: { systolic: 15, diastolic: 8, hr: -5 } },
      { id: 'intubate', label: 'Intubate', icon: '🫁', effect: { spo2: 12, rr: 4, etco2: -8 } },
      { id: 'defib', label: 'Defibrillate', icon: '⚡', effect: { hr: 72, spo2: 60, systolic: 80, diastolic: 50 } },
    ];

    // ============================================================
    // 🫀 ECG WAVEFORM GENERATOR
    // ============================================================

    function generateECGPoint(phase, ecgType) {
      if (ecgType === 'flatline') return 0;

      const t = phase % 1;

      if (ecgType === 'vfib') {
        return (Math.sin(t * 40) * 0.3 + Math.sin(t * 67) * 0.2 + Math.random() * 0.15) * 0.6;
      }

      // Normal PQRST morphology
      let y = 0;
      // P wave (atrial depolarization)
      if (t > 0.0 && t < 0.08) {
        const pt = (t - 0.0) / 0.08;
        y = 0.12 * Math.sin(pt * Math.PI);
      }
      // PR segment
      else if (t >= 0.08 && t < 0.12) {
        y = 0;
      }
      // Q wave
      else if (t >= 0.12 && t < 0.14) {
        const qt = (t - 0.12) / 0.02;
        y = -0.08 * Math.sin(qt * Math.PI);
      }
      // R wave (ventricular depolarization)
      else if (t >= 0.14 && t < 0.18) {
        const rt = (t - 0.14) / 0.04;
        y = 0.85 * Math.sin(rt * Math.PI);
      }
      // S wave
      else if (t >= 0.18 && t < 0.22) {
        const st = (t - 0.18) / 0.04;
        y = -0.2 * Math.sin(st * Math.PI);
      }
      // ST segment
      else if (t >= 0.22 && t < 0.32) {
        y = 0.02;
      }
      // T wave (ventricular repolarization)
      else if (t >= 0.32 && t < 0.46) {
        const tt = (t - 0.32) / 0.14;
        y = 0.2 * Math.sin(tt * Math.PI);
      }
      // Baseline
      else {
        y = 0;
      }

      // Add noise for realism
      y += (Math.random() - 0.5) * 0.015;

      if (ecgType === 'sinus_tachy') {
        // Compress the waveform slightly, keep amplitude
        return y * 0.9;
      }

      return y;
    }

    // ============================================================
    // 🫀 SPO2 PLETH WAVEFORM GENERATOR
    // ============================================================

    function generatePlethPoint(phase, spo2Value) {
      if (spo2Value <= 0) return 0;
      const t = phase % 1;
      let y = 0;
      // Systolic upstroke
      if (t < 0.15) {
        y = Math.sin((t / 0.15) * Math.PI * 0.5);
      }
      // Dicrotic notch
      else if (t < 0.25) {
        const dt = (t - 0.15) / 0.10;
        y = 1.0 - dt * 0.4;
      }
      else if (t < 0.30) {
        const dt = (t - 0.25) / 0.05;
        y = 0.6 + dt * 0.15;
      }
      // Diastolic runoff
      else {
        const dt = (t - 0.30) / 0.70;
        y = 0.75 * Math.exp(-dt * 3);
      }

      y += (Math.random() - 0.5) * 0.02;
      const amplitude = Math.max(0.2, spo2Value / 100);
      return y * amplitude;
    }

    // ============================================================
    // 🫀 RESPIRATION WAVEFORM GENERATOR
    // ============================================================

    function generateRespPoint(phase, rrValue) {
      if (rrValue <= 0) return 0;
      const t = phase % 1;
      // Inspiration is shorter than expiration (I:E ~ 1:2)
      let y;
      if (t < 0.35) {
        y = Math.sin((t / 0.35) * Math.PI * 0.5);
      } else {
        const et = (t - 0.35) / 0.65;
        y = Math.cos(et * Math.PI * 0.5);
      }
      y += (Math.random() - 0.5) * 0.03;
      return y * 0.8;
    }

    // ============================================================
    // 🫀 WAVEFORM CANVAS COMPONENT
    // ============================================================

    function WaveformCanvas({ dataRef, color, gridColor, height, label, value, unit, valueColor }) {
      const canvasRef = useRef(null);
      const animRef = useRef(null);
      const bufferRef = useRef([]);
      const writeIndexRef = useRef(0);
      const WIDTH = 600;

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = WIDTH;
        const h = height;
        canvas.width = w;
        canvas.height = h;

        if (bufferRef.current.length === 0) {
          bufferRef.current = new Array(w).fill(0);
        }

        let lastTime = 0;
        const pixelsPerSecond = 100;

        function draw(timestamp) {
          if (!lastTime) lastTime = timestamp;
          const dt = (timestamp - lastTime) / 1000;
          lastTime = timestamp;

          const pixelsToWrite = Math.max(1, Math.round(dt * pixelsPerSecond));

          for (let i = 0; i < pixelsToWrite; i++) {
            const val = dataRef.current || 0;
            bufferRef.current[writeIndexRef.current % w] = val;
            writeIndexRef.current++;
          }

          // Clear
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, w, h);

          // Grid lines
          ctx.strokeStyle = gridColor || '#0a1a0a';
          ctx.lineWidth = 0.5;
          const gridSpacingX = 30;
          const gridSpacingY = 20;
          for (let x = 0; x < w; x += gridSpacingX) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let y = 0; y < h; y += gridSpacingY) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Waveform
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.shadowColor = color;
          ctx.shadowBlur = 4;
          ctx.beginPath();

          const writePos = writeIndexRef.current % w;
          for (let i = 0; i < w; i++) {
            const bufIdx = (writePos + i) % w;
            const val = bufferRef.current[bufIdx] || 0;
            const yPos = h / 2 - val * (h * 0.4);
            if (i === 0) ctx.moveTo(i, yPos);
            else ctx.lineTo(i, yPos);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Sweep line
          const sweepX = writePos;
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sweepX, 0);
          ctx.lineTo(sweepX, h);
          ctx.stroke();

          // Erase ahead of sweep
          ctx.fillStyle = '#000000';
          ctx.fillRect(sweepX + 1, 0, 30, h);

          animRef.current = requestAnimationFrame(draw);
        }

        animRef.current = requestAnimationFrame(draw);
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
      }, [color, gridColor, height]);

      return (
        <div style={{ position: 'relative', background: '#000', borderRadius: 4, overflow: 'hidden', border: '1px solid #222' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: height }} />
          <div style={{
            position: 'absolute', top: 4, left: 8,
            fontSize: 11, color: color, opacity: 0.8,
            fontFamily: "'Courier New', monospace", fontWeight: 'bold'
          }}>
            {label}
          </div>
          <div style={{
            position: 'absolute', top: 2, right: 10,
            fontSize: 28, color: valueColor || color,
            fontFamily: "'Courier New', monospace", fontWeight: 'bold',
            textShadow: '0 0 10px ' + (valueColor || color),
          }}>
            {value} <span style={{ fontSize: 12, opacity: 0.7 }}>{unit}</span>
          </div>
        </div>
      );
    }

    // ============================================================
    // 🫀 MAIN MONITOR APP
    // ============================================================

    function PatientMonitor() {
      const [scenario, setScenario] = useState('normal');
      const [running, setRunning] = useState(true);
      const [alarms, setAlarms] = useState([]);
      const [eventLog, setEventLog] = useState([]);
      const [elapsedTime, setElapsedTime] = useState(0);

      // Current vitals (smoothly interpolating toward scenario targets)
      const vitalsRef = useRef({
        hr: 72, spo2: 98, rr: 14, systolic: 120, diastolic: 80, temp: 98.6, etco2: 38,
      });
      const [displayVitals, setDisplayVitals] = useState({ ...vitalsRef.current });

      // Intervention offsets
      const interventionOffset = useRef({ hr: 0, spo2: 0, rr: 0, systolic: 0, diastolic: 0, etco2: 0 });

      // Waveform data refs
      const ecgDataRef = useRef(0);
      const plethDataRef = useRef(0);
      const respDataRef = useRef(0);

      // Phase tracking for waveform generation
      const ecgPhaseRef = useRef(0);
      const plethPhaseRef = useRef(0);
      const respPhaseRef = useRef(0);

      // Audio context for beep
      const audioCtxRef = useRef(null);
      const lastBeepRef = useRef(0);
      const [audioEnabled, setAudioEnabled] = useState(false);

      function playBeep(freq, dur) {
        if (!audioEnabled) return;
        try {
          if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
          const ctx = audioCtxRef.current;
          const now = ctx.currentTime;
          if (now - lastBeepRef.current < 0.3) return;
          lastBeepRef.current = now;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + dur);
        } catch (e) {}
      }

      // Main simulation loop
      useEffect(() => {
        if (!running) return;
        let frameId;
        let lastTs = performance.now();

        function tick(ts) {
          const dt = (ts - lastTs) / 1000;
          lastTs = ts;

          const sc = SCENARIOS[scenario];
          const v = vitalsRef.current;
          const off = interventionOffset.current;
          const speed = sc.transitionSpeed;

          // Smoothly interpolate vitals toward targets + offsets
          v.hr += ((sc.hr.target + off.hr) - v.hr) * speed;
          v.spo2 += ((sc.spo2.target + off.spo2) - v.spo2) * speed;
          v.rr += ((sc.rr.target + off.rr) - v.rr) * speed;
          v.systolic += ((sc.systolic.target + off.systolic) - v.systolic) * speed;
          v.diastolic += ((sc.diastolic.target + off.diastolic) - v.diastolic) * speed;
          v.temp += ((sc.temp.target) - v.temp) * speed;
          v.etco2 += ((sc.etco2.target + (off.etco2 || 0)) - v.etco2) * speed;

          // Add variance
          const display = {
            hr: Math.max(0, Math.round(v.hr + (Math.random() - 0.5) * sc.hr.variance * 2)),
            spo2: Math.min(100, Math.max(0, Math.round(v.spo2 + (Math.random() - 0.5) * sc.spo2.variance * 2))),
            rr: Math.max(0, Math.round(v.rr + (Math.random() - 0.5) * sc.rr.variance * 2)),
            systolic: Math.max(0, Math.round(v.systolic + (Math.random() - 0.5) * sc.systolic.variance * 2)),
            diastolic: Math.max(0, Math.round(v.diastolic + (Math.random() - 0.5) * sc.diastolic.variance * 2)),
            temp: Math.round((v.temp + (Math.random() - 0.5) * sc.temp.variance * 2) * 10) / 10,
            etco2: Math.max(0, Math.round(v.etco2 + (Math.random() - 0.5) * sc.etco2.variance * 2)),
          };

          // Decay intervention offsets
          for (const k of Object.keys(off)) {
            off[k] *= 0.998;
            if (Math.abs(off[k]) < 0.1) off[k] = 0;
          }

          // Generate waveform data points
          const hrBps = Math.max(0.1, display.hr) / 60;
          ecgPhaseRef.current += dt * hrBps;
          plethPhaseRef.current += dt * hrBps;
          respPhaseRef.current += dt * (Math.max(0.1, display.rr) / 60);

          ecgDataRef.current = generateECGPoint(ecgPhaseRef.current, sc.ecgType);
          plethDataRef.current = generatePlethPoint(plethPhaseRef.current, display.spo2);
          respDataRef.current = generateRespPoint(respPhaseRef.current, display.rr);

          // QRS beep
          const ecgT = ecgPhaseRef.current % 1;
          if (ecgT > 0.14 && ecgT < 0.18 && display.hr > 0) {
            playBeep(880, 0.08);
          }

          // Check alarms every 500ms (throttled by state updates)
          setDisplayVitals(display);

          frameId = requestAnimationFrame(tick);
        }

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
      }, [running, scenario, audioEnabled]);

      // Alarm checker
      useEffect(() => {
        const interval = setInterval(() => {
          const v = displayVitals;
          const activeAlarms = [];
          const R = NORMAL_RANGES;
          if (v.hr > 0 && (v.hr < R.hr.low || v.hr > R.hr.high)) activeAlarms.push('HR');
          if (v.spo2 > 0 && v.spo2 < R.spo2.low) activeAlarms.push('SpO2');
          if (v.rr > 0 && (v.rr < R.rr.low || v.rr > R.rr.high)) activeAlarms.push('RR');
          if (v.systolic > 0 && (v.systolic < R.systolic.low || v.systolic > R.systolic.high)) activeAlarms.push('BP');
          if (v.etco2 > 0 && (v.etco2 < R.etco2.low || v.etco2 > R.etco2.high)) activeAlarms.push('ETCO2');
          if (v.hr === 0 && v.spo2 === 0) activeAlarms.push('ASYSTOLE');
          setAlarms(activeAlarms);
        }, 500);
        return () => clearInterval(interval);
      }, [displayVitals]);

      // Elapsed timer
      useEffect(() => {
        if (!running) return;
        const interval = setInterval(() => setElapsedTime(t => t + 1), 1000);
        return () => clearInterval(interval);
      }, [running]);

      function handleScenarioChange(newScenario) {
        setScenario(newScenario);
        interventionOffset.current = { hr: 0, spo2: 0, rr: 0, systolic: 0, diastolic: 0, etco2: 0 };
        const now = formatTime(elapsedTime);
        setEventLog(prev => [...prev.slice(-19), { time: now, msg: 'Scenario: ' + SCENARIOS[newScenario].name }]);
      }

      function handleIntervention(intervention) {
        const off = interventionOffset.current;
        const eff = intervention.effect;
        // For defib in cardiac arrest, set vitals directly toward normal
        if (intervention.id === 'defib' && scenario === 'cardiac_arrest') {
          vitalsRef.current = { hr: 10, spo2: 40, rr: 4, systolic: 50, diastolic: 30, temp: 96.8, etco2: 15 };
          off.hr = 62; off.spo2 = 55; off.systolic = 70; off.diastolic = 50; off.rr = 10; off.etco2 = 20;
        } else {
          for (const k of Object.keys(eff)) {
            if (off[k] !== undefined) off[k] += eff[k];
          }
        }
        const now = formatTime(elapsedTime);
        setEventLog(prev => [...prev.slice(-19), { time: now, msg: intervention.icon + ' ' + intervention.label }]);
        playBeep(660, 0.12);
      }

      function formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
      }

      const map = displayVitals.diastolic > 0
        ? Math.round(displayVitals.diastolic + (displayVitals.systolic - displayVitals.diastolic) / 3)
        : 0;

      const isAlarming = alarms.length > 0;

      return (
        <div style={{
          width: '100vw', height: '100vh', background: '#000',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: isAlarming ? '3px solid #ff0000' : '3px solid #111',
          boxSizing: 'border-box',
        }} className={isAlarming ? 'alarm-active' : ''}>

          {/* Header Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 12px', background: '#0a0a0a', borderBottom: '1px solid #222',
            minHeight: 36, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#00ff41', fontSize: 13, fontWeight: 'bold' }}>
                ■ PATIENT MONITOR
              </span>
              <span style={{ color: '#666', fontSize: 11 }}>
                ID: PT-2026-{String(Math.floor(Math.random() * 9000 + 1000))}
              </span>
              <span style={{ color: '#888', fontSize: 11 }}>
                ⏱ {formatTime(elapsedTime)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isAlarming && (
                <span style={{
                  color: '#ff0000', fontSize: 13, fontWeight: 'bold',
                  textShadow: '0 0 8px #ff0000',
                }} className="pulse-num">
                  ⚠ ALARM: {alarms.join(', ')}
                </span>
              )}
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                style={{
                  background: audioEnabled ? '#1a3a1a' : '#1a1a1a',
                  border: '1px solid ' + (audioEnabled ? '#00ff41' : '#444'),
                  color: audioEnabled ? '#00ff41' : '#666',
                  padding: '2px 8px', borderRadius: 3, fontSize: 11, cursor: 'pointer',
                }}
              >
                {audioEnabled ? '🔊 Audio On' : '🔇 Audio Off'}
              </button>
              <button
                onClick={() => setRunning(!running)}
                style={{
                  background: running ? '#1a1a1a' : '#1a3a1a',
                  border: '1px solid #444', color: '#ccc',
                  padding: '2px 8px', borderRadius: 3, fontSize: 11, cursor: 'pointer',
                }}
              >
                {running ? '⏸ Pause' : '▶ Resume'}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

            {/* Left: Waveforms */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: 4, overflow: 'hidden' }}>
              {/* ECG */}
              <WaveformCanvas
                dataRef={ecgDataRef}
                color="#00ff41"
                gridColor="#0a2a0a"
                height={120}
                label="II ECG"
                value={displayVitals.hr}
                unit="bpm"
                valueColor="#00ff41"
              />

              {/* SpO2 Pleth */}
              <WaveformCanvas
                dataRef={plethDataRef}
                color="#00d4ff"
                gridColor="#0a1a2a"
                height={90}
                label="SpO2 PLETH"
                value={displayVitals.spo2}
                unit="%"
                valueColor="#00d4ff"
              />

              {/* Respiration */}
              <WaveformCanvas
                dataRef={respDataRef}
                color="#ffbb00"
                gridColor="#1a1a0a"
                height={80}
                label="RESP"
                value={displayVitals.rr}
                unit="/min"
                valueColor="#ffbb00"
              />

              {/* BP / Trend line (static display) */}
              <div style={{
                background: '#000', border: '1px solid #222', borderRadius: 4,
                padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 16,
                minHeight: 50,
              }}>
                <span style={{ color: '#ff3333', fontSize: 11, fontWeight: 'bold' }}>NIBP</span>
                <span style={{
                  color: '#ff3333', fontSize: 32, fontWeight: 'bold',
                  fontFamily: "'Courier New', monospace",
                  textShadow: '0 0 8px rgba(255,50,50,0.5)',
                }}>
                  {displayVitals.systolic}/{displayVitals.diastolic}
                </span>
                <span style={{ color: '#ff8888', fontSize: 14 }}>
                  ({map})
                </span>
                <span style={{ color: '#ff8888', fontSize: 11 }}>mmHg</span>
              </div>
            </div>

            {/* Right: Numeric Panel + Controls */}
            <div style={{
              width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
              borderLeft: '1px solid #222', background: '#050505',
            }}>
              {/* Numeric Vitals */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, padding: 4 }}>
                <VitalBox
                  label="HR" value={displayVitals.hr} unit="bpm"
                  color="#00ff41" range={NORMAL_RANGES.hr}
                />
                <VitalBox
                  label="SpO2" value={displayVitals.spo2} unit="%"
                  color="#00d4ff" range={NORMAL_RANGES.spo2}
                />
                <VitalBox
                  label="RR" value={displayVitals.rr} unit="/min"
                  color="#ffbb00" range={NORMAL_RANGES.rr}
                />
                <VitalBox
                  label="BP" value={displayVitals.systolic + '/' + displayVitals.diastolic} unit="mmHg"
                  color="#ff3333" range={null}
                  subValue={'MAP ' + map}
                />
                <VitalBox
                  label="Temp" value={displayVitals.temp} unit="°F"
                  color="#ffffff" range={NORMAL_RANGES.temp}
                />
                <VitalBox
                  label="ETCO2" value={displayVitals.etco2} unit="mmHg"
                  color="#cc66ff" range={NORMAL_RANGES.etco2}
                />
              </div>

              {/* Scenario Selector */}
              <div style={{ padding: '6px 8px', borderTop: '1px solid #222' }}>
                <div style={{ color: '#888', fontSize: 10, marginBottom: 4, textTransform: 'uppercase' }}>
                  Clinical Scenario
                </div>
                <select
                  value={scenario}
                  onChange={(e) => handleScenarioChange(e.target.value)}
                  style={{
                    width: '100%', background: '#111', color: '#ccc',
                    border: '1px solid #333', borderRadius: 3,
                    padding: '4px 6px', fontSize: 11, cursor: 'pointer',
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {Object.entries(SCENARIOS).map(([k, v]) => (
                    <option key={k} value={k}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Intervention Buttons */}
              <div style={{ padding: '6px 8px', borderTop: '1px solid #222' }}>
                <div style={{ color: '#888', fontSize: 10, marginBottom: 4, textTransform: 'uppercase' }}>
                  Interventions
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {INTERVENTIONS.map((intv) => (
                    <button
                      key={intv.id}
                      onClick={() => handleIntervention(intv)}
                      style={{
                        background: '#1a1a1a', border: '1px solid #333',
                        color: '#ccc', padding: '5px 4px', borderRadius: 3,
                        fontSize: 10, cursor: 'pointer', textAlign: 'center',
                        fontFamily: "'Courier New', monospace",
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#2a2a2a';
                        e.target.style.borderColor = '#00ff41';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#1a1a1a';
                        e.target.style.borderColor = '#333';
                      }}
                    >
                      {intv.icon} {intv.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Log */}
              <div style={{
                padding: '6px 8px', borderTop: '1px solid #222',
                maxHeight: 130, overflow: 'auto',
              }}>
                <div style={{ color: '#888', fontSize: 10, marginBottom: 4, textTransform: 'uppercase' }}>
                  Event Log
                </div>
                <div style={{ fontSize: 10, color: '#aaa', lineHeight: 1.5 }}>
                  {eventLog.length === 0 ? (
                    <span style={{ color: '#555' }}>No events recorded</span>
                  ) : (
                    eventLog.map((e, i) => (
                      <div key={i}>
                        <span style={{ color: '#00ff41' }}>[{e.time}]</span> {e.msg}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ============================================================
    // 🫀 VITAL BOX COMPONENT
    // ============================================================

    function VitalBox({ label, value, unit, color, range, subValue }) {
      const numValue = typeof value === 'number' ? value : parseInt(value);
      const isOutOfRange = range && numValue > 0 && (numValue < range.low || numValue > range.high);

      return (
        <div style={{
          background: isOutOfRange ? 'rgba(255,0,0,0.08)' : '#0a0a0a',
          border: '1px solid ' + (isOutOfRange ? '#ff0000' : '#1a1a1a'),
          borderRadius: 3, padding: '4px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ color: color, fontSize: 10, fontWeight: 'bold', opacity: 0.8 }}>
              {label}
            </div>
            {subValue && (
              <div style={{ color: color, fontSize: 9, opacity: 0.6 }}>{subValue}</div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                color: isOutOfRange ? '#ff0000' : color,
                fontSize: 26, fontWeight: 'bold',
                fontFamily: "'Courier New', monospace",
                textShadow: '0 0 8px ' + (isOutOfRange ? 'rgba(255,0,0,0.6)' : color + '66'),
                lineHeight: 1,
              }}
              className={isOutOfRange ? 'pulse-num' : ''}
            >
              {value}
            </span>
            <span style={{ color: '#666', fontSize: 10, marginLeft: 3 }}>{unit}</span>
          </div>
        </div>
      );
    }

    // ============================================================
    // 🫀 RENDER
    // ============================================================

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<PatientMonitor />);
  <\/script>
</body>
</html>`;
