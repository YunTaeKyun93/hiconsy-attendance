<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api, errorMessage } from '@/api/client'
import type { BalanceView, RequestType, RequestView, SubmitRequestBody } from '@/api/types'
import BalanceCard from '@/components/BalanceCard.vue'
import DateField from '@/components/DateField.vue'
import EmptyState from '@/components/EmptyState.vue'
import RequestDetail from '@/components/RequestDetail.vue'
import StatusChip from '@/components/StatusChip.vue'
import TimeField from '@/components/TimeField.vue'
import { useFeedbackStore } from '@/stores/feedback'
import { useRefreshStore } from '@/stores/refresh'
import { requestStatusChip, requestTypeChip } from '@/theme/status'
import { withWeekday } from '@/utils/format'

const refresh = useRefreshStore()
const fb = useFeedbackStore()
const list = ref<RequestView[] | null>(null)
const balance = ref<BalanceView | null>(null)

const form = reactive({
  type: 'ANNUAL' as RequestType,
  targetDate: '',
  reason: '',
  allowedIp: '',
  startTime: '09:00:00',
  endTime: '18:00:00',
})
const needsWindow = computed(() => form.type === 'REMOTE' || form.type === 'WEEKEND_WORK')
const typeItems = (['ANNUAL', 'REMOTE', 'OFF', 'WEEKEND_WORK'] as RequestType[]).map((value) => ({
  value,
  title: requestTypeChip(value).label,
}))
const QUICK_TIMES = ['09:00', '10:00', '18:00', '19:00']

// 화면 검사는 빈 칸 정도만. 날짜·기한·잔여는 서버가 판정한다.
const filled = computed(
  () =>
    !!form.targetDate &&
    form.reason.trim() !== '' &&
    (!needsWindow.value || (!!form.allowedIp.trim() && !!form.startTime && !!form.endTime)),
)

const submitting = ref(false)
const error = ref('')

async function load() {
  const [l, b] = await Promise.all([api<RequestView[]>('/requests/me'), api<BalanceView>('/balances/me')])
  list.value = l
  balance.value = b
}

async function submit() {
  submitting.value = true
  error.value = ''
  const body: SubmitRequestBody = { type: form.type, targetDate: form.targetDate, reason: form.reason }
  if (needsWindow.value) {
    Object.assign(body, {
      allowedIp: form.allowedIp.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
    })
  }
  try {
    const saved = await api<RequestView>('/requests', { method: 'POST', body })
    fb.notify(
      `${requestTypeChip(saved.type).label} ${saved.targetDate} 신청이 ${requestStatusChip(saved.status).label} 상태로 접수되었습니다.`,
    )
    form.targetDate = ''
    form.reason = ''
  } catch (e) {
    // 거절 사유(특히 OFF)는 여러 줄이라 폼 안에 남긴다.
    error.value = errorMessage(e)
  } finally {
    submitting.value = false
    await load()
  }
}

const canceling = ref<number | null>(null)
async function cancel(r: RequestView) {
  const ok = await fb.confirm({
    title: '신청 취소',
    text: `${withWeekday(r.targetDate)} ${requestTypeChip(r.type).label} 신청을 취소할까요?`,
    confirmText: '신청 취소',
    danger: true,
  })
  if (!ok) return
  canceling.value = r.id
  try {
    await api(`/requests/${r.id}/cancel`, { method: 'POST' })
    fb.notify('신청을 취소했습니다.')
  } catch (e) {
    fb.notify(errorMessage(e), 'error')
  } finally {
    canceling.value = null
    await load()
  }
}

onMounted(load)
watch(() => refresh.tick, load)
</script>

<template>
  <v-container class="py-6">
    <v-row>
      <v-col cols="12" lg="5">
        <v-card>
          <v-card-title class="d-flex align-center ga-2">
            <v-icon icon="mdi-file-document-edit-outline" size="20" />
            신청서
          </v-card-title>
          <v-card-text>
            <v-form @submit.prevent="submit">
              <v-select v-model="form.type" :items="typeItems" label="유형" variant="outlined" />
              <DateField v-model="form.targetDate" label="대상일" variant="outlined" />
              <template v-if="needsWindow">
                <v-text-field v-model="form.allowedIp" label="접속 IP" placeholder="예: 192.168.0.5" variant="outlined" />
                <div class="d-flex flex-wrap ga-2 time-pair">
                  <TimeField v-model="form.startTime" label="시작" variant="outlined" :quick="QUICK_TIMES" />
                  <TimeField v-model="form.endTime" label="종료" variant="outlined" :quick="QUICK_TIMES" />
                </div>
              </template>
              <v-textarea v-model="form.reason" label="사유" rows="2" counter="500" maxlength="500" variant="outlined" />
              <v-alert type="info" variant="tonal" density="compact" class="mb-3 text-body-small" icon="mdi-information-outline">
                신청 기한: 대상일 직전 영업일 17:00까지. 재택 신청은 승인 전엔 집에서 접속할 수 없으니 연구실에서 신청하세요.
              </v-alert>
              <v-expand-transition>
                <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3 pre-line">{{ error }}</v-alert>
              </v-expand-transition>
              <v-btn type="submit" color="primary" size="large" block :loading="submitting" :disabled="!filled">신청</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" lg="7">
        <BalanceCard :balance="balance" class="mb-4" />
        <v-card>
          <v-card-title class="d-flex align-center ga-2">
            <v-icon icon="mdi-format-list-bulleted" size="20" />
            내 신청
          </v-card-title>
          <v-progress-linear v-if="list === null" indeterminate color="primary" />
          <EmptyState
            v-else-if="list.length === 0"
            icon="mdi-file-document-outline"
            text="아직 신청 내역이 없습니다. 왼쪽 신청서에서 시작하세요."
          />
          <v-table v-else density="compact" class="table-sticky-first">
            <thead>
              <tr>
                <th class="text-no-wrap">대상일</th>
                <th class="text-no-wrap">유형</th>
                <th class="text-no-wrap">상태</th>
                <th class="text-no-wrap">상세</th>
                <th>사유</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in list" :key="r.id">
                <td class="text-no-wrap">{{ withWeekday(r.targetDate) }}</td>
                <td class="text-no-wrap"><StatusChip v-bind="requestTypeChip(r.type)" size="x-small" /></td>
                <td><StatusChip v-bind="requestStatusChip(r.status)" /></td>
                <td class="text-no-wrap"><RequestDetail :request="r" /></td>
                <td class="reason-cell">
                  <div class="ellipsis" :title="r.reason">{{ r.reason }}</div>
                  <div
                    v-if="r.status === 'REJECTED' && r.rejectReason"
                    class="ellipsis text-body-small text-status-late"
                    :title="`반려 사유: ${r.rejectReason}`"
                  >
                    반려 사유: {{ r.rejectReason }}
                  </div>
                </td>
                <td class="text-no-wrap">
                  <v-btn
                    :href="`/api/requests/${r.id}/pdf`"
                    size="small"
                    variant="text"
                    icon="mdi-file-pdf-box"
                    title="신청서 PDF"
                    aria-label="신청서 PDF"
                  />
                  <v-btn
                    v-if="r.cancelable"
                    size="small"
                    variant="text"
                    color="status-late"
                    :loading="canceling === r.id"
                    @click="cancel(r)"
                  >
                    취소
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.time-pair > * {
  flex: 1 1 180px;
}
/* 사유 칸은 남는 폭만 쓰고 한 줄로 줄인다. 마우스를 올리면 전체(title) */
.reason-cell {
  width: 100%;
  max-width: 0;
  min-width: 88px;
}
.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
