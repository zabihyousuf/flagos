<template>
  <div class="whats-new-page">
    <div class="whats-new-header">
      <h1 class="text-2xl font-semibold tracking-tight font-display">What's New</h1>
      <p class="text-muted-foreground mt-1">Past updates and release notes for FlagOS.</p>
    </div>

    <div class="whats-new-list">
      <article
        v-for="release in releases"
        :key="release.version"
        class="release-card"
      >
        <div class="release-head">
          <span class="release-version">{{ release.version }}</span>
          <span class="release-date">{{ release.date }}</span>
        </div>
        <ul class="release-notes">
          <li v-for="(note, i) in release.notes" :key="i" class="release-note">
            {{ note }}
          </li>
        </ul>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
const releases = [
  {
    version: 'v0.2.0',
    date: 'February 2025',
    notes: [
      'General settings: default play view (Fit/Full), default starting play type (Offensive/Defensive), and ghost defense default.',
      'New "What\'s New" page for release notes and past updates.',
      'Player names on field can be toggled in Settings → General.',
      'Save & Confirm flow for General settings so changes apply when you choose.',
      'Ghost defense option is disabled and set to None when default play type is Defensive.',
    ],
  },
  {
    version: 'v0.1.0',
    date: 'January 2025',
    notes: [
      'Play designer with offensive and defensive formations.',
      'Route drawing and coverage zones for defense.',
      'Ghost defense overlay to view a defensive play on top of your offense.',
      'Field dimensions and first-down line configurable in Settings.',
      'Teams, squad, and playbooks.',
    ],
  },
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

.whats-new-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.release-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px 24px;
}

.release-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}

.release-version {
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-foreground);
}

.release-date {
  font-size: 0.8125rem;
  color: var(--color-muted-foreground);
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
