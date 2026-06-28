<script setup lang="ts">
// AlertDetailModal —— 告警详情弹窗（复刻参考页面 alert-modal）
// 含：告警描述 + 证据影像 tab（可见光/热红外/异状片段）+ 对比差异 + 处置操作（确认/清除/撤销）
// 闭环：看证据 → 远控复核 → 下单处置，处置操作写入 audit-log 留痕

import { computed, ref } from "vue"
import { useDashboard } from "@/composables/useDashboard"
import { addAuditLog } from "@/composables/useAuditLog"
import { makeMockImg, evidenceFilter } from "@/utils/mockImage"
import { useLockState } from "@/composables/useLockState"

const { currentAlert, openEvidenceModal, setEvidenceMode, confirmAlert, clearAlert, undoAlert, closeAlertDetailModal, state, openControlModal, robotsExt } = useDashboard()
const { isLocked } = useLockState()

const evMode = ref<"normal" | "thermal" | "video">("normal")
const filterStyle = computed(() => evidenceFilter(evMode.value))

function setMode(m: "normal" | "thermal" | "video"): void {
  evMode.value = m
  setEvidenceMode(m)
}

const taskName = computed(() => currentAlert.value?.taskId ?? "")

// 通过 taskId 找机器人 ID（闭环联动：处置告警可切入对应机器人远控）
const botId = computed(() => {
  if (!currentAlert.value) return ""
  const tid = currentAlert.value.taskId
  const r = robotsExt.value.find((x) => x.taskId === tid)
  return r?.id ?? state.currentRobotId ?? "—"
})
// 获取机器人名称
const botName = computed(() => {
  const id = botId.value
  if (!id || id === "—") return "未关联"
  const r = robotsExt.value.find((x) => x.id === id)
  return r?.task ? `${id} (${r.label})` : id
})

const lvlLabel = computed(() => {
  const l = currentAlert.value?.level
  return l === "danger" ? "严重" : l === "warn" ? "警告" : "提示"
})

const alertThumbs = computed(() => {
  if (!currentAlert.value) return []
  return [
    { img: currentAlert.value.bgImg, label: "告警主视角" },
    { img: makeMockImg(`${currentAlert.value.device} 热异常`, "#4b1f1f", "#7a3f2f"), label: "热异常" },
    { img: makeMockImg(`${currentAlert.value.device} 接线端子`, "#213045", "#3d6288"), label: "接线端子" },
    { img: makeMockImg(`${currentAlert.value.device} 仪表区`, "#2b3341", "#4d6076"), label: "仪表区" },
  ]
})

const hasUndo = computed(() => !!state.lastAlertAction)

// 处置闭环：确认发单 + 写审计留痕
function onConfirm(): void {
  confirmAlert()
  if (currentAlert.value) {
    addAuditLog({ action: "ack_alert", operator: "current", targetId: currentAlert.value.id, targetType: "alert", reason: "确认发单处置" })
  }
}

// 处置闭环：现场已查无异常（消警）+ 写审计留痕
function onClear(): void {
  clearAlert()
  if (currentAlert.value) {
    addAuditLog({ action: "ack_alert", operator: "current", targetId: currentAlert.value.id, targetType: "alert", reason: "现场已查无异常（消警）" })
  }
}

// 处置闭环：撤销上次操作 + 写审计留痕
function onUndo(): void {
  undoAlert()
  if (state.lastAlertAction) {
    addAuditLog({ action: "ack_alert", operator: "current", targetId: state.lastAlertAction.alertId, targetType: "alert", reason: "撤销上次处置操作" })
  }
}

// 远控复核：切入对应机器人控制台（闭环关键步骤）
function onRemoteReview(): void {
  if (botId.value && botId.value !== "—") {
    state.currentRobotId = botId.value
    openControlModal(botId.value)
  }
}
</script>

<template>
  <div v-if="currentAlert" class="alert-modal-mask" @click.self="closeAlertDetailModal">
    <div class="alert-modal">
      <div class="alert-modal-close" @click="closeAlertDetailModal">×</div>
      <div class="alert-modal-header">
        <h3 class="alert-modal-title">巡检告警详情 · {{ currentAlert.id }}</h3>
      </div>
      <div class="alert-modal-body">
        <div class="alert-row" :class="currentAlert.level">
          <div class="a-ctx">
            <span class="a-time">{{ currentAlert.time }}</span>
            <span class="a-level" :class="currentAlert.level">{{ lvlLabel }}</span>
            <span class="a-state">{{ currentAlert.state }}</span>
          </div>
          <div class="a-desc">
            <strong><span class="danger-txt">[{{ currentAlert.defect.split('(')[0] }}]</span> 任务:</strong> {{ taskName }}<br>
            <strong>机体:</strong> {{ botName }} | <strong>点位:</strong> {{ currentAlert.loc }} ({{ currentAlert.device }})<br>
            <strong :style="{ color: `var(--hud-${currentAlert.level === 'danger' ? 'danger' : currentAlert.level === 'warn' ? 'warn' : 'ok'})` }">缺陷详情:</strong> {{ currentAlert.defect }}<br>
            <div class="a-compare">
              上次({{ currentAlert.lastTime }}): {{ currentAlert.lastResult }}
              <span class="a-comp">对比差异: {{ currentAlert.comp }}</span>
            </div>
          </div>
        </div>

        <div class="alert-evi-inline">
          <div class="evi-tabs">
            <button class="e-tab" :class="{ active: evMode === 'normal' }" @click="setMode('normal')">可见光追踪</button>
            <button class="e-tab" :class="{ active: evMode === 'thermal' }" @click="setMode('thermal')">热红外追踪</button>
            <button class="e-tab" :class="{ active: evMode === 'video' }" @click="setMode('video')">巡检异状片段</button>
          </div>
          <div class="evi-frame" @click="openEvidenceModal({ image: currentAlert.bgImg, title: `${currentAlert.device} ${botId} | ${currentAlert.time}`, device: currentAlert.device, meta: `${botId} | ${currentAlert.time}`, thumbs: alertThumbs })">
            <div class="evi-mock" :style="{ backgroundImage: `url('${currentAlert.bgImg}')`, filter: filterStyle }"></div>
            <div class="target-box"><span class="target-lbl">{{ currentAlert.targetLabel }}</span></div>
          </div>
          <div class="evi-meta">
            <span :class="currentAlert.eviClass">{{ currentAlert.eviResult }}</span>
            <span class="evi-tip">点击图片放大查看</span>
          </div>
        </div>

        <div class="alert-actions">
          <button v-if="!hasUndo && !isLocked" class="alert-btn review" @click="onRemoteReview">远控复核</button>
          <button v-if="!hasUndo && !isLocked" class="alert-btn confirm" @click="onConfirm">确认发单处置</button>
          <button v-if="!hasUndo && !isLocked" class="alert-btn clear" @click="onClear">现场已查无异常</button>
          <button v-if="hasUndo && !isLocked" class="alert-btn undo" @click="onUndo">撤销上次操作</button>
          <div v-if="isLocked && !hasUndo" class="alert-btn-lockhint">🔒 锁定态：仅查看证据，解锁后可处置</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alert-modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(0.1000rem); }
.alert-modal { width: 90%; max-width: 8.0000rem; background: rgba(10,16,26,0.92); border: 1px solid rgba(197,168,123,0.4); border-radius: 0.0800rem; padding: 0.2400rem; position: relative; }
.alert-modal-close { position: absolute; top: 0.1600rem; right: 0.2000rem; font-size: 0.2800rem; color: #fff; cursor: pointer; }
.alert-modal-header { margin-bottom: 0.2000rem; padding-bottom: 0.1600rem; border-bottom: 1px solid rgba(107,142,173,0.22); }
.alert-modal-title { margin: 0; font-size: 0.1800rem; color: var(--hud-accent); letter-spacing: 0.0200rem; }
.alert-row { padding: 0.1200rem; border-left: 0.0300rem solid; border-radius: 0.0300rem; background: rgba(0,0,0,0.3); margin-bottom: 0.1600rem; }
.alert-row.danger { border-left-color: #EF4444; }
.alert-row.warn { border-left-color: #F59E0B; }
.alert-row.safe { border-left-color: #22C55E; }
.a-ctx { display: flex; gap: 0.0800rem; align-items: center; margin-bottom: 0.0600rem; }
.a-time { font-family: var(--hud-mono); color: var(--hud-text); }
.a-level { padding: 0.0200rem 0.0800rem; border-radius: 0.0200rem; font-size: 0.1100rem; }
.a-level.danger { background: rgba(239,68,68,0.18); color: #EF4444; }
.a-level.warn { background: rgba(245,158,11,0.18); color: #F59E0B; }
.a-level.safe { background: rgba(34,197,94,0.18); color: #22C55E; }
.a-state { color: var(--hud-text-dim); font-size: 0.1100rem; }
.a-desc { font-size: 0.1200rem; line-height: 1.7; color: var(--hud-text); }
.a-desc strong { color: var(--hud-text-dim); font-weight: 500; }
.danger-txt { color: #FCA5A5; }
.a-compare { font-size: 0.1000rem; margin-top: 0.0600rem; padding-top: 0.0600rem; border-top: 1px dashed rgba(255,255,255,0.1); color: var(--hud-text-dim); }
.a-comp { margin-left: 0.0800rem; color: var(--hud-text-sub); }
.alert-evi-inline { margin-top: 0.1200rem; padding: 0.1200rem; background: rgba(0,0,0,0.3); border-radius: 0.0300rem; }
.evi-tabs { display: flex; gap: 0.0800rem; margin-bottom: 0.0800rem; }
.e-tab { padding: 0.0400rem 0.1000rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 0.0300rem; cursor: pointer; font-size: 0.1100rem; }
.e-tab.active { color: var(--hud-accent); border-color: var(--hud-accent); background: rgba(197,168,123,0.12); }
.evi-frame { height: 1.8000rem; cursor: pointer; border: 1px solid rgba(107,142,173,0.22); border-radius: 0.0300rem; position: relative; overflow: hidden; }
.evi-mock { width: 100%; height: 100%; background-size: cover; background-position: center; transition: filter 0.3s ease; }
.target-box { position: absolute; top: 30%; left: 40%; width: 0.8000rem; height: 0.5000rem; border: 0.0200rem solid #EF4444; border-radius: 0.0200rem; display: flex; align-items: flex-start; }
.target-lbl { position: absolute; top: -0.1600rem; left: 0; font-size: 0.1000rem; color: #FCA5A5; background: rgba(0,0,0,0.6); padding: 1px 0.0400rem; border-radius: 0.0200rem; white-space: nowrap; }
.evi-meta { font-size: 0.1000rem; margin-top: 0.0600rem; display: flex; justify-content: space-between; }
.evi-tip { color: var(--hud-accent); }
.safe-txt { color: #22C55E; }
.warn-txt { color: #F59E0B; }
.danger-txt { color: #FCA5A5; }
.dim { color: var(--hud-text-dim); }
.alert-actions { margin-top: 0.1600rem; display: flex; gap: 0.1000rem; }
.alert-btn { flex: 1; padding: 0.1000rem; border-radius: 0.0400rem; cursor: pointer; font-size: 0.1200rem; letter-spacing: 1px; border: 1px solid; transition: all 0.2s ease; }
.alert-btn.confirm { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.4); color: #F59E0B; }
.alert-btn.confirm:hover { background: rgba(245,158,11,0.25); }
.alert-btn.clear { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.4); color: #22C55E; }
.alert-btn.clear:hover { background: rgba(34,197,94,0.25); }
.alert-btn.undo { background: rgba(107,142,173,0.15); border-color: rgba(107,142,173,0.4); color: #6B8EAD; }
.alert-btn.undo:hover { background: rgba(107,142,173,0.25); }
.alert-btn.review { background: rgba(0,229,255,0.15); border-color: rgba(0,229,255,0.4); color: #00E5FF; }
.alert-btn.review:hover { background: rgba(0,229,255,0.25); }
.alert-btn-lockhint { flex: 1; padding: 0.1000rem; text-align: center; font-size: 0.1200rem; color: var(--hud-warn); background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.3); border-radius: 0.0400rem; letter-spacing: 1px; }
</style>
