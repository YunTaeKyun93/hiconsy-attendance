<script setup lang="ts">
import type { SettlementDetail } from '@/api/types'
import { dayTypeChip } from '@/theme/status'
import { duration, kstTime, withWeekday } from '@/utils/format'
import FlagChips from './FlagChips.vue'
import SettlementSummaryLine from './SettlementSummaryLine.vue'
import StatusChip from './StatusChip.vue'

defineProps<{ detail: SettlementDetail }>()
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center ga-2">
      <v-icon icon="mdi-calendar-month-outline" size="20" />
      {{ detail.name }} · {{ detail.month }} 일별 상세
    </v-card-title>
    <v-card-text><SettlementSummaryLine :summary="detail.summary" :balance="detail.balance" /></v-card-text>
    <v-table density="compact" class="table-sticky-first">
      <thead>
        <tr>
          <th class="text-no-wrap">날짜</th>
          <th class="text-no-wrap">유형</th>
          <th class="text-no-wrap">출근</th>
          <th class="text-no-wrap">퇴근</th>
          <th class="text-no-wrap">근무시간</th>
          <th class="text-no-wrap">표시</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in detail.days" :key="d.date" :class="{ 'text-disabled': d.date > detail.today }">
          <td class="text-no-wrap">{{ withWeekday(d.date) }}</td>
          <td class="text-no-wrap"><StatusChip v-bind="dayTypeChip(d.dayType)" size="x-small" /></td>
          <td>{{ kstTime(d.checkInAt) }}</td>
          <td>{{ kstTime(d.checkOutAt) }}</td>
          <td class="text-no-wrap">{{ duration(d.workSeconds) }}</td>
          <td>
            <FlagChips :absent="d.absent" :late="d.late" :early="d.earlyLeave" :unrecorded="d.unrecorded" :manual="d.manual" />
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>
