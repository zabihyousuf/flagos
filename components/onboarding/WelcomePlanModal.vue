<template>
  <Dialog :open="open" @update:open="(v: boolean) => $emit('update:open', v)">
    <DialogContent
      full-screen
      class="!fixed !inset-0 !z-[200] !w-full !h-full !max-w-none !rounded-none !border-0 !translate-x-0 !translate-y-0 !top-0 !left-0 !right-0 !bottom-0 p-0 gap-0"
      :show-close-button="false"
    >
      <!-- Inner full-screen layer so we always cover viewport regardless of dialog lib -->
      <div class="fixed inset-0 z-[200] w-full h-full min-w-full min-h-full bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-6 sm:p-8">
      <div class="w-full max-w-5xl mx-auto">
        <!-- Step 1: pick a plan or skip -->
        <template v-if="step === 'subscribe'">
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
              <Sparkles class="w-7 h-7" />
            </div>
            <h1 class="text-2xl sm:text-3xl font-semibold font-display text-foreground mb-2">
              How do you want to use FlagLab?
            </h1>
            <p class="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
              Choose a plan to get started. You can always change or upgrade later.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2 max-w-4xl mx-auto">
            <!-- Pro card -->
            <div class="rounded-2xl border border-primary/30 bg-background/80 shadow-lg p-5 sm:p-6 flex flex-col justify-between">
              <div class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-primary">Recommended</p>
                <h2 class="text-lg font-semibold text-foreground">Pro</h2>
                <p class="text-sm text-muted-foreground">
                  Unlock Play Lab simulations, Blur AI insights, and advanced analysis tools.
                </p>
              </div>
              <div class="mt-5 flex flex-col gap-2">
                <Button size="lg" class="w-full" @click="onSubscribe">
                  Select Pro
                </Button>
                <p class="text-[11px] text-muted-foreground text-center">
                  Manage billing any time in Settings.
                </p>
              </div>
            </div>

            <!-- Free card -->
            <div class="rounded-2xl border border-border/70 bg-background/70 p-5 sm:p-6 flex flex-col justify-between">
              <div class="space-y-2">
                <h2 class="text-lg font-semibold text-foreground">Stay on Free</h2>
                <p class="text-sm text-muted-foreground">
                  Design plays and manage playbooks with core FlagLab features.
                </p>
              </div>
              <div class="mt-5 flex flex-col gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  class="w-full"
                  @click="step = 'trial'"
                >
                  Skip for now
                </Button>
                <p class="text-[11px] text-muted-foreground text-center">
                  We’ll show you an optional free trial next.
                </p>
              </div>
            </div>
          </div>
        </template>

        <!-- Step 2: offer free trial after skipping -->
        <template v-else>
          <div class="max-w-xl mx-auto text-center">
            <div class="flex justify-center mb-5">
              <div class="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Zap class="w-7 h-7" />
              </div>
            </div>
            <h1 class="text-2xl sm:text-3xl font-semibold font-display text-foreground mb-2">
              Want to try Pro free for 3 days?
            </h1>
            <p class="text-muted-foreground text-sm sm:text-base mb-6 max-w-lg mx-auto leading-relaxed">
              No credit card required. Get full access to Play Lab simulations and Blur AI insights, then decide if you want to keep it.
            </p>
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                class="min-w-[180px] bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white border-0"
                @click="onStartTrial"
              >
                Start free trial
              </Button>
              <Button
                variant="ghost"
                size="lg"
                class="min-w-[180px] text-muted-foreground"
                @click="onNoThanks"
              >
                Keep Free plan
              </Button>
            </div>
          </div>
        </template>
      </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent } from '@/components/ui/dialog'
import Button from '@/components/ui/button/Button.vue'
import { Sparkles, Zap } from 'lucide-vue-next'
import { ref } from 'vue'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  subscribe: []
  startTrial: []
  dismiss: []
}>()

const step = ref<'subscribe' | 'trial'>('subscribe')

function onSubscribe() {
  emit('subscribe')
}

function onStartTrial() {
  emit('startTrial')
}

function onNoThanks() {
  emit('dismiss')
}
</script>
