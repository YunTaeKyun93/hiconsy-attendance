<script setup lang="ts">
// 미기록 퇴근 직접 입력 모달 (DESIGN.md 4-3). 범위 검사는 서버가 한다. 화면은 범위를 안내만 한다.
import { reactive, ref, watch } from 'vue'
import { api, errorMessage } from '@/api/client'
import type { UnrecordedView } from '@/api/types'
import { kstTime, withWeekday } from '@/utils/format'
import TimeField from './TimeField.vue'

const props = defineProps<{ items: UnrecordedView[] }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()

const times = reactive<Record<string, string>>({})
const errors = reactive<Record<string, string>>({})
const saving = ref('')
const QUICK_TIMES = ['16:00', '18:00', '19:00']

watch(
  () => props.items,
  (items) => {
    for (const item of items) times[item.workDate] ??= ''
  },
  { immediate: true },
)

async function save(item: UnrecordedView) {
  errors[item.workDate] = ''
  saving.value = item.workDate
  try {
    await api('/attendance/manual-check-out', {
      method: 'POST',
      body: { workDate: item.workDate, checkOutTime: times[item.workDate] ?? '' },
    })
    emit('saved')
  } catch (e) {
    errors[item.workDate] = errorMessage(e)
  } finally {
    saving.value = ''
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="520">
    <v-card title="퇴근이 기록되지 않은 날이 있습니다">
      <v-card-text>
        <p class="mb-4 text-body-medium">퇴근 시각을 입력해야 출근할 수 있습니다.</p>
        <v-sheet v-for="item in items" :key="item.workDate" border rounded class="pa-3 mb-3">
          <div class="font-weight-medium">{{ withWeekday(item.workDate) }}</div>
          <div class="text-body-medium text-medium-emphasis mb-2">
            출근 {{ kstTime(item.checkInAt) }} · 입력 가능 {{ kstTime(item.min) }} ~ {{ kstTime(item.max) }}
          </div>
          <div class="d-flex ga-2 align-start">
            <TimeField
              v-model="times[item.workDate]"
              label="퇴근 시각"
              density="compact"
              class="flex-grow-1"
              :quick="QUICK_TIMES"
              @enter="times[item.workDate] && save(item)"
            />
            <v-btn
              color="primary"
              height="40"
              :loading="saving === item.workDate"
              :disabled="!times[item.workDate]"
              @click="save(item)"
            >
              저장
            </v-btn>
          </div>
          <v-alert v-if="errors[item.workDate]" type="error" density="compact" class="mt-2">
            {{ errors[item.workDate] }}
          </v-alert>
        </v-sheet>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="open = false">닫기</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
