import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'cardiac-arrest',
  title: 'Dynamic Cardiac Arrest Simulator',
  description:
    'ACLS cardiac arrest simulator with randomized clinical scenarios, patient history, dynamic physical exam, STAT labs, root-cause identification (H\'s & T\'s), and post-sim debrief.',
  category: 'simulation',
  thumbnailEmoji: '🏥',
  editorScrollTarget: '// 📋 CLINICAL SCENARIOS',
  warmStartConfig: {
    previewRatio: 0.6,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText:
      '✨ This is a working simulator — you built it. Click "▶ Run Simulator" to see it respond.',
    ctaLabel: '▶ Run Simulator',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dynamic Cardiac Arrest Simulator</title>
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
    body { margin: 0; background: #1a1a2e; color: #fff; font-family: system-ui, sans-serif; }
    @keyframes pulse-green { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
    .ecg-pulse { animation: pulse-green 1s ease-in-out infinite; }
    .tab-active { background: #1e293b; color: #fff; border-bottom: 2px solid #3b82f6; }
    .tab-inactive { background: transparent; color: #6b7280; }
    .tab-inactive:hover { color: #9ca3af; }
    .scroll-thin::-webkit-scrollbar { width: 4px; }
    .scroll-thin::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
    .flag-high { color: #f59e0b; font-weight: 700; }
    .flag-critical { color: #ef4444; font-weight: 700; }
    .flag-normal { color: #6ee7b7; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useReducer, useEffect, useRef, useCallback, useMemo } = React;

    // ============================================================
    // 📋 CLINICAL SCENARIOS
    // ============================================================

    const SCENARIOS = [
      {
        id: 'hyperkalemia',
        title: '67M — Found Unresponsive at Home',
        initialRhythm: 'V_FIB',
        rootCause: 'HYPERKALEMIA',
        rootCauseLabel: 'Hyperkalemia',
        rootCauseCategory: 'Hypokalemia / Hyperkalemia',
        targetedTreatment: 'calcium',
        pmh: ['CKD Stage 4 (on hemodialysis MWF)', 'Type 2 Diabetes Mellitus', 'Hypertension', 'Gout'],
        medications: ['Lisinopril 20mg daily', 'Insulin glargine 30u qHS', 'Spironolactone 25mg daily', 'Sevelamer 800mg TID'],
        allergies: 'Sulfa (rash)',
        socialHistory: 'Lives alone. Home health aide visits daily. Former smoker (quit 10yr). No alcohol.',
        hpiText: 'Home health aide arrived at 0730 and found the patient unresponsive on the bedroom floor. EMS reports the patient missed his last two dialysis sessions due to transportation issues. Aide states the patient complained of worsening weakness, nausea, and "tingling in his hands" yesterday evening. Last seen normal at 1800 the prior day. No witnessed seizure activity. AV fistula noted on left forearm.',
        physicalExam: {
          general: 'Unresponsive elderly male, appears older than stated age, thin habitus',
          neuro: 'GCS 3. Pupils 4mm, equal and reactive',
          respiratory: 'No spontaneous respirations. Crackles at bilateral bases',
          cardiovascular: 'No pulse. EMS reports wide-complex irregular rhythm on initial strip',
          skin: 'Cool, pale, dry. No rashes or lesions',
          neck: 'No JVD. Trachea midline',
          abdomen: 'Mildly distended. Old peritoneal dialysis scar noted',
          extremities: '2+ pitting edema bilateral lower extremities. Left forearm AV fistula with palpable thrill (pre-arrest)',
          other: 'Fingerstick glucose 342 mg/dL per EMS'
        },
        labValues: {
          potassium: { value: '7.8', flag: 'CRITICAL' },
          pH: { value: '7.18', flag: 'HIGH' },
          lactate: { value: '6.2', flag: 'HIGH' },
          troponin: { value: '0.04', flag: '' },
          glucose: { value: '342', flag: 'HIGH' },
          special: { label: 'Creatinine', value: '8.4 mg/dL', flag: 'CRITICAL' }
        },
        postTreatmentExam: {
          cardiovascular: 'Rhythm narrowing on monitor. Weak but palpable pulses intermittently noted'
        },
        clinicalPearl: 'Hyperkalemia is a common cause of cardiac arrest in renal failure patients. Key clues: missed dialysis, AV fistula, weakness/paresthesias, wide-complex rhythm, elevated K+. Calcium chloride stabilizes the myocardium within 1-3 minutes. Follow with insulin/glucose, sodium bicarbonate, and emergent dialysis. Spironolactone (a K-sparing diuretic) in a CKD patient is a red flag for hyperkalemia risk.'
      },
      {
        id: 'tension-pneumo',
        title: '28M — Fall from Scaffolding',
        initialRhythm: 'PEA',
        rootCause: 'TENSION_PNEUMO',
        rootCauseLabel: 'Tension Pneumothorax',
        rootCauseCategory: 'Tension Pneumothorax',
        targetedTreatment: 'needle',
        pmh: ['No significant past medical history'],
        medications: ['None'],
        allergies: 'NKDA',
        socialHistory: 'Construction worker. No tobacco, occasional alcohol. Lives with girlfriend.',
        hpiText: 'EMS brings in a 28-year-old male who fell approximately 15 feet from scaffolding at a construction site. Initially alert and oriented (GCS 14), complaining of severe right-sided chest pain and progressive shortness of breath. During transport, he became increasingly agitated and tachypneic. BP dropped from 128/82 to 76/40 over 5 minutes. Became unresponsive and lost pulse 2 minutes before arrival. No helmet. Landed on right side.',
        physicalExam: {
          general: 'Young muscular male, unresponsive. Hard hat and safety vest removed by EMS',
          neuro: 'GCS 3. Pupils 3mm, equal and reactive',
          respiratory: 'No spontaneous respirations. ABSENT breath sounds on RIGHT. Clear on LEFT',
          cardiovascular: 'No pulse. Narrow-complex electrical activity on monitor (PEA)',
          skin: 'Cyanotic, cool, diaphoretic',
          neck: 'JVD present. Trachea DEVIATED TO LEFT',
          abdomen: 'Soft, non-distended. No obvious trauma',
          extremities: 'Large contusion right lateral chest wall. No deformity. Pelvis stable',
          other: 'Subcutaneous emphysema palpable over right chest wall'
        },
        labValues: {
          potassium: { value: '4.1', flag: '' },
          pH: { value: '7.28', flag: 'HIGH' },
          lactate: { value: '4.8', flag: 'HIGH' },
          troponin: { value: '<0.01', flag: '' },
          glucose: { value: '128', flag: '' },
          special: { label: 'Hemoglobin', value: '11.2 g/dL', flag: '' }
        },
        postTreatmentExam: {
          respiratory: 'Rush of air on needle decompression. Breath sounds returning on RIGHT',
          neck: 'JVD resolving. Trachea returning to midline',
          skin: 'Cyanosis improving, color returning'
        },
        clinicalPearl: 'Tension pneumothorax is a clinical diagnosis — do NOT wait for imaging in a crashing patient. Key triad: absent breath sounds on one side, JVD, and tracheal deviation AWAY from the affected side. Needle decompression at the 2nd intercostal space (midclavicular line) or 4th-5th ICS (anterior axillary line) is immediately life-saving. Subcutaneous emphysema and mechanism of injury (blunt chest trauma) are strong clues. This is one of the most treatable causes of PEA arrest.'
      },
      {
        id: 'massive-pe',
        title: '52F — Collapse in Waiting Room',
        initialRhythm: 'PEA',
        rootCause: 'MASSIVE_PE',
        rootCauseLabel: 'Massive Pulmonary Embolism',
        rootCauseCategory: 'Thrombosis — PE',
        targetedTreatment: 'tpa',
        pmh: ['Right total knee arthroplasty (10 days ago)', 'Obesity (BMI 38)', 'Factor V Leiden heterozygous', 'Osteoarthritis'],
        medications: ['Oxycodone 5mg PRN (post-surgical)', 'Aspirin 81mg daily', 'DVT prophylaxis (enoxaparin) discontinued 3 days ago per protocol'],
        allergies: 'Codeine (severe nausea)',
        socialHistory: 'Middle school teacher. Non-smoker. Sedentary since surgery. Uses walker.',
        hpiText: 'A 52-year-old woman at her post-operative follow-up appointment stood up from the waiting room chair, gasped, clutched her chest, and collapsed. Receptionist called a code. Nurse who was taking vitals at intake noted the patient was breathing heavily and complained of feeling "like I can\\'t catch my breath" for the past 20 minutes. Also noted right calf was notably more swollen than left. Patient became unresponsive within seconds of standing. No prior syncopal episodes. Had been essentially bedbound since surgery.',
        physicalExam: {
          general: 'Obese female, unresponsive. Surgical dressing on right knee',
          neuro: 'GCS 3. Pupils 4mm, sluggishly reactive',
          respiratory: 'No spontaneous respirations. Lungs CLEAR bilaterally (no crackles, no wheezing)',
          cardiovascular: 'No pulse. PEA on monitor with sinus tachycardia pattern (no P-wave, narrow QRS)',
          skin: 'Pale, diaphoretic, cool',
          neck: 'JVD present',
          abdomen: 'Obese, soft, non-tender',
          extremities: 'RIGHT calf swollen, erythematous, tender (3cm larger than left). Surgical wound clean. LEFT leg normal. Homan sign not assessed (arrest)',
          other: 'Enoxaparin was held for 3 days per surgical protocol. No sequential compression devices in place'
        },
        labValues: {
          potassium: { value: '4.3', flag: '' },
          pH: { value: '7.22', flag: 'HIGH' },
          lactate: { value: '7.1', flag: 'HIGH' },
          troponin: { value: '0.42', flag: 'HIGH' },
          glucose: { value: '156', flag: '' },
          special: { label: 'D-dimer', value: '>5,000 ng/mL', flag: 'CRITICAL' }
        },
        postTreatmentExam: {
          cardiovascular: 'Organized rhythm on monitor. Faint pulse appreciated with compressions',
          skin: 'Less pale, some color returning to face',
          neck: 'JVD slowly improving'
        },
        clinicalPearl: 'Massive PE should be suspected in any PEA arrest with risk factors for VTE: recent surgery, immobilization, obesity, hypercoagulable state. Key findings: clear lungs (PE doesn\\'t cause crackles!), unilateral leg swelling, JVD (right heart strain), and elevated D-dimer/troponin. The classic teaching is "clear lungs + JVD + PEA = think PE." Systemic tPA (50mg bolus during arrest) can be life-saving. Continue CPR for 15-20 minutes after tPA as it takes time to lyse the clot.'
      },
      {
        id: 'tamponade',
        title: '31F — Lupus Patient, Worsening Chest Pain',
        initialRhythm: 'PEA',
        rootCause: 'TAMPONADE',
        rootCauseLabel: 'Cardiac Tamponade',
        rootCauseCategory: 'Tamponade',
        targetedTreatment: 'pericardiocentesis',
        pmh: ['Systemic Lupus Erythematosus (SLE)', 'Pericarditis x2 in past year', 'CKD Stage 2', 'Raynaud phenomenon'],
        medications: ['Prednisone 10mg daily', 'Hydroxychloroquine 200mg BID', 'Colchicine 0.6mg daily', 'Lisinopril 10mg daily'],
        allergies: 'Ibuprofen (GI bleed)',
        socialHistory: 'Graduate student in biology. Non-smoker. No alcohol. Lives with roommate.',
        hpiText: 'A 31-year-old woman with known SLE presents to the ED with 3 days of progressively worsening chest pain, described as sharp, worse with inspiration and lying flat, improved by leaning forward. She reports increasing dyspnea and lightheadedness over the past 6 hours. Roommate confirms she has been unable to lie flat to sleep. While being triaged, the patient suddenly becomes pale, clutches her chest, and slumps in the wheelchair. Rapid assessment confirms no pulse. Her rheumatologist recently increased her prednisone for a lupus flare.',
        physicalExam: {
          general: 'Young thin female, unresponsive. Malar rash visible on cheeks',
          neuro: 'GCS 3. Pupils 4mm, equal and reactive',
          respiratory: 'No spontaneous respirations. Lungs CLEAR bilaterally',
          cardiovascular: 'No pulse. MUFFLED/DISTANT heart sounds noted pre-arrest by triage nurse. PEA on monitor',
          skin: 'Cool, pale. Malar (butterfly) rash. Livedo reticularis on lower extremities',
          neck: 'JVD MARKEDLY DISTENDED',
          abdomen: 'Soft, non-tender, non-distended',
          extremities: 'No peripheral edema. Raynaud changes in fingertips (pale/blue). No joint swelling',
          other: 'Beck\\'s triad documented pre-arrest: hypotension (BP 72/50), muffled heart sounds, JVD. Pulsus paradoxus >20mmHg noted'
        },
        labValues: {
          potassium: { value: '4.0', flag: '' },
          pH: { value: '7.30', flag: 'HIGH' },
          lactate: { value: '5.4', flag: 'HIGH' },
          troponin: { value: '0.18', flag: 'HIGH' },
          glucose: { value: '104', flag: '' },
          special: { label: 'BNP', value: '890 pg/mL', flag: 'CRITICAL' }
        },
        postTreatmentExam: {
          cardiovascular: 'Heart sounds clearer. Pulse returning. Rhythm organizing on monitor',
          neck: 'JVD rapidly resolving',
          skin: 'Color improving. Warmth returning to extremities'
        },
        clinicalPearl: 'Cardiac tamponade in lupus patients is caused by pericardial effusion from autoimmune pericarditis. Beck\\'s triad (hypotension, muffled heart sounds, JVD) is the classic presentation but only seen in ~30% of cases. PEA arrest with clear lungs + markedly distended JVD should trigger concern for tamponade (especially with pericarditis history). Emergency pericardiocentesis — typically ultrasound-guided subxiphoid approach — can be immediately life-saving. Even 30-50mL of fluid removal can restore cardiac output.'
      },
      {
        id: 'stemi',
        title: '58M — Found Slumped at Office Desk',
        initialRhythm: 'V_FIB',
        rootCause: 'STEMI',
        rootCauseLabel: 'ST-Elevation MI (Primary Cardiac)',
        rootCauseCategory: 'Thrombosis — MI',
        targetedTreatment: null,
        pmh: ['Hypertension', 'Hyperlipidemia', 'Type 2 Diabetes (diet-controlled)', 'Former smoker (30 pack-years, quit 2yr ago)', 'Family Hx: father MI at age 54'],
        medications: ['Metoprolol 50mg BID', 'Atorvastatin 40mg daily', 'Aspirin 81mg daily', 'Metformin 1000mg BID'],
        allergies: 'Penicillin (rash as child)',
        socialHistory: 'Accountant. Sedentary lifestyle. Quit smoking 2 years ago after 30 pack-years. Social alcohol.',
        hpiText: 'Coworkers report the 58-year-old man complained of "bad indigestion" and heaviness in his left arm for approximately 45 minutes. He was sweating profusely and appeared gray. He declined to call 911, saying "it\\'s just heartburn." Found slumped over his desk by a colleague 10 minutes later, not breathing. Office security initiated hands-only CPR. AED advised shock x1 before EMS arrival. Total downtime estimated 8-10 minutes with bystander CPR.',
        physicalExam: {
          general: 'Overweight middle-aged male, unresponsive. Loosened tie and collar',
          neuro: 'GCS 3. Pupils 4mm, equal and reactive',
          respiratory: 'No spontaneous respirations. Lungs clear bilaterally',
          cardiovascular: 'No pulse. V-Fib on monitor. AED pad marks visible on chest',
          skin: 'Diaphoretic, cool, pale/gray',
          neck: 'No JVD. Trachea midline',
          abdomen: 'Obese, soft. No pulsatile mass',
          extremities: 'No edema. No calf asymmetry. Nicotine staining on right index/middle fingers',
          other: 'EMS 12-lead (pre-arrest capture): ST elevation in V1-V4, reciprocal depression in II/III/aVF — consistent with anterior STEMI'
        },
        labValues: {
          potassium: { value: '4.5', flag: '' },
          pH: { value: '7.34', flag: '' },
          lactate: { value: '3.2', flag: 'HIGH' },
          troponin: { value: '12.4', flag: 'CRITICAL' },
          glucose: { value: '198', flag: 'HIGH' },
          special: { label: 'CK-MB', value: '86 ng/mL', flag: 'CRITICAL' }
        },
        postTreatmentExam: {},
        clinicalPearl: 'This is a primary cardiac arrest from acute STEMI — standard ACLS (defibrillation, epinephrine, amiodarone, high-quality CPR) IS the appropriate treatment. No additional targeted intervention is needed during the arrest. Key clues: classic cardiac risk factors (HTN, HLD, DM, smoking, family Hx), prodromal chest pain with diaphoresis, V-Fib as the presenting rhythm, and massively elevated troponin. Post-ROSC, the patient needs emergent cardiac catheterization (PCI). Not every arrest has an exotic reversible cause — sometimes the answer is excellent ACLS.'
      }
    ];

    // ============================================================
    // 🫀 PATIENT STATE & CONSTANTS
    // ============================================================

    const RHYTHM_TYPES = {
      V_FIB: 'Ventricular Fibrillation',
      V_TACH: 'Ventricular Tachycardia',
      PEA: 'Pulseless Electrical Activity',
      ASYSTOLE: 'Asystole',
      SINUS: 'Normal Sinus Rhythm',
    };

    const REVERSIBLE_CAUSES = [
      '-- Not yet determined --',
      'Hypovolemia', 'Hypoxia', 'Hydrogen ion (Acidosis)',
      'Hypokalemia / Hyperkalemia', 'Hypothermia',
      'Tension Pneumothorax', 'Tamponade', 'Toxins',
      'Thrombosis — PE', 'Thrombosis — MI',
    ];

    const ACLS_INTERVENTIONS = [
      { id: 'epi', label: 'Epinephrine', icon: '💊', cooldown: 180 },
      { id: 'defib', label: 'Defibrillate', icon: '⚡', cooldown: 120 },
      { id: 'cpr', label: 'Begin CPR', icon: '🫁', cooldown: 0 },
      { id: 'intubate', label: 'Intubate', icon: '🔧', cooldown: 0 },
      { id: 'amio', label: 'Amiodarone', icon: '💉', cooldown: 0 },
      { id: 'pulse-check', label: 'Pulse Check', icon: '📋', cooldown: 10 },
    ];

    const TARGETED_INTERVENTIONS = [
      { id: 'calcium', label: 'Calcium Chloride', icon: '🧪', hint: 'Hyperkalemia' },
      { id: 'needle', label: 'Needle Decompress', icon: '🫁', hint: 'Tension Pneumo' },
      { id: 'tpa', label: 'Thrombolytics (tPA)', icon: '💉', hint: 'Massive PE' },
      { id: 'pericardiocentesis', label: 'Pericardiocentesis', icon: '🫀', hint: 'Tamponade' },
      { id: 'fluids', label: 'IV Fluid Bolus', icon: '💧', hint: 'Hypovolemia' },
      { id: 'naloxone', label: 'Naloxone', icon: '💊', hint: 'Opioid Toxicity' },
    ];

    function createInitialPatient(scenario) {
      return {
        heartRate: scenario.initialRhythm === 'V_FIB' ? 0 : 0,
        systolic: 0,
        diastolic: 0,
        spO2: 0,
        etco2: 8,
        rhythm: scenario.initialRhythm,
        shockable: scenario.initialRhythm === 'V_FIB' || scenario.initialRhythm === 'V_TACH',
        cprInProgress: false,
        airwaySecured: false,
        epinephrineCount: 0,
        lastEpiTime: null,
        defibrillationCount: 0,
        amiodaroneGiven: false,
        causeTreated: false,
        causeTreatmentGiven: null,
        totalCprMs: 0,
        firstCprTime: null,
        firstDefibTime: null,
        causeTreatedTime: null,
      };
    }

    // ============================================================
    // 🧠 ACLS + ROOT CAUSE ENGINE
    // ============================================================

    function applyACLSIntervention(patient, action, scenario, elapsedSeconds) {
      const p = { ...patient };

      switch (action) {
        case 'defib': {
          p.defibrillationCount += 1;
          if (p.firstDefibTime === null) p.firstDefibTime = elapsedSeconds;
          if (!p.shockable) return p;

          let roscChance = 0.05;
          if (p.causeTreated || scenario.rootCause === 'STEMI') roscChance = 0.35;
          if (p.epinephrineCount > 0) roscChance += 0.10;
          if (p.amiodaroneGiven) roscChance += 0.15;
          if (p.cprInProgress) roscChance += 0.05;
          if (p.airwaySecured) roscChance += 0.03;
          roscChance = Math.min(roscChance, 0.85);

          if (Math.random() < roscChance) {
            p.rhythm = 'SINUS';
            p.heartRate = 68 + Math.floor(Math.random() * 24);
            p.systolic = 95 + Math.floor(Math.random() * 35);
            p.diastolic = 55 + Math.floor(Math.random() * 25);
            p.spO2 = 91 + Math.floor(Math.random() * 7);
            p.etco2 = 35 + Math.floor(Math.random() * 10);
            p.shockable = false;
          } else if (Math.random() < 0.12) {
            p.rhythm = 'ASYSTOLE';
            p.shockable = false;
          }
          break;
        }
        case 'epi': {
          p.epinephrineCount += 1;
          p.lastEpiTime = elapsedSeconds;
          if (p.rhythm !== 'SINUS') {
            p.heartRate = Math.min(p.heartRate + 5, 40);
          }
          break;
        }
        case 'cpr': {
          p.cprInProgress = !p.cprInProgress;
          if (p.cprInProgress) {
            if (p.firstCprTime === null) p.firstCprTime = elapsedSeconds;
            if (p.rhythm !== 'SINUS') {
              p.spO2 = Math.min(p.spO2 + 8, 85);
              p.etco2 = Math.min(p.etco2 + 10, 25);
            }
          } else {
            p.etco2 = Math.max(5, p.etco2 - 8);
          }
          break;
        }
        case 'intubate': {
          p.airwaySecured = true;
          if (p.cprInProgress) p.etco2 = Math.min(p.etco2 + 5, 30);
          break;
        }
        case 'amio': {
          p.amiodaroneGiven = true;
          break;
        }
        case 'pulse-check': break;
        default: break;
      }
      return p;
    }

    function applyTargetedIntervention(patient, action, scenario, elapsedSeconds) {
      const p = { ...patient };
      p.causeTreatmentGiven = action;

      const isCorrect = scenario.targetedTreatment === action;

      if (isCorrect) {
        p.causeTreated = true;
        p.causeTreatedTime = elapsedSeconds;

        if (scenario.rootCause === 'TENSION_PNEUMO') {
          const roll = Math.random();
          if (roll < 0.25) {
            p.rhythm = 'SINUS';
            p.heartRate = 82 + Math.floor(Math.random() * 20);
            p.systolic = 90 + Math.floor(Math.random() * 30);
            p.diastolic = 55 + Math.floor(Math.random() * 20);
            p.spO2 = 88 + Math.floor(Math.random() * 8);
            p.etco2 = 32 + Math.floor(Math.random() * 10);
            p.shockable = false;
          } else if (roll < 0.80) {
            p.rhythm = 'V_FIB';
            p.shockable = true;
          }
        } else if (scenario.rootCause === 'TAMPONADE') {
          const roll = Math.random();
          if (roll < 0.40) {
            p.rhythm = 'SINUS';
            p.heartRate = 110 + Math.floor(Math.random() * 20);
            p.systolic = 85 + Math.floor(Math.random() * 25);
            p.diastolic = 50 + Math.floor(Math.random() * 15);
            p.spO2 = 90 + Math.floor(Math.random() * 6);
            p.etco2 = 30 + Math.floor(Math.random() * 12);
            p.shockable = false;
          } else if (roll < 0.85) {
            p.rhythm = 'V_FIB';
            p.shockable = true;
          }
        } else if (scenario.rootCause === 'MASSIVE_PE') {
          if (Math.random() < 0.35) {
            p.rhythm = 'SINUS';
            p.heartRate = 115 + Math.floor(Math.random() * 15);
            p.systolic = 80 + Math.floor(Math.random() * 20);
            p.diastolic = 45 + Math.floor(Math.random() * 15);
            p.spO2 = 82 + Math.floor(Math.random() * 8);
            p.etco2 = 28 + Math.floor(Math.random() * 10);
            p.shockable = false;
          } else {
            p.rhythm = 'V_FIB';
            p.shockable = true;
          }
        } else if (scenario.rootCause === 'HYPERKALEMIA') {
          p.spO2 = Math.min(p.spO2 + 5, 85);
        }
      }
      return p;
    }

    function calculateVitalsTrend(patient, deltaMs) {
      const p = { ...patient };
      const dt = deltaMs / 1000;
      if (p.rhythm === 'SINUS') {
        p.spO2 = Math.min(99, p.spO2 + dt * 0.3);
        p.etco2 = Math.min(45, p.etco2 + dt * 0.2);
        return p;
      }
      if (p.cprInProgress) {
        p.totalCprMs += deltaMs;
        p.spO2 = Math.min(85, p.spO2 + dt * 0.1);
        p.etco2 = Math.min(p.airwaySecured ? 30 : 25, p.etco2 + dt * 0.05);
        if (p.airwaySecured) p.spO2 = Math.min(90, p.spO2 + dt * 0.15);
      } else {
        p.spO2 = Math.max(0, p.spO2 - dt * 0.5);
        p.etco2 = Math.max(3, p.etco2 - dt * 0.3);
      }
      return p;
    }

    function checkForROSC(patient) {
      return patient.rhythm === 'SINUS' && patient.heartRate > 60;
    }

    // ============================================================
    // 🔬 DYNAMIC PHYSICAL EXAM
    // ============================================================

    function getDynamicExam(scenario, patient, elapsedMs) {
      const exam = { ...scenario.physicalExam };
      const minutes = elapsedMs / 60000;

      if (patient.airwaySecured) {
        exam.respiratory = (exam.respiratory || '') + ' | ETT in place, equal bilateral chest rise with BVM';
      }
      if (patient.cprInProgress) {
        exam.general = (exam.general || '').replace('Unresponsive', 'Unresponsive, compressions in progress');
      }
      if (minutes > 5 && !patient.causeTreated && patient.rhythm !== 'SINUS') {
        exam.neuro = 'GCS 3. Pupils 5mm, sluggishly reactive';
      }
      if (minutes > 10 && !patient.causeTreated && patient.rhythm !== 'SINUS') {
        exam.neuro = 'GCS 3. Pupils 6mm, FIXED and DILATED';
        exam.skin = (exam.skin || '').replace(/Cool|Warm/i, 'Cold').replace('pale', 'mottled/dusky');
      }
      if (patient.causeTreated && scenario.postTreatmentExam) {
        Object.entries(scenario.postTreatmentExam).forEach(function(entry) {
          exam[entry[0]] = entry[1];
        });
      }
      if (patient.rhythm === 'SINUS') {
        exam.neuro = 'GCS 4-6. Pupils 3mm, REACTIVE to light. Occasional posturing';
        exam.cardiovascular = 'Regular rhythm. Pulses palpable in all extremities';
        exam.skin = 'Slowly warming. Color improving. Still diaphoretic';
      }
      return exam;
    }

    // ============================================================
    // 📈 ECG WAVEFORM RENDERER
    // ============================================================

    function generateWaveformPoints(rhythm, heartRate, phase) {
      const points = [];
      const width = 600;
      const mid = 75;
      for (let x = 0; x < width; x += 2) {
        const t = (x + phase) / width;
        let y = mid;
        switch (rhythm) {
          case 'V_FIB':
            y = mid + (Math.random() - 0.5) * 60 * Math.sin(t * 40);
            break;
          case 'V_TACH': {
            const cycle = ((t * 12) % 1);
            y = cycle < 0.15 ? mid - 50 : cycle < 0.3 ? mid + 40 : mid + Math.sin(cycle * 20) * 5;
            break;
          }
          case 'PEA': {
            const cycle = ((t * 4) % 1);
            y = cycle < 0.08 ? mid - 20 : cycle < 0.2 ? mid + 30 : mid + Math.random() * 3;
            break;
          }
          case 'ASYSTOLE':
            y = mid + (Math.random() - 0.5) * 3;
            break;
          case 'SINUS': {
            const bps = Math.max(heartRate, 40) / 60;
            const cycle = ((t * bps * 3) % 1);
            if (cycle < 0.04) y = mid - 8;
            else if (cycle < 0.08) y = mid;
            else if (cycle < 0.10) y = mid + 10;
            else if (cycle < 0.14) y = mid - 55;
            else if (cycle < 0.18) y = mid + 15;
            else if (cycle < 0.30) y = mid - 5;
            else y = mid;
            break;
          }
          default: y = mid;
        }
        points.push(x + ',' + Math.round(y));
      }
      return points.join(' ');
    }

    function ECGStrip({ rhythm, heartRate }) {
      const [phase, setPhase] = useState(0);
      useEffect(function() {
        const id = setInterval(function() { setPhase(function(p) { return p + 4; }); }, 50);
        return function() { clearInterval(id); };
      }, []);
      return (
        <div className="rounded-xl overflow-hidden border border-gray-700" style={{ background: '#0a0a1a' }}>
          <div className="px-3 py-1 flex items-center justify-between" style={{ background: '#111' }}>
            <span className="text-xs text-gray-400">Lead II</span>
            <span className="text-xs ecg-pulse" style={{ color: '#00ff41' }}>● LIVE</span>
          </div>
          <svg viewBox="0 0 600 150" className="w-full" style={{ height: 100 }}>
            <polyline fill="none" stroke="#00ff41" strokeWidth="2"
              points={generateWaveformPoints(rhythm, heartRate, phase)} />
          </svg>
        </div>
      );
    }

    // ============================================================
    // 🖥️ UI COMPONENTS
    // ============================================================

    function VitalSignsPanel({ patient }) {
      const vc = function(val, low, high) {
        if (val === 0 || val === null || val === undefined) return 'text-gray-500';
        if (val < low) return 'text-red-400';
        if (val > high) return 'text-yellow-400';
        return 'text-green-400';
      };
      const box = { background: '#111827' };
      return (
        <div className="grid grid-cols-5 gap-2">
          <div className="rounded-lg p-2 text-center" style={box}>
            <div className="text-xs text-gray-500">HR</div>
            <div className={"text-xl font-bold " + vc(patient.heartRate, 60, 100)}>
              {patient.heartRate || '--'}
            </div>
            <div className="text-xs text-gray-600">bpm</div>
          </div>
          <div className="rounded-lg p-2 text-center" style={box}>
            <div className="text-xs text-gray-500">BP</div>
            <div className={"text-xl font-bold " + vc(patient.systolic, 90, 140)}>
              {patient.systolic || '--'}/{patient.diastolic || '--'}
            </div>
            <div className="text-xs text-gray-600">mmHg</div>
          </div>
          <div className="rounded-lg p-2 text-center" style={box}>
            <div className="text-xs text-gray-500">SpO2</div>
            <div className={"text-xl font-bold " + vc(patient.spO2, 90, 101)}>
              {patient.spO2 ? Math.round(patient.spO2) : '--'}
            </div>
            <div className="text-xs text-gray-600">%</div>
          </div>
          <div className="rounded-lg p-2 text-center" style={box}>
            <div className="text-xs text-gray-500">EtCO2</div>
            <div className={"text-xl font-bold " + vc(patient.etco2, 10, 50)}>
              {patient.etco2 ? Math.round(patient.etco2) : '--'}
            </div>
            <div className="text-xs text-gray-600">mmHg</div>
          </div>
          <div className="rounded-lg p-2 text-center" style={box}>
            <div className="text-xs text-gray-500">Rhythm</div>
            <div className={"text-xs font-bold mt-1 " + (patient.rhythm === 'SINUS' ? 'text-green-400' : 'text-red-400')}>
              {RHYTHM_TYPES[patient.rhythm]}
            </div>
            <div className="text-xs text-gray-600">{patient.shockable ? 'Shockable' : 'Non-shockable'}</div>
          </div>
        </div>
      );
    }

    // ---- Patient Info Tabs ----

    function PatientInfoTabs({ scenario, patient, elapsedMs, labsState, onOrderLabs }) {
      const [tab, setTab] = useState('hpi');
      const exam = getDynamicExam(scenario, patient, elapsedMs);

      const tabBtn = function(id, label) {
        return (
          <button key={id} onClick={function() { setTab(id); }}
            className={"px-3 py-1 text-xs font-semibold rounded-t-lg " + (tab === id ? 'tab-active' : 'tab-inactive')}>
            {label}
          </button>
        );
      };

      const examRow = function(label, value) {
        if (!value) return null;
        const isAbnormal = /ABSENT|DEVIATED|MUFFLED|DISTANT|FIXED|JVD present|JVD MARKEDLY|swollen|erythematous|cyanotic|Subcutaneous emphysema|Beck|ST elevation/i.test(value);
        return (
          <div className="flex gap-2 py-1 border-b border-gray-800">
            <span className="text-xs text-blue-400 font-semibold w-16 flex-shrink-0">{label}</span>
            <span className={"text-xs " + (isAbnormal ? 'text-amber-300' : 'text-gray-300')}>{value}</span>
          </div>
        );
      };

      const labRow = function(label, val, flag) {
        const cls = flag === 'CRITICAL' ? 'flag-critical' : flag === 'HIGH' ? 'flag-high' : 'flag-normal';
        return (
          <div className="flex justify-between py-1 border-b border-gray-800">
            <span className="text-xs text-gray-400">{label}</span>
            <span className={"text-xs " + cls}>
              {val} {flag ? '(' + flag + ')' : ''}
            </span>
          </div>
        );
      };

      return (
        <div className="rounded-xl overflow-hidden border border-gray-700" style={{ background: '#0d1117' }}>
          <div className="flex gap-0 border-b border-gray-700 bg-black/30">
            {tabBtn('chart', '📋 Chart')}
            {tabBtn('hpi', '📝 HPI')}
            {tabBtn('exam', '🩺 Exam')}
            {tabBtn('labs', '🧪 Labs')}
          </div>
          <div className="p-3 overflow-y-auto scroll-thin" style={{ height: 145 }}>
            {tab === 'chart' && (
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-blue-400 font-semibold">PMH: </span>
                  <span className="text-xs text-gray-300">{scenario.pmh.join(' | ')}</span>
                </div>
                <div>
                  <span className="text-xs text-blue-400 font-semibold">Meds: </span>
                  <span className="text-xs text-gray-300">{scenario.medications.join(', ')}</span>
                </div>
                <div>
                  <span className="text-xs text-blue-400 font-semibold">Allergies: </span>
                  <span className="text-xs text-amber-300 font-semibold">{scenario.allergies}</span>
                </div>
                <div>
                  <span className="text-xs text-blue-400 font-semibold">Social: </span>
                  <span className="text-xs text-gray-300">{scenario.socialHistory}</span>
                </div>
              </div>
            )}
            {tab === 'hpi' && (
              <p className="text-xs text-gray-300 leading-relaxed">{scenario.hpiText}</p>
            )}
            {tab === 'exam' && (
              <div>
                {examRow('GEN', exam.general)}
                {examRow('NEURO', exam.neuro)}
                {examRow('RESP', exam.respiratory)}
                {examRow('CV', exam.cardiovascular)}
                {examRow('SKIN', exam.skin)}
                {examRow('NECK', exam.neck)}
                {examRow('ABD', exam.abdomen)}
                {examRow('EXT', exam.extremities)}
                {examRow('OTHER', exam.other)}
              </div>
            )}
            {tab === 'labs' && (
              <div>
                {labsState === 'not_ordered' && (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-500 mb-3">STAT labs not yet ordered</p>
                    <button onClick={onOrderLabs}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-700 hover:bg-amber-600 text-white">
                      🧪 Order STAT Labs
                    </button>
                  </div>
                )}
                {labsState === 'ordered' && (
                  <div className="text-center py-6">
                    <div className="text-amber-400 text-sm font-semibold animate-pulse">Drawing labs... Results pending</div>
                    <div className="text-xs text-gray-500 mt-1">Turnaround time ~30 seconds</div>
                  </div>
                )}
                {labsState === 'ready' && (
                  <div>
                    <div className="text-xs text-amber-400 font-bold mb-2">STAT RESULTS</div>
                    {labRow('Potassium', scenario.labValues.potassium.value + ' mEq/L', scenario.labValues.potassium.flag)}
                    {labRow('pH (ABG)', scenario.labValues.pH.value, scenario.labValues.pH.flag)}
                    {labRow('Lactate', scenario.labValues.lactate.value + ' mmol/L', scenario.labValues.lactate.flag)}
                    {labRow('Troponin', scenario.labValues.troponin.value + ' ng/mL', scenario.labValues.troponin.flag)}
                    {labRow('Glucose', scenario.labValues.glucose.value + ' mg/dL', scenario.labValues.glucose.flag)}
                    {labRow(scenario.labValues.special.label, scenario.labValues.special.value, scenario.labValues.special.flag)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // ---- Intervention Panels ----

    function ACLSButtons({ onIntervene, cooldowns, patient }) {
      const now = Date.now();
      return (
        <div className="grid grid-cols-3 gap-1.5">
          {ACLS_INTERVENTIONS.map(function(iv) {
            const cdExpiry = cooldowns[iv.id] || 0;
            const onCooldown = now < cdExpiry;
            const cdRemaining = onCooldown ? Math.ceil((cdExpiry - now) / 1000) : 0;
            let disabled = onCooldown;
            let label = iv.label;
            if (iv.id === 'intubate' && patient.airwaySecured) { disabled = true; label = 'Intubated ✓'; }
            if (iv.id === 'amio' && patient.amiodaroneGiven) { disabled = true; label = 'Amio Given ✓'; }
            if (iv.id === 'cpr') { label = patient.cprInProgress ? 'Stop CPR' : 'Begin CPR'; }
            return (
              <button key={iv.id} onClick={function() { onIntervene(iv.id); }} disabled={disabled}
                className={"rounded-lg p-2 text-center font-semibold transition-all " +
                  (disabled ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-blue-900/80 hover:bg-blue-700 text-white cursor-pointer')}
                style={!disabled ? { borderColor: '#0033A0', borderWidth: 1 } : {}}>
                <div className="text-lg">{iv.icon}</div>
                <div className="text-xs">{label}</div>
                {onCooldown && <div className="text-xs text-yellow-400">{cdRemaining}s</div>}
              </button>
            );
          })}
        </div>
      );
    }

    function TargetedButtons({ onTargeted, patient }) {
      return (
        <div>
          <div className="text-xs text-amber-400 font-bold mb-1.5 mt-3">TREAT THE CAUSE (H's & T's)</div>
          <div className="grid grid-cols-3 gap-1.5">
            {TARGETED_INTERVENTIONS.map(function(iv) {
              const used = patient.causeTreatmentGiven != null;
              const isThis = patient.causeTreatmentGiven === iv.id;
              const disabled = used;
              return (
                <button key={iv.id} onClick={function() { onTargeted(iv.id); }} disabled={disabled}
                  className={"rounded-lg p-2 text-center font-semibold transition-all " +
                    (isThis ? 'bg-amber-800 text-amber-200 cursor-not-allowed' :
                     disabled ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
                     'bg-amber-900/60 hover:bg-amber-700 text-amber-100 cursor-pointer')}
                  style={!disabled ? { borderColor: '#92400e', borderWidth: 1 } : {}}>
                  <div className="text-lg">{iv.icon}</div>
                  <div className="text-xs leading-tight">{iv.label}</div>
                  {isThis && <div className="text-xs text-amber-400 mt-0.5">Given ✓</div>}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    function EventLog({ entries }) {
      const ref = useRef(null);
      useEffect(function() {
        if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
      }, [entries.length]);
      const typeColor = { action: 'text-blue-300', vitals: 'text-gray-400', alert: 'text-amber-400', success: 'text-green-400', targeted: 'text-amber-300' };
      return (
        <div ref={ref} className="rounded-xl p-3 overflow-y-auto scroll-thin" style={{ background: '#111827', height: '100%', maxHeight: 320 }}>
          <div className="text-xs text-gray-500 font-bold mb-2">EVENT LOG</div>
          {entries.map(function(e, i) {
            return (
              <div key={i} className={"text-xs " + (typeColor[e.type] || 'text-gray-400')}>
                <span className="text-gray-600 mr-1">[{e.time}]</span>{e.message}
              </div>
            );
          })}
          {entries.length === 0 && (
            <div className="text-xs text-gray-600 italic">Awaiting first intervention...</div>
          )}
        </div>
      );
    }

    function TimerDisplay({ elapsedMs, clockRunning }) {
      const totalSec = Math.floor(elapsedMs / 1000);
      const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const sec = String(totalSec % 60).padStart(2, '0');
      const isLong = totalSec > 600;
      return (
        <div className={"font-mono text-2xl font-bold " + (isLong ? 'text-red-400' : 'text-white')}>
          {min}:{sec}
        </div>
      );
    }

    // ---- Debrief Panel ----

    function DebriefPanel({ scenario, patient, eventLog, elapsedMs, suspectedCause }) {
      const isROSC = patient.rhythm === 'SINUS';
      const totalSec = Math.floor(elapsedMs / 1000);
      const correctDiagnosis = suspectedCause === scenario.rootCauseCategory;
      const correctTreatment = patient.causeTreated;
      const noTargetNeeded = scenario.targetedTreatment === null;

      const cprFraction = totalSec > 0 ? Math.round((patient.totalCprMs / 1000) / totalSec * 100) : 0;
      const firstCpr = patient.firstCprTime !== null ? patient.firstCprTime : null;
      const firstDefib = patient.firstDefibTime !== null ? patient.firstDefibTime : null;

      const formatSec = function(s) {
        if (s === null) return 'N/A';
        return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      };

      return (
        <div className="rounded-xl p-4 mt-3 border-2" style={{
          background: isROSC ? '#064e3b' : '#7f1d1d',
          borderColor: isROSC ? '#10b981' : '#ef4444'
        }}>
          <div className="text-sm font-bold mb-3">
            {isROSC ? '🎉 CASE DEBRIEF — ROSC ACHIEVED' : '📋 CASE DEBRIEF — RESUSCITATION TERMINATED'}
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div>
                <span className="text-gray-400">Root Cause: </span>
                <span className="text-white font-bold">{scenario.rootCauseLabel}</span>
              </div>
              <div>
                <span className="text-gray-400">Your Diagnosis: </span>
                <span className={correctDiagnosis ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                  {suspectedCause || 'Not entered'} {correctDiagnosis ? '✓' : '✗'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Targeted Treatment: </span>
                {noTargetNeeded ? (
                  <span className="text-green-400 font-bold">None needed (standard ACLS correct) {!patient.causeTreatmentGiven ? '✓' : '— unnecessary treatment given'}</span>
                ) : (
                  <span className={correctTreatment ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                    {patient.causeTreatmentGiven
                      ? (TARGETED_INTERVENTIONS.find(function(t) { return t.id === patient.causeTreatmentGiven; }) || {}).label + (correctTreatment ? ' ✓' : ' ✗ (Wrong)')
                      : 'Not given ✗'}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-gray-400 font-bold mb-1">Protocol Metrics</div>
              <div>
                <span className="text-gray-400">Time to first compression: </span>
                <span className={firstCpr !== null && firstCpr <= 15 ? 'text-green-400' : 'text-amber-400'}>{formatSec(firstCpr)}</span>
              </div>
              <div>
                <span className="text-gray-400">Time to first defib: </span>
                <span className={firstDefib !== null && firstDefib <= 120 ? 'text-green-400' : 'text-amber-400'}>
                  {patient.shockable || patient.defibrillationCount > 0 ? formatSec(firstDefib) : 'N/A (PEA)'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">CPR fraction: </span>
                <span className={cprFraction >= 80 ? 'text-green-400' : cprFraction >= 60 ? 'text-amber-400' : 'text-red-400'}>
                  {cprFraction}% {cprFraction >= 80 ? '(Excellent)' : cprFraction >= 60 ? '(Adequate)' : '(Low — aim for >80%)'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Epi doses: </span>
                <span className="text-gray-300">{patient.epinephrineCount}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <div className="text-xs text-blue-300 font-bold mb-1">Clinical Pearl</div>
            <p className="text-xs text-gray-300 leading-relaxed">{scenario.clinicalPearl}</p>
          </div>
        </div>
      );
    }

    // ============================================================
    // 🏥 APP COMPONENT
    // ============================================================

    function patientReducer(state, action) {
      switch (action.type) {
        case 'ACLS':
          return applyACLSIntervention(state, action.intervention, action.scenario, action.elapsedSeconds);
        case 'TARGETED':
          return applyTargetedIntervention(state, action.intervention, action.scenario, action.elapsedSeconds);
        case 'TICK':
          return calculateVitalsTrend(state, action.deltaMs);
        case 'RESET':
          return createInitialPatient(action.scenario);
        default:
          return state;
      }
    }

    function App() {
      const [scenarioIdx, setScenarioIdx] = useState(Math.floor(Math.random() * SCENARIOS.length));
      const scenario = SCENARIOS[scenarioIdx];

      const [patient, dispatch] = useReducer(patientReducer, scenario, createInitialPatient);
      const [clockRunning, setClockRunning] = useState(false);
      const [elapsedMs, setElapsedMs] = useState(0);
      const [eventLog, setEventLog] = useState([]);
      const [cooldowns, setCooldowns] = useState({});
      const [outcome, setOutcome] = useState(null);
      const [labsState, setLabsState] = useState('not_ordered');
      const [suspectedCause, setSuspectedCause] = useState('');

      const formatTime = function(ms) {
        const s = Math.floor(ms / 1000);
        return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
      };

      const addLog = useCallback(function(message, type) {
        type = type || 'action';
        setElapsedMs(function(ms) {
          setEventLog(function(prev) { return prev.concat([{ time: formatTime(ms), message: message, type: type }]); });
          return ms;
        });
      }, []);

      // Vitals tick
      useEffect(function() {
        if (!clockRunning) return;
        const id = setInterval(function() {
          setElapsedMs(function(prev) { return prev + 250; });
          dispatch({ type: 'TICK', deltaMs: 250 });
        }, 250);
        return function() { clearInterval(id); };
      }, [clockRunning]);

      // ROSC detection
      useEffect(function() {
        if (outcome) return;
        if (checkForROSC(patient)) {
          setClockRunning(false);
          setOutcome('rosc');
          addLog('🎉 ROSC ACHIEVED — Return of spontaneous circulation!', 'success');
        }
      }, [patient, outcome, addLog]);

      // Timeout — 20 minutes
      useEffect(function() {
        if (outcome) return;
        if (elapsedMs > 1200000) {
          setClockRunning(false);
          setOutcome('timeout');
          addLog('⏱️ 20-minute limit reached. Resuscitation efforts terminated.', 'alert');
        }
      }, [elapsedMs, outcome, addLog]);

      // Force cooldown re-render
      const [, tick] = useState(0);
      useEffect(function() {
        const id = setInterval(function() { tick(function(t) { return t + 1; }); }, 500);
        return function() { clearInterval(id); };
      }, []);

      function handleACLS(id) {
        if (outcome) return;
        if (!clockRunning) setClockRunning(true);
        const elSec = Math.floor(elapsedMs / 1000);
        dispatch({ type: 'ACLS', intervention: id, scenario: scenario, elapsedSeconds: elSec });

        const labels = {
          epi: '💊 Epinephrine 1mg IV push (dose #' + (patient.epinephrineCount + 1) + ')',
          defib: '⚡ Defibrillation delivered' + (patient.shockable ? '' : ' — NON-SHOCKABLE rhythm, no effect'),
          cpr: patient.cprInProgress ? '🫁 CPR paused' : '🫁 CPR initiated — high-quality compressions',
          intubate: '🔧 Advanced airway placed — ETT confirmed bilateral breath sounds',
          amio: '💉 Amiodarone 300mg IV push',
          'pulse-check': '📋 Pulse check: ' + RHYTHM_TYPES[patient.rhythm] + ', HR ' + (patient.heartRate || 'absent'),
        };
        addLog(labels[id] || id, id === 'pulse-check' ? 'vitals' : 'action');

        var iv = ACLS_INTERVENTIONS.find(function(i) { return i.id === id; });
        if (iv && iv.cooldown > 0) {
          setCooldowns(function(prev) { var n = {}; n[id] = Date.now() + iv.cooldown * 1000; return Object.assign({}, prev, n); });
        }
      }

      function handleTargeted(id) {
        if (outcome) return;
        if (patient.causeTreatmentGiven != null) return;
        if (!clockRunning) setClockRunning(true);

        var iv = TARGETED_INTERVENTIONS.find(function(i) { return i.id === id; });
        var elSec = Math.floor(elapsedMs / 1000);
        dispatch({ type: 'TARGETED', intervention: id, scenario: scenario, elapsedSeconds: elSec });

        var isCorrect = scenario.targetedTreatment === id;
        addLog(
          (iv ? iv.icon + ' ' + iv.label : id) + ' administered' +
          (isCorrect ? ' — improvement noted!' : ' — no significant change'),
          'targeted'
        );

        if (isCorrect && scenario.rootCause === 'MASSIVE_PE') {
          addLog('⏳ tPA infusing — continue CPR for 15-20 min while clot lyses', 'alert');
        }
      }

      function handleOrderLabs() {
        setLabsState('ordered');
        addLog('🧪 STAT labs drawn — results pending', 'action');
        setTimeout(function() {
          setLabsState('ready');
          setEventLog(function(prev) {
            return prev.concat([{ time: formatTime(elapsedMs + 4000), message: '🧪 STAT lab results now available', type: 'alert' }]);
          });
        }, 4000);
      }

      function handleNewCase() {
        var next = (scenarioIdx + 1 + Math.floor(Math.random() * (SCENARIOS.length - 1))) % SCENARIOS.length;
        var newScenario = SCENARIOS[next];
        setScenarioIdx(next);
        dispatch({ type: 'RESET', scenario: newScenario });
        setClockRunning(false);
        setElapsedMs(0);
        setEventLog([]);
        setCooldowns({});
        setOutcome(null);
        setLabsState('not_ordered');
        setSuspectedCause('');
      }

      function handleReset() {
        dispatch({ type: 'RESET', scenario: scenario });
        setClockRunning(false);
        setElapsedMs(0);
        setEventLog([]);
        setCooldowns({});
        setOutcome(null);
        setLabsState('not_ordered');
        setSuspectedCause('');
      }

      return (
        <div className="min-h-screen p-3" style={{ background: '#1a1a2e' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-extrabold text-white">🏥 Cardiac Arrest Simulator</h1>
              <p className="text-xs text-gray-400 truncate">{scenario.title}</p>
            </div>
            <div className="flex items-center gap-3">
              <TimerDisplay elapsedMs={elapsedMs} clockRunning={clockRunning} />
              <button onClick={handleNewCase}
                className="px-2 py-1 rounded-lg text-xs font-semibold bg-purple-800 hover:bg-purple-700 text-white whitespace-nowrap">
                New Case
              </button>
              <button onClick={handleReset}
                className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-white">
                Reset
              </button>
            </div>
          </div>

          {/* Outcome banner */}
          {outcome === 'rosc' && (
            <div className="rounded-xl p-3 mb-2 text-center font-bold text-sm" style={{ background: '#064e3b' }}>
              🎉 ROSC Achieved at {formatTime(elapsedMs)}
            </div>
          )}
          {outcome === 'timeout' && (
            <div className="rounded-xl p-3 mb-2 text-center font-bold text-sm bg-red-900">
              ⏱️ Time of termination: {formatTime(elapsedMs)}
            </div>
          )}

          {/* Patient Info Tabs */}
          <div className="mb-2">
            <PatientInfoTabs scenario={scenario} patient={patient} elapsedMs={elapsedMs}
              labsState={labsState} onOrderLabs={handleOrderLabs} />
          </div>

          {/* Vitals */}
          <div className="mb-2">
            <VitalSignsPanel patient={patient} />
          </div>

          {/* ECG */}
          <div className="mb-2">
            <ECGStrip rhythm={patient.rhythm} heartRate={patient.heartRate} />
          </div>

          {/* Interventions + Event Log side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-blue-400 font-bold mb-1.5">ACLS INTERVENTIONS</div>
              <ACLSButtons onIntervene={handleACLS} cooldowns={cooldowns} patient={patient} />
              <TargetedButtons onTargeted={handleTargeted} patient={patient} />
            </div>
            <EventLog entries={eventLog} />
          </div>

          {/* Status bar */}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span>Epi: {patient.epinephrineCount}</span>
            <span>Defib: {patient.defibrillationCount}</span>
            <span>CPR: {patient.cprInProgress ? '🟢' : '⚫'}</span>
            <span>Airway: {patient.airwaySecured ? '🟢' : '⚫'}</span>
            <span className="ml-auto flex items-center gap-1">
              <span className="text-gray-500">My Dx:</span>
              <select value={suspectedCause} onChange={function(e) { setSuspectedCause(e.target.value); }}
                className="bg-gray-800 text-gray-300 text-xs rounded px-1 py-0.5 border border-gray-700"
                style={{ maxWidth: 180 }}>
                {REVERSIBLE_CAUSES.map(function(c) {
                  return <option key={c} value={c === '-- Not yet determined --' ? '' : c}>{c}</option>;
                })}
              </select>
            </span>
          </div>

          {/* Debrief */}
          {outcome && (
            <DebriefPanel scenario={scenario} patient={patient} eventLog={eventLog}
              elapsedMs={elapsedMs} suspectedCause={suspectedCause} />
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
