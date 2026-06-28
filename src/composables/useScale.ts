// useScale —— 智慧大屏分辨率适配核心
// 方案：transform: scale() 锁定 1920×1080 设计稿比例
// UI 层用 ScaleContainer 包裹自研 HUD 面板，地图层保持全屏铺满
// 解决 scale 导致 Mapbox/deck.gl 鼠标点击位置偏移：提供坐标修正函数

import { ref, readonly } from "vue"

// 设计稿基线分辨率
export const DESIGN_WIDTH = 1920
export const DESIGN_HEIGHT = 1080

// 缩放后的设计稿在视口中的偏移（用于地图层坐标修正与 UI 层居中）
export interface ScaleState {
  /** 缩放比例（设计稿 → 视口） */
  scale: number
  /** 缩放后设计稿左上角在视口中的 x 像素偏移 */
  offsetX: number
  /** 缩放后设计稿左上角在视口中的 y 像素偏移 */
  offsetY: number
  /** 当前视口宽 */
  viewportWidth: number
  /** 当前视口高 */
  viewportHeight: number
}

const state = ref<ScaleState>({
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  viewportWidth: DESIGN_WIDTH,
  viewportHeight: DESIGN_HEIGHT,
})

let resizeRafId: number | null = null

function compute(): void {
  const vw = window.innerWidth
  const vh = window.innerHeight
  // 按宽高比锁定：取更受限维度的比例，保证 16:9 不变形
  const scaleByWidth = vw / DESIGN_WIDTH
  const scaleByHeight = vh / DESIGN_HEIGHT
  const scale = Math.min(scaleByWidth, scaleByHeight)
  // 缩放后设计稿居中：剩余空间平均分到两侧
  const scaledW = DESIGN_WIDTH * scale
  const scaledH = DESIGN_HEIGHT * scale
  const offsetX = (vw - scaledW) / 2
  const offsetY = (vh - scaledH) / 2
  state.value = {
    scale,
    offsetX,
    offsetY,
    viewportWidth: vw,
    viewportHeight: vh,
  }
}

function onResize(): void {
  if (resizeRafId !== null) return
  resizeRafId = window.requestAnimationFrame(() => {
    compute()
    resizeRafId = null
  })
}

/** 启动缩放监听（App.vue onMounted 调用一次即可） */
export function setupScale(): void {
  compute()
  window.addEventListener("resize", onResize)
  window.addEventListener("orientationchange", onResize)
}

/** 销毁监听 */
export function teardownScale(): void {
  window.removeEventListener("resize", onResize)
  window.removeEventListener("orientationchange", onResize)
  if (resizeRafId !== null) {
    window.cancelAnimationFrame(resizeRafId)
    resizeRafId = null
  }
}

/** Composable 入口：返回只读缩放状态 */
export function useScale() {
  return {
    scaleState: readonly(state),
    /** 触发重算（如容器尺寸变化） */
    recalc: compute,
  }
}

/**
 * Mapbox 鼠标点击坐标修正函数
 *
 * 背景：UI 层用 transform: scale 包裹后，Mapbox/deck.gl 的 Canvas 若也被 scale，
 * 鼠标事件的 clientX/clientY 会与 Canvas 内部坐标错位，导致点击偏移。
 *
 * 解决方案：地图层不放入 ScaleContainer，而是 absolute 全屏铺满视口，
 * 但其有效可视区域（设计稿中央地图区）需与 UI 层中央区域对齐。
 * 本函数把鼠标事件的视口坐标转换为地图 Canvas 内部坐标（去掉 UI 层遮蔽偏移）。
 *
 * @param clientX 鼠标事件 clientX（视口坐标）
 * @param clientY 鼠标事件 clientY（视口坐标）
 * @param mapClientRect 地图 Canvas 的 getBoundingClientRect()
 * @returns 修正后的 Canvas 内部坐标 { x, y }
 */
export function fixMapPointerCoord(
  clientX: number,
  clientY: number,
  mapClientRect: DOMRect,
): { x: number; y: number } {
  // 地图层不参与 scale，直接用视口坐标减去 Canvas 原点即可
  // 该函数保留为统一入口，便于后续若改用 scale 包裹地图时统一修正
  return {
    x: clientX - mapClientRect.left,
    y: clientY - mapClientRect.top,
  }
}

/**
 * 把视口坐标映射到设计稿坐标（用于 UI 层事件穿透到地图时计算命中区域）
 * 反向：设计稿坐标 → 视口坐标
 */
export function viewportToDesign(clientX: number, clientY: number): { x: number; y: number } {
  const s = state.value
  return {
    x: (clientX - s.offsetX) / s.scale,
    y: (clientY - s.offsetY) / s.scale,
  }
}

export function designToViewport(x: number, y: number): { x: number; y: number } {
  const s = state.value
  return {
    x: s.offsetX + x * s.scale,
    y: s.offsetY + y * s.scale,
  }
}
