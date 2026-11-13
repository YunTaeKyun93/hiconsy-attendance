<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const checking = ref(false)

async function retry() {
  checking.value = true
  try {
    await auth.check()
    if (auth.access === 'ready') await router.replace({ name: 'home' })
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <v-container class="fill-height justify-center">
    <v-card width="440" class="text-center pa-4">
      <v-icon icon="mdi-lan-disconnect" size="56" color="error" class="mb-2" />
      <v-card-title class="text-h6">등록된 IP가 아닙니다</v-card-title>
      <v-card-text>
        연구실 네트워크에서 접속하거나, 승인된 재택·주말 근무 신청의 IP와 시간대 안에서 접속하세요.
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn color="primary" variant="tonal" :loading="checking" @click="retry">다시 확인</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>
