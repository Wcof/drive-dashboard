<script setup lang="ts">
// RemoteControlModal —— ADR#152 获取电子控制权 + 切入远控
import { ref } from "vue"
import { acquireControl } from "@/utils/operations"
import { useLockState } from "@/composables/useLockState"
import { useSelectedRobot } from "@/composables/useSelectedRobot"

const emit = defineEmits<{ (e: "close"): void }>()
const { resetLockTimer } = useLockState()
const { selectedRobot } = useSelectedRobot()

const operator = ref("current")
const confirmed = ref(false)

function acquire(): void {
  if (!selectedRobot.value || !confirmed.value) return
  resetLockTimer()
  acquireControl(selectedRobot.value.id, operator.value)
  emit("close")
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <div class="modal__title">获取电子控制权 · {{ selectedRobot?.name }}</div>
      <div class="modal__body">
        <div class="warn-block">
          <span class="dot danger"></span>
          将切入远控模式，机器人自动巡检将暂停。
        </div>
        <div class="form-row"><label>操作人</label><input v-model="operator" /></div>
        <div class="form-row confirm-row">
          <label class="confirm-label">
            <input type="checkbox" v-model="confirmed" />
            <span>我已确认获取控制权并切入远控</span>
          </label>
        </div>
      </div>
      <div class="modal__actions">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn btn--confirm" :disabled="!confirmed" @click="acquire">确认切入远控</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal__title { color: var(--hud-danger) !important; }
.modal::before { background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.7) 50%, transparent) !important; }
.modal { border-color: rgba(239, 68, 68, 0.4) !important; }
.btn--confirm { color: var(--hud-danger) !important; border-color: rgba(239, 68, 68, 0.55) !important; background: rgba(239, 68, 68, 0.08) !important; }
.btn--confirm:hover { background: rgba(239, 68, 68, 0.18) !important; box-shadow: 0 0 12px rgba(239, 68, 68, 0.2) !important; }
.confirm-label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--hud-text-dim); font-size: 12px; }
.confirm-label input[type="checkbox"] { accent-color: var(--hud-danger); width: 14px; height: 14px; }
</style>
