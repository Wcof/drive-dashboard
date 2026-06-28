<script setup lang="ts">
// AlertActionModal —— ADR#166 告警处置弹窗（增强版：5子操作+审计留痕+操作提示）
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
const confirmed = ref(false)

const subActions = Object.keys(ALERT_SUB_ACTION_LABEL) as AlertSubAction[]

const actionHints: Record<AlertSubAction, string> = {
  confirm: "确认告警属实，发起处置流程",
  false_alarm: "标记为误报，关闭告警",
  to_hazard: "升级为隐患，纳入隐患管理",
  to_rectify: "转入整改流程，安排整改计划",
  push_third_party: "推送至第三方系统（HSE/EHS）",
}

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
        <div class="form-row">
          <label>处置操作</label>
          <div class="sub-actions">
            <button v-for="a in subActions" :key="a" class="sub-btn" :class="{ active: subAction === a }" @click="subAction = a">
              <span class="sub-btn-label">{{ ALERT_SUB_ACTION_LABEL[a] }}</span>
              <span class="sub-btn-hint">{{ actionHints[a] }}</span>
            </button>
          </div>
        </div>
        <div class="form-row"><label>操作人</label><input v-model="operator" /></div>
        <div class="form-row"><label>处置说明</label><textarea v-model="reason" rows="3" placeholder="请填写处置说明…" /></div>
        <div class="form-row confirm-row">
          <label class="confirm-label">
            <input type="checkbox" v-model="confirmed" />
            <span>我已确认处置操作</span>
          </label>
        </div>
      </div>
      <div class="modal__actions">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn btn--confirm" :disabled="!confirmed || !reason.trim()" @click="confirm">确认 {{ ALERT_SUB_ACTION_LABEL[subAction] }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sub-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.sub-btn {
  background: rgba(5, 8, 14, 0.7); border: 1px solid rgba(107, 142, 173, 0.18);
  color: var(--hud-text-dim); padding: 8px 12px; cursor: pointer;
  border-radius: 6px; font-size: 11px; transition: all 0.2s ease;
  display: flex; flex-direction: column; gap: 2px; min-width: 80px; flex: 1;
  text-align: left;
}
.sub-btn:hover { border-color: rgba(197,168,123,0.4); color: var(--hud-text); background: rgba(197,168,123,0.06); }
.sub-btn.active { color: var(--hud-warn); border-color: var(--hud-warn); background: rgba(245, 158, 11, 0.12); box-shadow: 0 0 8px rgba(245, 158, 11, 0.12); }
.sub-btn-label { font-weight: 600; font-size: 11px; }
.sub-btn-hint { font-size: 9px; color: var(--hud-text-faint); font-weight: 400; }
.sub-btn.active .sub-btn-hint { color: rgba(245,158,11,0.7); }
.confirm-row { margin-top: 8px; }
.confirm-label { display: flex; align-items: center; gap: 6px; cursor: pointer; color: var(--hud-text-dim); font-size: 11px; }
.confirm-label input[type="checkbox"] { accent-color: var(--hud-warn); width: 14px; height: 14px; }
</style>
