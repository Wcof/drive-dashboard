<script setup lang="ts">
// InspectionExpiryPanel —— 强检设备到期提醒面板（自动轮播翻页，无滚动）
import { ref, computed, onMounted, onUnmounted } from "vue"
import { seedInspectionExpiry } from "@/mock/seedDashboard"
import type { InspectionExpiryItem } from "@/types/dashboard"

const emit = defineEmits<{ (e: "show-detail", itemId: string): void }>()

const items = computed<InspectionExpiryItem[]>(() => seedInspectionExpiry)
const sortedItems = computed(() => [...items.value].sort((a, b) => a.daysRemaining - b.daysRemaining))

// 自动轮播翻页参数
const PAGE_SIZE = 3
const ITEM_H = 72
const pageHeight = ITEM_H * PAGE_SIZE
const totalPages = computed(() => Math.max(1, Math.ceil(sortedItems.value.length / PAGE_SIZE)))
const currentPage = ref(0)

let pageTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  pageTimer = setInterval(() => {
    if (totalPages.value <= 1) return
    currentPage.value = (currentPage.value + 1) % totalPages.value
  }, 5000)
})
onUnmounted(() => { if (pageTimer) clearInterval(pageTimer) })

// 紧迫程度分组统计
const criticalCount = computed(() => items.value.filter(i => i.daysRemaining <= 0).length)
const urgentCount = computed(() => items.value.filter(i => i.daysRemaining > 0 && i.daysRemaining <= 5).length)
const warningCount = computed(() => items.value.filter(i => i.daysRemaining > 5 && i.daysRemaining <= 15).length)
const normalCount = computed(() => items.value.filter(i => i.daysRemaining > 15).length)

function daysLabel(d: number): string {
  if (d <= 0) return "已过期"
  if (d === 1) return "明天到期"
  return `${d}天后到期`
}
function statusClass(d: number): string {
  if (d <= 0) return "exp-critical"
  if (d <= 5) return "exp-urgent"
  if (d <= 15) return "exp-warn"
  return "exp-normal"
}
function progressPct(d: number): number {
  return Math.min(100, Math.max(0, Math.round((1 - d / 30) * 100)))
}
</script>

<template>
  <section class="expiry-panel card">
    <div class="card-header">
      <h3 class="panel-title">强检设备到期提醒</h3>
      <span class="hud-tag" :class="{ 'has-critical': criticalCount > 0 }">
        {{ criticalCount > 0 ? `${criticalCount}项过期` : `${items.length}台设备` }}
      </span>
    </div>

    <!-- 紧迫概况 -->
    <div class="expiry-summary">
      <div class="es-item es-critical" :class="{ active: criticalCount > 0 }">
        <span class="es-val">{{ criticalCount }}</span>
        <span class="es-label">已过期</span>
      </div>
      <div class="es-item es-urgent" :class="{ active: urgentCount > 0 }">
        <span class="es-val">{{ urgentCount }}</span>
        <span class="es-label">5天内</span>
      </div>
      <div class="es-item es-warn">
        <span class="es-val">{{ warningCount }}</span>
        <span class="es-label">15天内</span>
      </div>
      <div class="es-item es-normal">
        <span class="es-val">{{ normalCount }}</span>
        <span class="es-label">30天内</span>
      </div>
    </div>

    <!-- 自动轮播列表（无滚动条） -->
    <div class="expiry-viewport">
      <div class="expiry-track" :style="{ transform: `translateY(${-currentPage * pageHeight}px)` }">
        <div
          v-for="item in sortedItems"
          :key="item.id"
          class="expiry-item"
          :class="[statusClass(item.daysRemaining), { 'expiry-item--clickable': true }]"
          title="点击查看设备详情（检验周期表 + 控制措施）"
          @click="emit('show-detail', item.id)"
        >
          <div class="ei-header">
            <span class="ei-name">{{ item.name }}</span>
            <span class="ei-badge" :class="statusClass(item.daysRemaining)">{{ daysLabel(item.daysRemaining) }}</span>
          </div>
          <div class="ei-meta">
            <span class="ei-location">📍 {{ item.location }}</span>
            <span class="ei-cat">{{ item.category }}</span>
          </div>
          <div class="ei-prog-track">
            <div class="ei-prog-fill" :class="statusClass(item.daysRemaining)" :style="{ width: progressPct(item.daysRemaining) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 翻页指示器 -->
    <div v-if="totalPages > 1" class="expiry-pagination">
      <span v-for="i in totalPages" :key="i" class="expiry-dot" :class="{ active: currentPage === i - 1 }"></span>
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
  padding: 0.1000rem 0.1200rem;
  gap: 0.0800rem;
  box-shadow: 0 0.0400rem 0.2000rem rgba(0, 0, 0, 0.3);
}

.card-header { display: flex; justify-content: space-between; align-items: center; }

.hud-tag {
  font-size: 0.0900rem; padding: 1px 0.0500rem;
  background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 0.0200rem; color: #00E5FF; letter-spacing: 0.5px;
}
.hud-tag.has-critical {
  background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.3); color: #EF4444;
}

.expiry-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.0300rem; }
.es-item {
  display: flex; flex-direction: column; align-items: center; gap: 0.0200rem;
  padding: 0.0300rem 0; background: rgba(0, 0, 0, 0.2);
  border-radius: 0.0400rem; border: 1px solid transparent;
}
.es-item.active { border-color: rgba(239, 68, 68, 0.25); }
.es-val { font-family: var(--hud-mono); font-size: 0.1400rem; font-weight: 700; color: #FFFFFF; }
.es-label { font-size: 0.0800rem; color: var(--hud-text-dim); }
.es-critical .es-val { color: #EF4444; }
.es-urgent .es-val { color: #F59E0B; }
.es-warn .es-val { color: var(--hud-accent); }
.es-normal .es-val { color: #22C55E; }

/* 自动轮播视口 */
.expiry-viewport { height: 216px; overflow: hidden; position: relative; }
.expiry-track { display: flex; flex-direction: column; gap: 0.0400rem; transition: transform 0.5s ease; }

.expiry-item {
  background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(107, 142, 173, 0.18);
  border-radius: 0.0400rem; padding: 0.0500rem 0.0800rem;
  display: flex; flex-direction: column; gap: 0.0300rem;
  border-left: 3px solid; transition: all 0.2s ease; height: 68px;
}
.expiry-item--clickable { cursor: pointer; }
.expiry-item--clickable:hover { border-color: rgba(197, 168, 123, 0.5); transform: translateX(2px); box-shadow: 0 0 0.0800rem rgba(197, 168, 123, 0.1); }
.expiry-item.exp-critical { border-left-color: #EF4444; }
.expiry-item.exp-urgent { border-left-color: #F59E0B; }
.expiry-item.exp-warn { border-left-color: var(--hud-accent); }
.expiry-item.exp-normal { border-left-color: #22C55E; }

.ei-header { display: flex; justify-content: space-between; align-items: center; }
.ei-name { font-size: 0.1000rem; color: #FFFFFF; font-weight: 500; }
.ei-badge {
  font-size: 0.0800rem; padding: 1px 0.0400rem; border-radius: 0.0200rem; font-weight: 600; flex-shrink: 0;
}
.ei-badge.exp-critical { background: rgba(239, 68, 68, 0.15); color: #EF4444; }
.ei-badge.exp-urgent { background: rgba(245, 158, 11, 0.15); color: #F59E0B; }
.ei-badge.exp-warn { background: rgba(197, 168, 123, 0.12); color: var(--hud-accent); }
.ei-badge.exp-normal { background: rgba(34, 197, 94, 0.12); color: #22C55E; }

.ei-meta { display: flex; justify-content: space-between; font-size: 0.0800rem; color: var(--hud-text-dim); }
.ei-cat { background: rgba(255, 255, 255, 0.04); padding: 0 0.0400rem; border-radius: 0.0200rem; }
.ei-prog-track { height: 0.0300rem; background: rgba(255, 255, 255, 0.06); border-radius: 0.0200rem; overflow: hidden; }
.ei-prog-fill { height: 100%; border-radius: 0.0200rem; transition: width 0.4s ease; }
.ei-prog-fill.exp-critical { background: linear-gradient(90deg, #EF4444, #F87171); }
.ei-prog-fill.exp-urgent { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
.ei-prog-fill.exp-warn { background: linear-gradient(90deg, var(--hud-accent), #C5A87B); }
.ei-prog-fill.exp-normal { background: linear-gradient(90deg, #22C55E, #34D399); }

/* 翻页指示器 */
.expiry-pagination { display: flex; justify-content: center; gap: 4px; margin-top: 2px; }
.expiry-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(107,142,173,0.3); transition: all 0.3s; }
.expiry-dot.active { background: #F59E0B; width: 12px; border-radius: 3px; }
</style>
