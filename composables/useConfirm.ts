interface ConfirmState {
  open: boolean
  title: string
  description: string
  actionLabel: string
  variant: 'destructive' | 'default'
  resolve: ((value: boolean) => void) | null
}

const state = reactive<ConfirmState>({
  open: false,
  title: '',
  description: '',
  actionLabel: 'Confirm',
  variant: 'destructive',
  resolve: null,
})

export function useConfirm() {
  function confirm(options: {
    title: string
    description: string
    actionLabel?: string
    variant?: 'destructive' | 'default'
  }): Promise<boolean> {
    return new Promise((resolve) => {
      state.title = options.title
      state.description = options.description
      state.actionLabel = options.actionLabel ?? 'Confirm'
      state.variant = options.variant ?? 'destructive'
      state.resolve = resolve
      state.open = true
    })
  }

  function handleAction() {
    state.open = false
    state.resolve?.(true)
    state.resolve = null
  }

  function handleCancel() {
    state.open = false
    state.resolve?.(false)
    state.resolve = null
  }

  return {
    state,
    confirm,
    handleAction,
    handleCancel,
  }
}
