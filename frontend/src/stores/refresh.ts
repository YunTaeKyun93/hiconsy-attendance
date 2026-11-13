import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 개발 모드 시계를 바꾸면 화면들이 다시 불러오도록 신호를 보낸다. */
export const useRefreshStore = defineStore('refresh', () => {
  const tick = ref(0)
  function bump(): void {
    tick.value++
  }
  return { tick, bump }
})
