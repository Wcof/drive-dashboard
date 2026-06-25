// 路网契约子集（对齐 bot src/types/road-network.ts 挑大屏所需）

export type RoadNodeType = "waypoint" | "junction" | "inspection" | "parking" | "charging"
export type RoadSegmentType = "trunk" | "branch" | "patrol" | "service"
export type RoadSegmentStatus = "active" | "inactive" | "construction" | "blocked" | "maintenance"
export type NavigationPointType = "inspection" | "parking" | "charging"

export interface RoadNode {
  id: string
  name?: string
  nodeType: RoadNodeType
  position: { x: number; y: number; lng?: number; lat?: number }
  edgeIds: string[]
  mapId: string
  createdAt: string
  updatedAt: string
}

export interface RoadSegment {
  id: string
  name: string
  code: string
  mapId: string
  area: string
  segmentType: RoadSegmentType
  status: RoadSegmentStatus
  nodeIds: string[]
  length: number
  bidirectional: boolean
  speedLimit: number
  createdAt: string
  updatedAt: string
}

export interface NavigationPoint {
  id: string
  name: string
  code: string
  mapId: string
  area: string
  navType: NavigationPointType
  position: { x: number; y: number }
  nodeId: string
  description?: string
  yaw?: number
  createdAt: string
  updatedAt: string
}
