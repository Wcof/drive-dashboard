<script setup lang="ts">
// AuditLogModal —— ADR#72 审计日志只读查看
import { useAuditLog } from "@/composables/useAuditLog"

const emit = defineEmits<{ (e: "close"): void }>()
const { auditLog } = useAuditLog()

const ACTION_TEXT: Record<string, string> = {
  preempt: "抢占", terminate: "终止", takeover: "接管", calibrate: "校准",
  ack_alert: "确认告警", dispatch: "派车", work_ticket_trigger: "作业票触发",
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false })
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal modal--wide">
      <div class="modal__title">审计日志</div>
      <div class="modal__body">
        <table class="audit-table">
          <thead><tr><th>时间</th><th>操作</th><th>操作人</th><th>目标</th><th>原因</th></tr></thead>
          <tbody>
            <tr v-for="a in auditLog" :key="a.id">
              <td class="mono">{{ fmtTime(a.createdAt) }}</td>
              <td><span class="action-tag">{{ ACTION_TEXT[a.action] ?? a.action }}</span></td>
              <td>{{ a.operator }}</td>
              <td class="mono">{{ a.targetType }}/{{ a.targetId }}</td>
              <td>{{ a.reason ?? "-" }}</td>
            </tr>
            <tr v-if="!auditLog.length"><td colspan="5" class="empty">暂无审计记录</td></tr>
          </tbody>
        </table>
      </div>
      <div class="modal__actions">
        <button class="btn btn--confirm" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal--wide { min-width: 720px; max-width: 820px; }
.modal__body { max-height: 60vh; overflow: auto; }
.audit-table { width: 100%; border-collapse: collapse; }
.audit-table th {
  position: sticky; top: 0; background: rgba(12, 18, 30, 0.98);
  color: var(--hud-accent); font-size: 11px; letter-spacing: 1px;
  padding: 10px 12px; text-align: left; border-bottom: 1px solid rgba(197, 168, 123, 0.3);
}
.audit-table td { padding: 8px 12px; border-bottom: 1px solid rgba(107, 142, 173, 0.1); font-size: 12px; color: var(--hud-text); }
.audit-table tr:hover td { background: rgba(197, 168, 123, 0.04); }
.mono { font-family: var(--hud-mono); color: var(--hud-text-dim); }
.action-tag {
  display: inline-block; padding: 2px 8px; border-radius: 3px;
  background: rgba(197, 168, 123, 0.12); color: var(--hud-accent);
  font-size: 11px; border: 1px solid rgba(197, 168, 123, 0.3);
}
.empty { text-align: center; color: var(--hud-text-faint); padding: 24px; }
</style>
