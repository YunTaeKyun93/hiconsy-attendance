<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api, ApiError, errorMessage } from '@/api/client'
import type { BalanceView, MyAttendance } from '@/api/types'
import BalanceCard from '@/components/BalanceCard.vue'
import FlagChips from '@/components/FlagChips.vue'
import StatusChip from '@/components/StatusChip.vue'
import UnrecordedDialog from '@/components/UnrecordedDialog.vue'
import { useFeedbackStore } from '@/stores/feedback'
import { useRefreshStore } from '@/stores/refresh'
import { dayTypeChip, FLAG, type StatusColor } from '@/theme/status'
import { duration, kstTime, withWeekday } from '@/utils/format'

const refresh = useRefreshStore()
const fb = useFeedbackStore()
const mine = ref<MyAttendance | null>(null)
const balance = ref<BalanceView | null>(null)
const dialog = ref(false)
const busy = ref(false)

const att = computed(() => mine.value?.attendance ?? null)

/** 오늘 상태 표시. 버튼은 지금 누를 수 있는 것 하나만 보여준다(가능 여부 판정은 서버). */
const hero = computed(
  (): {
    title: string
    color: StatusColor
    icon: string
    action: 'check-in' | 'check-out' | null
    note: string
  } | null => {
    const m = mine.value
    if (!m) return null
    if (m.todayType === 'ANNUAL') {
      return {
        title: '오늘은 연차입니다',
        color: 'day-annual',
        icon: 'mdi-beach',
        action: null,
        note: '연차일에는 출근할 수 없습니다.',
      }
    }
    if (m.todayType === 'NON_WORKDAY') {
      return {
        title: '오늘은 휴무일입니다',
        color: 'day-none',
        icon: 'mdi-weather-night',
        action: null,
        note: '주말·공휴일에는 승인된 주말·공휴일 근무 신청이 있어야 출근할 수 있습니다.',
      }
    }
    if (!att.value) {
      return { title: '아직 출근 전입니다', color: 'status-late', icon: 'mdi-login', action: 'check-in', note: '' }
    }
    if (!att.value.checkOutAt) {
      return { title: '근무 중', color: 'status-ok', icon: 'mdi-briefcase-clock-outline', action: 'check-out', note: '' }
    }
    return { title: '오늘 근무를 마쳤습니다', color: 'day-work', icon: 'mdi-check-circle-outline', action: null, note: '' }
  },
)

/** 카드 맨 위 색 줄: 출근 기록이 있으면 그날 판정 색(지각 > 조퇴 > 정상), 없으면 상태 색 그대로 */
const bandColor = computed((): StatusColor => {
  if (!att.value) return hero.value?.color ?? 'day-none'
  if (att.value.late) return FLAG.late.color
  if (att.value.earlyLeave) return FLAG.early.color
  return FLAG.ok.color
})

async function load() {
  const [m, b] = await Promise.all([api<MyAttendance>('/attendance/me'), api<BalanceView>('/balances/me')])
  mine.value = m
  balance.value = b
  if (m.unrecorded.length > 0) dialog.value = true
}

async function act(path: 'check-in' | 'check-out') {
  busy.value = true
  try {
    await api(`/attendance/${path}`, { method: 'POST' })
    fb.notify(path === 'check-in' ? '출근을 등록했습니다.' : '퇴근을 등록했습니다.')
  } catch (e) {
    fb.notify(errorMessage(e), 'error')
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
    fb.notify('퇴근 시각을 입력했습니다. 이제 출근할 수 있습니다.')
  }
}

onMounted(load)
watch(() => refresh.tick, load)
</script>

<template>
  <v-container class="py-6 home">
    <v-progress-linear v-if="!mine" indeterminate color="primary" class="mb-4" />

    <template v-if="mine && hero">
      <v-alert
        v-if="mine.unrecorded.length"
        color="status-unrecorded"
        variant="tonal"
        border="start"
        class="mb-4"
        icon="mdi-clock-alert-outline"
      >
        퇴근이 기록되지 않은 날이 {{ mine.unrecorded.length }}일 있습니다. 퇴근 시각을 입력해야 출근할 수 있습니다.
        <template #append>
          <v-btn size="small" variant="flat" color="status-unrecorded" @click="dialog = true">입력하기</v-btn>
        </template>
      </v-alert>

      <!-- 넓은 화면(1280px 이상)은 오늘 카드와 잔여 카드를 좌우로, 좁으면 위아래 -->
      <div class="home-cards">
        <!-- 오늘 카드: 상태와 버튼을 가장 크게 -->
        <v-card class="overflow-hidden">
          <div class="hero-band" :class="`bg-${bandColor}`" />
          <v-card-text class="pa-6">
            <div class="d-flex align-center flex-wrap ga-2 mb-4 text-medium-emphasis">
              <v-icon icon="mdi-calendar-today" size="18" />
              <span class="text-body-large">{{ withWeekday(mine.today) }}</span>
              <StatusChip v-bind="dayTypeChip(mine.todayType)" />
            </div>

            <div class="d-flex flex-column flex-md-row align-md-center ga-6">
              <div class="flex-grow-1">
                <div class="d-flex align-center ga-3">
                  <v-icon :icon="hero.icon" :color="hero.color" size="40" />
                  <div class="text-display-small font-weight-bold">{{ hero.title }}</div>
                </div>
                <div
                  v-if="hero.action === 'check-out' && mine.normalCheckOutFrom"
                  class="d-flex align-center ga-2 mt-3 text-title-medium"
                >
                  <v-icon icon="mdi-clock-check-outline" color="status-ok" size="20" />
                  <span>
                    정상 퇴근 가능 <strong>{{ kstTime(mine.normalCheckOutFrom) }}</strong> 이후
                  </span>
                </div>
                <div v-if="att" class="d-flex align-center flex-wrap ga-2 mt-3">
                  <FlagChips :late="att.late" :early="att.earlyLeave" :manual="att.checkOutSource === 'MANUAL'" size="large" />
                </div>
                <p v-if="hero.note" class="text-body-medium text-medium-emphasis mt-3 mb-0">{{ hero.note }}</p>
              </div>

              <v-btn
                v-if="hero.action"
                :color="hero.action === 'check-in' ? 'primary' : 'secondary'"
                size="x-large"
                min-width="220"
                height="72"
                class="text-title-large font-weight-bold"
                :prepend-icon="hero.action === 'check-in' ? 'mdi-login' : 'mdi-logout'"
                :loading="busy"
                @click="act(hero.action)"
              >
                {{ hero.action === 'check-in' ? '출근하기' : '퇴근하기' }}
              </v-btn>
            </div>

            <v-divider class="my-5" />

            <v-row dense>
              <v-col cols="4">
                <div class="text-label-medium text-medium-emphasis">출근</div>
                <div class="text-title-large">{{ kstTime(att?.checkInAt) }}</div>
              </v-col>
              <v-col cols="4">
                <div class="text-label-medium text-medium-emphasis">퇴근</div>
                <div class="text-title-large">{{ kstTime(att?.checkOutAt) }}</div>
              </v-col>
              <v-col cols="4">
                <div class="text-label-medium text-medium-emphasis">근무시간</div>
                <div class="text-title-large">{{ duration(att?.workSeconds) }}</div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <BalanceCard :balance="balance" />
      </div>
    </template>

    <UnrecordedDialog v-if="mine" v-model="dialog" :items="mine.unrecorded" @saved="onSaved" />
  </v-container>
</template>

<style scoped>
.hero-band {
  height: 6px;
}
.home {
  max-width: 1100px;
}
.home-cards {
  display: grid;
  gap: 16px;
  align-items: start;
}
@media (min-width: 1280px) {
  .home {
    max-width: 1440px;
  }
  .home-cards {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }
}
</style>
