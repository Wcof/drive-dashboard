import { describe, it, expect, beforeEach } from "vitest"
import { useLockState, LOCK_TIMEOUT_MS, pendingAutoLock } from "@/composables/useLockState"
import { storage, STORAGE_KEYS } from "@/utils/storage"

beforeEach(() => {
  localStorage.clear()
  pendingAutoLock.value = false
})

describe("useLockState 二次确认+15min自动锁定（ADR#164/165/195）", () => {
  it("LOCK_TIMEOUT_MS = 15 分钟", () => {
    expect(LOCK_TIMEOUT_MS).toBe(15 * 60 * 1000)
  })

  it("unlock/lock 切换并持久化", () => {
    const { isLocked, unlock, lock } = useLockState()
    expect(isLocked.value).toBe(true) // 默认锁定
    unlock()
    expect(isLocked.value).toBe(false)
    expect(storage.get<boolean>(STORAGE_KEYS.LOCK_STATE)).toBe(false)
    lock()
    expect(isLocked.value).toBe(true)
    expect(storage.get<boolean>(STORAGE_KEYS.LOCK_STATE)).toBe(true)
  })

  it("pendingAutoLock 初始 false", () => {
    expect(pendingAutoLock.value).toBe(false)
  })
})
