<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api, ApiError, errorMessage } from '@/api/client'
import type { BalanceView, MyAttendance } from '@/api/types'
import BalanceCard from '@/components/BalanceCard.vue'
import UnrecordedDialog from '@/components/UnrecordedDialog.vue'
import { useRefreshStore } from '@/stores/refresh'
import { duration, kstTime, withWeekday } from '@/utils/format'
import { DAY_TYPE_COLOR, DAY_TYPE_LABEL } from '@/utils/labels'

const refresh = useRefreshStore()
const mine = ref<MyAttendance | null>(null)
const balance = ref<BalanceView | null>(null)
const dialog = ref(false)
const busy = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const att = computed(() => mine.value?.attendance ?? null)
// 버튼 노출은 보조일 뿐, 가능 여부는 서버가 판정한다.
const workable = computed(() => mine.value && !['ANNUAL', 'NON_WORKDAY'].includes(mine.value.todayType))
const canCheckIn = computed(() => workable.value && !att.value)
const canCheckOut = computed(() => !!att.value && !att.value.checkOutAt)

async function load() {
  const [m, b] = await Promise.all([api<MyAttendance>('/attendance/me'), api<BalanceView>('/balances/me')])
  mine.value = m
  balance.value = b
  if (m.unrecorded.length > 0) dialog.value = true
}

async function act(path: 'check-in' | 'check-out') {
  busy.value = true
  message.value = null
  try {
    await api(`/attendance/${path}`, { method: 'POST' })
    message.value = { type: 'success', text: path === 'check-in' ? '출근을 등록했습니다.' : '퇴근을 등록했습니다.' }
  } catch (e) {
    message.value = { type: 'error', text: errorMessage(e) }
    if (e instanceof ApiError && e.code === 'UNRECORDED_CHECKOUT') dialog.value = true
  } finally {
    busy.value = false
    await load()
  }
}

async function onSaved() {
  await load()
  if (mine.value?.unrecorded.length === 0) {
    dialog.value = false
    message.value = { type: 'success', text: '퇴근 시각을 입력했습니다. 이제 출근할 수 있습니다.' }
  }
}

onMounted(load)
watch(() => refresh.tick, load)
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center ga-2">
            <span>오늘 {{ mine ? withWeekday(mine.today) : '' }}</span>
            <v-chip v-if="mine" :color="DAY_TYPE_COLOR[mine.todayType]" size="small" label>
              {{ DAY_TYPE_LABEL[mine.todayType] }}
            </v-chip>
          </v-card-title>
          <v-card-text v-if="mine">
            <v-table density="compact">
              <tbody>
                <tr>
                  <th>출근</th>
                  <td>
                    {{ kstTime(att?.checkInAt) }}
                    <v-chip v-if="att?.late" color="error" size="x-small" label class="ml-1">지각</v-chip>
                  </td>
                </tr>
                <tr>
                  <th>퇴근</th>
                  <td>
                    {{ kstTime(att?.checkOutAt) }}
                    <v-chip v-if="att?.checkOutSource === 'MANUAL'" size="x-small" label class="ml-1">직접 입력</v-chip>
                  </td>
                </tr>
                <tr>
                  <th>근무시간</th>
                  <td>
                    {{ duration(att?.workSeconds) }}
                    <v-chip v-if="att?.earlyLeave" color="warning" size="x-small" label class="ml-1">조퇴</v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <v-alert v-if="message" :type="message.type" density="compact" class="mt-3">{{ message.text }}</v-alert>
            <v-alert v-if="mine.unrecorded.length" type="warning" density="compact" class="mt-3">
              퇴근이 기록되지 않은 날이 {{ mine.unrecorded.length }}일 있습니다.
              <template #append>
                <v-btn size="small" variant="text" @click="dialog = true">입력</v-btn>
              </template>
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" variant="flat" :disabled="!canCheckIn" :loading="busy" @click="act('check-in')">출근</v-btn>
            <v-btn color="secondary" variant="flat" :disabled="!canCheckOut" :loading="busy" @click="act('check-out')">
              퇴근
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <BalanceCard :balance="balance" />
      </v-col>
    </v-row>
    <UnrecordedDialog v-if="mine" v-model="dialog" :items="mine.unrecorded" @saved="onSaved" />
  </v-container>
</template>
