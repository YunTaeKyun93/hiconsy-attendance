<script setup lang="ts">
defineProps<{ icon?: string; text: string }>()
</script>

<template>
  <div class="d-flex flex-column align-center justify-center text-medium-emphasis py-8 px-4 text-center">
    <v-icon :icon="icon ?? 'mdi-tray-remove'" size="40" class="mb-2 opacity-60" />
    <div class="text-body-medium">{{ text }}</div>
  </div>
</template>
