import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'moot-court',
  title: 'Constitutional Law Moot Court',
  description:
    'IRAC-structured legal argument builder with keyword scoring, precedent analysis, and opposition rebuttal.',
  category: 'quiz',
  thumbnailEmoji: '⚖️',
  editorScrollTarget: '// ⚖️ IRAC SCORING ENGINE',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '⚖️ Read the case, write your argument using IRAC structure, then submit for scoring.',
    ctaLabel: '▶ Read the Case',
    ctaPulseDurationMs: 25000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Constitutional Law Moot Court</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>
    // Error capture — posts runtime errors to parent window
    window.onerror = function(msg, src, line, col, err) {
      window.parent.postMessage({ type: 'runtime-error', message: String(msg), source: src, line: line, column: col }, '*');
    };
    window.onunhandledrejection = function(e) {
      window.parent.postMessage({ type: 'runtime-error', message: String(e.reason) }, '*');
    };
  <\/script>
  <style>
    body {
      margin: 0;
      background: #faf9f7;
      color: #1a1a2e;
      font-family: Georgia, 'Times New Roman', serif;
    }
    .parchment-bg {
      background: linear-gradient(135deg, #faf9f7 0%, #f5f0e8 50%, #faf9f7 100%);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(100%); }
      to { opacity: 1; transform: translateX(0); }
    }
    .fade-in { animation: fadeIn 0.5s ease-out forwards; }
    .slide-in-right { animation: slideInRight 0.4s ease-out forwards; }
    .score-ring-transition { transition: stroke-dashoffset 1.2s ease-out; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback, useMemo } = React;

    // ============================================================
    // CASE DATA
    // ============================================================

    const CASE = {
      title: 'Mercer v. State University',
      docket: 'No. 24-1847',
      court: 'United States District Court, Eastern District',
      facts: [
        'Jordan Mercer is a sophomore student athlete on the women\\'s soccer team at State University, a public institution receiving federal funding.',
        'On September 15, Mercer posted a TikTok video from her personal account, recorded off-campus on her own time, criticizing University President David Harmon\\'s handling of Name, Image, and Likeness (NIL) policy. The video stated: "Our president doesn\\'t care about athletes. The NIL policy here is a joke compared to every other school in the conference. We deserve better leadership."',
        'The video received approximately 340,000 views and was covered by local media outlets.',
        'On September 22, Athletic Director Lynn Caldwell suspended Mercer from the next two games, citing Section 4.7 of the Student-Athlete Code of Conduct: "Conduct detrimental to the reputation of the athletic program."',
        'Mercer was not given a hearing prior to the suspension. The university\\'s general student conduct code does not prohibit criticism of university officials.',
        'Mercer filed suit under 42 U.S.C. § 1983, alleging the suspension violated her First Amendment right to free speech. She seeks injunctive relief (immediate reinstatement) and declaratory judgment that Section 4.7 is unconstitutionally overbroad as applied to off-campus speech.',
      ],
      precedents: [
        { name: 'Tinker v. Des Moines (1969)', holding: 'Students do not shed constitutional rights at the schoolhouse gate. Speech may only be restricted if it causes material and substantial disruption.' },
        { name: 'Garcetti v. Ceballos (2006)', holding: 'Government employees speaking pursuant to official duties are not protected by the First Amendment. However, this applies to employee speech, not student speech.' },
        { name: 'Mahanoy Area School District v. B.L. (2021)', holding: 'Schools have diminished authority to regulate off-campus student speech. Off-campus speech receives stronger First Amendment protection.' },
      ],
    };

    // ============================================================
    // PRE-FILLED DEMO ARGUMENT (~72/100)
    // ============================================================

    const DEMO_ARGUMENT = {
      issue: 'The central issue is whether a public university violated a student athlete\\'s First Amendment right to free speech by suspending her from athletic competition after she posted a TikTok video criticizing the university president\\'s NIL policy. Does the First Amendment protect off-campus social media speech by student athletes at public universities?',
      rule: 'Under Tinker v. Des Moines (1969), students retain First Amendment rights and schools may only restrict speech that causes "material and substantial disruption" to school operations. In Garcetti v. Ceballos (2006), the Supreme Court held that government employees speaking in their official capacity are not protected, but this doctrine applies to employee speech rather than student expression. Public universities are state actors bound by the First Amendment, and student speech on matters of public concern receives heightened protection.',
      application: 'Mercer\\'s TikTok was posted from her personal account, off-campus, on her own time, addressing NIL policy which is a matter of legitimate public concern in collegiate athletics. The university has not demonstrated that Mercer\\'s speech caused any material and substantial disruption to the soccer program or university operations. The 340,000 views and media coverage reflect public interest, not disruption. Section 4.7\\'s "conduct detrimental" standard is vague and gives administrators unbridled discretion to punish speech they find unfavorable. The suspension was imposed without a hearing, raising additional due process concerns.',
      conclusion: 'The court should find that Mercer\\'s suspension violates the First Amendment. The university\\'s action constitutes unconstitutional retaliation for protected speech.',
    };

    // ============================================================
    // ⚖️ IRAC SCORING ENGINE
    // ============================================================

    function scoreIssue(text) {
      const lower = text.toLowerCase();
      const words = text.split(/\\s+/).length;
      let raw = 0;

      // Base points for length
      if (words > 20) raw += 40;
      else if (words > 10) raw += 20;

      // Keywords
      const keywords = ['first amendment', 'free speech', 'state actor', 'student athlete'];
      keywords.forEach(kw => {
        if (lower.includes(kw)) raw += 15;
      });

      // Framed as question
      if (text.includes('?')) raw += 10;

      return {
        raw: Math.min(raw, 100),
        scaled: Math.min(raw, 100) * 0.25,
        feedback: raw >= 80
          ? 'Strong issue statement that clearly frames the constitutional question.'
          : raw >= 50
          ? 'Adequate framing but could be sharper. Consider whether you\\'ve identified all parties and rights at stake.'
          : 'Issue statement needs more specificity. Frame the precise constitutional question before the court.',
      };
    }

    function scoreRule(text) {
      const lower = text.toLowerCase();
      let raw = 0;

      // Citations
      if (lower.includes('tinker')) raw += 20;
      if (lower.includes('mahanoy')) raw += 25;
      if (lower.includes('garcetti')) raw += 15;

      // Legal standards
      if (lower.includes('material and substantial disruption')) raw += 15;
      if (lower.includes('off-campus speech') || lower.includes('off campus speech')) raw += 15;

      // Multiple precedents bonus
      const cites = [lower.includes('tinker'), lower.includes('mahanoy'), lower.includes('garcetti')].filter(Boolean).length;
      if (cites >= 2) raw += 10;

      return {
        raw: Math.min(raw, 100),
        scaled: Math.min(raw, 100) * 0.25,
        feedback: raw >= 80
          ? 'Excellent citation of controlling precedent with clear articulation of legal standards.'
          : raw >= 50
          ? 'Good foundation but missing key precedent. Consider Mahanoy v. B.L. for off-campus speech doctrine.'
          : 'Insufficient legal authority. You must cite controlling precedent and articulate the applicable legal standard.',
      };
    }

    function scoreApplication(text) {
      const lower = text.toLowerCase();
      let raw = 0;

      // References to case facts
      if (lower.includes('tiktok')) raw += 10;
      if (lower.includes('nil')) raw += 10;
      if (lower.includes('suspension') || lower.includes('suspended')) raw += 10;
      if (lower.includes('conduct detrimental')) raw += 10;

      // Applies legal standard
      if (lower.includes('disruption') || lower.includes('material') || lower.includes('substantial')) raw += 15;

      // Considers counterarguments
      if (lower.includes('however') || lower.includes('on the other hand') || lower.includes('university argues') || lower.includes('counterargument')) raw += 15;

      // Depth bonus
      const words = text.split(/\\s+/).length;
      if (words > 80) raw += 15;
      else if (words > 40) raw += 8;

      return {
        raw: Math.min(raw, 100),
        scaled: Math.min(raw, 100) * 0.30,
        feedback: raw >= 80
          ? 'Thorough application connecting law to facts with consideration of counterarguments.'
          : raw >= 50
          ? 'Reasonable analysis but doesn\\'t fully engage with opposing arguments. Address the university\\'s position.'
          : 'Application is too conclusory. You must systematically apply each legal element to the specific facts.',
      };
    }

    function scoreConclusion(text) {
      const lower = text.toLowerCase();
      let raw = 0;

      // Clear holding
      const holdingWords = ['should', 'must', 'violates', 'unconstitutional', 'constitutional', 'finds', 'holds'];
      holdingWords.forEach(w => {
        if (lower.includes(w)) raw += 20;
      });
      raw = Math.min(raw, 20); // cap holding at 20

      // Consistency / substance
      const words = text.split(/\\s+/).length;
      if (words > 30) raw += 10;

      // Addresses remedy
      if (lower.includes('reinstate') || lower.includes('reinstatement')) raw += 20;
      if (lower.includes('damages')) raw += 20;
      if (lower.includes('injunction') || lower.includes('injunctive')) raw += 20;
      // cap remedy at 20
      const remedyScore = [
        lower.includes('reinstate') || lower.includes('reinstatement'),
        lower.includes('damages'),
        lower.includes('injunction') || lower.includes('injunctive'),
      ].filter(Boolean).length;
      raw = Math.min(20, raw - (remedyScore > 1 ? (remedyScore - 1) * 20 : 0)) + (remedyScore > 0 ? 20 : 0) + (words > 30 ? 10 : 0);

      // Simplified: recalculate cleanly
      let clean = 0;
      if (holdingWords.some(w => lower.includes(w))) clean += 20;
      if (words > 30) clean += 10;
      if (lower.includes('reinstate') || lower.includes('reinstatement') || lower.includes('damages') || lower.includes('injunction') || lower.includes('injunctive')) clean += 20;

      return {
        raw: Math.min(clean, 100),
        scaled: Math.min(clean, 100) * 0.20,
        feedback: clean >= 80
          ? 'Clear holding with appropriate remedy. Well-structured conclusion.'
          : clean >= 40
          ? 'Conclusion states a holding but lacks specificity on remedy. What relief should the court grant?'
          : 'Conclusion is too brief. State your holding clearly and specify the appropriate remedy.',
      };
    }

    function computeOverallGrade(total) {
      if (total >= 97) return 'A+';
      if (total >= 93) return 'A';
      if (total >= 90) return 'A-';
      if (total >= 87) return 'B+';
      if (total >= 83) return 'B';
      if (total >= 80) return 'B-';
      if (total >= 77) return 'C+';
      if (total >= 73) return 'C';
      if (total >= 70) return 'C-';
      if (total >= 67) return 'D+';
      if (total >= 63) return 'D';
      if (total >= 60) return 'D-';
      return 'F';
    }

    // ============================================================
    // OPPOSITION RESPONSES
    // ============================================================

    const OPPOSITION_RESPONSES = {
      issue: {
        title: 'Opposition: Issue Framing is Incomplete',
        text: 'Opposing counsel notes that the issue statement fails to address the university\\'s legitimate interest in maintaining team discipline and cohesion. The proper framing must balance the student\\'s speech rights against the institution\\'s authority to set conduct standards for voluntary extracurricular participants. Mercer was not expelled or academically penalized — she was temporarily removed from an athletic team she voluntarily joined, subject to its rules.',
      },
      rule: {
        title: 'Opposition: Incomplete Legal Framework',
        text: 'Counsel for State University argues that the rule section omits critical authority. The Mahanoy decision, while protecting off-campus speech, explicitly acknowledged that schools retain some authority over off-campus conduct affecting team operations. Furthermore, courts have recognized that participation in intercollegiate athletics is a privilege, not a right, and that student-athletes may be held to higher conduct standards than the general student body. See NCAA v. Alston (2021); Lowery v. Euverard (4th Cir. 2007).',
      },
      application: {
        title: 'Opposition: One-Sided Analysis',
        text: 'The university contends this analysis ignores material facts. Mercer\\'s video, viewed 340,000 times, generated media scrutiny that disrupted recruiting efforts, caused internal team friction, and forced the athletic department to divert resources to public relations. The "conduct detrimental" standard is not uniquely vague — similar provisions have been upheld in professional and collegiate athletic contexts. The absence of a pre-suspension hearing, while procedurally imperfect, does not negate the university\\'s substantive authority over team membership decisions.',
      },
      conclusion: {
        title: 'Opposition: Remedy is Disproportionate',
        text: 'Even if the court finds a First Amendment violation, the requested relief is overbroad. A two-game suspension is a modest, time-limited consequence — not an ongoing deprivation warranting injunctive relief. The court should consider that declaring Section 4.7 unconstitutional as-applied would strip all public university athletic programs of their ability to maintain conduct standards, creating a chilling effect on institutional governance of voluntary extracurricular programs.',
      },
    };

    // ============================================================
    // UI COMPONENTS
    // ============================================================

    function CaseHeader() {
      return (
        <div className="text-center py-6 fade-in">
          <div style={{
            width: 72, height: 72, borderRadius: '50%', border: '3px solid #0033A0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: 32, background: 'linear-gradient(135deg, #f0f0ff, #e8e0d8)',
          }}>
            ⚖️
          </div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>
            United States District Court, Eastern District
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', margin: '4px 0' }}>
            Mercer v. State University
          </h1>
          <div style={{ fontSize: 13, color: '#888' }}>No. 24-1847</div>
          <div style={{ width: 80, height: 2, background: '#0033A0', margin: '12px auto 0', borderRadius: 1 }}></div>
        </div>
      );
    }

    function FactPattern({ facts, precedents }) {
      return (
        <div className="fade-in" style={{ animationDelay: '0.1s' }}>
          <div style={{
            background: 'linear-gradient(135deg, #fdfcfa, #f5f0e8)',
            border: '1px solid #e0d8c8',
            borderRadius: 12, padding: '20px 24px', marginBottom: 16,
          }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 12, marginTop: 0 }}>
              Statement of Facts
            </h2>
            <div style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 8 }}>
              {facts.map((fact, i) => (
                <p key={i} style={{ fontSize: 14, lineHeight: 1.7, color: '#333', marginBottom: 10 }}>
                  <span style={{ color: '#0033A0', fontWeight: 'bold', marginRight: 4 }}>{i + 1}.</span>
                  {fact}
                </p>
              ))}
            </div>
          </div>

          <div style={{
            background: '#fdfcfa', border: '1px solid #e0d8c8',
            borderRadius: 12, padding: '16px 24px',
          }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 10, marginTop: 0 }}>
              Relevant Precedent
            </h3>
            {precedents.map((p, i) => (
              <div key={i} style={{ marginBottom: i < precedents.length - 1 ? 10 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 'bold', color: '#0033A0' }}>{p.name}</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{p.holding}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    function IracEditor({ sections, onChange, onSubmit, disabled }) {
      const sectionConfig = [
        { key: 'issue', label: 'Issue', pts: 25, placeholder: 'Frame the constitutional question...' },
        { key: 'rule', label: 'Rule', pts: 25, placeholder: 'Cite applicable precedent and legal standards...' },
        { key: 'application', label: 'Application', pts: 30, placeholder: 'Apply the law to the facts of this case...' },
        { key: 'conclusion', label: 'Conclusion', pts: 20, placeholder: 'State your holding and recommended remedy...' },
      ];

      return (
        <div className="fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16, marginTop: 24 }}>
            Your Argument (IRAC Method)
          </h2>
          {sectionConfig.map(sec => {
            const wordCount = (sections[sec.key] || '').trim().split(/\\s+/).filter(Boolean).length;
            return (
              <div key={sec.key} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 'bold', color: '#1a1a2e' }}>
                    {sec.label}
                  </label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{
                      fontSize: 11, background: '#0033A0', color: '#fff',
                      padding: '2px 8px', borderRadius: 10, fontFamily: 'system-ui, sans-serif',
                    }}>
                      {sec.pts} pts
                    </span>
                    <span style={{ fontSize: 11, color: '#888', fontFamily: 'system-ui, sans-serif' }}>
                      {wordCount} words
                    </span>
                  </div>
                </div>
                <textarea
                  value={sections[sec.key] || ''}
                  onChange={e => onChange(sec.key, e.target.value)}
                  disabled={disabled}
                  placeholder={sec.placeholder}
                  rows={sec.key === 'application' ? 6 : 4}
                  style={{
                    width: '100%', padding: '12px 14px', fontSize: 14, lineHeight: 1.6,
                    fontFamily: 'Georgia, serif', color: '#1a1a2e',
                    border: '1px solid #d0c8b8', borderRadius: 8,
                    background: disabled ? '#f0ede6' : '#fff',
                    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => { if (!disabled) e.target.style.borderColor = '#0033A0'; }}
                  onBlur={e => { e.target.style.borderColor = '#d0c8b8'; }}
                />
              </div>
            );
          })}
          {!disabled && (
            <button
              onClick={onSubmit}
              style={{
                display: 'block', width: '100%', padding: '14px 0',
                background: '#0033A0', color: '#fff', border: 'none',
                borderRadius: 10, fontSize: 16, fontWeight: 'bold',
                fontFamily: 'Georgia, serif', cursor: 'pointer',
                letterSpacing: 0.5, marginTop: 8,
              }}
              onMouseOver={e => e.target.style.background = '#002680'}
              onMouseOut={e => e.target.style.background = '#0033A0'}
            >
              Submit Argument for Scoring
            </button>
          )}
        </div>
      );
    }

    function ScoreRing({ label, pts, score, maxPts, feedback, delay }) {
      const [animatedScore, setAnimatedScore] = useState(0);
      const pct = Math.round(score / maxPts * 100);
      const radius = 34;
      const circumference = 2 * Math.PI * radius;

      useEffect(() => {
        const timer = setTimeout(() => setAnimatedScore(pct), delay);
        return () => clearTimeout(timer);
      }, [pct, delay]);

      const offset = circumference - (animatedScore / 100) * circumference;
      const ringColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444';

      return (
        <div style={{ textAlign: 'center', flex: 1, minWidth: 100 }}>
          <svg width={80} height={80} viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={radius} fill="none" stroke="#e5e0d5" strokeWidth="6" />
            <circle
              cx="40" cy="40" r={radius} fill="none"
              stroke={ringColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="score-ring-transition"
              transform="rotate(-90 40 40)"
            />
            <text x="40" y="38" textAnchor="middle" style={{ fontSize: 16, fontWeight: 'bold', fill: '#1a1a2e', fontFamily: 'system-ui, sans-serif' }}>
              {Math.round(score)}
            </text>
            <text x="40" y="52" textAnchor="middle" style={{ fontSize: 10, fill: '#888', fontFamily: 'system-ui, sans-serif' }}>
              / {maxPts}
            </text>
          </svg>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#1a1a2e', marginTop: 4, fontFamily: 'Georgia, serif' }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 4, lineHeight: 1.4, fontFamily: 'system-ui, sans-serif', padding: '0 4px' }}>
            {feedback}
          </div>
        </div>
      );
    }

    function ScorePanel({ scores }) {
      const total = scores.issue.scaled + scores.rule.scaled + scores.application.scaled + scores.conclusion.scaled;
      const grade = computeOverallGrade(total);
      const gradeColor = total >= 80 ? '#22c55e' : total >= 60 ? '#eab308' : '#ef4444';

      return (
        <div className="fade-in" style={{
          background: 'linear-gradient(135deg, #fdfcfa, #f5f0e8)',
          border: '1px solid #e0d8c8', borderRadius: 12, padding: '24px', marginTop: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', margin: 0 }}>
              Judicial Evaluation
            </h2>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, fontWeight: 'bold', color: gradeColor, fontFamily: 'Georgia, serif', lineHeight: 1 }}>
                {grade}
              </div>
              <div style={{ fontSize: 12, color: '#888', fontFamily: 'system-ui, sans-serif' }}>
                {Math.round(total)} / 100
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-around', flexWrap: 'wrap' }}>
            <ScoreRing label="Issue" pts={25} score={scores.issue.scaled} maxPts={25} feedback={scores.issue.feedback} delay={200} />
            <ScoreRing label="Rule" pts={25} score={scores.rule.scaled} maxPts={25} feedback={scores.rule.feedback} delay={400} />
            <ScoreRing label="Application" pts={30} score={scores.application.scaled} maxPts={30} feedback={scores.application.feedback} delay={600} />
            <ScoreRing label="Conclusion" pts={20} score={scores.conclusion.scaled} maxPts={20} feedback={scores.conclusion.feedback} delay={800} />
          </div>

          <div style={{ width: '100%', height: 1, background: '#d0c8b8', margin: '20px 0 12px' }}></div>
          <div style={{ fontSize: 12, color: '#888', textAlign: 'center', fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
            Scoring is based on keyword heuristics: precedent citations, fact references, legal standards, and structural completeness.
          </div>
        </div>
      );
    }

    function OppositionPanel({ scores, show }) {
      if (!show) return null;

      // Find weakest section
      const sectionScores = [
        { key: 'issue', pct: scores.issue.raw },
        { key: 'rule', pct: scores.rule.raw },
        { key: 'application', pct: scores.application.raw },
        { key: 'conclusion', pct: scores.conclusion.raw },
      ];
      sectionScores.sort((a, b) => a.pct - b.pct);
      const weakest = sectionScores[0].key;
      const opp = OPPOSITION_RESPONSES[weakest];

      return (
        <div className="slide-in-right" style={{
          background: 'linear-gradient(135deg, #fdf2f2, #fef8f0)',
          border: '2px solid #c0392b', borderRadius: 12, padding: '20px 24px', marginTop: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>⚔️</span>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 'bold', color: '#c0392b', margin: 0 }}>
              {opp.title}
            </h3>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#333', margin: 0 }}>
            {opp.text}
          </p>
          <div style={{ marginTop: 12, fontSize: 12, color: '#888', fontStyle: 'italic', fontFamily: 'system-ui, sans-serif' }}>
            Targeting your weakest section: {weakest.charAt(0).toUpperCase() + weakest.slice(1)} ({sectionScores[0].pct}% raw score)
          </div>
        </div>
      );
    }

    // ============================================================
    // APP COMPONENT
    // ============================================================

    function App() {
      const [phase, setPhase] = useState('READING'); // READING → WRITING → SCORED → OPPOSITION
      const [sections, setSections] = useState({
        issue: DEMO_ARGUMENT.issue,
        rule: DEMO_ARGUMENT.rule,
        application: DEMO_ARGUMENT.application,
        conclusion: DEMO_ARGUMENT.conclusion,
      });
      const [scores, setScores] = useState(null);
      const [showOpposition, setShowOpposition] = useState(false);

      function handleStartWriting() {
        setPhase('WRITING');
      }

      function handleChange(key, value) {
        setSections(prev => ({ ...prev, [key]: value }));
      }

      function handleSubmit() {
        const result = {
          issue: scoreIssue(sections.issue),
          rule: scoreRule(sections.rule),
          application: scoreApplication(sections.application),
          conclusion: scoreConclusion(sections.conclusion),
        };
        setScores(result);
        setPhase('SCORED');
      }

      function handleShowOpposition() {
        setShowOpposition(true);
        setPhase('OPPOSITION');
      }

      return (
        <div className="parchment-bg" style={{ minHeight: '100vh' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '8px 20px 40px' }}>
            <CaseHeader />

            {/* Decorative rule */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px' }}>
              <div style={{ flex: 1, height: 1, background: '#d0c8b8' }}></div>
              <span style={{ fontSize: 11, color: '#aaa', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>
                Case Materials
              </span>
              <div style={{ flex: 1, height: 1, background: '#d0c8b8' }}></div>
            </div>

            <FactPattern facts={CASE.facts} precedents={CASE.precedents} />

            {phase === 'READING' && (
              <div className="fade-in" style={{ textAlign: 'center', marginTop: 24 }}>
                <button
                  onClick={handleStartWriting}
                  style={{
                    padding: '14px 40px', background: '#0033A0', color: '#fff',
                    border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 'bold',
                    fontFamily: 'Georgia, serif', cursor: 'pointer', letterSpacing: 0.5,
                  }}
                  onMouseOver={e => e.target.style.background = '#002680'}
                  onMouseOut={e => e.target.style.background = '#0033A0'}
                >
                  Begin Your Argument
                </button>
                <p style={{ fontSize: 12, color: '#888', marginTop: 8, fontFamily: 'system-ui, sans-serif' }}>
                  Review the facts and precedent above, then write your IRAC analysis.
                </p>
              </div>
            )}

            {(phase === 'WRITING' || phase === 'SCORED' || phase === 'OPPOSITION') && (
              <IracEditor
                sections={sections}
                onChange={handleChange}
                onSubmit={handleSubmit}
                disabled={phase !== 'WRITING'}
              />
            )}

            {scores && (phase === 'SCORED' || phase === 'OPPOSITION') && (
              <ScorePanel scores={scores} />
            )}

            {phase === 'SCORED' && scores && !showOpposition && (
              <div className="fade-in" style={{ textAlign: 'center', marginTop: 20 }}>
                <button
                  onClick={handleShowOpposition}
                  style={{
                    padding: '12px 32px', background: '#fff', color: '#c0392b',
                    border: '2px solid #c0392b', borderRadius: 10, fontSize: 15,
                    fontWeight: 'bold', fontFamily: 'Georgia, serif', cursor: 'pointer',
                  }}
                  onMouseOver={e => { e.target.style.background = '#c0392b'; e.target.style.color = '#fff'; }}
                  onMouseOut={e => { e.target.style.background = '#fff'; e.target.style.color = '#c0392b'; }}
                >
                  ⚔️ Hear the Opposition
                </button>
              </div>
            )}

            {scores && <OppositionPanel scores={scores} show={showOpposition} />}
          </div>
        </div>
      );
    }

    // ============================================================
    // MOUNT
    // ============================================================

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  <\/script>
</body>
</html>`;
