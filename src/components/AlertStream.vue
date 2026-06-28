<script setup lang="ts">
// BroadcastCard —— 右面板：实时告警列表（增强版 - 自动轮播翻页，无滚动）
// 闭环入口：点击告警 → 打开告警详情弹窗（看证据）→ 远控复核 → 下单处置
// 联动选中关联机器人，便于地图聚焦

import { computed, ref, onMounted, onUnmounted } from "vue"
import { useAlerts } from "@/composables/useAlerts"
import { useLockState } from "@/composables/useLockState"
import { AlertSeverity, AlertStatus } from "@/types/alert"

const emit = defineEmits<{ (e: "ack-alert", alertId: string): void }>()

const { alerts } = useAlerts()
const { isLocked } = useLockState()

// 自动轮播翻页参数
const ALERT_PAGE_SIZE = 5
const ALERT_ITEM_H = 36
const alertPageHeight = ALERT_ITEM_H * ALERT_PAGE_SIZE
const alertList = computed(() => [...alerts.value].reverse().slice(0, 20))
const alertPages = computed(() => Math.max(1, Math.ceil(alertList.value.length / ALERT_PAGE_SIZE)))
const alertPage = ref(0)

let pageTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  pageTimer = setInterval(() => {
    if (alertPages.value <= 1) return
    alertPage.value = (alertPage.value + 1) % alertPages.value
  }, 4000)
})
onUnmounted(() => { if (pageTimer) clearInterval(pageTimer) })

function severityLabel(s: AlertSeverity): string {
  return { [AlertSeverity.CRITICAL]: "高危", [AlertSeverity.WARNING]: "中危", [AlertSeverity.INFO]: "低危" }[s]
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-CN", { hour12: false })
}

function onAlertClick(a: { id: string; robotId: string; status: AlertStatus }): void {
  if (isLocked.value) return
  if (a.status === AlertStatus.ACTIVE || a.status === AlertStatus.ACKED) {
    emit("ack-alert", a.id)
  }
}
</script>

<template>
  <section class="broadcast card" :class="{ 'broadcast--locked': isLocked }">
    <div class="card-header">
      <h3 class="panel-title">实时告警</h3>
      <div class="alert-ext-header-right">
        <span class="hud-tag" :class="{ 'hud-tag--locked': isLocked }">{{ isLocked ? '锁定态·仅查看' : '最新' }}</span>
        <span v-if="alertPages > 1" class="alert-ext-page-indicator">{{ alertPage + 1 }}/{{ alertPages }}</span>
      </div>
    </div>

    <!-- 锁定态遮罩提示 -->
    <div v-if="isLocked" class="lock-hint">🔒 锁定态：点击仅聚焦机器人，不弹处置窗</div>

    <!-- 自动轮播视口 -->
    <div class="broadcast-viewport">
      <div class="broadcast-track" :style="{ transform: `translateY(${-alertPage * alertPageHeight}px)` }">
        <div
          v-for="a in alertList" :key="a.id"
          class="broadcast-row"
          :class="[`is-${a.severity}`, { 'is-acked': a.status === AlertStatus.ACKED }]"
          :title="a.status === AlertStatus.ACKED ? '已处置' : (isLocked ? '锁定态仅查看' : '点击处置告警')"
          @click="onAlertClick(a)"
        >
          <span class="broadcast-row__time">{{ fmtTime(a.timestamp) }}</span>
          <span class="broadcast-row__title">{{ a.title }}</span>
          <span class="broadcast-row__loc">{{ a.description?.slice(0, 8) ?? '' }}</span>
          
          <div class="broadcast-row__tags">
            <span class="broadcast-row__sev">{{ severityLabel(a.severity) }}</span>
            <span class="broadcast-row__status">{{ a.status === AlertStatus.ACKED ? "已核" : "告警" }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 翻页指示器 -->
    <div v-if="alertPages > 1" class="ae-pagination">
      <span v-for="i in alertPages" :key="i" class="ae-dot" :class="{ active: alertPage === i - 1 }"></span>
    </div>
  </section>
</template>

<style scoped>
.card {
  background: rgba(8, 14, 26, 0.45);
  border: 1px solid rgba(0, 229, 255, 0.12);
  border-radius: 0.0600rem;
  backdrop-filter: blur(0.1200rem);
  display: flex;
  flex-direction: column;
  padding: 0.1400rem 0.1600rem;
  gap: 0.0400rem;
  box-shadow: 0 0.0400rem 0.2000rem rgba(0, 0, 0, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-ext-header-right { display: flex; align-items: center; gap: 0.0600rem; }
.alert-ext-page-indicator { font-size: 0.0900rem; color: var(--hud-text-faint); font-family: var(--hud-mono); }

.hud-tag {
  font-size: 0.1000rem;
  padding: 1px 0.0600rem;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.2);
  border-radius: 0.0300rem;
  color: #00E5FF;
  letter-spacing: 0.5px;
}
.hud-tag--locked { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); color: #F59E0B; }

.broadcast--locked .broadcast-row { cursor: default; }
.broadcast--locked .broadcast-row:hover { transform: none; }

.lock-hint {
  font-size: 0.0900rem; color: #F59E0B; padding: 0.0400rem 0.0800rem;
  background: rgba(245, 158, 11, 0.06); border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: 0.0300rem; text-align: center; letter-spacing: 0.5px;
}

/* 自动轮播视口 - 无滚动条 */
.broadcast-viewport {
  height: 180px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.03);
  background: rgba(5, 8, 14, 0.6);
  border-radius: 0.0600rem;
}

.broadcast-track {
  display: flex;
  flex-direction: column;
  gap: 0.0400rem;
  padding: 0.0800rem;
  transition: transform 0.5s ease;
}

.broadcast-row {
  display: flex;
  align-items: center;
  gap: 0.0600rem;
  font-size: 0.1100rem;
  color: #BCD2E7;
  padding: 0.0600rem 0.0800rem;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 0.0400rem;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 32px;
}

.broadcast-row:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateX(1px);
}

.broadcast-row.is-critical {
  color: #F87171;
  background: rgba(239, 68, 68, 0.03);
  border-color: rgba(239, 68, 68, 0.06);
}
.broadcast-row.is-critical:hover {
  background: rgba(239, 68, 68, 0.08);
}

.broadcast-row.is-warning {
  color: #FBBF24;
  background: rgba(245, 158, 11, 0.03);
  border-color: rgba(245, 158, 11, 0.06);
}
.broadcast-row.is-warning:hover {
  background: rgba(245, 158, 11, 0.08);
}

.broadcast-row.is-info {
  color: #34D399;
  background: rgba(16, 185, 129, 0.03);
  border-color: rgba(16, 185, 129, 0.06);
}
.broadcast-row.is-info:hover {
  background: rgba(16, 185, 129, 0.08);
}

.broadcast-row.is-acked {
  opacity: 0.4;
}

.broadcast-row__time {
  font-family: var(--hud-mono);
  font-size: 0.1000rem;
  color: var(--hud-text-dim);
  min-width: 0.5000rem;
}

.broadcast-row__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.1000rem;
}

.broadcast-row__loc {
  font-size: 0.0900rem;
  color: var(--hud-text-faint);
  min-width: 0.4000rem;
}

.broadcast-row__tags {
  display: flex;
  align-items: center;
  gap: 0.0400rem;
}

.broadcast-row__sev {
  font-size: 0.0800rem;
  padding: 1px 0.0400rem;
  border-radius: 0.0200rem;
  font-weight: 600;
}

.broadcast-row.is-critical .broadcast-row__sev {
  background: rgba(239, 68, 68, 0.15);
  color: #EF4444;
}

.broadcast-row.is-warning .broadcast-row__sev {
  background: rgba(245, 158, 11, 0.15);
  color: #F59E0B;
}

.broadcast-row.is-info .broadcast-row__sev {
  background: rgba(16, 185, 129, 0.15);
  color: #10B981;
}

.broadcast-row__status {
  font-size: 0.0800rem;
  color: var(--hud-text-dim);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1px 0.0400rem;
  border-radius: 0.0200rem;
}
.broadcast-row.is-critical .broadcast-row__status {
  border-color: rgba(239, 68, 68, 0.25);
  color: #EF4444;
}
.broadcast-row.is-warning .broadcast-row__status {
  border-color: rgba(245, 158, 11, 0.25);
  color: #F59E0B;
}
.broadcast-row.is-info .broadcast-row__status {
  border-color: rgba(16, 185, 129, 0.25);
  color: #10B981;
}

/* 翻页指示器 */
.ae-pagination { display: flex; justify-content: center; gap: 4px; margin-top: 2px; }
.ae-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(107,142,173,0.3); transition: all 0.3s; }
.ae-dot.active { background: #EF4444; width: 12px; border-radius: 3px; }
</style>
