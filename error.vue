<template>
  <div class="error-page">
    <div class="error-content">
      <NuxtLink to="/" class="error-logo font-copernicus font-bold text-xl tracking-tight text-foreground hover:opacity-80 transition-opacity">
        FlagOS
      </NuxtLink>
      <div class="error-icon" aria-hidden="true">
        <FileQuestion class="w-16 h-16" />
      </div>
      <h1 class="error-title font-display font-semibold">
        {{ statusCode === 404 ? 'Page not found' : 'Something went wrong' }}
      </h1>
      <p class="error-message text-muted-foreground">
        {{ statusCode === 404 ? 'The page you\'re looking for doesn\'t exist or has been moved.' : errorMessage }}
      </p>
      <Button as-child>
        <NuxtLink to="/">
          <Home class="w-4 h-4 mr-2" />
          Back to Dashboard
        </NuxtLink>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { FileQuestion, Home } from 'lucide-vue-next'

const props = defineProps<{
  error: { statusCode?: number; message?: string }
}>()

const statusCode = computed(() => props.error?.statusCode ?? 500)
const errorMessage = computed(() => props.error?.message ?? 'An unexpected error occurred.')

</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--color-background);
}

.error-content {
  max-width: 420px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.error-logo {
  margin-bottom: 0.5rem;
}

.error-icon {
  color: var(--color-muted-foreground);
  opacity: 0.6;
}

.error-title {
  font-size: 1.5rem;
  color: var(--color-foreground);
  margin: 0;
}

.error-message {
  font-size: 0.9375rem;
  line-height: 1.5;
  margin: 0;
}
</style>
