<script setup lang="ts">
import type { BalanceView } from '@/api/types'
import type { ChipSpec } from '@/theme/status'
import { shortDate } from '@/utils/format'
import StatusChip from './StatusChip.vue'

defineProps<{ balance: BalanceView | null }>()

const GRANT: Record<'USABLE' | 'IN_USE' | 'EXPIRED', ChipSpec> = {
  USABLE: { label: '사용 가능', color: 'status-ok' },
  IN_USE: { label: '사용 중', color: 'day-weekend' },
  EXPIRED: { label: '만료', color: 'day-none' },
}
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center ga-2">
      <v-icon icon="mdi-wallet-outline" size="20" />
      잔여
    </v-card-title>
    <v-card-text v-if="balance">
      <div class="balance-grid">
        <div>
          <div class="text-label-medium text-medium-emphasis">연차</div>
          <div class="text-headline-small font-weight-bold" :class="'text-day-annual'">{{ balance.annual.remaining }}일</div>
          <div class="text-body-small text-medium-emphasis">
            적립 {{ balance.annual.accrued }}<template v-if="balance.annual.granted"> · 특별 지급 {{ balance.annual.granted }}</template>
            · 사용(대기 포함) {{ balance.annual.used }}
          </div>
        </div>
        <div>
          <div class="text-label-medium text-medium-emphasis">재택</div>
          <div v-for="r in balance.remote" :key="r.month" class="d-flex align-baseline ga-2">
            <span class="text-title-large font-weight-bold text-day-remote text-no-wrap">{{ r.remaining }}회</span>
            <span class="text-body-small text-medium-emphasis">{{ r.month }} (사용 {{ r.used }}/2)</span>
          </div>
        </div>
        <div>
          <div class="text-label-medium text-medium-emphasis">반일 OFF</div>
          <div class="text-headline-small font-weight-bold text-day-off">{{ balance.off.remaining }}회</div>
          <div v-if="balance.off.grants.length === 0" class="text-body-small text-medium-emphasis">보유한 OFF가 없습니다.</div>
          <div
            v-for="g in balance.off.grants"
            :key="g.workDate"
            class="text-body-small d-flex flex-wrap align-center ga-1 mt-1"
            :title="`${g.workDate} 근무분 · ${g.expiresOn}까지`"
          >
            <span class="text-no-wrap">{{ shortDate(g.workDate, balance.today) }} 근무분</span>
            <span>·</span>
            <span class="text-no-wrap">{{ shortDate(g.expiresOn, balance.today) }}까지</span>
            <StatusChip v-bind="GRANT[g.status]" size="x-small" />
          </div>
        </div>
      </div>
    </v-card-text>
    <v-card-text v-else><v-progress-linear indeterminate color="primary" /></v-card-text>
  </v-card>
</template>

<style scoped>
/* 카드 폭 기준으로 줄바꿈(좁은 칸에서도 숫자가 겹치지 않게) */
.balance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
</style>
