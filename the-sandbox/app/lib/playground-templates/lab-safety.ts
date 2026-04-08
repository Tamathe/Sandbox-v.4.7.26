import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'lab-safety',
  title: 'Chemistry Lab Safety Walkthrough',
  description:
    'Interactive hazard hunt with OSHA/GHS standards, spill response drill, and safety protocol scoring.',
  category: 'simulation',
  thumbnailEmoji: '🧪',
  editorScrollTarget: '// 🧪 HAZARD DETECTION ENGINE',
  warmStartConfig: {
    previewRatio: 0.6,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '🧪 Inspect the lab bench for safety hazards, then respond to an acid spill emergency.',
    ctaLabel: '▶ Begin Inspection',
    ctaPulseDurationMs: 25000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chemistry Lab Safety Walkthrough</title>
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
    body { margin: 0; background: #f8fafc; color: #1e293b; font-family: system-ui, sans-serif; }
    @keyframes hazard-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
      50% { box-shadow: 0 0 0 12px rgba(220, 38, 38, 0); }
    }
    @keyframes spill-expand {
      0% { width: 20px; height: 20px; opacity: 0.3; border-radius: 50%; }
      100% { width: 300px; height: 200px; opacity: 0.8; border-radius: 45% 55% 50% 50%; }
    }
    @keyframes flash-red {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .hazard-ring { animation: hazard-pulse 2s ease-in-out infinite; }
    .spill-blob { animation: spill-expand 2s ease-out forwards; }
    .flash-alert { animation: flash-red 0.8s ease-in-out infinite; }
    .drag-over { outline: 3px dashed #0033A0; background: #eff6ff !important; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useReducer, useEffect, useRef, useCallback } = React;

    // ============================================================
    // 🧪 HAZARD DETECTION ENGINE
    // ============================================================

    const HAZARDS = [
      {
        id: 1,
        name: 'Unlabeled beaker',
        description: 'Unlabeled beaker with clear liquid on the bench.',
        standard: 'GHS Art. 17 — All containers must be labeled',
        fix: 'Label all containers with chemical name, concentration, and hazard pictogram.',
        emoji: '🧪',
        x: '12%', y: '38%',
      },
      {
        id: 2,
        name: 'Safety goggles on bench',
        description: 'Safety goggles sitting on bench, not being worn.',
        standard: 'OSHA 1910.133 — Eye/face protection required',
        fix: 'Wear safety goggles at all times when chemicals are present.',
        emoji: '🥽',
        x: '35%', y: '30%',
      },
      {
        id: 3,
        name: 'Chemicals above eye level',
        description: 'Chemicals stored on the top shelf above eye level.',
        standard: 'OSHA 1910.106 — Proper chemical storage',
        fix: 'Store heavy/hazardous chemicals below eye level on stable shelving.',
        emoji: '🧴',
        x: '22%', y: '8%',
      },
      {
        id: 4,
        name: 'Coffee cup near chemicals',
        description: 'A coffee cup left next to chemical containers.',
        standard: 'OSHA 1910.141 — No food/drink in labs',
        fix: 'Remove all food and beverages from the laboratory.',
        emoji: '☕',
        x: '55%', y: '40%',
      },
      {
        id: 5,
        name: 'Blocked eyewash station',
        description: 'Emergency eyewash station blocked by stacked boxes.',
        standard: 'ANSI Z358.1 — Clear access to safety equipment',
        fix: 'Keep 3-foot clearance around all emergency safety equipment.',
        emoji: '🚿',
        x: '5%', y: '65%',
      },
      {
        id: 6,
        name: 'Cracked fume hood glass',
        description: 'The fume hood has a visible crack in the sash glass.',
        standard: 'OSHA 1910.1450 — Functioning engineering controls',
        fix: 'Report immediately, cease use, post "Out of Service" sign.',
        emoji: '🔬',
        x: '78%', y: '25%',
      },
    ];

    const CORRECT_SPILL_ORDER = [
      'Alert others and evacuate area',
      'Don appropriate PPE',
      'Contain the spill with absorbent',
      'Neutralize the acid',
      'Clean up and dispose properly',
      'Report incident to supervisor',
    ];

    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    // ============================================================
    // 🔄 STATE REDUCER
    // ============================================================

    const INITIAL_STATE = {
      phase: 'briefing',
      timer: 180,
      hazards: HAZARDS.map(h => ({ ...h, found: false })),
      hazardsFound: 0,
      selectedHazard: null,
      spillSteps: Array(6).fill(null),
      availableCards: shuffle(CORRECT_SPILL_ORDER),
      score: null,
    };

    function reducer(state, action) {
      switch (action.type) {
        case 'START_HUNT':
          return { ...state, phase: 'hunt', timer: 180 };
        case 'TICK': {
          const next = state.timer - 1;
          if (next <= 0) {
            return { ...state, timer: 0, phase: 'spill' };
          }
          return { ...state, timer: next };
        }
        case 'FIND_HAZARD': {
          const hazards = state.hazards.map(h =>
            h.id === action.id ? { ...h, found: true } : h
          );
          const found = hazards.filter(h => h.found).length;
          return {
            ...state,
            hazards,
            hazardsFound: found,
            selectedHazard: action.id,
          };
        }
        case 'SELECT_HAZARD':
          return { ...state, selectedHazard: action.id };
        case 'CLOSE_DRAWER':
          return { ...state, selectedHazard: null };
        case 'GO_SPILL':
          return { ...state, phase: 'spill', selectedHazard: null };
        case 'PLACE_STEP': {
          const { slotIndex, step } = action;
          const spillSteps = [...state.spillSteps];
          // Remove from old slot if present
          const oldIdx = spillSteps.indexOf(step);
          if (oldIdx !== -1) spillSteps[oldIdx] = null;
          // If slot occupied, put that card back
          const displaced = spillSteps[slotIndex];
          spillSteps[slotIndex] = step;
          const available = [...state.availableCards].filter(c => c !== step);
          if (displaced) available.push(displaced);
          return { ...state, spillSteps, availableCards: available };
        }
        case 'RETURN_CARD': {
          const spillSteps = [...state.spillSteps];
          const idx = spillSteps.indexOf(action.step);
          if (idx !== -1) spillSteps[idx] = null;
          return {
            ...state,
            spillSteps,
            availableCards: [...state.availableCards, action.step],
          };
        }
        case 'SCORE': {
          const hazardScore = (state.hazardsFound / 6) * 50;
          let correctPositions = 0;
          state.spillSteps.forEach((s, i) => {
            if (s === CORRECT_SPILL_ORDER[i]) correctPositions++;
          });
          const spillScore = (correctPositions / 6) * 50;
          const overall = Math.round(hazardScore + spillScore);
          let grade = 'F';
          if (overall >= 90) grade = 'A';
          else if (overall >= 80) grade = 'B';
          else if (overall >= 70) grade = 'C';
          else if (overall >= 60) grade = 'D';
          return {
            ...state,
            phase: 'results',
            score: { hazardScore: Math.round(hazardScore), spillScore: Math.round(spillScore), correctPositions, overall, grade },
          };
        }
        case 'RESET':
          return { ...INITIAL_STATE, availableCards: shuffle(CORRECT_SPILL_ORDER) };
        default:
          return state;
      }
    }

    // ============================================================
    // 🖥️ COMPONENTS
    // ============================================================

    function TimerBar({ timer }) {
      const pct = (timer / 180) * 100;
      let color = '#16a34a';
      if (timer < 60) color = '#eab308';
      if (timer < 30) color = '#dc2626';
      const min = String(Math.floor(timer / 60)).padStart(2, '0');
      const sec = String(timer % 60).padStart(2, '0');
      return (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Time Remaining</span>
            <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color }}>{min}:{sec}</span>
          </div>
          <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 4, transition: 'width 1s linear, background 0.5s' }} />
          </div>
        </div>
      );
    }

    function HazardDrawer({ hazard, onClose }) {
      if (!hazard) return null;
      return (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: '#fff', borderTop: '3px solid #0033A0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
          padding: '20px 24px', transition: 'transform 0.3s',
        }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 24 }}>{hazard.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: 17, color: '#dc2626' }}>Hazard Found!</span>
                </div>
                <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, marginBottom: 6 }}>{hazard.description}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                  <strong>Standard violated:</strong> {hazard.standard}
                </div>
                <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                  <strong>Correct fix:</strong> {hazard.fix}
                </div>
              </div>
              <button onClick={onClose} style={{
                background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', padding: 4,
              }}>✕</button>
            </div>
          </div>
        </div>
      );
    }

    function LabBench({ hazards, onClickHazard }) {
      return (
        <div style={{
          position: 'relative', width: '100%', height: 420, background: '#e2e8f0',
          borderRadius: 16, overflow: 'hidden', border: '2px solid #cbd5e1',
        }}>
          {/* Shelf */}
          <div style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: 50,
            background: '#94a3b8', borderRadius: '0 0 8px 8px',
            borderBottom: '3px solid #64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 20px',
          }}>
            <div style={{ width: 28, height: 36, background: '#ef4444', borderRadius: 4, border: '1px solid #b91c1c', fontSize: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', color: '#fff', paddingBottom: 2 }}>HCl</div>
            <div style={{ width: 28, height: 32, background: '#3b82f6', borderRadius: 4, border: '1px solid #1d4ed8', fontSize: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', color: '#fff', paddingBottom: 2 }}>NaOH</div>
            <div style={{ width: 28, height: 38, background: '#a855f7', borderRadius: 4, border: '1px solid #7c3aed', fontSize: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', color: '#fff', paddingBottom: 2 }}>KMnO4</div>
            <div style={{ width: 28, height: 30, background: '#f59e0b', borderRadius: 4, border: '1px solid #d97706', fontSize: 8, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', color: '#fff', paddingBottom: 2 }}>H2SO4</div>
          </div>

          {/* Bench surface */}
          <div style={{
            position: 'absolute', top: 60, left: 0, right: 0, bottom: 80,
            background: 'repeating-linear-gradient(90deg, transparent, transparent 49px, #d1d5db 49px, #d1d5db 50px), repeating-linear-gradient(0deg, transparent, transparent 49px, #d1d5db 49px, #d1d5db 50px), #f1f5f9',
          }} />

          {/* Bench front edge */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
            background: 'linear-gradient(to bottom, #94a3b8, #64748b)',
            borderRadius: '0 0 14px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, paddingTop: 10 }}>
              <div style={{ width: 50, height: 40, background: '#475569', borderRadius: 4 }} />
              <div style={{ width: 50, height: 40, background: '#475569', borderRadius: 4 }} />
              <div style={{ width: 50, height: 40, background: '#475569', borderRadius: 4 }} />
            </div>
          </div>

          {/* Static equipment */}
          {/* Bunsen burner */}
          <div style={{ position: 'absolute', left: '45%', top: '42%', textAlign: 'center' }}>
            <div style={{ fontSize: 32 }}>🔥</div>
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Burner</div>
          </div>

          {/* Microscope */}
          <div style={{ position: 'absolute', left: '65%', top: '35%', textAlign: 'center' }}>
            <div style={{ fontSize: 30 }}>🔬</div>
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Microscope</div>
          </div>

          {/* Test tube rack */}
          <div style={{ position: 'absolute', left: '30%', top: '50%', textAlign: 'center' }}>
            <div style={{ fontSize: 26 }}>🧫</div>
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Samples</div>
          </div>

          {/* Wash bottle */}
          <div style={{ position: 'absolute', left: '50%', top: '58%', textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>💧</div>
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>DI Water</div>
          </div>

          {/* Fume hood on right */}
          <div style={{
            position: 'absolute', right: '2%', top: '8%', width: '22%', height: '55%',
            border: '3px solid #94a3b8', borderRadius: 8,
            background: 'rgba(148, 163, 184, 0.15)',
          }}>
            <div style={{ textAlign: 'center', fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 4 }}>FUME HOOD</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
              <div style={{ fontSize: 20 }}>🧪</div>
              <div style={{ fontSize: 20 }}>⚗️</div>
            </div>
          </div>

          {/* Eyewash station area */}
          <div style={{
            position: 'absolute', left: '1%', top: '58%', width: '14%', height: '22%',
            border: '2px dashed #0033A0', borderRadius: 8, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 10, color: '#0033A0', fontWeight: 700 }}>EYEWASH</div>
            <div style={{ fontSize: 18, marginTop: 2 }}>🚿</div>
            {/* Blocking boxes */}
            <div style={{ position: 'absolute', left: 2, bottom: -4, width: 30, height: 22, background: '#92400e', borderRadius: 3, border: '1px solid #78350f', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fef3c7' }}>BOX</div>
            <div style={{ position: 'absolute', right: 2, bottom: 8, width: 26, height: 20, background: '#92400e', borderRadius: 3, border: '1px solid #78350f', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fef3c7' }}>BOX</div>
          </div>

          {/* Hazard hotspots */}
          {hazards.map(h => (
            <div
              key={h.id}
              onClick={() => onClickHazard(h.id)}
              className={h.found ? '' : 'hazard-ring'}
              style={{
                position: 'absolute',
                left: h.x, top: h.y,
                width: 48, height: 48,
                borderRadius: '50%',
                border: h.found ? '3px solid #16a34a' : '3px solid rgba(220, 38, 38, 0.5)',
                background: h.found ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 22, transition: 'all 0.3s',
                zIndex: 10,
              }}
              title={h.found ? h.name + ' (found)' : 'Investigate this area'}
            >
              {h.found ? '✅' : h.emoji}
            </div>
          ))}
        </div>
      );
    }

    function Briefing({ onStart }) {
      return (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🧪</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
            Chemistry Lab Safety Walkthrough
          </h1>
          <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6, marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
            You are a lab safety inspector. Your task is to inspect a chemistry lab bench, identify
            <strong style={{ color: '#dc2626' }}> 6 safety hazards</strong>, then respond to a chemical spill emergency.
          </p>
          <div style={{
            background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, padding: 20,
            textAlign: 'left', marginBottom: 28, maxWidth: 440, margin: '0 auto 28px',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 10 }}>Inspection Rules</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.8 }}>
              1. You have <strong>3 minutes</strong> to find all hazards on the lab bench.<br/>
              2. Click on suspicious items to identify hazards.<br/>
              3. Each hazard links to a real OSHA or GHS safety standard.<br/>
              4. After the hunt, respond to a chemical spill emergency.<br/>
              5. Drag protocol steps into the correct order.
            </div>
          </div>
          <button
            onClick={onStart}
            style={{
              background: '#0033A0', color: '#fff', border: 'none', borderRadius: 12,
              padding: '14px 36px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => e.target.style.background = '#002680'}
            onMouseOut={e => e.target.style.background = '#0033A0'}
          >
            Begin Inspection (3:00)
          </button>
        </div>
      );
    }

    function HuntPhase({ state, dispatch }) {
      const selected = state.selectedHazard ? state.hazards.find(h => h.id === state.selectedHazard) : null;
      const allFound = state.hazardsFound === 6;

      function handleClick(id) {
        const h = state.hazards.find(hz => hz.id === id);
        if (!h.found) {
          dispatch({ type: 'FIND_HAZARD', id });
        } else {
          dispatch({ type: 'SELECT_HAZARD', id });
        }
      }

      return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                🔍 Hazard Hunt
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                Click on items that violate safety standards
              </p>
            </div>
            <div style={{
              background: state.hazardsFound === 6 ? '#dcfce7' : '#fff',
              border: '2px solid ' + (state.hazardsFound === 6 ? '#16a34a' : '#e2e8f0'),
              borderRadius: 10, padding: '8px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: state.hazardsFound === 6 ? '#16a34a' : '#1e293b' }}>
                {state.hazardsFound}/6
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Hazards</div>
            </div>
          </div>

          <TimerBar timer={state.timer} />
          <LabBench hazards={state.hazards} onClickHazard={handleClick} />

          {allFound && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <div style={{ color: '#16a34a', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                All hazards identified! Proceed to spill response.
              </div>
              <button
                onClick={() => dispatch({ type: 'GO_SPILL' })}
                style={{
                  background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10,
                  padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}
              >
                ⚠️ Respond to Chemical Spill
              </button>
            </div>
          )}

          <HazardDrawer hazard={selected} onClose={() => dispatch({ type: 'CLOSE_DRAWER' })} />
        </div>
      );
    }

    function SpillScene({ state, dispatch }) {
      const [draggedCard, setDraggedCard] = useState(null);
      const [dragOverSlot, setDragOverSlot] = useState(null);

      function handleDragStart(e, step) {
        setDraggedCard(step);
        e.dataTransfer.setData('text/plain', step);
        e.dataTransfer.effectAllowed = 'move';
      }

      function handleDragOver(e, idx) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverSlot(idx);
      }

      function handleDragLeave() {
        setDragOverSlot(null);
      }

      function handleDrop(e, slotIndex) {
        e.preventDefault();
        const step = e.dataTransfer.getData('text/plain');
        if (step) {
          dispatch({ type: 'PLACE_STEP', slotIndex, step });
        }
        setDragOverSlot(null);
        setDraggedCard(null);
      }

      function handleReturnCard(step) {
        dispatch({ type: 'RETURN_CARD', step });
      }

      const allPlaced = state.spillSteps.every(s => s !== null);

      return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 20px' }}>
          {/* Alert banner */}
          <div className="flash-alert" style={{
            background: '#dc2626', color: '#fff', textAlign: 'center',
            padding: '12px 20px', borderRadius: 12, fontWeight: 800, fontSize: 20,
            marginBottom: 16, letterSpacing: 1,
          }}>
            ⚠️ CHEMICAL SPILL! — Acid Spill Detected
          </div>

          {/* Spill animation area */}
          <div style={{
            position: 'relative', width: '100%', height: 180, background: '#f1f5f9',
            borderRadius: 12, overflow: 'hidden', marginBottom: 20,
            border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%, -50%)' }}>
              <div className="spill-blob" style={{
                background: 'radial-gradient(ellipse at center, #84cc16 0%, #a3e635 40%, #bef264 70%, rgba(190, 242, 100, 0.3) 100%)',
                width: 20, height: 20,
              }} />
            </div>
            <div style={{
              position: 'relative', zIndex: 2, textAlign: 'center',
              background: 'rgba(255,255,255,0.85)', padding: '10px 20px', borderRadius: 8,
            }}>
              <div style={{ fontSize: 28 }}>🧪💥</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginTop: 4 }}>
                Sulfuric acid spill — follow emergency protocol
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
            Drag steps into the correct order:
          </h3>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
            Arrange the 6 emergency protocol steps from first to last.
          </p>

          {/* Drop zones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {state.spillSteps.map((step, idx) => {
              const isCorrect = step && step === CORRECT_SPILL_ORDER[idx];
              const isWrong = step && step !== CORRECT_SPILL_ORDER[idx];
              const isOver = dragOverSlot === idx;
              return (
                <div
                  key={idx}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={isOver ? 'drag-over' : ''}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: step ? (isCorrect ? '#dcfce7' : '#fff') : '#f8fafc',
                    border: step ? (isCorrect ? '2px solid #16a34a' : '2px solid #e2e8f0') : '2px dashed #cbd5e1',
                    borderRadius: 10, padding: '10px 14px', minHeight: 48,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: step ? (isCorrect ? '#16a34a' : '#0033A0') : '#e2e8f0',
                    color: step ? '#fff' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13, flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  {step ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{step}</span>
                      <button
                        onClick={() => handleReturnCard(step)}
                        style={{
                          background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
                          fontSize: 16, padding: '0 4px', flexShrink: 0,
                        }}
                        title="Remove"
                      >✕</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Drop step {idx + 1} here</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Available cards */}
          {state.availableCards.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                Available steps — drag to slots above:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {state.availableCards.map((step, i) => (
                  <div
                    key={step}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, step)}
                    style={{
                      background: '#fff', border: '2px solid #0033A0', borderRadius: 8,
                      padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#0033A0',
                      cursor: 'grab', userSelect: 'none',
                      opacity: draggedCard === step ? 0.4 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {allPlaced && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                onClick={() => dispatch({ type: 'SCORE' })}
                style={{
                  background: '#0033A0', color: '#fff', border: 'none', borderRadius: 10,
                  padding: '14px 36px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Submit & See Results
              </button>
            </div>
          )}
        </div>
      );
    }

    function ResultsScreen({ state, dispatch }) {
      const { score, hazards, spillSteps } = state;
      const gradeColors = { A: '#16a34a', B: '#0033A0', C: '#eab308', D: '#f97316', F: '#dc2626' };

      return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px' }}>
          {/* Grade banner */}
          <div style={{
            textAlign: 'center', marginBottom: 28, padding: '24px 20px',
            background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0',
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
              background: gradeColors[score.grade] || '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 38, fontWeight: 800, color: '#fff',
            }}>
              {score.grade}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b' }}>{score.overall}/100</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              Hazard Detection: {score.hazardScore}/50 &nbsp;|&nbsp; Spill Protocol: {score.spillScore}/50
            </div>
          </div>

          {/* Hazard results table */}
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Hazard Detection Results</h3>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '2px solid #e2e8f0', marginBottom: 24 }}>
            {hazards.map(h => (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: h.found ? '#f0fdf4' : '#fef2f2',
                borderBottom: '1px solid #e2e8f0',
              }}>
                <span style={{ fontSize: 18 }}>{h.found ? '✅' : '❌'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: h.found ? '#166534' : '#991b1b' }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{h.standard}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  background: h.found ? '#dcfce7' : '#fee2e2',
                  color: h.found ? '#16a34a' : '#dc2626',
                }}>
                  {h.found ? 'FOUND' : 'MISSED'}
                </span>
              </div>
            ))}
          </div>

          {/* Spill results */}
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
            Spill Protocol ({score.correctPositions}/6 correct)
          </h3>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '2px solid #e2e8f0', marginBottom: 28 }}>
            {CORRECT_SPILL_ORDER.map((correct, i) => {
              const placed = spillSteps[i];
              const isCorrect = placed === correct;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  background: isCorrect ? '#f0fdf4' : '#fef2f2',
                  borderBottom: '1px solid #e2e8f0',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: isCorrect ? '#16a34a' : '#dc2626',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 12, flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isCorrect ? '#166534' : '#991b1b' }}>
                      {placed || '(empty)'}
                    </div>
                    {!isCorrect && (
                      <div style={{ fontSize: 11, color: '#64748b' }}>Correct: {correct}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 14 }}>{isCorrect ? '✅' : '❌'}</span>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => dispatch({ type: 'RESET' })}
              style={{
                background: '#0033A0', color: '#fff', border: 'none', borderRadius: 10,
                padding: '14px 36px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      );
    }

    // ============================================================
    // 🧪 APP COMPONENT
    // ============================================================

    function App() {
      const [state, dispatch] = useReducer(reducer, {
        ...INITIAL_STATE,
        availableCards: shuffle(CORRECT_SPILL_ORDER),
      });

      // Timer tick
      useEffect(() => {
        if (state.phase !== 'hunt' || state.timer <= 0) return;
        const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
        return () => clearInterval(id);
      }, [state.phase, state.timer]);

      return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
          {state.phase === 'briefing' && (
            <Briefing onStart={() => dispatch({ type: 'START_HUNT' })} />
          )}
          {state.phase === 'hunt' && (
            <HuntPhase state={state} dispatch={dispatch} />
          )}
          {state.phase === 'spill' && (
            <SpillScene state={state} dispatch={dispatch} />
          )}
          {state.phase === 'results' && (
            <ResultsScreen state={state} dispatch={dispatch} />
          )}
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
