<template>
  <div class="whats-new-page">
    <div class="whats-new-header">
      <h1 class="text-2xl font-semibold tracking-tight font-display">What's New</h1>
      <p class="text-muted-foreground mt-1">What you can do in the first release of FlagOS.</p>
    </div>

    <article class="release-card">
      <ul class="release-notes">
        <li v-for="(item, i) in features" :key="i" class="release-note">
          {{ item }}
        </li>
      </ul>
    </article>
  </div>
</template>

<script setup lang="ts">
const features = [
  'Design offensive plays with formations and route drawing.',
  'Design defensive plays with coverage zones.',
  'Use the ghost defense overlay to view a defensive play on top of your offense.',
  'Configure field dimensions and first-down line in Settings.',
  'Manage teams, squad, and playbooks.',
  'Test plays with the play test simulation.',
  'Choose default play view (Fit/Full), play type (Offensive/Defensive), and ghost defense in Settings.',
  'Toggle player names on the field in Settings → General.',
]
</script>

<style scoped>
.whats-new-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 24px 48px;
}

.whats-new-header {
  margin-bottom: 32px;
}

.release-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px 24px;
}

.release-notes {
  margin: 0;
  padding-left: 1.25rem;
  list-style: disc;
}

.release-note {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-foreground);
  margin-bottom: 6px;
}

.release-note:last-child {
  margin-bottom: 0;
}
</style>
