import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { ko } from 'vuetify/locale'

export default createVuetify({
  locale: { locale: 'ko', messages: { ko } },
})
