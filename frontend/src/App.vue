<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import DevClockBar from '@/components/DevClockBar.vue'
import FeedbackHost from '@/components/FeedbackHost.vue'
import { THEME_KEY } from '@/plugins/vuetify'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const theme = useTheme()
const { mdAndUp } = useDisplay()
const drawer = ref<boolean | null>(null)

const isDark = computed(() => theme.global.current.value.dark)

function toggleTheme() {
  const next = isDark.value ? 'light' : 'dark'
  void theme.change(next)
  try {
    localStorage.setItem(THEME_KEY, next)
  } catch {
    // 저장 못 해도 이번 화면에는 적용된다.
  }
}

const memberMenu = [
  { title: '내 근태', icon: 'mdi-clock-check-outline', to: { name: 'home' } },
  { title: '신청', icon: 'mdi-file-document-edit-outline', to: { name: 'requests' } },
  { title: '월별 정산', icon: 'mdi-table-clock', to: { name: 'settlement' } },
]
const leadMenu = [
  { title: '팀 보드', icon: 'mdi-account-group-outline', to: { name: 'board' } },
  { title: '미기록·직접 입력', icon: 'mdi-clock-alert-outline', to: { name: 'irregular' } },
  { title: '승인', icon: 'mdi-check-decagram-outline', to: { name: 'approvals' } },
  { title: '특별 연차', icon: 'mdi-gift-outline', to: { name: 'grants' } },
]

async function logout() {
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <v-app>
    <v-navigation-drawer v-if="auth.user" v-model="drawer" :permanent="mdAndUp" width="232">
      <v-list nav density="comfortable">
        <v-list-subheader>내 근무</v-list-subheader>
        <v-list-item
          v-for="m in memberMenu"
          :key="m.title"
          :to="m.to"
          :prepend-icon="m.icon"
          :title="m.title"
          exact
          color="primary"
        />
        <template v-if="auth.isLead">
          <v-list-subheader class="mt-2">리드</v-list-subheader>
          <v-list-item
            v-for="m in leadMenu"
            :key="m.title"
            :to="m.to"
            :prepend-icon="m.icon"
            :title="m.title"
            color="primary"
          />
        </template>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar flat border density="comfortable">
      <v-app-bar-nav-icon v-if="auth.user && !mdAndUp" aria-label="메뉴" @click="drawer = !drawer" />
      <v-app-bar-title>
        <span class="d-inline-flex align-center ga-2">
          <v-icon icon="mdi-clock-time-four-outline" color="primary" />
          근태관리
        </span>
      </v-app-bar-title>
      <v-btn
        :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        :aria-label="isDark ? '라이트 모드' : '다크 모드'"
        :title="isDark ? '라이트 모드' : '다크 모드'"
        @click="toggleTheme"
      />
      <template v-if="auth.user">
        <span class="d-none d-sm-inline text-body-medium ml-2">{{ auth.user.name }}</span>
        <v-chip v-if="auth.isLead" size="x-small" color="primary" class="ml-2">LEAD</v-chip>
        <v-btn icon="mdi-logout" title="로그아웃" aria-label="로그아웃" class="ml-1" @click="logout" />
      </template>
    </v-app-bar>

    <v-main>
      <!-- 개발 모드 시계 막대 높이만큼 아래 여백(막대가 내용을 가리지 않게) -->
      <div class="main-inner">
        <RouterView />
      </div>
    </v-main>

    <DevClockBar />
    <FeedbackHost />
  </v-app>
</template>

<style scoped>
.main-inner {
  padding-bottom: var(--dev-bar-h, 0px);
}
</style>
