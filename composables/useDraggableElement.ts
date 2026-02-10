import { ref, onUnmounted } from 'vue'

export function useDraggableElement(initialPos = { x: 0, y: 0 }) {
  const position = ref(initialPos)
  const isDragging = ref(false)
  const offset = ref({ x: 0, y: 0 })

  function startDrag(e: MouseEvent) {
    // Only left click
    if (e.button !== 0) return
    
    e.preventDefault() // Prevent text selection
    isDragging.value = true
    offset.value = {
      x: e.clientX - position.value.x,
      y: e.clientY - position.value.y
    }
    
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  function onDrag(e: MouseEvent) {
    if (!isDragging.value) return
    position.value = {
      x: e.clientX - offset.value.x,
      y: e.clientY - offset.value.y
    }
  }

  function stopDrag() {
    isDragging.value = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
  })

  return {
    position,
    isDragging,
    startDrag
  }
}
