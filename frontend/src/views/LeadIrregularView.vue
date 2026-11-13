<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api, errorMessage } from '@/api/client'
import type { IrregularRow } from '@/api/types'
import { useRefreshStore } from '@/stores/refresh'
import { duration, kstTime, withWeekday } from '@/utils/format'
import { DAY_TYPE_LABEL } from '@/utils/labels'

const refresh = useRefreshStore()
/** 비우면 서버 기준 이번 달 */
const month = ref('')
const rows = ref<IrregularRow[]>([])
const error = ref('')

async function load() {
  error.value = ''
  try {
    rows.value = await api<IrregularRow[]>(`/attendance/irregular${month.value ? `?month=${month.value}` : ''}`)
  } catch (e) {
    error.value = errorMessage(e)
  }
}

onMounted(load)
watch(() => refresh.tick, load)
watch(month, load)
</script>

<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex align-center ga-4">
        미기록·직접 입력
        <v-spacer />
        <v-text-field
          v-model="month"
          type="month"
          label="월 (비우면 이번 달)"
          density="compact"
          hide-details
          clearable
          style="max-width: 240px"
        />
      </v-card-title>
      <v-alert v-if="error" type="error" density="compact" class="mx-4">{{ error }}</v-alert>
      <v-table>
        <thead>
          <tr>
            <th>날짜</th>
            <th>이름</th>
            <th>구분</th>
            <th>유형</th>
            <th>출근</th>
            <th>퇴근</th>
            <th>근무시간</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="text-no-wrap">{{ withWeekday(r.workDate) }}</td>
            <td>{{ r.name }}</td>
            <td>
              <v-chip :color="r.kind === 'UNRECORDED' ? 'error' : 'info'" size="small" label>
                {{ r.kind === 'UNRECORDED' ? '미기록' : '직접 입력' }}
              </v-chip>
            </td>
            <td>{{ DAY_TYPE_LABEL[r.dayType] }}</td>
            <td>{{ kstTime(r.checkInAt) }}</td>
            <td>{{ kstTime(r.checkOutAt) }}</td>
            <td>
              {{ duration(r.workSeconds) }}
              <v-chip v-if="r.earlyLeave" color="warning" size="x-small" label class="ml-1">조퇴</v-chip>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="7" class="text-center text-medium-emphasis">해당 월에 미기록·직접 입력 건이 없습니다.</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>
