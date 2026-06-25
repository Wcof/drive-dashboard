<script setup lang="ts">
// DispatchModal —— ADR#170 紧急派车弹窗：派发新任务，写审计日志（dispatch）
import { ref } from "vue"
import { useRobots } from "@/composables/useRobots"
import { addAuditLog } from "@/composables/useAuditLog"
import { getMockDataService } from "@/composables/useMockDataService"
import { storage, STORAGE_KEYS } from "@/utils/storage"
import { InspectionTaskType, InspectionTaskInstanceStatus, type InspectionTask } from "@/types/inspection"

const props = defineProps<{ robotId: string }>()
const emit = defineEmits<{ (e: "close"): void }>()

const { byId } = useRobots()
const robot = byId(props.robotId).value
const operator = ref("current")
const taskName = ref("紧急派车任务")
const reason = ref("")

function confirm(): void {
  const { state } = getMockDataService()
  const newTask: InspectionTask = {
    id: `task-dispatch-${Date.now()}`,
    name: taskName.value,
    code: `D${Date.now()}`,
    robotId: props.robotId,
    type: InspectionTaskType.PATROL,
    status: InspectionTaskInstanceStatus.PENDING,
    inspectionPointIds: [],
    currentInspectionPointIndex: 0,
    progress: 0,
    businessScene: "emergency_arrival",
    priorityLevel: "emergency",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  state.tasks.push(newTask)
  storage.set(STORAGE_KEYS.TASKS, state.tasks)
  addAuditLog({ action: "dispatch", operator: operator.value, targetId: newTask.id, targetType: "task", reason: reason.value })
  emit("close")
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <div class="modal__title">紧急派车 · {{ robot?.name ?? robotId }}</div>
      <div class="modal__body">
        <div class="info-block">
          <span class="dot smog"></span>
          <span>目标机器人：{{ robot?.name }} · 当前电量 {{ robot?.batteryLevel ?? "?" }}%</span>
        </div>
        <div class="form-row"><label>操作人</label><input v-model="operator" /></div>
        <div class="form-row"><label>任务名称</label><input v-model="taskName" /></div>
        <div class="form-row"><label>派车原因</label><textarea v-model="reason" rows="3" placeholder="请填写派车原因…" /></div>
      </div>
      <div class="modal__actions">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn btn--confirm" @click="confirm">确认派车</button>
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
