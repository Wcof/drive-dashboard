<script setup lang="ts">
// PreemptModal —— ADR#153 抢占授权弹窗
import { ref } from "vue"
import { useTasks } from "@/composables/useTasks"
import { preemptTask } from "@/utils/operations"
import { useLockState } from "@/composables/useLockState"

const props = defineProps<{ taskId: string }>()
const emit = defineEmits<{ (e: "close"): void }>()

const { byId } = useTasks()
const { resetLockTimer } = useLockState()
const task = byId(props.taskId).value
const operator = ref("current")
const reason = ref("")

function confirm(): void {
  resetLockTimer()
  preemptTask(props.taskId, operator.value, reason.value)
  emit("close")
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <div class="modal__title">抢占授权 · {{ task?.name ?? taskId }}</div>
      <div class="modal__body">
        <div class="info-block">
          <span class="dot smog"></span>
          <span>当前任务进度：{{ task?.progress ?? 0 }}% · 状态：{{ task?.status ?? "-" }}</span>
        </div>
        <div class="form-row"><label>操作人</label><input v-model="operator" /></div>
        <div class="form-row"><label>抢占原因</label><textarea v-model="reason" rows="3" placeholder="请填写抢占原因…" /></div>
      </div>
      <div class="modal__actions">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn btn--confirm" @click="confirm">确认抢占</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal__title { color: var(--hud-warn) !important; }
.modal::before { background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.7) 50%, transparent) !important; }
.modal { border-color: rgba(245, 158, 11, 0.4) !important; }
.btn--confirm { color: var(--hud-warn) !important; border-color: rgba(245, 158, 11, 0.55) !important; background: rgba(245, 158, 11, 0.08) !important; }
.btn--confirm:hover { background: rgba(245, 158, 11, 0.18) !important; box-shadow: 0 0 12px rgba(245, 158, 11, 0.2) !important; }
</style>
