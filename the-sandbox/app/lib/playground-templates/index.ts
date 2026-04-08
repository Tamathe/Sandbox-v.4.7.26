// Playground Warm Start — Template Registry
// Static template system for pre-loaded Playground experiences.
// Templates are loaded via dynamic import to keep the main bundle lean.

export interface WarmStartConfig {
  previewRatio: number;          // 0-1, controls preview panel width fraction
  autoRunPreview: boolean;       // if true, set previewCode on mount
  chatCollapsed: boolean;        // if true, hide AI chat initially
  bannerText: string;            // overlay banner micro-copy
  ctaLabel: string;              // override label for Run button
  ctaPulseDurationMs: number;    // duration of pulse animation
}

export interface PlaygroundTemplate {
  key: string;
  title: string;
  description: string;
  category: 'simulation' | 'quiz' | 'dashboard' | 'game' | 'training';
  thumbnailEmoji: string;        // large emoji shown on gallery cards
  editorScrollTarget: string;    // comment string to scroll Monaco to
  warmStartConfig: WarmStartConfig;
}

// Static catalog for the gallery page — no HTML content, just metadata.
// Each entry mirrors the TEMPLATE_META exported by the individual template module.
export const TEMPLATE_CATALOG: Pick<PlaygroundTemplate, 'key' | 'title' | 'description' | 'category' | 'thumbnailEmoji'>[] = [
  {
    key: 'cardiac-arrest',
    title: 'Dynamic Cardiac Arrest Simulator',
    description: 'ACLS-protocol cardiac arrest simulator with real-time vitals, intervention tracking, and event logging.',
    category: 'simulation',
    thumbnailEmoji: '🏥',
  },
  {
    key: 'pediatric-sepsis',
    title: 'Pediatric Sepsis Triage Simulator',
    description: 'Golden-hour sepsis management with animated vitals, lab ordering, and Surviving Sepsis Campaign bundle scoring.',
    category: 'simulation',
    thumbnailEmoji: '🩺',
  },
  {
    key: 'moot-court',
    title: 'Constitutional Law Moot Court',
    description: 'IRAC-structured legal argument builder with keyword scoring, precedent analysis, and opposition rebuttal.',
    category: 'quiz',
    thumbnailEmoji: '⚖️',
  },
  {
    key: 'lab-safety',
    title: 'Chemistry Lab Safety Walkthrough',
    description: 'Interactive hazard hunt with OSHA/GHS standards, spill response drill, and safety protocol scoring.',
    category: 'simulation',
    thumbnailEmoji: '🧪',
  },
  {
    key: 'budget-allocation',
    title: 'University Budget Allocation Challenge',
    description: 'Multi-round budget simulator with consequence matrix, KPI tracking, radar charts, and crisis scenarios.',
    category: 'dashboard',
    thumbnailEmoji: '📊',
  },
  {
    key: 'ear-training',
    title: 'Music Theory Ear Training Lab',
    description: 'Web Audio-powered interval, chord, and progression identification with a CSS piano keyboard.',
    category: 'training',
    thumbnailEmoji: '🎵',
  },
  {
    key: 'circuit-simulator',
    title: 'Interactive Circuit Simulator',
    description: 'Drag-and-drop circuit builder with resistors, capacitors, LEDs, and real-time voltage/current calculations.',
    category: 'simulation',
    thumbnailEmoji: '⚡',
  },
  {
    key: 'molecular-viewer',
    title: '3D Molecular Viewer',
    description: 'Interactive 3D ball-and-stick molecular models with rotation, zoom, and electron cloud visualization.',
    category: 'simulation',
    thumbnailEmoji: '🧬',
  },
  {
    key: 'physics-sandbox',
    title: 'Physics Sandbox',
    description: 'Interactive projectile motion, pendulum, and spring-mass simulations with adjustable parameters and real-time graphs.',
    category: 'simulation',
    thumbnailEmoji: '🎯',
  },
  {
    key: 'startup-financial-model',
    title: 'Startup Financial Model',
    description: 'Interactive P&L projector with revenue growth, burn rate, headcount sliders, and auto-generated runway charts.',
    category: 'dashboard',
    thumbnailEmoji: '📈',
  },
  {
    key: 'supply-chain',
    title: 'Supply Chain Disruption Visualizer',
    description: 'Interactive network graph of a supply chain. Simulate disruptions and watch cascade effects propagate.',
    category: 'simulation',
    thumbnailEmoji: '🔗',
  },
  {
    key: 'vitals-dashboard',
    title: 'Patient Vitals Dashboard Simulator',
    description: 'Realistic patient monitor with animated ECG, SpO2, respiration, and blood pressure waveforms. Simulate clinical scenarios.',
    category: 'simulation',
    thumbnailEmoji: '🫀',
  },
  {
    key: 'case-brief-builder',
    title: 'Case Brief Builder',
    description: 'Structured IRAC case brief builder with auto-formatting, section guidance, and PDF-ready export.',
    category: 'quiz',
    thumbnailEmoji: '📋',
  },
  {
    key: 'timeline-builder',
    title: 'Interactive Timeline Builder',
    description: 'Create visual timelines with draggable events, zoom across centuries, color-coded themes, and export.',
    category: 'dashboard',
    thumbnailEmoji: '📅',
  },
  {
    key: 'event-budget-planner',
    title: 'Student Org Event Budget Planner',
    description: 'Plan event budgets with line items, auto-totals, spending breakdown charts, and exportable reports.',
    category: 'dashboard',
    thumbnailEmoji: '🎉',
  },
  {
    key: 'drug-interaction',
    title: 'Drug Interaction Checker',
    description: 'Enter medications and visualize interactions with severity matrix, mechanism details, and clinical recommendations.',
    category: 'dashboard',
    thumbnailEmoji: '💊',
  },
  {
    key: 'poetry-meter',
    title: 'Poetry Meter & Rhyme Analyzer',
    description: 'Paste a poem to see stressed/unstressed syllables, meter identification, rhyme scheme, and literary device detection.',
    category: 'training',
    thumbnailEmoji: '✒️',
  },
  {
    key: 'statute-annotator',
    title: 'Statute Annotator',
    description: 'Highlight and annotate statutory text with color-coded argument types, margin notes, and localStorage persistence.',
    category: 'training',
    thumbnailEmoji: '📜',
  },
];

export async function getTemplate(
  key: string
): Promise<{ template: PlaygroundTemplate; htmlContent: string } | null> {
  switch (key) {
    case 'cardiac-arrest': {
      const mod = await import('./cardiac-arrest');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'pediatric-sepsis': {
      const mod = await import('./pediatric-sepsis');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'moot-court': {
      const mod = await import('./moot-court');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'lab-safety': {
      const mod = await import('./lab-safety');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'budget-allocation': {
      const mod = await import('./budget-allocation');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'ear-training': {
      const mod = await import('./ear-training');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'circuit-simulator': {
      const mod = await import('./circuit-simulator');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'molecular-viewer': {
      const mod = await import('./molecular-viewer');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'physics-sandbox': {
      const mod = await import('./physics-sandbox');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'startup-financial-model': {
      const mod = await import('./startup-financial-model');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'supply-chain': {
      const mod = await import('./supply-chain');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'case-brief-builder': {
      const mod = await import('./case-brief-builder');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'timeline-builder': {
      const mod = await import('./timeline-builder');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'vitals-dashboard': {
      const mod = await import('./vitals-dashboard');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'event-budget-planner': {
      const mod = await import('./event-budget-planner');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'drug-interaction': {
      const mod = await import('./drug-interaction');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'poetry-meter': {
      const mod = await import('./poetry-meter');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    case 'statute-annotator': {
      const mod = await import('./statute-annotator');
      return { template: mod.TEMPLATE_META, htmlContent: mod.TEMPLATE_HTML };
    }
    default:
      return null;
  }
}
