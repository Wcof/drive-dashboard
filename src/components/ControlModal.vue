<script setup lang="ts">
// ControlModal —— 云台/机器人控制模态（复刻参考页面 control-modal）
// 含：双视角 tab + PTZ 云台方向键盘 + 机器人方向键盘 + 反馈区

import { ref, computed } from "vue"
import { useDashboard } from "@/composables/useDashboard"
import { makeMockImg } from "@/utils/mockImage"

const { state, currentRobotExt, closeControlModal } = useDashboard()

const viewTab = ref<"ptz" | "robot">("ptz")
const ptzDir = ref<string | null>(null)
const robotDir = ref<string | null>(null)

const robotId = computed(() => state.currentControlRobotId ?? currentRobotExt.value?.id ?? "")
const robotLabel = computed(() => currentRobotExt.value?.label ?? "待命")

const ptzViewImg = computed(() => makeMockImg(`PTZ ${robotId.value}`, "#152338", "#2f4866"))
const robotViewImg = computed(() => makeMockImg(`Robot ${robotId.value}`, "#1a2b2c", "#2f6164"))

const PTZ_DIRS = [
  { id: "up", label: "▲", x: 1, y: 0 },
  { id: "left", label: "◄", x: 0, y: 1 },
  { id: "home", label: "⌂", x: 1, y: 1 },
  { id: "right", label: "►", x: 2, y: 1 },
  { id: "down", label: "▼", x: 1, y: 2 },
]

const ROBOT_DIRS = [
  { id: "forward", label: "↑ 前进", x: 1, y: 0 },
  { id: "left", label: "← 左转", x: 0, y: 1 },
  { id: "stop", label: "■ 停止", x: 1, y: 1 },
  { id: "right", label: "→ 右转", x: 2, y: 1 },
  { id: "backward", label: "↓ 后退", x: 1, y: 2 },
]

const feedbackLog = ref<string[]>(["系统: 控制台已连接"])

function pressPtz(dir: string): void {
  ptzDir.value = dir
  feedbackLog.value.push(`PTZ: ${dir}`)
  if (feedbackLog.value.length > 20) feedbackLog.value.shift()
  setTimeout(() => { ptzDir.value = null }, 300)
}

function pressRobot(dir: string): void {
  robotDir.value = dir
  feedbackLog.value.push(`机器人: ${dir}`)
  if (feedbackLog.value.length > 20) feedbackLog.value.shift()
  setTimeout(() => { robotDir.value = null }, 300)
}
</script>

<template>
  <div class="ctrl-modal-mask" @click.self="closeControlModal">
    <div class="ctrl-modal">
      <div class="ctrl-modal-close" @click="closeControlModal">×</div>
      <div class="ctrl-modal-header">
        <h3 class="ctrl-modal-title">远程控制台 · {{ robotId }}</h3>
        <span class="ctrl-status">{{ robotLabel }}</span>
      </div>
      <div class="ctrl-modal-body">
        <div class="ctrl-view-tabs">
          <button class="ctrl-v-tab" :class="{ active: viewTab === 'ptz' }" @click="viewTab = 'ptz'">云台视角</button>
          <button class="ctrl-v-tab" :class="{ active: viewTab === 'robot' }" @click="viewTab = 'robot'">机器人视角</button>
        </div>
        <div class="ctrl-view-area">
          <div v-if="viewTab === 'ptz'" class="ctrl-view" :style="{ backgroundImage: `url('${ptzViewImg}')` }">
            <div class="ctrl-crosshair"></div>
            <div class="ctrl-view-label">PTZ CAM-01</div>
          </div>
          <div v-else class="ctrl-view" :style="{ backgroundImage: `url('${robotViewImg}')` }">
            <div class="ctrl-crosshair"></div>
            <div class="ctrl-view-label">ROBOT POV</div>
          </div>
        </div>
        <div class="ctrl-pads">
          <div class="ctrl-pad-section">
            <div class="ctrl-pad-title">云台控制</div>
            <div class="ctrl-pad">
              <button v-for="d in PTZ_DIRS" :key="d.id" class="ctrl-pad-btn" :class="{ pressed: ptzDir === d.id }" :style="{ gridColumn: d.x + 1, gridRow: d.y + 1 }" @click="pressPtz(d.id)">{{ d.label }}</button>
            </div>
          </div>
          <div class="ctrl-pad-section">
            <div class="ctrl-pad-title">机器人控制</div>
            <div class="ctrl-pad">
              <button v-for="d in ROBOT_DIRS" :key="d.id" class="ctrl-pad-btn" :class="{ pressed: robotDir === d.id }" :style="{ gridColumn: d.x + 1, gridRow: d.y + 1 }" @click="pressRobot(d.id)">{{ d.label }}</button>
            </div>
          </div>
        </div>
        <div class="ctrl-feedback">
          <div class="ctrl-fb-title">操作反馈</div>
          <div class="ctrl-fb-log">
            <div v-for="(line, i) in feedbackLog" :key="i" class="ctrl-fb-line">{{ line }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ctrl-modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(0.1rem); }
.ctrl-modal { width: 90%; max-width: 7.5rem; max-height: 85vh; background: rgba(10,16,26,0.92); border: 1px solid rgba(197,168,123,0.4); border-radius: 0.08rem; padding: 0.24rem; overflow-y: auto; position: relative; }
.ctrl-modal-close { position: absolute; top: 0.16rem; right: 0.2rem; font-size: 0.28rem; color: #fff; cursor: pointer; }
.ctrl-modal-header { display: flex; align-items: center; gap: 0.12rem; margin-bottom: 0.2rem; padding-bottom: 0.16rem; border-bottom: 1px solid rgba(107,142,173,0.22); }
.ctrl-modal-title { margin: 0; font-size: 0.18rem; color: var(--hud-accent); letter-spacing: 0.02rem; }
.ctrl-status { padding: 0.02rem 0.08rem; background: rgba(34,197,94,0.18); border: 1px solid rgba(34,197,94,0.4); color: #22C55E; border-radius: 0.03rem; font-size: 0.11rem; }
.ctrl-view-tabs { display: flex; gap: 0.08rem; margin-bottom: 0.12rem; }
.ctrl-v-tab { padding: 0.06rem 0.14rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 0.03rem; cursor: pointer; font-size: 0.12rem; }
.ctrl-v-tab.active { color: var(--hud-accent); border-color: var(--hud-accent); background: rgba(197,168,123,0.12); }
.ctrl-view-area { margin-bottom: 0.16rem; }
.ctrl-view { height: 2.4rem; background-size: cover; background-position: center; border: 1px solid rgba(107,142,173,0.22); border-radius: 0.04rem; position: relative; }
.ctrl-crosshair { position: absolute; top: 50%; left: 50%; width: 0.3rem; height: 0.3rem; transform: translate(-50%, -50%); }
.ctrl-crosshair::before, .ctrl-crosshair::after { content: ""; position: absolute; background: rgba(197,168,123,0.7); }
.ctrl-crosshair::before { top: 50%; left: 0; right: 0; height: 1px; }
.ctrl-crosshair::after { left: 50%; top: 0; bottom: 0; width: 1px; }
.ctrl-view-label { position: absolute; bottom: 0.06rem; left: 0.08rem; font-size: 0.1rem; color: #cfe3f7; background: rgba(0,0,0,0.5); padding: 0.02rem 0.06rem; border-radius: 0.02rem; font-family: var(--hud-mono); }
.ctrl-pads { display: flex; gap: 0.2rem; margin-bottom: 0.16rem; }
.ctrl-pad-section { flex: 1; }
.ctrl-pad-title { font-size: 0.11rem; color: var(--hud-accent); margin-bottom: 0.08rem; letter-spacing: 0.01rem; }
.ctrl-pad { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 0.04rem; }
.ctrl-pad-btn { padding: 0.08rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 0.04rem; cursor: pointer; font-size: 0.12rem; transition: all 0.15s ease; }
.ctrl-pad-btn:hover { border-color: rgba(197,168,123,0.5); color: var(--hud-text); }
.ctrl-pad-btn.pressed { background: rgba(197,168,123,0.2); border-color: var(--hud-accent); color: var(--hud-accent); box-shadow: 0 0 0.08rem rgba(197,168,123,0.3); }
.ctrl-feedback { background: rgba(0,0,0,0.3); border-radius: 0.04rem; padding: 0.1rem; }
.ctrl-fb-title { font-size: 0.11rem; color: var(--hud-accent); margin-bottom: 0.06rem; }
.ctrl-fb-log { max-height: 1.2rem; overflow-y: auto; font-family: var(--hud-mono); font-size: 0.1rem; color: var(--hud-text-dim); }
.ctrl-fb-line { padding: 0.02rem 0; border-bottom: 1px solid rgba(107,142,173,0.08); }
</style>
