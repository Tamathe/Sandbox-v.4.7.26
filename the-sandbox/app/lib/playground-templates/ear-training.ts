import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'ear-training',
  title: 'Music Theory Ear Training Lab',
  description:
    'Web Audio-powered interval, chord, and progression identification with a CSS piano keyboard.',
  category: 'training',
  thumbnailEmoji: '🎵',
  editorScrollTarget: '// 🎵 WEB AUDIO SYNTHESIZER',
  warmStartConfig: {
    previewRatio: 0.6,
    autoRunPreview: true,
    chatCollapsed: false,
    bannerText: '🎵 Get a wrong answer? Your AI music tutor is ready to help — just check the chat.',
    ctaLabel: 'Ask Your Tutor',
    ctaPulseDurationMs: 25000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Music Theory Ear Training Lab</title>
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
    body { margin: 0; background: #1c1917; color: #f5f5f4; font-family: system-ui, sans-serif; }
    @keyframes pulse-amber {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251,191,36,0.5); }
      50% { transform: scale(1.05); box-shadow: 0 0 20px 8px rgba(251,191,36,0.3); }
    }
    @keyframes flash-green {
      0% { background: rgba(34,197,94,0.4); }
      100% { background: transparent; }
    }
    @keyframes flash-red {
      0% { background: rgba(239,68,68,0.4); }
      100% { background: transparent; }
    }
    @keyframes fire-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.3); }
    }
    @keyframes celebrate {
      0% { transform: scale(1) rotate(0deg); opacity: 1; }
      50% { transform: scale(1.5) rotate(10deg); opacity: 0.8; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    @keyframes key-glow {
      0% { box-shadow: 0 0 5px rgba(251,191,36,0.5); }
      50% { box-shadow: 0 0 20px rgba(251,191,36,0.8); }
      100% { box-shadow: 0 0 5px rgba(251,191,36,0.5); }
    }
    .pulse-play { animation: pulse-amber 2s ease-in-out infinite; }
    .flash-correct { animation: flash-green 0.5s ease-out forwards; }
    .flash-wrong { animation: flash-red 0.5s ease-out forwards; }
    .fire-anim { animation: fire-pulse 0.6s ease-in-out infinite; }
    .celebrate-anim { animation: celebrate 0.8s ease-in-out; }
    .key-active { animation: key-glow 0.8s ease-in-out infinite; background: #fbbf24 !important; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useReducer, useEffect, useRef, useCallback, useMemo } = React;

    // ============================================================
    // 🎵 WEB AUDIO SYNTHESIZER
    // ============================================================

    let audioCtx = null;

    function getAudioContext() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return audioCtx;
    }

    function midiToFreq(midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function playNote(midi, startTime, duration, ctx) {
      const freq = midiToFreq(midi);

      // Master gain with ADSR envelope
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, startTime);
      master.gain.linearRampToValueAtTime(0.4, startTime + 0.02);   // attack
      master.gain.linearRampToValueAtTime(0.28, startTime + 0.12);  // decay to sustain
      master.gain.setValueAtTime(0.28, startTime + duration - 0.3); // sustain hold
      master.gain.linearRampToValueAtTime(0, startTime + duration); // release
      master.connect(ctx.destination);

      // Oscillator 1 — fundamental (sine)
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);
      g1.gain.setValueAtTime(0.4, startTime);
      osc1.connect(g1);
      g1.connect(master);
      osc1.start(startTime);
      osc1.stop(startTime + duration);

      // Oscillator 2 — warmth (triangle)
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq, startTime);
      g2.gain.setValueAtTime(0.15, startTime);
      osc2.connect(g2);
      g2.connect(master);
      osc2.start(startTime);
      osc2.stop(startTime + duration);

      // Oscillator 3 — chorus/richness (slight detune)
      const osc3 = ctx.createOscillator();
      const g3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 1.002, startTime);
      g3.gain.setValueAtTime(0.08, startTime);
      osc3.connect(g3);
      g3.connect(master);
      osc3.start(startTime);
      osc3.stop(startTime + duration);
    }

    function playInterval(note1, note2, onNotes) {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      playNote(note1, now, 0.5, ctx);
      playNote(note2, now + 0.6, 0.5, ctx);
      if (onNotes) {
        onNotes([note1]);
        setTimeout(() => onNotes([note2]), 600);
        setTimeout(() => onNotes([]), 1100);
      }
    }

    function playChord(notes, onNotes) {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      notes.forEach(n => playNote(n, now, 1.0, ctx));
      if (onNotes) {
        onNotes(notes);
        setTimeout(() => onNotes([]), 1000);
      }
    }

    function playProgression(chordList, onNotes) {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      chordList.forEach((chord, i) => {
        chord.forEach(n => playNote(n, now + i * 0.8, 0.7, ctx));
      });
      if (onNotes) {
        chordList.forEach((chord, i) => {
          setTimeout(() => onNotes(chord), i * 800);
        });
        setTimeout(() => onNotes([]), chordList.length * 800);
      }
    }

    // ============================================================
    // 🎶 CHALLENGE GENERATORS
    // ============================================================

    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    const INTERVALS = {
      'm2': { name: 'Minor 2nd', semitones: 1 },
      'M2': { name: 'Major 2nd', semitones: 2 },
      'm3': { name: 'Minor 3rd', semitones: 3 },
      'M3': { name: 'Major 3rd', semitones: 4 },
      'P4': { name: 'Perfect 4th', semitones: 5 },
      'TT': { name: 'Tritone', semitones: 6 },
      'P5': { name: 'Perfect 5th', semitones: 7 },
      'm6': { name: 'Minor 6th', semitones: 8 },
      'M6': { name: 'Major 6th', semitones: 9 },
      'm7': { name: 'Minor 7th', semitones: 10 },
      'M7': { name: 'Major 7th', semitones: 11 },
      'P8': { name: 'Octave', semitones: 12 },
    };

    const CHORD_TYPES = {
      major: { name: 'Major', intervals: [0, 4, 7] },
      minor: { name: 'Minor', intervals: [0, 3, 7] },
      dim: { name: 'Diminished', intervals: [0, 3, 6] },
      aug: { name: 'Augmented', intervals: [0, 4, 8] },
      dom7: { name: 'Dom 7th', intervals: [0, 4, 7, 10] },
      maj7: { name: 'Maj 7th', intervals: [0, 4, 7, 11] },
    };

    const PROGRESSIONS = {
      'I-IV-V-I': [[0,4,7],[5,9,12],[7,11,14],[0,4,7]],
      'I-V-vi-IV': [[0,4,7],[7,11,14],[9,12,16],[5,9,12]],
      'I-vi-IV-V': [[0,4,7],[9,12,16],[5,9,12],[7,11,14]],
      'ii-V-I': [[2,5,9],[7,11,14],[0,4,7],[0,4,7]],
      'I-IV-vi-V': [[0,4,7],[5,9,12],[9,12,16],[7,11,14]],
      'vi-IV-I-V': [[9,12,16],[5,9,12],[0,4,7],[7,11,14]],
      'I-iii-IV-V': [[0,4,7],[4,7,11],[5,9,12],[7,11,14]],
      'I-V-IV-I': [[0,4,7],[7,11,14],[5,9,12],[0,4,7]],
    };

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

    function generateIntervalChallenge(difficulty) {
      const easyKeys = ['m2','M2','m3','M3','P4','P5'];
      const medKeys = [...easyKeys, 'm6','M6','TT'];
      const hardKeys = Object.keys(INTERVALS);
      const pool = difficulty === 1 ? easyKeys : difficulty === 2 ? medKeys : hardKeys;
      const key = pick(pool);
      const interval = INTERVALS[key];
      const root = 48 + Math.floor(Math.random() * 12); // C3-B3
      const ascending = difficulty < 3 || Math.random() > 0.5;
      const note2 = ascending ? root + interval.semitones : root - interval.semitones;
      const choices = shuffle(pool).slice(0, Math.min(pool.length, 6));
      if (!choices.includes(key)) { choices[Math.floor(Math.random() * choices.length)] = key; }
      return {
        type: 'interval',
        answer: key,
        answerLabel: interval.name,
        notes: [root, note2],
        choices: shuffle(choices).map(k => ({ id: k, label: INTERVALS[k].name })),
        play: (onNotes) => playInterval(root, note2, onNotes),
      };
    }

    function generateChordChallenge(difficulty) {
      const easyKeys = ['major','minor'];
      const medKeys = [...easyKeys, 'dim', 'aug'];
      const hardKeys = Object.keys(CHORD_TYPES);
      const pool = difficulty === 1 ? easyKeys : difficulty === 2 ? medKeys : hardKeys;
      const key = pick(pool);
      const chord = CHORD_TYPES[key];
      const root = 48 + Math.floor(Math.random() * 12);
      const notes = chord.intervals.map(i => root + i);
      const choices = [...pool];
      if (!choices.includes(key)) choices.push(key);
      return {
        type: 'chord',
        answer: key,
        answerLabel: chord.name,
        notes,
        choices: shuffle(choices).map(k => ({ id: k, label: CHORD_TYPES[k].name })),
        play: (onNotes) => playChord(notes, onNotes),
      };
    }

    function generateProgressionChallenge(difficulty) {
      const easyKeys = ['I-IV-V-I','I-V-vi-IV','I-vi-IV-V','ii-V-I'];
      const medKeys = [...easyKeys, 'I-IV-vi-V', 'vi-IV-I-V'];
      const hardKeys = Object.keys(PROGRESSIONS);
      const pool = difficulty === 1 ? easyKeys : difficulty === 2 ? medKeys : hardKeys;
      const key = pick(pool);
      const rootOffset = difficulty === 1 ? 0 : Math.floor(Math.random() * 12);
      const chords = PROGRESSIONS[key].map(chord => chord.map(n => n + 48 + rootOffset));
      const allNotes = chords.flat();
      const choices = shuffle(pool).slice(0, Math.min(pool.length, 5));
      if (!choices.includes(key)) { choices[Math.floor(Math.random() * choices.length)] = key; }
      return {
        type: 'progression',
        answer: key,
        answerLabel: key,
        notes: allNotes,
        chords,
        choices: shuffle(choices).map(k => ({ id: k, label: k })),
        play: (onNotes) => playProgression(chords, onNotes),
      };
    }

    function generateChallenge(module, difficulty) {
      switch (module) {
        case 'intervals': return generateIntervalChallenge(difficulty);
        case 'chords': return generateChordChallenge(difficulty);
        case 'progressions': return generateProgressionChallenge(difficulty);
      }
    }

    // ============================================================
    // 🎛️ STATE REDUCER
    // ============================================================

    const initialState = {
      module: 'intervals',
      difficulty: 1,
      currentChallenge: null,
      answered: false,
      selectedAnswer: null,
      correct: null,
      streak: 0,
      bestStreak: 0,
      totalCorrect: 0,
      totalAttempted: 0,
      history: [],
      phase: 'MODULE_SELECT',
      celebrating: false,
    };

    function reducer(state, action) {
      switch (action.type) {
        case 'SET_MODULE':
          return { ...state, module: action.module, currentChallenge: null, phase: 'MODULE_SELECT', answered: false, selectedAnswer: null, correct: null };
        case 'NEW_CHALLENGE': {
          const challenge = generateChallenge(state.module, state.difficulty);
          return { ...state, currentChallenge: challenge, answered: false, selectedAnswer: null, correct: null, phase: 'LISTENING' };
        }
        case 'ANSWER': {
          const isCorrect = action.answer === state.currentChallenge.answer;
          const newStreak = isCorrect ? state.streak + 1 : 0;
          const newBest = Math.max(state.bestStreak, newStreak);
          let newDifficulty = state.difficulty;
          let celebrating = false;
          if (isCorrect && newStreak > 0 && newStreak % 5 === 0 && state.difficulty < 3) {
            newDifficulty = state.difficulty + 1;
            celebrating = true;
          }
          return {
            ...state,
            answered: true,
            selectedAnswer: action.answer,
            correct: isCorrect,
            streak: newStreak,
            bestStreak: newBest,
            totalCorrect: state.totalCorrect + (isCorrect ? 1 : 0),
            totalAttempted: state.totalAttempted + 1,
            difficulty: newDifficulty,
            celebrating,
            phase: 'ANSWERED',
            history: [...state.history, { module: state.module, answer: state.currentChallenge.answer, selected: action.answer, correct: isCorrect }],
          };
        }
        case 'STOP_CELEBRATING':
          return { ...state, celebrating: false };
        default:
          return state;
      }
    }

    // ============================================================
    // 🎹 PIANO KEYBOARD COMPONENT
    // ============================================================

    function PianoKeyboard({ activeNotes }) {
      const whiteKeys = [];
      const blackKeys = [];
      const blackPattern = [1, 3, -1, 6, 8, 10, -1]; // semitone offsets within octave that are black
      const isBlack = (midi) => [1,3,6,8,10].includes(midi % 12);

      // C3 (48) to B4 (71) = 2 octaves
      let whiteIndex = 0;
      for (let midi = 48; midi <= 71; midi++) {
        if (!isBlack(midi)) {
          const active = activeNotes.includes(midi);
          whiteKeys.push(
            <div
              key={midi}
              style={{
                width: 40,
                height: 160,
                background: active ? '#fbbf24' : 'linear-gradient(to bottom, #fafaf9, #e7e5e4)',
                border: '1px solid #a8a29e',
                borderRadius: '0 0 6px 6px',
                display: 'inline-block',
                position: 'relative',
                zIndex: 1,
                boxShadow: active
                  ? '0 0 20px rgba(251,191,36,0.8), inset 0 -4px 6px rgba(0,0,0,0.1)'
                  : 'inset 0 -4px 6px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.15s ease',
              }}
              className={active ? 'key-active' : ''}
            />
          );
          whiteIndex++;
        }
      }

      // Black keys - positioned relative to white keys
      const blackOffsets = [];
      let wIdx = 0;
      for (let midi = 48; midi <= 71; midi++) {
        if (!isBlack(midi)) {
          wIdx++;
        } else {
          const active = activeNotes.includes(midi);
          blackOffsets.push(
            <div
              key={midi}
              style={{
                width: 26,
                height: 100,
                background: active ? '#fbbf24' : 'linear-gradient(to bottom, #292524, #1c1917)',
                border: '1px solid #0c0a09',
                borderRadius: '0 0 4px 4px',
                position: 'absolute',
                left: (wIdx - 1) * 41 + 27,
                top: 0,
                zIndex: 2,
                boxShadow: active
                  ? '0 0 20px rgba(251,191,36,0.8)'
                  : '0 2px 6px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3)',
                transition: 'all 0.15s ease',
              }}
              className={active ? 'key-active' : ''}
            />
          );
        }
      }

      return (
        <div style={{ position: 'relative', display: 'inline-flex', padding: '12px 16px', background: '#292524', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <div style={{ position: 'relative', display: 'flex', gap: 1 }}>
            {whiteKeys}
            {blackOffsets}
          </div>
        </div>
      );
    }

    // ============================================================
    // 🖥️ UI COMPONENTS
    // ============================================================

    function ModuleTabs({ current, onSelect }) {
      const tabs = [
        { id: 'intervals', label: 'Intervals', icon: '🎵' },
        { id: 'chords', label: 'Chords', icon: '🎶' },
        { id: 'progressions', label: 'Progressions', icon: '🎼' },
      ];
      return (
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#292524' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              className={\`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all \${
                current === tab.id
                  ? 'text-amber-900 shadow-lg'
                  : 'text-stone-400 hover:text-stone-200'
              }\`}
              style={current === tab.id ? { background: '#fbbf24' } : {}}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      );
    }

    function DifficultyBadge({ level, celebrating }) {
      const stars = [1, 2, 3].map(i => (
        <span
          key={i}
          className={celebrating ? 'celebrate-anim' : ''}
          style={{
            fontSize: 20,
            color: i <= level ? '#fbbf24' : '#57534e',
            transition: 'color 0.3s',
            display: 'inline-block',
          }}
        >
          ★
        </span>
      ));
      const labels = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
      return (
        <div className="flex items-center gap-2">
          <span className="text-stone-400 text-sm font-medium">{labels[level]}</span>
          <div className="flex gap-0.5">{stars}</div>
        </div>
      );
    }

    function StatsBar({ streak, bestStreak, totalCorrect, totalAttempted }) {
      const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
      return (
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            {streak >= 5 && <span className="fire-anim" style={{ display: 'inline-block', fontSize: 18 }}>🔥</span>}
            <span className="text-stone-400">Streak:</span>
            <span className="font-bold" style={{ color: streak >= 5 ? '#fbbf24' : '#f5f5f4' }}>{streak}</span>
            {bestStreak > 0 && <span className="text-stone-500 text-xs">(best: {bestStreak})</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400">Accuracy:</span>
            <span className="font-bold" style={{ color: accuracy >= 80 ? '#4ade80' : accuracy >= 50 ? '#fbbf24' : '#f87171' }}>{accuracy}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400">Answered:</span>
            <span className="font-bold text-stone-200">{totalAttempted}</span>
          </div>
        </div>
      );
    }

    function FeedbackFlash({ correct }) {
      if (correct === null) return null;
      return (
        <div
          className={correct ? 'flash-correct' : 'flash-wrong'}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 80, opacity: 0.7 }}>{correct ? '✓' : '✗'}</span>
        </div>
      );
    }

    // ============================================================
    // 🏠 MAIN APP
    // ============================================================

    function App() {
      const [state, dispatch] = useReducer(reducer, initialState);
      const [activeNotes, setActiveNotes] = useState([]);
      const [showFeedback, setShowFeedback] = useState(null);
      const [hasPlayed, setHasPlayed] = useState(false);

      const handlePlay = useCallback(() => {
        if (!state.currentChallenge) {
          dispatch({ type: 'NEW_CHALLENGE' });
        }
      }, [state.currentChallenge]);

      // When a new challenge is generated, auto-play it
      useEffect(() => {
        if (state.currentChallenge && state.phase === 'LISTENING' && !state.answered) {
          state.currentChallenge.play(setActiveNotes);
          setHasPlayed(true);
        }
      }, [state.currentChallenge, state.phase]);

      const handleReplay = useCallback(() => {
        if (state.currentChallenge) {
          state.currentChallenge.play(setActiveNotes);
        }
      }, [state.currentChallenge]);

      const handleAnswer = useCallback((answerId) => {
        if (state.answered) return;
        const isCorrect = answerId === state.currentChallenge.answer;
        dispatch({ type: 'ANSWER', answer: answerId });
        setShowFeedback(isCorrect);
        setTimeout(() => setShowFeedback(null), 500);

        // On wrong answer: notify parent for AI tutor + auto-replay after 2s
        if (!isCorrect) {
          window.parent.postMessage({
            type: 'tool-event',
            payload: {
              event: 'wrong_answer',
              module: state.module,
              expected: state.currentChallenge.answerLabel,
              selected: state.currentChallenge.choices.find(c => c.id === answerId)?.label || answerId,
              expectedId: state.currentChallenge.answer,
              selectedId: answerId,
              streak: 0,
              totalCorrect: state.totalCorrect,
              totalAttempted: state.totalAttempted + 1,
              accuracy: Math.round((state.totalCorrect / (state.totalAttempted + 1)) * 100),
            },
          }, '*');
          setTimeout(() => {
            if (state.currentChallenge) {
              state.currentChallenge.play(setActiveNotes);
            }
          }, 2000);
        }

        // Auto-next after delay (longer on wrong to allow replay + AI response)
        setTimeout(() => {
          dispatch({ type: 'NEW_CHALLENGE' });
        }, isCorrect ? 1500 : 4000);
      }, [state.answered, state.currentChallenge, state.module, state.totalCorrect, state.totalAttempted]);

      const handleModuleSwitch = useCallback((mod) => {
        dispatch({ type: 'SET_MODULE', module: mod });
        setHasPlayed(false);
        setActiveNotes([]);
      }, []);

      // Stop celebrating after animation
      useEffect(() => {
        if (state.celebrating) {
          const t = setTimeout(() => dispatch({ type: 'STOP_CELEBRATING' }), 1200);
          return () => clearTimeout(t);
        }
      }, [state.celebrating]);

      const moduleDescriptions = {
        intervals: 'Listen to two notes and identify the interval between them.',
        chords: 'Hear a chord and identify its quality (major, minor, etc.).',
        progressions: 'Listen to a 4-chord sequence and identify the progression.',
      };

      return (
        <div className="min-h-screen flex flex-col items-center" style={{ background: 'linear-gradient(180deg, #1c1917 0%, #292524 100%)' }}>
          {/* Header */}
          <div className="w-full max-w-3xl px-4 pt-6 pb-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-extrabold" style={{ color: '#fbbf24' }}>🎵 Ear Training Lab</h1>
                <p className="text-stone-400 text-sm mt-1">{moduleDescriptions[state.module]}</p>
              </div>
              <DifficultyBadge level={state.difficulty} celebrating={state.celebrating} />
            </div>

            {/* Module Tabs */}
            <div className="flex items-center justify-between mb-6">
              <ModuleTabs current={state.module} onSelect={handleModuleSwitch} />
              <StatsBar
                streak={state.streak}
                bestStreak={state.bestStreak}
                totalCorrect={state.totalCorrect}
                totalAttempted={state.totalAttempted}
              />
            </div>
          </div>

          {/* Challenge Area */}
          <div className="w-full max-w-3xl px-4 flex-1 flex flex-col items-center gap-6">
            {/* Celebration banner */}
            {state.celebrating && (
              <div className="celebrate-anim rounded-xl px-6 py-3 text-center font-bold" style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                🎉 Level Up! Difficulty increased to {state.difficulty === 2 ? 'Medium' : 'Hard'}!
              </div>
            )}

            {/* Play / Replay Button */}
            <div className="flex flex-col items-center gap-3">
              {!state.currentChallenge ? (
                <button
                  onClick={handlePlay}
                  className="pulse-play rounded-full font-bold text-lg transition-all hover:brightness-110"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    color: '#1c1917',
                    width: 120,
                    height: 120,
                    fontSize: 18,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 24px rgba(251,191,36,0.4)',
                  }}
                >
                  ▶ Play
                </button>
              ) : (
                <button
                  onClick={handleReplay}
                  className="rounded-full font-semibold text-sm transition-all hover:brightness-110"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    color: '#1c1917',
                    width: 80,
                    height: 80,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(251,191,36,0.3)',
                  }}
                >
                  🔄 Replay
                </button>
              )}
              {!state.currentChallenge && (
                <p className="text-stone-500 text-sm">Click to hear the first {state.module === 'intervals' ? 'interval' : state.module === 'chords' ? 'chord' : 'progression'}</p>
              )}
            </div>

            {/* Piano Keyboard */}
            <div className="flex justify-center overflow-x-auto py-2">
              <PianoKeyboard activeNotes={activeNotes} />
            </div>

            {/* Answer Grid */}
            {state.currentChallenge && hasPlayed && (
              <div className="w-full max-w-lg">
                <p className="text-center text-stone-400 text-sm mb-3">
                  {state.answered ? (state.correct ? 'Correct!' : 'Not quite — see the answer below') : 'What do you hear?'}
                </p>
                <div className={\`grid gap-2 \${state.currentChallenge.choices.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}\`}>
                  {state.currentChallenge.choices.map(choice => {
                    let bg = '#292524';
                    let border = '#44403c';
                    let textColor = '#f5f5f4';
                    if (state.answered) {
                      if (choice.id === state.currentChallenge.answer) {
                        bg = '#166534'; border = '#22c55e'; textColor = '#f0fdf4';
                      } else if (choice.id === state.selectedAnswer && !state.correct) {
                        bg = '#7f1d1d'; border = '#ef4444'; textColor = '#fef2f2';
                      } else {
                        textColor = '#57534e';
                      }
                    }
                    return (
                      <button
                        key={choice.id}
                        onClick={() => handleAnswer(choice.id)}
                        disabled={state.answered}
                        className="rounded-xl px-4 py-3 font-semibold text-sm transition-all"
                        style={{
                          background: bg,
                          border: \`2px solid \${border}\`,
                          color: textColor,
                          cursor: state.answered ? 'default' : 'pointer',
                          opacity: state.answered && choice.id !== state.currentChallenge.answer && choice.id !== state.selectedAnswer ? 0.4 : 1,
                        }}
                      >
                        {choice.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Streak Fire */}
            {state.streak >= 5 && (
              <div className="text-center">
                <span className="fire-anim" style={{ display: 'inline-block', fontSize: 40 }}>🔥</span>
                <p className="text-amber-400 font-bold text-sm mt-1">{state.streak} in a row!</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="w-full max-w-3xl px-4 py-4 text-center text-stone-600 text-xs">
            Music Theory Ear Training Lab — University of Kentucky
          </div>

          {/* Feedback Flash Overlay */}
          {showFeedback !== null && <FeedbackFlash correct={showFeedback} />}
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
