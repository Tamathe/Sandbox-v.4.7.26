import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'statute-annotator',
  title: 'Statute Annotator',
  description: 'Highlight and annotate statutory text with color-coded argument types, margin notes, and localStorage persistence.',
  category: 'training',
  thumbnailEmoji: '📜',
  editorScrollTarget: '// 📜 ANNOTATION ENGINE',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '📜 Select text to highlight it. Choose argument type and add margin annotations.',
    ctaLabel: '▶ Start Annotating',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Statute Annotator</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap');
    .statute-text { font-family: 'Merriweather', Georgia, serif; line-height: 1.9; }
    .ui-text { font-family: 'Inter', system-ui, sans-serif; }
    .highlight-green { background-color: rgba(34, 197, 94, 0.3); border-bottom: 2px solid #22c55e; cursor: pointer; }
    .highlight-red { background-color: rgba(239, 68, 68, 0.3); border-bottom: 2px solid #ef4444; cursor: pointer; }
    .highlight-yellow { background-color: rgba(234, 179, 8, 0.3); border-bottom: 2px solid #eab308; cursor: pointer; }
    .highlight-blue { background-color: rgba(59, 130, 246, 0.3); border-bottom: 2px solid #3b82f6; cursor: pointer; }
    .highlight-purple { background-color: rgba(168, 85, 247, 0.3); border-bottom: 2px solid #a855f7; cursor: pointer; }
    .margin-connector { position: absolute; right: -20px; width: 20px; height: 2px; top: 50%; }
    @media print {
      .no-print { display: none !important; }
      .print-break { page-break-before: always; }
      body { font-size: 11pt; }
      .statute-text { line-height: 1.6; }
    }
  </style>
  <script>
    window.addEventListener('error', function(e) {
      var el = document.getElementById('error-display');
      if (el) { el.textContent = e.message + ' (line ' + e.lineno + ')'; el.style.display = 'block'; }
    });
  <\/script>
</head>
<body class="bg-stone-50 min-h-screen ui-text">
  <div id="error-display" style="display:none;position:fixed;top:0;left:0;right:0;background:#fee2e2;color:#991b1b;padding:12px;z-index:9999;font-size:14px;"><\/div>
  <div id="root"><\/div>

  <script type="text/babel">
    // 📜 ANNOTATION ENGINE
    const { useState, useEffect, useRef, useCallback, useMemo } = React;

    // ── Annotation type definitions ──
    const ANNOTATION_TYPES = [
      { key: 'supports', label: 'Supports argument', color: 'green', bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', highlightClass: 'highlight-green' },
      { key: 'weakens', label: 'Weakens argument', color: 'red', bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800', highlightClass: 'highlight-red' },
      { key: 'definition', label: 'Key definition', color: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800', highlightClass: 'highlight-yellow' },
      { key: 'procedural', label: 'Procedural requirement', color: 'blue', bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', highlightClass: 'highlight-blue' },
      { key: 'ambiguous', label: 'Ambiguous', color: 'purple', bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800', highlightClass: 'highlight-purple' },
    ];

    // ── Fictional statute texts ──
    const SAMPLE_STATUTES = [
      {
        id: 'property-transfer',
        title: 'Property Transfer Act \u00A7 4 — Conveyance Requirements',
        paragraphs: [
          '\u00A7 4.01. Definitions. For the purposes of this section, "conveyance" shall mean any transfer, grant, assignment, or encumbrance of real property interest, whether by deed, lease exceeding ninety-nine (99) years, or equitable assignment. "Qualified transferee" shall mean any natural person, domestic corporation, or registered trust entity that has filed a Statement of Capacity with the County Recorder no fewer than thirty (30) days prior to the proposed transfer date.',
          '\u00A7 4.02. Required Documentation. No conveyance of real property shall be deemed effective unless accompanied by: (a) a certified survey completed within the preceding twenty-four (24) months; (b) a title abstract demonstrating an unbroken chain of ownership for no fewer than fifty (50) years; (c) evidence of compliance with all applicable environmental disclosure requirements under Chapter 7 of this Act; and (d) a notarized affidavit of consideration stating the true and complete consideration exchanged.',
          '\u00A7 4.03. Recording and Priority. A conveyance that satisfies the requirements of \u00A7 4.02 shall be recorded with the County Recorder within fourteen (14) business days of execution. Failure to record within the prescribed period shall not render the conveyance void between the parties, but shall subordinate the interest of the grantee to any subsequent bona fide purchaser who records first without actual or constructive notice of the prior unrecorded conveyance.',
          '\u00A7 4.04. Remedies for Defective Conveyance. Where a conveyance is found to be defective by reason of non-compliance with any provision of this section, the aggrieved party may petition the Circuit Court for an order of reformation, provided that such petition is filed within three (3) years of the date on which the defect was discovered or reasonably should have been discovered. The court may, in its discretion, award reasonable attorney fees to the prevailing party.',
        ],
      },
      {
        id: 'digital-privacy',
        title: 'Digital Privacy Protection Act \u00A7 12 — Data Collection Restrictions',
        paragraphs: [
          '\u00A7 12.01. Scope and Applicability. This section shall apply to any covered entity that collects, processes, stores, or transmits personally identifiable digital information of more than five thousand (5,000) residents of this Commonwealth within any consecutive twelve-month period. "Personally identifiable digital information" includes, but is not limited to, biometric identifiers, geolocation data with precision of one hundred (100) meters or less, browsing histories, and algorithmic profiles derived from aggregated behavioral data.',
          '\u00A7 12.02. Consent Requirements. Prior to the collection of any personally identifiable digital information, a covered entity shall obtain affirmative, informed consent from the data subject through a mechanism that is clearly distinguishable from other interface elements and that does not employ dark patterns, pre-checked boxes, or consent bundling. The consent mechanism must disclose in plain language: (a) the specific categories of data to be collected; (b) the purpose or purposes for which each category will be used; (c) the identity of all third parties with whom the data will be shared; and (d) the retention period for each data category.',
          '\u00A7 12.03. Data Minimization. A covered entity shall collect only such personally identifiable digital information as is strictly necessary and proportionate to the stated purpose disclosed under \u00A7 12.02. Any data collected that exceeds the scope of the stated purpose shall be deleted within seventy-two (72) hours of collection, and the covered entity shall maintain an auditable log of all such deletions.',
          '\u00A7 12.04. Enforcement and Penalties. Any covered entity found to have violated this section shall be subject to a civil penalty not exceeding fifty thousand dollars ($50,000) per violation per day, with each affected data subject constituting a separate violation. The Attorney General shall have exclusive authority to bring enforcement actions under this section, except that individual data subjects may bring a private right of action where actual damages can be demonstrated.',
        ],
      },
      {
        id: 'fair-commerce',
        title: 'Fair Commerce Regulation Act, Art. 3 — Prohibited Trade Practices',
        paragraphs: [
          'Art. 3.1. Unfair Competitive Practices. It shall be unlawful for any commercial entity operating within this jurisdiction to engage in predatory pricing, defined as the sustained offering of goods or services below marginal cost with the demonstrable intent or foreseeable effect of eliminating competition in a relevant market. The burden of establishing predatory intent shall rest with the complaining party, who must demonstrate by a preponderance of evidence that the respondent had a reasonable prospect of recouping losses through subsequent supracompetitive pricing.',
          'Art. 3.2. Supply Chain Transparency. Every commercial entity with annual gross revenues exceeding ten million dollars ($10,000,000) shall publish, no later than ninety (90) days following the close of each fiscal year, a Supply Chain Disclosure Report identifying: (a) all first-tier suppliers; (b) the country of origin for each component or ingredient constituting more than five percent (5%) of the finished product by value; (c) any labor certifications or audits conducted during the reporting period; and (d) any known instances of subcontracting to entities not identified in prior reports.',
          'Art. 3.3. Consumer Protection Provisions. No commercial entity shall engage in deceptive advertising, which for purposes of this article includes any material omission, misleading representation, or false implication regarding the characteristics, origin, certification, or endorsement of goods or services. Where a claim of environmental sustainability or ethical sourcing is made, the commercial entity must maintain documentation sufficient to substantiate such claim and make it available for inspection upon request.',
          'Art. 3.4. Administrative Proceedings. The Commerce Commission shall have authority to initiate administrative proceedings against any entity suspected of violating this article. Proceedings shall be conducted in accordance with the Administrative Procedure Act, and respondents shall be afforded full rights of cross-examination and presentation of evidence. Penalties may include fines of up to one hundred thousand dollars ($100,000) per violation and mandatory corrective advertising.',
        ],
      },
      {
        id: 'student-rights',
        title: 'Student Rights and Responsibilities Code \u00A7 8 — Academic Integrity',
        paragraphs: [
          '\u00A7 8.01. Statement of Principle. Academic integrity is foundational to the educational mission of the University. All members of the academic community are expected to maintain the highest standards of honesty in their scholarly endeavors. This section establishes the framework for defining, reporting, adjudicating, and sanctioning violations of academic integrity, with due regard for the procedural rights of accused students and the institutional interest in maintaining the integrity of academic credentials.',
          '\u00A7 8.02. Prohibited Conduct. The following acts constitute violations of academic integrity when committed intentionally or with reckless disregard: (a) plagiarism, defined as the representation of another\\'s work, ideas, or expressions as one\\'s own without appropriate attribution; (b) unauthorized collaboration on assignments designated as individual work; (c) fabrication or falsification of data, citations, or experimental results; (d) unauthorized use of artificial intelligence tools to generate submitted work without disclosure as required by course policy; and (e) facilitating any of the foregoing by another student.',
          '\u00A7 8.03. Reporting and Investigation. Any faculty member who has reason to believe that a violation of this section has occurred shall file a written report with the Office of Academic Integrity within ten (10) business days of discovery. The Office shall conduct a preliminary investigation within twenty (20) business days and shall notify the accused student in writing of the allegations, the evidence supporting the allegations, and the student\\'s right to respond in a hearing before the Academic Integrity Board.',
          '\u00A7 8.04. Sanctions. Upon a finding of responsibility by the Academic Integrity Board, sanctions may include: (a) a failing grade on the assignment or in the course; (b) academic probation for a specified period; (c) suspension from the University for not fewer than one (1) nor more than four (4) semesters; or (d) permanent expulsion, which may be imposed only for repeat violations or violations of exceptional severity. All sanctions shall be recorded in the student\\'s confidential disciplinary file and shall be subject to appeal as provided in \u00A7 9 of this Code.',
        ],
      },
    ];

    // ── Unique ID generator ──
    let idCounter = Date.now();
    function uid() { return 'ann-' + (idCounter++); }

    // ── Storage key ──
    const STORAGE_KEY = 'statute-annotator-data';

    function loadSavedState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) { /* ignore */ }
      return null;
    }

    function saveState(statuteId, annotations) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ statuteId, annotations, savedAt: new Date().toISOString() }));
      } catch (e) { /* ignore */ }
    }

    // ── Highlight Popup ──
    function HighlightPopup({ position, onSelect, onClose }) {
      if (!position) return null;
      return (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-stone-200 p-3 ui-text"
          style={{ top: position.y + 8, left: position.x, transform: 'translateX(-50%)' }}
        >
          <div className="text-xs font-semibold text-stone-500 mb-2 text-center">Classify this text</div>
          <div className="flex gap-1.5">
            {ANNOTATION_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => onSelect(t.key)}
                className={\`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all hover:scale-105 \${t.bg} \${t.border} \${t.text}\`}
                title={t.label}
              >
                {t.label.split(' ')[0]}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="absolute -top-2 -right-2 w-5 h-5 bg-stone-600 text-white rounded-full text-xs flex items-center justify-center hover:bg-stone-800">&times;<\/button>
        </div>
      );
    }

    // ── Note Editor ──
    function NoteEditor({ annotation, onSave, onCancel }) {
      const [note, setNote] = useState(annotation.note || '');
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 ui-text">
            <h3 className="font-bold text-stone-800 mb-1">Margin Annotation</h3>
            <p className="text-xs text-stone-500 mb-3">
              <span className={\`inline-block w-3 h-3 rounded mr-1 \${ANNOTATION_TYPES.find(t => t.key === annotation.type)?.bg}\`} />
              {ANNOTATION_TYPES.find(t => t.key === annotation.type)?.label}
            </p>
            <div className="text-sm text-stone-600 bg-stone-50 rounded-lg p-3 mb-3 italic statute-text line-clamp-3">
              "{annotation.selectedText}"
            </div>
            <textarea
              autoFocus
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add your analysis or notes here..."
              className="w-full h-24 border-2 border-stone-200 rounded-lg p-3 text-sm focus:border-blue-400 focus:outline-none resize-none"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={onCancel} className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800">Cancel<\/button>
              <button onClick={() => onSave(note)} className="px-4 py-2 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-900">Save Note<\/button>
            </div>
          </div>
        </div>
      );
    }

    // ── Annotation Sidebar ──
    function AnnotationSidebar({ annotations, onDelete, onEdit, onScrollTo }) {
      const grouped = useMemo(() => {
        const g = {};
        ANNOTATION_TYPES.forEach(t => { g[t.key] = []; });
        annotations.forEach(a => { if (g[a.type]) g[a.type].push(a); });
        return g;
      }, [annotations]);

      return (
        <div className="space-y-4">
          {ANNOTATION_TYPES.map(t => {
            const items = grouped[t.key];
            if (!items || items.length === 0) return null;
            return (
              <div key={t.key}>
                <div className={\`flex items-center gap-2 mb-2 px-2 py-1 rounded-lg \${t.bg}\`}>
                  <div className={\`w-3 h-3 rounded-full bg-\${t.color}-500\`} />
                  <span className={\`text-xs font-semibold \${t.text}\`}>{t.label} ({items.length})<\/span>
                </div>
                <div className="space-y-2">
                  {items.map(a => (
                    <div
                      key={a.id}
                      className={\`border-l-4 border-\${t.color}-400 bg-white rounded-r-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group\`}
                      onClick={() => onScrollTo(a.id)}
                    >
                      <p className="text-xs text-stone-600 italic line-clamp-2 statute-text">"{a.selectedText}"<\/p>
                      {a.note && <p className="text-xs text-stone-800 mt-1 font-medium">{a.note}<\/p>}
                      <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); onEdit(a); }} className="text-xs text-blue-600 hover:underline">Edit<\/button>
                        <button onClick={e => { e.stopPropagation(); onDelete(a.id); }} className="text-xs text-red-600 hover:underline">Delete<\/button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {annotations.length === 0 && (
            <div className="text-center text-stone-400 text-sm py-8">
              <div className="text-3xl mb-2">📜<\/div>
              Select text in the statute to begin annotating.
            </div>
          )}
        </div>
      );
    }

    // ── Statistics Panel ──
    function StatisticsPanel({ annotations, totalTextLength }) {
      const counts = useMemo(() => {
        const c = {};
        ANNOTATION_TYPES.forEach(t => { c[t.key] = 0; });
        annotations.forEach(a => { c[a.type] = (c[a.type] || 0) + 1; });
        return c;
      }, [annotations]);

      const highlightedChars = annotations.reduce((sum, a) => sum + (a.selectedText?.length || 0), 0);
      const coverage = totalTextLength > 0 ? Math.min(100, (highlightedChars / totalTextLength * 100)).toFixed(1) : '0.0';

      return (
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <h3 className="font-bold text-sm text-stone-800 mb-3">Annotation Statistics<\/h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {ANNOTATION_TYPES.map(t => (
              <div key={t.key} className={\`flex items-center gap-2 text-xs \${t.text}\`}>
                <div className={\`w-2.5 h-2.5 rounded-full bg-\${t.color}-500\`} />
                <span>{t.label.split(' ')[0]}:<\/span>
                <span className="font-bold">{counts[t.key]}<\/span>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-100 pt-3 mt-3">
            <div className="flex justify-between text-xs text-stone-600 mb-1">
              <span>Text Coverage<\/span>
              <span className="font-bold">{coverage}%<\/span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: Math.min(100, parseFloat(coverage)) + '%' }} />
            </div>
            <div className="flex justify-between text-xs text-stone-400 mt-2">
              <span>Total annotations: {annotations.length}<\/span>
              <span>With notes: {annotations.filter(a => a.note).length}<\/span>
            </div>
          </div>
        </div>
      );
    }

    // ── Rendered paragraph with highlights ──
    function AnnotatedParagraph({ text, paragraphIndex, annotations, onHighlightClick }) {
      const parts = useMemo(() => {
        const pAnns = annotations
          .filter(a => a.paragraphIndex === paragraphIndex)
          .sort((a, b) => a.startOffset - b.startOffset);
        if (pAnns.length === 0) return [{ text, highlighted: false }];

        const result = [];
        let cursor = 0;
        for (const a of pAnns) {
          if (a.startOffset > cursor) {
            result.push({ text: text.slice(cursor, a.startOffset), highlighted: false });
          }
          const typeInfo = ANNOTATION_TYPES.find(t => t.key === a.type);
          result.push({
            text: text.slice(a.startOffset, a.endOffset),
            highlighted: true,
            className: typeInfo?.highlightClass || '',
            annotationId: a.id,
            hasNote: !!a.note,
          });
          cursor = a.endOffset;
        }
        if (cursor < text.length) {
          result.push({ text: text.slice(cursor), highlighted: false });
        }
        return result;
      }, [text, paragraphIndex, annotations]);

      return (
        <p className="statute-text text-stone-800 text-base leading-relaxed mb-6 relative">
          <span className="text-stone-400 font-mono text-xs mr-3 select-none">({paragraphIndex + 1})<\/span>
          {parts.map((part, i) =>
            part.highlighted ? (
              <span
                key={i}
                id={\`highlight-\${part.annotationId}\`}
                className={\`\${part.className} rounded-sm px-0.5 relative\`}
                onClick={() => onHighlightClick(part.annotationId)}
                title="Click to edit annotation"
              >
                {part.text}
                {part.hasNote && <span className="text-[10px] align-super text-stone-500 ml-0.5">💬<\/span>}
              <\/span>
            ) : (
              <span key={i}>{part.text}<\/span>
            )
          )}
        </p>
      );
    }

    // ── Main App ──
    function StatuteAnnotator() {
      const saved = useMemo(() => loadSavedState(), []);
      const [selectedStatuteId, setSelectedStatuteId] = useState(saved?.statuteId || SAMPLE_STATUTES[0].id);
      const [customText, setCustomText] = useState('');
      const [useCustom, setUseCustom] = useState(false);
      const [annotations, setAnnotations] = useState(saved?.annotations || []);
      const [popupPos, setPopupPos] = useState(null);
      const [pendingSelection, setPendingSelection] = useState(null);
      const [editingAnnotation, setEditingAnnotation] = useState(null);
      const [showNoteEditor, setShowNoteEditor] = useState(false);
      const [sidebarTab, setSidebarTab] = useState('annotations');
      const textContainerRef = useRef(null);

      const currentStatute = SAMPLE_STATUTES.find(s => s.id === selectedStatuteId);
      const paragraphs = useCustom
        ? customText.split('\\n\\n').filter(p => p.trim())
        : (currentStatute?.paragraphs || []);
      const fullText = paragraphs.join(' ');

      // Persist to localStorage
      useEffect(() => {
        saveState(useCustom ? 'custom' : selectedStatuteId, annotations);
      }, [annotations, selectedStatuteId, useCustom]);

      // Handle text selection
      const handleMouseUp = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) {
          return;
        }

        const range = selection.getRangeAt(0);
        const text = selection.toString().trim();
        if (!text || text.length < 3) return;

        // Find which paragraph this belongs to
        let node = range.startContainer;
        let paragraphEl = null;
        while (node && node !== textContainerRef.current) {
          if (node.dataset && node.dataset.paragraphIndex !== undefined) {
            paragraphEl = node;
            break;
          }
          node = node.parentElement;
        }
        if (!paragraphEl) return;

        const pIdx = parseInt(paragraphEl.dataset.paragraphIndex, 10);
        const pText = paragraphs[pIdx] || '';

        // Calculate offset within the paragraph text
        const startOffset = pText.indexOf(text);
        if (startOffset === -1) return;

        const rect = range.getBoundingClientRect();
        setPopupPos({ x: rect.left + rect.width / 2, y: rect.bottom });
        setPendingSelection({
          selectedText: text,
          paragraphIndex: pIdx,
          startOffset,
          endOffset: startOffset + text.length,
        });
      }, [paragraphs]);

      const handleTypeSelect = useCallback((typeKey) => {
        if (!pendingSelection) return;
        const newAnn = {
          id: uid(),
          type: typeKey,
          ...pendingSelection,
          note: '',
          createdAt: new Date().toISOString(),
        };
        setAnnotations(prev => [...prev, newAnn]);
        setPopupPos(null);
        setPendingSelection(null);
        window.getSelection()?.removeAllRanges();
        // Open note editor
        setEditingAnnotation(newAnn);
        setShowNoteEditor(true);
      }, [pendingSelection]);

      const handleDeleteAnnotation = useCallback((id) => {
        setAnnotations(prev => prev.filter(a => a.id !== id));
      }, []);

      const handleEditAnnotation = useCallback((ann) => {
        setEditingAnnotation(ann);
        setShowNoteEditor(true);
      }, []);

      const handleSaveNote = useCallback((note) => {
        if (!editingAnnotation) return;
        setAnnotations(prev => prev.map(a =>
          a.id === editingAnnotation.id ? { ...a, note } : a
        ));
        setShowNoteEditor(false);
        setEditingAnnotation(null);
      }, [editingAnnotation]);

      const handleHighlightClick = useCallback((id) => {
        const ann = annotations.find(a => a.id === id);
        if (ann) {
          setEditingAnnotation(ann);
          setShowNoteEditor(true);
        }
      }, [annotations]);

      const handleScrollTo = useCallback((id) => {
        const el = document.getElementById('highlight-' + id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.outline = '3px solid #0033A0';
          setTimeout(() => { el.style.outline = 'none'; }, 2000);
        }
      }, []);

      const handleStatuteChange = useCallback((id) => {
        if (id === 'custom') {
          setUseCustom(true);
        } else {
          setUseCustom(false);
          setSelectedStatuteId(id);
        }
        setAnnotations([]);
      }, []);

      const handlePrint = useCallback(() => { window.print(); }, []);

      const handleClearAll = useCallback(() => {
        if (confirm('Clear all annotations? This cannot be undone.')) {
          setAnnotations([]);
        }
      }, []);

      const handleExportJSON = useCallback(() => {
        const data = JSON.stringify({ statute: currentStatute?.title || 'Custom Text', annotations, exportedAt: new Date().toISOString() }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'statute-annotations.json';
        a.click();
        URL.revokeObjectURL(url);
      }, [annotations, currentStatute]);

      return (
        <div className="min-h-screen bg-stone-50">
          {/* Header */}
          <header className="bg-white border-b border-stone-200 sticky top-0 z-40 no-print">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📜<\/span>
                <div>
                  <h1 className="font-extrabold text-lg text-stone-900">Statute Annotator<\/h1>
                  <p className="text-xs text-stone-500">Highlight, classify, and annotate legal text<\/p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={useCustom ? 'custom' : selectedStatuteId}
                  onChange={e => handleStatuteChange(e.target.value)}
                  className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none bg-white"
                >
                  {SAMPLE_STATUTES.map(s => (
                    <option key={s.id} value={s.id}>{s.title.split(' — ')[0]}<\/option>
                  ))}
                  <option value="custom">Paste your own...<\/option>
                <\/select>
                <button onClick={handleExportJSON} className="px-3 py-1.5 text-xs bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors font-medium" title="Export as JSON">
                  Export
                <\/button>
                <button onClick={handlePrint} className="px-3 py-1.5 text-xs bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors font-medium" title="Print annotations">
                  🖨️ Print
                <\/button>
                <button onClick={handleClearAll} className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium">
                  Clear All
                <\/button>
              </div>
            </div>
            {/* Highlight legend */}
            <div className="max-w-7xl mx-auto px-6 pb-2 flex gap-4">
              {ANNOTATION_TYPES.map(t => (
                <div key={t.key} className="flex items-center gap-1.5 text-xs text-stone-600">
                  <span className={\`inline-block w-3 h-3 rounded-sm \${t.highlightClass}\`} style={{ backgroundColor: \`var(--tw-bg-opacity, 1)\` }}/>
                  <span className={\`w-3 h-3 rounded-full bg-\${t.color}-500 inline-block\`} />
                  <span>{t.label}<\/span>
                </div>
              ))}
            </div>
          <\/header>

          {/* Main content */}
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex gap-6">
              {/* Left: Statute text */}
              <div className="flex-1 min-w-0">
                {useCustom && (
                  <div className="mb-4">
                    <textarea
                      value={customText}
                      onChange={e => { setCustomText(e.target.value); setAnnotations([]); }}
                      placeholder="Paste your statute text here. Separate paragraphs with blank lines."
                      className="w-full h-40 border-2 border-stone-200 rounded-xl p-4 text-sm statute-text focus:border-blue-400 focus:outline-none resize-y"
                    />
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
                  <h2 className="font-extrabold text-xl text-stone-900 mb-1 ui-text">
                    {useCustom ? 'Custom Text' : currentStatute?.title}
                  </h2>
                  <div className="h-px bg-stone-200 mb-6" />

                  <div ref={textContainerRef} onMouseUp={handleMouseUp}>
                    {paragraphs.map((pText, idx) => (
                      <div key={idx} data-paragraph-index={idx}>
                        <AnnotatedParagraph
                          text={pText}
                          paragraphIndex={idx}
                          annotations={annotations}
                          onHighlightClick={handleHighlightClick}
                        />
                      </div>
                    ))}
                  </div>

                  {paragraphs.length === 0 && (
                    <div className="text-center text-stone-400 py-12">
                      <div className="text-4xl mb-3">📄<\/div>
                      <p>Select a sample statute above or paste your own text.<\/p>
                    </div>
                  )}
                </div>

                {/* Margin notes (below text for print clarity) */}
                {annotations.filter(a => a.note).length > 0 && (
                  <div className="mt-6 bg-amber-50 rounded-2xl border border-amber-200 p-6 print-break">
                    <h3 className="font-bold text-sm text-amber-900 mb-3 ui-text">📝 Margin Notes<\/h3>
                    <div className="space-y-3">
                      {annotations.filter(a => a.note).map(a => {
                        const typeInfo = ANNOTATION_TYPES.find(t => t.key === a.type);
                        return (
                          <div key={a.id} className={\`flex gap-3 text-sm border-l-4 \${typeInfo?.border || 'border-stone-300'} pl-3\`}>
                            <div className="flex-1">
                              <span className={\`text-xs font-semibold \${typeInfo?.text || ''}\`}>{typeInfo?.label}<\/span>
                              <p className="text-stone-600 italic statute-text text-xs mt-0.5">"{a.selectedText?.slice(0, 80)}{a.selectedText?.length > 80 ? '...' : ''}"<\/p>
                              <p className="text-stone-800 mt-1">{a.note}<\/p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right sidebar */}
              <div className="w-80 shrink-0 no-print">
                <div className="sticky top-24 space-y-4">
                  {/* Sidebar tabs */}
                  <div className="flex rounded-lg bg-stone-100 p-1">
                    <button
                      onClick={() => setSidebarTab('annotations')}
                      className={\`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors \${sidebarTab === 'annotations' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}\`}
                    >
                      Annotations ({annotations.length})
                    <\/button>
                    <button
                      onClick={() => setSidebarTab('stats')}
                      className={\`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors \${sidebarTab === 'stats' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}\`}
                    >
                      Statistics
                    <\/button>
                  </div>

                  {sidebarTab === 'annotations' ? (
                    <AnnotationSidebar
                      annotations={annotations}
                      onDelete={handleDeleteAnnotation}
                      onEdit={handleEditAnnotation}
                      onScrollTo={handleScrollTo}
                    />
                  ) : (
                    <StatisticsPanel annotations={annotations} totalTextLength={fullText.length} />
                  )}

                  {/* Quick help */}
                  <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                    <h4 className="font-bold text-xs text-blue-900 mb-2">How to Use<\/h4>
                    <ol className="text-xs text-blue-800 space-y-1.5 list-decimal list-inside">
                      <li>Select a statute from the dropdown<\/li>
                      <li>Highlight text with your mouse<\/li>
                      <li>Choose an argument classification<\/li>
                      <li>Add a margin note (optional)<\/li>
                      <li>Click any highlight to edit its note<\/li>
                      <li>Use Print or Export to save your work<\/li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Popups */}
          <HighlightPopup position={popupPos} onSelect={handleTypeSelect} onClose={() => { setPopupPos(null); setPendingSelection(null); window.getSelection()?.removeAllRanges(); }} />
          {showNoteEditor && editingAnnotation && (
            <NoteEditor
              annotation={editingAnnotation}
              onSave={handleSaveNote}
              onCancel={() => { setShowNoteEditor(false); setEditingAnnotation(null); }}
            />
          )}
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<StatuteAnnotator />);
  <\/script>
</body>
</html>`;
