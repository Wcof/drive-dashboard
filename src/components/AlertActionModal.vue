<script setup lang="ts">
// AlertActionModal —— ADR#166 告警处置弹窗，ADR#151 5 子操作（确认/误判/转隐患/转整改/推送第三方）
import { ref } from "vue"
import { useAlerts } from "@/composables/useAlerts"
import { alertSubAction, ALERT_SUB_ACTION_LABEL, type AlertSubAction } from "@/utils/operations"

const props = defineProps<{ alertId: string }>()
const emit = defineEmits<{ (e: "close"): void }>()

const { alerts, ackAlert } = useAlerts()
const alert = alerts.value.find((a) => a.id === props.alertId)
const operator = ref("current")
const reason = ref("")
const subAction = ref<AlertSubAction>("confirm")

const subActions = Object.keys(ALERT_SUB_ACTION_LABEL) as AlertSubAction[]

function confirm(): void {
  ackAlert(props.alertId, operator.value, reason.value)
  alertSubAction(subAction.value, props.alertId, operator.value, reason.value)
  emit("close")
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <div class="modal__title">告警处置 · {{ alert?.title ?? alertId }}</div>
      <div class="modal__body">
        <div class="info-block">
          <span class="dot danger"></span>
          <span>告警描述：{{ alert?.description ?? "暂无描述" }}</span>
        </div>
        <div class="form-row"><label>处置操作</label>
          <div class="sub-actions">
            <button v-for="a in subActions" :key="a" class="sub-btn" :class="{ active: subAction === a }" @click="subAction = a">{{ ALERT_SUB_ACTION_LABEL[a] }}</button>
          </div>
        </div>
        <div class="form-row"><label>操作人</label><input v-model="operator" /></div>
        <div class="form-row"><label>处置说明</label><textarea v-model="reason" rows="3" placeholder="请填写处置说明…" /></div>
      </div>
      <div class="modal__actions">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn btn--confirm" @click="confirm">确认 {{ ALERT_SUB_ACTION_LABEL[subAction] }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sub-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.sub-btn {
  background: rgba(5, 8, 14, 0.7); border: 1px solid rgba(107, 142, 173, 0.22);
  color: var(--hud-text-dim); padding: 8px 14px; cursor: pointer;
  border-radius: 6px; font-size: 12px; transition: all 0.2s ease;
}
.sub-btn:hover { border-color: rgba(245, 158, 11, 0.4); color: var(--hud-text); }
.sub-btn.active { color: var(--hud-warn); border-color: var(--hud-warn); background: rgba(245, 158, 11, 0.12); box-shadow: 0 0 10px rgba(245, 158, 11, 0.15); }
</style>
