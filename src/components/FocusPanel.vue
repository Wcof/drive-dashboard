<script setup lang="ts">
// FocusPanel —— ADR#84 聚焦态中央容器：双光视频 + 机器人属性摘要 + 操作入口
// 增强版：增加操作按钮条（远程控制/调度/接管）

import { ref, computed } from "vue"
import { useDashboard } from "@/composables/useDashboard"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { useLockState } from "@/composables/useLockState"
import VideoFeed from "./VideoFeed.vue"
import RobotPropertyCard from "./RobotPropertyCard.vue"
import MinimapOverlay from "./MinimapOverlay.vue"

const fullscreen = ref(false)
function toggleFullscreen(): void { fullscreen.value = !fullscreen.value }

const dash = useDashboard()
const { selectedRobot } = useSelectedRobot()
const { isLocked } = useLockState()

const robotLabel = computed(() => {
  const r = selectedRobot.value
  return r ? `${r.name} (${r.id})` : ""
})
</script>

<template>
  <div class="focus-panel" :class="{ 'is-fullscreen': fullscreen }">
    <!-- 操作标题栏 -->
    <div class="focus-header">
      <div class="focus-header-left">
        <span class="focus-dot"></span>
        <span class="focus-robot-name">{{ robotLabel }}</span>
        <span class="focus-mode-tag">聚焦模式</span>
      </div>
      <div class="focus-header-right">
        <button class="focus-action-btn" :disabled="isLocked" :class="{ 'focus-action-btn--locked': isLocked }" :title="isLocked ? '锁定态不可远控' : '切入远程控制'" @click="dash.openControlModal(dash.state.currentRobotId)">{{ isLocked ? '🔒 只读' : '🎮 远程控制' }}</button>
        <button class="focus-action-btn" @click="fullscreen = !fullscreen">{{ fullscreen ? '⬜ 缩略' : '⬛ 全屏' }}</button>
      </div>
    </div>

    <div class="focus-body">
      <VideoFeed :fullscreen="fullscreen" @toggle-fullscreen="toggleFullscreen" />
      <RobotPropertyCard v-if="!fullscreen" />
      <MinimapOverlay v-if="fullscreen" />
    </div>
  </div>
</template>

<style scoped>
.focus-panel {
  flex: 1; display: flex; flex-direction: column; gap: 0.06rem; padding: 0.06rem; position: relative;
}
.focus-panel.is-fullscreen { gap: 0; padding: 0; }

.focus-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.06rem 0.12rem; background: rgba(8, 14, 26, 0.6);
  border: 1px solid rgba(0, 229, 255, 0.12); border-radius: 0.04rem;
}
.focus-header-left { display: flex; align-items: center; gap: 0.08rem; }
.focus-dot { width: 0.08rem; height: 0.08rem; border-radius: 50%; background: #22C55E; box-shadow: 0 0 0.06rem #22C55E; }
.focus-robot-name { font-size: 0.13rem; color: var(--hud-text); letter-spacing: 0.5px; }
.focus-mode-tag { font-size: 0.09rem; color: #00E5FF; background: rgba(0,229,255,0.1); padding: 0.01rem 0.06rem; border-radius: 0.02rem; }
.focus-header-right { display: flex; align-items: center; gap: 0.06rem; }
.focus-action-btn {
  padding: 0.04rem 0.10rem; font-size: 0.10rem; color: var(--hud-text-dim);
  border: 1px solid rgba(107,142,173,0.25); border-radius: 0.03rem;
  background: rgba(10,16,26,0.6); cursor: pointer; transition: all 0.2s ease;
}
.focus-action-btn:hover { border-color: var(--hud-accent); color: var(--hud-accent); }
.focus-action-btn--locked, .focus-action-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.focus-action-btn--locked:hover { border-color: rgba(107,142,173,0.25); color: var(--hud-text-dim); }

.focus-body { flex: 1; display: flex; gap: 0.06rem; min-height: 0; }
.focus-panel.is-fullscreen .focus-body { gap: 0; }
</style>
