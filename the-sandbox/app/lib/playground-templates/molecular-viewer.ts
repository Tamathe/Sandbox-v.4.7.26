import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'molecular-viewer',
  title: '3D Molecular Viewer',
  description: 'Interactive 3D molecular viewer with VSEPR geometry, electronegativity heatmaps, bond measurements, and reaction animations.',
  category: 'simulation',
  thumbnailEmoji: '🧬',
  editorScrollTarget: '// 🧬 MOLECULE DATA & RENDERER',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '🧬 Explore molecular structures — VSEPR geometry, polarity maps, measurements, and live reaction animations.',
    ctaLabel: '▶ Load Molecule',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>3D Molecular Viewer</title>
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
    body { margin: 0; background: #0f172a; color: #e2e8f0; font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
    canvas { display: block; cursor: grab; }
    canvas:active { cursor: grabbing; }
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in { animation: fade-in 0.4s ease-out; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #1e293b; }
    ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
    input[type=range] { -webkit-appearance: none; background: transparent; }
    input[type=range]::-webkit-slider-runnable-track { height: 4px; background: #334155; border-radius: 2px; }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #22d3ee; margin-top: -5px; cursor: pointer; }
  <\/style>
</head>
<body>
<div id="root"><\/div>
<script type="text/babel">
// 🧬 MOLECULE DATA & RENDERER
// ============================================================
// Full 3D molecular viewer with VSEPR, polarity, measurement,
// and reaction animation modes.
// ============================================================

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ==================== ELEMENT CONFIG ====================
const ELEMENT_COLORS = {
  C:  { fill: '#4a5568', glow: '#718096', label: 'Carbon' },
  H:  { fill: '#e2e8f0', glow: '#ffffff', label: 'Hydrogen' },
  O:  { fill: '#e53e3e', glow: '#fc8181', label: 'Oxygen' },
  N:  { fill: '#3182ce', glow: '#63b3ed', label: 'Nitrogen' },
  S:  { fill: '#d69e2e', glow: '#f6e05e', label: 'Sulfur' },
  P:  { fill: '#dd6b20', glow: '#ed8936', label: 'Phosphorus' },
  Cl: { fill: '#38a169', glow: '#68d391', label: 'Chlorine' },
  F:  { fill: '#48bb78', glow: '#9ae6b4', label: 'Fluorine' },
};
const ELEMENT_RADII = { C: 14, H: 9, O: 13, N: 13, S: 16, P: 15, Cl: 15, F: 12 };
const CLOUD_RADII   = { C: 32, H: 18, O: 28, N: 28, S: 38, P: 35, Cl: 35, F: 25 };

const ELECTRONEGATIVITY = { H: 2.20, C: 2.55, N: 3.04, O: 3.44, S: 2.58, P: 2.19, Cl: 3.16, F: 3.98 };
const VALENCE = { H: 1, C: 4, N: 5, O: 6, S: 6, P: 5, Cl: 7, F: 7 };

const SINGLE = 'single', DOUBLE = 'double', AROMATIC = 'aromatic';

// ==================== MOLECULE DATABASE ====================
const MOLECULES = {
  water: {
    name: 'Water', formula: 'H\\u2082O', weight: 18.015,
    atoms: [
      { el: 'O', x: 0, y: 0, z: 0 },
      { el: 'H', x: -0.96, y: 0, z: 0.28 },
      { el: 'H', x: 0.96, y: 0, z: 0.28 },
    ],
    bonds: [{ a: 0, b: 1, type: SINGLE }, { a: 0, b: 2, type: SINGLE }],
  },
  co2: {
    name: 'Carbon Dioxide', formula: 'CO\\u2082', weight: 44.01,
    atoms: [
      { el: 'C', x: 0, y: 0, z: 0 },
      { el: 'O', x: -1.16, y: 0, z: 0 },
      { el: 'O', x: 1.16, y: 0, z: 0 },
    ],
    bonds: [{ a: 0, b: 1, type: DOUBLE }, { a: 0, b: 2, type: DOUBLE }],
  },
  ammonia: {
    name: 'Ammonia', formula: 'NH\\u2083', weight: 17.031,
    atoms: [
      { el: 'N', x: 0, y: 0, z: 0 },
      { el: 'H', x: 0.94, y: 0, z: 0.38 },
      { el: 'H', x: -0.47, y: 0.81, z: 0.38 },
      { el: 'H', x: -0.47, y: -0.81, z: 0.38 },
    ],
    bonds: [{ a: 0, b: 1, type: SINGLE }, { a: 0, b: 2, type: SINGLE }, { a: 0, b: 3, type: SINGLE }],
  },
  methane: {
    name: 'Methane', formula: 'CH\\u2084', weight: 16.043,
    atoms: [
      { el: 'C', x: 0, y: 0, z: 0 },
      { el: 'H', x: 1.09, y: 0, z: 0 },
      { el: 'H', x: -0.36, y: 1.03, z: 0 },
      { el: 'H', x: -0.36, y: -0.51, z: 0.89 },
      { el: 'H', x: -0.36, y: -0.51, z: -0.89 },
    ],
    bonds: [
      { a: 0, b: 1, type: SINGLE }, { a: 0, b: 2, type: SINGLE },
      { a: 0, b: 3, type: SINGLE }, { a: 0, b: 4, type: SINGLE },
    ],
  },
  ethanol: {
    name: 'Ethanol', formula: 'C\\u2082H\\u2085OH', weight: 46.069,
    atoms: [
      { el: 'C', x: -0.75, y: 0, z: 0 },
      { el: 'C', x: 0.75, y: 0, z: 0 },
      { el: 'O', x: 1.45, y: 1.2, z: 0 },
      { el: 'H', x: -1.15, y: -0.55, z: 0.87 },
      { el: 'H', x: -1.15, y: -0.55, z: -0.87 },
      { el: 'H', x: -1.15, y: 1.0, z: 0 },
      { el: 'H', x: 1.15, y: -0.55, z: 0.87 },
      { el: 'H', x: 1.15, y: -0.55, z: -0.87 },
      { el: 'H', x: 2.4, y: 1.15, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, type: SINGLE }, { a: 1, b: 2, type: SINGLE },
      { a: 0, b: 3, type: SINGLE }, { a: 0, b: 4, type: SINGLE },
      { a: 0, b: 5, type: SINGLE }, { a: 1, b: 6, type: SINGLE },
      { a: 1, b: 7, type: SINGLE }, { a: 2, b: 8, type: SINGLE },
    ],
  },
  benzene: {
    name: 'Benzene', formula: 'C\\u2086H\\u2086', weight: 78.114,
    atoms: (() => {
      const atoms = [];
      for (let i = 0; i < 6; i++) {
        const a = (i * 60) * Math.PI / 180;
        atoms.push({ el: 'C', x: 1.4 * Math.cos(a), y: 1.4 * Math.sin(a), z: 0 });
      }
      for (let i = 0; i < 6; i++) {
        const a = (i * 60) * Math.PI / 180;
        atoms.push({ el: 'H', x: 2.48 * Math.cos(a), y: 2.48 * Math.sin(a), z: 0 });
      }
      return atoms;
    })(),
    bonds: [
      { a: 0, b: 1, type: AROMATIC }, { a: 1, b: 2, type: AROMATIC },
      { a: 2, b: 3, type: AROMATIC }, { a: 3, b: 4, type: AROMATIC },
      { a: 4, b: 5, type: AROMATIC }, { a: 5, b: 0, type: AROMATIC },
      { a: 0, b: 6, type: SINGLE }, { a: 1, b: 7, type: SINGLE },
      { a: 2, b: 8, type: SINGLE }, { a: 3, b: 9, type: SINGLE },
      { a: 4, b: 10, type: SINGLE }, { a: 5, b: 11, type: SINGLE },
    ],
  },
  caffeine: {
    name: 'Caffeine', formula: 'C\\u2088H\\u2081\\u2080N\\u2084O\\u2082', weight: 194.19,
    atoms: [
      { el: 'N', x: -1.2, y: 1.0, z: 0 }, { el: 'C', x: 0.0, y: 1.6, z: 0 },
      { el: 'N', x: 1.2, y: 1.0, z: 0 }, { el: 'C', x: 1.2, y: -0.4, z: 0 },
      { el: 'C', x: 0.0, y: -1.0, z: 0 }, { el: 'N', x: -1.2, y: -0.4, z: 0 },
      { el: 'C', x: -2.4, y: 1.7, z: 0 }, { el: 'O', x: 0.0, y: 2.8, z: 0 },
      { el: 'C', x: 2.4, y: 1.7, z: 0 }, { el: 'N', x: 0.0, y: -2.3, z: 0 },
      { el: 'C', x: 1.1, y: -2.8, z: 0 }, { el: 'C', x: 2.0, y: -1.2, z: 0 },
      { el: 'O', x: -2.0, y: -1.2, z: 0 }, { el: 'C', x: -2.4, y: -1.1, z: 0 },
      { el: 'H', x: -2.4, y: 2.3, z: 0.9 }, { el: 'H', x: -2.4, y: 2.3, z: -0.9 },
      { el: 'H', x: -3.3, y: 1.1, z: 0 }, { el: 'H', x: 2.4, y: 2.3, z: 0.9 },
      { el: 'H', x: 2.4, y: 2.3, z: -0.9 }, { el: 'H', x: 3.3, y: 1.1, z: 0 },
      { el: 'H', x: 1.3, y: -3.85, z: 0 },
      { el: 'H', x: -2.4, y: -1.7, z: 0.9 }, { el: 'H', x: -2.4, y: -1.7, z: -0.9 },
      { el: 'H', x: -3.3, y: -0.5, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, type: SINGLE }, { a: 1, b: 2, type: SINGLE },
      { a: 2, b: 3, type: SINGLE }, { a: 3, b: 4, type: DOUBLE },
      { a: 4, b: 5, type: SINGLE }, { a: 5, b: 0, type: SINGLE },
      { a: 0, b: 6, type: SINGLE }, { a: 1, b: 7, type: DOUBLE },
      { a: 2, b: 8, type: SINGLE }, { a: 4, b: 9, type: SINGLE },
      { a: 9, b: 10, type: DOUBLE }, { a: 10, b: 11, type: SINGLE },
      { a: 3, b: 11, type: SINGLE }, { a: 5, b: 12, type: DOUBLE },
      { a: 5, b: 13, type: SINGLE },
      { a: 6, b: 14, type: SINGLE }, { a: 6, b: 15, type: SINGLE },
      { a: 6, b: 16, type: SINGLE }, { a: 8, b: 17, type: SINGLE },
      { a: 8, b: 18, type: SINGLE }, { a: 8, b: 19, type: SINGLE },
      { a: 10, b: 20, type: SINGLE },
      { a: 13, b: 21, type: SINGLE }, { a: 13, b: 22, type: SINGLE },
      { a: 13, b: 23, type: SINGLE },
    ],
  },
  glucose: {
    name: 'Glucose', formula: 'C\\u2086H\\u2081\\u2082O\\u2086', weight: 180.156,
    atoms: [
      { el: 'C', x: 0, y: 0, z: 0 }, { el: 'C', x: 1.5, y: 0, z: 0.2 },
      { el: 'C', x: 2.2, y: 1.3, z: -0.1 }, { el: 'C', x: 1.4, y: 2.5, z: 0.3 },
      { el: 'C', x: -0.1, y: 2.4, z: -0.1 }, { el: 'O', x: -0.7, y: 1.1, z: 0.3 },
      { el: 'C', x: -0.9, y: 3.6, z: 0.3 }, { el: 'O', x: -0.5, y: -1.2, z: 0.4 },
      { el: 'O', x: 2.1, y: -1.1, z: -0.5 }, { el: 'O', x: 3.6, y: 1.3, z: 0.3 },
      { el: 'O', x: 1.9, y: 3.7, z: -0.2 }, { el: 'O', x: -2.2, y: 3.4, z: -0.1 },
      { el: 'H', x: 0.1, y: 0.1, z: -1.1 }, { el: 'H', x: 1.6, y: -0.2, z: 1.3 },
      { el: 'H', x: 2.2, y: 1.4, z: -1.2 }, { el: 'H', x: 1.5, y: 2.6, z: 1.4 },
      { el: 'H', x: -0.2, y: 2.5, z: -1.2 }, { el: 'H', x: -0.8, y: 3.8, z: 1.4 },
      { el: 'H', x: -0.5, y: 4.5, z: -0.2 }, { el: 'H', x: -1.4, y: -1.1, z: 0.2 },
      { el: 'H', x: 3.0, y: -1.0, z: -0.3 }, { el: 'H', x: 3.7, y: 1.3, z: 1.2 },
      { el: 'H', x: 2.8, y: 3.7, z: 0.1 }, { el: 'H', x: -2.7, y: 4.2, z: 0.2 },
    ],
    bonds: [
      { a: 0, b: 1, type: SINGLE }, { a: 1, b: 2, type: SINGLE },
      { a: 2, b: 3, type: SINGLE }, { a: 3, b: 4, type: SINGLE },
      { a: 4, b: 5, type: SINGLE }, { a: 5, b: 0, type: SINGLE },
      { a: 4, b: 6, type: SINGLE }, { a: 0, b: 7, type: SINGLE },
      { a: 1, b: 8, type: SINGLE }, { a: 2, b: 9, type: SINGLE },
      { a: 3, b: 10, type: SINGLE }, { a: 6, b: 11, type: SINGLE },
      { a: 0, b: 12, type: SINGLE }, { a: 1, b: 13, type: SINGLE },
      { a: 2, b: 14, type: SINGLE }, { a: 3, b: 15, type: SINGLE },
      { a: 4, b: 16, type: SINGLE }, { a: 6, b: 17, type: SINGLE },
      { a: 6, b: 18, type: SINGLE }, { a: 7, b: 19, type: SINGLE },
      { a: 8, b: 20, type: SINGLE }, { a: 9, b: 21, type: SINGLE },
      { a: 10, b: 22, type: SINGLE }, { a: 11, b: 23, type: SINGLE },
    ],
  },
  aspirin: {
    name: 'Aspirin', formula: 'C\\u2089H\\u2088O\\u2084', weight: 180.158,
    atoms: [
      { el: 'C', x: 0, y: 1.4, z: 0 }, { el: 'C', x: 1.21, y: 0.7, z: 0 },
      { el: 'C', x: 1.21, y: -0.7, z: 0 }, { el: 'C', x: 0, y: -1.4, z: 0 },
      { el: 'C', x: -1.21, y: -0.7, z: 0 }, { el: 'C', x: -1.21, y: 0.7, z: 0 },
      { el: 'C', x: 0, y: 2.9, z: 0 }, { el: 'O', x: 1.1, y: 3.5, z: 0 },
      { el: 'O', x: -1.1, y: 3.5, z: 0 }, { el: 'O', x: 2.4, y: 1.3, z: 0 },
      { el: 'C', x: 3.5, y: 0.6, z: 0 }, { el: 'O', x: 3.5, y: -0.6, z: 0 },
      { el: 'C', x: 4.8, y: 1.3, z: 0 },
      { el: 'H', x: 1.21, y: -1.5, z: 0.9 }, { el: 'H', x: 0, y: -2.5, z: 0 },
      { el: 'H', x: -1.21, y: -1.5, z: -0.9 }, { el: 'H', x: -2.15, y: 1.2, z: 0 },
      { el: 'H', x: -1.1, y: 4.4, z: 0 },
      { el: 'H', x: 4.8, y: 2.0, z: 0.9 }, { el: 'H', x: 4.8, y: 2.0, z: -0.9 },
      { el: 'H', x: 5.7, y: 0.7, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, type: AROMATIC }, { a: 1, b: 2, type: AROMATIC },
      { a: 2, b: 3, type: AROMATIC }, { a: 3, b: 4, type: AROMATIC },
      { a: 4, b: 5, type: AROMATIC }, { a: 5, b: 0, type: AROMATIC },
      { a: 0, b: 6, type: SINGLE }, { a: 6, b: 7, type: DOUBLE },
      { a: 6, b: 8, type: SINGLE }, { a: 1, b: 9, type: SINGLE },
      { a: 9, b: 10, type: SINGLE }, { a: 10, b: 11, type: DOUBLE },
      { a: 10, b: 12, type: SINGLE },
      { a: 2, b: 13, type: SINGLE }, { a: 3, b: 14, type: SINGLE },
      { a: 4, b: 15, type: SINGLE }, { a: 5, b: 16, type: SINGLE },
      { a: 8, b: 17, type: SINGLE },
      { a: 12, b: 18, type: SINGLE }, { a: 12, b: 19, type: SINGLE },
      { a: 12, b: 20, type: SINGLE },
    ],
  },
  adenine_thymine: {
    name: 'Adenine\\u2013Thymine Base Pair', formula: 'A=T', weight: 267.25,
    atoms: [
      { el: 'N', x: -3.0, y: 1.0, z: 0 }, { el: 'C', x: -2.0, y: 1.8, z: 0 },
      { el: 'N', x: -0.8, y: 1.3, z: 0 }, { el: 'C', x: -0.8, y: 0.0, z: 0 },
      { el: 'C', x: -2.0, y: -0.5, z: 0 }, { el: 'N', x: -2.0, y: -1.8, z: 0 },
      { el: 'C', x: -0.8, y: -2.3, z: 0 }, { el: 'N', x: 0.2, y: -1.3, z: 0 },
      { el: 'C', x: 0.2, y: 0.0, z: 0 }, { el: 'N', x: -2.0, y: 3.1, z: 0 },
      { el: 'N', x: 2.0, y: 1.0, z: 0 }, { el: 'C', x: 3.2, y: 1.6, z: 0 },
      { el: 'O', x: 3.2, y: 2.8, z: 0 }, { el: 'N', x: 4.3, y: 0.8, z: 0 },
      { el: 'C', x: 4.3, y: -0.5, z: 0 }, { el: 'O', x: 5.4, y: -1.1, z: 0 },
      { el: 'C', x: 3.1, y: -1.2, z: 0 }, { el: 'C', x: 2.0, y: -0.4, z: 0 },
      { el: 'C', x: 3.1, y: -2.6, z: 0 },
      { el: 'H', x: 0.9, y: 0.7, z: 0 }, { el: 'H', x: 1.3, y: 1.6, z: 0 },
      { el: 'H', x: 1.3, y: -1.0, z: 0 },
      { el: 'H', x: -2.9, y: 3.5, z: 0 }, { el: 'H', x: -1.2, y: 3.6, z: 0 },
      { el: 'H', x: 5.2, y: 1.2, z: 0 }, { el: 'H', x: -0.8, y: -3.35, z: 0 },
      { el: 'H', x: 3.1, y: -3.1, z: 0.9 }, { el: 'H', x: 3.1, y: -3.1, z: -0.9 },
      { el: 'H', x: 4.0, y: -2.8, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, type: DOUBLE }, { a: 1, b: 2, type: SINGLE },
      { a: 2, b: 3, type: DOUBLE }, { a: 3, b: 4, type: SINGLE },
      { a: 4, b: 0, type: SINGLE }, { a: 4, b: 5, type: DOUBLE },
      { a: 5, b: 6, type: SINGLE }, { a: 6, b: 7, type: DOUBLE },
      { a: 7, b: 8, type: SINGLE }, { a: 8, b: 3, type: SINGLE },
      { a: 1, b: 9, type: SINGLE },
      { a: 10, b: 11, type: SINGLE }, { a: 11, b: 12, type: DOUBLE },
      { a: 11, b: 13, type: SINGLE }, { a: 13, b: 14, type: SINGLE },
      { a: 14, b: 15, type: DOUBLE }, { a: 14, b: 16, type: SINGLE },
      { a: 16, b: 17, type: DOUBLE }, { a: 17, b: 10, type: SINGLE },
      { a: 16, b: 18, type: SINGLE },
      { a: 8, b: 19, type: SINGLE }, { a: 19, b: 20, type: SINGLE },
      { a: 17, b: 21, type: SINGLE },
      { a: 9, b: 22, type: SINGLE }, { a: 9, b: 23, type: SINGLE },
      { a: 13, b: 24, type: SINGLE }, { a: 6, b: 25, type: SINGLE },
      { a: 18, b: 26, type: SINGLE }, { a: 18, b: 27, type: SINGLE },
      { a: 18, b: 28, type: SINGLE },
    ],
  },
};

const MOLECULE_KEYS = ['water','co2','ammonia','methane','ethanol','benzene','caffeine','glucose','aspirin','adenine_thymine'];

// ==================== REACTION DATABASE ====================
const REACTIONS = {
  water_formation: {
    name: 'Water Formation',
    equation: '2H\\u2082 + O\\u2082 \\u2192 2H\\u2082O',
    type: 'Combustion (Exothermic)',
    deltaH: -572, activationEnergy: 200,
    desc: 'Hydrogen burns in oxygen to form water, releasing 572 kJ/mol of energy.',
    atoms: [{ el:'H' },{ el:'H' },{ el:'H' },{ el:'H' },{ el:'O' },{ el:'O' }],
    reactPos: [
      { x:-3.5, y:1.2, z:0 },{ x:-2.4, y:1.2, z:0 },
      { x:-3.5, y:-1.2, z:0 },{ x:-2.4, y:-1.2, z:0 },
      { x:2.0, y:0.4, z:0 },{ x:3.2, y:-0.4, z:0 },
    ],
    prodPos: [
      { x:-2.46, y:0.6, z:0.28 },{ x:-0.54, y:0.6, z:0.28 },
      { x:0.54, y:-0.6, z:0.28 },{ x:2.46, y:-0.6, z:0.28 },
      { x:-1.5, y:0.6, z:0 },{ x:1.5, y:-0.6, z:0 },
    ],
    reactBonds: [{ a:0,b:1,type:SINGLE },{ a:2,b:3,type:SINGLE },{ a:4,b:5,type:DOUBLE }],
    prodBonds: [{ a:4,b:0,type:SINGLE },{ a:4,b:1,type:SINGLE },{ a:5,b:2,type:SINGLE },{ a:5,b:3,type:SINGLE }],
  },
  methane_combustion: {
    name: 'Methane Combustion',
    equation: 'CH\\u2084 + 2O\\u2082 \\u2192 CO\\u2082 + 2H\\u2082O',
    type: 'Combustion (Exothermic)',
    deltaH: -890, activationEnergy: 150,
    desc: 'Methane burns in oxygen to produce carbon dioxide and water \\u2014 the most common natural gas reaction.',
    atoms: [{ el:'C' },{ el:'H' },{ el:'H' },{ el:'H' },{ el:'H' },{ el:'O' },{ el:'O' },{ el:'O' },{ el:'O' }],
    reactPos: [
      { x:-3, y:0, z:0 },{ x:-1.91, y:0, z:0 },{ x:-3.36, y:1.03, z:0 },
      { x:-3.36, y:-0.51, z:0.89 },{ x:-3.36, y:-0.51, z:-0.89 },
      { x:1.5, y:1.5, z:0 },{ x:2.7, y:1.5, z:0 },
      { x:1.5, y:-1.5, z:0 },{ x:2.7, y:-1.5, z:0 },
    ],
    prodPos: [
      { x:-2, y:0, z:0 },{ x:-3.46, y:1.7, z:0.28 },{ x:-1.54, y:1.7, z:0.28 },
      { x:1.54, y:-1.7, z:0.28 },{ x:3.46, y:-1.7, z:0.28 },
      { x:-3.16, y:0, z:0 },{ x:-0.84, y:0, z:0 },
      { x:-2.5, y:1.7, z:0 },{ x:2.5, y:-1.7, z:0 },
    ],
    reactBonds: [
      { a:0,b:1,type:SINGLE },{ a:0,b:2,type:SINGLE },
      { a:0,b:3,type:SINGLE },{ a:0,b:4,type:SINGLE },
      { a:5,b:6,type:DOUBLE },{ a:7,b:8,type:DOUBLE },
    ],
    prodBonds: [
      { a:0,b:5,type:DOUBLE },{ a:0,b:6,type:DOUBLE },
      { a:7,b:1,type:SINGLE },{ a:7,b:2,type:SINGLE },
      { a:8,b:3,type:SINGLE },{ a:8,b:4,type:SINGLE },
    ],
  },
  haber_process: {
    name: 'Haber Process',
    equation: 'N\\u2082 + 3H\\u2082 \\u2192 2NH\\u2083',
    type: 'Synthesis (Exothermic)',
    deltaH: -92, activationEnergy: 230,
    desc: 'The industrial synthesis of ammonia \\u2014 one of the most important chemical reactions in history, enabling modern agriculture.',
    atoms: [{ el:'N' },{ el:'N' },{ el:'H' },{ el:'H' },{ el:'H' },{ el:'H' },{ el:'H' },{ el:'H' }],
    reactPos: [
      { x:-0.55, y:0, z:0 },{ x:0.55, y:0, z:0 },
      { x:-3.5, y:2, z:0 },{ x:-2.4, y:2, z:0 },
      { x:-3.5, y:-2, z:0 },{ x:-2.4, y:-2, z:0 },
      { x:3, y:0.5, z:0 },{ x:4.1, y:0.5, z:0 },
    ],
    prodPos: [
      { x:-2, y:0, z:-0.15 },{ x:2, y:0, z:-0.15 },
      { x:-2.94, y:0, z:0.23 },{ x:2.94, y:0, z:0.23 },
      { x:-1.53, y:0.81, z:0.23 },{ x:1.53, y:0.81, z:0.23 },
      { x:-1.53, y:-0.81, z:0.23 },{ x:1.53, y:-0.81, z:0.23 },
    ],
    reactBonds: [
      { a:0,b:1,type:DOUBLE },{ a:2,b:3,type:SINGLE },
      { a:4,b:5,type:SINGLE },{ a:6,b:7,type:SINGLE },
    ],
    prodBonds: [
      { a:0,b:2,type:SINGLE },{ a:0,b:4,type:SINGLE },{ a:0,b:6,type:SINGLE },
      { a:1,b:3,type:SINGLE },{ a:1,b:5,type:SINGLE },{ a:1,b:7,type:SINGLE },
    ],
  },
};
const REACTION_KEYS = ['water_formation','methane_combustion','haber_process'];

// ==================== 3D MATH ====================
function rotateX(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y*c - p.z*s, z: p.y*s + p.z*c };
}
function rotateY(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x*c + p.z*s, y: p.y, z: -p.x*s + p.z*c };
}
function project(p, w, h, fov, camZ) {
  const scale = fov / (camZ + p.z);
  return { x: p.x*scale + w/2, y: -p.y*scale + h/2, scale, z: p.z };
}
function vec3sub(a, b) { return { x: a.x-b.x, y: a.y-b.y, z: a.z-b.z }; }
function vec3dot(a, b) { return a.x*b.x + a.y*b.y + a.z*b.z; }
function vec3len(v) { return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); }
function vec3angle(a, b) {
  const d = vec3dot(a,b) / (vec3len(a)*vec3len(b) || 1);
  return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI;
}
function lerp(a, b, t) { return a + (b-a)*t; }
function smoothstep(t) { return t*t*(3-2*t); }
function rrect(ctx, x, y, w, h, r) {
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

// ==================== COLOR UTILITIES ====================
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return \`rgba(\${r},\${g},\${b},\${alpha})\`;
}
function lightenHex(hex, amt) {
  let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  r = Math.min(255,r+amt); g = Math.min(255,g+amt); b = Math.min(255,b+amt);
  return '#'+[r,g,b].map(c=>c.toString(16).padStart(2,'0')).join('');
}
function darkenHex(hex, amt) {
  let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  r = Math.max(0,r-amt); g = Math.max(0,g-amt); b = Math.max(0,b-amt);
  return '#'+[r,g,b].map(c=>c.toString(16).padStart(2,'0')).join('');
}
function enToColor(el) {
  const en = ELECTRONEGATIVITY[el] || 2.5;
  const t = Math.max(0, Math.min(1, (en - 2.0) / 1.8));
  if (t < 0.5) {
    const s = t * 2;
    const r = Math.round(59 + s*(220-59)), g = Math.round(130 + s*(220-130)), b = Math.round(246 + s*(220-246));
    return { fill: '#'+[r,g,b].map(c=>c.toString(16).padStart(2,'0')).join(''), glow: '#90cdf4' };
  } else {
    const s = (t-0.5)*2;
    const r = Math.round(220 + s*(239-220)), g = Math.round(220 - s*(220-68)), b = Math.round(220 - s*(220-68));
    return { fill: '#'+[r,g,b].map(c=>c.toString(16).padStart(2,'0')).join(''), glow: '#fc8181' };
  }
}

// ==================== VSEPR COMPUTATION ====================
function computeVSEPR(mol) {
  return mol.atoms.map((atom, idx) => {
    if (atom.el === 'H') return null;
    const bondedTo = [];
    let bondOrderSum = 0;
    mol.bonds.forEach(b => {
      const order = b.type === DOUBLE ? 2 : b.type === AROMATIC ? 1.5 : 1;
      if (b.a === idx) { bondedTo.push(b.b); bondOrderSum += order; }
      if (b.b === idx) { bondedTo.push(b.a); bondOrderSum += order; }
    });
    const unique = [...new Set(bondedTo)];
    if (unique.length < 2) return null;

    const val = VALENCE[atom.el] || 4;
    const lp = Math.max(0, Math.round((val - bondOrderSum) / 2));
    const totalDomains = unique.length + lp;

    let geom = '';
    if (totalDomains <= 2) geom = 'Linear';
    else if (totalDomains === 3) geom = lp === 0 ? 'Trigonal Planar' : 'Bent';
    else if (totalDomains === 4) geom = lp === 0 ? 'Tetrahedral' : lp === 1 ? 'Trigonal Pyramidal' : 'Bent';
    else if (totalDomains === 5) geom = lp === 0 ? 'Trigonal Bipyramidal' : lp === 1 ? 'Seesaw' : 'T-Shaped';
    else if (totalDomains === 6) geom = lp === 0 ? 'Octahedral' : 'Square Pyramidal';

    const angles = [];
    for (let i = 0; i < unique.length; i++) {
      for (let j = i+1; j < unique.length; j++) {
        const va = vec3sub(mol.atoms[unique[i]], atom);
        const vb = vec3sub(mol.atoms[unique[j]], atom);
        angles.push({ atomA: unique[i], atomB: unique[j], degrees: vec3angle(va, vb) });
      }
    }
    return { idx, el: atom.el, bonded: unique, lonePairs: lp, totalDomains, geom, angles };
  }).filter(Boolean);
}

// ==================== DIPOLE COMPUTATION ====================
function computeDipole(mol) {
  let dx = 0, dy = 0, dz = 0;
  const bondDipoles = [];
  mol.bonds.forEach(b => {
    const aEN = ELECTRONEGATIVITY[mol.atoms[b.a].el] || 2.5;
    const bEN = ELECTRONEGATIVITY[mol.atoms[b.b].el] || 2.5;
    const diff = bEN - aEN;
    if (Math.abs(diff) < 0.05) return;
    const v = vec3sub(mol.atoms[b.b], mol.atoms[b.a]);
    const len = vec3len(v) || 1;
    const ux = v.x/len, uy = v.y/len, uz = v.z/len;
    dx += diff * ux; dy += diff * uy; dz += diff * uz;
    bondDipoles.push({
      a: b.a, b: b.b, diff,
      plusAtom: diff > 0 ? b.a : b.b,
      minusAtom: diff > 0 ? b.b : b.a,
    });
  });
  const mag = Math.sqrt(dx*dx + dy*dy + dz*dz);
  let cx = 0, cy = 0, cz = 0;
  mol.atoms.forEach(a => { cx += a.x; cy += a.y; cz += a.z; });
  const n = mol.atoms.length;
  return {
    vec: { x: dx, y: dy, z: dz },
    magnitude: mag,
    center: { x: cx/n, y: cy/n, z: cz/n },
    polar: mag > 0.3,
    bondDipoles,
  };
}

// ==================== CANVAS RENDERER ====================
function renderMolecule(ctx, mol, rotX, rotY, zoom, w, h, opts) {
  const { showLabels, showClouds, colorMode, projectedRef } = opts;
  const fov = 500 * zoom, camZ = 8;

  const transformed = mol.atoms.map((a, i) => {
    let p = rotateX(rotateY({ x:a.x, y:a.y, z:a.z }, rotY), rotX);
    const proj = project(p, w, h, fov, camZ);
    return { ...proj, el: a.el, idx: i, wx: p.x, wy: p.y, wz: p.z };
  });
  if (projectedRef) projectedRef.current = transformed;
  const sorted = [...transformed].sort((a, b) => b.z - a.z);

  // Background
  const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.7);
  grad.addColorStop(0, '#1a2744'); grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = 'rgba(100,116,139,0.06)'; ctx.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 40) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,h); ctx.stroke(); }
  for (let gy = 0; gy < h; gy += 40) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(w,gy); ctx.stroke(); }

  // Electron clouds
  if (showClouds) {
    sorted.forEach(atom => {
      const r = (CLOUD_RADII[atom.el]||25) * (atom.scale/(fov/camZ)) * 1.8;
      const color = ELEMENT_COLORS[atom.el] || ELEMENT_COLORS.C;
      const cg = ctx.createRadialGradient(atom.x, atom.y, 0, atom.x, atom.y, r);
      cg.addColorStop(0, hexToRgba(color.glow, 0.18));
      cg.addColorStop(0.5, hexToRgba(color.glow, 0.08));
      cg.addColorStop(1, hexToRgba(color.glow, 0));
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(atom.x, atom.y, r, 0, Math.PI*2); ctx.fill();
    });
  }

  // Bonds
  const bondDrawList = mol.bonds.map(bond => {
    const a = transformed[bond.a], b = transformed[bond.b];
    return { ...bond, a, b, midZ: (a.z+b.z)/2 };
  }).sort((a, b) => b.midZ - a.midZ);

  bondDrawList.forEach(bond => {
    const { a, b, type } = bond;
    const ddx = b.x-a.x, ddy = b.y-a.y;
    const len = Math.sqrt(ddx*ddx+ddy*ddy)||1;
    const nx = -ddy/len, ny = ddx/len;
    const avgScale = (a.scale+b.scale)/2;
    const thickness = Math.max(1.5, 2.5*(avgScale/(fov/camZ)));
    const depthFade = Math.max(0.25, Math.min(1, 1-(a.z+b.z)/16));
    ctx.lineWidth = thickness; ctx.lineCap = 'round';

    if (type === SINGLE) {
      ctx.strokeStyle = \`rgba(148,163,184,\${depthFade*0.8})\`; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    } else if (type === DOUBLE) {
      const off = 3*(avgScale/(fov/camZ));
      ctx.strokeStyle = \`rgba(148,163,184,\${depthFade*0.8})\`; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(a.x+nx*off,a.y+ny*off); ctx.lineTo(b.x+nx*off,b.y+ny*off); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a.x-nx*off,a.y-ny*off); ctx.lineTo(b.x-nx*off,b.y-ny*off); ctx.stroke();
    } else if (type === AROMATIC) {
      const off = 3*(avgScale/(fov/camZ));
      ctx.strokeStyle = \`rgba(148,163,184,\${depthFade*0.8})\`; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(a.x+nx*off,a.y+ny*off); ctx.lineTo(b.x+nx*off,b.y+ny*off); ctx.stroke();
      ctx.setLineDash([4,4]); ctx.strokeStyle = \`rgba(148,163,184,\${depthFade*0.5})\`;
      ctx.beginPath(); ctx.moveTo(a.x-nx*off,a.y-ny*off); ctx.lineTo(b.x-nx*off,b.y-ny*off); ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // Atoms
  sorted.forEach(atom => {
    const useEN = colorMode === 'electronegativity';
    const color = useEN ? enToColor(atom.el) : (ELEMENT_COLORS[atom.el] || ELEMENT_COLORS.C);
    const baseR = ELEMENT_RADII[atom.el] || 12;
    const r = Math.max(4, baseR * (atom.scale/(fov/camZ)));
    const depthFade = Math.max(0.35, Math.min(1, 1-atom.z/12));

    // Glow
    const gg = ctx.createRadialGradient(atom.x, atom.y, r*0.3, atom.x, atom.y, r*2.5);
    gg.addColorStop(0, hexToRgba(color.glow, 0.3*depthFade)); gg.addColorStop(1, hexToRgba(color.glow, 0));
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(atom.x, atom.y, r*2.5, 0, Math.PI*2); ctx.fill();

    // Sphere
    const sg = ctx.createRadialGradient(atom.x-r*0.3, atom.y-r*0.3, r*0.1, atom.x, atom.y, r);
    sg.addColorStop(0, lightenHex(color.fill, 60)); sg.addColorStop(0.5, color.fill); sg.addColorStop(1, darkenHex(color.fill, 40));
    ctx.fillStyle = sg; ctx.globalAlpha = depthFade;
    ctx.beginPath(); ctx.arc(atom.x, atom.y, r, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    // Specular
    const spg = ctx.createRadialGradient(atom.x-r*0.25, atom.y-r*0.25, 0, atom.x-r*0.25, atom.y-r*0.25, r*0.6);
    spg.addColorStop(0, 'rgba(255,255,255,0.5)'); spg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spg; ctx.beginPath(); ctx.arc(atom.x, atom.y, r, 0, Math.PI*2); ctx.fill();

    if (showLabels) {
      const fs = Math.max(9, r*0.9);
      ctx.font = \`bold \${fs}px system-ui\`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = atom.el === 'H' ? '#1e293b' : '#f1f5f9';
      ctx.fillText(atom.el, atom.x, atom.y);
    }
  });

  return transformed;
}

// ==================== VSEPR OVERLAY ====================
function renderVSEPROverlay(ctx, mol, vsepData, transformed, fov, camZ) {
  if (!vsepData || !transformed.length) return;

  vsepData.forEach(info => {
    const center = transformed[info.idx];
    if (!center) return;
    const scaleFactor = center.scale / (fov / camZ);

    // Draw angle arcs for each angle pair
    info.angles.forEach(ang => {
      const a = transformed[ang.atomA];
      const b = transformed[ang.atomB];
      if (!a || !b) return;

      const dxA = a.x - center.x, dyA = a.y - center.y;
      const dxB = b.x - center.x, dyB = b.y - center.y;
      const angA = Math.atan2(dyA, dxA);
      const angB = Math.atan2(dyB, dxB);

      // Draw arc
      const arcR = 25 * scaleFactor;
      let startAng = angA, endAng = angB;
      let diff = endAng - startAng;
      if (diff > Math.PI) diff -= 2*Math.PI;
      if (diff < -Math.PI) diff += 2*Math.PI;

      ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      if (diff > 0) {
        ctx.arc(center.x, center.y, arcR, startAng, startAng + diff);
      } else {
        ctx.arc(center.x, center.y, arcR, startAng + diff, startAng);
      }
      ctx.stroke();

      // Angle label
      const midAng = startAng + diff / 2;
      const labelR = arcR + 14;
      const lx = center.x + Math.cos(midAng) * labelR;
      const ly = center.y + Math.sin(midAng) * labelR;
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(250, 204, 21, 0.95)';
      ctx.fillText(ang.degrees.toFixed(1) + '\\u00B0', lx, ly);
    });

    // Geometry label
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const bgW = ctx.measureText(info.geom).width + 12;
    const labelY = center.y - 30 * scaleFactor;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.beginPath();
    rrect(ctx, center.x - bgW/2, labelY - 10, bgW, 20, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)'; ctx.lineWidth = 1;
    ctx.beginPath();
    rrect(ctx, center.x - bgW/2, labelY - 10, bgW, 20, 6);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(info.geom, center.x, labelY);

    // Lone pairs
    if (info.lonePairs > 0) {
      let avgDx = 0, avgDy = 0;
      info.bonded.forEach(bi => {
        const bp = transformed[bi];
        avgDx += bp.x - center.x;
        avgDy += bp.y - center.y;
      });
      const mag = Math.sqrt(avgDx*avgDx + avgDy*avgDy) || 1;
      const antiX = -avgDx/mag, antiY = -avgDy/mag;
      const lobeR = 18 * scaleFactor;
      const lobeOff = 22 * scaleFactor;

      for (let i = 0; i < info.lonePairs; i++) {
        const baseAng = Math.atan2(antiY, antiX);
        const spread = info.lonePairs === 1 ? 0 : (i - (info.lonePairs-1)/2) * 0.6;
        const ang = baseAng + spread;
        const lx = center.x + Math.cos(ang) * lobeOff;
        const ly = center.y + Math.sin(ang) * lobeOff;

        const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, lobeR);
        lg.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
        lg.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(ang);
        ctx.scale(1, 0.65);
        ctx.arc(0, 0, lobeR, 0, Math.PI*2);
        ctx.restore();
        ctx.fill();

        // LP label
        ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(192, 132, 252, 0.8)';
        ctx.fillText('LP', lx, ly);
      }
    }
  });
}

// ==================== POLARITY OVERLAY ====================
function renderPolarityOverlay(ctx, mol, transformed, dipoleData, fov, camZ, rotX, rotY, w, h) {
  if (!dipoleData || !transformed.length) return;

  // Bond polarity arrows & delta labels
  dipoleData.bondDipoles.forEach(bd => {
    const pa = transformed[bd.plusAtom];
    const ma = transformed[bd.minusAtom];
    if (!pa || !ma) return;

    // Arrow along bond toward more EN atom
    const mx = (pa.x + ma.x) / 2, my = (pa.y + ma.y) / 2;
    const ddx = ma.x - pa.x, ddy = ma.y - pa.y;
    const len = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
    const ux = ddx/len, uy = ddy/len;

    // Small arrow at midpoint
    const arrowLen = 12;
    const tipX = mx + ux * arrowLen/2, tipY = my + uy * arrowLen/2;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)'; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(mx - ux*arrowLen/2, my - uy*arrowLen/2); ctx.lineTo(tipX, tipY); ctx.stroke();
    // Arrowhead
    const ax1 = tipX - ux*5 + uy*3, ay1 = tipY - uy*5 - ux*3;
    const ax2 = tipX - ux*5 - uy*3, ay2 = tipY - uy*5 + ux*3;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(ax1, ay1); ctx.lineTo(ax2, ay2); ctx.closePath(); ctx.fill();

    // Delta labels
    const scaleFactor = pa.scale / (fov / camZ);
    const baseR = ELEMENT_RADII[mol.atoms[bd.plusAtom].el] || 12;
    const r = Math.max(4, baseR * scaleFactor);
    ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(96, 165, 250, 0.95)';
    ctx.fillText('\\u03B4+', pa.x, pa.y - r - 8);
    ctx.fillStyle = 'rgba(248, 113, 113, 0.95)';
    ctx.fillText('\\u03B4\\u2212', ma.x, ma.y - r - 8);
  });

  // Net dipole arrow
  if (dipoleData.polar) {
    const c = dipoleData.center;
    const v = dipoleData.vec;
    let cp = rotateX(rotateY(c, rotY), rotX);
    let vp = rotateX(rotateY({ x: c.x + v.x*0.8, y: c.y + v.y*0.8, z: c.z + v.z*0.8 }, rotY), rotX);
    const fovVal = 500 * (fov / 500); // zoom is baked into fov already
    const cProj = project(cp, w, h, fovVal, 8);
    const vProj = project(vp, w, h, fovVal, 8);

    const ddx = vProj.x - cProj.x, ddy = vProj.y - cProj.y;
    const len = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
    const ux = ddx/len, uy = ddy/len;
    const arrowScale = Math.min(60, len * 1.5);

    const startX = cProj.x, startY = cProj.y;
    const endX = cProj.x + ux * arrowScale, endY = cProj.y + uy * arrowScale;

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)'; ctx.lineWidth = 3; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();

    // Arrowhead
    const ah1x = endX - ux*8 + uy*5, ah1y = endY - uy*8 - ux*5;
    const ah2x = endX - ux*8 - uy*5, ah2y = endY - uy*8 + ux*5;
    ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
    ctx.beginPath(); ctx.moveTo(endX, endY); ctx.lineTo(ah1x, ah1y); ctx.lineTo(ah2x, ah2y); ctx.closePath(); ctx.fill();

    // "+" crossbar at tail
    ctx.beginPath(); ctx.moveTo(startX - uy*4, startY + ux*4); ctx.lineTo(startX + uy*4, startY - ux*4); ctx.stroke();

    // Label
    ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(34, 211, 238, 0.9)';
    ctx.fillText('\\u03BC net', endX + 8, endY);
  } else {
    // Nonpolar label
    ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(34, 211, 238, 0.6)';
    ctx.fillText('Nonpolar (\\u03BC = 0)', w/2, 30);
  }
}

// ==================== MEASUREMENT OVERLAY ====================
function renderMeasurementOverlay(ctx, transformed, selectedAtoms, mol) {
  if (!transformed.length || selectedAtoms.length === 0) return;

  // Highlight selected atoms
  selectedAtoms.forEach(idx => {
    const a = transformed[idx];
    if (!a) return;
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(a.x, a.y, 18, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
  });

  if (selectedAtoms.length === 2) {
    const a = transformed[selectedAtoms[0]], b = transformed[selectedAtoms[1]];
    const atomA = mol.atoms[selectedAtoms[0]], atomB = mol.atoms[selectedAtoms[1]];
    const dist = vec3len(vec3sub(atomB, atomA));

    // Dashed line
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.setLineDash([]);

    // Distance label
    const mx = (a.x+b.x)/2, my = (a.y+b.y)/2;
    const label = dist.toFixed(2) + ' \\u00C5';
    ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lw = ctx.measureText(label).width + 14;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath(); rrect(ctx, mx-lw/2, my-12, lw, 24, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); rrect(ctx, mx-lw/2, my-12, lw, 24, 8); ctx.stroke();
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(label, mx, my);
  }

  if (selectedAtoms.length === 3) {
    const a = transformed[selectedAtoms[0]], b = transformed[selectedAtoms[1]], c = transformed[selectedAtoms[2]];
    const atomA = mol.atoms[selectedAtoms[0]], atomB = mol.atoms[selectedAtoms[1]], atomC = mol.atoms[selectedAtoms[2]];

    // Angle at atom B (middle atom)
    const va = vec3sub(atomA, atomB), vc = vec3sub(atomC, atomB);
    const angle = vec3angle(va, vc);

    // Lines
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.setLineDash([]);

    // Arc
    const angA = Math.atan2(a.y-b.y, a.x-b.x);
    const angC = Math.atan2(c.y-b.y, c.x-b.x);
    let diff = angC - angA;
    if (diff > Math.PI) diff -= 2*Math.PI;
    if (diff < -Math.PI) diff += 2*Math.PI;

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (diff > 0) ctx.arc(b.x, b.y, 30, angA, angA + diff);
    else ctx.arc(b.x, b.y, 30, angA + diff, angA);
    ctx.stroke();

    // Angle label
    const midAng = angA + diff / 2;
    const lx = b.x + Math.cos(midAng) * 48;
    const ly = b.y + Math.sin(midAng) * 48;
    const label = angle.toFixed(1) + '\\u00B0';
    ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lw = ctx.measureText(label).width + 14;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath(); rrect(ctx, lx-lw/2, ly-12, lw, 24, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); rrect(ctx, lx-lw/2, ly-12, lw, 24, 8); ctx.stroke();
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(label, lx, ly);
  }
}

// ==================== REACTION RENDERER ====================
function renderReaction(ctx, reaction, progress, rotXVal, rotYVal, zoom, w, h) {
  const fov = 500 * zoom, camZ = 8;
  const t = smoothstep(progress);

  // Interpolate positions
  const atoms = reaction.atoms.map((a, i) => {
    const rp = reaction.reactPos[i], pp = reaction.prodPos[i];
    return {
      el: a.el,
      x: lerp(rp.x, pp.x, t),
      y: lerp(rp.y, pp.y, t),
      z: lerp(rp.z, pp.z, t),
    };
  });

  // Transform
  const transformed = atoms.map((a, i) => {
    let p = rotateX(rotateY({ x:a.x, y:a.y, z:a.z }, rotYVal), rotXVal);
    const proj = project(p, w, h, fov, camZ);
    return { ...proj, el: a.el, idx: i };
  });
  const sorted = [...transformed].sort((a, b) => b.z - a.z);

  // Background
  const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.7);
  grad.addColorStop(0, '#1a2744'); grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(100,116,139,0.06)'; ctx.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 40) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,h); ctx.stroke(); }
  for (let gy = 0; gy < h; gy += 40) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(w,gy); ctx.stroke(); }

  // Bond opacity functions
  const reactOp = progress < 0.25 ? 1 : progress < 0.45 ? 1 - (progress-0.25)/0.2 : 0;
  const prodOp = progress < 0.55 ? 0 : progress < 0.75 ? (progress-0.55)/0.2 : 1;

  // Draw reactant bonds
  const drawBonds = (bonds, opacity) => {
    if (opacity <= 0.01) return;
    bonds.forEach(bond => {
      const a = transformed[bond.a], b = transformed[bond.b];
      const ddx = b.x-a.x, ddy = b.y-a.y;
      const len = Math.sqrt(ddx*ddx+ddy*ddy)||1;
      const nx = -ddy/len, ny = ddx/len;
      const avgScale = (a.scale+b.scale)/2;
      const thickness = Math.max(1.5, 2.5*(avgScale/(fov/camZ)));
      ctx.lineWidth = thickness; ctx.lineCap = 'round';
      ctx.globalAlpha = opacity;

      if (bond.type === SINGLE) {
        ctx.strokeStyle = 'rgba(148,163,184,0.8)'; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      } else if (bond.type === DOUBLE) {
        const off = 3*(avgScale/(fov/camZ));
        ctx.strokeStyle = 'rgba(148,163,184,0.8)'; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(a.x+nx*off,a.y+ny*off); ctx.lineTo(b.x+nx*off,b.y+ny*off); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.x-nx*off,a.y-ny*off); ctx.lineTo(b.x-nx*off,b.y-ny*off); ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  };

  drawBonds(reaction.reactBonds, reactOp);
  drawBonds(reaction.prodBonds, prodOp);

  // Energy flash at transition state
  if (progress > 0.3 && progress < 0.7) {
    const flashIntensity = 1 - Math.abs(progress - 0.5) / 0.2;
    if (flashIntensity > 0) {
      const fg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 120);
      fg.addColorStop(0, \`rgba(251, 191, 36, \${0.15 * flashIntensity})\`);
      fg.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(w/2, h/2, 120, 0, Math.PI*2); ctx.fill();
    }
  }

  // Draw atoms
  sorted.forEach(atom => {
    const color = ELEMENT_COLORS[atom.el] || ELEMENT_COLORS.C;
    const baseR = ELEMENT_RADII[atom.el] || 12;
    const r = Math.max(4, baseR * (atom.scale/(fov/camZ)));
    const depthFade = Math.max(0.35, Math.min(1, 1-atom.z/12));

    const gg = ctx.createRadialGradient(atom.x, atom.y, r*0.3, atom.x, atom.y, r*2.5);
    gg.addColorStop(0, hexToRgba(color.glow, 0.3*depthFade)); gg.addColorStop(1, hexToRgba(color.glow, 0));
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(atom.x, atom.y, r*2.5, 0, Math.PI*2); ctx.fill();

    const sg = ctx.createRadialGradient(atom.x-r*0.3, atom.y-r*0.3, r*0.1, atom.x, atom.y, r);
    sg.addColorStop(0, lightenHex(color.fill, 60)); sg.addColorStop(0.5, color.fill); sg.addColorStop(1, darkenHex(color.fill, 40));
    ctx.fillStyle = sg; ctx.globalAlpha = depthFade;
    ctx.beginPath(); ctx.arc(atom.x, atom.y, r, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    const spg = ctx.createRadialGradient(atom.x-r*0.25, atom.y-r*0.25, 0, atom.x-r*0.25, atom.y-r*0.25, r*0.6);
    spg.addColorStop(0, 'rgba(255,255,255,0.5)'); spg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spg; ctx.beginPath(); ctx.arc(atom.x, atom.y, r, 0, Math.PI*2); ctx.fill();

    // Labels always on for reactions
    const fs = Math.max(9, r*0.9);
    ctx.font = \`bold \${fs}px system-ui\`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = atom.el === 'H' ? '#1e293b' : '#f1f5f9';
    ctx.fillText(atom.el, atom.x, atom.y);
  });

  // Equation overlay
  ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
  ctx.fillText(reaction.equation, w/2, 12);

  // Progress indicator
  const barW = 200, barH = 4, barX = w/2 - barW/2, barY = h - 20;
  ctx.fillStyle = 'rgba(51, 65, 85, 0.6)';
  ctx.beginPath(); rrect(ctx, barX, barY, barW, barH, 2); ctx.fill();
  ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
  ctx.beginPath(); rrect(ctx, barX, barY, barW * progress, barH, 2); ctx.fill();
}

// ==================== ENERGY DIAGRAM ====================
function EnergyDiagram({ reaction, progress }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !reaction) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath(); rrect(ctx, 0, 0, w, h, 8); ctx.fill();

    const pad = 30, plotW = w - pad*2, plotH = h - pad*2;
    const eReact = 0, eProd = reaction.deltaH;
    const eMax = reaction.activationEnergy;
    const minE = Math.min(eReact, eProd) - 30;
    const maxE = eMax + 30;
    const eRange = maxE - minE;

    const toY = (e) => pad + plotH * (1 - (e - minE) / eRange);
    const toX = (t) => pad + t * plotW;

    // Axes
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h-pad); ctx.lineTo(w-pad, h-pad); ctx.stroke();

    // Curve
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      // Gaussian activation energy curve
      const gaussian = eMax * Math.exp(-((t - 0.45) * 4) ** 2);
      const baseline = eReact + (eProd - eReact) * t;
      const e = baseline + gaussian;
      const x = toX(t), y = toY(e);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Reactant & product levels
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, toY(eReact)); ctx.lineTo(w-pad, toY(eReact)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, toY(eProd)); ctx.lineTo(w-pad, toY(eProd)); ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.font = '9px system-ui'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'left';
    ctx.fillText('Reactants', pad + 4, toY(eReact) - 4);
    ctx.textAlign = 'right';
    ctx.fillText('Products', w - pad - 4, toY(eProd) - 4);

    // Delta H arrow
    const dhX = w - pad - 20;
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]);
    ctx.beginPath(); ctx.moveTo(dhX, toY(eReact)); ctx.lineTo(dhX, toY(eProd)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'bold 9px system-ui'; ctx.fillStyle = '#f87171'; ctx.textAlign = 'center';
    ctx.fillText('\\u0394H=' + reaction.deltaH + ' kJ', dhX, (toY(eReact) + toY(eProd))/2 + 3);

    // Ea label
    ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'center';
    ctx.fillText('Ea=' + reaction.activationEnergy + ' kJ', toX(0.45), toY(eMax) - 8);

    // Progress dot
    const pt = progress;
    const gaussian = eMax * Math.exp(-((pt - 0.45) * 4) ** 2);
    const baseline = eReact + (eProd - eReact) * pt;
    const dotE = baseline + gaussian;
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath(); ctx.arc(toX(pt), toY(dotE), 5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(toX(pt), toY(dotE), 8, 0, Math.PI*2); ctx.stroke();

    // Axis labels
    ctx.font = '8px system-ui'; ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('Reaction Progress', w/2, h - 4);
    ctx.save(); ctx.translate(8, h/2); ctx.rotate(-Math.PI/2);
    ctx.fillText('Energy', 0, 0); ctx.restore();
  }, [reaction, progress]);

  return <canvas ref={canvasRef} width={260} height={160} style={{ width: 260, height: 160 }} />;
}

// ==================== UI COMPONENTS ====================
function ModeTab({ id, label, icon, active, onClick }) {
  return (
    <button onClick={() => onClick(id)}
      className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border flex items-center gap-1.5 \${
        active
          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
          : 'bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60'
      }\`}>
      <span>{icon}<\/span> {label}
    <\/button>
  );
}

function InfoPanel({ mol, mode, vsepData, dipoleData }) {
  if (!mol) return null;
  const atomCounts = {};
  mol.atoms.forEach(a => { atomCounts[a.el] = (atomCounts[a.el] || 0) + 1; });
  return (
    <div className="fade-in bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-4">
      <h3 className="text-lg font-bold text-cyan-300 mb-2">{mol.name}<\/h3>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-slate-400">Formula<\/span><span className="text-white font-mono">{mol.formula}<\/span><\/div>
        <div className="flex justify-between"><span className="text-slate-400">Mol. Weight<\/span><span className="text-white font-mono">{mol.weight.toFixed(2)} g/mol<\/span><\/div>
        <div className="flex justify-between"><span className="text-slate-400">Atoms<\/span><span className="text-white font-mono">{mol.atoms.length}<\/span><\/div>
        <div className="flex justify-between"><span className="text-slate-400">Bonds<\/span><span className="text-white font-mono">{mol.bonds.length}<\/span><\/div>
        <div className="border-t border-slate-600/50 pt-2 mt-2">
          <span className="text-slate-400 text-xs">Composition<\/span>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(atomCounts).map(([el, count]) => {
              const color = ELEMENT_COLORS[el] || ELEMENT_COLORS.C;
              return (
                <span key={el} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: hexToRgba(color.fill, 0.3), color: color.glow, border: \`1px solid \${hexToRgba(color.glow, 0.3)}\` }}>
                  <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: color.fill }} />
                  {el}: {count}
                <\/span>
              );
            })}
          <\/div>
        <\/div>
      <\/div>

      {mode === 'polarity' && dipoleData && (
        <div className="border-t border-slate-600/50 pt-3 mt-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Electronegativity<\/h4>
          <div className="space-y-1 text-xs">
            {Object.entries(atomCounts).map(([el]) => (
              <div key={el} className="flex justify-between items-center">
                <span className="text-slate-300">{(ELEMENT_COLORS[el] && ELEMENT_COLORS[el].label) || el}<\/span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 rounded-full overflow-hidden bg-slate-700">
                    <div className="h-full rounded-full" style={{
                      width: \`\${((ELECTRONEGATIVITY[el]||2.5) / 4) * 100}%\`,
                      background: enToColor(el).fill
                    }} />
                  <\/div>
                  <span className="text-white font-mono w-8 text-right">{(ELECTRONEGATIVITY[el]||2.5).toFixed(2)}<\/span>
                <\/div>
              <\/div>
            ))}
            <div className="flex justify-between pt-2 border-t border-slate-700/50">
              <span className="text-slate-400">Net Dipole<\/span>
              <span className={\`font-bold \${dipoleData.polar ? 'text-cyan-300' : 'text-slate-500'}\`}>
                {dipoleData.polar ? 'Polar' : 'Nonpolar'}
              <\/span>
            <\/div>
          <\/div>
        <\/div>
      )}
    <\/div>
  );
}

function VSEPRPanel({ vsepData }) {
  if (!vsepData || vsepData.length === 0) return null;
  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-600/30 p-3 space-y-2">
      <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">VSEPR Analysis<\/h4>
      {vsepData.map(info => (
        <div key={info.idx} className="bg-slate-700/40 rounded-lg p-2 border border-slate-600/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-white">{info.el}<sub>{info.idx + 1}<\/sub><\/span>
            <span className="text-xs font-medium text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full">{info.geom}<\/span>
          <\/div>
          <div className="text-xs text-slate-400 space-y-0.5">
            <div>Bonding domains: {info.bonded.length} &nbsp;|&nbsp; Lone pairs: {info.lonePairs}<\/div>
            {info.angles.slice(0, 3).map((a, i) => (
              <div key={i} className="text-slate-500">
                \\u2220 {a.degrees.toFixed(1)}\\u00B0
              <\/div>
            ))}
          <\/div>
        <\/div>
      ))}
      <div className="text-xs text-purple-300/60 flex items-center gap-1 pt-1">
        <span className="inline-block w-2 h-2 rounded-full bg-purple-500/50" /> = lone pair (LP)
      <\/div>
    <\/div>
  );
}

function MeasurePanel({ measureAtoms, mol }) {
  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-600/30 p-3 space-y-2">
      <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Measurement Mode<\/h4>
      {measureAtoms.length === 0 && (
        <p className="text-xs text-slate-400">Click an atom to select it. Select 2 atoms for bond length, 3 for angle.<\/p>
      )}
      {measureAtoms.length === 1 && (
        <p className="text-xs text-slate-400">1 atom selected ({mol.atoms[measureAtoms[0]].el}<sub>{measureAtoms[0]+1}<\/sub>). Click another for distance.<\/p>
      )}
      {measureAtoms.length === 2 && (
        <div className="text-xs text-slate-300">
          <div className="font-medium text-cyan-300 mb-1">Bond Length<\/div>
          <div>{mol.atoms[measureAtoms[0]].el}<sub>{measureAtoms[0]+1}<\/sub> \\u2194 {mol.atoms[measureAtoms[1]].el}<sub>{measureAtoms[1]+1}<\/sub><\/div>
          <div className="text-lg font-bold text-white mt-1">
            {vec3len(vec3sub(mol.atoms[measureAtoms[1]], mol.atoms[measureAtoms[0]])).toFixed(3)} \\u00C5
          <\/div>
          <p className="text-slate-500 mt-1">Click a 3rd atom for angle measurement.<\/p>
        <\/div>
      )}
      {measureAtoms.length === 3 && (
        <div className="text-xs text-slate-300">
          <div className="font-medium text-cyan-300 mb-1">Bond Angle<\/div>
          <div>{mol.atoms[measureAtoms[0]].el}<sub>{measureAtoms[0]+1}<\/sub> \\u2013 {mol.atoms[measureAtoms[1]].el}<sub>{measureAtoms[1]+1}<\/sub> \\u2013 {mol.atoms[measureAtoms[2]].el}<sub>{measureAtoms[2]+1}<\/sub><\/div>
          <div className="text-lg font-bold text-white mt-1">
            {vec3angle(
              vec3sub(mol.atoms[measureAtoms[0]], mol.atoms[measureAtoms[1]]),
              vec3sub(mol.atoms[measureAtoms[2]], mol.atoms[measureAtoms[1]])
            ).toFixed(1)}\\u00B0
          <\/div>
        <\/div>
      )}
      {measureAtoms.length > 0 && (
        <p className="text-xs text-slate-500">Click empty space to clear.<\/p>
      )}
    <\/div>
  );
}

function ReactionPanel({ reaction, progress, playing, onPlay, onPause, onReset, onScrub }) {
  if (!reaction) return null;
  return (
    <div className="space-y-3">
      <div className="bg-slate-800/60 rounded-xl border border-slate-600/30 p-3">
        <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">Reaction Info<\/h4>
        <div className="text-sm font-bold text-white mb-1">{reaction.equation}<\/div>
        <div className="text-xs text-slate-400 space-y-1">
          <div><span className="text-slate-500">Type:<\/span> {reaction.type}<\/div>
          <div><span className="text-slate-500">\\u0394H:<\/span> <span className="text-red-400">{reaction.deltaH} kJ/mol<\/span><\/div>
          <div><span className="text-slate-500">E\\u2090:<\/span> <span className="text-amber-400">{reaction.activationEnergy} kJ/mol<\/span><\/div>
        <\/div>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{reaction.desc}<\/p>
      <\/div>

      <div className="bg-slate-800/60 rounded-xl border border-slate-600/30 p-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Playback<\/h4>
        <div className="flex items-center gap-2 mb-2">
          {!playing ? (
            <button onClick={onPlay} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30 transition-all">
              \\u25B6 Play
            <\/button>
          ) : (
            <button onClick={onPause} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 border border-amber-400/50 text-amber-300 hover:bg-amber-500/30 transition-all">
              \\u23F8 Pause
            <\/button>
          )}
          <button onClick={onReset} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/60 border border-slate-600/40 text-slate-300 hover:bg-slate-600/60 transition-all">
            \\u21A9 Reset
          <\/button>
          <span className="text-xs text-slate-500 ml-auto">{(progress * 100).toFixed(0)}%<\/span>
        <\/div>
        <input type="range" min="0" max="1" step="0.005" value={progress}
          onChange={e => onScrub(parseFloat(e.target.value))}
          className="w-full" />
      <\/div>

      <div className="bg-slate-800/60 rounded-xl border border-slate-600/30 p-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Energy Diagram<\/h4>
        <EnergyDiagram reaction={reaction} progress={progress} />
      <\/div>
    <\/div>
  );
}

// ==================== MAIN APP ====================
function App() {
  const canvasRef = useRef(null);
  const projectedRef = useRef([]);
  const [molKey, setMolKey] = useState('water');
  const [mode, setMode] = useState('view');
  const [showLabels, setShowLabels] = useState(true);
  const [showClouds, setShowClouds] = useState(false);
  const [autoSpin, setAutoSpin] = useState(true);
  const [zoom, setZoom] = useState(1);
  const rotRef = useRef({ x: -0.3, y: 0.4 });
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0, moved: false });
  const spinRef = useRef(0);
  const animRef = useRef(null);

  // Measurement state
  const [measureAtoms, setMeasureAtoms] = useState([]);

  // Reaction state
  const [reactKey, setReactKey] = useState('water_formation');
  const [reactProgress, setReactProgress] = useState(0);
  const [reactPlaying, setReactPlaying] = useState(false);
  const reactProgressRef = useRef(0);

  const mol = MOLECULES[molKey];
  const reaction = REACTIONS[reactKey];

  // Computed data
  const vsepData = useMemo(() => mode === 'vsepr' ? computeVSEPR(mol) : null, [mol, mode]);
  const dipoleData = useMemo(() => mode === 'polarity' ? computeDipole(mol) : null, [mol, mode]);

  // Clear measurements on mode/molecule change
  useEffect(() => { setMeasureAtoms([]); }, [molKey, mode]);

  // Canvas sizing
  const [size, setSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const update = () => {
      const panel = document.getElementById('canvas-container');
      if (panel) setSize({ w: panel.clientWidth, h: panel.clientHeight });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Mouse handlers
  const onPointerDown = useCallback(e => {
    dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY, moved: false };
  }, []);
  const onPointerMove = useCallback(e => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
    rotRef.current.y += dx * 0.008;
    rotRef.current.x += dy * 0.008;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
  }, []);
  const onPointerUp = useCallback(e => {
    const wasDrag = dragRef.current.moved;
    dragRef.current.dragging = false;

    // Click handler for measure mode
    if (!wasDrag && mode === 'measure' && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let nearest = null, nearestDist = Infinity;
      projectedRef.current.forEach(p => {
        const d = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
        if (d < 25 && d < nearestDist) { nearest = p; nearestDist = d; }
      });

      if (nearest) {
        setMeasureAtoms(prev => {
          if (prev.includes(nearest.idx)) return prev.filter(i => i !== nearest.idx);
          if (prev.length >= 3) return [nearest.idx];
          return [...prev, nearest.idx];
        });
      } else {
        setMeasureAtoms([]);
      }
    }
  }, [mode]);

  const onWheel = useCallback(e => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const frame = () => {
      if (mode !== 'react') {
        if (autoSpin && !dragRef.current.dragging) spinRef.current += 0.006;
        const rY = rotRef.current.y + spinRef.current;
        const rX = rotRef.current.x;
        const fov = 500 * zoom;

        renderMolecule(ctx, mol, rX, rY, zoom, size.w, size.h, {
          showLabels,
          showClouds: showClouds || mode === 'polarity',
          colorMode: mode === 'polarity' ? 'electronegativity' : 'element',
          projectedRef,
        });

        if (mode === 'vsepr') renderVSEPROverlay(ctx, mol, vsepData, projectedRef.current, fov, 8);
        if (mode === 'polarity') renderPolarityOverlay(ctx, mol, projectedRef.current, dipoleData, fov, 8, rX, rY, size.w, size.h);
        if (mode === 'measure') renderMeasurementOverlay(ctx, projectedRef.current, measureAtoms, mol);
      } else {
        // Reaction mode
        if (reactPlaying) {
          reactProgressRef.current = Math.min(1, reactProgressRef.current + 0.003);
          setReactProgress(reactProgressRef.current);
          if (reactProgressRef.current >= 1) setReactPlaying(false);
        }
        if (autoSpin && !dragRef.current.dragging) spinRef.current += 0.003;
        const rY = rotRef.current.y + spinRef.current;
        const rX = rotRef.current.x;
        renderReaction(ctx, reaction, reactProgressRef.current, rX, rY, zoom, size.w, size.h);
      }
      animRef.current = requestAnimationFrame(frame);
    };

    animRef.current = requestAnimationFrame(frame);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [mol, zoom, size, showLabels, showClouds, autoSpin, mode, vsepData, dipoleData, measureAtoms, reaction, reactPlaying]);

  const resetView = () => {
    rotRef.current = { x: -0.3, y: 0.4 };
    spinRef.current = 0;
    setZoom(1);
  };

  useEffect(() => { spinRef.current = 0; rotRef.current = { x: -0.3, y: 0.4 }; setZoom(1); }, [molKey]);
  useEffect(() => { reactProgressRef.current = 0; setReactProgress(0); setReactPlaying(false); }, [reactKey]);

  const cursorStyle = mode === 'measure' ? { cursor: 'crosshair' } : {};

  return (
    <div className="flex flex-col h-screen overflow-hidden select-none">
      {/* Header */}
      <div className="flex-none bg-slate-800/90 backdrop-blur border-b border-slate-700/60 px-4 py-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">\\uD83E\\uDDEC<\/span>
            <h1 className="text-lg font-extrabold text-white tracking-tight">3D Molecular Viewer<\/h1>
          <\/div>
          <div className="flex items-center gap-2 flex-wrap">
            <ModeTab id="view" label="View" icon="\\uD83D\\uDD2C" active={mode==='view'} onClick={setMode} />
            <ModeTab id="vsepr" label="VSEPR" icon="\\uD83D\\uDCD0" active={mode==='vsepr'} onClick={setMode} />
            <ModeTab id="polarity" label="Polarity" icon="\\u26A1" active={mode==='polarity'} onClick={setMode} />
            <ModeTab id="measure" label="Measure" icon="\\uD83D\\uDCCF" active={mode==='measure'} onClick={setMode} />
            <ModeTab id="react" label="Reactions" icon="\\u2697\\uFE0F" active={mode==='react'} onClick={setMode} />
          <\/div>
        <\/div>

        {/* Second row: selector + controls */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {mode !== 'react' ? (
            <select value={molKey} onChange={e => setMolKey(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-cyan-400 outline-none">
              {MOLECULE_KEYS.map(k => <option key={k} value={k}>{MOLECULES[k].name}<\/option>)}
            <\/select>
          ) : (
            <select value={reactKey} onChange={e => setReactKey(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-cyan-400 outline-none">
              {REACTION_KEYS.map(k => <option key={k} value={k}>{REACTIONS[k].name}<\/option>)}
            <\/select>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            {mode !== 'react' && (
              <>
                <button onClick={() => setShowLabels(!showLabels)}
                  className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border \${showLabels ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300' : 'bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60'}\`}>
                  {showLabels ? '\\u2713' : '\\u25CB'} Labels
                <\/button>
                {mode === 'view' && (
                  <button onClick={() => setShowClouds(!showClouds)}
                    className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border \${showClouds ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300' : 'bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60'}\`}>
                    {showClouds ? '\\u2713' : '\\u25CB'} Electron Clouds
                  <\/button>
                )}
              </>
            )}
            <button onClick={() => setAutoSpin(!autoSpin)}
              className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border \${autoSpin ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300' : 'bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60'}\`}>
              {autoSpin ? '\\u2713' : '\\u25CB'} Auto-Rotate
            <\/button>
            <button onClick={resetView}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/60 border border-slate-600/40 text-slate-300 hover:bg-slate-600/60 transition-all">
              Reset View
            <\/button>
          <\/div>
        <\/div>
      <\/div>

      {/* Main */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas */}
        <div id="canvas-container" className="flex-1 relative"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
          onWheel={onWheel} style={cursorStyle}>
          <canvas ref={canvasRef} width={size.w} height={size.h} style={{ width: size.w, height: size.h }} />
          <div className="absolute bottom-4 left-4 bg-slate-800/70 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-slate-400 border border-slate-700/50">
            Zoom: {(zoom * 100).toFixed(0)}% &nbsp;|&nbsp; Drag to rotate &nbsp;|&nbsp; Scroll to zoom
            {mode === 'measure' && ' | Click atoms to measure'}
          <\/div>
        <\/div>

        {/* Side panel */}
        <div className="flex-none w-[280px] bg-slate-900/80 border-l border-slate-700/50 p-4 flex flex-col gap-3 overflow-y-auto">
          {mode !== 'react' ? (
            <>
              <InfoPanel mol={mol} mode={mode} vsepData={vsepData} dipoleData={dipoleData} />
              {mode === 'vsepr' && <VSEPRPanel vsepData={vsepData} />}
              {mode === 'measure' && <MeasurePanel measureAtoms={measureAtoms} mol={mol} />}
              {mode === 'view' && (
                <>
                  <div className="bg-slate-800/60 rounded-xl border border-slate-600/30 p-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Element Legend<\/h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(ELEMENT_COLORS).slice(0, 6).map(([el, c]) => (
                        <div key={el} className="flex items-center gap-1.5 text-xs text-slate-300">
                          <span className="inline-block rounded-full shadow-md" style={{ width: 12, height: 12, background: c.fill, boxShadow: \`0 0 6px \${hexToRgba(c.glow, 0.5)}\` }} />
                          <span>{c.label}<\/span>
                        <\/div>
                      ))}
                    <\/div>
                  <\/div>
                  <div className="bg-slate-800/60 rounded-xl border border-slate-600/30 p-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bond Types<\/h4>
                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <svg width="30" height="10"><line x1="0" y1="5" x2="30" y2="5" stroke="#94a3b8" strokeWidth="2" /><\/svg>
                        <span>Single bond<\/span>
                      <\/div>
                      <div className="flex items-center gap-2">
                        <svg width="30" height="10">
                          <line x1="0" y1="3" x2="30" y2="3" stroke="#94a3b8" strokeWidth="1.5" />
                          <line x1="0" y1="7" x2="30" y2="7" stroke="#94a3b8" strokeWidth="1.5" />
                        <\/svg>
                        <span>Double bond<\/span>
                      <\/div>
                      <div className="flex items-center gap-2">
                        <svg width="30" height="10">
                          <line x1="0" y1="3" x2="30" y2="3" stroke="#94a3b8" strokeWidth="1.5" />
                          <line x1="0" y1="7" x2="30" y2="7" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
                        <\/svg>
                        <span>Aromatic<\/span>
                      <\/div>
                    <\/div>
                  <\/div>
                </>
              )}
              {mode === 'polarity' && (
                <div className="bg-slate-800/60 rounded-xl border border-slate-600/30 p-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Color Scale<\/h4>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span>Low EN<\/span>
                    <div className="flex-1 h-3 rounded-full" style={{ background: 'linear-gradient(to right, #3b82f6, #dcdcdc, #ef4444)' }} />
                    <span>High EN<\/span>
                  <\/div>
                  <div className="mt-2 text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400" /> \\u03B4+ (less electronegative)
                    <\/div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" /> \\u03B4\\u2212 (more electronegative)
                    <\/div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-0.5 bg-cyan-400" /> \\u03BC net dipole
                    <\/div>
                  <\/div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Try CO\\u2082 vs H\\u2082O: both have polar bonds, but CO\\u2082's cancel out (linear), while water's don't (bent).
                  <\/p>
                <\/div>
              )}
              {mode === 'vsepr' && (
                <div className="bg-slate-800/60 rounded-xl border border-slate-600/30 p-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Key Geometries<\/h4>
                  <div className="text-xs text-slate-400 space-y-1.5">
                    <div><span className="text-amber-300 font-medium">Linear<\/span> \\u2014 180\\u00B0, 2 domains (CO\\u2082)<\/div>
                    <div><span className="text-amber-300 font-medium">Trig. Planar<\/span> \\u2014 120\\u00B0, 3 domains<\/div>
                    <div><span className="text-amber-300 font-medium">Tetrahedral<\/span> \\u2014 109.5\\u00B0, 4 domains (CH\\u2084)<\/div>
                    <div><span className="text-amber-300 font-medium">Trig. Pyramidal<\/span> \\u2014 ~107\\u00B0, 3 bonds + 1 LP (NH\\u2083)<\/div>
                    <div><span className="text-amber-300 font-medium">Bent<\/span> \\u2014 ~104.5\\u00B0, 2 bonds + 2 LP (H\\u2082O)<\/div>
                  <\/div>
                  <p className="text-xs text-slate-500 mt-2">Lone pairs compress bond angles below ideal values.<\/p>
                <\/div>
              )}
            </>
          ) : (
            <ReactionPanel
              reaction={reaction}
              progress={reactProgress}
              playing={reactPlaying}
              onPlay={() => {
                if (reactProgressRef.current >= 1) { reactProgressRef.current = 0; setReactProgress(0); }
                setReactPlaying(true);
              }}
              onPause={() => setReactPlaying(false)}
              onReset={() => { reactProgressRef.current = 0; setReactProgress(0); setReactPlaying(false); }}
              onScrub={v => { reactProgressRef.current = v; setReactProgress(v); setReactPlaying(false); }}
            />
          )}
        <\/div>
      <\/div>
    <\/div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
<\/script>
<\/body>
<\/html>`;
