<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { BoardView } from '@/api/types'
import FlagChips from '@/components/FlagChips.vue'
import StatusChip from '@/components/StatusChip.vue'
import { useRefreshStore } from '@/stores/refresh'
import { dayTypeChip, presenceChip } from '@/theme/status'
import { duration, kstTime, withWeekday } from '@/utils/format'

const refresh = useRefreshStore()
const board = ref<BoardView | null>(null)

async function load() {
  board.value = await api<BoardView>('/board/today')
}

onMounted(load)
watch(() => refresh.tick, load)
</script>

<template>
  <v-container class="py-6">
    <v-card>
      <v-card-title class="d-flex align-center ga-2">
        <v-icon icon="mdi-account-group-outline" size="20" />
        팀 보드 {{ board ? withWeekday(board.today) : '' }}
        <v-spacer />
        <v-btn icon="mdi-refresh" variant="text" title="새로고침" aria-label="새로고침" @click="load" />
      </v-card-title>
      <v-card-subtitle>승인된 신청만 반영합니다(대기 중인 신청은 표시하지 않음).</v-card-subtitle>
      <v-progress-linear v-if="!board" indeterminate color="primary" class="mt-2" />
      <v-table v-else class="table-sticky-first mt-2">
        <thead>
          <tr>
            <th class="text-no-wrap">이름</th>
            <th class="text-no-wrap">오늘</th>
            <th class="text-no-wrap">상태</th>
            <th class="text-no-wrap">출근</th>
            <th class="text-no-wrap">퇴근</th>
            <th class="text-no-wrap">근무시간</th>
            <th class="text-no-wrap">표시</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in board.rows" :key="row.userId">
            <td class="text-no-wrap font-weight-medium">{{ row.name }}</td>
            <td class="text-no-wrap"><StatusChip v-bind="dayTypeChip(row.dayType)" /></td>
            <td class="text-no-wrap">
              <StatusChip v-if="row.presence !== 'NONE'" v-bind="presenceChip(row.presence)" />
              <span v-else class="text-medium-emphasis">-</span>
            </td>
            <td>{{ kstTime(row.attendance?.checkInAt) }}</td>
            <td>{{ kstTime(row.attendance?.checkOutAt) }}</td>
            <td class="text-no-wrap">{{ duration(row.attendance?.workSeconds) }}</td>
            <td>
              <FlagChips
                :late="row.attendance?.late"
                :early="row.attendance?.earlyLeave"
                :manual="row.attendance?.checkOutSource === 'MANUAL'"
              />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>
