<script setup lang="ts">
import type { BalanceView } from '@/api/types'

defineProps<{ balance: BalanceView | null }>()

const GRANT_STATUS = { USABLE: '사용 가능', IN_USE: '사용 중', EXPIRED: '만료' } as const
const GRANT_COLOR = { USABLE: 'success', IN_USE: 'warning', EXPIRED: 'grey' } as const
</script>

<template>
  <v-card title="잔여">
    <v-card-text v-if="balance">
      <v-row>
        <v-col cols="12" sm="4">
          <div class="text-overline">연차</div>
          <div class="text-h5">{{ balance.annual.remaining }}일</div>
          <div class="text-caption text-medium-emphasis">
            적립 {{ balance.annual.accrued }} · 사용(대기 포함) {{ balance.annual.used }}
          </div>
        </v-col>
        <v-col cols="12" sm="4">
          <div class="text-overline">재택</div>
          <div v-for="r in balance.remote" :key="r.month">
            <span class="text-h6">{{ r.remaining }}회</span>
            <span class="text-caption text-medium-emphasis ml-1">{{ r.month }} (사용 {{ r.used }}/2)</span>
          </div>
        </v-col>
        <v-col cols="12" sm="4">
          <div class="text-overline">반일 OFF</div>
          <div class="text-h5">{{ balance.off.remaining }}회</div>
          <div v-for="g in balance.off.grants" :key="g.workDate" class="text-caption">
            {{ g.workDate }} 근무분 · {{ g.expiresOn }}까지
            <v-chip :color="GRANT_COLOR[g.status]" size="x-small" label>{{ GRANT_STATUS[g.status] }}</v-chip>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-text v-else><v-progress-linear indeterminate /></v-card-text>
  </v-card>
</template>
