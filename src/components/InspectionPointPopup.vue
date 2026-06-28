<script setup lang="ts">
// InspectionPointPopup —— 巡检点弹窗（复刻参考页面 showInspectionPointPopup）
// 三 tab：最新影像 / 巡检告警 + 光学/热成像视角切换 + 影像网格

import { ref, computed, watch } from "vue"
import { useDashboard } from "@/composables/useDashboard"
import { makeMockImg, pointPhotoFilter } from "@/utils/mockImage"
import { coordsMatch } from "@/utils/siteCoord"
import { INSPECTION_POINT_COORDS } from "@/mock/seedDashboard"
import type { AlertExt } from "@/types/dashboard"

const props = defineProps<{ pointId: string }>()
const { currentInspectionPoint, currentTask, alertsExt, openEvidenceModal, setFocus } = useDashboard()

const tab = ref<"media" | "alert">("media")
const mediaMode = ref<"optical" | "thermal">("optical")
const alertMode = ref<"optical" | "thermal">("optical")

const point = computed(() => {
  if (currentInspectionPoint.value?.id === props.pointId) return currentInspectionPoint.value
  return null
})

const pointCoords = computed(() => INSPECTION_POINT_COORDS[props.pointId])
const pointAlert = computed<AlertExt | null>(() => {
  const c = pointCoords.value
  if (!c) return null
  return alertsExt.value.find((a) => coordsMatch(a.coords, c, 0.0005)) ?? null
})

watch(pointAlert, (a) => { if (a) tab.value = "alert" }, { immediate: true })

const statusMap: Record<string, string> = { running: "巡检中", pending: "待巡检", completed: "已完成", warn: "有告警", danger: "严重告警" }
const statusTag: Record<string, string> = { running: "gold", pending: "smog", completed: "safe", warn: "warn", danger: "warn" }
const visitStats = computed(() => {
  const base = point.value?.status === "pending" ? 0 : point.value?.status === "running" ? 2 : 3
  return { total: 4 + base, normal: 2 + base, temporary: 2 }
})
const inspectTimeText = computed(() => {
  if (point.value?.status === "pending") return "待巡检"
  return "10:15 - 10:32"
})

const pointImgs = computed(() => ({
  optical: [
    currentTask.value?.bgImg || makeMockImg(`${point.value?.name ?? ''} 光学总览`, "#1f3047", "#3d5e7f"),
    makeMockImg(`${point.value?.name ?? ''} 阀体`, "#1e2f42", "#44638b"),
    makeMockImg(`${point.value?.name ?? ''} 接线端子`, "#20344f", "#3f5c7f"),
    makeMockImg(`${point.value?.name ?? ''} 外观面板`, "#273e55", "#476784"),
  ],
  thermal: [
    makeMockImg(`${point.value?.name ?? ''} 热成像总览`, "#3a1f1f", "#5f382a"),
    makeMockImg(`${point.value?.name ?? ''} 法兰热斑`, "#4b241f", "#743b2a"),
    makeMockImg(`${point.value?.name ?? ''} 轴承温升`, "#442121", "#63392d"),
    makeMockImg(`${point.value?.name ?? ''} 电缆温差`, "#3a1c23", "#5f2d36"),
  ],
}))

const alertImgs = computed(() => ({
  optical: [
    pointAlert.value?.bgImg || pointImgs.value.optical[0],
    makeMockImg(`${point.value?.name ?? ''} 告警-阀体`, "#4e1d1d", "#6d3434"),
    makeMockImg(`${point.value?.name ?? ''} 告警-接线`, "#491f2a", "#6c2f41"),
    makeMockImg(`${point.value?.name ?? ''} 告警-机壳`, "#50282a", "#723f36"),
  ],
  thermal: [
    makeMockImg(`${point.value?.name ?? ''} 告警热成像1`, "#431c1c", "#6e3b2b"),
    makeMockImg(`${point.value?.name ?? ''} 告警热成像2`, "#4e2017", "#7a4329"),
    makeMockImg(`${point.value?.name ?? ''} 告警热成像3`, "#55241a", "#7b472d"),
    makeMockImg(`${point.value?.name ?? ''} 告警热成像4`, "#44211f", "#6b3e33"),
  ],
}))

const envOverview = computed(() => {
  const metrics = point.value?.monitorPoints?.[0]?.metrics ?? {}
  return Object.entries(metrics).slice(0, 6).map(([k, m]) => ({ k, icon: m.icon, label: m.label, value: m.value }))
})

const mediaFilter = computed(() => pointPhotoFilter(mediaMode.value))
const alertFilterStyle = computed(() => pointPhotoFilter(alertMode.value))

function openMediaCell(img: string, label: string): void {
  openEvidenceModal({
    image: img,
    title: `${point.value?.name ?? ''} | ${currentTask.value?.bot ?? '--'} | ${inspectTimeText.value}`,
    device: point.value?.name ?? '',
    meta: `${label} | ${point.value?.status === 'pending' ? '待巡检' : '已采集'}`,
    thumbs: (pointImgs.value[mediaMode.value] || pointImgs.value.optical).map((t, i) => ({ img: t, label: `${mediaMode.value === 'optical' ? '光学项' : '热成像项'}${i + 1}` })),
  })
}

function openAlertCell(img: string, label: string): void {
  openEvidenceModal({
    image: img,
    title: `${point.value?.name ?? ''} | ${currentTask.value?.bot ?? '--'} | ${inspectTimeText.value}`,
    device: point.value?.name ?? '',
    meta: `${label} | 告警影像`,
    thumbs: (alertImgs.value[alertMode.value] || alertImgs.value.optical).map((t, i) => ({ img: t, label: `${alertMode.value === 'optical' ? '告警项' : '热成像项'}${i + 1}` })),
  })
}

function focusAlert(): void {
  if (pointAlert.value) setFocus("alert", pointAlert.value.id)
}
</script>

<template>
  <div v-if="point" class="map-popup">
    <div class="popup-header">
      <span class="popup-title">{{ point.name }}</span>
      <span class="tag" :class="statusTag[point.status] || 'smog'">{{ statusMap[point.status] || point.status }}</span>
      <span class="popup-close-btn" @click="$emit('close')">✕</span>
    </div>
    <div class="popup-body">
      <div class="popup-stats">
        <div class="popup-stat"><span class="popup-stat-label">巡检点名称</span><span class="popup-stat-value">{{ point.name }}</span></div>
        <div class="popup-stat"><span class="popup-stat-label">今日巡检次数</span><span class="popup-stat-value">{{ visitStats.total }}次</span></div>
        <div class="popup-stat"><span class="popup-stat-label">时间间隔</span><span class="popup-stat-value">每2小时/次</span></div>
        <div class="popup-stat"><span class="popup-stat-label">时间范围</span><span class="popup-stat-value">{{ inspectTimeText }}</span></div>
        <div class="popup-stat"><span class="popup-stat-label">最近采集时间</span><span class="popup-stat-value">{{ point.status === 'pending' ? '待采集' : '10:32' }}</span></div>
      </div>
      <div class="point-photo-section">
        <div class="popup-metrics-title">巡检信息</div>
        <div class="point-photo-tabs">
          <button class="point-photo-tab" :class="{ active: tab === 'media' }" @click="tab = 'media'">最新影像</button>
          <button class="point-photo-tab" :class="{ active: tab === 'alert', disabled: !pointAlert }" :disabled="!pointAlert" @click="tab = 'alert'">巡检告警</button>
        </div>
        <div v-if="tab === 'media'" class="point-media-panel">
          <div class="point-photo-tabs" style="margin-top:0.0800rem">
            <button class="point-photo-tab" :class="{ active: mediaMode === 'optical' }" @click="mediaMode = 'optical'">光学视角</button>
            <button class="point-photo-tab" :class="{ active: mediaMode === 'thermal' }" @click="mediaMode = 'thermal'">热成像视角</button>
          </div>
          <div class="point-photo-grid">
            <button v-for="(img, idx) in pointImgs[mediaMode]" :key="idx" class="point-photo-cell" @click="openMediaCell(img, `${mediaMode === 'optical' ? '光学项' : '热成像项'}${idx + 1}`)">
              <span class="point-photo-cell-img" :style="{ backgroundImage: `url('${img}')`, filter: mediaFilter }"></span>
              <span class="point-photo-cell-label">{{ mediaMode === 'optical' ? '光学项' : '热成像项' }}{{ idx + 1 }}</span>
            </button>
          </div>
        </div>
        <div v-if="tab === 'alert' && pointAlert" class="point-alert-panel">
          <div class="point-photo-tabs" style="margin-bottom:0.0800rem">
            <button class="point-photo-tab" :class="{ active: alertMode === 'optical' }" @click="alertMode = 'optical'">光学视角</button>
            <button class="point-photo-tab" :class="{ active: alertMode === 'thermal' }" @click="alertMode = 'thermal'">热成像视角</button>
          </div>
          <div class="point-photo-grid">
            <button v-for="(img, idx) in alertImgs[alertMode]" :key="idx" class="point-photo-cell" @click="openAlertCell(img, `${alertMode === 'optical' ? '告警项' : '热成像项'}${idx + 1}`)">
              <span class="point-photo-cell-img" :style="{ backgroundImage: `url('${img}')`, filter: alertFilterStyle }"></span>
              <span class="point-photo-cell-label">{{ alertMode === 'optical' ? '告警项' : '热成像项' }}{{ idx + 1 }}</span>
            </button>
          </div>
          <div class="point-alert-info">
            <div class="alert-time">{{ pointAlert.time }} {{ pointAlert.state }}</div>
            <div class="alert-defect">{{ pointAlert.defect }}</div>
            <div class="alert-device">设备：{{ pointAlert.device }}</div>
            <button class="point-alert-btn" @click="focusAlert">前往风险详情</button>
          </div>
        </div>
        <div v-if="tab === 'alert' && !pointAlert" class="point-alert-dim">当前点位暂无告警</div>
      </div>
      <div class="popup-metrics-section">
        <div class="popup-metrics-title">当前节点环境指标概览</div>
        <div class="point-env-grid">
          <div v-for="m in envOverview" :key="m.k" class="point-env-card">
            <span class="pev-name">{{ m.icon }} {{ m.label }}</span>
            <span class="pev-val">{{ m.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-popup { width: 3.8000rem; background: rgba(10,16,26,0.92); border: 1px solid rgba(197,168,123,0.4); border-radius: 0.0800rem; box-shadow: 0 0.1200rem 0.4000rem rgba(0,0,0,0.6); color: var(--hud-text); font-size: 0.1200rem; }
.popup-header { display: flex; align-items: center; gap: 0.0800rem; padding: 0.1000rem 0.1400rem; border-bottom: 1px solid rgba(197,168,123,0.22); }
.popup-title { font-size: 0.1300rem; color: var(--hud-text); font-weight: 500; letter-spacing: 1px; }
.tag { padding: 0.0200rem 0.0800rem; border-radius: 0.0300rem; font-size: 0.1100rem; }
.tag.gold { background: rgba(197,168,123,0.18); color: var(--hud-accent); border: 1px solid rgba(197,168,123,0.4); }
.tag.smog { background: rgba(107,142,173,0.18); color: #6B8EAD; border: 1px solid rgba(107,142,173,0.4); }
.tag.safe { background: rgba(34,197,94,0.18); color: #22C55E; border: 1px solid rgba(34,197,94,0.4); }
.tag.warn { background: rgba(245,158,11,0.18); color: #F59E0B; border: 1px solid rgba(245,158,11,0.4); }
.popup-close-btn { margin-left: auto; cursor: pointer; color: var(--hud-text-dim); font-size: 0.1400rem; }
.popup-body { padding: 0.1200rem 0.1400rem; }
.popup-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.0800rem; margin-bottom: 0.1200rem; }
.popup-stat { display: flex; flex-direction: column; gap: 0.0200rem; }
.popup-stat-label { font-size: 0.1000rem; color: var(--hud-text-dim); letter-spacing: 0.5px; }
.popup-stat-value { font-size: 0.1200rem; color: var(--hud-text); }
.point-photo-section { margin: 0.1000rem 0; }
.popup-metrics-title { font-size: 0.1100rem; color: var(--hud-accent); margin-bottom: 0.0600rem; letter-spacing: 1px; }
.point-photo-tabs { display: flex; gap: 0.0600rem; }
.point-photo-tab { padding: 0.0400rem 0.1000rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(107,142,173,0.22); color: var(--hud-text-dim); border-radius: 0.0300rem; cursor: pointer; font-size: 0.1100rem; }
.point-photo-tab.active { color: var(--hud-accent); border-color: var(--hud-accent); background: rgba(197,168,123,0.12); }
.point-photo-tab.disabled { opacity: 0.4; cursor: not-allowed; }
.point-photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.0600rem; margin-top: 0.0800rem; }
.point-photo-cell { background: rgba(0,0,0,0.3); border: 1px solid rgba(107,142,173,0.22); border-radius: 0.0300rem; cursor: pointer; padding: 0.0400rem; }
.point-photo-cell:hover { border-color: rgba(197,168,123,0.5); }
.point-photo-cell-img { display: block; width: 100%; height: 0.7000rem; background-size: cover; background-position: center; border-radius: 0.0200rem; }
.point-photo-cell-label { display: block; margin-top: 0.0400rem; font-size: 0.1000rem; color: var(--hud-text-dim); text-align: center; }
.point-alert-info { margin-top: 0.1000rem; padding: 0.0800rem; background: rgba(0,0,0,0.3); border-radius: 0.0300rem; }
.alert-time { color: var(--hud-text); font-size: 0.1100rem; }
.alert-defect { margin-top: 0.0400rem; color: #FCA5A5; }
.alert-device { margin-top: 0.0400rem; color: var(--hud-text-dim); font-size: 0.1100rem; }
.point-alert-btn { margin-top: 0.0800rem; padding: 0.0400rem 0.1200rem; background: rgba(245,158,11,0.18); border: 1px solid rgba(245,158,11,0.4); color: #F59E0B; border-radius: 0.0300rem; cursor: pointer; font-size: 0.1100rem; }
.point-alert-btn:hover { background: rgba(245,158,11,0.28); }
.point-alert-dim { margin-top: 0.0800rem; padding: 0.1200rem; text-align: center; color: var(--hud-text-dim); background: rgba(0,0,0,0.2); border-radius: 0.0300rem; }
.point-env-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.0600rem; }
.point-env-card { display: flex; flex-direction: column; gap: 0.0200rem; padding: 0.0600rem 0.0800rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(107,142,173,0.18); border-radius: 0.0300rem; }
.pev-name { font-size: 0.1000rem; color: var(--hud-text-dim); }
.pev-val { font-size: 0.1100rem; color: var(--hud-text); font-family: var(--hud-mono); }
</style>
