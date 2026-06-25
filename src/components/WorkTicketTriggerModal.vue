<script setup lang="ts">
// WorkTicketTriggerModal —— ADR#70/120/153 作业票触发弹窗
import { reactive, ref } from "vue"
import { triggerWorkTicket } from "@/utils/operations"
import { useLockState } from "@/composables/useLockState"
import { useSelectedRobot } from "@/composables/useSelectedRobot"

const emit = defineEmits<{ (e: "close"): void }>()
const { resetLockTimer } = useLockState()
const { selectedRobot } = useSelectedRobot()

const operator = ref("current")
const form = reactive({
  ticketNo: `WT-${Date.now()}`,
  title: "",
  description: "",
  areaName: "北区",
  applicant: "",
  startTime: new Date().toISOString(),
  endTime: new Date(Date.now() + 2 * 3600_000).toISOString(),
  guardZone: [] as { longitude: number; latitude: number }[],
})

function confirm(): void {
  if (!selectedRobot.value) return
  resetLockTimer()
  const lng = selectedRobot.value.position.longitude
  const lat = selectedRobot.value.position.latitude
  const d = 0.0005
  form.guardZone = [
    { longitude: lng - d, latitude: lat - d },
    { longitude: lng + d, latitude: lat - d },
    { longitude: lng + d, latitude: lat + d },
    { longitude: lng - d, latitude: lat + d },
  ]
  triggerWorkTicket(selectedRobot.value.id, { ...form }, operator.value)
  emit("close")
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal modal--wide">
      <div class="modal__title">触发作业票 · {{ selectedRobot?.name }}</div>
      <div class="modal__body">
        <div class="info-block">
          <span class="dot smog"></span>
          <span>将以机器人当前位置为中心自动生成 50m 见方监护区</span>
        </div>
        <div class="form-grid">
          <div class="form-row"><label>作业票编号</label><input v-model="form.ticketNo" /></div>
          <div class="form-row"><label>区域</label><input v-model="form.areaName" /></div>
          <div class="form-row"><label>标题</label><input v-model="form.title" placeholder="如：管廊阀门检修" /></div>
          <div class="form-row"><label>申请人</label><input v-model="form.applicant" /></div>
        </div>
        <div class="form-row"><label>描述</label><textarea v-model="form.description" rows="3" placeholder="请填写作业描述…" /></div>
        <div class="form-row"><label>操作人</label><input v-model="operator" /></div>
      </div>
      <div class="modal__actions">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn btn--confirm" :disabled="!form.title" @click="confirm">确认触发</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal--wide { min-width: 540px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; }
</style>
