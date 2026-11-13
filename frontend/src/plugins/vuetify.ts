import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { ko } from 'vuetify/locale'
import { STATUS_PALETTE } from '@/theme/status'

export const THEME_KEY = 'theme'

/** 저장된 선택이 있으면 그것, 없으면 OS 설정. 저장소를 못 쓰는 환경도 있어 try로 감싼다. */
export function initialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // 무시하고 OS 설정으로
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default createVuetify({
  locale: { locale: 'ko', messages: { ko } },
  theme: {
    defaultTheme: initialTheme(),
    themes: {
      light: {
        dark: false,
        colors: { primary: '#3F51B5', secondary: '#00897B', background: '#F5F6FA', ...STATUS_PALETTE.light },
      },
      dark: {
        dark: true,
        colors: { primary: '#8C9EFF', secondary: '#4DB6AC', background: '#121318', surface: '#1C1D24', ...STATUS_PALETTE.dark },
      },
    },
  },
  defaults: {
    VCard: { rounded: 'lg' },
    VBtn: { rounded: 'lg' },
    VChip: { label: true },
  },
})
