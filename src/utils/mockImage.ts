// mock 影像生成器 —— 生成 SVG data URI 作为巡检/告警/视频预览占位图
// 复刻自参考页面 safety-dashboard/app.js makeMockImg

export function makeMockImg(title: string, c1: string, c2: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 360'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='${c1}'/><stop offset='100%' stop-color='${c2}'/>
      </linearGradient>
    </defs>
    <rect width='600' height='360' fill='url(#g)'/>
    <g opacity='0.25' fill='#fff'>
      <circle cx='90' cy='70' r='50'/><circle cx='510' cy='290' r='70'/><rect x='170' y='80' width='260' height='190' rx='14'/>
    </g>
    <text x='50%' y='52%' font-size='32' text-anchor='middle' fill='#d9e3f0' font-family='Arial, sans-serif'>${title}</text>
  </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

// 影像模式 filter（可见光/热成像/异状片段）
export function evidenceFilter(mode: "normal" | "thermal" | "video"): string {
  if (mode === "normal") return "grayscale(15%) hue-rotate(0deg)"
  if (mode === "thermal") return "saturate(4) hue-rotate(120deg) contrast(1.7)"
  return "sepia(0.3) blur(1px)"
}

// 巡检点影像模式 filter
export function pointPhotoFilter(mode: "optical" | "thermal"): string {
  if (mode === "optical") return "grayscale(10%) contrast(1.05)"
  return "saturate(4) hue-rotate(120deg) contrast(1.7)"
}
