// 通用类型（对齐 bot src/types/common.ts 子集）

export interface Coordinate {
  longitude: number
  latitude: number
  altitude?: number
}

export interface BaseEntity {
  id: string
  createdAt: string // ISO，大屏统一用 string 便于 localStorage 序列化
  updatedAt: string
}
