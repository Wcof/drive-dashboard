// realtimeService 接口位 —— ADR#38 真实环境换 WebSocket，mock 阶段不接
// 上层组件通过 mockDataService 拿 reactive state，真实环境切换本实现即可

import type { MockDataState } from "@/mock/mockDataService"

export interface RealtimeService {
  state: MockDataState
  connect(url: string): void
  disconnect(): void
}

export function createRealtimeService(): RealtimeService {
  // 占位：真实环境实现 WebSocket 订阅，把消息写回 state
  throw new Error(
    "realtimeService 未实现：mock 阶段请使用 createMockDataService；真实环境迁移内网服务器时补充 WebSocket 逻辑",
  )
}
