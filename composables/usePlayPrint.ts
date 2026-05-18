/**
 * Print orchestration for play designer / shared play views.
 * Switches to full-field view, applies correct aspect ratio, then restores after print.
 */

export type PlayFieldDimensions = {
  field_length: number
  field_width: number
  endzone_size: number
}

export function computeFieldAspectRatio(settings: PlayFieldDimensions): number {
  const totalLength = settings.field_length + settings.endzone_size * 2
  return settings.field_width / totalLength
}

/** CSS aspect-ratio value matching useCanvasRenderer field layout */
export function fieldAspectRatioCss(settings: PlayFieldDimensions): string {
  const { field_width: w, field_length: len, endzone_size: ez } = settings
  return `${w} / ${len + ez * 2}`
}

/** Printable size in inches that preserves field aspect ratio within page bounds */
export function computePrintDimensions(
  settings: PlayFieldDimensions,
  opts?: { maxWidthIn?: number; maxHeightIn?: number },
) {
  const maxWidthIn = opts?.maxWidthIn ?? 7.5
  const maxHeightIn = opts?.maxHeightIn ?? 9
  const aspect = computeFieldAspectRatio(settings)
  let widthIn = maxWidthIn
  let heightIn = widthIn / aspect
  if (heightIn > maxHeightIn) {
    heightIn = maxHeightIn
    widthIn = heightIn * aspect
  }
  return { widthIn, heightIn }
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

export function usePlayPrint() {
  const isPrinting = ref(false)

  function applyPrintRootClass(playName?: string) {
    const root = document.documentElement
    root.classList.add('play-print-active')
    if (playName?.trim()) {
      root.dataset.playPrintTitle = playName.trim()
    }
  }

  function setPrintLayoutCss(settings: PlayFieldDimensions) {
    const { widthIn, heightIn } = computePrintDimensions(settings)
    const root = document.documentElement
    root.style.setProperty('--play-field-aspect-ratio', fieldAspectRatioCss(settings))
    root.style.setProperty('--play-print-width', `${widthIn}in`)
    root.style.setProperty('--play-print-height', `${heightIn}in`)
  }

  function clearPrintRootClass() {
    const root = document.documentElement
    root.classList.remove('play-print-active')
    delete root.dataset.playPrintTitle
    root.style.removeProperty('--play-field-aspect-ratio')
    root.style.removeProperty('--play-print-width')
    root.style.removeProperty('--play-print-height')
  }

  async function runPrint(options: {
    field: PlayFieldDimensions
    playName?: string
    getViewMode?: () => 'fit' | 'full'
    setViewMode?: (mode: 'fit' | 'full') => void
    onPrepare: () => void | Promise<void>
    onRestore?: () => void | Promise<void>
  }): Promise<void> {
    if (isPrinting.value) return
    isPrinting.value = true

    const savedViewMode = options.getViewMode?.() ?? null

    try {
      setPrintLayoutCss(options.field)
      applyPrintRootClass(options.playName)
      options.setViewMode?.('full')
      await options.onPrepare()
      await nextTick()
      await waitForPaint()

      await new Promise<void>((resolve) => {
        const onAfterPrint = () => {
          window.removeEventListener('afterprint', onAfterPrint)
          resolve()
        }
        window.addEventListener('afterprint', onAfterPrint)
        window.print()
      })
    } finally {
      if (savedViewMode != null) options.setViewMode?.(savedViewMode)
      clearPrintRootClass()
      await options.onRestore?.()
      isPrinting.value = false
    }
  }

  return {
    isPrinting,
    runPrint,
    computeFieldAspectRatio,
    fieldAspectRatioCss,
    computePrintDimensions,
  }
}
