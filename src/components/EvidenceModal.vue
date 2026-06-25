<script setup lang="ts">
// EvidenceModal —— 影像预览模态（复刻参考页面 evi-modal）
// 三 tab：可见光追踪 / 热红外追踪 / 巡检异状片段 + 缩略图列表

import { ref, computed } from "vue"
import { useDashboard } from "@/composables/useDashboard"
import { evidenceFilter } from "@/utils/mockImage"

const { evidenceModalData, closeEvidenceModal, state, setEvidenceMode } = useDashboard()

const currentImage = ref<string>("")
const activeTab = ref<"normal" | "thermal" | "video">("normal")

const filterStyle = computed(() => evidenceFilter(state.currentEvidenceMode))

function initImage(): void {
  if (evidenceModalData.value) currentImage.value = evidenceModalData.value.image
}
initImage()

function selectThumb(img: string): void {
  currentImage.value = img
}

function switchTab(m: "normal" | "thermal" | "video"): void {
  activeTab.value = m
  setEvidenceMode(m)
}
</script>

<template>
  <div v-if="evidenceModalData" class="evi-modal-mask" @click.self="closeEvidenceModal">
    <div class="evi-modal">
      <div class="evi-modal-close" @click="closeEvidenceModal">×</div>
      <div class="evi-modal-title">{{ evidenceModalData.title || '巡检影像' }}</div>
      <div class="evi-tabs">
        <button class="e-tab" :class="{ active: state.currentEvidenceMode === 'normal' }" @click="switchTab('normal')">可见光追踪</button>
        <button class="e-tab" :class="{ active: state.currentEvidenceMode === 'thermal' }" @click="switchTab('thermal')">热红外追踪</button>
        <button class="e-tab" :class="{ active: state.currentEvidenceMode === 'video' }" @click="switchTab('video')">巡检异状片段</button>
      </div>
      <div class="evi-modal-content" :style="{ backgroundImage: `url('${currentImage}')`, filter: filterStyle }"></div>
      <div class="evi-modal-thumbs">
        <button v-for="(t, idx) in evidenceModalData.thumbs" :key="idx" class="evi-thumb" :class="{ active: currentImage === t.img }" @click="selectThumb(t.img)">
          <span class="evi-thumb-img" :style="{ backgroundImage: `url('${t.img}')` }"></span>
          <span class="evi-thumb-label">{{ t.label }}</span>
        </button>
      </div>
      <div class="evi-modal-meta">
        <h2 class="evi-modal-device">{{ evidenceModalData.device }}</h2>
        <div class="evi-modal-desc">{{ evidenceModalData.meta }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.evi-modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 0.4000rem; }
.evi-modal { width: 100%; max-width: 12.0000rem; max-height: 90vh; display: flex; flex-direction: column; align-items: center; }
.evi-modal-close { position: absolute; top: 0.2000rem; right: 0.3000rem; font-size: 0.3200rem; color: #fff; cursor: pointer; }
.evi-modal-title { width: 100%; max-width: 12.0000rem; margin-bottom: 0.1000rem; color: #dbe7f5; font-size: 0.1800rem; font-family: var(--hud-mono); text-align: left; }
.evi-tabs { display: flex; gap: 0.1200rem; margin-bottom: 0.2000rem; transform: scale(1.2); }
.e-tab { padding: 0.0600rem 0.1400rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 0.0400rem; cursor: pointer; font-size: 0.1200rem; letter-spacing: 1px; }
.e-tab.active { color: var(--hud-accent); border-color: var(--hud-accent); background: rgba(197,168,123,0.12); box-shadow: 0 0 0.1000rem rgba(197,168,123,0.2); }
.evi-modal-content { width: 100%; max-width: 12.0000rem; height: 60vh; border: 0.0200rem solid rgba(197,168,123,0.4); background: center/contain no-repeat; box-shadow: 0 0 0.5000rem rgba(197,168,123,0.3); transition: filter 0.3s ease; }
.evi-modal-thumbs { display: flex; gap: 0.1200rem; margin-top: 0.2000rem; flex-wrap: wrap; justify-content: center; }
.evi-thumb { width: 1.2000rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); border-radius: 0.0400rem; cursor: pointer; padding: 0.0400rem; transition: all 0.2s ease; }
.evi-thumb:hover { border-color: rgba(197,168,123,0.5); }
.evi-thumb.active { border-color: var(--hud-accent); box-shadow: 0 0 0.1200rem rgba(197,168,123,0.3); }
.evi-thumb-img { display: block; width: 100%; height: 0.7000rem; background-size: cover; background-position: center; border-radius: 0.0200rem; }
.evi-thumb-label { display: block; margin-top: 0.0400rem; font-size: 0.1000rem; color: var(--hud-text-dim); text-align: center; }
.evi-modal-meta { margin-top: 0.2000rem; text-align: center; }
.evi-modal-device { font-size: 0.2400rem; color: var(--hud-accent); }
.evi-modal-desc { font-size: 0.1400rem; color: var(--hud-text-dim); margin-top: 0.1000rem; }
</style>
