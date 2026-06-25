// rem 适配 —— 设计稿基线 1920×1080，约定 100px = 1rem
// 通过动态计算 html font-size 实现整体按视口比例缩放
// 设计稿中所有 px 数值除以 100 即得 rem，转换直观

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080
const BASE_FONT_SIZE = 100 // 100px = 1rem

function computeRootFontSize(): number {
  const vw = window.innerWidth
  const vh = window.innerHeight
  // 按宽高比锁定：以更受限的维度为准，避免比例失调
  const scaleByWidth = vw / DESIGN_WIDTH
  const scaleByHeight = vh / DESIGN_HEIGHT
  const scale = Math.min(scaleByWidth, scaleByHeight)
  // 限制最小字号，避免极小视口下元素消失
  const fontSize = Math.max(BASE_FONT_SIZE * scale, 32)
  return Math.round(fontSize)
}

function applyRootFontSize(): void {
  const fs = computeRootFontSize()
  document.documentElement.style.fontSize = `${fs}px`
}

let resizeRafId: number | null = null
function onResize(): void {
  if (resizeRafId !== null) return
  resizeRafId = window.requestAnimationFrame(() => {
    applyRootFontSize()
    resizeRafId = null
  })
}

export function setupRemAdapter(): void {
  applyRootFontSize()
  window.addEventListener("resize", onResize)
  window.addEventListener("orientationchange", onResize)
}

export function teardownRemAdapter(): void {
  window.removeEventListener("resize", onResize)
  window.removeEventListener("orientationchange", onResize)
  if (resizeRafId !== null) {
    window.cancelAnimationFrame(resizeRafId)
    resizeRafId = null
  }
}

// 当前 root font-size（px），供 JS 内计算像素值时引用
export function currentRootPx(): number {
  return parseFloat(document.documentElement.style.fontSize) || BASE_FONT_SIZE
}

// 把设计稿 px 转 rem（运行时若需在 JS 中拼接尺寸字符串）
export function px2rem(px: number): string {
  return `${(px / BASE_FONT_SIZE).toFixed(4)}rem`
}
