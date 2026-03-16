<template>
  <PlayLabView :job-id="$route.params.id as string" />
</template>

<script setup lang="ts">
import PlayLabView from '~/components/play-lab/PlayLabView.vue'
</script>
