import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'timeline-builder',
  title: 'Interactive Timeline Builder',
  description:
    'Create visual timelines with draggable events, zoom across centuries, color-coded themes, and export.',
  category: 'dashboard',
  thumbnailEmoji: '📅',
  editorScrollTarget: '// 📅 TIMELINE ENGINE',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText:
      '📅 Build visual timelines. Add events, color-code by theme, zoom in/out across time periods.',
    ctaLabel: '▶ Create Timeline',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Interactive Timeline Builder</title>
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
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { height: 8px; width: 8px; }
    ::-webkit-scrollbar-track { background: #1e293b; }
    ::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 4px currentColor; } 50% { box-shadow: 0 0 16px currentColor; } }
    @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 400px; } }
    .event-dot { transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
    .event-dot:hover { transform: scale(1.4); animation: pulseGlow 1.5s infinite; }
    .fade-in { animation: fadeIn 0.3s ease-out; }
    .slide-down { animation: slideDown 0.3s ease-out; }
    @media print {
      body { background: #fff !important; color: #000 !important; }
      .no-print { display: none !important; }
      .timeline-axis { border-color: #000 !important; }
      .event-dot { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  <\/style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    // 📅 TIMELINE ENGINE
    const { useState, useRef, useEffect, useCallback, useMemo } = React;

    /* ─── Theme/Category definitions ─── */
    const THEMES = [
      { key: 'political',  label: 'Political',  color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
      { key: 'cultural',   label: 'Cultural',   color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
      { key: 'scientific', label: 'Scientific', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
      { key: 'military',   label: 'Military',   color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
      { key: 'economic',   label: 'Economic',   color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
      { key: 'social',     label: 'Social',     color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
    ];
    const themeMap = Object.fromEntries(THEMES.map(t => [t.key, t]));

    /* ─── Pre-loaded timeline datasets ─── */
    const PRESETS = {
      'american-revolution': {
        label: 'American Revolution',
        rangeStart: 1760,
        rangeEnd: 1789,
        events: [
          { id: 'ar1',  title: 'Royal Proclamation of 1763', year: 1763, description: 'Britain forbids colonial expansion west of the Appalachians.', theme: 'political' },
          { id: 'ar2',  title: 'Stamp Act', year: 1765, description: 'First direct tax on American colonies sparks widespread protest.', theme: 'economic' },
          { id: 'ar3',  title: 'Boston Massacre', year: 1770, description: 'British soldiers kill five colonists in Boston.', theme: 'military' },
          { id: 'ar4',  title: 'Boston Tea Party', year: 1773, description: 'Colonists dump 342 chests of tea into Boston Harbor.', theme: 'political' },
          { id: 'ar5',  title: 'First Continental Congress', year: 1774, description: 'Delegates from 12 colonies meet in Philadelphia.', theme: 'political' },
          { id: 'ar6',  title: 'Battles of Lexington and Concord', year: 1775, description: '"Shot heard round the world" begins armed conflict.', theme: 'military' },
          { id: 'ar7',  title: 'Common Sense Published', year: 1776, description: 'Thomas Paine\\'s pamphlet argues for independence.', theme: 'cultural' },
          { id: 'ar8',  title: 'Declaration of Independence', year: 1776, description: 'Continental Congress adopts the Declaration on July 4.', theme: 'political' },
          { id: 'ar9',  title: 'Battle of Saratoga', year: 1777, description: 'Turning point; convinces France to ally with America.', theme: 'military' },
          { id: 'ar10', title: 'Franco-American Alliance', year: 1778, description: 'France formally recognizes American independence.', theme: 'political' },
          { id: 'ar11', title: 'Siege of Yorktown', year: 1781, description: 'Cornwallis surrenders; effectively ends the war.', theme: 'military' },
          { id: 'ar12', title: 'Treaty of Paris', year: 1783, description: 'Britain recognizes American independence.', theme: 'political' },
        ],
      },
      'civil-rights': {
        label: 'Civil Rights Movement',
        rangeStart: 1954,
        rangeEnd: 1968,
        events: [
          { id: 'cr1',  title: 'Brown v. Board of Education', year: 1954, description: 'Supreme Court rules school segregation unconstitutional.', theme: 'political' },
          { id: 'cr2',  title: 'Emmett Till\\'s Murder', year: 1955, description: '14-year-old murdered in Mississippi; galvanizes movement.', theme: 'social' },
          { id: 'cr3',  title: 'Montgomery Bus Boycott', year: 1955, description: 'Rosa Parks\\' arrest sparks 381-day bus boycott.', theme: 'social' },
          { id: 'cr4',  title: 'Little Rock Nine', year: 1957, description: 'Nine Black students integrate Central High School.', theme: 'social' },
          { id: 'cr5',  title: 'Greensboro Sit-Ins', year: 1960, description: 'Four students stage sit-in at Woolworth\\'s lunch counter.', theme: 'social' },
          { id: 'cr6',  title: 'Freedom Rides', year: 1961, description: 'Activists ride interstate buses to challenge segregation.', theme: 'social' },
          { id: 'cr7',  title: 'Birmingham Campaign', year: 1963, description: 'MLK\\'s "Letter from Birmingham Jail" written during protests.', theme: 'cultural' },
          { id: 'cr8',  title: 'March on Washington', year: 1963, description: '250,000 gather; MLK delivers "I Have a Dream" speech.', theme: 'social' },
          { id: 'cr9',  title: 'Civil Rights Act of 1964', year: 1964, description: 'Outlaws discrimination based on race, color, religion, sex, or national origin.', theme: 'political' },
          { id: 'cr10', title: 'Assassination of Malcolm X', year: 1965, description: 'Prominent Black leader killed in New York.', theme: 'social' },
          { id: 'cr11', title: 'Voting Rights Act', year: 1965, description: 'Prohibits racial discrimination in voting.', theme: 'political' },
          { id: 'cr12', title: 'Assassination of MLK Jr.', year: 1968, description: 'Martin Luther King Jr. assassinated in Memphis, Tennessee.', theme: 'social' },
        ],
      },
      'computing': {
        label: 'History of Computing',
        rangeStart: 1936,
        rangeEnd: 2025,
        events: [
          { id: 'co1',  title: 'Turing Machine Concept', year: 1936, description: 'Alan Turing publishes "On Computable Numbers."', theme: 'scientific' },
          { id: 'co2',  title: 'ENIAC Completed', year: 1945, description: 'First general-purpose electronic computer.', theme: 'scientific' },
          { id: 'co3',  title: 'Transistor Invented', year: 1947, description: 'Bell Labs invents the transistor.', theme: 'scientific' },
          { id: 'co4',  title: 'FORTRAN Released', year: 1957, description: 'First widely used high-level programming language.', theme: 'scientific' },
          { id: 'co5',  title: 'ARPANET Goes Live', year: 1969, description: 'Predecessor to the internet connects four universities.', theme: 'scientific' },
          { id: 'co6',  title: 'Intel 4004 Microprocessor', year: 1971, description: 'First commercially available microprocessor.', theme: 'economic' },
          { id: 'co7',  title: 'Apple II Released', year: 1977, description: 'One of the first mass-produced personal computers.', theme: 'economic' },
          { id: 'co8',  title: 'IBM PC Launched', year: 1981, description: 'Establishes the PC architecture standard.', theme: 'economic' },
          { id: 'co9',  title: 'World Wide Web Invented', year: 1989, description: 'Tim Berners-Lee proposes the WWW at CERN.', theme: 'scientific' },
          { id: 'co10', title: 'Linux Kernel Released', year: 1991, description: 'Linus Torvalds releases Linux 0.01.', theme: 'scientific' },
          { id: 'co11', title: 'Google Founded', year: 1998, description: 'Page and Brin launch Google Search.', theme: 'economic' },
          { id: 'co12', title: 'iPhone Released', year: 2007, description: 'Apple redefines the smartphone.', theme: 'economic' },
          { id: 'co13', title: 'Deep Learning Breakthrough', year: 2012, description: 'AlexNet wins ImageNet; launches the deep learning era.', theme: 'scientific' },
          { id: 'co14', title: 'ChatGPT Released', year: 2022, description: 'OpenAI\\'s chatbot reaches 100M users in 2 months.', theme: 'cultural' },
          { id: 'co15', title: 'AGI Research Accelerates', year: 2025, description: 'Major labs pursue frontier models with reasoning capabilities.', theme: 'scientific' },
        ],
      },
      'empty': {
        label: 'Start from Scratch',
        rangeStart: 1900,
        rangeEnd: 2025,
        events: [],
      },
    };

    /* ─── Utility: generate unique IDs ─── */
    let idCounter = 100;
    const genId = () => 'evt-' + (++idCounter) + '-' + Date.now().toString(36);

    /* ─── Main App Component ─── */
    function App() {
      const [events, setEvents] = useState(PRESETS['computing'].events);
      const [viewStart, setViewStart] = useState(1936);
      const [viewEnd, setViewEnd] = useState(2025);
      const [activeFilters, setActiveFilters] = useState(new Set(THEMES.map(t => t.key)));
      const [selectedEvent, setSelectedEvent] = useState(null);
      const [editingEvent, setEditingEvent] = useState(null);
      const [showAddForm, setShowAddForm] = useState(false);
      const [isPanning, setIsPanning] = useState(false);
      const [panStartX, setPanStartX] = useState(0);
      const [panStartViewStart, setPanStartViewStart] = useState(0);
      const [panStartViewEnd, setPanStartViewEnd] = useState(0);
      const [hoveredEvent, setHoveredEvent] = useState(null);

      const timelineRef = useRef(null);
      const TIMELINE_WIDTH = 3000;
      const MIN_SPAN = 5;
      const MAX_SPAN = 2000;

      /* ─── Filtered events ─── */
      const filteredEvents = useMemo(
        () => events.filter(e => activeFilters.has(e.theme)),
        [events, activeFilters]
      );

      /* ─── Zoom handler ─── */
      const handleZoom = useCallback((direction) => {
        setViewStart(prev => {
          const currentSpan = viewEnd - prev;
          const center = prev + currentSpan / 2;
          const factor = direction === 'in' ? 0.7 : 1.4;
          let newSpan = Math.max(MIN_SPAN, Math.min(MAX_SPAN, currentSpan * factor));
          let newStart = Math.round(center - newSpan / 2);
          let newEnd = Math.round(center + newSpan / 2);
          setViewEnd(newEnd);
          return newStart;
        });
      }, [viewEnd]);

      /* ─── Wheel zoom on timeline ─── */
      const handleWheel = useCallback((e) => {
        e.preventDefault();
        const direction = e.deltaY < 0 ? 'in' : 'out';
        handleZoom(direction);
      }, [handleZoom]);

      useEffect(() => {
        const el = timelineRef.current;
        if (el) {
          el.addEventListener('wheel', handleWheel, { passive: false });
          return () => el.removeEventListener('wheel', handleWheel);
        }
      }, [handleWheel]);

      /* ─── Pan handlers ─── */
      const handlePanStart = (e) => {
        if (e.target.closest('.event-dot') || e.target.closest('button')) return;
        setIsPanning(true);
        setPanStartX(e.clientX || e.touches?.[0]?.clientX || 0);
        setPanStartViewStart(viewStart);
        setPanStartViewEnd(viewEnd);
      };

      const handlePanMove = useCallback((e) => {
        if (!isPanning) return;
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const dx = clientX - panStartX;
        const span = panStartViewEnd - panStartViewStart;
        const pixelRatio = span / TIMELINE_WIDTH;
        const yearShift = Math.round(-dx * pixelRatio);
        setViewStart(panStartViewStart + yearShift);
        setViewEnd(panStartViewEnd + yearShift);
      }, [isPanning, panStartX, panStartViewStart, panStartViewEnd]);

      const handlePanEnd = useCallback(() => {
        setIsPanning(false);
      }, []);

      useEffect(() => {
        if (isPanning) {
          window.addEventListener('mousemove', handlePanMove);
          window.addEventListener('mouseup', handlePanEnd);
          window.addEventListener('touchmove', handlePanMove);
          window.addEventListener('touchend', handlePanEnd);
          return () => {
            window.removeEventListener('mousemove', handlePanMove);
            window.removeEventListener('mouseup', handlePanEnd);
            window.removeEventListener('touchmove', handlePanMove);
            window.removeEventListener('touchend', handlePanEnd);
          };
        }
      }, [isPanning, handlePanMove, handlePanEnd]);

      /* ─── Tick mark generation ─── */
      const ticks = useMemo(() => {
        const span = viewEnd - viewStart;
        let step;
        if (span <= 10) step = 1;
        else if (span <= 30) step = 2;
        else if (span <= 60) step = 5;
        else if (span <= 150) step = 10;
        else if (span <= 400) step = 25;
        else if (span <= 800) step = 50;
        else step = 100;
        const result = [];
        const first = Math.ceil(viewStart / step) * step;
        for (let y = first; y <= viewEnd; y += step) {
          const pct = ((y - viewStart) / (viewEnd - viewStart)) * 100;
          result.push({ year: y, pct, isMajor: y % (step * 2 === 0 ? step * 2 : step) === 0 });
        }
        return result;
      }, [viewStart, viewEnd]);

      /* ─── Event position calculation ─── */
      const getEventPosition = (year) => {
        return ((year - viewStart) / (viewEnd - viewStart)) * 100;
      };

      /* ─── Add event ─── */
      const handleAddEvent = (eventData) => {
        const newEvent = { ...eventData, id: genId() };
        setEvents(prev => [...prev, newEvent].sort((a, b) => a.year - b.year));
        setShowAddForm(false);
      };

      /* ─── Edit event ─── */
      const handleEditEvent = (eventData) => {
        setEvents(prev => prev.map(e => e.id === eventData.id ? eventData : e).sort((a, b) => a.year - b.year));
        setEditingEvent(null);
        setSelectedEvent(null);
      };

      /* ─── Delete event ─── */
      const handleDeleteEvent = (id) => {
        setEvents(prev => prev.filter(e => e.id !== id));
        setSelectedEvent(null);
        setEditingEvent(null);
      };

      /* ─── Load preset ─── */
      const loadPreset = (key) => {
        const preset = PRESETS[key];
        setEvents(preset.events);
        setViewStart(preset.rangeStart);
        setViewEnd(preset.rangeEnd);
        setSelectedEvent(null);
        setEditingEvent(null);
        setActiveFilters(new Set(THEMES.map(t => t.key)));
      };

      /* ─── Toggle theme filter ─── */
      const toggleFilter = (themeKey) => {
        setActiveFilters(prev => {
          const next = new Set(prev);
          if (next.has(themeKey)) next.delete(themeKey);
          else next.add(themeKey);
          return next;
        });
      };

      /* ─── Print/Export ─── */
      const handleExport = () => window.print();

      return (
        <div className="min-h-screen flex flex-col">
          {/* ─── Header ─── */}
          <header className="no-print bg-slate-900 border-b border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
                  <span className="text-3xl">📅</span> Interactive Timeline Builder
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  {events.length} event{events.length !== 1 ? 's' : ''} &middot; {viewStart} – {viewEnd}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  + Add Event
                </button>
                <button onClick={handleExport}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  🖨 Export / Print
                </button>
              </div>
            </div>
          </header>

          {/* ─── Toolbar: presets, zoom, filters ─── */}
          <div className="no-print bg-slate-800 border-b border-slate-700 px-6 py-3">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Presets */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Presets:</span>
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button key={key} onClick={() => loadPreset(key)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1 rounded text-xs font-medium transition-colors">
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-slate-600" />
              {/* Zoom */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Zoom:</span>
                <button onClick={() => handleZoom('in')}
                  className="bg-slate-700 hover:bg-slate-600 text-white w-8 h-8 rounded flex items-center justify-center text-lg transition-colors">+</button>
                <button onClick={() => handleZoom('out')}
                  className="bg-slate-700 hover:bg-slate-600 text-white w-8 h-8 rounded flex items-center justify-center text-lg transition-colors">−</button>
              </div>
              <div className="w-px h-6 bg-slate-600" />
              {/* Theme filters */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Themes:</span>
                {THEMES.map(t => (
                  <button key={t.key} onClick={() => toggleFilter(t.key)}
                    className={\`px-2 py-1 rounded text-xs font-medium transition-all border \${
                      activeFilters.has(t.key)
                        ? 'border-current opacity-100'
                        : 'border-slate-600 opacity-40'
                    }\`}
                    style={{ color: t.color, backgroundColor: activeFilters.has(t.key) ? t.bg : 'transparent' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Timeline Canvas ─── */}
          <div className="flex-1 relative overflow-hidden bg-slate-900"
            ref={timelineRef}
            onMouseDown={handlePanStart}
            onTouchStart={handlePanStart}
            style={{ cursor: isPanning ? 'grabbing' : 'grab', userSelect: 'none' }}>

            <div className="absolute inset-0 flex items-center" style={{ minHeight: 400 }}>
              {/* Axis line */}
              <div className="absolute left-0 right-0 h-0.5 bg-slate-600 timeline-axis" style={{ top: '55%' }} />

              {/* Tick marks */}
              {ticks.map(tick => (
                <div key={tick.year} className="absolute flex flex-col items-center"
                  style={{ left: tick.pct + '%', top: '55%', transform: 'translateX(-50%)' }}>
                  <div className="w-px bg-slate-500" style={{ height: tick.isMajor ? 16 : 10 }} />
                  <span className="text-slate-400 mt-1 select-none"
                    style={{ fontSize: tick.isMajor ? 12 : 10 }}>{tick.year}</span>
                </div>
              ))}

              {/* Events */}
              {filteredEvents.map((evt, idx) => {
                const pct = getEventPosition(evt.year);
                if (pct < -5 || pct > 105) return null;
                const isAbove = idx % 2 === 0;
                const theme = themeMap[evt.theme] || THEMES[0];
                const isSelected = selectedEvent?.id === evt.id;
                const isHovered = hoveredEvent === evt.id;

                return (
                  <div key={evt.id} className="absolute" style={{
                    left: pct + '%',
                    top: '55%',
                    transform: 'translateX(-50%)',
                    zIndex: isSelected || isHovered ? 50 : 10,
                  }}>
                    {/* Connector line */}
                    <div className="absolute left-1/2 w-px"
                      style={{
                        backgroundColor: theme.color + '60',
                        height: isAbove ? 60 : 60,
                        bottom: isAbove ? 8 : 'auto',
                        top: isAbove ? 'auto' : 8,
                        transform: 'translateX(-50%)',
                      }} />

                    {/* Event dot */}
                    <div className="event-dot absolute rounded-full"
                      style={{
                        width: isSelected ? 18 : 14,
                        height: isSelected ? 18 : 14,
                        backgroundColor: theme.color,
                        border: isSelected ? '3px solid white' : '2px solid ' + theme.color,
                        transform: 'translate(-50%, -50%)',
                        left: '50%',
                        top: 0,
                        zIndex: 20,
                      }}
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(isSelected ? null : evt); setEditingEvent(null); }}
                      onMouseEnter={() => setHoveredEvent(evt.id)}
                      onMouseLeave={() => setHoveredEvent(null)}
                    />

                    {/* Mini label */}
                    <div className="absolute whitespace-nowrap pointer-events-none select-none"
                      style={{
                        left: '50%',
                        transform: 'translateX(-50%)',
                        ...(isAbove
                          ? { bottom: 74, textAlign: 'center' }
                          : { top: 74, textAlign: 'center' }),
                        maxWidth: 140,
                      }}>
                      <div className="text-xs font-medium truncate" style={{ color: theme.color }}>{evt.title}</div>
                      <div className="text-xs text-slate-500">{evt.year}</div>
                    </div>

                    {/* Expanded card on select */}
                    {isSelected && !editingEvent && (
                      <div className="absolute fade-in bg-slate-800 border border-slate-600 rounded-xl p-4 shadow-2xl"
                        style={{
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 280,
                          ...(isAbove ? { bottom: 100 } : { top: 100 }),
                          zIndex: 100,
                        }}
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-white font-semibold text-sm leading-tight">{evt.title}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                            style={{ color: theme.color, backgroundColor: theme.bg }}>
                            {theme.label}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mb-2">{evt.year}</p>
                        {evt.description && <p className="text-slate-300 text-xs mb-3">{evt.description}</p>}
                        <div className="flex gap-2">
                          <button onClick={() => setEditingEvent(evt)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-medium transition-colors">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteEvent(evt.id)}
                            className="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 py-1 rounded text-xs font-medium transition-colors">
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Instruction overlay */}
            {events.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center fade-in">
                  <div className="text-5xl mb-4">📅</div>
                  <p className="text-slate-400 text-lg">No events yet. Click <strong>"+ Add Event"</strong> to begin.</p>
                  <p className="text-slate-500 text-sm mt-2">Or load a preset timeline from the toolbar above.</p>
                </div>
              </div>
            )}
          </div>

          {/* ─── Stats bar ─── */}
          <div className="no-print bg-slate-800 border-t border-slate-700 px-6 py-2">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>Showing {filteredEvents.length} of {events.length} events</span>
              <span>&middot;</span>
              <span>Range: {viewEnd - viewStart} years</span>
              <span>&middot;</span>
              <span>Scroll to zoom &middot; Drag to pan</span>
              {THEMES.map(t => {
                const count = events.filter(e => e.theme === t.key).length;
                if (count === 0) return null;
                return (
                  <span key={t.key} className="flex items-center gap-1">
                    <span className="inline-block rounded-full" style={{ width: 8, height: 8, backgroundColor: t.color }} />
                    {count}
                  </span>
                );
              })}
            </div>
          </div>

          {/* ─── Add Event Modal ─── */}
          {showAddForm && (
            <EventFormModal
              onSave={handleAddEvent}
              onClose={() => setShowAddForm(false)}
              viewStart={viewStart}
              viewEnd={viewEnd}
            />
          )}

          {/* ─── Edit Event Modal ─── */}
          {editingEvent && (
            <EventFormModal
              event={editingEvent}
              onSave={handleEditEvent}
              onClose={() => { setEditingEvent(null); }}
              viewStart={viewStart}
              viewEnd={viewEnd}
            />
          )}
        </div>
      );
    }

    /* ─── Event Form Modal Component ─── */
    function EventFormModal({ event, onSave, onClose, viewStart, viewEnd }) {
      const [title, setTitle] = useState(event?.title || '');
      const [year, setYear] = useState(event?.year?.toString() || '');
      const [description, setDescription] = useState(event?.description || '');
      const [theme, setTheme] = useState(event?.theme || 'political');
      const [error, setError] = useState('');

      const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) { setError('Title is required.'); return; }
        const yearNum = parseInt(year, 10);
        if (isNaN(yearNum)) { setError('Please enter a valid year.'); return; }
        setError('');
        onSave({
          ...(event ? { id: event.id } : {}),
          title: title.trim(),
          year: yearNum,
          description: description.trim(),
          theme,
        });
      };

      return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 no-print"
          onClick={onClose}>
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-white text-lg font-extrabold mb-4">
              {event ? 'Edit Event' : 'Add New Event'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1">Title *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Declaration of Independence" autoFocus />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1">Year *</label>
                <input type="number" value={year} onChange={e => setYear(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g., 1776" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Optional description..." />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-2">Theme / Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {THEMES.map(t => (
                    <button key={t.key} type="button" onClick={() => setTheme(t.key)}
                      className={\`px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all \${
                        theme === t.key
                          ? 'border-current scale-105'
                          : 'border-transparent opacity-60 hover:opacity-80'
                      }\`}
                      style={{ color: t.color, backgroundColor: t.bg }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                  {event ? 'Save Changes' : 'Add Event'}
                </button>
                <button type="button" onClick={onClose}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm font-medium transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    /* ─── Mount ─── */
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  <\/script>
</body>
</html>`;
