<script setup lang="ts">
// ConfirmModal —— ADR#164/195 二次确认弹窗（无 PIN）
defineProps<{
  title: string
  message: string
  confirmText?: string
  cancelText?: string
}>()
const emit = defineEmits<{ (e: "confirm"): void; (e: "cancel"): void }>()
</script>

<template>
  <div class="modal-mask" @click.self="emit('cancel')">
    <div class="modal">
      <div class="modal__title">{{ title }}</div>
      <div class="modal__body">
        <div class="warn-block">{{ message }}</div>
      </div>
      <div class="modal__actions">
        <button class="btn" @click="emit('cancel')">{{ cancelText ?? "取消" }}</button>
        <button class="btn btn--confirm" @click="emit('confirm')">{{ confirmText ?? "确认" }}</button>
      </div>
    </div>
  </div>
</template>
