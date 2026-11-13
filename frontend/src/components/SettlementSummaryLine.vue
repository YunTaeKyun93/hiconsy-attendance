<script setup lang="ts">
import type { SettlementBalance, SettlementSummary } from '@/api/types'
import { duration } from '@/utils/format'

defineProps<{ summary: SettlementSummary; balance: SettlementBalance }>()
</script>

<template>
  <div class="d-flex flex-wrap ga-4 text-body-medium">
    <span>근무일 <b>{{ summary.attendanceDays }}</b>일 · 근무 <b>{{ duration(summary.totalWorkSeconds) }}</b></span>
    <span>지각 <b>{{ summary.late }}</b> · 조퇴 <b>{{ summary.earlyLeave }}</b> · 결근 <b>{{ summary.absent }}</b></span>
    <span>미기록 <b>{{ summary.unrecorded }}</b> · 직접 입력 <b>{{ summary.manual }}</b></span>
    <span>연차 사용 <b>{{ summary.annual }}</b> · 재택 사용 <b>{{ summary.remote }}</b> · 반일 OFF 사용 <b>{{ summary.halfOff }}</b></span>
    <span>
      주말·공휴일 근무 <b>{{ summary.weekendWorkDays }}</b>일({{ duration(summary.weekendWorkSeconds) }}) · OFF 지급
      <b>{{ summary.offGranted }}</b>
    </span>
    <span>
      잔여({{ balance.asOf }} 기준) 연차 <b>{{ balance.annual }}</b> · 재택 <b>{{ balance.remote }}</b> · OFF
      <b>{{ balance.off }}</b>
    </span>
  </div>
</template>
