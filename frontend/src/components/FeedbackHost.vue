<script setup lang="ts">
import { useFeedbackStore } from '@/stores/feedback'

const fb = useFeedbackStore()
</script>

<template>
  <v-snackbar v-model="fb.snack.show" :color="fb.snack.color" :timeout="4000" location="top" multi-line>
    <span class="pre-line">{{ fb.snack.text }}</span>
    <template #actions>
      <v-btn variant="text" icon="mdi-close" size="small" aria-label="닫기" @click="fb.snack.show = false" />
    </template>
  </v-snackbar>

  <v-dialog :model-value="fb.dialog.show" max-width="420" persistent>
    <v-card :title="fb.dialog.title">
      <v-card-text v-if="fb.dialog.text" class="pre-line">{{ fb.dialog.text }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="fb.answer(false)">취소</v-btn>
        <v-btn :color="fb.dialog.danger ? 'status-late' : 'primary'" variant="flat" @click="fb.answer(true)">
          {{ fb.dialog.confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
