import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'drug-interaction',
  title: 'Drug Interaction Checker',
  description: 'Enter medications and visualize interactions with severity matrix, mechanism details, and clinical recommendations.',
  category: 'dashboard',
  thumbnailEmoji: '💊',
  editorScrollTarget: '// 💊 DRUG INTERACTION DATABASE',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '💊 Select medications from the list to see potential interactions, severity levels, and clinical recommendations.',
    ctaLabel: '▶ Check Interactions',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Drug Interaction Checker</title>
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
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            med: {
              dark: '#0f172a',
              panel: '#1e293b',
              card: '#334155',
              accent: '#38bdf8',
              severe: '#ef4444',
              major: '#f97316',
              moderate: '#eab308',
              minor: '#22c55e',
              none: '#64748b',
            }
          }
        }
      }
    };
  <\/script>
  <style>
    body { margin: 0; background: #0f172a; color: #e2e8f0; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #1e293b; }
    ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 70% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }
    .pulse-severe { animation: pulse-ring 2s infinite; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    // ============================================================
    // 💊 DRUG INTERACTION DATABASE
    // ============================================================

    const DRUG_CLASSES = {
      CARDIOVASCULAR: { label: 'Cardiovascular', color: '#ef4444', icon: '❤️' },
      CNS: { label: 'CNS / Psychiatric', color: '#a855f7', icon: '🧠' },
      ANALGESIC: { label: 'Analgesics / Anti-inflammatory', color: '#f97316', icon: '💊' },
      ANTIBIOTIC: { label: 'Antibiotics / Antifungals', color: '#22c55e', icon: '🦠' },
      ENDOCRINE: { label: 'Endocrine / Metabolic', color: '#3b82f6', icon: '⚗️' },
      GI: { label: 'Gastrointestinal', color: '#eab308', icon: '🫁' },
      ANTICOAGULANT: { label: 'Anticoagulants / Antiplatelets', color: '#ec4899', icon: '🩸' },
      RESPIRATORY: { label: 'Respiratory', color: '#14b8a6', icon: '🫁' },
      IMMUNOLOGIC: { label: 'Immunologic', color: '#8b5cf6', icon: '🛡️' },
    };

    const DRUGS = [
      { id: 'warfarin', name: 'Warfarin', class: 'ANTICOAGULANT', moa: 'Vitamin K epoxide reductase inhibitor; blocks synthesis of clotting factors II, VII, IX, X' },
      { id: 'aspirin', name: 'Aspirin', class: 'ANALGESIC', moa: 'Irreversible COX-1/COX-2 inhibitor; reduces thromboxane A2 and prostaglandin synthesis' },
      { id: 'clopidogrel', name: 'Clopidogrel', class: 'ANTICOAGULANT', moa: 'Irreversible P2Y12 ADP receptor antagonist; inhibits platelet aggregation' },
      { id: 'lisinopril', name: 'Lisinopril', class: 'CARDIOVASCULAR', moa: 'ACE inhibitor; blocks angiotensin I to II conversion, reduces aldosterone secretion' },
      { id: 'losartan', name: 'Losartan', class: 'CARDIOVASCULAR', moa: 'Angiotensin II receptor blocker (ARB); selective AT1 receptor antagonist' },
      { id: 'amlodipine', name: 'Amlodipine', class: 'CARDIOVASCULAR', moa: 'Dihydropyridine calcium channel blocker; relaxes vascular smooth muscle' },
      { id: 'metoprolol', name: 'Metoprolol', class: 'CARDIOVASCULAR', moa: 'Selective beta-1 adrenergic receptor blocker; reduces heart rate and contractility' },
      { id: 'atorvastatin', name: 'Atorvastatin', class: 'CARDIOVASCULAR', moa: 'HMG-CoA reductase inhibitor; reduces hepatic cholesterol synthesis, upregulates LDL receptors' },
      { id: 'simvastatin', name: 'Simvastatin', class: 'CARDIOVASCULAR', moa: 'HMG-CoA reductase inhibitor; CYP3A4-metabolized prodrug' },
      { id: 'digoxin', name: 'Digoxin', class: 'CARDIOVASCULAR', moa: 'Na+/K+-ATPase inhibitor; increases intracellular calcium, enhances cardiac contractility' },
      { id: 'amiodarone', name: 'Amiodarone', class: 'CARDIOVASCULAR', moa: 'Class III antiarrhythmic; blocks K+, Na+, Ca2+ channels and beta receptors' },
      { id: 'metformin', name: 'Metformin', class: 'ENDOCRINE', moa: 'Biguanide; activates AMPK, reduces hepatic glucose production, improves insulin sensitivity' },
      { id: 'glipizide', name: 'Glipizide', class: 'ENDOCRINE', moa: 'Sulfonylurea; closes K-ATP channels on pancreatic beta cells, stimulates insulin release' },
      { id: 'levothyroxine', name: 'Levothyroxine', class: 'ENDOCRINE', moa: 'Synthetic T4; converted to active T3, regulates metabolic rate via nuclear thyroid receptors' },
      { id: 'prednisone', name: 'Prednisone', class: 'IMMUNOLOGIC', moa: 'Glucocorticoid; binds intracellular receptors, suppresses inflammatory gene transcription' },
      { id: 'ibuprofen', name: 'Ibuprofen', class: 'ANALGESIC', moa: 'Non-selective COX-1/COX-2 inhibitor; reduces prostaglandin synthesis' },
      { id: 'naproxen', name: 'Naproxen', class: 'ANALGESIC', moa: 'Non-selective COX inhibitor; longer half-life NSAID, reduces inflammation and pain' },
      { id: 'acetaminophen', name: 'Acetaminophen', class: 'ANALGESIC', moa: 'Central COX inhibitor and TRPV1 modulator; analgesic/antipyretic without anti-inflammatory effect' },
      { id: 'tramadol', name: 'Tramadol', class: 'ANALGESIC', moa: 'Weak mu-opioid agonist + serotonin-norepinephrine reuptake inhibitor' },
      { id: 'morphine', name: 'Morphine', class: 'ANALGESIC', moa: 'Full mu-opioid receptor agonist; activates descending pain inhibitory pathways' },
      { id: 'gabapentin', name: 'Gabapentin', class: 'CNS', moa: 'Binds alpha-2-delta subunit of voltage-gated calcium channels; reduces excitatory neurotransmitter release' },
      { id: 'sertraline', name: 'Sertraline', class: 'CNS', moa: 'Selective serotonin reuptake inhibitor (SSRI); blocks SERT transporter' },
      { id: 'fluoxetine', name: 'Fluoxetine', class: 'CNS', moa: 'SSRI with long half-life; potent CYP2D6 inhibitor' },
      { id: 'paroxetine', name: 'Paroxetine', class: 'CNS', moa: 'SSRI; strongest CYP2D6 inhibitor among SSRIs, also has anticholinergic effects' },
      { id: 'venlafaxine', name: 'Venlafaxine', class: 'CNS', moa: 'Serotonin-norepinephrine reuptake inhibitor (SNRI); dose-dependent NE activity' },
      { id: 'phenelzine', name: 'Phenelzine', class: 'CNS', moa: 'Non-selective irreversible monoamine oxidase inhibitor (MAOI); increases 5-HT, NE, DA' },
      { id: 'lithium', name: 'Lithium', class: 'CNS', moa: 'Mood stabilizer; inhibits GSK-3beta, modulates inositol signaling and neuroprotective pathways' },
      { id: 'carbamazepine', name: 'Carbamazepine', class: 'CNS', moa: 'Voltage-gated sodium channel blocker; potent CYP3A4 inducer' },
      { id: 'alprazolam', name: 'Alprazolam', class: 'CNS', moa: 'Benzodiazepine; positive allosteric modulator at GABA-A receptors, CYP3A4 substrate' },
      { id: 'zolpidem', name: 'Zolpidem', class: 'CNS', moa: 'Non-benzodiazepine hypnotic; selective GABA-A alpha-1 subunit agonist' },
      { id: 'ciprofloxacin', name: 'Ciprofloxacin', class: 'ANTIBIOTIC', moa: 'Fluoroquinolone; inhibits DNA gyrase and topoisomerase IV, potent CYP1A2 inhibitor' },
      { id: 'amoxicillin', name: 'Amoxicillin', class: 'ANTIBIOTIC', moa: 'Aminopenicillin; inhibits transpeptidase, disrupts cell wall synthesis' },
      { id: 'azithromycin', name: 'Azithromycin', class: 'ANTIBIOTIC', moa: 'Macrolide; binds 50S ribosomal subunit, inhibits bacterial protein synthesis' },
      { id: 'clarithromycin', name: 'Clarithromycin', class: 'ANTIBIOTIC', moa: 'Macrolide; 50S ribosomal inhibitor, strong CYP3A4 inhibitor' },
      { id: 'fluconazole', name: 'Fluconazole', class: 'ANTIBIOTIC', moa: 'Triazole antifungal; inhibits CYP51 (lanosterol 14-alpha demethylase), potent CYP2C9 inhibitor' },
      { id: 'metronidazole', name: 'Metronidazole', class: 'ANTIBIOTIC', moa: 'Nitroimidazole; forms free radicals that damage bacterial DNA, inhibits aldehyde dehydrogenase' },
      { id: 'omeprazole', name: 'Omeprazole', class: 'GI', moa: 'Proton pump inhibitor; irreversibly blocks H+/K+-ATPase in gastric parietal cells' },
      { id: 'pantoprazole', name: 'Pantoprazole', class: 'GI', moa: 'Proton pump inhibitor; more selective for gastric H+/K+-ATPase, fewer CYP interactions' },
      { id: 'ondansetron', name: 'Ondansetron', class: 'GI', moa: '5-HT3 receptor antagonist; blocks serotonin signaling in CTZ and vagal afferents' },
      { id: 'spironolactone', name: 'Spironolactone', class: 'CARDIOVASCULAR', moa: 'Aldosterone receptor antagonist; potassium-sparing diuretic' },
      { id: 'furosemide', name: 'Furosemide', class: 'CARDIOVASCULAR', moa: 'Loop diuretic; inhibits Na+/K+/2Cl- cotransporter in thick ascending limb' },
      { id: 'hydrochlorothiazide', name: 'Hydrochlorothiazide', class: 'CARDIOVASCULAR', moa: 'Thiazide diuretic; inhibits Na+/Cl- cotransporter in distal convoluted tubule' },
      { id: 'albuterol', name: 'Albuterol', class: 'RESPIRATORY', moa: 'Short-acting beta-2 adrenergic agonist; relaxes bronchial smooth muscle' },
      { id: 'montelukast', name: 'Montelukast', class: 'RESPIRATORY', moa: 'Leukotriene receptor antagonist; blocks CysLT1 receptors in airways' },
      { id: 'rivaroxaban', name: 'Rivaroxaban', class: 'ANTICOAGULANT', moa: 'Direct factor Xa inhibitor; CYP3A4 and P-gp substrate' },
      { id: 'insulin', name: 'Insulin (regular)', class: 'ENDOCRINE', moa: 'Binds insulin receptor tyrosine kinase; promotes GLUT4 translocation, glucose uptake' },
    ];

    // ============================================================
    // 🔬 INTERACTION DATABASE — Real pharmacological interactions
    // ============================================================

    const SEVERITY = { SEVERE: 'SEVERE', MAJOR: 'MAJOR', MODERATE: 'MODERATE', MINOR: 'MINOR', NONE: 'NONE' };

    const INTERACTIONS = [
      // Anticoagulant + NSAID/Antiplatelet interactions
      { drugs: ['warfarin', 'aspirin'], severity: SEVERITY.SEVERE, mechanism: 'Additive anticoagulant and antiplatelet effects; aspirin inhibits platelet COX-1 while warfarin depletes clotting factors', clinicalEffect: 'Significantly increased risk of GI hemorrhage and intracranial bleeding', recommendation: 'Avoid combination unless specifically indicated (e.g., mechanical heart valve). If used, maintain INR <2.5, add PPI for GI protection, and monitor for bleeding signs.' },
      { drugs: ['warfarin', 'ibuprofen'], severity: SEVERITY.SEVERE, mechanism: 'NSAIDs inhibit COX-1 platelet function and may displace warfarin from albumin binding; ibuprofen also causes GI mucosal erosion', clinicalEffect: 'Up to 3-fold increased risk of GI bleeding; unpredictable INR elevation', recommendation: 'Avoid NSAIDs in warfarin patients. Use acetaminophen for pain. If NSAID essential, use lowest dose for shortest duration with PPI cover and frequent INR monitoring.' },
      { drugs: ['warfarin', 'naproxen'], severity: SEVERITY.SEVERE, mechanism: 'Naproxen inhibits platelet aggregation for its full dosing interval plus causes GI mucosal damage; additive with warfarin anticoagulation', clinicalEffect: 'High risk of GI and other major bleeding events', recommendation: 'Contraindicated. Switch to acetaminophen. If NSAID required, use celecoxib (COX-2 selective) with PPI and close INR monitoring.' },
      { drugs: ['warfarin', 'fluconazole'], severity: SEVERITY.SEVERE, mechanism: 'Fluconazole potently inhibits CYP2C9, the primary metabolic pathway for S-warfarin (more potent enantiomer)', clinicalEffect: 'INR may increase 2-3 fold within 3-5 days; high risk of major hemorrhage', recommendation: 'Reduce warfarin dose by 25-50% when initiating fluconazole. Check INR within 3 days and then every 3-5 days. Consider alternative antifungal.' },
      { drugs: ['warfarin', 'metronidazole'], severity: SEVERITY.MAJOR, mechanism: 'Metronidazole inhibits CYP2C9-mediated metabolism of S-warfarin and may have direct anticoagulant effects', clinicalEffect: 'Elevated INR with increased bleeding risk, typically within 3-7 days', recommendation: 'If combination necessary, reduce warfarin dose by 25-30%. Monitor INR at days 3 and 7. Consider alternative antibiotics.' },
      { drugs: ['warfarin', 'amiodarone'], severity: SEVERITY.SEVERE, mechanism: 'Amiodarone inhibits CYP2C9, CYP3A4, and CYP1A2; extremely long half-life (40-55 days) causes prolonged interaction', clinicalEffect: 'INR increases 40-60% on average; effect persists for months after amiodarone discontinuation', recommendation: 'Empirically reduce warfarin dose by 30-50% when starting amiodarone. Monitor INR weekly for 6-8 weeks. Interaction may last months after amiodarone is stopped.' },
      { drugs: ['warfarin', 'clarithromycin'], severity: SEVERITY.MAJOR, mechanism: 'Clarithromycin inhibits CYP3A4 affecting R-warfarin metabolism and may reduce vitamin K-producing gut flora', clinicalEffect: 'Elevated INR with increased risk of bleeding within 5-7 days', recommendation: 'Monitor INR closely. Consider azithromycin as alternative (fewer CYP interactions). Reduce warfarin if needed.' },
      { drugs: ['clopidogrel', 'omeprazole'], severity: SEVERITY.MAJOR, mechanism: 'Omeprazole inhibits CYP2C19, the enzyme required to convert clopidogrel prodrug to its active thiol metabolite', clinicalEffect: 'Reduced antiplatelet effect of clopidogrel; up to 40% decrease in active metabolite levels, increased risk of cardiovascular events', recommendation: 'Switch to pantoprazole (minimal CYP2C19 inhibition) or use H2-receptor antagonist. Separate dosing by 12 hours if PPI necessary.' },
      { drugs: ['clopidogrel', 'aspirin'], severity: SEVERITY.MODERATE, mechanism: 'Dual antiplatelet therapy: additive inhibition of platelet aggregation via different pathways (COX-1 + P2Y12)', clinicalEffect: 'Increased bleeding risk but therapeutically beneficial post-ACS or post-PCI', recommendation: 'Standard dual antiplatelet therapy (DAPT) post-ACS/PCI for 6-12 months. Use low-dose aspirin (81mg). Add PPI for GI protection. Monitor for bleeding.' },
      { drugs: ['rivaroxaban', 'aspirin'], severity: SEVERITY.MAJOR, mechanism: 'Additive effects on hemostasis: Factor Xa inhibition combined with platelet COX-1 inhibition', clinicalEffect: 'Significantly increased risk of major bleeding including intracranial hemorrhage', recommendation: 'Limit to specific indications (e.g., vascular dose rivaroxaban 2.5mg BID + aspirin per COMPASS trial). Use PPI prophylaxis. Monitor for bleeding.' },
      { drugs: ['rivaroxaban', 'clarithromycin'], severity: SEVERITY.MAJOR, mechanism: 'Clarithromycin inhibits CYP3A4 and P-glycoprotein, both involved in rivaroxaban elimination', clinicalEffect: 'Increased rivaroxaban plasma levels with elevated bleeding risk', recommendation: 'Avoid combination if possible. If necessary, use short course and monitor for bleeding. Consider azithromycin alternative.' },

      // SSRI + MAOI (serotonin syndrome)
      { drugs: ['sertraline', 'phenelzine'], severity: SEVERITY.SEVERE, mechanism: 'Combined SSRI + MAOI causes massive serotonin accumulation in synaptic cleft by blocking both reuptake and degradation', clinicalEffect: 'Serotonin syndrome: hyperthermia, rigidity, myoclonus, autonomic instability, mental status changes — potentially fatal', recommendation: 'ABSOLUTELY CONTRAINDICATED. Requires 14-day washout from MAOI before starting SSRI, or 5 half-lives washout from SSRI before MAOI (5 weeks for fluoxetine).' },
      { drugs: ['fluoxetine', 'phenelzine'], severity: SEVERITY.SEVERE, mechanism: 'Fluoxetine + norfluoxetine have combined half-life of ~2 weeks; MAOI + SSRI causes dangerous serotonin excess', clinicalEffect: 'Life-threatening serotonin syndrome; onset can be rapid and severe', recommendation: 'ABSOLUTELY CONTRAINDICATED. Requires minimum 5-week washout after stopping fluoxetine before initiating MAOI due to long half-life of norfluoxetine.' },
      { drugs: ['paroxetine', 'phenelzine'], severity: SEVERITY.SEVERE, mechanism: 'Dual serotonergic potentiation via reuptake inhibition (SSRI) and degradation inhibition (MAOI)', clinicalEffect: 'Serotonin syndrome with potential for fatal hyperthermia and cardiovascular collapse', recommendation: 'ABSOLUTELY CONTRAINDICATED. Minimum 14-day washout between agents in either direction.' },
      { drugs: ['venlafaxine', 'phenelzine'], severity: SEVERITY.SEVERE, mechanism: 'SNRI blocks serotonin and norepinephrine reuptake; combined with MAOI causes dangerous monoamine accumulation', clinicalEffect: 'Serotonin syndrome plus hypertensive crisis from norepinephrine excess', recommendation: 'ABSOLUTELY CONTRAINDICATED. Allow 14-day washout from MAOI or 7 days from venlafaxine.' },
      { drugs: ['tramadol', 'phenelzine'], severity: SEVERITY.SEVERE, mechanism: 'Tramadol inhibits serotonin reuptake; combined with MAOI causes serotonergic excess', clinicalEffect: 'Serotonin syndrome, seizures, and respiratory depression', recommendation: 'CONTRAINDICATED. Use non-serotonergic analgesics (morphine, acetaminophen) with MAOI therapy.' },

      // SSRI + Tramadol serotonin risk
      { drugs: ['sertraline', 'tramadol'], severity: SEVERITY.MAJOR, mechanism: 'Both agents increase synaptic serotonin: SSRI via reuptake blockade, tramadol via reuptake inhibition and possible direct agonism', clinicalEffect: 'Risk of serotonin syndrome; also tramadol lowers seizure threshold', recommendation: 'Avoid if possible. If used, start at low doses, titrate slowly, and educate patient on serotonin syndrome symptoms (agitation, tremor, hyperthermia).' },
      { drugs: ['fluoxetine', 'tramadol'], severity: SEVERITY.MAJOR, mechanism: 'Fluoxetine inhibits CYP2D6 reducing tramadol activation to M1 (active metabolite), but also dual serotonergic effect', clinicalEffect: 'Paradoxically reduced analgesic efficacy PLUS increased serotonin syndrome risk', recommendation: 'Avoid combination. Use alternative analgesic. If used, monitor closely for both inadequate pain control and serotonergic toxicity.' },

      // Statin + CYP3A4 interactions
      { drugs: ['simvastatin', 'clarithromycin'], severity: SEVERITY.SEVERE, mechanism: 'Clarithromycin potently inhibits CYP3A4, the primary metabolic pathway for simvastatin; dramatically increases statin exposure', clinicalEffect: 'Up to 10-fold increase in simvastatin levels; severe risk of rhabdomyolysis, acute renal failure', recommendation: 'CONTRAINDICATED. Suspend simvastatin during clarithromycin course. Use azithromycin (no CYP3A4 inhibition) or switch to pravastatin/rosuvastatin (non-CYP3A4 substrates).' },
      { drugs: ['simvastatin', 'amiodarone'], severity: SEVERITY.MAJOR, mechanism: 'Amiodarone inhibits CYP3A4; simvastatin dose should not exceed 20mg daily with concurrent amiodarone (FDA label)', clinicalEffect: 'Increased risk of myopathy and rhabdomyolysis at higher simvastatin doses', recommendation: 'Do not exceed simvastatin 20mg/day. Consider switching to atorvastatin (less affected) or pravastatin/rosuvastatin. Monitor CK levels and muscle symptoms.' },
      { drugs: ['atorvastatin', 'clarithromycin'], severity: SEVERITY.MAJOR, mechanism: 'Clarithromycin inhibits CYP3A4; atorvastatin partially metabolized by CYP3A4 though less dependent than simvastatin', clinicalEffect: 'Increased atorvastatin exposure; elevated risk of myopathy', recommendation: 'Limit atorvastatin to 20mg/day during clarithromycin therapy. Monitor for muscle pain and dark urine. Consider azithromycin alternative.' },

      // Lithium interactions
      { drugs: ['lithium', 'ibuprofen'], severity: SEVERITY.MAJOR, mechanism: 'NSAIDs reduce renal prostaglandin synthesis, decreasing renal blood flow and lithium clearance by 15-25%', clinicalEffect: 'Lithium toxicity: tremor, ataxia, slurred speech, seizures, renal failure at severe levels', recommendation: 'Avoid NSAIDs. Use acetaminophen for pain. If NSAID necessary, monitor lithium levels within 5 days and reduce lithium dose. Sulindac may be least problematic NSAID.' },
      { drugs: ['lithium', 'naproxen'], severity: SEVERITY.MAJOR, mechanism: 'Naproxen reduces renal prostaglandin-mediated lithium clearance; longer NSAID half-life = sustained interaction', clinicalEffect: 'Elevated lithium levels; risk of neurotoxicity and nephrotoxicity', recommendation: 'Avoid. If must use NSAID, check lithium levels at baseline and day 5. Use lowest dose for shortest duration.' },
      { drugs: ['lithium', 'lisinopril'], severity: SEVERITY.MAJOR, mechanism: 'ACE inhibitors reduce angiotensin II-mediated aldosterone release, decreasing sodium reabsorption and lithium clearance', clinicalEffect: 'Lithium levels may increase 25-40%; risk of lithium toxicity', recommendation: 'Monitor lithium levels closely when initiating or adjusting ACE inhibitor dose. May need lithium dose reduction of 25-50%.' },
      { drugs: ['lithium', 'losartan'], severity: SEVERITY.MAJOR, mechanism: 'ARBs reduce aldosterone secretion similarly to ACE inhibitors, impairing renal lithium excretion', clinicalEffect: 'Elevated lithium levels with toxicity risk', recommendation: 'Same monitoring as ACE inhibitor + lithium. Check levels within 1 week of starting ARB.' },
      { drugs: ['lithium', 'hydrochlorothiazide'], severity: SEVERITY.SEVERE, mechanism: 'Thiazide diuretics increase proximal tubular lithium reabsorption by inducing sodium depletion and volume contraction', clinicalEffect: 'Lithium levels increase 25-40%; serious toxicity risk including irreversible neurological damage', recommendation: 'Avoid if possible. If necessary, reduce lithium dose by 25-50% and monitor levels frequently. Loop diuretics (furosemide) have less effect on lithium.' },
      { drugs: ['lithium', 'furosemide'], severity: SEVERITY.MODERATE, mechanism: 'Loop diuretics can cause sodium depletion leading to compensatory proximal lithium reabsorption, though effect is less predictable than thiazides', clinicalEffect: 'Variable lithium elevation; risk increases with chronic use and volume depletion', recommendation: 'Monitor lithium levels when initiating or changing diuretic dose. Ensure adequate sodium and fluid intake.' },

      // ACE inhibitor + potassium-sparing
      { drugs: ['lisinopril', 'spironolactone'], severity: SEVERITY.MAJOR, mechanism: 'Both increase serum potassium: ACE inhibitor reduces aldosterone, spironolactone blocks aldosterone receptor', clinicalEffect: 'Hyperkalemia risk, especially in renal impairment; potentially fatal cardiac arrhythmias', recommendation: 'Monitor potassium within 1 week, then regularly. Contraindicated if K+ >5.0 or eGFR <30. Use low-dose spironolactone (25mg). Avoid potassium supplements and salt substitutes.' },
      { drugs: ['losartan', 'spironolactone'], severity: SEVERITY.MAJOR, mechanism: 'Dual RAAS blockade: ARB reduces angiotensin-mediated aldosterone + spironolactone blocks remaining aldosterone activity', clinicalEffect: 'High risk of life-threatening hyperkalemia', recommendation: 'Same as ACE + spironolactone: close K+ monitoring, avoid in advanced CKD. Common in heart failure but requires careful electrolyte surveillance.' },

      // Metformin interactions
      { drugs: ['metformin', 'furosemide'], severity: SEVERITY.MODERATE, mechanism: 'Furosemide increases metformin plasma concentration by ~20% via renal tubular transport competition (OCT/MATE)', clinicalEffect: 'Increased metformin levels; potential for lactic acidosis especially with dehydration', recommendation: 'Monitor renal function. Ensure adequate hydration. Hold metformin if patient becomes dehydrated or if eGFR drops below 30.' },
      { drugs: ['metformin', 'ciprofloxacin'], severity: SEVERITY.MODERATE, mechanism: 'Ciprofloxacin may alter glucose homeostasis and can affect renal tubular secretion of metformin', clinicalEffect: 'Hypoglycemia or hyperglycemia; rare risk of lactic acidosis with renal impairment', recommendation: 'Monitor blood glucose more frequently during antibiotic course. Ensure adequate hydration and renal function.' },

      // QT prolongation combinations
      { drugs: ['amiodarone', 'azithromycin'], severity: SEVERITY.SEVERE, mechanism: 'Both agents independently prolong cardiac QT interval; amiodarone blocks IKr channels, azithromycin blocks hERG channels', clinicalEffect: 'Additive QT prolongation with risk of torsades de pointes and sudden cardiac death', recommendation: 'Avoid combination. If unavoidable, obtain baseline ECG, monitor QTc, hold if QTc >500ms. Consider alternative antibiotic (amoxicillin).' },
      { drugs: ['amiodarone', 'ondansetron'], severity: SEVERITY.MAJOR, mechanism: 'Ondansetron prolongs QT interval via hERG channel blockade; additive with amiodarone QT effects', clinicalEffect: 'Risk of QT prolongation and ventricular arrhythmias', recommendation: 'Use single IV dose ondansetron (max 16mg) with ECG monitoring. Consider granisetron or dexamethasone as antiemetic alternatives.' },
      { drugs: ['ciprofloxacin', 'ondansetron'], severity: SEVERITY.MODERATE, mechanism: 'Both agents can prolong QT interval; fluoroquinolones block cardiac sodium and potassium channels', clinicalEffect: 'Additive QT prolongation; risk increases with electrolyte imbalances', recommendation: 'Monitor ECG if both required. Correct hypokalemia and hypomagnesemia. Consider alternative antibiotic or antiemetic.' },

      // Beta-blocker interactions
      { drugs: ['metoprolol', 'amlodipine'], severity: SEVERITY.MODERATE, mechanism: 'Both reduce cardiac output: beta-blocker slows heart rate and contractility, CCB reduces afterload. Amlodipine (dihydropyridine) has less cardiac depression than verapamil/diltiazem', clinicalEffect: 'Potential for hypotension and bradycardia, though commonly used together', recommendation: 'Generally safe combination for hypertension/angina. Monitor heart rate and blood pressure. Start low, titrate slowly.' },
      { drugs: ['metoprolol', 'fluoxetine'], severity: SEVERITY.MAJOR, mechanism: 'Fluoxetine potently inhibits CYP2D6, the primary metabolic pathway for metoprolol, increasing metoprolol AUC 4-6 fold', clinicalEffect: 'Excessive beta-blockade: severe bradycardia, hypotension, heart block, fatigue', recommendation: 'Consider beta-blocker not metabolized by CYP2D6 (atenolol, nadolol). If using metoprolol, reduce dose by 50-75% and monitor HR/BP closely.' },
      { drugs: ['metoprolol', 'paroxetine'], severity: SEVERITY.MAJOR, mechanism: 'Paroxetine is the most potent CYP2D6 inhibitor among SSRIs; dramatically increases metoprolol exposure', clinicalEffect: 'Bradycardia, hypotension, fatigue, exercise intolerance; risk of heart block in susceptible patients', recommendation: 'Switch to atenolol or bisoprolol (less CYP2D6 dependent) or use sertraline/citalopram (weak CYP2D6 inhibition).' },
      { drugs: ['metoprolol', 'digoxin'], severity: SEVERITY.MODERATE, mechanism: 'Additive AV nodal depression: beta-blocker slows AV conduction, digoxin has vagotonic effect on AV node', clinicalEffect: 'Risk of symptomatic bradycardia and AV block', recommendation: 'Commonly used together in heart failure/AF but monitor heart rate closely. Hold if HR <50. Check digoxin levels.' },

      // Digoxin interactions
      { drugs: ['digoxin', 'amiodarone'], severity: SEVERITY.MAJOR, mechanism: 'Amiodarone inhibits P-glycoprotein and reduces renal/non-renal clearance of digoxin, increasing levels by 70-100%', clinicalEffect: 'Digoxin toxicity: nausea, visual disturbances (yellow halos), arrhythmias (PAT with block, junctional tachycardia)', recommendation: 'Reduce digoxin dose by 50% when starting amiodarone. Monitor digoxin levels at 1 week. Target level 0.5-0.9 ng/mL for heart failure.' },
      { drugs: ['digoxin', 'clarithromycin'], severity: SEVERITY.MAJOR, mechanism: 'Clarithromycin inhibits P-glycoprotein-mediated renal secretion and may increase digoxin absorption by eliminating gut flora (Eubacterium lentum)', clinicalEffect: 'Digoxin toxicity; may present with anorexia, nausea, arrhythmias', recommendation: 'Monitor digoxin levels within 5 days of starting clarithromycin. Consider azithromycin (less P-gp inhibition) as alternative.' },
      { drugs: ['digoxin', 'spironolactone'], severity: SEVERITY.MODERATE, mechanism: 'Spironolactone reduces renal tubular secretion of digoxin and may interfere with digoxin immunoassays', clinicalEffect: 'Modestly elevated digoxin levels; assay interference may overestimate true levels', recommendation: 'Monitor digoxin levels using chemiluminescent assay (less interference). Common combination in heart failure; generally well tolerated at low doses of both.' },
      { drugs: ['digoxin', 'furosemide'], severity: SEVERITY.MAJOR, mechanism: 'Furosemide causes hypokalemia and hypomagnesemia; low K+ increases digoxin binding to Na+/K+-ATPase', clinicalEffect: 'Enhanced digoxin toxicity even at therapeutic digoxin levels; arrhythmias including fatal ventricular fibrillation', recommendation: 'Monitor K+ and Mg2+ closely. Supplement potassium to maintain K+ >4.0. Consider adding spironolactone for potassium-sparing effect.' },

      // Levothyroxine interactions
      { drugs: ['levothyroxine', 'omeprazole'], severity: SEVERITY.MODERATE, mechanism: 'PPIs increase gastric pH, reducing dissolution and absorption of levothyroxine (requires acidic environment for optimal absorption)', clinicalEffect: 'Decreased levothyroxine bioavailability; may require dose increase of 20-30%', recommendation: 'Check TSH 6-8 weeks after starting PPI. Take levothyroxine on empty stomach, 30-60 min before PPI. May need levothyroxine dose increase.' },
      { drugs: ['levothyroxine', 'carbamazepine'], severity: SEVERITY.MODERATE, mechanism: 'Carbamazepine induces hepatic CYP3A4 and UGT enzymes, accelerating T4 glucuronidation and clearance', clinicalEffect: 'Reduced free T4 levels; potential hypothyroid symptoms (fatigue, weight gain, cold intolerance)', recommendation: 'Monitor TSH and free T4 within 4-6 weeks of adding carbamazepine. Dose increase of levothyroxine typically needed.' },
      { drugs: ['warfarin', 'levothyroxine'], severity: SEVERITY.MODERATE, mechanism: 'Thyroid hormones increase catabolism of vitamin K-dependent clotting factors and may enhance warfarin receptor sensitivity', clinicalEffect: 'Increased warfarin effect; elevated INR, increased bleeding risk when thyroid status changes', recommendation: 'Monitor INR when initiating or adjusting thyroid replacement. Warfarin dose may need reduction as euthyroidism is achieved.' },

      // Benzodiazepine + opioid
      { drugs: ['alprazolam', 'morphine'], severity: SEVERITY.SEVERE, mechanism: 'Synergistic CNS and respiratory depression: benzodiazepines potentiate opioid-induced respiratory depression via GABA-mediated pathways', clinicalEffect: 'Fatal respiratory depression, profound sedation, coma. FDA Black Box Warning on concurrent use.', recommendation: 'AVOID combination per FDA boxed warning. If medically necessary, use lowest effective doses and shortest duration. Prescribe naloxone rescue kit. Monitor pulse oximetry.' },
      { drugs: ['alprazolam', 'tramadol'], severity: SEVERITY.MAJOR, mechanism: 'Additive CNS depression; both are CYP3A4 substrates competing for metabolism; tramadol also lowers seizure threshold', clinicalEffect: 'Excessive sedation, respiratory depression, seizure risk', recommendation: 'Avoid if possible. If combined, reduce doses of both agents. Monitor respiratory status. Educate patient on sedation risk.' },
      { drugs: ['zolpidem', 'morphine'], severity: SEVERITY.SEVERE, mechanism: 'Both cause CNS and respiratory depression via complementary mechanisms (GABA-A agonism + mu-opioid agonism)', clinicalEffect: 'Risk of fatal respiratory depression during sleep; FDA Black Box Warning', recommendation: 'AVOID. Use non-pharmacologic sleep measures or non-GABAergic alternatives (low-dose trazodone, melatonin) in patients on opioids.' },

      // Insulin + glucose-lowering
      { drugs: ['insulin', 'glipizide'], severity: SEVERITY.MAJOR, mechanism: 'Additive glucose-lowering: exogenous insulin + sulfonylurea-stimulated endogenous insulin release', clinicalEffect: 'Severe hypoglycemia risk, especially in elderly or those with renal impairment', recommendation: 'Reduce sulfonylurea dose by 50% when initiating insulin. Frequent glucose monitoring. Educate on hypoglycemia signs and treatment.' },
      { drugs: ['insulin', 'metformin'], severity: SEVERITY.MODERATE, mechanism: 'Complementary mechanisms: insulin promotes glucose uptake, metformin reduces hepatic output. Additive glucose lowering.', clinicalEffect: 'Increased hypoglycemia risk though less than with sulfonylureas; weight gain may be offset by metformin', recommendation: 'Standard combination in type 2 diabetes. Start insulin at low dose (10U basal). Monitor fasting glucose. Adjust insulin, not metformin, for glycemic targets.' },
      { drugs: ['metformin', 'glipizide'], severity: SEVERITY.MODERATE, mechanism: 'Additive glucose lowering via complementary pathways (hepatic glucose reduction + increased insulin secretion)', clinicalEffect: 'Increased hypoglycemia risk, primarily from sulfonylurea component', recommendation: 'Common combination. Educate patient on hypoglycemia symptoms. Consider dose reduction of glipizide in elderly or renal impairment.' },

      // Prednisone interactions
      { drugs: ['prednisone', 'ibuprofen'], severity: SEVERITY.MAJOR, mechanism: 'Corticosteroids impair GI mucosal defenses and promote acid secretion; NSAIDs inhibit protective prostaglandins', clinicalEffect: 'Up to 15-fold increased risk of GI ulceration and bleeding compared to either agent alone', recommendation: 'Add PPI prophylaxis if combination necessary. Use lowest NSAID dose for shortest duration. Consider acetaminophen for mild-moderate pain.' },
      { drugs: ['prednisone', 'warfarin'], severity: SEVERITY.MODERATE, mechanism: 'Corticosteroids may enhance or diminish warfarin effect; also increase risk of GI bleeding independently', clinicalEffect: 'Unpredictable INR changes (usually increased); additive GI bleeding risk', recommendation: 'Monitor INR closely when starting, changing dose, or stopping prednisone. Consider PPI prophylaxis.' },
      { drugs: ['prednisone', 'metformin'], severity: SEVERITY.MODERATE, mechanism: 'Glucocorticoids promote gluconeogenesis, glycogenolysis, and insulin resistance, counteracting metformin effects', clinicalEffect: 'Hyperglycemia; may require significant metformin dose increase or addition of other agents', recommendation: 'Monitor glucose closely. May need to intensify diabetes therapy during steroid course. Effect resolves after steroid discontinuation.' },

      // Ciprofloxacin specific
      { drugs: ['ciprofloxacin', 'levothyroxine'], severity: SEVERITY.MODERATE, mechanism: 'Ciprofloxacin chelates with divalent/trivalent cations and may reduce levothyroxine absorption if taken concurrently', clinicalEffect: 'Reduced levothyroxine absorption; potential hypothyroid symptoms during treatment course', recommendation: 'Separate administration by at least 4 hours. Monitor TSH if prolonged antibiotic course.' },

      // Carbamazepine interactions
      { drugs: ['carbamazepine', 'alprazolam'], severity: SEVERITY.MAJOR, mechanism: 'Carbamazepine is a potent CYP3A4 inducer; alprazolam is primarily CYP3A4-metabolized', clinicalEffect: 'Drastically reduced alprazolam levels (up to 50%); breakthrough anxiety, seizures if benzodiazepine is for epilepsy', recommendation: 'Avoid combination. Use lorazepam or oxazepam (glucuronidation, not CYP-dependent) if benzodiazepine needed with carbamazepine.' },
      { drugs: ['carbamazepine', 'simvastatin'], severity: SEVERITY.MAJOR, mechanism: 'CYP3A4 induction by carbamazepine dramatically reduces simvastatin and its active metabolite levels', clinicalEffect: 'Loss of statin efficacy; inadequate LDL reduction, increased cardiovascular risk', recommendation: 'Use pravastatin or rosuvastatin (not CYP3A4 substrates). If using CYP3A4-metabolized statin, may need significantly higher doses with monitoring.' },

      // Minor / no interactions
      { drugs: ['acetaminophen', 'amoxicillin'], severity: SEVERITY.NONE, mechanism: 'No significant pharmacokinetic or pharmacodynamic interaction', clinicalEffect: 'No clinically significant interaction expected', recommendation: 'Safe to use together. Standard dosing for both agents.' },
      { drugs: ['amlodipine', 'omeprazole'], severity: SEVERITY.NONE, mechanism: 'No significant shared metabolic pathways or pharmacodynamic overlap', clinicalEffect: 'No clinically significant interaction', recommendation: 'Safe combination. No dose adjustment needed.' },
      { drugs: ['gabapentin', 'acetaminophen'], severity: SEVERITY.NONE, mechanism: 'Gabapentin is renally eliminated without hepatic metabolism; no CYP overlap with acetaminophen', clinicalEffect: 'No interaction expected', recommendation: 'Safe combination for multimodal pain management.' },
      { drugs: ['albuterol', 'montelukast'], severity: SEVERITY.NONE, mechanism: 'Complementary mechanisms in asthma management; no overlapping metabolism', clinicalEffect: 'No adverse interaction; therapeutically complementary', recommendation: 'Standard asthma combination therapy. Safe to use together.' },
      { drugs: ['lisinopril', 'amlodipine'], severity: SEVERITY.MINOR, mechanism: 'Additive blood pressure lowering via complementary mechanisms (RAAS inhibition + vasodilation)', clinicalEffect: 'Enhanced antihypertensive effect; risk of first-dose hypotension', recommendation: 'Common and effective antihypertensive combination. Start at low doses. Monitor BP, especially after first dose.' },
      { drugs: ['metoprolol', 'lisinopril'], severity: SEVERITY.MINOR, mechanism: 'Additive blood pressure and heart rate reduction through complementary pathways', clinicalEffect: 'Enhanced BP lowering; minimal additional risk when titrated appropriately', recommendation: 'Standard combination for hypertension and heart failure. Monitor BP and HR during titration.' },
      { drugs: ['omeprazole', 'amoxicillin'], severity: SEVERITY.MINOR, mechanism: 'PPI increases gastric pH which may slightly increase amoxicillin absorption; used together in H. pylori regimens', clinicalEffect: 'Therapeutic synergy in H. pylori eradication; no adverse interaction', recommendation: 'Standard component of H. pylori triple therapy. No dose adjustment needed.' },
      { drugs: ['pantoprazole', 'clopidogrel'], severity: SEVERITY.MINOR, mechanism: 'Pantoprazole has minimal CYP2C19 inhibition compared to omeprazole; less impact on clopidogrel activation', clinicalEffect: 'Minimal reduction in clopidogrel antiplatelet activity', recommendation: 'Preferred PPI with clopidogrel. No clinically significant interaction at standard doses.' },
      { drugs: ['aspirin', 'metformin'], severity: SEVERITY.MINOR, mechanism: 'Both commonly used in cardiovascular risk reduction for diabetic patients; no significant interaction', clinicalEffect: 'No clinically significant adverse interaction', recommendation: 'Standard combination in diabetes cardiovascular prevention. Safe to use together.' },
    ];

    // ============================================================
    // 📋 PRE-LOADED SCENARIOS
    // ============================================================

    const SCENARIOS = [
      {
        name: 'Polypharmacy Elderly Patient',
        description: '78yo with HF, AFib, DM2, OA, depression',
        drugs: ['warfarin', 'digoxin', 'metformin', 'ibuprofen', 'sertraline', 'furosemide'],
        icon: '👴'
      },
      {
        name: 'Post-MI Protocol',
        description: 'Standard post-myocardial infarction regimen',
        drugs: ['aspirin', 'clopidogrel', 'atorvastatin', 'metoprolol', 'lisinopril', 'omeprazole'],
        icon: '🫀'
      },
      {
        name: 'Depression + Pain Mgmt',
        description: 'Chronic pain patient starting antidepressant',
        drugs: ['fluoxetine', 'tramadol', 'gabapentin', 'alprazolam', 'ibuprofen'],
        icon: '🧠'
      },
      {
        name: 'Infection + Anticoag',
        description: 'Patient on anticoagulation developing infection',
        drugs: ['warfarin', 'clarithromycin', 'acetaminophen', 'omeprazole'],
        icon: '🦠'
      },
    ];

    // ============================================================
    // 🛠️ UTILITY FUNCTIONS
    // ============================================================

    function getInteraction(drugA, drugB) {
      return INTERACTIONS.find(i =>
        (i.drugs.includes(drugA) && i.drugs.includes(drugB)) && drugA !== drugB
      );
    }

    function getSeverityConfig(sev) {
      const configs = {
        SEVERE:   { color: '#ef4444', bg: 'bg-red-900/60',   border: 'border-red-500',   label: 'SEVERE',   emoji: '🔴', textColor: 'text-red-400' },
        MAJOR:    { color: '#f97316', bg: 'bg-orange-900/50', border: 'border-orange-500', label: 'MAJOR',    emoji: '🟠', textColor: 'text-orange-400' },
        MODERATE: { color: '#eab308', bg: 'bg-yellow-900/40', border: 'border-yellow-500', label: 'MODERATE', emoji: '🟡', textColor: 'text-yellow-400' },
        MINOR:    { color: '#22c55e', bg: 'bg-green-900/40',  border: 'border-green-500',  label: 'MINOR',    emoji: '🟢', textColor: 'text-green-400' },
        NONE:     { color: '#64748b', bg: 'bg-slate-800/60',  border: 'border-slate-600',  label: 'NONE',     emoji: '⚪', textColor: 'text-slate-400' },
      };
      return configs[sev] || configs.NONE;
    }

    // ============================================================
    // 🎨 COMPONENTS
    // ============================================================

    function DrugSearch({ selectedDrugs, onAddDrug, onRemoveDrug }) {
      const [query, setQuery] = useState('');
      const [isOpen, setIsOpen] = useState(false);
      const inputRef = useRef(null);

      const filtered = useMemo(() => {
        if (!query.trim()) return DRUGS;
        const q = query.toLowerCase();
        return DRUGS.filter(d =>
          d.name.toLowerCase().includes(q) ||
          d.class.toLowerCase().includes(q) ||
          DRUG_CLASSES[d.class]?.label.toLowerCase().includes(q)
        );
      }, [query]);

      const grouped = useMemo(() => {
        const groups = {};
        filtered.forEach(d => {
          if (!groups[d.class]) groups[d.class] = [];
          groups[d.class].push(d);
        });
        return groups;
      }, [filtered]);

      const handleSelect = (drug) => {
        if (selectedDrugs.length < 6 && !selectedDrugs.find(d => d.id === drug.id)) {
          onAddDrug(drug);
        }
        setQuery('');
        inputRef.current?.focus();
      };

      return (
        <div className="relative">
          <div className="mb-3">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Select Medications ({selectedDrugs.length}/6)
            </label>
            <div className="flex flex-wrap gap-2 mb-2 min-h-[36px]">
              {selectedDrugs.map(drug => {
                const cls = DRUG_CLASSES[drug.class];
                return (
                  <span key={drug.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium fade-in"
                    style={{ background: cls.color + '22', border: '1px solid ' + cls.color + '66', color: cls.color }}>
                    {cls.icon} {drug.name}
                    <button onClick={() => onRemoveDrug(drug.id)}
                      className="ml-1 hover:text-white transition-colors text-lg leading-none">&times;</button>
                  </span>
                );
              })}
              {selectedDrugs.length === 0 && (
                <span className="text-slate-500 text-sm italic py-1.5">No medications selected — search below or try a scenario</span>
              )}
            </div>
          </div>

          <div className="relative">
            <input ref={inputRef} type="text" value={query}
              onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
              onFocus={() => setIsOpen(true)}
              placeholder="🔍 Search by drug name or class..."
              disabled={selectedDrugs.length >= 6}
              className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 disabled:opacity-40 disabled:cursor-not-allowed" />
            {selectedDrugs.length >= 6 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400">Max 6 reached</span>
            )}
          </div>

          {isOpen && selectedDrugs.length < 6 && (
            <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
              {Object.entries(grouped).map(([cls, drugs]) => (
                <div key={cls}>
                  <div className="px-3 py-1.5 text-xs font-bold text-slate-400 bg-slate-900/60 sticky top-0 flex items-center gap-1.5">
                    {DRUG_CLASSES[cls]?.icon} {DRUG_CLASSES[cls]?.label}
                  </div>
                  {drugs.map(drug => {
                    const isSelected = selectedDrugs.find(d => d.id === drug.id);
                    return (
                      <button key={drug.id}
                        onClick={() => !isSelected && handleSelect(drug)}
                        disabled={isSelected}
                        className={"w-full text-left px-4 py-2 text-sm hover:bg-slate-700/60 transition-colors flex items-center justify-between " + (isSelected ? "opacity-30 cursor-not-allowed" : "cursor-pointer")}>
                        <span className="text-white">{drug.name}</span>
                        {isSelected && <span className="text-xs text-sky-400">✓ Selected</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-slate-500 text-sm">No medications matching "{query}"</div>
              )}
              <button onClick={() => setIsOpen(false)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 bg-slate-900/40 transition-colors">
                Close search ▲
              </button>
            </div>
          )}
        </div>
      );
    }

    function ScenarioButtons({ onLoadScenario }) {
      return (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick-load Scenarios</p>
          <div className="grid grid-cols-2 gap-2">
            {SCENARIOS.map(s => (
              <button key={s.name} onClick={() => onLoadScenario(s)}
                className="text-left p-2.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 hover:border-sky-500/40 rounded-lg transition-all group">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-sky-300 transition-colors">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    function InteractionMatrix({ selectedDrugs, onCellClick, activePair }) {
      if (selectedDrugs.length < 2) {
        return (
          <div className="flex items-center justify-center h-64 text-slate-500">
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-40">📊</div>
              <p className="text-sm">Select at least 2 medications to view the interaction matrix</p>
            </div>
          </div>
        );
      }

      const n = selectedDrugs.length;
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-xs text-slate-500 border-b border-slate-700" />
                {selectedDrugs.map(d => (
                  <th key={d.id} className="p-2 text-xs font-medium text-slate-300 border-b border-slate-700 text-center min-w-[80px]" style={{ writingMode: n > 4 ? 'vertical-rl' : 'horizontal-tb', textOrientation: 'mixed' }}>
                    {d.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedDrugs.map((rowDrug, ri) => (
                <tr key={rowDrug.id}>
                  <td className="p-2 text-xs font-medium text-slate-300 border-r border-slate-700 whitespace-nowrap">{rowDrug.name}</td>
                  {selectedDrugs.map((colDrug, ci) => {
                    if (ri === ci) {
                      return <td key={colDrug.id} className="p-1"><div className="size-12 mx-auto bg-slate-800/40 rounded flex items-center justify-center text-slate-600 text-lg">—</div></td>;
                    }
                    if (ri > ci) {
                      return <td key={colDrug.id} className="p-1"><div className="size-12 mx-auto bg-slate-900/20 rounded" /></td>;
                    }
                    const interaction = getInteraction(rowDrug.id, colDrug.id);
                    const sev = interaction ? interaction.severity : null;
                    const config = sev ? getSeverityConfig(sev) : null;
                    const isActive = activePair && activePair[0] === rowDrug.id && activePair[1] === colDrug.id;
                    const isUnknown = !interaction;

                    return (
                      <td key={colDrug.id} className="p-1">
                        <button
                          onClick={() => interaction && onCellClick(rowDrug.id, colDrug.id)}
                          className={"size-12 mx-auto rounded flex items-center justify-center text-lg transition-all " +
                            (isActive ? "ring-2 ring-white scale-110 " : "") +
                            (interaction ? "cursor-pointer hover:scale-105 " : "cursor-default ") +
                            (sev === 'SEVERE' ? "pulse-severe " : "")}
                          style={{
                            background: config ? config.color + '33' : '#1e293b',
                            border: '2px solid ' + (config ? config.color + (isActive ? 'ff' : '66') : '#334155'),
                          }}
                          title={interaction ? sev + ': ' + rowDrug.name + ' + ' + colDrug.name : 'No known interaction data'}>
                          {config ? config.emoji : '➖'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    function InteractionDetail({ drugA, drugB, interaction }) {
      if (!interaction) return null;
      const config = getSeverityConfig(interaction.severity);
      const a = DRUGS.find(d => d.id === drugA);
      const b = DRUGS.find(d => d.id === drugB);

      return (
        <div className={"fade-in rounded-xl border-2 p-5 " + config.bg + " " + config.border}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{config.emoji}</span>
              <div>
                <h3 className="text-lg font-extrabold text-white">{a.name} + {b.name}</h3>
                <span className={"text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full " + config.textColor}
                  style={{ background: config.color + '22', border: '1px solid ' + config.color + '44' }}>
                  {config.label} INTERACTION
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div className="bg-slate-900/40 rounded-lg p-3">
                <div className="text-slate-400 font-semibold mb-1">{a.name}</div>
                <div className="text-slate-300">{a.moa}</div>
              </div>
              <div className="bg-slate-900/40 rounded-lg p-3">
                <div className="text-slate-400 font-semibold mb-1">{b.name}</div>
                <div className="text-slate-300">{b.moa}</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">⚙️ Mechanism of Interaction</h4>
              <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/30 rounded-lg p-3">{interaction.mechanism}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">⚠️ Clinical Effect</h4>
              <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/30 rounded-lg p-3">{interaction.clinicalEffect}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">📋 Recommendation</h4>
              <p className="text-sm text-white leading-relaxed bg-slate-900/30 rounded-lg p-3 font-medium">{interaction.recommendation}</p>
            </div>
          </div>
        </div>
      );
    }

    function SummaryReport({ selectedDrugs }) {
      const allInteractions = useMemo(() => {
        const results = [];
        for (let i = 0; i < selectedDrugs.length; i++) {
          for (let j = i + 1; j < selectedDrugs.length; j++) {
            const inter = getInteraction(selectedDrugs[i].id, selectedDrugs[j].id);
            if (inter) {
              results.push({ ...inter, drugA: selectedDrugs[i], drugB: selectedDrugs[j] });
            }
          }
        }
        return results;
      }, [selectedDrugs]);

      const counts = useMemo(() => {
        const c = { SEVERE: 0, MAJOR: 0, MODERATE: 0, MINOR: 0, NONE: 0 };
        allInteractions.forEach(i => { c[i.severity] = (c[i.severity] || 0) + 1; });
        return c;
      }, [allInteractions]);

      const possiblePairs = selectedDrugs.length * (selectedDrugs.length - 1) / 2;
      const unknownPairs = possiblePairs - allInteractions.length;

      if (selectedDrugs.length < 2) return null;

      const critical = allInteractions.filter(i => i.severity === 'SEVERE' || i.severity === 'MAJOR');

      return (
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            📊 Interaction Summary
          </h2>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[['SEVERE', counts.SEVERE], ['MAJOR', counts.MAJOR], ['MODERATE', counts.MODERATE], ['MINOR', counts.MINOR], ['NONE', counts.NONE], ['Unknown', unknownPairs]].map(([label, count]) => {
              const config = label === 'Unknown' ? { color: '#475569', emoji: '❓', textColor: 'text-slate-400' } : getSeverityConfig(label);
              return (
                <div key={label} className="text-center p-3 rounded-lg" style={{ background: config.color + '15', border: '1px solid ' + config.color + '33' }}>
                  <div className="text-2xl font-bold" style={{ color: config.color }}>{count}</div>
                  <div className={"text-xs font-medium " + (config.textColor || 'text-slate-400')}>{label}</div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-slate-500">
            {allInteractions.length} known interactions out of {possiblePairs} possible drug pairs analyzed.
          </div>

          {critical.length > 0 && (
            <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4">
              <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                🚨 Critical Interactions Requiring Attention
              </h3>
              <div className="space-y-2">
                {critical.map((inter, idx) => {
                  const config = getSeverityConfig(inter.severity);
                  return (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span>{config.emoji}</span>
                      <div>
                        <span className="font-semibold text-white">{inter.drugA.name} + {inter.drugB.name}</span>
                        <span className={"ml-2 text-xs font-bold " + config.textColor}>[{inter.severity}]</span>
                        <p className="text-xs text-slate-400 mt-0.5">{inter.clinicalEffect}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {allInteractions.length > 0 && critical.length === 0 && (
            <div className="bg-green-950/30 border border-green-800/40 rounded-xl p-4 text-center">
              <span className="text-green-400 text-sm font-medium">✅ No severe or major interactions found in this combination.</span>
            </div>
          )}
        </div>
      );
    }

    // ============================================================
    // 🏠 MAIN APP
    // ============================================================

    function App() {
      const [selectedDrugs, setSelectedDrugs] = useState([]);
      const [activePair, setActivePair] = useState(null);
      const [activeInteraction, setActiveInteraction] = useState(null);

      const handleAddDrug = useCallback((drug) => {
        setSelectedDrugs(prev => {
          if (prev.length >= 6 || prev.find(d => d.id === drug.id)) return prev;
          return [...prev, drug];
        });
        setActivePair(null);
        setActiveInteraction(null);
      }, []);

      const handleRemoveDrug = useCallback((drugId) => {
        setSelectedDrugs(prev => prev.filter(d => d.id !== drugId));
        setActivePair(null);
        setActiveInteraction(null);
      }, []);

      const handleCellClick = useCallback((drugAId, drugBId) => {
        const inter = getInteraction(drugAId, drugBId);
        if (inter) {
          setActivePair([drugAId, drugBId]);
          setActiveInteraction(inter);
        }
      }, []);

      const handleLoadScenario = useCallback((scenario) => {
        const drugs = scenario.drugs.map(id => DRUGS.find(d => d.id === id)).filter(Boolean);
        setSelectedDrugs(drugs);
        setActivePair(null);
        setActiveInteraction(null);
      }, []);

      const handleClear = useCallback(() => {
        setSelectedDrugs([]);
        setActivePair(null);
        setActiveInteraction(null);
      }, []);

      return (
        <div className="min-h-screen bg-slate-950">
          {/* Header */}
          <header className="bg-gradient-to-r from-slate-900 via-sky-950/30 to-slate-900 border-b border-slate-800 px-5 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💊</span>
                <div>
                  <h1 className="text-xl font-extrabold text-white">Drug Interaction Checker</h1>
                  <p className="text-xs text-slate-400">Select up to 6 medications to analyze pharmacological interactions</p>
                </div>
              </div>
              {selectedDrugs.length > 0 && (
                <button onClick={handleClear}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors">
                  Clear All
                </button>
              )}
            </div>
          </header>

          <main className="max-w-7xl mx-auto p-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Left Column — Drug Selection */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <DrugSearch
                    selectedDrugs={selectedDrugs}
                    onAddDrug={handleAddDrug}
                    onRemoveDrug={handleRemoveDrug}
                  />
                  <ScenarioButtons onLoadScenario={handleLoadScenario} />
                </div>

                {/* Drug Legend */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Severity Legend</h3>
                  <div className="space-y-1.5">
                    {['SEVERE', 'MAJOR', 'MODERATE', 'MINOR', 'NONE'].map(sev => {
                      const c = getSeverityConfig(sev);
                      return (
                        <div key={sev} className="flex items-center gap-2 text-xs">
                          <span>{c.emoji}</span>
                          <span className={"font-semibold " + c.textColor}>{c.label}</span>
                          <span className="text-slate-500">
                            {sev === 'SEVERE' && '— Contraindicated'}
                            {sev === 'MAJOR' && '— Significant risk'}
                            {sev === 'MODERATE' && '— Monitor closely'}
                            {sev === 'MINOR' && '— Minimal risk'}
                            {sev === 'NONE' && '— No known interaction'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Database Stats */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">📚 Database</h3>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-slate-800/60 rounded-lg p-2">
                      <div className="text-xl font-bold text-sky-400">{DRUGS.length}</div>
                      <div className="text-xs text-slate-500">Medications</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-2">
                      <div className="text-xl font-bold text-sky-400">{INTERACTIONS.length}</div>
                      <div className="text-xs text-slate-500">Interactions</div>
                    </div>
                  </div>
                  <p className="text-xs text-amber-400/70 mt-3 italic leading-relaxed">
                    ⚠️ Educational tool only. Not for clinical decision-making. Always consult a pharmacist or prescriber for patient care.
                  </p>
                </div>
              </div>

              {/* Right Column — Matrix + Details */}
              <div className="lg:col-span-2 space-y-5">
                {/* Matrix */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <h2 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                    📊 Interaction Matrix
                    {selectedDrugs.length >= 2 && <span className="text-xs text-slate-500 font-normal">— Click a cell to view details</span>}
                  </h2>
                  <InteractionMatrix
                    selectedDrugs={selectedDrugs}
                    onCellClick={handleCellClick}
                    activePair={activePair}
                  />
                </div>

                {/* Detail Panel */}
                {activeInteraction && activePair && (
                  <InteractionDetail
                    drugA={activePair[0]}
                    drugB={activePair[1]}
                    interaction={activeInteraction}
                  />
                )}

                {/* Summary Report */}
                {selectedDrugs.length >= 2 && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                    <SummaryReport selectedDrugs={selectedDrugs} />
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      );
    }

    // ============================================================
    // 🚀 MOUNT
    // ============================================================

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  <\/script>
</body>
</html>`;
