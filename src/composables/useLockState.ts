// 锁定/解锁 composable —— ADR#164/166/195 二次确认 + 15min 无操作自动锁定
import { ref, onUnmounted, getCurrentInstance } from "vue"
import { storage, STORAGE_KEYS } from "@/utils/storage"

export const LOCK_TIMEOUT_MS = 15 * 60 * 1000 // ADR#165 15 分钟

const isLocked = ref<boolean>(storage.get<boolean>(STORAGE_KEYS.LOCK_STATE) ?? true)

let lockTimer: ReturnType<typeof setTimeout> | null = null

export function useLockState() {
  function persist(v: boolean): void {
    isLocked.value = v
    storage.set(STORAGE_KEYS.LOCK_STATE, v)
  }

  // 用户手动解锁/锁定（已二次确认后调用）
  function unlock(): void {
    persist(false)
    resetLockTimer()
  }
  function lock(): void {
    persist(true)
    clearLockTimer()
  }

  // 重置 15min 无操作倒计时；解锁态下任意操作应调用
  function resetLockTimer(): void {
    if (isLocked.value) return
    clearLockTimer()
    lockTimer = setTimeout(() => {
      // 自动锁定（ADR#165：非静默，锁定前由 UI 弹确认；此处仅触发状态，UI 监听 pendingAutoLock）
      pendingAutoLock.value = true
    }, LOCK_TIMEOUT_MS)
  }
  function clearLockTimer(): void {
    if (lockTimer) { clearTimeout(lockTimer); lockTimer = null }
    pendingAutoLock.value = false
  }

  // onUnmounted 仅在组件上下文内注册（测试无上下文时跳过，避免 Vue warn）
  if (getCurrentInstance()) onUnmounted(() => clearLockTimer())

  return { isLocked, unlock, lock, resetLockTimer, clearLockTimer }
}

// 自动锁定待确认标志（UI 监听以弹"即将自动锁定"确认）
export const pendingAutoLock = ref(false)
