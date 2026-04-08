/**
 * Course Map i18n string extraction.
 * Provides getCourseMapString() for retrieving localized strings with interpolation.
 * Extends the existing locale-context system rather than duplicating it.
 */

// ── English strings (primary) ───────────────────────────────────────────────

const en: Record<string, string> = {
  // Toolbar
  'toolbar.select': 'Select',
  'toolbar.connect': 'Connect',
  'toolbar.selectMode': 'Select mode',
  'toolbar.connectMode': 'Connect mode',
  'toolbar.saveSnapshot': 'Save Snapshot',
  'toolbar.snapshots': 'Snapshots',
  'toolbar.gapAnalysis': 'Gap Analysis',
  'toolbar.suggestEdges': 'Suggest Edges',
  'toolbar.export': 'Export',
  'toolbar.share': 'Share',

  // Panel headers
  'panel.nodeDetails': 'Node Details',
  'panel.gapAnalysis': 'Gap Analysis',
  'panel.edgeSuggestions': 'Edge Suggestions',
  'panel.exportSuite': 'Export Suite',
  'panel.reportingDashboard': 'Reporting Dashboard',
  'panel.teachingAssistant': 'AI Teaching Assistant',
  'panel.smartSuggestions': 'Smart Suggestions',

  // Status messages
  'status.loading': 'Loading course map...',
  'status.noAccess': "You don't have access to this course map.",
  'status.offline': "You're offline — edits are queued locally",
  'status.syncing': 'Syncing queued edits...',
  'status.synced': 'All queued edits synced successfully',
  'status.syncError': "Some edits failed to sync — they'll be retried next time you're online",

  // Accessibility
  'a11y.graphLabel': 'Course map graph. Use arrow keys to navigate between nodes.',
  'a11y.toolbarLabel': 'Course map toolbar',
  'a11y.skipToGraph': 'Skip to course map graph',
  'a11y.skipToToolbar': 'Skip to toolbar',
  'a11y.skipToPanel': 'Skip to active panel',
  'a11y.highContrastOn': 'High contrast mode enabled',
  'a11y.highContrastOff': 'High contrast mode disabled',
  'a11y.keyboardShortcuts': 'Keyboard Shortcuts',
  'a11y.closeDialog': 'Close dialog',
  'a11y.highContrastToggle': 'Toggle high contrast mode',
  'a11y.focusIndicator': 'Focus indicator',

  // Locale switcher
  'locale.label': 'Language',
  'locale.en': 'English',
  'locale.es': 'Español',

  // Navigation
  'nav.backToCourse': 'Back to course',
  'nav.title': 'Course Map',

  // Legend
  'legend.title': 'Legend',
  'legend.prerequisite': 'Prerequisite',
  'legend.sequence': 'Sequence',
  'legend.concurrent': 'Concurrent',

  // Nodes
  'nodes.noMap': 'No course map yet',
  'nodes.noMapStudent': "Your instructor hasn't uploaded a syllabus for this course yet.",
  'nodes.noMapEducator': 'Upload a syllabus to generate a prerequisite graph for your course.',
}

// ── Spanish strings (stub) ──────────────────────────────────────────────────

const es: Record<string, string> = {
  // Toolbar
  'toolbar.select': 'Seleccionar',
  'toolbar.connect': 'Conectar',
  'toolbar.selectMode': 'Modo selección',
  'toolbar.connectMode': 'Modo conexión',
  'toolbar.saveSnapshot': 'Guardar instantánea',
  'toolbar.snapshots': 'Instantáneas',
  'toolbar.gapAnalysis': 'Análisis de brechas',
  'toolbar.suggestEdges': 'Sugerir conexiones',
  'toolbar.export': 'Exportar',
  'toolbar.share': 'Compartir',

  // Panel headers
  'panel.nodeDetails': 'Detalles del nodo',
  'panel.gapAnalysis': 'Análisis de brechas',
  'panel.edgeSuggestions': 'Sugerencias de conexiones',
  'panel.exportSuite': 'Suite de exportación',
  'panel.reportingDashboard': 'Panel de informes',
  'panel.teachingAssistant': 'Asistente de enseñanza IA',
  'panel.smartSuggestions': 'Sugerencias inteligentes',

  // Status messages
  'status.loading': 'Cargando mapa del curso...',
  'status.noAccess': 'No tienes acceso a este mapa del curso.',
  'status.offline': 'Estás sin conexión — las ediciones se guardan localmente',
  'status.syncing': 'Sincronizando ediciones en cola...',
  'status.synced': 'Todas las ediciones en cola se sincronizaron exitosamente',
  'status.syncError': 'Algunas ediciones fallaron — se reintentarán cuando estés en línea',

  // Accessibility
  'a11y.graphLabel': 'Gráfico del mapa del curso. Usa las teclas de flecha para navegar entre nodos.',
  'a11y.toolbarLabel': 'Barra de herramientas del mapa del curso',
  'a11y.skipToGraph': 'Saltar al gráfico del mapa del curso',
  'a11y.skipToToolbar': 'Saltar a la barra de herramientas',
  'a11y.skipToPanel': 'Saltar al panel activo',
  'a11y.highContrastOn': 'Modo de alto contraste activado',
  'a11y.highContrastOff': 'Modo de alto contraste desactivado',
  'a11y.keyboardShortcuts': 'Atajos de teclado',
  'a11y.closeDialog': 'Cerrar diálogo',
  'a11y.highContrastToggle': 'Alternar modo de alto contraste',
  'a11y.focusIndicator': 'Indicador de enfoque',

  // Locale switcher
  'locale.label': 'Idioma',
  'locale.en': 'English',
  'locale.es': 'Español',

  // Navigation
  'nav.backToCourse': 'Volver al curso',
  'nav.title': 'Mapa del curso',

  // Legend
  'legend.title': 'Leyenda',
  'legend.prerequisite': 'Prerrequisito',
  'legend.sequence': 'Secuencia',
  'legend.concurrent': 'Concurrente',

  // Nodes
  'nodes.noMap': 'Aún no hay mapa del curso',
  'nodes.noMapStudent': 'Tu instructor aún no ha subido un programa para este curso.',
  'nodes.noMapEducator': 'Sube un programa para generar un gráfico de prerrequisitos para tu curso.',
}

// ── Catalog registry ────────────────────────────────────────────────────────

const catalogs: Record<string, Record<string, string>> = {
  en,
  'en-US': en,
  es,
  'es-ES': es,
}

/**
 * Get a localized course map string with optional interpolation.
 * Falls back to English, then to the raw key.
 *
 * Interpolation: {name} → params.name
 */
export function getCourseMapString(
  key: string,
  locale: string,
  interpolations?: Record<string, string | number>,
): string {
  const lang = locale.split('-')[0].toLowerCase()
  const catalog = catalogs[locale] || catalogs[lang] || catalogs['en']
  let str = catalog[key] || catalogs['en'][key] || key

  if (interpolations) {
    str = str.replace(/\{(\w+)\}/g, (_, varName) => {
      if (varName in interpolations) return String(interpolations[varName])
      return `{${varName}}`
    })
  }

  return str
}

/**
 * Get all available locale codes for the course map.
 */
export function getAvailableLocales(): { code: string; label: string }[] {
  return [
    { code: 'en-US', label: 'English' },
    { code: 'es', label: 'Español' },
  ]
}
