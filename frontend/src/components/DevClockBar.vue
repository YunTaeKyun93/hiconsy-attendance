<script setup lang="ts">
// 개발 모드 시계·테스트 데이터 초기화 (DESIGN.md 13장). 서버가 /api/dev를 열어 둔 경우(개발 모드)에만 보인다.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api, ApiError, errorMessage } from '@/api/client'
import type { DevClockView } from '@/api/types'
import { useFeedbackStore } from '@/stores/feedback'
import { useRefreshStore } from '@/stores/refresh'
import { kstDate, kstTime, toTimeStr, withWeekday } from '@/utils/format'

const refresh = useRefreshStore()
const fb = useFeedbackStore()
const bar = ref<{ $el: HTMLElement } | null>(null)
let observer: ResizeObserver | undefined
const available = ref(false)
const expanded = ref(false)
const offsetMs = ref(0)
const error = ref('')

// 서버 시각을 받은 순간의 값과 브라우저 단조 시계로 화면에서 흐르게 한다(판정에는 쓰지 않음).
let syncedServerMs = 0
let syncedAt = 0
const displayMs = ref(0)
let timer: number | undefined

const date = ref('')
const time = ref('')

const display = computed(() => {
  if (!displayMs.value) return ''
  const iso = new Date(displayMs.value).toISOString()
  return `${withWeekday(kstDate(iso))} ${kstTime(iso)}`
})

function apply(view: DevClockView) {
  syncedServerMs = new Date(view.now).getTime()
  syncedAt = performance.now()
  displayMs.value = syncedServerMs
  offsetMs.value = view.offsetMs
}

function currentIso(): string {
  return new Date(syncedServerMs + (performance.now() - syncedAt)).toISOString()
}

async function load() {
  try {
    apply(await api<DevClockView>('/dev/clock'))
    available.value = true
  } catch (e) {
    // 운영 모드(404)나 IP 차단이면 숨긴다.
    if (e instanceof ApiError) available.value = false
  }
}

async function setTo(iso: string) {
  error.value = ''
  try {
    apply(await api<DevClockView>('/dev/clock', { method: 'PUT', body: { now: iso } }))
    refresh.bump()
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function reset() {
  apply(await api<DevClockView>('/dev/clock', { method: 'DELETE' }))
  refresh.bump()
}

/** 출퇴근·신청·특별 연차·이력을 비우고 시계를 실제 시각으로. 사용자·공휴일은 유지. */
async function resetData() {
  const ok = await fb.confirm({
    title: '테스트 데이터 초기화',
    text: '출퇴근·신청·특별 연차·이력을 모두 지우고 시계를 실제 시각으로 되돌립니다.\n사용자와 공휴일은 유지됩니다.',
    confirmText: '초기화',
    danger: true,
  })
  if (!ok) return
  error.value = ''
  try {
    apply(await api<DevClockView>('/dev/reset', { method: 'POST' }))
    refresh.bump()
    fb.notify('테스트 데이터를 초기화했습니다.')
  } catch (e) {
    error.value = errorMessage(e)
  }
}

function setInput() {
  if (!date.value || !time.value) return
  void setTo(`${date.value}T${toTimeStr(time.value)}+09:00`)
}

function shift(ms: number) {
  void setTo(new Date(new Date(currentIso()).getTime() + ms).toISOString())
}

/** 오늘(서버 기준 한국 날짜)의 특정 시각으로 */
function at(hhmmss: string) {
  void setTo(`${kstDate(currentIso())}T${hhmmss}+09:00`)
}

// 시계가 흐르므로 경계 정각 대신 여유를 둔다. 10:00:00 정각 경계는 단위 테스트로 검증한다.
// 09:59:30 = 정상 출근 확인, 10:00:30 = 지각 확인
const QUICK_TIMES = ['07:00:00', '09:59:30', '10:00:30', '16:00:00', '17:00:00']

const DAY = 86_400_000
const HOUR = 3_600_000

/** 막대 높이를 CSS 변수로 알려 본문 아래 여백을 맞춘다. */
function syncHeight() {
  const h = available.value && bar.value ? bar.value.$el.offsetHeight : 0
  document.documentElement.style.setProperty('--dev-bar-h', `${h}px`)
}

watch([available, expanded], () => void nextTick(syncHeight))

onMounted(async () => {
  await load()
  await nextTick()
  if (bar.value) {
    observer = new ResizeObserver(syncHeight)
    observer.observe(bar.value.$el)
  }
  syncHeight()
  timer = window.setInterval(() => {
    if (syncedAt) displayMs.value = syncedServerMs + (performance.now() - syncedAt)
  }, 1000)
})
onBeforeUnmount(() => {
  window.clearInterval(timer)
  observer?.disconnect()
})
</script>

<template>
  <v-footer v-if="available" ref="bar" color="grey-darken-4" class="dev-clock py-1" elevation="8">
    <div class="d-flex flex-wrap align-center ga-2 w-100">
      <v-chip size="small" color="amber" variant="flat" label>DEV 시계</v-chip>
      <span class="text-body-medium">서버 {{ display }}</span>
      <v-chip v-if="offsetMs !== 0" size="x-small" color="amber" variant="outlined">조작 중</v-chip>
      <v-spacer />
      <v-btn size="small" variant="text" :icon="expanded ? 'mdi-chevron-down' : 'mdi-chevron-up'" @click="expanded = !expanded" />
    </div>
    <div v-if="expanded" class="d-flex flex-wrap align-center ga-2 w-100 pt-2">
      <input v-model="date" type="date" class="dev-input" aria-label="날짜" />
      <input v-model="time" type="time" step="1" class="dev-input" aria-label="시각" />
      <v-btn size="small" color="amber" variant="flat" @click="setInput">적용</v-btn>
      <v-divider vertical />
      <v-btn size="small" variant="tonal" @click="shift(-DAY)">-1일</v-btn>
      <v-btn size="small" variant="tonal" @click="shift(DAY)">+1일</v-btn>
      <v-btn size="small" variant="tonal" @click="shift(HOUR)">+1시간</v-btn>
      <v-divider vertical />
      <v-btn v-for="t in QUICK_TIMES" :key="t" size="small" variant="tonal" @click="at(t)">
        {{ t }}
      </v-btn>
      <v-divider vertical />
      <v-btn size="small" variant="outlined" @click="reset">실제 시각으로</v-btn>
      <v-btn size="small" color="status-late" variant="flat" prepend-icon="mdi-delete-sweep" @click="resetData">
        테스트 데이터 초기화
      </v-btn>
      <span v-if="error" class="text-error text-body-medium">{{ error }}</span>
    </div>
  </v-footer>
</template>

<style scoped>
.dev-clock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1010;
  flex-direction: column;
  align-items: stretch;
}
.dev-input {
  background: white;
  color: black;
  border-radius: 4px;
  padding: 2px 6px;
}
</style>
