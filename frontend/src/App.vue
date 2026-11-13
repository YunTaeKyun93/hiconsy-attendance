<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import DevClockBar from '@/components/DevClockBar.vue'

const auth = useAuthStore()
const router = useRouter()

async function logout() {
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <v-app>
    <v-app-bar density="comfortable" color="primary">
      <v-app-bar-title>근태관리</v-app-bar-title>
      <template v-if="auth.user">
        <v-btn :to="{ name: 'home' }" exact>내 근태</v-btn>
        <v-btn :to="{ name: 'requests' }">신청</v-btn>
        <v-btn :to="{ name: 'settlement' }">월별 정산</v-btn>
        <template v-if="auth.isLead">
          <v-btn :to="{ name: 'board' }">팀 보드</v-btn>
          <v-btn :to="{ name: 'irregular' }">미기록·직접 입력</v-btn>
          <v-btn :to="{ name: 'approvals' }">승인</v-btn>
        </template>
        <v-divider vertical class="mx-2" />
        <span class="text-body-2 mr-2">{{ auth.user.name }}<span v-if="auth.isLead"> (리드)</span></span>
        <v-btn icon="mdi-logout" title="로그아웃" @click="logout" />
      </template>
    </v-app-bar>

    <v-main>
      <RouterView />
    </v-main>

    <DevClockBar />
  </v-app>
</template>
