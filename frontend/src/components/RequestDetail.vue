<script setup lang="ts">
import type { RequestView } from '@/api/types'

defineProps<{ request: RequestView }>()
</script>

<template>
  <span v-if="request.allowedIp" class="text-caption">
    {{ request.allowedIp }} · {{ request.startTime?.slice(0, 5) }}~{{ request.endTime?.slice(0, 5) }}
  </span>
  <span v-else-if="request.offGrantWorkDate" class="text-caption">{{ request.offGrantWorkDate }} 근무분 사용</span>
  <span v-else class="text-caption text-medium-emphasis">-</span>
</template>
