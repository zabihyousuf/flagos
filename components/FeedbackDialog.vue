<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent
      class="sm:max-w-md glass"
      :show-close-button="!submitting"
      @pointer-down-outside="submitting ? $event.preventDefault() : null"
      @escape-key-down="submitting ? $event.preventDefault() : null"
    >
      <DialogHeader>
        <DialogTitle>Send Feedback</DialogTitle>
        <DialogDescription>
          Report a bug, request a feature, or share your thoughts on FlagOS.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4 py-4" @submit.prevent="handleSubmit">
        <div class="space-y-2">
          <Label>Type</Label>
          <div class="flex gap-2">
            <button
              v-for="opt in typeOptions"
              :key="opt.value"
              type="button"
              class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="form.type === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'"
              @click="form.type = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="feedback-content">{{ textareaLabel }}</Label>
          <Textarea
            id="feedback-content"
            v-model="form.content"
            :placeholder="textareaPlaceholder"
            :rows="4"
            :disabled="submitting"
            class="resize-none"
          />
        </div>

        <div class="space-y-2">
          <Label>Screenshots (optional)</Label>
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <input
                ref="fileInputRef"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                class="hidden"
                @change="onFileSelect"
              />
              <Button type="button" variant="outline" size="sm" :disabled="submitting" @click="fileInputRef?.click()">
                <ImagePlus class="w-4 h-4 mr-2" />
                Add images
              </Button>
              <span class="text-xs text-muted-foreground">
                PNG, JPG, GIF, WebP (max 5MB each)
              </span>
            </div>
            <div v-if="form.files.length > 0" class="flex flex-wrap gap-2">
              <div
                v-for="(file, i) in form.files"
                :key="i"
                class="relative group rounded-lg overflow-hidden border border-border bg-muted/30 w-20 h-20"
              >
                <img
                  :src="file.preview"
                  :alt="file.file.name"
                  class="w-full h-full object-cover"
                />
                <button
                  type="button"
                  class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  :disabled="submitting"
                  @click="removeFile(i)"
                >
                  <X class="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="submitting" @click="$emit('update:open', false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="!form.content.trim() || submitting">
            <Loader2 v-if="submitting" class="w-4 h-4 mr-2 animate-spin" />
            {{ submitting ? 'Sending...' : 'Send' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { ImagePlus, Loader2, X } from 'lucide-vue-next'

type FeedbackType = 'bug' | 'feature' | 'feedback'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'submitted': []
}>()

const client = useSupabaseDB()
const user = useSupabaseUser()

const submitting = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const typeOptions: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'feedback', label: 'Feedback' },
]

interface FileWithPreview {
  file: File
  preview: string
}

const form = reactive<{
  type: FeedbackType
  content: string
  files: FileWithPreview[]
}>({
  type: 'bug',
  content: '',
  files: [],
})

const textareaLabel = computed(() => {
  switch (form.type) {
    case 'bug': return 'Describe the bug'
    case 'feature': return 'Describe your request'
    case 'feedback': return 'Share your feedback'
  }
})

const textareaPlaceholder = computed(() => {
  switch (form.type) {
    case 'bug': return 'What happened? What were you trying to do?'
    case 'feature': return 'Describe the feature you want and how it would help you.'
    case 'feedback': return 'Share your thoughts or suggestions.'
  }
})

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

watch(() => form.files.length, (len) => {
  if (len > 5) {
    form.files = form.files.slice(0, 5)
  }
})

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''

  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_SIZE) continue
    if (form.files.length >= 5) break

    const preview = URL.createObjectURL(file)
    form.files.push({ file, preview })
  }
}

function removeFile(index: number) {
  const item = form.files[index]
  if (item?.preview) URL.revokeObjectURL(item.preview)
  form.files.splice(index, 1)
}

function resetForm() {
  form.type = 'bug'
  form.content = ''
  form.files.forEach((f) => URL.revokeObjectURL(f.preview))
  form.files = []
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) resetForm()
})

async function handleSubmit() {
  const content = form.content.trim()
  if (!content) return

  const uid = user.value?.id
  if (!uid) return

  submitting.value = true
  try {
    const entryId = crypto.randomUUID()
    const imageUrls: string[] = []

    const isBug = form.type === 'bug'
    const bucket = isBug ? 'bug-reports' : 'feature-requests'

    if (form.files.length > 0) {
      for (let i = 0; i < form.files.length; i++) {
        const f = form.files[i]
        const ext = f.file.name.split('.').pop() || 'png'
        const path = `${uid}/${entryId}/${i}.${ext}`
        const { error } = await client.storage.from(bucket).upload(path, f.file, {
          upsert: true,
        })
        if (!error) {
          const { data } = client.storage.from(bucket).getPublicUrl(path)
          imageUrls.push(data.publicUrl)
        }
      }
    }

    const pageUrl = typeof window !== 'undefined' ? window.location.href : null

    if (isBug) {
      const { error } = await client.from('bug_reports').insert({
        id: entryId,
        user_id: uid,
        description: content,
        image_urls: imageUrls,
        page_url: pageUrl,
      })
      if (error) throw error
    } else {
      const { error } = await client.from('feature_requests').insert({
        id: entryId,
        user_id: uid,
        type: form.type,
        content,
        image_urls: imageUrls,
        page_url: pageUrl,
      })
      if (error) throw error
    }

    resetForm()
    emit('update:open', false)
    emit('submitted')
  } catch (err) {
    console.error('Failed to submit feedback:', err)
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => {
  form.files.forEach((f) => URL.revokeObjectURL(f.preview))
})
</script>
