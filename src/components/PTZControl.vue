<script setup lang="ts">
// PTZControl —— 聚焦态上区：云台方位角/俯仰角/焦距/扫描模式 + 游戏手柄方向键

import { reactive } from "vue"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { useLockState } from "@/composables/useLockState"
import { useAuditLog, addAuditLog } from "@/composables/useAuditLog"

const { selectedRobot } = useSelectedRobot()
const { isLocked, resetLockTimer } = useLockState()
useAuditLog()

const ptz = reactive({ yaw: 0, pitch: 0, zoom: 1, scanMode: "fixed" as "fixed" | "sweep" | "back_and_forth" })

function commit(action: string): void {
  if (!selectedRobot.value) return
  resetLockTimer()
  addAuditLog({ action: "calibrate", operator: "current", targetId: selectedRobot.value.id, targetType: "robot", reason: `PTZ ${action} yaw=${ptz.yaw} pitch=${ptz.pitch} zoom=${ptz.zoom} mode=${ptz.scanMode}` })
}
</script>

<template>
  <div v-if="selectedRobot" class="ptz">
    <div class="ptz__header">
      <span class="ptz__title panel-title">云台控制</span>
      <span class="ptz__target">{{ selectedRobot.name }}</span>
    </div>

    <!-- 方向游戏手柄 -->
    <div class="game-pad">
      <span></span><button class="game-pad-btn" :disabled="isLocked" @click="commit('up')">▲</button><span></span>
      <button class="game-pad-btn" :disabled="isLocked" @click="commit('left')">◀</button>
      <button class="game-pad-btn center" :disabled="isLocked" @click="commit('home')">◎</button>
      <button class="game-pad-btn" :disabled="isLocked" @click="commit('right')">▶</button>
      <span></span><button class="game-pad-btn" :disabled="isLocked" @click="commit('down')">▼</button><span></span>
    </div>

    <div class="ptz__row"><label>方位角</label><input type="range" v-model.number="ptz.yaw" min="0" max="360" :disabled="isLocked" @change="commit('yaw')" /><b>{{ ptz.yaw }}°</b></div>
    <div class="ptz__row"><label>俯仰角</label><input type="range" v-model.number="ptz.pitch" min="-90" max="30" :disabled="isLocked" @change="commit('pitch')" /><b>{{ ptz.pitch }}°</b></div>
    <div class="ptz__row"><label>焦距</label><input type="range" v-model.number="ptz.zoom" min="1" max="20" :disabled="isLocked" @change="commit('zoom')" /><b>{{ ptz.zoom }}x</b></div>
    <div class="ptz__row"><label>扫描模式</label>
      <select v-model="ptz.scanMode" :disabled="isLocked" @change="commit('scan')">
        <option value="fixed">定点</option>
        <option value="sweep">连续扫描</option>
        <option value="back_and_forth">往复</option>
      </select>
    </div>
    <div v-if="isLocked" class="ptz__lock-hint">锁定态：只读</div>
  </div>
</template>

<style scoped>
.ptz { font-size: 12px; display: flex; flex-direction: column; gap: 12px; }
.ptz__header { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: linear-gradient(135deg, rgba(107, 142, 173, 0.1), rgba(10, 16, 26, 0.4)); border: 1px solid rgba(107, 142, 173, 0.18); border-radius: 8px; }
.ptz__target { font-size: 12px; color: var(--hud-accent); font-family: var(--hud-mono); font-weight: 500; }

/* 游戏手柄方向键 */
.game-pad {
  display: grid; grid-template-columns: repeat(3, 48px); grid-template-rows: repeat(3, 48px);
  gap: 8px; justify-content: center; margin: 6px 0;
  padding: 16px; background: rgba(5, 8, 14, 0.5);
  border: 1px solid rgba(107, 142, 173, 0.16); border-radius: 10px;
}
.game-pad-btn {
  border: 1px solid rgba(107, 142, 173, 0.3);
  background: radial-gradient(circle at 30% 25%, rgba(197, 168, 123, 0.14), rgba(10, 16, 26, 0.6));
  color: var(--hud-text); font-size: 18px;
  border-radius: 12px; cursor: pointer;
  transition: transform 0.08s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}
.game-pad-btn:hover:not(:disabled) { border-color: var(--hud-accent); color: var(--hud-accent); box-shadow: 0 0 12px rgba(197, 168, 123, 0.25); }
.game-pad-btn:active:not(:disabled) { transform: scale(0.92); }
.game-pad-btn.center { font-size: 14px; border-color: rgba(197, 168, 123, 0.4); color: var(--hud-accent); }
.game-pad-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.ptz__row { display: grid; grid-template-columns: 64px 1fr 44px; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(107, 142, 173, 0.1); }
.ptz__row:last-of-type { border-bottom: none; }
.ptz__row label { color: var(--hud-text-dim); font-size: 12px; letter-spacing: 0.5px; }
.ptz__row b { color: var(--hud-accent); font-family: var(--hud-mono); text-align: right; font-size: 13px; font-weight: 500; }
.ptz__row input, .ptz__row select {
  background: rgba(5, 8, 14, 0.7); border: 1px solid rgba(107, 142, 173, 0.22);
  color: var(--hud-text); padding: 6px 10px; border-radius: 6px; font-size: 12px;
  transition: border-color 0.2s ease;
}
.ptz__row input:focus, .ptz__row select:focus { outline: none; border-color: rgba(197, 168, 123, 0.55); }
.ptz__row input[type="range"] { accent-color: var(--hud-accent); padding: 0; border: none; background: transparent; }
.ptz__lock-hint { color: var(--hud-warn); margin-top: 8px; font-size: 11px; padding: 8px 12px; background: rgba(245, 158, 11, 0.08); border-left: 3px solid var(--hud-warn); border-radius: 0 6px 6px 0; }
</style>
