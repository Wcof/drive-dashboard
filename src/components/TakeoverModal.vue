<script setup lang="ts">
// TakeoverModal —— ADR#168 故障接管弹窗：写审计日志（takeover）
import { ref } from "vue"
import { useRobots } from "@/composables/useRobots"
import { addAuditLog } from "@/composables/useAuditLog"
import { storage, STORAGE_KEYS } from "@/utils/storage"
import { RobotStatus } from "@/types/robot"

const props = defineProps<{ robotId: string }>()
const emit = defineEmits<{ (e: "close"): void }>()

const { byId } = useRobots()
const robot = byId(props.robotId).value
const operator = ref("current")
const reason = ref("")

function confirm(): void {
  const robots = storage.get<import("@/types/robot").Robot[]>(STORAGE_KEYS.ROBOTS) ?? []
  const idx = robots.findIndex((r) => r.id === props.robotId)
  if (idx !== -1) {
    robots[idx] = { ...robots[idx], status: RobotStatus.ONLINE, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.ROBOTS, robots)
  }
  addAuditLog({ action: "takeover", operator: operator.value, targetId: props.robotId, targetType: "robot", reason: reason.value })
  emit("close")
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <div class="modal__title">故障接管 · {{ robot?.name ?? robotId }}</div>
      <div class="modal__body">
        <div class="warn-block">
          <span class="dot danger"></span>
          当前状态：故障 · 电量 {{ robot?.batteryLevel ?? "?" }}% · 即将由人工接管
        </div>
        <div class="form-row"><label>操作人</label><input v-model="operator" /></div>
        <div class="form-row"><label>接管原因</label><textarea v-model="reason" rows="3" placeholder="请填写接管原因…" /></div>
      </div>
      <div class="modal__actions">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn btn--confirm" @click="confirm">确认接管</button>
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
</style>
