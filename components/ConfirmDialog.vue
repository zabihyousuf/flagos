<template>
  <AlertDialog :open="state.open" @update:open="onOpenChange">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ state.title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ state.description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click.prevent="handleCancel">Cancel</AlertDialogCancel>
        <AlertDialogAction
          :class="state.variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''"
          @click.capture.prevent="handleAction"
        >
          {{ state.actionLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'

const { state, handleAction, handleCancel } = useConfirm()

function onOpenChange(open: boolean) {
  state.open = open
  if (!open && state.resolve && !state.actionClicked) {
    state.resolve(false)
    state.resolve = null
  }
  if (!open) state.actionClicked = false
}
</script>
