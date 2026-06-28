<script setup lang="ts">
// VideoFeed —— 双光视频 mock，点击全屏
// mock 阶段无真实 mp4 时回退到动态巡检画面（CSS 扫描 + 滚动 HUD），保证演示不黑屏
import { ref, computed, onMounted, onUnmounted } from "vue"
import { makeMockImg } from "@/utils/mockImage"

defineProps<{ fullscreen: boolean }>()
const emit = defineEmits<{ (e: "toggle-fullscreen"): void }>()

const mode = ref<"visible" | "infrared">("visible")
const videoSrc = import.meta.env.VITE_VIDEO_VISIBLE || "/videos/visible.mp4"
const infraredSrc = import.meta.env.VITE_VIDEO_INFRARED || "/videos/infrared.mp4"

// 检测视频文件是否可用：mock 阶段 public/videos 仅 README，走 fallback 画面
const videoAvailable = computed(() => Boolean(import.meta.env.VITE_VIDEO_VISIBLE))
const fallbackBg = computed(() =>
  mode.value === "visible"
    ? makeMockImg("厂区巡检 · 可见光 · 北区装置区", "#1a2b3c", "#2f4a6b")
    : makeMockImg("厂区巡检 · 热成像 · 北区装置区", "#3b1f1f", "#7a3f2f")
)

// HUD 数值实时滚动（演示动态感）
const now = ref(Date.now())
let hudTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => { hudTimer = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { if (hudTimer) clearInterval(hudTimer) })
const ldrVal = computed(() => (88 + Math.floor(now.value / 1000 % 5)).toString())
</script>

<template>
  <div class="video-feed">
    <div class="video-feed__tabs">
      <button class="vf-tab" :class="{ active: mode === 'visible' }" @click="mode = 'visible'">光学视角</button>
      <button class="vf-tab" :class="{ active: mode === 'infrared' }" @click="mode = 'infrared'">热成像视角</button>
      <button class="vf-tab vf-tab--fs" @click="emit('toggle-fullscreen')">{{ fullscreen ? "退出全屏" : "全屏" }}</button>
    </div>
    <div class="video-feed__screen">
      <video v-if="videoAvailable" class="video-feed__video" :src="mode === 'visible' ? videoSrc : infraredSrc" autoplay loop muted playsinline />
      <!-- fallback：无真实视频时渲染动态巡检画面（扫描光带 + 移动目标框 + HUD 滚动） -->
      <div v-else class="vf-fallback" :class="`vf-fallback--${mode}`" :style="{ backgroundImage: `url('${fallbackBg}')` }">
        <div class="vf-scanline"></div>
        <div class="vf-target-tracker">
          <div class="vf-target-box"></div>
          <span class="vf-target-tag">TARGET-01 · {{ mode === 'visible' ? 'OPTICAL' : 'THERMAL' }}</span>
        </div>
        <div class="vf-grid-overlay"></div>
        <div class="vf-hud-stream">
          <span>CAM-01 · 1920×1080</span>
          <span>PTZ {{ mode === 'visible' ? 'F2.8' : 'AUTO' }}</span>
          <span>{{ mode === 'visible' ? 'WB 5500K' : 'ROI 32°C-180°C' }}</span>
          <span>LDR {{ ldrVal }}%</span>
        </div>
      </div>
      <!-- 暗角遮罩 -->
      <div class="vf-vignette"></div>
      <!-- 十字准星 -->
      <div class="video-feed__crosshair">
        <div class="vf-ch-circle"></div>
        <div class="vf-ch-h"></div>
        <div class="vf-ch-v"></div>
      </div>
      <!-- 四角装饰 -->
      <div class="vf-corner vf-corner--tl"></div>
      <div class="vf-corner vf-corner--tr"></div>
      <div class="vf-corner vf-corner--bl"></div>
      <div class="vf-corner vf-corner--br"></div>
      <!-- HUD -->
      <div class="video-feed__hud">
        <span class="vf-cam">CAM-01 | {{ mode === 'visible' ? 'OPTICAL' : 'THERMAL' }}</span>
        <span class="ptz-live">● LIVE</span>
      </div>
      <div class="vf-meta">
        <span>REC · 4K</span>
        <span>30FPS</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-feed { flex: 1; background: #000; border: 1px solid rgba(197,168,123,0.32); border-radius: 8px; display: flex; flex-direction: column; position: relative; min-height: 220px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.4); }

.video-feed__tabs { display: flex; gap: 8px; padding: 8px 10px; background: rgba(8,12,22,0.92); border-bottom: 1px solid rgba(107,142,173,0.22); }
.vf-tab { background: rgba(255,255,255,0.04); border: 1px solid rgba(107,142,173,0.22); color: var(--hud-text-dim); padding: 6px 14px; cursor: pointer; font-size: 11px; border-radius: 999px; transition: all 0.2s; letter-spacing: 0.5px; }
.vf-tab:hover { border-color: rgba(197,168,123,0.4); color: var(--hud-text); }
.vf-tab.active { color: var(--hud-accent); border-color: var(--hud-accent); background: rgba(197,168,123,0.15); box-shadow: 0 0 10px rgba(197,168,123,0.2); }
.vf-tab--fs { margin-left: auto; }

.video-feed__screen { flex: 1; position: relative; background: linear-gradient(135deg, #1a2538, #355278); overflow: hidden; }
.video-feed__video { width: 100%; height: 100%; object-fit: cover; }

/* fallback 动态巡检画面 */
.vf-fallback { position: absolute; inset: 0; background-size: cover; background-position: center; overflow: hidden; }
.vf-fallback--infrared { filter: saturate(4) hue-rotate(120deg) contrast(1.7); }
.vf-scanline { position: absolute; left: 0; right: 0; height: 40%; background: linear-gradient(180deg, transparent, rgba(0,229,255,0.18), transparent); animation: vfScan 3.2s linear infinite; pointer-events: none; }
@keyframes vfScan { 0% { top: -40%; } 100% { top: 100%; } }
.vf-grid-overlay { position: absolute; inset: 0; background-image: linear-gradient(rgba(0,229,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.08) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; opacity: 0.5; }
.vf-target-tracker { position: absolute; top: 38%; left: 42%; width: 120px; height: 80px; animation: vfTrack 6s ease-in-out infinite; pointer-events: none; }
@keyframes vfTrack { 0%,100% { transform: translate(0,0); } 25% { transform: translate(40px,-20px); } 50% { transform: translate(-30px,30px); } 75% { transform: translate(20px,40px); } }
.vf-target-box { width: 100%; height: 100%; border: 2px solid #EF4444; border-radius: 4px; box-shadow: 0 0 12px rgba(239,68,68,0.6); }
.vf-target-tag { position: absolute; top: -18px; left: 0; font-size: 10px; color: #FCA5A5; background: rgba(0,0,0,0.7); padding: 1px 6px; border-radius: 3px; font-family: var(--hud-mono); white-space: nowrap; }
.vf-hud-stream { position: absolute; top: 10px; left: 14px; display: flex; flex-direction: column; gap: 3px; color: rgba(255,255,255,0.7); font-family: var(--hud-mono); font-size: 10px; pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.9); }

.vf-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%); }

/* 十字准星 */
.video-feed__crosshair { position: absolute; top: 50%; left: 50%; width: 80px; height: 80px; transform: translate(-50%,-50%); pointer-events: none; }
.vf-ch-circle { position: absolute; inset: 0; border: 1px solid rgba(197,168,123,0.6); border-radius: 50%; }
.vf-ch-circle::before { content: ""; position: absolute; inset: 8px; border: 1px dashed rgba(197,168,123,0.3); border-radius: 50%; }
.vf-ch-h { position: absolute; top: 50%; left: -20px; right: -20px; height: 1px; background: rgba(197,168,123,0.5); }
.vf-ch-v { position: absolute; left: 50%; top: -20px; bottom: -20px; width: 1px; background: rgba(197,168,123,0.5); }

/* 四角装饰 */
.vf-corner { position: absolute; width: 18px; height: 18px; border: 2px solid rgba(197,168,123,0.55); pointer-events: none; }
.vf-corner--tl { top: 10px; left: 10px; border-right: none; border-bottom: none; }
.vf-corner--tr { top: 10px; right: 10px; border-left: none; border-bottom: none; }
.vf-corner--bl { bottom: 10px; left: 10px; border-right: none; border-top: none; }
.vf-corner--br { bottom: 10px; right: 10px; border-left: none; border-top: none; }

.video-feed__hud { position: absolute; bottom: 12px; left: 14px; display: flex; gap: 14px; color: rgba(255,255,255,0.85); font-family: var(--hud-mono); font-size: 11px; pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.9); }
.vf-meta { position: absolute; bottom: 12px; right: 14px; display: flex; gap: 12px; color: rgba(255,255,255,0.6); font-family: var(--hud-mono); font-size: 10px; pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.9); }
.ptz-live { color: #EF4444; font-size: 11px; font-weight: 600; animation: ptzBlink 1.5s infinite; }
@keyframes ptzBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
</style>
