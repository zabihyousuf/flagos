<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent
      class="sm:max-w-md glass"
      :show-close-button="!submitting"
      @pointer-down-outside="submitting ? $event.preventDefault() : null"
      @escape-key-down="submitting ? $event.preventDefault() : null"
    >
      <DialogHeader>
        <DialogTitle>Report a Bug</DialogTitle>
        <DialogDescription>
          Describe the issue you're experiencing. You can attach screenshots to help us fix it.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4 py-4" @submit.prevent="handleSubmit">
        <div class="space-y-2">
          <Label for="bug-description">Description</Label>
          <Textarea
            id="bug-description"
            v-model="form.description"
            placeholder="What happened? What were you trying to do?"
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
          <Button type="submit" :disabled="!form.description.trim() || submitting">
            <Loader2 v-if="submitting" class="w-4 h-4 mr-2 animate-spin" />
            {{ submitting ? 'Sending...' : 'Send Report' }}
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

interface FileWithPreview {
  file: File
  preview: string
}

const form = reactive<{
  description: string
  files: FileWithPreview[]
}>({
  description: '',
  files: [],
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
  form.description = ''
  form.files.forEach((f) => URL.revokeObjectURL(f.preview))
  form.files = []
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) resetForm()
})

async function handleSubmit() {
  const desc = form.description.trim()
  if (!desc) return

  const uid = user.value?.id
  if (!uid) return

  submitting.value = true
  try {
    const reportId = crypto.randomUUID()
    const imageUrls: string[] = []

    // Upload images to storage
    if (form.files.length > 0) {
      for (let i = 0; i < form.files.length; i++) {
        const f = form.files[i]
        const ext = f.file.name.split('.').pop() || 'png'
        const path = `${uid}/${reportId}/${i}.${ext}`
        const { error } = await client.storage.from('bug-reports').upload(path, f.file, {
          upsert: true,
        })
        if (!error) {
          const { data } = client.storage.from('bug-reports').getPublicUrl(path)
          imageUrls.push(data.publicUrl)
        }
      }
    }

    const pageUrl = typeof window !== 'undefined' ? window.location.href : null

    const { error } = await client.from('bug_reports').insert({
      id: reportId,
      user_id: uid,
      description: desc,
      image_urls: imageUrls,
      page_url: pageUrl,
    })

    if (error) throw error

    resetForm()
    emit('update:open', false)
    emit('submitted')
  } catch (err) {
    console.error('Failed to submit bug report:', err)
    // Could show toast
  } finally {
    submitting.value = false
  }
}

// Reset form when dialog closes
watch(
  () => {
    // We need to watch open prop - but we don't have it in scope easily. Use a different approach:
    return (emit as any)
  },
  () => {},
  { immediate: false }
)

// Expose reset on close - parent will control open
onBeforeUnmount(() => {
  form.files.forEach((f) => URL.revokeObjectURL(f.preview))
})
</script>
