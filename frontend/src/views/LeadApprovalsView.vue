<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api, errorMessage } from '@/api/client'
import type { RequestView } from '@/api/types'
import RequestDetail from '@/components/RequestDetail.vue'
import { useRefreshStore } from '@/stores/refresh'
import { kstDate, withWeekday } from '@/utils/format'
import { REQUEST_TYPE_LABEL } from '@/utils/labels'

const refresh = useRefreshStore()
const list = ref<RequestView[]>([])
const busy = ref<number | null>(null)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

async function load() {
  list.value = await api<RequestView[]>('/requests/pending')
}

async function review(r: RequestView, action: 'approve' | 'reject') {
  if (action === 'reject' && !confirm(`${r.userName}님의 ${r.targetDate} ${REQUEST_TYPE_LABEL[r.type]} 신청을 반려할까요?`)) return
  busy.value = r.id
  message.value = null
  try {
    await api(`/requests/${r.id}/${action}`, { method: 'POST' })
    message.value = {
      type: 'success',
      text: `${r.userName} ${r.targetDate} ${REQUEST_TYPE_LABEL[r.type]}: ${action === 'approve' ? '승인' : '반려'}했습니다.`,
    }
  } catch (e) {
    message.value = { type: 'error', text: errorMessage(e) }
  } finally {
    busy.value = null
    await load()
  }
}

onMounted(load)
watch(() => refresh.tick, load)
</script>

<template>
  <v-container>
    <v-card title="승인 대기">
      <v-card-subtitle>승인은 대상일 0시 전까지만 가능합니다. 대상일이 지난 신청은 반려만 할 수 있습니다.</v-card-subtitle>
      <v-alert v-if="message" :type="message.type" density="compact" class="mx-4 mt-2">{{ message.text }}</v-alert>
      <v-table>
        <thead>
          <tr>
            <th>신청자</th>
            <th>대상일</th>
            <th>유형</th>
            <th>상세</th>
            <th>사유</th>
            <th>신청일</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td>{{ r.userName }}</td>
            <td class="text-no-wrap">{{ withWeekday(r.targetDate) }}</td>
            <td class="text-no-wrap">{{ REQUEST_TYPE_LABEL[r.type] }}</td>
            <td><RequestDetail :request="r" /></td>
            <td>{{ r.reason }}</td>
            <td class="text-no-wrap">{{ kstDate(r.createdAt) }}</td>
            <td class="text-no-wrap">
              <v-btn :href="`/api/requests/${r.id}/pdf`" size="small" variant="text" icon="mdi-file-pdf-box" title="신청서 PDF" />
              <v-btn
                size="small"
                color="success"
                variant="flat"
                class="mr-1"
                :disabled="!r.approvable"
                :title="r.approvable ? '' : '대상일이 지나 승인할 수 없습니다'"
                :loading="busy === r.id"
                @click="review(r, 'approve')"
              >
                승인
              </v-btn>
              <v-btn size="small" color="error" variant="tonal" :loading="busy === r.id" @click="review(r, 'reject')">
                반려
              </v-btn>
            </td>
          </tr>
          <tr v-if="list.length === 0">
            <td colspan="7" class="text-center text-medium-emphasis">대기 중인 신청이 없습니다.</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>
