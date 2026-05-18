/** Save callback cannot live in useState (Nuxt serializes state for SSR). */
const saveHandler = shallowRef<(() => void) | null>(null)

/** Shared chrome state between play designer page and canvas layout (mobile app bar save). */
export function usePlayDesignerChrome() {
  const active = useState('play-designer-chrome-active', () => false)
  const saveDisabled = useState('play-designer-save-disabled', () => true)
  const saveLabel = useState('play-designer-save-label', () => 'Save Play')

  function activate() {
    active.value = true
  }

  function deactivate() {
    active.value = false
    saveHandler.value = null
  }

  function setSave(options: { disabled: boolean; label: string; onSave: () => void }) {
    saveDisabled.value = options.disabled
    saveLabel.value = options.label
    saveHandler.value = options.onSave
  }

  function triggerSave() {
    saveHandler.value?.()
  }

  return {
    active,
    saveDisabled,
    saveLabel,
    activate,
    deactivate,
    setSave,
    triggerSave,
  }
}
