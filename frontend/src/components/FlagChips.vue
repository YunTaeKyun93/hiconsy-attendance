<script setup lang="ts">
// 하루에 붙는 표시들(지각·조퇴·직접 입력·미기록·결근). 색은 theme/status.ts의 FLAG.
import { FLAG } from '@/theme/status'
import StatusChip from './StatusChip.vue'

defineProps<{
  late?: boolean | null
  early?: boolean | null
  manual?: boolean | null
  unrecorded?: boolean | null
  absent?: boolean | null
  size?: 'x-small' | 'small' | 'default' | 'large'
}>()
</script>

<template>
  <span class="d-inline-flex flex-wrap ga-1 align-center">
    <StatusChip v-if="absent" v-bind="FLAG.absent" :size="size ?? 'x-small'" />
    <StatusChip v-if="late" v-bind="FLAG.late" :size="size ?? 'x-small'" />
    <StatusChip v-if="early" v-bind="FLAG.early" :size="size ?? 'x-small'" />
    <StatusChip v-if="unrecorded" v-bind="FLAG.unrecorded" :size="size ?? 'x-small'" />
    <StatusChip v-if="manual" v-bind="FLAG.manual" :size="size ?? 'x-small'" />
  </span>
</template>
