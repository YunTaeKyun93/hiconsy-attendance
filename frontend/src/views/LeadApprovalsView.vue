<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
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

async function review(r: RequestView, action: 'approve' | 'reject') {
  const what = `${r.userName}님의 ${withWeekday(r.targetDate)} ${requestTypeChip(r.type).label}`
  if (action === 'reject') {
    const ok = await fb.confirm({ title: '신청 반려', text: `${what} 신청을 반려할까요?`, confirmText: '반려', danger: true })
    if (!ok) return
  }
  busy.value = r.id
  try {
    await api(`/requests/${r.id}/${action}`, { method: 'POST' })
    fb.notify(`${what}: ${action === 'approve' ? '승인' : '반려'}했습니다.`)
  } catch (e) {
    fb.notify(errorMessage(e), 'error')
  } finally {
    busy.value = null
    await load()
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
            <td>{{ r.reason }}</td>
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
                @click="review(r, 'approve')"
              >
                승인
              </v-btn>
              <v-btn size="small" color="status-late" variant="tonal" :loading="busy === r.id" @click="review(r, 'reject')">
                반려
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>
