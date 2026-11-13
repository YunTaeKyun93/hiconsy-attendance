<script setup lang="ts">
import type { SettlementDetail } from '@/api/types'
import { duration, kstTime, withWeekday } from '@/utils/format'
import { DAY_TYPE_COLOR, DAY_TYPE_LABEL } from '@/utils/labels'
import SettlementSummaryLine from './SettlementSummaryLine.vue'

defineProps<{ detail: SettlementDetail }>()
</script>

<template>
  <v-card>
    <v-card-title>{{ detail.name }} · {{ detail.month }} 일별 상세</v-card-title>
    <v-card-text><SettlementSummaryLine :summary="detail.summary" :balance="detail.balance" /></v-card-text>
    <v-table density="compact">
      <thead>
        <tr>
          <th>날짜</th>
          <th>유형</th>
          <th>출근</th>
          <th>퇴근</th>
          <th>근무시간</th>
          <th>표시</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in detail.days" :key="d.date" :class="{ 'text-medium-emphasis': d.date > detail.today }">
          <td class="text-no-wrap">{{ withWeekday(d.date) }}</td>
          <td>
            <v-chip :color="DAY_TYPE_COLOR[d.dayType]" size="x-small" label>{{ DAY_TYPE_LABEL[d.dayType] }}</v-chip>
          </td>
          <td>{{ kstTime(d.checkInAt) }}</td>
          <td>{{ kstTime(d.checkOutAt) }}</td>
          <td>{{ duration(d.workSeconds) }}</td>
          <td class="text-no-wrap">
            <v-chip v-if="d.absent" color="error" size="x-small" label class="mr-1">결근</v-chip>
            <v-chip v-if="d.late" color="error" size="x-small" label class="mr-1">지각</v-chip>
            <v-chip v-if="d.earlyLeave" color="warning" size="x-small" label class="mr-1">조퇴</v-chip>
            <v-chip v-if="d.unrecorded" color="error" size="x-small" variant="outlined" label class="mr-1">미기록</v-chip>
            <v-chip v-if="d.manual" size="x-small" label>직접 입력</v-chip>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>
