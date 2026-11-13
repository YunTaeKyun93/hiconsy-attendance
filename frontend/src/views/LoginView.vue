<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { errorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const loginId = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

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
  <v-container class="fill-height justify-center">
    <v-card width="360" title="로그인">
      <v-card-text>
        <v-form @submit.prevent="submit">
          <v-text-field v-model="loginId" label="아이디" autocomplete="username" autofocus />
          <v-text-field v-model="password" label="비밀번호" type="password" autocomplete="current-password" />
          <v-alert v-if="error" type="error" density="compact" class="mb-3">{{ error }}</v-alert>
          <v-btn type="submit" color="primary" block :loading="loading" :disabled="!loginId || !password">로그인</v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>
