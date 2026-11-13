<script setup lang="ts">
import type { RequestView } from '@/api/types'

defineProps<{ request: RequestView }>()
</script>

<template>
  <span v-if="request.allowedIp" class="text-body-small">
    {{ request.allowedIp }} · {{ request.startTime?.slice(0, 5) }}~{{ request.endTime?.slice(0, 5) }}
  </span>
  <span v-else-if="request.offGrantWorkDate" class="text-body-small">{{ request.offGrantWorkDate }} 근무분 사용</span>
  <span v-else class="text-body-small text-medium-emphasis">-</span>
</template>
