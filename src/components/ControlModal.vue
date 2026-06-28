<script setup lang="ts">
// ControlModal —— 云台/机器人远程控制模态（增强版：S17 四种模式拆分）
// 支持：查看模式(view) / 控制模式(control) / 配置模式(config) / iPad模式(ipad)
// 含：双视角 tab + PTZ 云台方向键盘 + 机器人方向键盘 + WASD 键盘快捷键 + 反馈区 + 语音对讲入口

import { ref, computed, onMounted, onUnmounted } from "vue"
import { useDashboard } from "@/composables/useDashboard"
import { addAuditLog } from "@/composables/useAuditLog"
import { makeMockImg } from "@/utils/mockImage"

const { state, currentRobotExt, closeControlModal } = useDashboard()

type ConsoleMode = "view" | "control" | "config" | "ipad"
const activeMode = ref<ConsoleMode>("control")
const viewTab = ref<"ptz" | "robot">("ptz")
const ptzDir = ref<string | null>(null)
const robotDir = ref<string | null>(null)
const speedLevel = ref<number>(3)
const isVoiceActive = ref(false)

const robotId = computed(() => state.currentControlRobotId ?? currentRobotExt.value?.id ?? "")
const robotLabel = computed(() => currentRobotExt.value?.label ?? "待命")

const ptzViewImg = computed(() => makeMockImg(`PTZ ${robotId.value}`, "#152338", "#2f4866"))
const robotViewImg = computed(() => makeMockImg(`Robot ${robotId.value}`, "#1a2b2c", "#2f6164"))

const MODE_LABELS: Record<ConsoleMode, string> = {
  view: "👁️ 查看",
  control: "🎮 控制",
  config: "⚙️ 配置",
  ipad: "📱 iPad",
}
const MODE_DESCS: Record<ConsoleMode, string> = {
  view: "仅查看实时画面与环境状态，不可操作",
  control: "控制云台方向与机器人移动（WASD）",
  config: "点位校准与云台参数配置",
  ipad: "适配移动端触控的简化界面",
}

const PTZ_DIRS = [
  { id: "up", label: "▲", x: 1, y: 0, key: "w" },
  { id: "left", label: "◄", x: 0, y: 1, key: "a" },
  { id: "home", label: "⌂", x: 1, y: 1, key: "s" },
  { id: "right", label: "►", x: 2, y: 1, key: "d" },
  { id: "down", label: "▼", x: 1, y: 2, key: "x" },
]

const ROBOT_DIRS = [
  { id: "forward", label: "↑ 前进", x: 1, y: 0, key: "w" },
  { id: "left", label: "← 左转", x: 0, y: 1, key: "a" },
  { id: "stop", label: "■ 停止", x: 1, y: 1, key: " " },
  { id: "right", label: "→ 右转", x: 2, y: 1, key: "d" },
  { id: "backward", label: "↓ 后退", x: 1, y: 2, key: "s" },
]

const feedbackLog = ref<string[]>(["系统: 控制台已连接", `系统: 当前速度等级 ${speedLevel.value}`])

function pressPtz(dir: string, key?: string): void {
  if (activeMode.value !== "control") return
  ptzDir.value = dir
  feedbackLog.value.push(`PTZ: ${dir}${key ? ` (键: ${key})` : ""} | 速度: ${speedLevel.value}`)
  if (feedbackLog.value.length > 50) feedbackLog.value.shift()
  setTimeout(() => { ptzDir.value = null }, 300)
}

function pressRobot(dir: string, key?: string): void {
  if (activeMode.value !== "control") return
  robotDir.value = dir
  feedbackLog.value.push(`机器人: ${dir}${key ? ` (键: ${key})` : ""} | 速度: ${speedLevel.value}`)
  if (feedbackLog.value.length > 50) feedbackLog.value.shift()
  setTimeout(() => { robotDir.value = null }, 300)
}

function toggleVoice(): void {
  isVoiceActive.value = !isVoiceActive.value
  feedbackLog.value.push(isVoiceActive.value ? "系统: 语音对讲已开启" : "系统: 语音对讲已关闭")
  addAuditLog({
    action: isVoiceActive.value ? "voice_on" : "voice_off",
    operator: "current", targetId: robotId.value, targetType: "robot",
    reason: isVoiceActive.value ? "开启语音对讲" : "关闭语音对讲"
  })
}

function onSpeedChange(): void {
  feedbackLog.value.push(`系统: 速度等级调整为 ${speedLevel.value}`)
}

function setMode(m: ConsoleMode): void {
  activeMode.value = m
  feedbackLog.value.push(`系统: 切换至「${MODE_LABELS[m]}」模式`)
  addAuditLog({
    action: "remote_control_enter", operator: "current",
    targetId: robotId.value, targetType: "robot",
    reason: `切换至${MODE_LABELS[m]}模式`
  })
}

function handleKeyDown(e: KeyboardEvent): void {
  if (activeMode.value !== "control") return
  const key = e.key.toLowerCase()
  if (viewTab.value === "ptz") {
    const dirMap: Record<string, string> = { w: "up", a: "left", s: "home", d: "right", x: "down" }
    if (dirMap[key]) { e.preventDefault(); pressPtz(dirMap[key], key) }
  } else {
    const dirMap: Record<string, string> = { w: "forward", a: "left", " ": "stop", d: "right", s: "backward" }
    if (dirMap[key]) { e.preventDefault(); pressRobot(dirMap[key], key === " " ? "Space" : key) }
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown)
  addAuditLog({ action: "remote_control_enter", operator: "current", targetId: robotId.value, targetType: "robot", reason: "进入远程控制台" })
})
onUnmounted(() => { window.removeEventListener("keydown", handleKeyDown) })
</script>

<template>
  <div class="ctrl-modal-mask" @click.self="closeControlModal">
    <div class="ctrl-modal">
      <div class="ctrl-modal-close" @click="closeControlModal">×</div>
      
      <!-- 头部：模式选择条 -->
      <div class="ctrl-modal-header">
        <h3 class="ctrl-modal-title">远程控制台 · {{ robotId }}</h3>
        <span class="ctrl-status">{{ robotLabel }}</span>
      </div>
      
      <!-- 四种模式切换 -->
      <div class="mode-tabs">
        <button v-for="m in (['view','control','config','ipad'] as ConsoleMode[])" :key="m"
          class="mode-tab" :class="{ active: activeMode === m }" @click="setMode(m)">
          {{ MODE_LABELS[m] }}
        </button>
        <span class="mode-desc">{{ MODE_DESCS[activeMode] }}</span>
      </div>

      <!-- 控制权状态栏 -->
      <div class="ctrl-lock-bar">
        <span class="lock-indicator lock-active">🔒 控制权: 当前用户 (current)</span>
        <span class="lock-time">获取时间: {{ new Date().toLocaleTimeString('zh-CN', { hour12: false }) }}</span>
      </div>

      <div class="ctrl-modal-body">
        <!-- 速度控制（仅 control 模式） -->
        <div v-if="activeMode === 'control'" class="ctrl-speed-bar">
          <span class="sb-label">速度:</span>
          <div class="sb-dots">
            <button v-for="i in 5" :key="i" class="sb-dot" :class="{ active: speedLevel >= i }" @click="speedLevel = i; onSpeedChange()">{{ i }}</button>
          </div>
          <span class="sb-desc">{{ ['极慢','慢速','中速','快速','极速'][speedLevel - 1] }}</span>
        </div>

        <!-- 视角选择（view/control 模式） -->
        <div v-if="activeMode === 'view' || activeMode === 'control'" class="ctrl-view-section">
          <div class="ctrl-view-tabs">
            <button class="ctrl-v-tab" :class="{ active: viewTab === 'ptz' }" @click="viewTab = 'ptz'">云台视角</button>
            <button class="ctrl-v-tab" :class="{ active: viewTab === 'robot' }" @click="viewTab = 'robot'">机器人视角</button>
          </div>
          <div class="ctrl-view-area">
            <div v-if="viewTab === 'ptz'" class="ctrl-view" :style="{ backgroundImage: `url('${ptzViewImg}')` }">
              <div class="ctrl-crosshair"></div>
              <div class="ctrl-view-label">PTZ CAM-01</div>
              <div v-if="activeMode === 'control'" class="ctrl-key-hint">W/A/S/D/X 控制云台</div>
              <div v-else class="ctrl-key-hint">仅查看</div>
            </div>
            <div v-else class="ctrl-view" :style="{ backgroundImage: `url('${robotViewImg}')` }">
              <div class="ctrl-crosshair"></div>
              <div class="ctrl-view-label">ROBOT POV</div>
              <div v-if="activeMode === 'control'" class="ctrl-key-hint">W/A/S/Space/D 控制机器人</div>
              <div v-else class="ctrl-key-hint">仅查看</div>
            </div>
          </div>
        </div>

        <!-- 配置模式 -->
        <div v-if="activeMode === 'config'" class="config-panel">
          <div class="config-section">
            <h4 class="config-title">点位校准</h4>
            <div class="config-row"><label>云台方位角</label><input type="range" min="0" max="360" value="180" /><b>180°</b></div>
            <div class="config-row"><label>云台俯仰角</label><input type="range" min="-90" max="30" value="-15" /><b>-15°</b></div>
            <div class="config-row"><label>目标距离</label><input type="range" min="1" max="50" value="12" /><b>12m</b></div>
          </div>
          <div class="config-section">
            <h4 class="config-title">采集参数</h4>
            <div class="config-row"><label>曝光补偿</label><input type="range" min="-3" max="3" value="0" step="0.5" /><b>0EV</b></div>
            <div class="config-row"><label>白平衡</label><select><option>自动</option><option>日光</option><option>阴天</option><option>荧光灯</option></select></div>
            <div class="config-row"><label>红外模式</label><select><option>关</option><option>自动</option><option>强制</option></select></div>
          </div>
          <div class="config-note">💡 校准结果将保存至采集位配置</div>
        </div>

        <!-- iPad 模式 -->
        <div v-if="activeMode === 'ipad'" class="ipad-panel">
          <div class="ipad-hint">📱 iPad 触控模式</div>
          <div class="ipad-controls">
            <div class="ipad-joypad">
              <div class="joypad-label">触控方向</div>
              <div class="joypad-area">
                <div class="joypad-dot" style="top:10%;left:50%"></div>
                <div class="joypad-dot" style="top:50%;left:10%"></div>
                <div class="joypad-dot" style="top:50%;left:50%;background:#C5A87B"></div>
                <div class="joypad-dot" style="top:50%;left:90%"></div>
                <div class="joypad-dot" style="top:90%;left:50%"></div>
              </div>
            </div>
            <div class="ipad-actions">
              <button class="ipad-btn">📸 拍照</button>
              <button class="ipad-btn">🔊 对讲</button>
              <button class="ipad-btn">⬅ 返回</button>
            </div>
          </div>
        </div>

        <!-- 控制面板（仅 control 模式显示完整操作） -->
        <template v-if="activeMode === 'control'">
          <div class="ctrl-pads">
            <div class="ctrl-pad-section">
              <div class="ctrl-pad-title">云台控制 <span class="key-hint">W/A/S/D/X</span></div>
              <div class="ctrl-pad">
                <button v-for="d in PTZ_DIRS" :key="d.id" class="ctrl-pad-btn" :class="{ pressed: ptzDir === d.id }" :style="{ gridColumn: d.x + 1, gridRow: d.y + 1 }" @click="pressPtz(d.id, d.key)">{{ d.label }}</button>
              </div>
            </div>
            <div class="ctrl-pad-section">
              <div class="ctrl-pad-title">机器人控制 <span class="key-hint">W/A/S/D/Space</span></div>
              <div class="ctrl-pad">
                <button v-for="d in ROBOT_DIRS" :key="d.id" class="ctrl-pad-btn" :class="{ pressed: robotDir === d.id }" :style="{ gridColumn: d.x + 1, gridRow: d.y + 1 }" @click="pressRobot(d.id, d.key === ' ' ? 'Space' : d.key)">{{ d.label }}</button>
              </div>
            </div>
          </div>

          <div class="ctrl-tools">
            <button class="ctrl-tool-btn" :class="{ active: isVoiceActive }" @click="toggleVoice">
              {{ isVoiceActive ? '🔊 对讲中' : '🔇 语音对讲' }}
            </button>
            <button class="ctrl-tool-btn" @click="feedbackLog.push('系统: 已发送拍照指令')">📸 抓拍</button>
            <button class="ctrl-tool-btn" @click="feedbackLog.push('系统: 红外热成像已切换')">🌡️ 热成像</button>
          </div>
        </template>

        <!-- 操作反馈日志 -->
        <div class="ctrl-feedback">
          <div class="ctrl-fb-title">操作反馈 <span class="fb-count">{{ feedbackLog.length }}条</span></div>
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
.ctrl-modal { width: 90%; max-width: 8rem; background: rgba(10,16,26,0.92); border: 1px solid rgba(197,168,123,0.4); border-radius: 0.08rem; padding: 0.24rem; position: relative; }
.ctrl-modal-close { position: absolute; top: 0.16rem; right: 0.2rem; font-size: 0.28rem; color: #fff; cursor: pointer; z-index: 10; }
.ctrl-modal-header { display: flex; align-items: center; gap: 0.12rem; margin-bottom: 0.12rem; padding-bottom: 0.12rem; border-bottom: 1px solid rgba(107,142,173,0.22); }
.ctrl-modal-title { margin: 0; font-size: 0.18rem; color: var(--hud-accent); letter-spacing: 0.02rem; }
.ctrl-status { padding: 0.02rem 0.1rem; background: rgba(34,197,94,0.18); border: 1px solid rgba(34,197,94,0.4); color: #22C55E; border-radius: 0.03rem; font-size: 0.11rem; }

/* 模式切换 */
.mode-tabs { display: flex; gap: 0.04rem; margin-bottom: 0.08rem; flex-wrap: wrap; align-items: center; }
.mode-tab { padding: 0.04rem 0.12rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 0.03rem; cursor: pointer; font-size: 0.11rem; transition: all 0.2s; }
.mode-tab:hover { border-color: rgba(197,168,123,0.5); color: var(--hud-text); }
.mode-tab.active { color: #00E5FF; border-color: #00E5FF; background: rgba(0,229,255,0.12); box-shadow: 0 0 0.06rem rgba(0,229,255,0.2); }
.mode-desc { font-size: 0.09rem; color: var(--hud-text-faint); margin-left: auto; }

/* 控制权状态 */
.ctrl-lock-bar { display: flex; justify-content: space-between; align-items: center; padding: 0.04rem 0.1rem; background: rgba(0,0,0,0.25); border-radius: 0.03rem; margin-bottom: 0.12rem; font-size: 0.1rem; }
.lock-indicator.lock-active { color: #22C55E; }
.lock-time { color: var(--hud-text-faint); font-family: var(--hud-mono); font-size: 0.09rem; }

.ctrl-modal-body { display: flex; flex-direction: column; gap: 0.12rem; }

/* 速度条 */
.ctrl-speed-bar { display: flex; align-items: center; gap: 0.08rem; padding: 0.08rem 0.12rem; background: rgba(0,0,0,0.3); border-radius: 0.04rem; }
.sb-label { font-size: 0.11rem; color: var(--hud-text-dim); }
.sb-dots { display: flex; gap: 0.04rem; }
.sb-dot { width: 0.22rem; height: 0.18rem; border-radius: 0.02rem; border: 1px solid rgba(107,142,173,0.3); background: transparent; color: var(--hud-text-dim); cursor: pointer; font-size: 0.09rem; text-align: center; line-height: 0.18rem; transition: all 0.2s; }
.sb-dot.active { background: rgba(0,229,255,0.2); border-color: #00E5FF; color: #00E5FF; }
.sb-desc { font-size: 0.10rem; color: #00E5FF; margin-left: auto; }

/* 视角 */
.ctrl-view-tabs { display: flex; gap: 0.08rem; margin-bottom: 0.08rem; }
.ctrl-v-tab { padding: 0.04rem 0.12rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 0.03rem; cursor: pointer; font-size: 0.11rem; }
.ctrl-v-tab.active { color: var(--hud-accent); border-color: var(--hud-accent); background: rgba(197,168,123,0.12); }
.ctrl-view-area { margin-bottom: 0.12rem; }
.ctrl-view { height: 2rem; background-size: cover; background-position: center; border: 1px solid rgba(107,142,173,0.22); border-radius: 0.04rem; position: relative; }
.ctrl-crosshair { position: absolute; top: 50%; left: 50%; width: 0.3rem; height: 0.3rem; transform: translate(-50%, -50%); }
.ctrl-crosshair::before, .ctrl-crosshair::after { content: ""; position: absolute; background: rgba(197,168,123,0.7); }
.ctrl-crosshair::before { top: 50%; left: 0; right: 0; height: 1px; }
.ctrl-crosshair::after { left: 50%; top: 0; bottom: 0; width: 1px; }
.ctrl-view-label { position: absolute; bottom: 0.06rem; left: 0.08rem; font-size: 0.1rem; color: #cfe3f7; background: rgba(0,0,0,0.5); padding: 0.02rem 0.06rem; border-radius: 0.02rem; font-family: var(--hud-mono); }
.ctrl-key-hint { position: absolute; bottom: 0.06rem; right: 0.08rem; font-size: 0.09rem; color: var(--hud-accent); background: rgba(0,0,0,0.5); padding: 0.02rem 0.06rem; border-radius: 0.02rem; opacity: 0.6; }

/* 配置面板 */
.config-panel { display: flex; flex-direction: column; gap: 0.12rem; }
.config-section { background: rgba(0,0,0,0.25); border-radius: 0.04rem; padding: 0.12rem; }
.config-title { font-size: 0.11rem; color: var(--hud-accent); margin-bottom: 0.08rem; letter-spacing: 1px; border-bottom: 1px solid rgba(107,142,173,0.12); padding-bottom: 0.04rem; }
.config-row { display: grid; grid-template-columns: 0.8rem 1fr 0.5rem; align-items: center; gap: 0.08rem; padding: 0.04rem 0; }
.config-row label { font-size: 0.1rem; color: var(--hud-text-dim); }
.config-row input[type="range"] { accent-color: var(--hud-accent); width: 100%; }
.config-row select { background: rgba(5,8,14,0.7); border: 1px solid rgba(107,142,173,0.22); color: var(--hud-text); padding: 0.04rem; border-radius: 0.03rem; font-size: 0.1rem; }
.config-row b { font-family: var(--hud-mono); font-size: 0.1rem; color: var(--hud-accent); text-align: right; }
.config-note { font-size: 0.09rem; color: var(--hud-text-faint); padding: 0.06rem; background: rgba(107,142,173,0.06); border-radius: 0.03rem; text-align: center; }

/* iPad 模式 */
.ipad-panel { display: flex; flex-direction: column; gap: 0.12rem; align-items: center; }
.ipad-hint { font-size: 0.12rem; color: var(--hud-accent); letter-spacing: 1px; }
.ipad-joypad { background: rgba(0,0,0,0.3); border-radius: 0.08rem; padding: 0.2rem; width: 3rem; }
.joypad-label { font-size: 0.1rem; color: var(--hud-text-dim); margin-bottom: 0.08rem; text-align: center; }
.joypad-area { position: relative; height: 2rem; }
.joypad-dot { position: absolute; width: 0.3rem; height: 0.3rem; border-radius: 50%; background: rgba(107,142,173,0.3); transform: translate(-50%,-50%); cursor: pointer; }
.joypad-dot:hover { background: rgba(197,168,123,0.5); }
.ipad-actions { display: flex; gap: 0.08rem; }
.ipad-btn { padding: 0.06rem 0.16rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 0.03rem; cursor: pointer; font-size: 0.12rem; }

/* 控制方向键 */
.ctrl-pads { display: flex; gap: 0.2rem; }
.ctrl-pad-section { flex: 1; }
.ctrl-pad-title { font-size: 0.11rem; color: var(--hud-accent); margin-bottom: 0.08rem; display: flex; align-items: center; gap: 0.06rem; }
.key-hint { font-size: 0.08rem; color: var(--hud-text-faint); background: rgba(107,142,173,0.15); padding: 0.01rem 0.04rem; border-radius: 0.02rem; }
.ctrl-pad { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 0.04rem; }
.ctrl-pad-btn { padding: 0.08rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 0.04rem; cursor: pointer; font-size: 0.12rem; transition: all 0.15s ease; }
.ctrl-pad-btn:hover { border-color: rgba(197,168,123,0.5); color: var(--hud-text); }
.ctrl-pad-btn.pressed { background: rgba(197,168,123,0.2); border-color: var(--hud-accent); color: var(--hud-accent); box-shadow: 0 0 0.08rem rgba(197,168,123,0.3); }

.ctrl-tools { display: flex; gap: 0.08rem; }
.ctrl-tool-btn { padding: 0.06rem 0.12rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 0.03rem; cursor: pointer; font-size: 0.11rem; transition: all 0.2s ease; }
.ctrl-tool-btn:hover { border-color: rgba(197,168,123,0.5); color: var(--hud-text); }
.ctrl-tool-btn.active { background: rgba(34,197,94,0.15); border-color: #22C55E; color: #22C55E; }

.ctrl-feedback { background: rgba(0,0,0,0.3); border-radius: 0.04rem; padding: 0.1rem; }
.ctrl-fb-title { font-size: 0.11rem; color: var(--hud-accent); margin-bottom: 0.06rem; display: flex; align-items: center; gap: 0.06rem; }
.fb-count { font-size: 0.09rem; color: var(--hud-text-faint); margin-left: auto; }
.ctrl-fb-log { max-height: 1.2rem; overflow-y: auto; font-family: var(--hud-mono); font-size: 0.1rem; color: var(--hud-text-dim); }
.ctrl-fb-line { padding: 0.02rem 0; border-bottom: 1px solid rgba(107,142,173,0.08); }
</style>
