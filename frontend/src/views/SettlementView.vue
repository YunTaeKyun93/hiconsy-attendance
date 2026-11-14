<script setup lang="ts">
// 월별 정산 (FR-STL-01). 팀원은 본인, 리드는 전원 요약 + 행을 누르면 일별 상세.
import { onMounted, ref, watch } from 'vue'
import { api, errorMessage } from '@/api/client'
import type { SettlementDetail, SettlementList } from '@/api/types'
import MonthField from '@/components/MonthField.vue'
import SettlementDetailCard from '@/components/SettlementDetailCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useRefreshStore } from '@/stores/refresh'
import { duration } from '@/utils/format'

const auth = useAuthStore()
const refresh = useRefreshStore()
/** 비우면 서버 기준 이번 달 */
const month = ref('')
const list = ref<SettlementList | null>(null)
const detail = ref<SettlementDetail | null>(null)
const selected = ref<number | null>(null)
const error = ref('')

const query = () => (month.value ? `?month=${month.value}` : '')

async function load() {
  error.value = ''
  try {
    if (auth.isLead) {
      list.value = await api<SettlementList>(`/settlements${query()}`)
      detail.value = selected.value === null ? null : await api<SettlementDetail>(`/settlements/${selected.value}${query()}`)
    } else {
      detail.value = await api<SettlementDetail>(`/settlements/me${query()}`)
    }
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function select(userId: number) {
  selected.value = selected.value === userId ? null : userId
  await load()
}

onMounted(load)
watch(() => refresh.tick, load)
watch(month, load)
</script>

<template>
  <v-container class="py-6">
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center flex-wrap ga-4">
        <span class="d-inline-flex align-center ga-2">
          <v-icon icon="mdi-table-clock" size="20" />
          월별 정산 {{ list?.month ?? detail?.month ?? '' }}
        </span>
        <v-spacer />
        <MonthField
          v-model="month"
          :current="list?.month ?? detail?.month"
          label="월 (비우면 이번 달)"
          density="compact"
          hide-details
          clearable
          variant="outlined"
          style="max-width: 240px"
        />
      </v-card-title>
      <v-card-subtitle>
        저장하지 않고 출퇴근 기록과 승인된 신청으로 계산합니다. 결근은 오늘 이전 날짜만 셉니다.
        잔여 기준일: {{ list?.rows[0]?.balance.asOf ?? detail?.balance.asOf ?? '-' }} (지난 달은 말일, 이번 달은 오늘)
      </v-card-subtitle>
      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="ma-4">{{ error }}</v-alert>

      <v-progress-linear v-if="auth.isLead ? !list : !detail" indeterminate color="primary" />
      <v-table v-if="auth.isLead && list" hover class="table-sticky-first">
        <thead>
          <tr>
            <th class="text-no-wrap">이름</th>
            <th class="text-no-wrap">근무일</th>
            <th class="text-no-wrap">근무시간</th>
            <th class="text-no-wrap">지각</th>
            <th class="text-no-wrap">조퇴</th>
            <th class="text-no-wrap">결근</th>
            <th class="text-no-wrap">미기록</th>
            <th class="text-no-wrap">직접 입력</th>
            <th class="text-no-wrap">연차 사용</th>
            <th class="text-no-wrap">재택 사용</th>
            <th class="text-no-wrap">반일 OFF 사용</th>
            <th class="text-no-wrap">주말 근무</th>
            <th class="text-no-wrap">OFF 지급</th>
            <th class="text-no-wrap">연차 잔여</th>
            <th class="text-no-wrap">재택 잔여</th>
            <th class="text-no-wrap">OFF 잔여</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in list.rows"
            :key="r.userId"
            class="cursor-pointer"
            :class="{ 'row-selected': selected === r.userId }"
            @click="select(r.userId)"
          >
            <td class="text-no-wrap">{{ r.name }}</td>
            <td>{{ r.summary.attendanceDays }}</td>
            <td class="text-no-wrap">{{ duration(r.summary.totalWorkSeconds) }}</td>
            <td>{{ r.summary.late }}</td>
            <td>{{ r.summary.earlyLeave }}</td>
            <td>{{ r.summary.absent }}</td>
            <td>{{ r.summary.unrecorded }}</td>
            <td>{{ r.summary.manual }}</td>
            <td>{{ r.summary.annual }}</td>
            <td>{{ r.summary.remote }}</td>
            <td>{{ r.summary.halfOff }}</td>
            <td class="text-no-wrap">{{ r.summary.weekendWorkDays }}일 ({{ duration(r.summary.weekendWorkSeconds) }})</td>
            <td>{{ r.summary.offGranted }}</td>
            <td>{{ r.balance.annual }}</td>
            <td>{{ r.balance.remote }}</td>
            <td>{{ r.balance.off }}</td>
          </tr>
        </tbody>
      </v-table>
      <v-card-text v-if="auth.isLead" class="text-body-small text-medium-emphasis">행을 누르면 일별 상세가 열립니다.</v-card-text>
    </v-card>

    <SettlementDetailCard v-if="detail" :detail="detail" />
  </v-container>
</template>
