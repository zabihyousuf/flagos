export type DesignerPanel = 'canvas' | 'roster' | 'details'

const activePanel = ref<DesignerPanel>('canvas')

export function usePlayDesignerUI() {
  function setPanel(panel: DesignerPanel) {
    activePanel.value = panel
  }

  return { activePanel: readonly(activePanel), setPanel }
}
