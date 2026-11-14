<script setup lang="ts">
import type { ChipSpec } from '@/theme/status'

withDefaults(defineProps<ChipSpec & { size?: 'x-small' | 'small' | 'default' | 'large' }>(), { size: 'small', outlined: false })
</script>

<template>
  <v-chip :color="color" :variant="outlined ? 'outlined' : 'tonal'" :size="size" class="font-weight-medium">
    {{ label }}
  </v-chip>
</template>
