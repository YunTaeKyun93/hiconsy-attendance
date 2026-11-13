<script setup lang="ts">
// 리드의 특별 연차 지급·취소 (DESIGN.md 14-3). 검사(본인 지급 금지, 일수, 취소 시 잔여 음수)는 서버가 한다.
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api, errorMessage } from '@/api/client'
import type { AnnualGrantView, BoardView } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import StatusChip from '@/components/StatusChip.vue'
import { useFeedbackStore } from '@/stores/feedback'
import { useAuthStore } from '@/stores/auth'
import { useRefreshStore } from '@/stores/refresh'
import { kstDate, kstTime } from '@/utils/format'

const auth = useAuthStore()
const refresh = useRefreshStore()
const fb = useFeedbackStore()
const grants = ref<AnnualGrantView[] | null>(null)
const members = ref<{ value: number; title: string }[]>([])

const form = reactive({ userId: null as number | null, days: 1, reason: '' })
const filled = computed(() => form.userId !== null && form.days >= 1 && form.days <= 5 && form.reason.trim() !== '')
const saving = ref(false)
const busy = ref<number | null>(null)

async function load() {
  const [g, board] = await Promise.all([api<AnnualGrantView[]>('/annual-grants'), api<BoardView>('/board/today')])
  grants.value = g
  // 본인에게는 지급할 수 없으므로 목록에서 뺀다(서버도 거절).
  members.value = board.rows.filter((r) => r.userId !== auth.user?.id).map((r) => ({ value: r.userId, title: r.name }))
}

async function submit() {
  saving.value = true
  try {
    const g = await api<AnnualGrantView>('/annual-grants', {
      method: 'POST',
      body: { userId: form.userId, days: Number(form.days), reason: form.reason },
    })
    fb.notify(`${g.userName}님에게 특별 연차 ${g.days}일을 지급했습니다.`)
    form.reason = ''
    form.days = 1
  } catch (e) {
    fb.notify(errorMessage(e), 'error')
  } finally {
    saving.value = false
    await load()
  }
}

async function cancel(g: AnnualGrantView) {
  const ok = await fb.confirm({
    title: '특별 연차 취소',
    text: `${g.userName}님의 특별 연차 ${g.days}일 지급을 취소할까요?`,
    confirmText: '지급 취소',
    danger: true,
  })
  if (!ok) return
  busy.value = g.id
  try {
    await api(`/annual-grants/${g.id}/cancel`, { method: 'POST' })
    fb.notify(`${g.userName}님의 특별 연차 ${g.days}일 지급을 취소했습니다.`)
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
    <v-row>
      <v-col cols="12" lg="4">
        <v-card>
          <v-card-title class="d-flex align-center ga-2">
            <v-icon icon="mdi-gift-outline" size="20" />
            특별 연차 지급
          </v-card-title>
          <v-card-text>
            <v-form @submit.prevent="submit">
              <v-select v-model="form.userId" :items="members" label="팀원" variant="outlined" />
              <v-text-field v-model.number="form.days" type="number" min="1" max="5" label="일수 (1~5)" variant="outlined" />
              <v-textarea v-model="form.reason" label="사유" rows="2" counter="500" maxlength="500" variant="outlined" />
              <v-alert type="info" variant="tonal" density="compact" class="mb-3 text-body-small" icon="mdi-information-outline">
                지급 즉시 연차 잔여에 더해집니다. 만료 없음. 본인에게는 지급할 수 없습니다.
              </v-alert>
              <v-btn type="submit" color="primary" size="large" block :loading="saving" :disabled="!filled">지급</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" lg="8">
        <v-card>
          <v-card-title class="d-flex align-center ga-2">
            <v-icon icon="mdi-history" size="20" />
            지급 내역
          </v-card-title>
          <v-progress-linear v-if="grants === null" indeterminate color="primary" />
          <EmptyState v-else-if="grants.length === 0" icon="mdi-gift-open-outline" text="지급 내역이 없습니다." />
          <v-table v-else density="compact" class="table-sticky-first">
            <thead>
              <tr>
                <th class="text-no-wrap">지급일</th>
                <th class="text-no-wrap">팀원</th>
                <th class="text-no-wrap">일수</th>
                <th>사유</th>
                <th class="text-no-wrap">상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in grants" :key="g.id">
                <td class="text-no-wrap">{{ kstDate(g.grantedAt) }}</td>
                <td class="text-no-wrap">{{ g.userName }}</td>
                <td class="text-no-wrap">{{ g.days }}일</td>
                <td>{{ g.reason }}</td>
                <td class="text-no-wrap">
                  <StatusChip v-if="g.status === 'ACTIVE'" label="지급" color="status-ok" />
                  <template v-else>
                    <StatusChip label="취소" color="day-none" />
                    <span v-if="g.canceledAt" class="text-body-small text-medium-emphasis ml-1">
                      {{ kstDate(g.canceledAt) }} {{ kstTime(g.canceledAt) }}
                    </span>
                  </template>
                </td>
                <td>
                  <v-btn
                    v-if="g.status === 'ACTIVE'"
                    size="small"
                    variant="text"
                    color="status-late"
                    :loading="busy === g.id"
                    @click="cancel(g)"
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
