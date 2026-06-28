<script setup lang="ts">
// MapToolbar —— 地图工具栏（复刻参考页面 display-control + 搜索 + 视角重置 + 调度/驾驶舱入口）
// 含：显示控制 popover（checkboxes）+ 模糊搜索（select+input）+ 视角重置 + 调度台/驾驶舱

import { ref, computed } from "vue"
import { useDashboard } from "@/composables/useDashboard"
import { useMapbox } from "@/composables/useMapbox"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { useLockState } from "@/composables/useLockState"

const { mapUi, searchType, searchInput, robotsExt, docks, apDevices, setFocus, resetToGlobal, openControlModal, state } = useDashboard()
const { map } = useMapbox()
const { select } = useSelectedRobot()
const { isLocked } = useLockState()

const showDisplayControl = ref(false)
const showSearch = ref(false)
const activeTab = ref("overview")

const mapTabs = [
  { key: "overview", label: "地图总览" },
  { key: "route", label: "巡检路线" },
  { key: "device", label: "设备分布" },
  { key: "heatmap", label: "告警热力" },
] as const

// 搜索候选列表
const searchOptions = computed(() => {
  const q = searchInput.value.trim().toLowerCase()
  const results: { type: string; id: string; label: string }[] = []
  if (!q) return results

  if (searchType.value === "all" || searchType.value === "robot") {
    robotsExt.value.forEach((r) => {
      if (r.id.toLowerCase().includes(q) || r.label.toLowerCase().includes(q))
        results.push({ type: "robot", id: r.id, label: `🤖 ${r.id} ${r.label}` })
    })
  }
  if (searchType.value === "all" || searchType.value === "dock") {
    docks.value.forEach((d) => {
      if (d.id.toLowerCase().includes(q) || d.name.toLowerCase().includes(q))
        results.push({ type: "dock", id: d.id, label: `⚡ ${d.name}` })
    })
  }
  if (searchType.value === "all" || searchType.value === "ap") {
    apDevices.value.forEach((a) => {
      if (a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
        results.push({ type: "ap", id: a.id, label: `📡 ${a.name}` })
    })
  }
  return results.slice(0, 10)
})

function onSearchSelect(item: { type: string; id: string }): void {
  setFocus(item.type as any, item.id)
  showSearch.value = false
  searchInput.value = ""
}

function resetView(): void {
  if (map.value) {
    map.value.easeTo({ center: [121.4740, 31.2300], zoom: 15.5, pitch: 60, bearing: -15, duration: 1000 })
  }
}

function gotoGlobal(): void {
  resetToGlobal()
  resetView()
}

// 调度台 → 进入聚焦态 + 打开调度弹窗（DispatchModal）
function gotoDispatch(): void {
  const target = robotsExt.value.find((r) => r.taskId) ?? robotsExt.value[0]
  if (target) {
    select(target.id)
    state.currentRobotId = target.id
    if (target.taskId) state.currentTaskId = target.taskId
    // 打开调度台弹窗
    state.autoplayEnabled = false
    setFocus("robot", target.id)
  }
}

// 驾驶舱 → 打开远程控制弹窗（ControlModal 承载云台+机器人远控）
function gotoConsole(): void {
  const target = robotsExt.value.find((r) => r.status === "safe") ?? robotsExt.value[0]
  if (target) {
    state.currentRobotId = target.id
    openControlModal(target.id)
    state.autoplayEnabled = false
  }
}

const searchTypeOptions = [
  { value: "all", label: "全部" },
  { value: "robot", label: "机器人" },
  { value: "dock", label: "充电站" },
  { value: "ap", label: "AP设备" },
]
</script>

<template>
  <div class="map-toolbar">
    <!-- 三组并排 tab 工具栏：地图总览 | 视觉重置 | 显示控制 -->
    <div class="toolbar-row">
      <!-- 组一：地图总览（地图模式 tabs） -->
      <div class="toolbar-group segmented">
        <button v-for="t in mapTabs" :key="t.key" class="seg-tab" :class="{ active: activeTab === t.key }" @click="activeTab = t.key">{{ t.label }}</button>
      </div>

      <!-- 组二：视觉重置 -->
      <div class="toolbar-group segmented">
        <button class="seg-tab" @click="resetView">视觉重置</button>
        <button class="seg-tab accent" @click="gotoGlobal">全局总览</button>
      </div>

      <!-- 组三：显示控制（popover） -->
      <div class="toolbar-group segmented relative">
        <button class="seg-tab" :class="{ active: showDisplayControl }" @click="showDisplayControl = !showDisplayControl">显示控制</button>
        <div v-if="showDisplayControl" class="display-control-popover">
          <label class="dc-item"><input type="checkbox" v-model="mapUi.labels" /> 标注</label>
          <label class="dc-item"><input type="checkbox" v-model="mapUi.robots" /> 机器人</label>
          <label class="dc-item"><input type="checkbox" v-model="mapUi.points" /> 巡检点</label>
          <label class="dc-item"><input type="checkbox" v-model="mapUi.docks" /> 充电站</label>
          <label class="dc-item"><input type="checkbox" v-model="mapUi.route" /> 巡检路径</label>
          <label class="dc-item"><input type="checkbox" v-model="mapUi.pointStatus" /> 点位状态</label>
        </div>
      </div>

      <!-- 辅助：搜索定位 + 调度/驾驶舱入口（保留，归入第二行） -->
      <div class="toolbar-group">
        <button class="toolbar-btn" :class="{ active: showSearch }" @click="showSearch = !showSearch">🔍 搜索定位</button>
        <div v-if="showSearch" class="search-popover">
          <select v-model="searchType" class="search-type-sel">
            <option v-for="o in searchTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <input v-model="searchInput" class="search-input" placeholder="输入名称/ID模糊搜索…" />
          <div v-if="searchOptions.length" class="search-results">
            <button v-for="item in searchOptions" :key="item.id" class="search-result-item" @click="onSearchSelect(item)">{{ item.label }}</button>
          </div>
        </div>
      </div>
      <button class="toolbar-btn accent" :disabled="isLocked" :class="{ 'toolbar-btn--disabled': isLocked }" :title="isLocked ? '锁定态不可调度' : '进入调度台'" @click="gotoDispatch">调度台</button>
      <button class="toolbar-btn accent" :disabled="isLocked" :class="{ 'toolbar-btn--disabled': isLocked }" :title="isLocked ? '锁定态不可远控' : '进入驾驶舱远控'" @click="gotoConsole">驾驶舱</button>
    </div>
  </div>
</template>

<style scoped>
.map-toolbar {
  position: absolute; top: 0.16rem; left: 50%; transform: translateX(-50%); z-index: 26;
  display: flex; flex-direction: column; align-items: center; gap: 0.10rem; pointer-events: auto;
}
/* 三组并排 tab 工具栏 */
.toolbar-row {
  display: flex; align-items: center; gap: 0.12rem; flex-wrap: wrap; justify-content: center;
}
.toolbar-group { display: inline-flex; align-items: center; }
.toolbar-group.relative { position: relative; }
/* 分段式 tab 组 —— 三个 tab 组统一外观 */
.segmented {
  display: inline-flex; gap: 0.02rem; padding: 0.03rem;
  background: rgba(8, 14, 26, 0.78); border: 1px solid rgba(0, 229, 255, 0.22);
  border-radius: 9.9900rem; backdrop-filter: blur(0.10rem);
  box-shadow: 0 0.04rem 0.16rem rgba(0, 0, 0, 0.4);
}
.seg-tab {
  padding: 0.05rem 0.16rem; font-size: 0.11rem; color: var(--hud-text-dim); letter-spacing: 1px;
  border: 0; border-radius: 9.9900rem; background: transparent; cursor: pointer;
  transition: all 0.2s ease; white-space: nowrap;
}
.seg-tab:hover { color: var(--hud-text); }
.seg-tab.active {
  color: #030610; font-weight: 600;
  background: linear-gradient(135deg, #00E5FF, #6B8EAD);
  box-shadow: 0 0 0.10rem rgba(0, 229, 255, 0.5);
}
.seg-tab.accent.active {
  background: linear-gradient(135deg, #C5A87B, #8EAD6B);
  box-shadow: 0 0 0.10rem rgba(197, 168, 123, 0.5);
}
/* 辅助按钮（搜索/调度/驾驶舱） */
.toolbar-btn {
  padding: 0.06rem 0.14rem; font-size: 0.11rem; color: var(--hud-text-dim); letter-spacing: 0.01rem;
  border: 1px solid rgba(0, 229, 255, 0.25); border-radius: 999px;
  background: rgba(8, 14, 26, 0.7); cursor: pointer; backdrop-filter: blur(0.08rem);
  transition: all 0.2s ease; white-space: nowrap;
}
.toolbar-btn:hover { background: rgba(0, 229, 255, 0.1); border-color: rgba(0, 229, 255, 0.5); color: #00E5FF; }
.toolbar-btn.active { color: #00E5FF; border-color: rgba(0, 229, 255, 0.6); background: rgba(0, 229, 255, 0.12); }
.toolbar-btn.accent { border-color: rgba(197, 168, 123, 0.3); }
.toolbar-btn.accent:hover { border-color: rgba(197, 168, 123, 0.6); color: var(--hud-accent); background: rgba(197, 168, 123, 0.1); }
.toolbar-btn--disabled, .toolbar-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.toolbar-btn--disabled:hover, .toolbar-btn:disabled:hover { background: rgba(8, 14, 26, 0.7); border-color: rgba(0, 229, 255, 0.25); color: var(--hud-text-dim); }

.display-control-popover {
  position: absolute; top: 100%; left: 0; margin-top: 0.06rem;
  background: rgba(10, 16, 26, 0.92); border: 1px solid rgba(107, 142, 173, 0.22);
  border-radius: 0.06rem; padding: 0.1rem; min-width: 1.4rem;
  backdrop-filter: blur(0.1rem); z-index: 30;
}
.dc-item { display: flex; align-items: center; gap: 0.06rem; font-size: 0.11rem; color: var(--hud-text-dim); cursor: pointer; padding: 0.03rem 0; }
.dc-item:hover { color: var(--hud-text); }
.dc-item input[type="checkbox"] { accent-color: var(--hud-accent); }

.search-popover {
  position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 0.06rem;
  background: rgba(10, 16, 26, 0.92); border: 1px solid rgba(107, 142, 173, 0.22);
  border-radius: 0.06rem; padding: 0.1rem; min-width: 2.8rem;
  backdrop-filter: blur(0.1rem); z-index: 30;
}
.search-type-sel {
  width: 100%; padding: 0.04rem 0.08rem; background: rgba(5, 8, 14, 0.7); border: 1px solid rgba(107, 142, 173, 0.22);
  color: var(--hud-text); border-radius: 0.04rem; font-size: 0.11rem; margin-bottom: 0.06rem;
}
.search-input {
  width: 100%; padding: 0.06rem 0.1rem; background: rgba(5, 8, 14, 0.7); border: 1px solid rgba(107, 142, 173, 0.22);
  color: var(--hud-text); border-radius: 0.04rem; font-size: 0.11rem;
}
.search-input:focus { border-color: var(--hud-accent); outline: none; }
.search-results { margin-top: 0.06rem; }
.search-result-item {
  display: block; width: 100%; padding: 0.04rem 0.08rem; background: transparent; border: none;
  color: var(--hud-text-dim); font-size: 0.11rem; cursor: pointer; text-align: left; border-radius: 0.02rem;
}
.search-result-item:hover { background: rgba(197, 168, 123, 0.1); color: var(--hud-accent); }
</style>
