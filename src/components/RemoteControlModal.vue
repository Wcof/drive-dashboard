<script setup lang="ts">
// RemoteControlModal —— ADR#152 获取电子控制权 + 切入远控（增强版 S15）
// 显示当前控制权持有者 + 锁状态 + 交接流程

import { ref, computed } from "vue"
import { acquireControl, releaseControl } from "@/utils/operations"
import { useLockState } from "@/composables/useLockState"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { addAuditLog } from "@/composables/useAuditLog"

const emit = defineEmits<{ (e: "close"): void }>()
const { resetLockTimer } = useLockState()
const { selectedRobot } = useSelectedRobot()

const operator = ref("current")
const confirmed = ref(false)
const controlHeldBy = ref<string | null>(null) // null = 无持有者
const actionMode = ref<"acquire" | "release" | "info">("acquire")

const isLockHeld = computed(() => controlHeldBy.value !== null)
const lockOwner = computed(() => controlHeldBy.value ?? "—")

// 模拟检查当前控制权（mock: 初始无人持有）
function checkControl(): void {
  const stored = localStorage.getItem("robot_control_owner")
  controlHeldBy.value = stored && stored !== "null" ? stored : null
  if (controlHeldBy.value) {
    actionMode.value = controlHeldBy.value === operator.value ? "release" : "info"
  }
}
checkControl()

function acquire(): void {
  if (!selectedRobot.value || !confirmed.value) return
  resetLockTimer()
  acquireControl(selectedRobot.value.id, operator.value)
  controlHeldBy.value = operator.value
  localStorage.setItem("robot_control_owner", operator.value)
  addAuditLog({
    action: "remote_control_enter", operator: operator.value,
    targetId: selectedRobot.value.id, targetType: "robot",
    reason: "获取电子控制权"
  })
  actionMode.value = "release"
}

function release(): void {
  if (!selectedRobot.value) return
  resetLockTimer()
  releaseControl(selectedRobot.value.id, operator.value)
  controlHeldBy.value = null
  localStorage.removeItem("robot_control_owner")
  addAuditLog({
    action: "remote_control_exit", operator: operator.value,
    targetId: selectedRobot.value.id, targetType: "robot",
    reason: "释放电子控制权"
  })
  emit("close")
}

function requestForcedTakeover(): void {
  if (!selectedRobot.value) return
  resetLockTimer()
  addAuditLog({
    action: "takeover", operator: operator.value,
    targetId: selectedRobot.value.id, targetType: "robot",
    reason: `强制抢占控制权（原持有者: ${lockOwner.value}）`
  })
  controlHeldBy.value = operator.value
  localStorage.setItem("robot_control_owner", operator.value)
  actionMode.value = "release"
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <div class="modal__title">
        <span>电子控制权 · {{ selectedRobot?.name }}</span>
        <span class="lock-badge" :class="isLockHeld ? 'lock-held' : 'lock-free'">
          {{ isLockHeld ? `🔒 已被 ${lockOwner} 持有` : '🔓 空闲' }}
        </span>
      </div>
      <div class="modal__body">
        <!-- 已被他人持有 -->
        <div v-if="actionMode === 'info'" class="warn-block">
          <span class="dot danger"></span>
          控制权当前由 <strong>{{ lockOwner }}</strong> 持有。您可以选择等待释放或强制抢占。
        </div>
        
        <!-- 自己持有 → 释放 -->
        <div v-if="actionMode === 'release'" class="info-block">
          <span class="dot safe"></span>
          您已持有控制权，可释放后退出远控。
        </div>

        <!-- 空闲 → 获取 -->
        <div v-if="actionMode === 'acquire'" class="warn-block">
          <span class="dot danger"></span>
          将切入远控模式，机器人自动巡检将暂停。获取后您将成为唯一控制者。
        </div>

        <div class="form-row"><label>操作人</label><input v-model="operator" /></div>
        
        <!-- 强制抢占按钮 -->
        <div v-if="actionMode === 'info'" class="form-row">
          <button class="force-takeover-btn" @click="requestForcedTakeover">⚠️ 强制抢占控制权</button>
        </div>

        <div v-if="actionMode !== 'info'" class="form-row confirm-row">
          <label class="confirm-label">
            <input type="checkbox" v-model="confirmed" />
            <span>{{ actionMode === 'acquire' ? '我已确认获取控制权并切入远控' : '我已确认释放控制权' }}</span>
          </label>
        </div>
      </div>
      <div class="modal__actions">
        <button class="btn" @click="emit('close')">取消</button>
        <button v-if="actionMode === 'acquire'" class="btn btn--confirm" :disabled="!confirmed" @click="acquire">确认获取控制权</button>
        <button v-if="actionMode === 'release'" class="btn btn--confirm" :disabled="!confirmed" @click="release">确认释放控制权</button>
        <button v-if="actionMode === 'info'" class="btn" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal__title { color: var(--hud-warn) !important; display: flex; align-items: center; gap: 0.1rem; }
.modal__title .lock-badge { font-size: 0.1rem; margin-left: auto; padding: 0.02rem 0.08rem; border-radius: 0.03rem; }
.lock-badge.lock-held { background: rgba(239,68,68,0.15); color: #EF4444; border: 1px solid rgba(239,68,68,0.3); }
.lock-badge.lock-free { background: rgba(34,197,94,0.15); color: #22C55E; border: 1px solid rgba(34,197,94,0.3); }
.modal::before { background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.7) 50%, transparent) !important; }
.modal { border-color: rgba(239, 68, 68, 0.4) !important; }
.btn--confirm { color: var(--hud-danger) !important; border-color: rgba(239, 68, 68, 0.55) !important; background: rgba(239, 68, 68, 0.08) !important; }
.btn--confirm:hover { background: rgba(239, 68, 68, 0.18) !important; box-shadow: 0 0 12px rgba(239, 68, 68, 0.2) !important; }
.confirm-label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--hud-text-dim); font-size: 12px; }
.confirm-label input[type="checkbox"] { accent-color: var(--hud-danger); width: 14px; height: 14px; }
.force-takeover-btn { width: 100%; padding: 0.08rem; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.4); color: #EF4444; border-radius: 0.04rem; cursor: pointer; font-size: 0.12rem; letter-spacing: 1px; }
.force-takeover-btn:hover { background: rgba(239,68,68,0.2); }
</style>
