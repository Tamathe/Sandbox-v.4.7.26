import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'pediatric-sepsis',
  title: 'Pediatric Sepsis Triage Simulator',
  description:
    'Golden-hour sepsis management with animated vitals, lab ordering, and Surviving Sepsis Campaign bundle scoring.',
  category: 'simulation',
  thumbnailEmoji: '🩺',
  editorScrollTarget: '// 🩺 SEPSIS PROTOCOL ENGINE',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText:
      '🩺 A 7-year-old patient needs your help — assess vitals and intervene before the golden hour expires.',
    ctaLabel: '▶ Begin Triage',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pediatric Sepsis Triage Simulator</title>
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
    body { margin: 0; background: #0a0e1a; color: #e0e7ef; font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; }
    * { box-sizing: border-box; }

    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 8px rgba(0,255,65,0.15); }
      50% { box-shadow: 0 0 20px rgba(0,255,65,0.35); }
    }
    @keyframes alarm-flash {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    @keyframes slide-up {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes golden-pulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }
    @keyframes score-pop {
      0% { transform: scale(0.5); opacity: 0; }
      60% { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .glass-panel {
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(0, 255, 65, 0.1);
      border-radius: 16px;
    }
    .glass-panel-red {
      background: rgba(40, 10, 10, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 59, 59, 0.2);
      border-radius: 16px;
    }
    .vital-card {
      background: linear-gradient(145deg, rgba(15,23,42,0.9), rgba(10,14,26,0.95));
      border: 1px solid rgba(0,255,65,0.08);
      border-radius: 12px;
      transition: all 0.4s ease;
    }
    .vital-card.alarm {
      border-color: rgba(255,59,59,0.4);
      animation: alarm-flash 1s ease-in-out infinite;
    }
    .tab-btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 1px solid transparent;
      background: rgba(15,23,42,0.5);
      color: #94a3b8;
    }
    .tab-btn:hover { background: rgba(30,41,59,0.8); color: #e2e8f0; }
    .tab-btn.active {
      background: rgba(0,255,65,0.1);
      border-color: rgba(0,255,65,0.3);
      color: #00ff41;
    }
    .action-btn {
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
      border: 1px solid rgba(0,255,65,0.15);
      background: linear-gradient(145deg, rgba(0,255,65,0.08), rgba(0,255,65,0.03));
      color: #00ff41;
      text-align: left;
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    }
    .action-btn:hover:not(:disabled) {
      background: linear-gradient(145deg, rgba(0,255,65,0.18), rgba(0,255,65,0.08));
      border-color: rgba(0,255,65,0.4);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,255,65,0.15);
    }
    .action-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      color: #475569;
      border-color: rgba(71,85,105,0.2);
    }
    .action-btn.done {
      background: rgba(0,255,65,0.05);
      border-color: rgba(0,255,65,0.2);
      color: #22c55e;
    }
    .action-btn.urgent {
      border-color: rgba(255,59,59,0.3);
      background: linear-gradient(145deg, rgba(255,59,59,0.1), rgba(255,59,59,0.03));
      color: #ff6b6b;
    }
    .action-btn.urgent:hover:not(:disabled) {
      background: linear-gradient(145deg, rgba(255,59,59,0.2), rgba(255,59,59,0.08));
      border-color: rgba(255,59,59,0.5);
      box-shadow: 0 4px 12px rgba(255,59,59,0.15);
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0,255,65,0.2); border-radius: 4px; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useReducer, useEffect, useRef, useCallback, useMemo } = React;

    // ============================================================
    // 🩺 SEPSIS PROTOCOL ENGINE
    // ============================================================

    const INITIAL_STATE = {
      phase: 'triage',
      clock: 0,
      patient: {
        name: 'Maya Chen',
        age: 7,
        hr: 142,
        bp: [82, 48],
        spo2: 93,
        temp: 39.8,
        rr: 32,
        capRefill: 4,
        lactate: null,
        wbc: null,
        cultures: null,
        consciousness: 'irritable',
      },
      actions: [],
      labsOrdered: [],
      interventions: [],
      goldenHourExpired: false,
      vitalsTrend: 'worsening',
      eventLog: [],
      activeTab: 'assess',
      fluidsGiven: false,
      antibioticsGiven: false,
      antibioticsTime: null,
      fluidsTime: null,
      culturesCollected: false,
      assessments: [],
      stabilizedUntil: 0,
      improvingAfter: 0,
    };

    function formatClock(seconds) {
      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      return m + ':' + s;
    }

    function sepsisReducer(state, action) {
      switch (action.type) {
        case 'TICK': {
          const newClock = state.clock + 1;
          const p = { ...state.patient };
          let trend = state.vitalsTrend;
          let expired = state.goldenHourExpired;

          if (newClock >= 3600) expired = true;

          // Vitals drift every 15s if not stabilized or improving
          if (newClock % 15 === 0) {
            if (state.improvingAfter > 0 && newClock >= state.improvingAfter) {
              // Improving from antibiotics
              p.hr = Math.max(95, p.hr - 2);
              p.bp = [Math.min(110, p.bp[0] + 2), Math.min(70, p.bp[1] + 1)];
              p.spo2 = Math.min(99, p.spo2 + 0.8);
              p.rr = Math.max(18, p.rr - 1);
              p.capRefill = Math.max(2, p.capRefill - 0.3);
              trend = 'improving';
            } else if (state.stabilizedUntil > 0 && newClock < state.stabilizedUntil) {
              trend = 'stable';
            } else {
              // Worsening
              p.hr = Math.min(195, p.hr + 3);
              p.bp = [Math.max(50, p.bp[0] - 2), Math.max(25, p.bp[1] - 1)];
              p.spo2 = Math.max(70, p.spo2 - 0.5);
              p.rr = Math.min(50, p.rr + 0.5);
              p.capRefill = Math.min(7, p.capRefill + 0.1);
              trend = p.hr > 170 || p.spo2 < 85 ? 'critical' : 'worsening';
            }
          }

          return { ...state, clock: newClock, patient: p, vitalsTrend: trend, goldenHourExpired: expired };
        }

        case 'ASSESS': {
          if (state.assessments.includes(action.assessment)) return state;
          const newAssessments = [...state.assessments, action.assessment];
          const log = [...state.eventLog, { time: state.clock, msg: action.logMsg, type: 'assess' }];
          return { ...state, assessments: newAssessments, eventLog: log, phase: 'assessment' };
        }

        case 'ORDER_LAB': {
          if (state.labsOrdered.includes(action.lab)) return state;
          const newLabs = [...state.labsOrdered, action.lab];
          const log = [...state.eventLog, { time: state.clock, msg: 'Ordered: ' + action.lab, type: 'lab' }];
          return { ...state, labsOrdered: newLabs, eventLog: log, phase: 'assessment' };
        }

        case 'LAB_RESULT': {
          const p = { ...state.patient };
          if (action.lab === 'lactate') p.lactate = 4.2;
          if (action.lab === 'wbc') p.wbc = 18.5;
          if (action.lab === 'cultures') { p.cultures = 'Collected'; }
          const log = [...state.eventLog, { time: state.clock, msg: action.logMsg, type: 'result' }];
          return { ...state, patient: p, eventLog: log, culturesCollected: action.lab === 'cultures' ? true : state.culturesCollected };
        }

        case 'INTERVENE': {
          const log = [...state.eventLog, { time: state.clock, msg: action.logMsg, type: 'intervention' }];
          let s = { ...state, eventLog: log, phase: 'intervention' };

          if (action.intervention === 'fluids') {
            s.fluidsGiven = true;
            s.fluidsTime = state.clock;
            s.stabilizedUntil = state.clock + 60;
          }
          if (action.intervention === 'antibiotics') {
            s.antibioticsGiven = true;
            s.antibioticsTime = state.clock;
            s.improvingAfter = state.clock + 30;
          }
          s.interventions = [...state.interventions, action.intervention];
          return s;
        }

        case 'ESCALATE': {
          const log = [...state.eventLog, { time: state.clock, msg: action.logMsg, type: 'escalate' }];
          return { ...state, eventLog: log };
        }

        case 'FINISH': {
          return { ...state, phase: 'outcome' };
        }

        case 'SET_TAB': {
          return { ...state, activeTab: action.tab };
        }

        case 'RESET': {
          return { ...INITIAL_STATE };
        }

        default:
          return state;
      }
    }

    // ============================================================
    // 📈 ANIMATED WAVEFORM
    // ============================================================

    function AnimatedWaveform({ hr, color, type }) {
      const canvasRef = useRef(null);
      const phaseRef = useRef(0);
      const animRef = useRef(null);

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const mid = H / 2;

        function draw() {
          ctx.fillStyle = 'rgba(10,14,26,0.15)';
          ctx.fillRect(0, 0, W, H);

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.shadowColor = color;
          ctx.shadowBlur = 6;
          ctx.beginPath();

          const speed = (hr / 80) * 2;
          phaseRef.current += speed;

          for (let x = 0; x < W; x++) {
            const t = (x + phaseRef.current) / W;
            let y = mid;

            if (type === 'ecg') {
              const cycle = ((t * (hr / 60) * 2) % 1);
              if (cycle < 0.03) y = mid - 4;
              else if (cycle < 0.06) y = mid;
              else if (cycle < 0.08) y = mid + 6;
              else if (cycle < 0.12) y = mid - H * 0.4;
              else if (cycle < 0.16) y = mid + 8;
              else if (cycle < 0.28) y = mid + Math.sin(cycle * 20) * 5 - 3;
              else y = mid + (Math.random() - 0.5) * 1.5;
            } else if (type === 'spo2') {
              const cycle = ((t * (hr / 60) * 2) % 1);
              y = mid - Math.sin(cycle * Math.PI * 2) * (H * 0.3) * Math.exp(-cycle * 3);
            } else if (type === 'resp') {
              y = mid + Math.sin(t * Math.PI * 2 * 3) * (H * 0.25);
            }

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          animRef.current = requestAnimationFrame(draw);
        }

        // Clear initially
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, W, H);
        draw();

        return () => {
          if (animRef.current) cancelAnimationFrame(animRef.current);
        };
      }, [hr, color, type]);

      return (
        <canvas
          ref={canvasRef}
          width={280}
          height={50}
          style={{ width: '100%', height: 50, borderRadius: 8, display: 'block' }}
        />
      );
    }

    // ============================================================
    // 🖥️ VITALS MONITOR
    // ============================================================

    function VitalsMonitor({ patient, trend }) {
      const isAlarm = (key) => {
        if (key === 'hr') return patient.hr > 160 || patient.hr < 70;
        if (key === 'bp') return patient.bp[0] < 70;
        if (key === 'spo2') return patient.spo2 < 90;
        if (key === 'temp') return patient.temp > 39.5;
        if (key === 'rr') return patient.rr > 35;
        if (key === 'cap') return patient.capRefill > 3;
        return false;
      };

      const vitalColor = (key) => {
        if (trend === 'improving') return '#00ff41';
        return isAlarm(key) ? '#ff3b3b' : '#00ff41';
      };

      const vitals = [
        { key: 'hr', label: 'Heart Rate', value: Math.round(patient.hr), unit: 'bpm', waveType: 'ecg' },
        { key: 'bp', label: 'Blood Pressure', value: Math.round(patient.bp[0]) + '/' + Math.round(patient.bp[1]), unit: 'mmHg', waveType: null },
        { key: 'spo2', label: 'SpO2', value: Math.round(patient.spo2 * 10) / 10, unit: '%', waveType: 'spo2' },
        { key: 'temp', label: 'Temperature', value: patient.temp.toFixed(1), unit: '°C', waveType: null },
        { key: 'rr', label: 'Resp Rate', value: Math.round(patient.rr), unit: '/min', waveType: 'resp' },
        { key: 'cap', label: 'Cap Refill', value: patient.capRefill.toFixed(1), unit: 'sec', waveType: null },
      ];

      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {vitals.map(v => {
            const alarm = isAlarm(v.key);
            const col = vitalColor(v.key);
            return (
              <div
                key={v.key}
                className={alarm ? 'vital-card alarm' : 'vital-card'}
                style={{ padding: 12, animation: alarm ? undefined : 'pulse-glow 3s ease-in-out infinite' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{v.label}</span>
                  {alarm && <span style={{ fontSize: 8, color: '#ff3b3b', fontWeight: 700, animation: 'alarm-flash 0.5s infinite' }}>⚠ ALARM</span>}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: col, fontFamily: 'monospace', letterSpacing: -1 }}>
                  {v.value}
                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4, fontWeight: 400 }}>{v.unit}</span>
                </div>
                {v.waveType && (
                  <div style={{ marginTop: 6 }}>
                    <AnimatedWaveform hr={patient.hr} color={col} type={v.waveType} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // ============================================================
    // ⏱️ GOLDEN HOUR BAR
    // ============================================================

    function GoldenHourBar({ clock }) {
      const pct = Math.min((clock / 3600) * 100, 100);
      const color = pct < 40 ? '#00ff41' : pct < 70 ? '#fbbf24' : '#ff3b3b';
      const glowColor = pct < 40 ? 'rgba(0,255,65,0.3)' : pct < 70 ? 'rgba(251,191,36,0.3)' : 'rgba(255,59,59,0.3)';

      return (
        <div className="glass-panel" style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Golden Hour</span>
            <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'monospace' }}>{formatClock(clock)} / 60:00</span>
          </div>
          <div style={{ height: 8, borderRadius: 8, background: 'rgba(30,41,59,0.8)', overflow: 'hidden', position: 'relative' }}>
            <div
              style={{
                height: '100%',
                width: pct + '%',
                borderRadius: 8,
                background: 'linear-gradient(90deg, ' + color + ', ' + color + '88)',
                boxShadow: '0 0 12px ' + glowColor,
                transition: 'width 1s linear, background 2s ease',
                animation: 'golden-pulse 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      );
    }

    // ============================================================
    // 📑 EVENT LOG
    // ============================================================

    function EventLog({ log }) {
      const ref = useRef(null);
      useEffect(() => {
        if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
      }, [log.length]);

      const typeColors = {
        assess: '#60a5fa',
        lab: '#a78bfa',
        result: '#fbbf24',
        intervention: '#00ff41',
        escalate: '#ff6b6b',
      };

      return (
        <div
          ref={ref}
          className="glass-panel"
          style={{ padding: 12, maxHeight: 200, overflowY: 'auto', animation: 'fade-in 0.5s ease' }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Event Log</div>
          {log.length === 0 && (
            <div style={{ fontSize: 11, color: '#334155', fontStyle: 'italic' }}>Awaiting first action...</div>
          )}
          {log.map((entry, i) => (
            <div key={i} style={{ fontSize: 11, marginBottom: 4, animation: 'slide-up 0.3s ease', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: '#334155', fontFamily: 'monospace', flexShrink: 0, fontSize: 10 }}>[{formatClock(entry.time)}]</span>
              <span style={{ color: typeColors[entry.type] || '#94a3b8' }}>{entry.msg}</span>
            </div>
          ))}
        </div>
      );
    }

    // ============================================================
    // 🏥 ACTION TABS
    // ============================================================

    function ActionPanel({ state, dispatch }) {
      const { activeTab, assessments, labsOrdered, patient, interventions, clock } = state;

      const tabs = [
        { key: 'assess', label: '🔍 Assess' },
        { key: 'labs', label: '🧫 Labs' },
        { key: 'intervene', label: '💉 Intervene' },
        { key: 'escalate', label: '🚨 Escalate' },
      ];

      const assessActions = [
        { id: 'vitals-check', label: 'Full Vitals Assessment', finding: 'HR 142, tachycardic. BP 82/48, hypotensive. SpO2 93% on room air. Temp 39.8°C.' },
        { id: 'skin-check', label: 'Skin & Perfusion Check', finding: 'Mottled extremities, cool to touch. Capillary refill 4 seconds — delayed.' },
        { id: 'mental-status', label: 'Mental Status', finding: 'Irritable, crying inconsolably. Not tracking normally. GCS 13.' },
        { id: 'history', label: 'Focused History', finding: 'Fever x2 days, decreased PO intake. Recent URI symptoms. No known allergies. UTD on vaccines.' },
      ];

      const labActions = [
        { id: 'lactate', label: 'Serum Lactate', delay: 3, result: 'Lactate: 4.2 mmol/L (elevated — tissue hypoperfusion)' },
        { id: 'wbc', label: 'CBC with Differential', delay: 5, result: 'WBC: 18.5 × 10³/μL (leukocytosis). Left shift with 15% bands.' },
        { id: 'cultures', label: 'Blood Cultures ×2', delay: 2, result: 'Blood cultures collected from two sites. Sent to micro lab.' },
        { id: 'bmp', label: 'Basic Metabolic Panel', delay: 4, result: 'BMP: Na 134, K 3.8, Cl 100, CO2 18 (low), BUN 22, Cr 0.9, Glucose 68 (low).' },
      ];

      const interventionActions = [
        { id: 'fluids', label: 'IV Normal Saline 20 mL/kg bolus', done: state.fluidsGiven },
        { id: 'antibiotics', label: 'Broad-Spectrum Antibiotics (Ceftriaxone)', done: state.antibioticsGiven, requires: 'cultures' },
        { id: 'oxygen', label: 'Supplemental O2 via Nasal Cannula', done: interventions.includes('oxygen') },
        { id: 'vasopressors', label: 'Norepinephrine Infusion', done: interventions.includes('vasopressors'), urgent: true },
      ];

      const escalateActions = [
        { id: 'attending', label: 'Call Attending Physician' },
        { id: 'rapid-response', label: 'Activate Rapid Response Team' },
        { id: 'picu', label: 'Request PICU Transfer' },
      ];

      const [pendingLabs, setPendingLabs] = useState({});

      function handleOrderLab(lab) {
        dispatch({ type: 'ORDER_LAB', lab: lab.id, logMsg: 'Ordered: ' + lab.label });
        setPendingLabs(prev => ({ ...prev, [lab.id]: true }));

        setTimeout(() => {
          setPendingLabs(prev => ({ ...prev, [lab.id]: false }));
          dispatch({
            type: 'LAB_RESULT',
            lab: lab.id,
            logMsg: '📋 Result — ' + lab.result,
          });
        }, lab.delay * 1000);
      }

      return (
        <div className="glass-panel" style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {tabs.map(t => (
              <button
                key={t.key}
                className={'tab-btn' + (activeTab === t.key ? ' active' : '')}
                onClick={() => dispatch({ type: 'SET_TAB', tab: t.key })}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
            {activeTab === 'assess' && assessActions.map(a => {
              const done = assessments.includes(a.id);
              return (
                <button
                  key={a.id}
                  className={'action-btn' + (done ? ' done' : '')}
                  disabled={done}
                  onClick={() => dispatch({ type: 'ASSESS', assessment: a.id, logMsg: '🔍 ' + a.finding })}
                >
                  <span style={{ fontSize: 16 }}>{done ? '✅' : '🔍'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{a.label}</div>
                    {done && <div style={{ fontSize: 10, color: '#22c55e', marginTop: 2 }}>{a.finding}</div>}
                  </div>
                </button>
              );
            })}

            {activeTab === 'labs' && labActions.map(a => {
              const ordered = labsOrdered.includes(a.id);
              const pending = pendingLabs[a.id];
              const hasResult = (a.id === 'lactate' && patient.lactate !== null) ||
                               (a.id === 'wbc' && patient.wbc !== null) ||
                               (a.id === 'cultures' && patient.cultures !== null) ||
                               (a.id === 'bmp' && ordered && !pending);
              return (
                <button
                  key={a.id}
                  className={'action-btn' + (hasResult ? ' done' : '')}
                  disabled={ordered}
                  onClick={() => handleOrderLab(a)}
                >
                  <span style={{ fontSize: 16 }}>{pending ? '⏳' : hasResult ? '📋' : '🧫'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{a.label}</div>
                    {pending && <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 2 }}>Processing... ({a.delay}s)</div>}
                    {hasResult && <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 2 }}>{a.result}</div>}
                  </div>
                </button>
              );
            })}

            {activeTab === 'intervene' && interventionActions.map(a => {
              const needsCultures = a.requires === 'cultures' && !state.culturesCollected;
              return (
                <button
                  key={a.id}
                  className={'action-btn' + (a.done ? ' done' : '') + (a.urgent ? ' urgent' : '')}
                  disabled={a.done || needsCultures}
                  onClick={() => dispatch({
                    type: 'INTERVENE',
                    intervention: a.id,
                    logMsg: '💉 Administered: ' + a.label,
                  })}
                >
                  <span style={{ fontSize: 16 }}>{a.done ? '✅' : a.urgent ? '🚨' : '💉'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{a.label}</div>
                    {needsCultures && <div style={{ fontSize: 10, color: '#ff6b6b', marginTop: 2 }}>⚠ Collect blood cultures first</div>}
                    {a.done && <div style={{ fontSize: 10, color: '#22c55e', marginTop: 2 }}>Administered at {formatClock(a.id === 'fluids' ? state.fluidsTime : (a.id === 'antibiotics' ? state.antibioticsTime : clock))}</div>}
                  </div>
                </button>
              );
            })}

            {activeTab === 'escalate' && escalateActions.map(a => {
              const done = state.eventLog.some(e => e.msg.includes(a.label));
              return (
                <button
                  key={a.id}
                  className={'action-btn urgent' + (done ? ' done' : '')}
                  disabled={done}
                  onClick={() => dispatch({ type: 'ESCALATE', logMsg: '🚨 ' + a.label + ' activated' })}
                >
                  <span style={{ fontSize: 16 }}>{done ? '✅' : '🚨'}</span>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{a.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // ============================================================
    // 🏆 OUTCOME SCORECARD
    // ============================================================

    function OutcomeScorecard({ state }) {
      const { antibioticsTime, fluidsTime, culturesCollected, interventions, clock, goldenHourExpired, eventLog } = state;

      const bundleItems = [
        { label: 'Serum lactate measured', met: state.patient.lactate !== null },
        { label: 'Blood cultures collected before antibiotics', met: culturesCollected && (!antibioticsTime || (state.eventLog.findIndex(e => e.msg.includes('Blood cultures')) < state.eventLog.findIndex(e => e.msg.includes('Antibiotics')))) },
        { label: 'Broad-spectrum antibiotics administered', met: state.antibioticsGiven },
        { label: 'IV fluid bolus initiated', met: state.fluidsGiven },
        { label: 'Reassessment documented', met: state.assessments.length >= 3 },
        { label: 'Vasopressors if hypotension persists', met: interventions.includes('vasopressors') || (state.fluidsGiven && state.patient.bp[0] >= 75) },
      ];

      const bundleMet = bundleItems.filter(b => b.met).length;
      const abxTimeStr = antibioticsTime ? formatClock(antibioticsTime) : 'Not given';
      const pct = (bundleMet / bundleItems.length) * 100;

      let grade = 'F';
      if (antibioticsTime && antibioticsTime < 1800 && bundleMet >= 5) grade = 'A';
      else if (antibioticsTime && antibioticsTime < 2400 && bundleMet >= 4) grade = 'B';
      else if (antibioticsTime && antibioticsTime < 3000 && bundleMet >= 3) grade = 'C';
      else if (antibioticsTime && bundleMet >= 2) grade = 'D';

      if (goldenHourExpired && !state.antibioticsGiven) grade = 'F';

      const gradeColors = { A: '#00ff41', B: '#22d3ee', C: '#fbbf24', D: '#f97316', F: '#ff3b3b' };

      return (
        <div style={{ animation: 'fade-in 0.8s ease', padding: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Outcome Assessment</div>
            <div style={{
              fontSize: 72, fontWeight: 900, color: gradeColors[grade],
              textShadow: '0 0 30px ' + gradeColors[grade] + '66',
              animation: 'score-pop 0.8s ease',
            }}>
              {grade}
            </div>
            <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>
              Patient: {state.patient.name}, Age {state.patient.age}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div className="glass-panel" style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Time to Antibiotics</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: antibioticsTime && antibioticsTime < 1800 ? '#00ff41' : '#fbbf24', fontFamily: 'monospace', marginTop: 4 }}>
                {abxTimeStr}
              </div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>Target: &lt; 30:00</div>
            </div>
            <div className="glass-panel" style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Bundle Compliance</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: bundleMet >= 5 ? '#00ff41' : '#fbbf24', fontFamily: 'monospace', marginTop: 4 }}>
                {bundleMet}/{bundleItems.length}
              </div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>Surviving Sepsis Campaign</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              SSC Bundle Checklist
            </div>
            {bundleItems.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, animation: 'slide-up 0.3s ease ' + (i * 0.1) + 's both' }}>
                <span style={{ fontSize: 14 }}>{b.met ? '✅' : '❌'}</span>
                <span style={{ fontSize: 12, color: b.met ? '#00ff41' : '#ff6b6b' }}>{b.label}</span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
              {grade === 'A' && 'Excellent performance. Rapid identification and treatment within the golden hour. All critical bundle elements addressed.'}
              {grade === 'B' && 'Good performance. Antibiotics administered in a timely manner with most bundle elements completed.'}
              {grade === 'C' && 'Adequate performance. Consider earlier antibiotic administration and more thorough bundle compliance.'}
              {grade === 'D' && 'Below expectations. Significant delays in critical interventions may impact patient outcomes.'}
              {grade === 'F' && 'Critical deficiency. The golden hour expired without antibiotics. In a real scenario, this significantly increases mortality risk.'}
            </div>
          </div>
        </div>
      );
    }

    // ============================================================
    // 🏥 PATIENT BANNER
    // ============================================================

    function PatientBanner({ patient, trend, clock }) {
      const trendColors = {
        stable: '#fbbf24',
        worsening: '#ff6b6b',
        improving: '#00ff41',
        critical: '#ff3b3b',
      };

      return (
        <div className="glass-panel" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700,
            }}>MC</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{patient.name}, {patient.age}y/o F</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>CC: Fever, irritability, mottled skin × 2 days | NKA | 22kg</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                color: trendColors[trend],
              }}>
                {trend === 'critical' ? '⚠ CRITICAL' : trend.toUpperCase()}
              </div>
              <div style={{ fontSize: 10, color: '#475569' }}>Trend</div>
            </div>
            <div style={{
              fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: clock > 2700 ? '#ff3b3b' : '#f1f5f9',
              minWidth: 65, textAlign: 'right',
            }}>
              {formatClock(clock)}
            </div>
          </div>
        </div>
      );
    }

    // ============================================================
    // 🔌 APP
    // ============================================================

    function App() {
      const [state, dispatch] = useReducer(sepsisReducer, { ...INITIAL_STATE });
      const [running, setRunning] = useState(false);

      // Clock tick
      useEffect(() => {
        if (!running || state.phase === 'outcome') return;
        const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
        return () => clearInterval(id);
      }, [running, state.phase]);

      // Auto-start clock on first action
      const handleAction = useCallback((actionFn) => {
        if (!running) setRunning(true);
        actionFn();
      }, [running]);

      // Override dispatch to auto-start
      const d = useCallback((action) => {
        if (!running && action.type !== 'SET_TAB' && action.type !== 'RESET') setRunning(true);
        dispatch(action);
      }, [running]);

      if (state.phase === 'outcome') {
        return (
          <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0e1a, #0f172a)', padding: 16 }}>
            <PatientBanner patient={state.patient} trend={state.vitalsTrend} clock={state.clock} />
            <div style={{ maxWidth: 600, margin: '20px auto' }}>
              <OutcomeScorecard state={state} />
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button
                  onClick={() => { dispatch({ type: 'RESET' }); setRunning(false); }}
                  className="action-btn"
                  style={{ display: 'inline-flex', justifyContent: 'center', width: 'auto', padding: '10px 32px' }}
                >
                  🔄 Run Again
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0e1a, #0f172a)', padding: 12 }}>
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Patient Banner */}
            <PatientBanner patient={state.patient} trend={state.vitalsTrend} clock={state.clock} />

            {/* Golden Hour Bar */}
            <GoldenHourBar clock={state.clock} />

            {/* Main Grid: Vitals + Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 10 }}>
              {/* Left: Vitals Monitor */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, paddingLeft: 2 }}>
                  Vitals Monitor
                </div>
                <VitalsMonitor patient={state.patient} trend={state.vitalsTrend} />
              </div>

              {/* Right: Action Panel + Event Log */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ActionPanel state={state} dispatch={d} />
                <EventLog log={state.eventLog} />
              </div>
            </div>

            {/* Finish Button */}
            {(state.antibioticsGiven || state.clock > 900) && state.phase !== 'outcome' && (
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <button
                  onClick={() => dispatch({ type: 'FINISH' })}
                  className="action-btn"
                  style={{
                    display: 'inline-flex', justifyContent: 'center', width: 'auto', padding: '12px 40px',
                    background: 'linear-gradient(145deg, rgba(0,255,65,0.15), rgba(0,255,65,0.05))',
                    fontSize: 14,
                  }}
                >
                  ✅ Complete Assessment
                </button>
              </div>
            )}
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
