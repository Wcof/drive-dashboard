import { createApp } from "vue"
import App from "./App.vue"
import "mapbox-gl/dist/mapbox-gl.css"
import "./styles/global.css"
import { setupScale } from "@/composables/useScale"

// 分层适配：UI 层用 transform: scale 锁定 1920×1080；地图层全屏铺满
// rem 适配保留作字号单位基线，但整体缩放由 scale 控制（避免 rem 在非 16:9 下比例失调）
setupScale()
createApp(App).mount("#app")
