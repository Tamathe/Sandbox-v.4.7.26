/**
 * Spanish string catalog for the Course Map page.
 * Stub: most keys fall back to en-US via locale-context.tsx.
 * Only override keys that have been translated.
 */
export const es: Record<string, string> = {
  // ── Toolbar ────────────────────────────────────────────────────────────
  'courseMap.toolbar.select': 'Seleccionar',
  'courseMap.toolbar.connect': 'Conectar',
  'courseMap.toolbar.selectMode': 'Modo selección',
  'courseMap.toolbar.connectMode': 'Modo conexión',
  'courseMap.toolbar.connectHintSource': 'Haz clic en un nodo fuente para comenzar a conectar',
  'courseMap.toolbar.connectHintTarget': 'Haz clic en un nodo destino para crear una conexión, o presiona Escape para cancelar',
  'courseMap.toolbar.saveSnapshot': 'Guardar instantánea',
  'courseMap.toolbar.snapshots': 'Instantáneas',
  'courseMap.toolbar.gapAnalysis': 'Análisis de brechas',
  'courseMap.toolbar.suggestEdges': 'Sugerir conexiones',

  // ── Export ─────────────────────────────────────────────────────────────
  'courseMap.export.title': 'Exportar',

  // ── Nodes ──────────────────────────────────────────────────────────────
  'courseMap.nodes.noMap': 'Aún no hay mapa del curso',
  'courseMap.nodes.noMapStudent': 'Tu instructor aún no ha subido un programa para este curso.',
  'courseMap.nodes.noMapEducator': 'Sube un programa para generar un gráfico de prerrequisitos para tu curso.',

  // ── Accessibility ──────────────────────────────────────────────────────
  'courseMap.a11y.graphLabel': 'Gráfico del mapa del curso. Usa las teclas de flecha para navegar entre nodos, Enter para abrir detalles, E para conectar, Escape para cancelar.',
  'courseMap.a11y.skipLink': 'Saltar al gráfico del mapa del curso',
  'courseMap.a11y.skipToToolbar': 'Saltar a la barra de herramientas',
  'courseMap.a11y.toolbarLabel': 'Barra de herramientas del mapa del curso',
  'courseMap.a11y.toastRegion': 'Notificaciones',
  'courseMap.a11y.highContrastToggle': 'Alternar modo de alto contraste',

  // ── Navigation ────────────────────────────────────────────────────────
  'courseMap.nav.backToCourse': 'Volver al curso',
  'courseMap.nav.title': 'Mapa del curso',
  'courseMap.nav.subtitleStudent': 'Tu progreso a través del curso',
  'courseMap.nav.subtitleEducator': 'Gráfico de prerrequisitos y secuencia de tu programa',

  // ── Status / offline ──────────────────────────────────────────────────
  'courseMap.status.offline': 'Estás sin conexión — las ediciones se guardan localmente',
  'courseMap.status.synced': 'Todas las ediciones en cola se sincronizaron exitosamente',
}
