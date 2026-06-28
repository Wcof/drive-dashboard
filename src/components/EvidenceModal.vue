<script setup lang="ts">
// EvidenceModal —— 证据影像预览模态（增强版：证据链闭环展示）
// 三 tab：可见光追踪 / 热红外追踪 / 巡检异状片段 + 缩略图列表 + 证据元数据
// 支持方向键切换缩略图

import { ref, computed, onMounted, onUnmounted } from "vue"
import { useDashboard } from "@/composables/useDashboard"
import { evidenceFilter } from "@/utils/mockImage"

const { evidenceModalData, closeEvidenceModal, state, setEvidenceMode } = useDashboard()

const currentImage = ref<string>("")
const currentThumbIdx = ref(0)
const activeTab = ref<"normal" | "thermal" | "video">("normal")

const filterStyle = computed(() => evidenceFilter(state.currentEvidenceMode))

const thumbs = computed(() => evidenceModalData.value?.thumbs ?? [])

function initImage(): void {
  if (evidenceModalData.value) {
    currentImage.value = evidenceModalData.value.image
    currentThumbIdx.value = 0
  }
}
initImage()

function selectThumb(img: string, idx: number): void {
  currentImage.value = img
  currentThumbIdx.value = idx
}

function switchTab(m: "normal" | "thermal" | "video"): void {
  activeTab.value = m
  setEvidenceMode(m)
}

// 方向键导航
function onKeydown(e: KeyboardEvent): void {
  if (!evidenceModalData.value) return
  const list = thumbs.value
  if (list.length === 0) return
  if (e.key === 'ArrowLeft') {
    const prev = (currentThumbIdx.value - 1 + list.length) % list.length
    selectThumb(list[prev].img, prev)
  } else if (e.key === 'ArrowRight') {
    const next = (currentThumbIdx.value + 1) % list.length
    selectThumb(list[next].img, next)
  } else if (e.key === 'Escape') {
    closeEvidenceModal()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

// 证据元数据（模拟）
const evidenceMeta = computed(() => [
  { label: '置信度', value: '96.3%' },
  { label: '规则版本', value: 'v2.1.0' },
  { label: '采样时间', value: state.currentEvidenceMode === 'normal' ? '10:32:15' : '10:32:18' },
  { label: '机器位姿', value: 'x: 2847.3, y: 1532.6, θ: 45°' },
  { label: '识别方式', value: state.currentEvidenceMode === 'thermal' ? '热成像分析' : '视觉识别' },
])
</script>

<template>
  <div v-if="evidenceModalData" class="evi-modal-mask" @click.self="closeEvidenceModal">
    <div class="evi-modal">
      <div class="evi-modal-close" @click="closeEvidenceModal">×</div>
      
      <!-- 标题 -->
      <div class="evi-modal-title">{{ evidenceModalData.title || '巡检影像证据' }}</div>
      
      <!-- 证据标签 -->
      <div class="evi-badge">
        <span class="evi-badge-item">📸 证据快照</span>
        <span class="evi-badge-item">🔍 AI识别</span>
        <span class="evi-badge-item">✅ 待复核</span>
      </div>

      <!-- Tab 切换 -->
      <div class="evi-tabs">
        <button class="e-tab" :class="{ active: state.currentEvidenceMode === 'normal' }" @click="switchTab('normal')">可见光追踪</button>
        <button class="e-tab" :class="{ active: state.currentEvidenceMode === 'thermal' }" @click="switchTab('thermal')">热红外追踪</button>
        <button class="e-tab" :class="{ active: state.currentEvidenceMode === 'video' }" @click="switchTab('video')">巡检异状片段</button>
      </div>

      <!-- 主图区域 + 证据元数据并行 -->
      <div class="evi-main-area">
        <div class="evi-image-container">
          <div class="evi-modal-content" :style="{ backgroundImage: `url('${currentImage}')`, filter: filterStyle }"></div>
          <!-- 导航箭头 -->
          <button v-if="thumbs.length > 1" class="evi-nav evi-nav-left" @click="selectThumb(thumbs[(currentThumbIdx - 1 + thumbs.length) % thumbs.length].img, (currentThumbIdx - 1 + thumbs.length) % thumbs.length)">‹</button>
          <button v-if="thumbs.length > 1" class="evi-nav evi-nav-right" @click="selectThumb(thumbs[(currentThumbIdx + 1) % thumbs.length].img, (currentThumbIdx + 1) % thumbs.length)">›</button>
          <!-- 图片计数器 -->
          <div class="evi-counter">{{ currentThumbIdx + 1 }} / {{ thumbs.length }}</div>
        </div>
        
        <!-- 证据元数据面板 -->
        <div class="evi-meta-panel">
          <div class="evi-meta-title">证据属性</div>
          <div class="evi-meta-list">
            <div v-for="m in evidenceMeta" :key="m.label" class="evi-meta-row">
              <span class="evi-meta-label">{{ m.label }}</span>
              <span class="evi-meta-value">{{ m.value }}</span>
            </div>
          </div>
          <div class="evi-meta-divider"></div>
          <div class="evi-meta-title">识别结果</div>
          <div class="evi-result-text" :class="evidenceModalData.eviResult?.includes('未见异常') ? 'safe-txt' : evidenceModalData.eviResult?.includes('异常') ? 'danger-txt' : 'dim'">
            {{ evidenceModalData.eviResult || '等待AI识别结果...' }}
          </div>
        </div>
      </div>

      <!-- 缩略图 -->
      <div class="evi-modal-thumbs">
        <button v-for="(t, idx) in thumbs" :key="idx" class="evi-thumb" :class="{ active: currentThumbIdx === idx }" @click="selectThumb(t.img, idx)">
          <span class="evi-thumb-img" :style="{ backgroundImage: `url('${t.img}')` }"></span>
          <span class="evi-thumb-label">{{ t.label }}</span>
        </button>
      </div>

      <!-- 设备/点位信息 -->
      <div class="evi-modal-meta">
        <span class="evi-modal-device">{{ evidenceModalData.device }}</span>
        <span class="evi-modal-desc">{{ evidenceModalData.meta }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.evi-modal-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 9999;
  display: flex; align-items: center; justify-content: center; padding: 0.3000rem;
}
.evi-modal {
  width: 100%; max-width: 14.0000rem; max-height: 92vh;
  display: flex; flex-direction: column; align-items: center; gap: 0.1000rem;
  position: relative;
}
.evi-modal-close {
  position: fixed; top: 0.2000rem; right: 0.3000rem;
  font-size: 0.4000rem; color: rgba(255,255,255,0.6); cursor: pointer;
  z-index: 100; transition: color 0.2s; line-height: 0.5;
}
.evi-modal-close:hover { color: #fff; }
.evi-modal-title {
  width: 100%; max-width: 14.0000rem;
  color: #dbe7f5; font-size: 0.1800rem; font-family: var(--hud-mono);
  text-align: left; letter-spacing: 1px;
}

/* 证据标签 */
.evi-badge { display: flex; gap: 0.0800rem; width: 100%; max-width: 14.0000rem; }
.evi-badge-item {
  font-size: 0.0900rem; padding: 0.0200rem 0.0800rem;
  background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.2);
  border-radius: 0.0300rem; color: #00E5FF; letter-spacing: 0.5px;
}

.evi-tabs { display: flex; gap: 0.1200rem; }
.e-tab {
  padding: 0.0500rem 0.1200rem; background: rgba(10,16,26,0.7);
  border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim);
  border-radius: 0.0400rem; cursor: pointer; font-size: 0.1100rem; letter-spacing: 1px;
  transition: all 0.2s ease;
}
.e-tab.active {
  color: var(--hud-accent); border-color: var(--hud-accent);
  background: rgba(197,168,123,0.12); box-shadow: 0 0 0.1000rem rgba(197,168,123,0.2);
}

/* 主图 + 元数据并行布局 */
.evi-main-area {
  display: flex; gap: 0.1600rem; width: 100%; max-width: 14.0000rem;
}
.evi-image-container {
  flex: 1; position: relative; height: 55vh;
  border: 0.0200rem solid rgba(197,168,123,0.4);
  box-shadow: 0 0 0.4000rem rgba(197,168,123,0.2);
  overflow: hidden; border-radius: 0.0400rem;
}
.evi-modal-content {
  width: 100%; height: 100%;
  background: center/contain no-repeat;
  transition: filter 0.3s ease;
}

/* 导航箭头 */
.evi-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 0.4000rem; height: 0.8000rem;
  background: rgba(0,0,0,0.5); border: 0; color: #fff;
  font-size: 0.4000rem; cursor: pointer; z-index: 10;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.3s ease; line-height: 0.6;
}
.evi-image-container:hover .evi-nav { opacity: 1; }
.evi-nav-left { left: 0; border-radius: 0 0.0400rem 0.0400rem 0; }
.evi-nav-right { right: 0; border-radius: 0.0400rem 0 0 0.0400rem; }
.evi-nav:hover { background: rgba(0,0,0,0.7); }

/* 图片计数器 */
.evi-counter {
  position: absolute; bottom: 0.0800rem; right: 0.1000rem;
  font-family: var(--hud-mono); font-size: 0.0900rem; color: rgba(255,255,255,0.7);
  background: rgba(0,0,0,0.6); padding: 0.0200rem 0.0800rem; border-radius: 0.0300rem;
}

/* 证据元数据面板 */
.evi-meta-panel {
  width: 2.4000rem; flex-shrink: 0;
  background: rgba(10,16,26,0.8); border: 1px solid rgba(107,142,173,0.2);
  border-radius: 0.0600rem; padding: 0.1400rem;
  display: flex; flex-direction: column; gap: 0.0800rem;
}
.evi-meta-title {
  font-size: 0.1000rem; color: var(--hud-accent); letter-spacing: 1px;
  border-bottom: 1px solid rgba(197,168,123,0.15); padding-bottom: 0.0400rem;
}
.evi-meta-list { display: flex; flex-direction: column; gap: 0.0600rem; }
.evi-meta-row { display: flex; justify-content: space-between; align-items: center; }
.evi-meta-label { font-size: 0.0900rem; color: var(--hud-text-dim); }
.evi-meta-value { font-size: 0.0900rem; color: #E2E8F0; font-family: var(--hud-mono); }
.evi-meta-divider { height: 1px; background: rgba(107,142,173,0.15); margin: 0.0200rem 0; }
.evi-result-text { font-size: 0.1100rem; line-height: 1.5; padding: 0.0400rem; background: rgba(0,0,0,0.3); border-radius: 0.0300rem; }
.safe-txt { color: #22C55E; }
.danger-txt { color: #FCA5A5; }
.dim { color: var(--hud-text-dim); }

/* 缩略图列表 */
.evi-modal-thumbs {
  display: flex; gap: 0.1000rem; flex-wrap: wrap; justify-content: center;
  width: 100%; max-width: 14.0000rem;
}
.evi-thumb {
  width: 1.2000rem; background: rgba(10,16,26,0.7);
  border: 1px solid rgba(107,142,173,0.3); border-radius: 0.0400rem;
  cursor: pointer; padding: 0.0400rem; transition: all 0.2s ease;
}
.evi-thumb:hover { border-color: rgba(197,168,123,0.5); }
.evi-thumb.active { border-color: var(--hud-accent); box-shadow: 0 0 0.1200rem rgba(197,168,123,0.3); }
.evi-thumb-img { display: block; width: 100%; height: 0.7000rem; background-size: cover; background-position: center; border-radius: 0.0200rem; }
.evi-thumb-label { display: block; margin-top: 0.0300rem; font-size: 0.0900rem; color: var(--hud-text-dim); text-align: center; }

/* 设备/点位信息 */
.evi-modal-meta {
  display: flex; gap: 0.1200rem; align-items: center;
  width: 100%; max-width: 14.0000rem; padding-top: 0.0800rem;
  border-top: 1px solid rgba(107,142,173,0.12);
}
.evi-modal-device { font-size: 0.1400rem; color: var(--hud-accent); font-family: var(--hud-mono); }
.evi-modal-desc { font-size: 0.1100rem; color: var(--hud-text-dim); }
</style>
