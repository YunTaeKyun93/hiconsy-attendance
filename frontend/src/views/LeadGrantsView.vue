<script setup lang="ts">
// 리드의 특별 연차 지급·취소 (DESIGN.md 14-3). 검사(본인 지급 금지, 일수, 취소 시 잔여 음수)는 서버가 한다.
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api, errorMessage } from '@/api/client'
import type { AnnualGrantView, BoardView } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useRefreshStore } from '@/stores/refresh'
import { kstDate, kstTime } from '@/utils/format'

const auth = useAuthStore()
const refresh = useRefreshStore()
const grants = ref<AnnualGrantView[]>([])
const members = ref<{ value: number; title: string }[]>([])

const form = reactive({ userId: null as number | null, days: 1, reason: '' })
const filled = computed(() => form.userId !== null && form.days >= 1 && form.days <= 5 && form.reason.trim() !== '')
const saving = ref(false)
const busy = ref<number | null>(null)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

async function load() {
  const [g, board] = await Promise.all([api<AnnualGrantView[]>('/annual-grants'), api<BoardView>('/board/today')])
  grants.value = g
  // 본인에게는 지급할 수 없으므로 목록에서 뺀다(서버도 거절).
  members.value = board.rows.filter((r) => r.userId !== auth.user?.id).map((r) => ({ value: r.userId, title: r.name }))
}

async function submit() {
  saving.value = true
  message.value = null
  try {
    const g = await api<AnnualGrantView>('/annual-grants', {
      method: 'POST',
      body: { userId: form.userId, days: Number(form.days), reason: form.reason },
    })
    message.value = { type: 'success', text: `${g.userName}님에게 특별 연차 ${g.days}일을 지급했습니다.` }
    form.reason = ''
    form.days = 1
  } catch (e) {
    message.value = { type: 'error', text: errorMessage(e) }
  } finally {
    saving.value = false
    await load()
  }
}

async function cancel(g: AnnualGrantView) {
  if (!confirm(`${g.userName}님의 특별 연차 ${g.days}일 지급을 취소할까요?`)) return
  busy.value = g.id
  message.value = null
  try {
    await api(`/annual-grants/${g.id}/cancel`, { method: 'POST' })
    message.value = { type: 'success', text: `${g.userName}님의 특별 연차 ${g.days}일 지급을 취소했습니다.` }
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
    <v-row>
      <v-col cols="12" md="4">
        <v-card title="특별 연차 지급">
          <v-card-text>
            <v-form @submit.prevent="submit">
              <v-select v-model="form.userId" :items="members" label="팀원" />
              <v-text-field v-model.number="form.days" type="number" min="1" max="5" label="일수 (1~5)" />
              <v-textarea v-model="form.reason" label="사유" rows="2" counter="500" maxlength="500" />
              <p class="text-caption text-medium-emphasis mb-3">
                지급 즉시 연차 잔여에 더해집니다. 만료 없음. 본인에게는 지급할 수 없습니다.
              </p>
              <v-btn type="submit" color="primary" block :loading="saving" :disabled="!filled">지급</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="8">
        <v-card title="지급 내역">
          <v-alert v-if="message" :type="message.type" density="compact" class="mx-4 mb-2">{{ message.text }}</v-alert>
          <v-table density="compact">
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
                <td>{{ g.days }}일</td>
                <td>{{ g.reason }}</td>
                <td class="text-no-wrap">
                  <v-chip v-if="g.status === 'ACTIVE'" color="success" size="small" label>지급</v-chip>
                  <template v-else>
                    <v-chip color="grey" size="small" label>취소</v-chip>
                    <span v-if="g.canceledAt" class="text-caption ml-1">
                      {{ kstDate(g.canceledAt) }} {{ kstTime(g.canceledAt) }}
                    </span>
                  </template>
                </td>
                <td>
                  <v-btn
                    v-if="g.status === 'ACTIVE'"
                    size="small"
                    variant="text"
                    color="error"
                    :loading="busy === g.id"
                    @click="cancel(g)"
                  >
                    취소
                  </v-btn>
                </td>
              </tr>
              <tr v-if="grants.length === 0">
                <td colspan="6" class="text-center text-medium-emphasis">지급 내역이 없습니다.</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
