import { defineStore } from 'pinia'
import { ref } from 'vue'

interface ConfirmOptions {
  title: string
  text?: string
  confirmText?: string
  /** 되돌릴 수 없는 동작이면 true(빨간 버튼) */
  danger?: boolean
}

/** 화면 공통 알림(스낵바)과 확인 창. 브라우저 alert/confirm 대신 쓴다. */
export const useFeedbackStore = defineStore('feedback', () => {
  const snack = ref({ show: false, text: '', color: 'status-ok' })
  const dialog = ref({ show: false, title: '', text: '', confirmText: '확인', danger: false })
  let resolver: ((ok: boolean) => void) | null = null

  function notify(text: string, type: 'success' | 'error' = 'success'): void {
    snack.value = { show: true, text, color: type === 'success' ? 'status-ok' : 'status-late' }
  }

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    resolver?.(false)
    dialog.value = { show: true, title: opts.title, text: opts.text ?? '', confirmText: opts.confirmText ?? '확인', danger: !!opts.danger }
    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function answer(ok: boolean): void {
    dialog.value.show = false
    resolver?.(ok)
    resolver = null
  }

  return { snack, dialog, notify, confirm, answer }
})
