/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue"
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
 readonly VITE_MAPBOX_TOKEN: string
 readonly VITE_MAPBOX_STYLE: string
 readonly VITE_INSPECTION_MAP_IMAGE: string
 readonly VITE_VIDEO_VISIBLE: string
 readonly VITE_VIDEO_INFRARED: string
}

interface ImportMeta {
 readonly env: ImportMetaEnv
}
