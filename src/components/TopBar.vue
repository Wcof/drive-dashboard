<script setup lang="ts">
// TopBar —— 指挥大屏顶部：品牌 | 标题+视角 | 天气+安全天数+KPI+时间+锁定

import { ref, onMounted, onUnmounted } from "vue"
import { useRobots } from "@/composables/useRobots"
import { useTasks } from "@/composables/useTasks"
import { useAlerts } from "@/composables/useAlerts"
import { useLockState, pendingAutoLock } from "@/composables/useLockState"

const emit = defineEmits<{ (e: "toggle-layers"): void; (e: "request-lock"): void; (e: "request-unlock"): void; (e: "auto-lock-confirm"): void }>()

const { onlineCount, patrollingCount, errorCount } = useRobots()
const { runningCount } = useTasks()
const { criticalCount, warningCount } = useAlerts()
const { isLocked, resetLockTimer } = useLockState()

const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("zh-CN", { hour12: false })
}
</script>

<template>
  <header class="top-bar" @click="resetLockTimer">
    <div class="top-bar__left">
      <div class="top-bar__logo"></div>
      <h1 class="top-bar__brand">极客光年 | 智能巡检指挥中枢</h1>
    </div>

    <div class="top-bar__center">
      <h2 class="top-bar__title">智能巡检机器人指挥中心</h2>
      <div class="top-bar__ctx">当前视角: 全局场站</div>
    </div>

    <div class="top-bar__right">
      <!-- 天气 -->
      <div class="weather-brief">
        <span class="weather-tag">园区天气</span>
        <span>晴 26°C 东南风2级 湿度58%</span>
      </div>
      <!-- 连续安全天数 -->
      <div class="safety-kpi">
        <span class="safety-kpi__label">连续安全天数</span>
        <span class="safety-kpi__val">128天</span>
      </div>
      <!-- KPI 条 -->
      <div class="top-bar__kpis">
        <div class="kpi-item"><span class="k-label">机器人</span><span class="k-val">{{ onlineCount }}/{{ patrollingCount }}</span></div>
        <div class="kpi-item kpi-item--err"><span class="k-label">故障</span><span class="k-val">{{ errorCount }}</span></div>
        <div class="kpi-item"><span class="k-label">任务</span><span class="k-val">{{ runningCount }}</span></div>
        <div class="kpi-item kpi-item--critical"><span class="k-label">紧急</span><span class="k-val">{{ criticalCount }}</span></div>
        <div class="kpi-item kpi-item--warn"><span class="k-label">警告</span><span class="k-val">{{ warningCount }}</span></div>
      </div>
      <time class="top-bar__time">{{ fmtTime(now) }}</time>
      <button v-if="!isLocked" class="btn btn--ghost" @click="emit('toggle-layers')">图层</button>
      <button class="btn" :class="isLocked ? 'btn--unlock' : 'btn--lock'" @click="isLocked ? emit('request-unlock') : emit('request-lock')">
        {{ isLocked ? "解锁" : "锁定" }}
      </button>
    </div>

    <div v-if="pendingAutoLock" class="top-bar__auto-lock">
      <span>15 分钟无操作，即将自动锁定</span>
      <button @click="emit('auto-lock-confirm')">立即锁定</button>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  height: 0.72rem;
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 0.3200rem;
  background: linear-gradient(180deg, rgba(3, 6, 16, 0.98) 0%, rgba(3, 6, 16, 0.4) 80%, rgba(3, 6, 16, 0) 100%);
  border-bottom: 1px solid rgba(197, 168, 123, 0.2);
  position: relative; z-index: 30;
  backdrop-filter: blur(0.0800rem);
}
.top-bar::after {
  content: ""; position: absolute; left: 0.3200rem; right: 0.3200rem; bottom: -1px; height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(0, 229, 255, 0.7) 50%, transparent 100%);
  opacity: 0.8;
}

/* 左：品牌 */
.top-bar__left { flex: 1; display: flex; align-items: center; gap: 0.2000rem; }
.top-bar__logo {
  width: 0.2400rem; height: 0.2400rem; border-radius: 0.0400rem;
  background: linear-gradient(135deg, #00E5FF, #6B8EAD);
  box-shadow: 0 0 0.1200rem rgba(0, 229, 255, 0.5);
}
.top-bar__brand { font-size: 0.1400rem; color: var(--hud-text-dim); font-weight: 400; letter-spacing: 0.0150rem; }

/* 中：标题 */
.top-bar__center { display: flex; flex-direction: column; align-items: center; gap: 0.0300rem; }
.top-bar__title {
  font-size: 0.2200rem; font-weight: 500; letter-spacing: 0.0600rem; color: var(--hud-text);
  text-shadow: 0 0 0.1600rem rgba(0, 229, 255, 0.4);
}
.top-bar__ctx { font-size: 0.1100rem; color: #00E5FF; letter-spacing: 0.0300rem; font-family: var(--hud-mono); }

/* 右：天气+安全天数+KPI+时间+按钮 */
.top-bar__right { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 0.1800rem; }

.weather-brief {
  display: flex; align-items: center; gap: 0.0800rem;
  padding: 0.0500rem 0.1200rem; border-radius: 9.9900rem;
  border: 1px solid rgba(0, 229, 255, 0.2);
  background: rgba(8, 14, 26, 0.6);
  font-size: 0.1100rem; color: var(--hud-text-dim); backdrop-filter: blur(0.0600rem);
}
.weather-tag { color: #00E5FF; letter-spacing: 0.5px; }

.safety-kpi {
  display: flex; flex-direction: column; align-items: center;
  padding: 0.0600rem 0.1200rem;
  background: linear-gradient(180deg, rgba(0, 229, 255, 0.12), rgba(0, 229, 255, 0.03));
  border: 1px solid rgba(0, 229, 255, 0.25); border-radius: 0.0600rem;
}
.safety-kpi__label { font-size: 0.1000rem; color: var(--hud-text-dim); letter-spacing: 1px; }
.safety-kpi__val { font-size: 0.2000rem; color: #00E5FF; font-family: var(--hud-mono); font-weight: bold; text-shadow: 0 0 0.0800rem rgba(0, 229, 255, 0.5); }

.top-bar__kpis { display: flex; gap: 0.0600rem; }
.kpi-item {
  display: flex; flex-direction: column; align-items: center;
  padding: 0.0400rem 0.1000rem;
  background: linear-gradient(180deg, rgba(0, 229, 255, 0.08), rgba(0, 229, 255, 0.02));
  border: 1px solid rgba(0, 229, 255, 0.18); border-radius: 0.0600rem;
  font-family: var(--hud-mono);
}
.kpi-item .k-label { font-size: 0.0900rem; color: var(--hud-text-dim); letter-spacing: 1px; }
.kpi-item .k-val { font-size: 0.1500rem; color: #00E5FF; margin-top: 0.0200rem; text-shadow: 0 0 0.0600rem rgba(0, 229, 255, 0.3); }
.kpi-item--err { border-color: rgba(239, 68, 68, 0.35); background: linear-gradient(180deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.02)); }
.kpi-item--err .k-val { color: var(--hud-danger); text-shadow: 0 0 0.0600rem rgba(239, 68, 68, 0.4); }
.kpi-item--critical { border-color: rgba(239, 68, 68, 0.35); }
.kpi-item--critical .k-val { color: var(--hud-danger); }
.kpi-item--warn { border-color: rgba(245, 158, 11, 0.35); }
.kpi-item--warn .k-val { color: var(--hud-warn); }

.top-bar__time { font-family: var(--hud-mono); font-size: 0.1500rem; color: var(--hud-text); font-weight: 300; letter-spacing: 1px; }

.btn {
  padding: 0.0500rem 0.1400rem; border: 1px solid rgba(0, 229, 255, 0.25); background: transparent;
  color: var(--hud-text-dim); cursor: pointer; border-radius: 9.9900rem; font-size: 0.1100rem;
  letter-spacing: 1px; backdrop-filter: blur(0.0600rem); transition: all 0.2s ease;
}
.btn:hover { border-color: rgba(0, 229, 255, 0.6); color: #00E5FF; box-shadow: 0 0 0.1000rem rgba(0, 229, 255, 0.15); }
.btn--lock { color: var(--hud-warn); border-color: rgba(245, 158, 11, 0.4); }
.btn--unlock { color: var(--hud-ok); border-color: rgba(16, 185, 129, 0.4); }

.top-bar__auto-lock {
  position: absolute; top: 0.5600rem; right: 0.3200rem;
  background: var(--hud-danger); color: #fff;
  padding: 0.0800rem 0.1400rem; border-radius: 0.0600rem; font-size: 0.1200rem;
  display: flex; gap: 0.1000rem; align-items: center;
  box-shadow: 0 0.0800rem 0.2400rem rgba(239, 68, 68, 0.4);
}
.top-bar__auto-lock button { background: rgba(255, 255, 255, 0.2); border: 0; color: #fff; padding: 0.0400rem 0.1000rem; border-radius: 0.0400rem; cursor: pointer; font-size: 0.1100rem; }
</style>
