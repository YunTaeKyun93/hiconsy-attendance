import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 화면 표시용 현재 시각(판정은 서버). 1초마다 흐른다.
 * 개발 모드에서는 DevClockBar가 서버 시계(조작된 시각)에 맞춰 주고, 운영에서는 브라우저 시각을 쓴다.
 */
export const useClockStore = defineStore('clock', () => {
  let baseMs = performance.timeOrigin
  let baseAt = 0
  const nowMs = ref(baseMs + performance.now())

  function tick(): void {
    nowMs.value = baseMs + (performance.now() - baseAt)
  }

  /** 서버 시각을 받은 순간 그 값으로 맞춘다. */
  function sync(serverMs: number): void {
    baseMs = serverMs
    baseAt = performance.now()
    tick()
  }

  window.setInterval(tick, 1000)
  return { nowMs, sync }
})
