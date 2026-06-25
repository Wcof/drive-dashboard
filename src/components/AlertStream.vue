<script setup lang="ts">
// BroadcastCard —— 右面板：实时告警列表

import { computed } from "vue"
import { useAlerts } from "@/composables/useAlerts"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { useRobots } from "@/composables/useRobots"
import { AlertSeverity, AlertStatus } from "@/types/alert"

const { alerts } = useAlerts()
const { select } = useSelectedRobot()
const { byId } = useRobots()

// Scroll list (latest 20 alerts)
const broadcastList = computed(() => [...alerts.value].reverse().slice(0, 20))

function severityLabel(s: AlertSeverity): string {
  return { [AlertSeverity.CRITICAL]: "高危", [AlertSeverity.WARNING]: "中危", [AlertSeverity.INFO]: "低危" }[s]
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-CN", { hour12: false })
}

function onAlertClick(robotId: string): void {
  if (byId(robotId).value) select(robotId)
}
</script>

<template>
  <section class="broadcast card">
    <div class="card-header">
      <h3 class="panel-title">实时告警</h3>
      <span class="hud-tag">最新</span>
    </div>

    <!-- 滚动播报 -->
    <div class="broadcast-viewport">
      <div class="broadcast-list">
        <div
          v-for="a in broadcastList" :key="a.id"
          class="broadcast-row"
          :class="[`is-${a.severity}`, { 'is-acked': a.status === AlertStatus.ACKED }]"
          @click="onAlertClick(a.robotId)"
        >
          <span class="broadcast-row__time">{{ fmtTime(a.timestamp) }}</span>
          <span class="broadcast-row__title" :title="a.title">{{ a.title }}</span>
          
          <div class="broadcast-row__tags">
            <span class="broadcast-row__sev">{{ severityLabel(a.severity) }}</span>
            <span class="broadcast-row__status">{{ a.status === AlertStatus.ACKED ? "已核" : "告警" }}</span>
          </div>
        </div>
      </div>
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
  gap: 0.1200rem;
  box-shadow: 0 0.0400rem 0.2000rem rgba(0, 0, 0, 0.3);
  min-height: 1.8000rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hud-tag {
  font-size: 0.1000rem;
  padding: 1px 0.0600rem;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.2);
  border-radius: 0.0300rem;
  color: #00E5FF;
  letter-spacing: 0.5px;
}

/* 滚动播报区 */
.broadcast-viewport {
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.03);
  background: rgba(5, 8, 14, 0.6);
  border-radius: 0.0600rem;
  height: 1.3000rem;
  overflow: hidden;
  position: relative;
}

.broadcast-list {
  display: flex;
  flex-direction: column;
  gap: 0.0600rem;
  padding: 0.0800rem;
  overflow-y: auto;
  height: 100%;
}

.broadcast-row {
  display: flex;
  align-items: center;
  gap: 0.1000rem;
  font-size: 0.1100rem;
  color: #BCD2E7;
  padding: 0.0600rem 0.1000rem;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 0.0400rem;
  cursor: pointer;
  transition: all 0.2s ease;
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
  min-width: 0.5200rem;
}

.broadcast-row__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.broadcast-row__tags {
  display: flex;
  align-items: center;
  gap: 0.0400rem;
}

.broadcast-row__sev {
  font-size: 0.0900rem;
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
  font-size: 0.0900rem;
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
</style>
