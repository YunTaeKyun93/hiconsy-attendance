<script setup lang="ts">
// 월 선택: 한국어 달력 팝업(연도 이동 + 1~12월). 모델은 'YYYY-MM'(비우면 '').
// 브라우저 기본 <input type="month">("----년 --월")를 대신한다.
import { computed, ref, watch } from 'vue'
import { kstDate } from '@/utils/format'

defineOptions({ inheritAttrs: false })
const props = defineProps<{
  /** 비어 있을 때 팝업이 처음 보여줄 달('YYYY-MM', 보통 서버 기준 이번 달) */
  current?: string
}>()
const model = defineModel<string>({ default: '' })

const menu = ref(false)
// 기준 달을 모르는 화면에서는 팝업의 첫 연도만 브라우저 시각(KST)으로 정한다(표시용, 판정과 무관).
const base = () => model.value || props.current || kstDate(new Date().toISOString()).slice(0, 7)
const year = ref(Number(base().slice(0, 4)) || 0)

// 팝업을 열 때 선택된(없으면 이번) 달의 연도로 맞춘다.
watch(menu, (open) => {
  if (open) year.value = Number(base().slice(0, 4)) || year.value
})

const label = computed(() => (model.value ? `${model.value.slice(0, 4)}년 ${Number(model.value.slice(5, 7))}월` : ''))
const key = (m: number) => `${year.value}-${String(m).padStart(2, '0')}`

function pick(m: number) {
  model.value = key(m)
  menu.value = false
}
</script>

<template>
  <v-menu v-model="menu" :close-on-content-click="false" location="bottom end">
    <template #activator="{ props: act }">
      <v-text-field
        v-bind="{ ...$attrs, ...act }"
        :model-value="label"
        readonly
        append-inner-icon="mdi-calendar-month"
        @click:clear="model = ''"
      />
    </template>
    <v-card min-width="280" class="pa-2">
      <div class="d-flex align-center justify-space-between mb-2">
        <v-btn icon="mdi-chevron-left" variant="text" size="small" aria-label="이전 해" @click="year--" />
        <span class="text-title-medium font-weight-bold">{{ year }}년</span>
        <v-btn icon="mdi-chevron-right" variant="text" size="small" aria-label="다음 해" @click="year++" />
      </div>
      <div class="months">
        <v-btn
          v-for="m in 12"
          :key="m"
          :variant="key(m) === model ? 'flat' : key(m) === current ? 'outlined' : 'text'"
          :color="key(m) === model || key(m) === current ? 'primary' : undefined"
          size="small"
          @click="pick(m)"
        >
          {{ m }}월
        </v-btn>
      </div>
    </v-card>
  </v-menu>
</template>

<style scoped>
.months {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
</style>
