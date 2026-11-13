<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api, errorMessage } from '@/api/client'
import type { BalanceView, RequestType, RequestView, SubmitRequestBody } from '@/api/types'
import BalanceCard from '@/components/BalanceCard.vue'
import RequestDetail from '@/components/RequestDetail.vue'
import { useRefreshStore } from '@/stores/refresh'
import { toTimeStr, withWeekday } from '@/utils/format'
import { REQUEST_STATUS_COLOR, REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL } from '@/utils/labels'

const refresh = useRefreshStore()
const list = ref<RequestView[]>([])
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
const typeItems = (Object.keys(REQUEST_TYPE_LABEL) as RequestType[]).map((value) => ({
  value,
  title: REQUEST_TYPE_LABEL[value],
}))

// 화면 검사는 빈 칸 정도만. 날짜·기한·잔여는 서버가 판정한다.
const filled = computed(
  () =>
    !!form.targetDate &&
    form.reason.trim() !== '' &&
    (!needsWindow.value || (!!form.allowedIp.trim() && !!form.startTime && !!form.endTime)),
)

const submitting = ref(false)
const result = ref<{ type: 'success' | 'error'; text: string } | null>(null)

async function load() {
  const [l, b] = await Promise.all([api<RequestView[]>('/requests/me'), api<BalanceView>('/balances/me')])
  list.value = l
  balance.value = b
}

async function submit() {
  submitting.value = true
  result.value = null
  const body: SubmitRequestBody = { type: form.type, targetDate: form.targetDate, reason: form.reason }
  if (needsWindow.value) {
    Object.assign(body, {
      allowedIp: form.allowedIp.trim(),
      startTime: toTimeStr(form.startTime),
      endTime: toTimeStr(form.endTime),
    })
  }
  try {
    const saved = await api<RequestView>('/requests', { method: 'POST', body })
    result.value = {
      type: 'success',
      text: `${REQUEST_TYPE_LABEL[saved.type]} ${saved.targetDate} 신청이 ${REQUEST_STATUS_LABEL[saved.status]} 상태로 접수되었습니다.`,
    }
    form.targetDate = ''
    form.reason = ''
  } catch (e) {
    result.value = { type: 'error', text: errorMessage(e) }
  } finally {
    submitting.value = false
    await load()
  }
}

const canceling = ref<number | null>(null)
async function cancel(r: RequestView) {
  if (!confirm(`${r.targetDate} ${REQUEST_TYPE_LABEL[r.type]} 신청을 취소할까요?`)) return
  canceling.value = r.id
  try {
    await api(`/requests/${r.id}/cancel`, { method: 'POST' })
  } catch (e) {
    alert(errorMessage(e))
  } finally {
    canceling.value = null
    await load()
  }
}

onMounted(load)
watch(() => refresh.tick, load)
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="5">
        <v-card title="신청서">
          <v-card-text>
            <v-form @submit.prevent="submit">
              <v-select v-model="form.type" :items="typeItems" label="유형" />
              <v-text-field v-model="form.targetDate" type="date" label="대상일" />
              <template v-if="needsWindow">
                <v-text-field v-model="form.allowedIp" label="접속 IP" placeholder="예: 192.168.0.5" />
                <div class="d-flex ga-2">
                  <v-text-field v-model="form.startTime" type="time" step="1" label="시작" />
                  <v-text-field v-model="form.endTime" type="time" step="1" label="종료" />
                </div>
              </template>
              <v-textarea v-model="form.reason" label="사유" rows="2" counter="500" maxlength="500" />
              <p class="text-caption text-medium-emphasis mb-3">
                신청 기한: 대상일 직전 영업일 17:00까지. 재택 신청은 승인 전엔 집에서 접속할 수 없으니 연구실에서 신청하세요.
              </p>
              <v-alert v-if="result" :type="result.type" density="compact" class="mb-3 pre-line">{{ result.text }}</v-alert>
              <v-btn type="submit" color="primary" block :loading="submitting" :disabled="!filled">신청</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="7">
        <BalanceCard :balance="balance" class="mb-4" />
        <v-card title="내 신청">
          <v-table density="compact">
            <thead>
              <tr>
                <th>대상일</th>
                <th>유형</th>
                <th>상태</th>
                <th>상세</th>
                <th>사유</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in list" :key="r.id">
                <td class="text-no-wrap">{{ withWeekday(r.targetDate) }}</td>
                <td class="text-no-wrap">{{ REQUEST_TYPE_LABEL[r.type] }}</td>
                <td>
                  <v-chip :color="REQUEST_STATUS_COLOR[r.status]" size="small" label>{{ REQUEST_STATUS_LABEL[r.status] }}</v-chip>
                </td>
                <td><RequestDetail :request="r" /></td>
                <td>{{ r.reason }}</td>
                <td>
                  <v-btn v-if="r.cancelable" size="small" variant="text" color="error" :loading="canceling === r.id" @click="cancel(r)">
                    취소
                  </v-btn>
                </td>
              </tr>
              <tr v-if="list.length === 0">
                <td colspan="6" class="text-center text-medium-emphasis">신청 내역이 없습니다.</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.pre-line {
  white-space: pre-line;
}
</style>
