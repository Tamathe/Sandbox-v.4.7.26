import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'case-brief-builder',
  title: 'Case Brief Builder',
  description: 'Structured IRAC case brief builder with auto-formatting, section guidance, and PDF-ready export.',
  category: 'quiz',
  thumbnailEmoji: '📋',
  editorScrollTarget: '// 📋 CASE BRIEF ENGINE',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '📋 Build a professional case brief. Fill in each IRAC section and get instant formatting + guidance.',
    ctaLabel: '▶ Start Brief',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Case Brief Builder</title>
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
    @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap');
    body { margin: 0; font-family: 'Inter', sans-serif; background: #f0f2f5; }
    .legal-preview { font-family: 'Lora', 'Georgia', serif; }
    .legal-preview h1 { font-size: 1.4rem; font-weight: 700; text-align: center; margin-bottom: 0.25rem; }
    .legal-preview h2 { font-size: 0.95rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #555; padding-bottom: 3px; margin-top: 1.2rem; margin-bottom: 0.5rem; color: #222; }
    .legal-preview .citation { text-align: center; font-style: italic; color: #555; margin-bottom: 1rem; font-size: 0.9rem; }
    .legal-preview .meta-line { text-align: center; color: #666; font-size: 0.85rem; margin-bottom: 0.25rem; }
    .legal-preview p { text-indent: 2em; line-height: 1.7; margin: 0.4rem 0; font-size: 0.92rem; color: #222; }
    .legal-preview .section-empty { color: #999; font-style: italic; text-indent: 0; }
    @media print {
      body { background: white !important; }
      .no-print { display: none !important; }
      .legal-preview { padding: 0.5in !important; box-shadow: none !important; border: none !important; max-height: none !important; overflow: visible !important; }
    }
    .tooltip-trigger { position: relative; cursor: help; }
    .tooltip-trigger:hover .tooltip-box { display: block; }
    .tooltip-box { display: none; position: absolute; bottom: 100%; left: 0; background: #1e293b; color: white; padding: 8px 12px; border-radius: 6px; font-size: 0.75rem; width: 260px; z-index: 50; line-height: 1.4; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .quality-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 6px; }
    .quality-green { background: #22c55e; }
    .quality-yellow { background: #eab308; }
    .quality-red { background: #ef4444; }
    .quality-gray { background: #d1d5db; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    // 📋 CASE BRIEF ENGINE
    const { useState, useEffect, useCallback, useMemo, useRef } = React;

    // ── Section definitions with guidance + word-count thresholds ──
    const SECTIONS = [
      { key: 'facts', label: 'Facts', guidance: 'Summarize the key facts. Who are the parties? What happened? Include only legally relevant facts.', min: 50, max: 200 },
      { key: 'proceduralHistory', label: 'Procedural History', guidance: 'How did the case get to this court? Trace the path through lower courts and any prior decisions.', min: 30, max: 150 },
      { key: 'issue', label: 'Issue', guidance: 'State the legal question. Start with "Whether..." — keep to 1-3 sentences.', min: 10, max: 60 },
      { key: 'rule', label: 'Rule', guidance: 'What legal rule, statute, or precedent applies? Cite the governing law.', min: 30, max: 200 },
      { key: 'analysis', label: 'Analysis / Application', guidance: 'How does the court apply the rule to the facts? This is usually the longest section.', min: 80, max: 350 },
      { key: 'conclusion', label: 'Conclusion / Holding', guidance: 'What did the court decide? State the holding clearly and concisely.', min: 20, max: 100 },
      { key: 'reasoning', label: 'Reasoning', guidance: 'What policy rationale supports the decision? Why does this rule make sense?', min: 30, max: 200 },
      { key: 'dissent', label: 'Dissent (Optional)', guidance: 'Summarize any dissenting opinion. Who dissented and why?', min: 0, max: 200 },
    ];

    // ── Pre-loaded famous cases ──
    const FAMOUS_CASES = {
      marbury: {
        caseName: 'Marbury v. Madison',
        citation: '5 U.S. (1 Cranch) 137 (1803)',
        court: 'Supreme Court of the United States',
        year: '1803',
        judge: 'Chief Justice John Marshall',
        facts: 'William Marbury was appointed Justice of the Peace by outgoing President John Adams. The commission was signed and sealed but never delivered. When Thomas Jefferson took office, Secretary of State James Madison refused to deliver the commission. Marbury petitioned the Supreme Court directly for a writ of mandamus to compel delivery.',
        proceduralHistory: 'Marbury filed an original action directly in the Supreme Court under Section 13 of the Judiciary Act of 1789, which purported to grant the Court original jurisdiction to issue writs of mandamus.',
        issue: 'Whether the Supreme Court has original jurisdiction to issue a writ of mandamus under Section 13 of the Judiciary Act of 1789, and whether that provision conflicts with Article III of the Constitution.',
        rule: 'Article III, Section 2 of the Constitution defines the original jurisdiction of the Supreme Court. Congress cannot expand the Court\\'s original jurisdiction beyond what the Constitution prescribes. The Constitution is the supreme law, and any statute contrary to it is void.',
        analysis: 'The Court found that Marbury had a right to his commission once signed and sealed. However, the critical question was whether the Court could hear the case. Section 13 of the Judiciary Act purported to grant original jurisdiction for mandamus, but Article III limits original jurisdiction to cases involving ambassadors and states. Since Section 13 attempted to expand that jurisdiction, it conflicted with the Constitution. Marshall reasoned that the Constitution must prevail over ordinary legislation, establishing the power of judicial review.',
        conclusion: 'The Court held that Section 13 of the Judiciary Act was unconstitutional insofar as it expanded the Supreme Court\\'s original jurisdiction. The petition was denied for lack of jurisdiction.',
        reasoning: 'The Constitution is the fundamental and paramount law of the nation. It is the province and duty of the judicial department to say what the law is. A legislative act repugnant to the Constitution is void, and courts must refuse to enforce it. This principle of judicial review ensures constitutional supremacy.',
        dissent: 'There was no dissent. The decision was unanimous.',
      },
      brown: {
        caseName: 'Brown v. Board of Education',
        citation: '347 U.S. 483 (1954)',
        court: 'Supreme Court of the United States',
        year: '1954',
        judge: 'Chief Justice Earl Warren',
        facts: 'Oliver Brown and other Black parents in Topeka, Kansas filed suit after their children were denied admission to white public schools. The children were required to attend segregated schools farther from their homes. Similar cases from South Carolina, Virginia, and Delaware were consolidated.',
        proceduralHistory: 'The cases were heard in federal district courts, with mixed results. The Supreme Court granted certiorari and consolidated the cases. After initial argument, the Court ordered reargument on the question of the original understanding of the Fourteenth Amendment.',
        issue: 'Whether racial segregation of children in public schools solely on the basis of race, even where physical facilities are equal, deprives minority children of equal protection under the Fourteenth Amendment.',
        rule: 'The Equal Protection Clause of the Fourteenth Amendment prohibits states from denying any person equal protection of the laws. The "separate but equal" doctrine from Plessy v. Ferguson (1896) had previously permitted segregation where facilities were ostensibly equal.',
        analysis: 'The Court examined the effect of segregation on public education, finding that separating children by race generates a feeling of inferiority that affects motivation to learn. Modern psychological knowledge, including the Clark doll studies, demonstrated that segregation caused lasting harm. The Court found that in the field of public education, the doctrine of "separate but equal" has no place, because separate educational facilities are inherently unequal.',
        conclusion: 'The Court unanimously held that racial segregation in public schools violates the Equal Protection Clause of the Fourteenth Amendment. Plessy v. Ferguson was effectively overruled in the context of public education.',
        reasoning: 'Education is the most important function of state and local governments. Segregation with the sanction of law tends to retard educational and mental development of Black children. The opportunity of education, where the state has undertaken to provide it, is a right that must be available to all on equal terms.',
        dissent: 'There was no dissent. The decision was unanimous (9-0).',
      },
      miranda: {
        caseName: 'Miranda v. Arizona',
        citation: '384 U.S. 436 (1966)',
        court: 'Supreme Court of the United States',
        year: '1966',
        judge: 'Chief Justice Earl Warren',
        facts: 'Ernesto Miranda was arrested and interrogated by Phoenix police for two hours without being informed of his right to an attorney or his right against self-incrimination. He signed a written confession that was used against him at trial. Miranda was convicted of kidnapping and rape.',
        proceduralHistory: 'Miranda was convicted in Arizona state court. The Arizona Supreme Court affirmed. The U.S. Supreme Court granted certiorari and consolidated the case with three similar cases involving custodial interrogation without adequate warnings.',
        issue: 'Whether the Fifth Amendment\\'s protection against self-incrimination requires law enforcement to inform suspects of their rights before custodial interrogation.',
        rule: 'The Fifth Amendment provides that no person shall be compelled in any criminal case to be a witness against himself. The Sixth Amendment guarantees the right to counsel. These protections extend to custodial interrogation, which is inherently coercive.',
        analysis: 'The Court examined modern police interrogation techniques and found them inherently compelling. The atmosphere of a police-dominated interrogation undermines the privilege against self-incrimination. Without proper safeguards, no statement from custodial interrogation can truly be the product of free choice. The Court established that prior to questioning, a person must be clearly informed of the right to remain silent and the right to an attorney.',
        conclusion: 'The Court held that the prosecution may not use statements from custodial interrogation unless it demonstrates procedural safeguards to secure the Fifth Amendment privilege. Miranda\\'s conviction was reversed.',
        reasoning: 'The coercive nature of custodial interrogation requires prophylactic measures to protect constitutional rights. A suspect\\'s awareness of rights cannot be presumed — it must be affirmatively established through clear warnings.',
        dissent: 'Justice Harlan, joined by Justices Stewart and White, dissented, arguing the majority\\'s rules were not required by the Constitution and would impede law enforcement.',
      },
      roe: {
        caseName: 'Roe v. Wade',
        citation: '410 U.S. 113 (1973)',
        court: 'Supreme Court of the United States',
        year: '1973',
        judge: 'Justice Harry Blackmun',
        facts: 'Jane Roe (pseudonym for Norma McCorvey), an unmarried pregnant woman in Texas, challenged the constitutionality of the Texas criminal abortion statutes, which prohibited abortion except to save the mother\\'s life. She sought a declaratory judgment that the statutes were unconstitutional and an injunction against their enforcement.',
        proceduralHistory: 'A three-judge federal district court declared the Texas statutes unconstitutional but declined to issue an injunction. Both sides appealed directly to the Supreme Court.',
        issue: 'Whether the Constitution recognizes a woman\\'s right to terminate her pregnancy, and if so, what limits may states impose on that right.',
        rule: 'The Fourteenth Amendment\\'s concept of personal liberty encompasses a right of privacy broad enough to cover the abortion decision. However, this right is not absolute and must be balanced against state interests in protecting potential life and maternal health.',
        analysis: 'The Court surveyed historical attitudes toward abortion and found that restrictive criminal abortion laws are of relatively recent vintage. The right of privacy, grounded in the Fourteenth Amendment, is broad enough to encompass a woman\\'s decision whether to terminate a pregnancy. The Court established a trimester framework: in the first trimester, the decision is left to the woman and her physician; in the second, the state may regulate to protect maternal health; in the third, after viability, the state may proscribe abortion except where necessary to preserve the life or health of the mother.',
        conclusion: 'The Court struck down the Texas abortion statutes as unconstitutional. A woman\\'s right to choose abortion is protected under the right to privacy, subject to the trimester framework. Note: This decision was later overruled by Dobbs v. Jackson Women\\'s Health Organization (2022).',
        reasoning: 'The detriment imposed by the state on a pregnant woman by denying her this choice is substantial. The state\\'s interests grow as the pregnancy progresses, justifying increasing regulation after viability.',
        dissent: 'Justice White, joined by Justice Rehnquist, dissented, arguing the Court was exercising raw judicial power and that nothing in the Constitution supports a right to abortion.',
      },
      gideon: {
        caseName: 'Gideon v. Wainwright',
        citation: '372 U.S. 335 (1963)',
        court: 'Supreme Court of the United States',
        year: '1963',
        judge: 'Justice Hugo Black',
        facts: 'Clarence Earl Gideon was charged with breaking and entering a poolroom in Panama City, Florida, a felony under state law. Gideon appeared in court without a lawyer and requested that the court appoint counsel for him. The trial judge denied the request, stating that under Florida law, appointed counsel was only available in capital cases. Gideon represented himself, was found guilty, and sentenced to five years in prison.',
        proceduralHistory: 'Gideon filed a habeas corpus petition with the Florida Supreme Court, which denied relief. He then filed a handwritten petition for certiorari with the U.S. Supreme Court, which granted review. The Court appointed Abe Fortas (later a Supreme Court Justice) to represent Gideon.',
        issue: 'Whether the Sixth Amendment\\'s guarantee of the right to counsel in criminal cases is applicable to state court proceedings through the Fourteenth Amendment\\'s Due Process Clause.',
        rule: 'The Sixth Amendment guarantees that "in all criminal prosecutions, the accused shall enjoy the right to have the Assistance of Counsel for his defence." The Fourteenth Amendment\\'s Due Process Clause incorporates fundamental rights against state action.',
        analysis: 'The Court revisited Betts v. Brady (1942), which had held that appointed counsel was not a fundamental right in state felony cases. The Court found that reason and reflection require the recognition that the right to counsel is fundamental. Lawyers in criminal courts are necessities, not luxuries. The government hires lawyers to prosecute, and defendants who can afford it hire lawyers to defend — the widespread belief is that lawyers are essential to a fair trial.',
        conclusion: 'The Court unanimously overruled Betts v. Brady and held that the Sixth Amendment\\'s right to counsel is incorporated against the states through the Fourteenth Amendment. States must provide counsel to indigent defendants in felony cases.',
        reasoning: 'The right to be heard would be of little avail if it did not include the right to be heard by counsel. Even an intelligent layperson lacks the skill to adequately prepare a defense. The noble ideal of fair trials before impartial tribunals requires that every defendant stands equal before the law, which cannot occur without the guiding hand of counsel.',
        dissent: 'There was no dissent. The decision was unanimous (9-0). Justice Harlan wrote a concurrence emphasizing the special circumstances that had eroded Betts v. Brady over time.',
      },
    };

    // ── Word count helper ──
    function wordCount(text) {
      if (!text || !text.trim()) return 0;
      return text.trim().split(/\\s+/).length;
    }

    function getQuality(wc, min, max) {
      if (wc === 0) return 'gray';
      if (wc >= min && wc <= max) return 'green';
      if (wc >= min * 0.5 && wc <= max * 1.5) return 'yellow';
      return 'red';
    }

    function getQualityLabel(wc, min, max) {
      if (wc === 0) return 'Empty';
      if (wc < min) return 'Too short';
      if (wc > max) return 'Lengthy';
      return 'Good length';
    }

    // ── Tooltip component ──
    function Tooltip({ text, children }) {
      return (
        <span className="tooltip-trigger inline-flex items-center">
          {children}
          <span className="tooltip-box">{text}</span>
        </span>
      );
    }

    // ── Section editor component ──
    function SectionEditor({ section, value, onChange }) {
      const wc = wordCount(value);
      const quality = getQuality(wc, section.min, section.max);
      const label = getQualityLabel(wc, section.min, section.max);
      const isOptional = section.min === 0;

      return (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Tooltip text={section.guidance}>
                <label className="text-sm font-semibold text-gray-800 cursor-help flex items-center gap-1">
                  {section.label}
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </label>
              </Tooltip>
              {isOptional && <span className="text-xs text-gray-400 italic">optional</span>}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={"quality-dot quality-" + quality}></span>
              <span>{wc} words</span>
              <span className="text-gray-300">|</span>
              <span className={quality === 'green' ? 'text-green-600 font-medium' : quality === 'yellow' ? 'text-yellow-600' : quality === 'red' ? 'text-red-600' : 'text-gray-400'}>{label}</span>
              {section.min > 0 && <span className="text-gray-300">({section.min}-{section.max})</span>}
            </div>
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(section.key, e.target.value)}
            placeholder={section.guidance}
            rows={section.key === 'analysis' ? 6 : section.key === 'issue' ? 2 : 4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-y bg-white placeholder-gray-300 transition-shadow"
          />
        </div>
      );
    }

    // ── Progress tracker ──
    function ProgressTracker({ sections, data }) {
      const completed = SECTIONS.filter(s => {
        if (s.min === 0) return true;
        const wc = wordCount(data[s.key] || '');
        return wc >= s.min;
      }).length;
      const totalRequired = SECTIONS.filter(s => s.min > 0).length;
      const completedRequired = SECTIONS.filter(s => s.min > 0 && wordCount(data[s.key] || '') >= s.min).length;
      const totalWords = SECTIONS.reduce((sum, s) => sum + wordCount(data[s.key] || ''), 0);
      const pct = Math.round((completedRequired / totalRequired) * 100);

      return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 no-print">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Brief Progress</span>
            <span className="text-xs text-gray-500">{totalWords} total words</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
            <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: pct + '%', background: pct === 100 ? '#22c55e' : pct > 50 ? '#3b82f6' : '#eab308' }}></div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SECTIONS.filter(s => s.min > 0).map(s => {
              const wc = wordCount(data[s.key] || '');
              const done = wc >= s.min;
              return (
                <span key={s.key} className={"text-xs px-2 py-0.5 rounded-full " + (done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400")}>
                  {done ? '✓' : '○'} {s.label.replace(' (Optional)', '').split('/')[0].trim()}
                </span>
              );
            })}
          </div>
        </div>
      );
    }

    // ── Live preview ──
    function LivePreview({ header, data }) {
      return (
        <div className="legal-preview bg-amber-50 border border-amber-200 rounded-xl p-8 shadow-inner overflow-y-auto" style={{ maxHeight: 'calc(100vh - 100px)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            {header.caseName ? (
              <h1 className="text-gray-900">{header.caseName}</h1>
            ) : (
              <h1 className="text-gray-300 italic">Case Name</h1>
            )}
            {header.citation && <div className="citation">{header.citation}</div>}
            {(header.court || header.year) && (
              <div className="meta-line">{[header.court, header.year].filter(Boolean).join(' | ')}</div>
            )}
            {header.judge && <div className="meta-line">Opinion by: {header.judge}</div>}
            <hr style={{ margin: '1rem 0', borderColor: '#a8a29e' }} />

            {SECTIONS.map(s => {
              const text = data[s.key];
              const wc = wordCount(text);
              const isOptional = s.min === 0;
              if (isOptional && wc === 0) return null;
              return (
                <div key={s.key}>
                  <h2>{s.label.replace(' (Optional)', '')}</h2>
                  {wc > 0 ? (
                    text.split('\\n').filter(l => l.trim()).map((para, i) => <p key={i}>{para}</p>)
                  ) : (
                    <p className="section-empty">[{s.label} not yet written]</p>
                  )}
                </div>
              );
            })}

            <hr style={{ margin: '1.5rem 0', borderColor: '#a8a29e' }} />
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>
              Case brief prepared with the University of Kentucky Case Brief Builder
            </div>
          </div>
        </div>
      );
    }

    // ── Main App ──
    function App() {
      const [header, setHeader] = useState({ caseName: '', citation: '', court: '', year: '', judge: '' });
      const [data, setData] = useState(() => {
        const init = {};
        SECTIONS.forEach(s => { init[s.key] = ''; });
        return init;
      });
      const [showExamples, setShowExamples] = useState(false);

      const updateHeader = useCallback((field, value) => {
        setHeader(prev => ({ ...prev, [field]: value }));
      }, []);

      const updateSection = useCallback((key, value) => {
        setData(prev => ({ ...prev, [key]: value }));
      }, []);

      const loadExample = useCallback((caseKey) => {
        const c = FAMOUS_CASES[caseKey];
        if (!c) return;
        setHeader({ caseName: c.caseName, citation: c.citation, court: c.court, year: c.year, judge: c.judge });
        const newData = {};
        SECTIONS.forEach(s => { newData[s.key] = c[s.key] || ''; });
        setData(newData);
        setShowExamples(false);
      }, []);

      const clearAll = useCallback(() => {
        setHeader({ caseName: '', citation: '', court: '', year: '', judge: '' });
        const empty = {};
        SECTIONS.forEach(s => { empty[s.key] = ''; });
        setData(empty);
      }, []);

      const handlePrint = useCallback(() => { window.print(); }, []);

      const exampleCases = [
        { key: 'marbury', label: 'Marbury v. Madison', year: '1803', topic: 'Judicial Review' },
        { key: 'brown', label: 'Brown v. Board', year: '1954', topic: 'Equal Protection' },
        { key: 'miranda', label: 'Miranda v. Arizona', year: '1966', topic: 'Fifth Amendment' },
        { key: 'roe', label: 'Roe v. Wade', year: '1973', topic: 'Privacy / Due Process' },
        { key: 'gideon', label: 'Gideon v. Wainwright', year: '1963', topic: 'Right to Counsel' },
      ];

      return (
        <div className="min-h-screen bg-gray-50">
          {/* Header bar */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 no-print sticky top-0 z-40">
            <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h1 className="text-lg font-extrabold text-gray-900 leading-tight">Case Brief Builder</h1>
                  <p className="text-xs text-gray-500">Structured IRAC format with live preview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowExamples(!showExamples)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition-colors">
                  📚 Load Example
                </button>
                <button onClick={clearAll} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium transition-colors">
                  🗑 Clear
                </button>
                <button onClick={handlePrint} className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors">
                  🖨 Print / PDF
                </button>
              </div>
            </div>
          </div>

          {/* Example cases dropdown */}
          {showExamples && (
            <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 no-print">
              <div className="max-w-screen-2xl mx-auto">
                <p className="text-xs font-semibold text-blue-800 mb-2">Quick-load a landmark case:</p>
                <div className="flex flex-wrap gap-2">
                  {exampleCases.map(c => (
                    <button key={c.key} onClick={() => loadExample(c.key)} className="text-xs px-3 py-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors text-left">
                      <span className="font-semibold text-gray-800">{c.label}</span>
                      <span className="text-gray-400 ml-1">({c.year})</span>
                      <br />
                      <span className="text-blue-600">{c.topic}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main split layout */}
          <div className="max-w-screen-2xl mx-auto flex gap-4 p-4" style={{ minHeight: 'calc(100vh - 60px)' }}>
            {/* Left: Form */}
            <div className="w-1/2 no-print overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 80px)' }}>
              <ProgressTracker sections={SECTIONS} data={data} />

              {/* Case header */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                  <span>⚖️</span> Case Information
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Case Name</label>
                    <input value={header.caseName} onChange={e => updateHeader('caseName', e.target.value)} placeholder='e.g., Marbury v. Madison' className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Citation</label>
                    <input value={header.citation} onChange={e => updateHeader('citation', e.target.value)} placeholder='e.g., 5 U.S. 137 (1803)' className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Court</label>
                    <input value={header.court} onChange={e => updateHeader('court', e.target.value)} placeholder='e.g., SCOTUS' className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Year</label>
                    <input value={header.year} onChange={e => updateHeader('year', e.target.value)} placeholder='e.g., 1803' className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Authoring Judge</label>
                    <input value={header.judge} onChange={e => updateHeader('judge', e.target.value)} placeholder='e.g., Chief Justice John Marshall' className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                  </div>
                </div>
              </div>

              {/* IRAC sections */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                  <span>📝</span> IRAC Sections
                </h3>
                {SECTIONS.map(s => (
                  <SectionEditor key={s.key} section={s} value={data[s.key]} onChange={updateSection} />
                ))}
              </div>
            </div>

            {/* Right: Preview */}
            <div className="w-1/2">
              <div className="sticky top-16">
                <div className="flex items-center justify-between mb-2 no-print">
                  <span className="text-sm font-semibold text-gray-600">📄 Live Preview</span>
                  <span className="text-xs text-gray-400">Updates as you type</span>
                </div>
                <LivePreview header={header} data={data} />
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
