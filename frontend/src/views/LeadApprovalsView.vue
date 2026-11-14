<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api, errorMessage } from '@/api/client'
import type { RequestView } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import RequestDetail from '@/components/RequestDetail.vue'
import StatusChip from '@/components/StatusChip.vue'
import { useFeedbackStore } from '@/stores/feedback'
import { useRefreshStore } from '@/stores/refresh'
import { requestTypeChip } from '@/theme/status'
import { kstDate, withWeekday } from '@/utils/format'

const refresh = useRefreshStore()
const fb = useFeedbackStore()
const list = ref<RequestView[] | null>(null)
const busy = ref<number | null>(null)

async function load() {
  list.value = await api<RequestView[]>('/requests/pending')
}

const describe = (r: RequestView) => `${r.userName}님의 ${withWeekday(r.targetDate)} ${requestTypeChip(r.type).label}`

async function approve(r: RequestView) {
  busy.value = r.id
  try {
    await api(`/requests/${r.id}/approve`, { method: 'POST' })
    fb.notify(`${describe(r)}: 승인했습니다.`)
  } catch (e) {
    fb.notify(errorMessage(e), 'error')
  } finally {
    busy.value = null
    await load()
  }
}

// 반려: 사유 필수(서버도 검사한다)
const REJECT_MAX = 500
const rejecting = ref<RequestView | null>(null)
const rejectReason = ref('')
const rejectError = ref('')
const rejectOpen = computed({
  get: () => rejecting.value !== null,
  set: (v) => {
    if (!v) rejecting.value = null
  },
})
const rejectFilled = computed(() => rejectReason.value.trim() !== '')

function openReject(r: RequestView) {
  rejecting.value = r
  rejectReason.value = ''
  rejectError.value = ''
}

async function submitReject() {
  const r = rejecting.value
  if (!r || !rejectFilled.value) return
  busy.value = r.id
  rejectError.value = ''
  try {
    const reason = rejectReason.value.trim()
    await api(`/requests/${r.id}/reject`, { method: 'POST', body: { reason } })
    fb.notify(`${describe(r)}: 반려했습니다. (사유: ${reason})`)
    rejecting.value = null
    await load()
  } catch (e) {
    rejectError.value = errorMessage(e)
  } finally {
    busy.value = null
  }
}

onMounted(load)
watch(() => refresh.tick, load)
</script>

<template>
  <v-container class="py-6">
    <v-card>
      <v-card-title class="d-flex align-center ga-2">
        <v-icon icon="mdi-check-decagram-outline" size="20" />
        승인 대기
      </v-card-title>
      <v-card-subtitle>승인은 대상일 0시 전까지만 가능합니다. 대상일이 지난 신청은 반려만 할 수 있습니다.</v-card-subtitle>
      <v-progress-linear v-if="list === null" indeterminate color="primary" class="mt-2" />
      <EmptyState v-else-if="list.length === 0" icon="mdi-inbox-outline" text="대기 중인 신청이 없습니다." />
      <v-table v-else class="table-sticky-first mt-2">
        <thead>
          <tr>
            <th class="text-no-wrap">신청자</th>
            <th class="text-no-wrap">대상일</th>
            <th class="text-no-wrap">유형</th>
            <th class="text-no-wrap">상세</th>
            <th>사유</th>
            <th class="text-no-wrap">신청일</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td class="text-no-wrap">{{ r.userName }}</td>
            <td class="text-no-wrap">{{ withWeekday(r.targetDate) }}</td>
            <td class="text-no-wrap"><StatusChip v-bind="requestTypeChip(r.type)" /></td>
            <td class="text-no-wrap"><RequestDetail :request="r" /></td>
            <td class="reason-cell">
              <div class="ellipsis" :title="r.reason">{{ r.reason }}</div>
            </td>
            <td class="text-no-wrap">{{ kstDate(r.createdAt) }}</td>
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
                size="small"
                color="status-ok"
                variant="flat"
                class="mr-1"
                :disabled="!r.approvable"
                :title="r.approvable ? '' : '대상일이 지나 승인할 수 없습니다'"
                :loading="busy === r.id"
                @click="approve(r)"
              >
                승인
              </v-btn>
              <v-btn size="small" color="status-late" variant="tonal" :loading="busy === r.id" @click="openReject(r)">
                반려
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="rejectOpen" max-width="480">
      <v-card v-if="rejecting" title="신청 반려">
        <v-card-text>
          <p class="text-body-medium mb-4">{{ describe(rejecting) }} 신청을 반려합니다.</p>
          <v-textarea
            v-model="rejectReason"
            label="반려 사유 (필수)"
            placeholder="신청자에게 보입니다"
            rows="3"
            :counter="REJECT_MAX"
            :maxlength="REJECT_MAX"
            variant="outlined"
            autofocus
          />
          <v-alert v-if="rejectError" type="error" variant="tonal" density="compact">{{ rejectError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="rejectOpen = false">닫기</v-btn>
          <v-btn
            color="status-late"
            variant="flat"
            :disabled="!rejectFilled"
            :loading="busy === rejecting.id"
            @click="submitReject"
          >
            반려
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
/* 사유 칸은 남는 폭만 쓰고 한 줄로 줄인다. 마우스를 올리면 전체(title) */
.reason-cell {
  width: 100%;
  max-width: 0;
  min-width: 140px;
}
.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
