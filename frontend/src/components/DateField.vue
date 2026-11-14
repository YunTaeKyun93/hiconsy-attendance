<script setup lang="ts">
// 날짜 입력: 직접 입력(2026-11-18, 20261118 등) 또는 달력 아이콘으로 한국어 달력 팝업.
// 모델은 'YYYY-MM-DD' 문자열(형식이 틀리면 ''). 기한·영업일 판정은 서버가 한다.
import { ref, watch } from 'vue'
import { parseDateInput } from '@/utils/format'

defineOptions({ inheritAttrs: false })
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ enter: [] }>()

const text = ref(model.value)
const touched = ref(false)
const invalid = ref(false)
const menu = ref(false)

function onInput(v: string | null) {
  text.value = v ?? ''
  touched.value = false
  model.value = parseDateInput(text.value) ?? ''
}

function commit() {
  touched.value = true
  const d = parseDateInput(text.value)
  invalid.value = text.value.trim() !== '' && !d
  if (d) text.value = d
}

/** 달력은 Date를 준다. 달력이 브라우저 현지 날짜로 그리므로 현지 날짜 칸으로 문자열을 만든다. */
function onPick(v: unknown) {
  if (!(v instanceof Date)) return
  const s = `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  onInput(s)
  commit()
  menu.value = false
}

watch(model, (v) => {
  if (v !== (parseDateInput(text.value) ?? '')) {
    text.value = v
    invalid.value = false
  }
})
</script>

<template>
  <v-text-field
    placeholder="YYYY-MM-DD"
    inputmode="numeric"
    maxlength="10"
    autocomplete="off"
    v-bind="$attrs"
    :model-value="text"
    :error="touched && invalid"
    :error-messages="touched && invalid ? '날짜를 YYYY-MM-DD 형식으로 입력하세요' : undefined"
    @update:model-value="onInput"
    @blur="commit"
    @keydown.enter="
      () => {
        commit()
        emit('enter')
      }
    "
  >
    <template #append-inner>
      <v-menu v-model="menu" :close-on-content-click="false" location="bottom end">
        <template #activator="{ props: act }">
          <v-icon v-bind="act" icon="mdi-calendar" aria-label="달력 열기" role="button" />
        </template>
        <v-date-picker :model-value="model || null" show-adjacent-months hide-header @update:model-value="onPick" />
      </v-menu>
    </template>
  </v-text-field>
</template>

<style scoped>
/* 테두리 없는 칸(solo, DEV 막대)에서도 잘못된 값이 보이게 */
.v-input--error :deep(.v-field--variant-solo) {
  box-shadow: 0 0 0 2px rgb(var(--v-theme-error));
}
</style>
