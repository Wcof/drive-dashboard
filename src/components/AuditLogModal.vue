<script setup lang="ts">
// AuditLogModal —— ADR#72 审计日志只读查看（增强版：更多操作类型 + 搜索筛选 + 分页）
// 大屏适配：分页展示，无滑轮滚动（人工处理时可用键盘左右翻页）

import { ref, computed, watch } from "vue"
import { useAuditLog } from "@/composables/useAuditLog"

const emit = defineEmits<{ (e: "close"): void }>()
const { auditLog } = useAuditLog()

const searchQuery = ref("")
const actionFilter = ref<string>("all")

const ACTION_TEXT: Record<string, string> = {
  preempt: "抢占任务", terminate: "终止任务", takeover: "故障接管",
  ack_alert: "确认告警", dispatch: "紧急派车", work_ticket_trigger: "作业票触发",
  calibrate: "云台校准", voice_on: "语音开启", voice_off: "语音关闭",
  remote_control_enter: "切入远控", remote_control_exit: "退出远控",
}

const filteredLog = computed(() => {
  let items = auditLog.value
  if (actionFilter.value !== "all") {
    items = items.filter((a) => a.action === actionFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter((a) =>
      a.targetId.toLowerCase().includes(q) ||
      (a.reason ?? "").toLowerCase().includes(q) ||
      a.operator.toLowerCase().includes(q)
    )
  }
  return items
})

const actionTypes = computed(() => {
  const types = new Set<string>()
  auditLog.value.forEach((a) => types.add(a.action))
  return ["all", ...Array.from(types).sort()]
})

const actionCount = computed(() => auditLog.value.length)

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false })
}

// === 分页（大屏无滚动，每页 8 条，按钮翻页） ===
const PAGE_SIZE = 8
const currentPage = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredLog.value.length / PAGE_SIZE)))
const pagedLog = computed(() => filteredLog.value.slice(currentPage.value * PAGE_SIZE, (currentPage.value + 1) * PAGE_SIZE))
// 筛选条件变化时回到首页
watch([searchQuery, actionFilter], () => { currentPage.value = 0 })
function prevPage(): void { if (currentPage.value > 0) currentPage.value-- }
function nextPage(): void { if (currentPage.value < totalPages.value - 1) currentPage.value++ }
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal modal--wide">
      <div class="modal__title">
        审计日志
        <span class="log-count">共 {{ actionCount }} 条</span>
      </div>
      <div class="modal__body">
        <!-- 搜索和筛选 -->
        <div class="log-toolbar">
          <input v-model="searchQuery" class="log-search" placeholder="搜索目标ID/操作人/原因…" />
          <select v-model="actionFilter" class="log-filter">
            <option value="all">全部操作</option>
            <option v-for="at in actionTypes" :key="at" :value="at" v-show="at !== 'all'">{{ ACTION_TEXT[at] ?? at }}</option>
          </select>
        </div>
        <table class="audit-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>操作</th>
              <th>操作人</th>
              <th>目标</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in pagedLog" :key="a.id">
              <td class="mono">{{ fmtTime(a.createdAt) }}</td>
              <td><span class="action-tag" :class="`action--${a.action}`">{{ ACTION_TEXT[a.action] ?? a.action }}</span></td>
              <td>{{ a.operator }}</td>
              <td class="mono">{{ a.targetType }}/{{ a.targetId }}</td>
              <td>{{ a.reason ?? "-" }}</td>
            </tr>
            <tr v-if="!pagedLog.length">
              <td colspan="5" class="empty">{{ searchQuery || actionFilter !== 'all' ? '无匹配记录' : '暂无审计记录' }}</td>
            </tr>
          </tbody>
        </table>
        <!-- 分页控制（大屏无滚动，按钮翻页） -->
        <div v-if="totalPages > 1" class="log-pagination">
          <button class="pg-btn" :disabled="currentPage === 0" @click="prevPage">‹ 上一页</button>
          <span class="pg-info">第 {{ currentPage + 1 }} / {{ totalPages }} 页 · 共 {{ filteredLog.length }} 条</span>
          <button class="pg-btn" :disabled="currentPage >= totalPages - 1" @click="nextPage">下一页 ›</button>
        </div>
      </div>
      <div class="modal__actions">
        <button class="btn btn--confirm" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal--wide { min-width: 720px; max-width: 880px; }
.modal__title { display: flex; align-items: center; gap: 10px; }
.log-count { font-size: 11px; color: var(--hud-text-dim); font-weight: 400; margin-left: auto; }
/* 大屏适配：去除 overflow:auto，分页展示，无滑轮滚动 */
.modal__body { display: flex; flex-direction: column; }
.log-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.log-search { flex: 1; padding: 6px 10px; background: rgba(5,8,14,0.7); border: 1px solid rgba(107,142,173,0.2); color: var(--hud-text); border-radius: 4px; font-size: 11px; }
.log-search:focus { outline: none; border-color: var(--hud-accent); }
.log-filter { padding: 6px 10px; background: rgba(5,8,14,0.7); border: 1px solid rgba(107,142,173,0.2); color: var(--hud-text); border-radius: 4px; font-size: 11px; }
.audit-table { width: 100%; border-collapse: collapse; }
.audit-table th {
  color: var(--hud-accent); font-size: 11px; letter-spacing: 1px;
  padding: 8px 10px; text-align: left; border-bottom: 1px solid rgba(197, 168, 123, 0.25);
}
.audit-table td { padding: 6px 10px; border-bottom: 1px solid rgba(107, 142, 173, 0.08); font-size: 11px; color: var(--hud-text); }
.audit-table tr:hover td { background: rgba(197, 168, 123, 0.04); }
.mono { font-family: var(--hud-mono); color: var(--hud-text-dim); font-size: 10px; }
.action-tag { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; border: 1px solid; }
.action--ack_alert { background: rgba(245,158,11,0.12); color: #F59E0B; border-color: rgba(245,158,11,0.3); }
.action--preempt, .action--terminate { background: rgba(239,68,68,0.12); color: #EF4444; border-color: rgba(239,68,68,0.3); }
.action--takeover { background: rgba(16,185,129,0.12); color: #10B981; border-color: rgba(16,185,129,0.3); }
.action--dispatch { background: rgba(59,130,246,0.12); color: #3B82F6; border-color: rgba(59,130,246,0.3); }
.action--work_ticket_trigger { background: rgba(139,92,246,0.12); color: #8B5CF6; border-color: rgba(139,92,246,0.3); }
.action--calibrate, .action--remote_control_enter { background: rgba(0,229,255,0.12); color: #00E5FF; border-color: rgba(0,229,255,0.3); }
.action--voice_on, .action--voice_off { background: rgba(16,185,129,0.12); color: #22C55E; border-color: rgba(16,185,129,0.3); }
.empty { text-align: center; color: var(--hud-text-faint); padding: 24px; }

/* 分页控制 */
.log-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(107,142,173,0.15); }
.pg-btn { padding: 6px 16px; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.28); color: var(--hud-text-dim); border-radius: 4px; cursor: pointer; font-size: 11px; letter-spacing: 1px; transition: all 0.2s ease; }
.pg-btn:hover:not(:disabled) { border-color: var(--hud-accent); color: var(--hud-accent); background: rgba(197,168,123,0.08); }
.pg-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.pg-info { font-size: 11px; color: var(--hud-text-dim); font-family: var(--hud-mono); letter-spacing: 0.5px; }
</style>
