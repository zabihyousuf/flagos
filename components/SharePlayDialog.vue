<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent
      class="sm:max-w-md glass"
      :show-close-button="!sharing"
      @pointer-down-outside="sharing ? $event.preventDefault() : null"
      @escape-key-down="sharing ? $event.preventDefault() : null"
    >
      <DialogHeader>
        <DialogTitle>Share Play</DialogTitle>
        <DialogDescription>
          Generate a public link anyone can use to view this play.
        </DialogDescription>
      </DialogHeader>

      <div class="py-4 space-y-4">
        <!-- Play info -->
        <div class="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <div
            class="w-8 h-8 rounded-md flex items-center justify-center"
            :class="play?.play_type === 'offense' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'"
          >
            <Swords v-if="play?.play_type === 'offense'" class="w-4 h-4" />
            <ShieldCheck v-else class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <p class="font-medium text-sm truncate">{{ play?.name }}</p>
            <p class="text-xs text-muted-foreground">
              {{ play?.play_type === 'offense' ? 'Offense' : 'Defense' }}
              <span v-if="play?.formation"> · {{ play.formation }}</span>
            </p>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="sharing" class="flex items-center justify-center py-6">
          <Loader2 class="w-5 h-5 animate-spin text-muted-foreground" />
          <span class="ml-2 text-sm text-muted-foreground">Generating share link...</span>
        </div>

        <!-- Share link generated -->
        <template v-else-if="shareUrl">
          <div class="space-y-2">
            <Label>Share link</Label>
            <div class="flex gap-2">
              <Input
                :model-value="shareUrl"
                readonly
                class="text-sm font-mono"
                @focus="($event.target as HTMLInputElement)?.select()"
              />
              <Button variant="outline" size="icon" class="shrink-0" @click="copyLink">
                <Check v-if="copied" class="w-4 h-4 text-green-500" />
                <Copy v-else class="w-4 h-4" />
              </Button>
            </div>
            <p v-if="copied" class="text-xs text-green-600 dark:text-green-400">Copied to clipboard!</p>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-border">
            <p class="text-xs text-muted-foreground">Anyone with this link can view this play.</p>
            <Button
              variant="ghost"
              size="sm"
              class="text-destructive hover:text-destructive h-7 text-xs"
              :disabled="revoking"
              @click="handleRevoke"
            >
              <Loader2 v-if="revoking" class="w-3 h-3 animate-spin mr-1" />
              <Unlink v-else class="w-3 h-3 mr-1" />
              Revoke
            </Button>
          </div>
        </template>

        <!-- Initial state: generate button -->
        <div v-else class="flex flex-col items-center py-4 gap-3">
          <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Share2 class="w-6 h-6 text-primary" />
          </div>
          <p class="text-sm text-muted-foreground text-center">
            Create a shareable link so anyone can view this play — no account needed.
          </p>
          <Button class="mt-1" @click="handleGenerate">
            <Link2 class="w-4 h-4 mr-2" />
            Generate Share Link
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import type { CanvasPlayer, Play } from '~/lib/types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Swords, ShieldCheck, Copy, Check, Loader2, Share2, Link2, Unlink } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  play: Play | null
  ghostPlayers?: CanvasPlayer[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { sharing, getOrCreateShareLink, revokeShareLink, hasActiveShare, buildShareUrl } = useSharePlay()

const shareUrl = ref('')
const copied = ref(false)
const revoking = ref(false)
let copyTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => props.open, async (isOpen) => {
  if (isOpen && props.play) {
    shareUrl.value = ''
    copied.value = false
    revoking.value = false
    const existingToken = await hasActiveShare(props.play.id)
    if (existingToken) {
      shareUrl.value = buildShareUrl(existingToken)
    }
  }
})

async function handleGenerate() {
  if (!props.play) return
  const result = await getOrCreateShareLink(props.play, { ghostPlayers: props.ghostPlayers })
  if (result) {
    shareUrl.value = buildShareUrl(result.token)
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    if (copyTimeout) clearTimeout(copyTimeout)
    copyTimeout = setTimeout(() => { copied.value = false }, 2500)
  } catch {
    // Fallback for older browsers
    const input = document.createElement('input')
    input.value = shareUrl.value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    copied.value = true
    if (copyTimeout) clearTimeout(copyTimeout)
    copyTimeout = setTimeout(() => { copied.value = false }, 2500)
  }
}

async function handleRevoke() {
  if (!props.play) return
  revoking.value = true
  const success = await revokeShareLink(props.play.id)
  if (success) {
    shareUrl.value = ''
  }
  revoking.value = false
}
</script>
