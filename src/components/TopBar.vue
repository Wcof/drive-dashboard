<script setup lang="ts">
// TopBar —— 指挥大屏顶部：品牌 | 标题+视角 | 天气+安全天数+KPI+时间+锁定（增强版）
// 天气/安全天数接入 mock 时钟驱动（动态化，避免硬编码）

import { ref, onMounted, onUnmounted, computed } from "vue"
import { useRobots } from "@/composables/useRobots"
import { useTasks } from "@/composables/useTasks"
import { useAlerts } from "@/composables/useAlerts"
import { useLockState, pendingAutoLock } from "@/composables/useLockState"

const emit = defineEmits<{ (e: "toggle-layers"): void; (e: "request-lock"): void; (e: "request-unlock"): void; (e: "auto-lock-confirm"): void; (e: "show-audit-log"): void }>()

const { robots, onlineCount } = useRobots()
const { runningCount } = useTasks()
const { criticalCount, warningCount } = useAlerts()
const { isLocked, resetLockTimer } = useLockState()
const chargingCount = computed(() => robots.value.filter(r => r.status === 'charging').length)

const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("zh-CN", { hour12: false })
}
function fmtDate(d: Date): string {
  const w = ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"][d.getDay()]
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day} ${w}`
}

// === 天气动态化（mock：基于时段 + 随机种子，每小时刷新一次） ===
const weather = computed(() => {
  const h = now.value.getHours()
  // 时段温度曲线：凌晨低、午后高
  const baseTemp = 18 + Math.round(10 * Math.sin((h - 6) / 24 * Math.PI * 2))
  const humidity = 50 + (h % 6) * 3
  const windDir = ["东南风", "西北风", "东北风", "南风"][h % 4]
  const windLevel = 1 + (h % 3)
  const icon = h >= 6 && h < 18 ? "🌤️" : "🌙"
  return { temp: baseTemp, humidity, windDir, windLevel, icon }
})

// === 连续安全天数（mock：以 2026-01-01 为基准日，累计到今天） ===
const safetyDays = computed(() => {
  const base = new Date(2026, 0, 1).getTime()
  const today = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate()).getTime()
  return Math.max(0, Math.floor((today - base) / 86400000))
})
</script>

<template>
  <header class="top-bar" @click="resetLockTimer">
    <div class="top-bar__left">
      <div class="top-bar__logo"></div>
      <h1 class="top-bar__brand">极客光年 | 智能巡检指挥中枢</h1>
    </div>

    <div class="top-bar__center">
      <h2 class="top-bar__title">智能巡检机器人指挥中心</h2>
      <div class="top-bar__subtitle">智能感知 · 实时监控 · 高效运维</div>
    </div>

    <div class="top-bar__right">
      <!-- 天气（mock 时钟驱动，时段动态） -->
      <div class="weather-brief">
        <span class="weather-tag">{{ weather.icon }}</span>
        <span>{{ weather.temp }}°C {{ weather.windDir }}{{ weather.windLevel }}级 湿度{{ weather.humidity }}%</span>
      </div>
      <!-- 连续安全天数（mock：以 2026-01-01 为基准日累计） -->
      <div class="safety-kpi">
        <span class="safety-kpi__val">{{ safetyDays }}<span class="s-day">天</span></span>
        <span class="safety-kpi__label">连续安全</span>
      </div>
      <!-- KPI 条 -->
      <div class="top-bar__kpis">
        <div class="kpi-item" title="在线机器人">
          <span class="kpi-icon-sm" style="color:#00E5FF">🤖</span>
          <span class="k-val">{{ onlineCount }}</span>
        </div>
        <div class="kpi-item kpi-item--charging" title="充电中">
          <span class="kpi-icon-sm" style="color:#3B82F6">⚡</span>
          <span class="k-val" style="color:#3B82F6">{{ chargingCount }}</span>
        </div>
        <div class="kpi-item" title="执行任务">
          <span class="kpi-icon-sm" style="color:#10B981">▶</span>
          <span class="k-val" style="color:#10B981">{{ runningCount }}</span>
        </div>
        <div class="kpi-item kpi-item--critical" title="紧急告警">
          <span class="kpi-icon-sm" style="color:#EF4444">⚠</span>
          <span class="k-val" style="color:#EF4444">{{ criticalCount }}</span>
        </div>
        <div class="kpi-item kpi-item--warn" title="警告告警">
          <span class="kpi-icon-sm" style="color:#F59E0B">!</span>
          <span class="k-val" style="color:#F59E0B">{{ warningCount }}</span>
        </div>
      </div>
      <!-- 时间 -->
      <div class="top-bar__datetime">
        <time class="top-bar__time">{{ fmtTime(now) }}</time>
        <span class="top-bar__date">{{ fmtDate(now) }}</span>
      </div>
      <!-- 图层/审计/锁定 -->
      <button v-if="!isLocked" class="btn btn--ghost" @click="emit('toggle-layers')" title="图层控制">🗺️</button>
      <button class="btn btn--ghost" @click="emit('show-audit-log')" title="审计日志">📋</button>
      <button class="btn" :class="isLocked ? 'btn--unlock' : 'btn--lock'" @click="isLocked ? emit('request-unlock') : emit('request-lock')">
        {{ isLocked ? "🔓 解锁" : "🔒 锁定" }}
      </button>
    </div>

    <div v-if="pendingAutoLock" class="top-bar__auto-lock">
      <span>‼️ 15 分钟无操作，即将自动锁定</span>
      <button @click="emit('auto-lock-confirm')">立即锁定</button>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  height: 0.6400rem;
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 0.2400rem;
  background: linear-gradient(180deg, rgba(3, 6, 16, 0.98) 0%, rgba(3, 6, 16, 0.4) 80%, rgba(3, 6, 16, 0) 100%);
  border-bottom: 1px solid rgba(197, 168, 123, 0.15);
  position: relative; z-index: 30;
  backdrop-filter: blur(0.0800rem);
}
.top-bar::after {
  content: ""; position: absolute; left: 0.2400rem; right: 0.2400rem; bottom: -1px; height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(0, 229, 255, 0.6) 50%, transparent 100%);
  opacity: 0.6;
}

/* 左：品牌 */
.top-bar__left { flex: 1; display: flex; align-items: center; gap: 0.1600rem; }
.top-bar__logo {
  width: 0.2000rem; height: 0.2000rem; border-radius: 0.0400rem;
  background: linear-gradient(135deg, #00E5FF, #6B8EAD);
  box-shadow: 0 0 0.1000rem rgba(0, 229, 255, 0.5);
}
.top-bar__brand { font-size: 0.1300rem; color: var(--hud-text-dim); font-weight: 400; letter-spacing: 0.0100rem; }

/* 中：标题 */
.top-bar__center { display: flex; flex-direction: column; align-items: center; gap: 0.0200rem; }
.top-bar__title {
  font-size: 0.2000rem; font-weight: 500; letter-spacing: 0.0500rem; color: var(--hud-text);
  text-shadow: 0 0 0.1400rem rgba(0, 229, 255, 0.3);
}
.top-bar__subtitle {
  font-size: 0.1000rem; color: var(--hud-text-dim); letter-spacing: 0.0800rem;
  font-family: var(--hud-mono);
}
.top-bar__subtitle::before, .top-bar__subtitle::after {
  content: ""; display: inline-block; width: 0.2000rem; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.4));
  vertical-align: middle; margin: 0 0.0800rem;
}
.top-bar__subtitle::after { background: linear-gradient(90deg, rgba(0, 229, 255, 0.4), transparent); }

/* 右 */
.top-bar__right { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 0.1200rem; }

.weather-brief {
  display: flex; align-items: center; gap: 0.0600rem;
  padding: 0.0400rem 0.1000rem; border-radius: 9.9900rem;
  border: 1px solid rgba(0, 229, 255, 0.15);
  background: rgba(8, 14, 26, 0.6);
  font-size: 0.1000rem; color: var(--hud-text-dim); backdrop-filter: blur(0.0600rem);
}
.weather-tag { font-size: 0.1200rem; }

.safety-kpi {
  display: flex; flex-direction: row; align-items: center; gap: 0.0600rem;
  padding: 0.0400rem 0.1000rem;
  background: linear-gradient(90deg, rgba(0, 229, 255, 0.1), rgba(0, 229, 255, 0.02));
  border: 1px solid rgba(0, 229, 255, 0.2); border-radius: 9.9900rem;
}
.safety-kpi__label { font-size: 0.0900rem; color: var(--hud-text-dim); }
.safety-kpi__val { font-size: 0.1800rem; color: #00E5FF; font-family: var(--hud-mono); font-weight: bold; text-shadow: 0 0 0.0600rem rgba(0, 229, 255, 0.4); }
.s-day { font-size: 0.0800rem; color: var(--hud-text-dim); font-weight: 400; margin-left: 0.0100rem; }

.top-bar__kpis { display: flex; gap: 0.0400rem; }
.kpi-item {
  display: flex; align-items: center; gap: 0.0300rem;
  padding: 0.0300rem 0.0800rem;
  background: linear-gradient(180deg, rgba(0, 229, 255, 0.06), rgba(0, 229, 255, 0.01));
  border: 1px solid rgba(0, 229, 255, 0.12); border-radius: 9.9900rem;
  font-family: var(--hud-mono); cursor: default;
}
.kpi-icon-sm { font-size: 0.1200rem; }
.kpi-item .k-val { font-size: 0.1300rem; color: #00E5FF; text-shadow: 0 0 0.0400rem rgba(0, 229, 255, 0.2); }
.kpi-item--critical { border-color: rgba(239, 68, 68, 0.3); background: linear-gradient(180deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.01)); }
.kpi-item--warn { border-color: rgba(245, 158, 11, 0.3); background: linear-gradient(180deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.01)); }
.kpi-item--charging { border-color: rgba(59, 130, 246, 0.25); }

.top-bar__time { font-family: var(--hud-mono); font-size: 0.1400rem; color: var(--hud-text); font-weight: 300; letter-spacing: 1px; }
.top-bar__datetime { display: flex; flex-direction: row; align-items: center; gap: 0.0800rem; }
.top-bar__date { font-size: 0.0900rem; color: var(--hud-text-dim); letter-spacing: 0.5px; font-family: var(--hud-mono); }

.btn {
  padding: 0.0400rem 0.1200rem; border: 1px solid rgba(0, 229, 255, 0.2); background: transparent;
  color: var(--hud-text-dim); cursor: pointer; border-radius: 9.9900rem; font-size: 0.1000rem;
  letter-spacing: 0.5px; backdrop-filter: blur(0.0600rem); transition: all 0.2s ease;
}
.btn--ghost { border-color: transparent; font-size: 0.1400rem; padding: 0.0200rem 0.0800rem; }
.btn:hover { border-color: rgba(0, 229, 255, 0.5); color: #00E5FF; box-shadow: 0 0 0.0800rem rgba(0, 229, 255, 0.1); }
.btn--lock { color: var(--hud-warn); border-color: rgba(245, 158, 11, 0.35); }
.btn--unlock { color: var(--hud-ok); border-color: rgba(16, 185, 129, 0.35); }

.top-bar__auto-lock {
  position: absolute; top: 0.5000rem; right: 0.2400rem;
  background: var(--hud-danger); color: #fff;
  padding: 0.0600rem 0.1200rem; border-radius: 0.0500rem; font-size: 0.1100rem;
  display: flex; gap: 0.0800rem; align-items: center;
  box-shadow: 0 0.0600rem 0.2000rem rgba(239, 68, 68, 0.35);
  z-index: 40;
}
.top-bar__auto-lock button { background: rgba(255, 255, 255, 0.15); border: 0; color: #fff; padding: 0.0300rem 0.0800rem; border-radius: 0.0300rem; cursor: pointer; font-size: 0.1000rem; }
</style>
