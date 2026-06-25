import { createApp } from "vue"
import App from "./App.vue"
import "mapbox-gl/dist/mapbox-gl.css"
import "./styles/global.css"
import { setupRemAdapter } from "@/utils/remAdapter"

setupRemAdapter()
createApp(App).mount("#app")
