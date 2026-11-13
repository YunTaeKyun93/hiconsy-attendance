<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api, errorMessage } from '@/api/client'
import type { IrregularRow } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import FlagChips from '@/components/FlagChips.vue'
import StatusChip from '@/components/StatusChip.vue'
import { useRefreshStore } from '@/stores/refresh'
import { dayTypeChip } from '@/theme/status'
import { duration, kstTime, withWeekday } from '@/utils/format'

const refresh = useRefreshStore()
/** 비우면 서버 기준 이번 달 */
const month = ref('')
const rows = ref<IrregularRow[] | null>(null)
const error = ref('')

async function load() {
  error.value = ''
  try {
    rows.value = await api<IrregularRow[]>(`/attendance/irregular${month.value ? `?month=${month.value}` : ''}`)
  } catch (e) {
    error.value = errorMessage(e)
    rows.value = []
  }
}

onMounted(load)
watch(() => refresh.tick, load)
watch(month, load)
</script>

<template>
  <v-container class="py-6">
    <v-card>
      <v-card-title class="d-flex align-center flex-wrap ga-4">
        <span class="d-inline-flex align-center ga-2">
          <v-icon icon="mdi-clock-alert-outline" size="20" />
          미기록·직접 입력
        </span>
        <v-spacer />
        <v-text-field
          v-model="month"
          type="month"
          label="월 (비우면 이번 달)"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          lang="ko"
          style="max-width: 240px"
        />
      </v-card-title>
      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mx-4">{{ error }}</v-alert>
      <v-progress-linear v-if="rows === null" indeterminate color="primary" />
      <EmptyState
        v-else-if="rows.length === 0"
        icon="mdi-check-circle-outline"
        :text="`${month || '이번 달'} 미기록·직접 입력 건이 없습니다.`"
      />
      <v-table v-else class="table-sticky-first">
        <thead>
          <tr>
            <th class="text-no-wrap">날짜</th>
            <th class="text-no-wrap">이름</th>
            <th class="text-no-wrap">구분</th>
            <th class="text-no-wrap">유형</th>
            <th class="text-no-wrap">출근</th>
            <th class="text-no-wrap">퇴근</th>
            <th class="text-no-wrap">근무시간</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="text-no-wrap">{{ withWeekday(r.workDate) }}</td>
            <td class="text-no-wrap">{{ r.name }}</td>
            <td><FlagChips :unrecorded="r.kind === 'UNRECORDED'" :manual="r.kind === 'MANUAL'" size="small" /></td>
            <td class="text-no-wrap"><StatusChip v-bind="dayTypeChip(r.dayType)" size="x-small" /></td>
            <td>{{ kstTime(r.checkInAt) }}</td>
            <td>{{ kstTime(r.checkOutAt) }}</td>
            <td class="text-no-wrap">
              {{ duration(r.workSeconds) }}
              <FlagChips :early="r.earlyLeave" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>
