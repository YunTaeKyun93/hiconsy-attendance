<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { BoardView } from '@/api/types'
import { useRefreshStore } from '@/stores/refresh'
import { duration, kstTime, withWeekday } from '@/utils/format'
import { DAY_TYPE_COLOR, DAY_TYPE_LABEL, PRESENCE_COLOR, PRESENCE_LABEL } from '@/utils/labels'

const refresh = useRefreshStore()
const board = ref<BoardView | null>(null)

async function load() {
  board.value = await api<BoardView>('/board/today')
}

onMounted(load)
watch(() => refresh.tick, load)
</script>

<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex align-center">
        팀 보드 {{ board ? withWeekday(board.today) : '' }}
        <v-spacer />
        <v-btn icon="mdi-refresh" variant="text" title="새로고침" @click="load" />
      </v-card-title>
      <v-card-subtitle>승인된 신청만 반영합니다(대기 중인 신청은 표시하지 않음).</v-card-subtitle>
      <v-table>
        <thead>
          <tr>
            <th>이름</th>
            <th>오늘</th>
            <th>상태</th>
            <th>출근</th>
            <th>퇴근</th>
            <th>근무시간</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in board?.rows ?? []" :key="row.userId">
            <td>{{ row.name }}</td>
            <td>
              <v-chip :color="DAY_TYPE_COLOR[row.dayType]" size="small" label>{{ DAY_TYPE_LABEL[row.dayType] }}</v-chip>
            </td>
            <td>
              <v-chip v-if="row.presence !== 'NONE'" :color="PRESENCE_COLOR[row.presence]" size="small" label>
                {{ PRESENCE_LABEL[row.presence] }}
              </v-chip>
            </td>
            <td>
              {{ kstTime(row.attendance?.checkInAt) }}
              <v-chip v-if="row.attendance?.late" color="error" size="x-small" label class="ml-1">지각</v-chip>
            </td>
            <td>
              {{ kstTime(row.attendance?.checkOutAt) }}
              <v-chip v-if="row.attendance?.checkOutSource === 'MANUAL'" size="x-small" label class="ml-1">직접 입력</v-chip>
            </td>
            <td>
              {{ duration(row.attendance?.workSeconds) }}
              <v-chip v-if="row.attendance?.earlyLeave" color="warning" size="x-small" label class="ml-1">조퇴</v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>
