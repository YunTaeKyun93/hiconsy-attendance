<script setup lang="ts">
// 24시간 텍스트 시각 입력. 모델은 서버 형식 'HH:MM:SS'(형식이 틀리면 ''). 범위·순서 검사는 서버가 한다.
import { computed, ref, useAttrs, watch, type StyleValue } from 'vue'
import { parseTimeInput, timeLabel } from '@/utils/format'

defineOptions({ inheritAttrs: false })
const props = defineProps<{
  /** 아래에 보여줄 자주 쓰는 시각 ('HH:MM') */
  quick?: string[]
}>()
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ enter: [] }>()

// class·style은 바깥(버튼 줄 포함)에, 나머지(label, density 등)는 입력 칸에
const attrs = useAttrs()
const fieldAttrs = computed(() => Object.fromEntries(Object.entries(attrs).filter(([k]) => k !== 'class' && k !== 'style')))

const text = ref(model.value ? timeLabel(model.value) : '')
/** 칸을 벗어나거나 Enter를 누른 뒤에만 빨간 표시(입력 중에는 표시하지 않음) */
const touched = ref(false)
const invalid = ref(false)

function onInput(v: string) {
  text.value = v
  touched.value = false
  model.value = parseTimeInput(v) ?? ''
}

/** 0930 → 09:30처럼 보기 좋게 바꾸고, 틀리면 빨간 표시 */
function commit() {
  touched.value = true
  const t = parseTimeInput(text.value)
  invalid.value = text.value.trim() !== '' && !t
  if (t) text.value = timeLabel(t)
}

function onEnter() {
  commit()
  emit('enter')
}

function pick(hhmm: string) {
  onInput(hhmm)
  commit()
}

// 부모가 값을 바꾸면(초기화 등) 칸도 맞춘다.
watch(model, (v) => {
  if (v !== (parseTimeInput(text.value) ?? '')) {
    text.value = v ? timeLabel(v) : ''
    invalid.value = false
  }
})
</script>

<template>
  <div :class="attrs.class" :style="attrs.style as StyleValue">
    <v-text-field
      placeholder="예: 09:30"
      inputmode="numeric"
      maxlength="8"
      autocomplete="off"
      v-bind="fieldAttrs"
      :model-value="text"
      :error="touched && invalid"
      :error-messages="touched && invalid ? '24시간 형식으로 입력하세요 (예: 0930 → 09:30)' : undefined"
      @update:model-value="onInput"
      @blur="commit"
      @keydown.enter="onEnter"
    />
    <div v-if="props.quick?.length" class="d-flex flex-wrap ga-1 quick">
      <v-btn v-for="t in props.quick" :key="t" size="x-small" variant="tonal" @click="pick(t)">{{ t }}</v-btn>
    </div>
  </div>
</template>

<style scoped>
/* 테두리 없는 칸(solo, DEV 막대)에서도 잘못된 값이 보이게 */
:deep(.v-input--error .v-field--variant-solo) {
  box-shadow: 0 0 0 2px rgb(var(--v-theme-error));
}
.quick {
  margin-top: -12px;
  margin-bottom: 16px;
}
</style>
