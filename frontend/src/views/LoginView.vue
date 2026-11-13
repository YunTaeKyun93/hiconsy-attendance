<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { VTextField } from 'vuetify/components'
import { errorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const loginId = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const loading = ref(false)
const idField = ref<InstanceType<typeof VTextField> | null>(null)
/** 개발 서버에서만 시드 계정 안내 */
const isDev = import.meta.env.DEV

// Vuetify의 autofocus는 화면에 보일 때(IntersectionObserver) 늦게 포커스해서, 그 사이 입력하던 칸의 포커스를 빼앗을 수 있다.
// 마운트 즉시 직접 포커스한다.
onMounted(() => idField.value?.focus())

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(loginId.value, password.value)
    await router.replace({ name: 'home' })
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-bg fill-height d-flex align-center justify-center pa-4">
    <v-card class="login-card pa-2" width="380" elevation="10">
      <v-card-item class="text-center pt-6">
        <v-avatar color="primary" variant="tonal" size="56" class="mb-3">
          <v-icon icon="mdi-clock-time-four-outline" size="32" />
        </v-avatar>
        <v-card-title class="text-headline-small font-weight-bold">근태관리</v-card-title>
        <v-card-subtitle>연구실 출퇴근·신청·정산</v-card-subtitle>
      </v-card-item>
      <v-card-text>
        <v-form @submit.prevent="submit">
          <v-text-field
            ref="idField"
            v-model="loginId"
            label="아이디"
            prepend-inner-icon="mdi-account-outline"
            variant="outlined"
            autocomplete="username"
            class="mb-1"
          />
          <v-text-field
            v-model="password"
            label="비밀번호"
            prepend-inner-icon="mdi-lock-outline"
            :type="showPassword ? 'text' : 'password'"
            variant="outlined"
            autocomplete="current-password"
          >
            <template #append-inner>
              <v-btn
                :icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                :aria-label="showPassword ? '비밀번호 숨기기' : '비밀번호 표시'"
                variant="text"
                size="small"
                density="comfortable"
                @click="showPassword = !showPassword"
              />
            </template>
          </v-text-field>
          <v-expand-transition>
            <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>
          </v-expand-transition>
          <v-btn
            type="submit"
            color="primary"
            size="large"
            block
            :loading="loading"
            :disabled="!loginId || !password"
            class="login-btn"
          >
            로그인
          </v-btn>
        </v-form>
        <p v-if="isDev" class="text-body-small text-medium-emphasis text-center mt-4">
          시드 계정: lead · kim · yeon · lim / password1234
        </p>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.login-bg {
  /* 앱 바(56px)와 개발 시계 막대를 뺀 화면 전체 */
  min-height: calc(100dvh - 56px - var(--dev-bar-h, 0px));
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(var(--v-theme-primary), 0.18), transparent 60%),
    radial-gradient(900px 500px at 110% 110%, rgba(var(--v-theme-secondary), 0.16), transparent 60%),
    rgb(var(--v-theme-background));
}
.login-card {
  animation: rise 0.45s ease-out both;
}
.login-btn {
  transition: transform 0.15s ease;
}
.login-btn:not(:disabled):hover {
  transform: translateY(-1px);
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
