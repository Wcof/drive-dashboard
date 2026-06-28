<script setup lang="ts">
// InspectionExpiryDetailModal —— 强检设备到期详情弹窗
// 对应需求第10条：30/15/5/0 天梯度升级，展示检验周期表 + 控制措施 + 责任人

import { computed } from "vue"
import { seedInspectionExpiry } from "@/mock/seedDashboard"
import type { InspectionExpiryItem } from "@/types/dashboard"

const props = defineProps<{ itemId: string }>()
const emit = defineEmits<{ (e: "close"): void }>()

const item = computed<InspectionExpiryItem | undefined>(() =>
  seedInspectionExpiry.find(i => i.id === props.itemId)
)

// 提醒梯度对照表（对应需求：30/15/5/0 天）
const gradientTable = computed(() => {
  if (!item.value) return []
  const d = item.value.daysRemaining
  return [
    {
      threshold: "30 天", target: "操作工 + 设备管理人员", frequency: "一次提醒",
      requirement: "安排检验计划，不影响安全", active: d > 15 && d <= 30, tone: "normal",
    },
    {
      threshold: "15 天", target: "中心领导", frequency: "一次提醒",
      requirement: "确认检验进度", active: d > 5 && d <= 15, tone: "warn",
    },
    {
      threshold: "5 天", target: "公司领导", frequency: "每小时提醒",
      requirement: "研判是否需要停车", active: d > 0 && d <= 5, tone: "urgent",
    },
    {
      threshold: "0 天", target: "全员", frequency: "持续告警",
      requirement: "异常处理，紧急停车", active: d <= 0, tone: "critical",
    },
  ]
})

function fmtDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("zh-CN")
}

function statusClass(s?: string): string {
  if (s === "已过期") return "st-critical"
  if (s === "紧急") return "st-urgent"
  if (s === "临近到期") return "st-warn"
  return "st-normal"
}

function riskClass(r?: string): string {
  if (r === "高") return "risk-high"
  if (r === "中") return "risk-mid"
  return "risk-low"
}
</script>

<template>
  <div v-if="item" class="modal-mask" @click.self="emit('close')">
    <div class="modal modal--wide">
      <div class="modal__title">
        <span>🔧 强检设备详情</span>
        <span class="modal__subtitle">{{ item.name }}</span>
      </div>

      <div class="modal__body">
        <!-- 基础信息 -->
        <section class="detail-section">
          <div class="section-title">基础信息</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">设备名称</span>
              <span class="info-val">{{ item.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">设备类别</span>
              <span class="info-val">{{ item.category }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">所在位置</span>
              <span class="info-val">📍 {{ item.location }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">责任人</span>
              <span class="info-val">👤 {{ item.responsiblePerson ?? '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">上次检验</span>
              <span class="info-val">{{ fmtDate(item.lastInspectionDate ?? '') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">检验周期</span>
              <span class="info-val">{{ item.inspectionCycle ?? 12 }} 个月</span>
            </div>
            <div class="info-item">
              <span class="info-label">下次到期</span>
              <span class="info-val" :class="statusClass(item.status)">{{ fmtDate(item.deadline) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">剩余天数</span>
              <span class="info-val" :class="statusClass(item.status)">
                {{ item.daysRemaining <= 0 ? '已过期' : `${item.daysRemaining} 天` }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">设备状态</span>
              <span class="info-val"><span class="status-tag" :class="statusClass(item.status)">{{ item.status ?? '正常' }}</span></span>
            </div>
            <div class="info-item">
              <span class="info-label">风险等级</span>
              <span class="info-val"><span class="risk-tag" :class="riskClass(item.riskLevel)">{{ item.riskLevel ?? '低' }}</span></span>
            </div>
          </div>
        </section>

        <!-- 提醒梯度表 -->
        <section class="detail-section">
          <div class="section-title">提醒梯度对照表</div>
          <table class="gradient-table">
            <thead>
              <tr>
                <th>提前时间</th>
                <th>提醒对象</th>
                <th>提醒频率</th>
                <th>处理要求</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in gradientTable" :key="g.threshold" :class="{ 'row-active': g.active, [`row-${g.tone}`]: true }">
                <td class="mono"><strong>{{ g.threshold }}</strong></td>
                <td>{{ g.target }}</td>
                <td>{{ g.frequency }}</td>
                <td>{{ g.requirement }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 控制措施 -->
        <section class="detail-section">
          <div class="section-title">控制措施</div>
          <div class="measures-list">
            <div v-for="(m, idx) in (item.measures ?? [])" :key="idx" class="measure-item">
              <span class="measure-idx">{{ idx + 1 }}</span>
              <span class="measure-text">{{ m }}</span>
            </div>
          </div>
        </section>
      </div>

      <div class="modal__actions">
        <button class="btn btn--confirm" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal--wide { min-width: 640px; max-width: 820px; }
.modal__title { display: flex; flex-direction: column; gap: 4px; }
.modal__subtitle { font-size: 12px; color: var(--hud-text-dim); font-weight: 400; }
.modal__body { display: flex; flex-direction: column; }

.detail-section { margin-bottom: 16px; }
.section-title {
  font-size: 12px; color: var(--hud-accent); letter-spacing: 1px;
  padding: 6px 0; border-bottom: 1px solid rgba(0, 229, 255, 0.15); margin-bottom: 10px;
}

.info-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px;
}
.info-item { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px; background: rgba(5,8,14,0.5); border-radius: 4px; border: 1px solid rgba(107,142,173,0.12); }
.info-label { font-size: 10px; color: var(--hud-text-dim); letter-spacing: 0.5px; }
.info-val { font-size: 12px; color: var(--hud-text); font-family: var(--hud-mono); }

.status-tag { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; border: 1px solid; }
.st-normal { color: #22C55E; border-color: rgba(34,197,94,0.3); background: rgba(34,197,94,0.08); }
.st-warn { color: #F59E0B; border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.08); }
.st-urgent { color: #F97316; border-color: rgba(249,115,22,0.3); background: rgba(249,115,22,0.1); }
.st-critical { color: #EF4444; border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.12); }

.risk-tag { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; border: 1px solid; }
.risk-low { color: #22C55E; border-color: rgba(34,197,94,0.3); background: rgba(34,197,94,0.08); }
.risk-mid { color: #F59E0B; border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.08); }
.risk-high { color: #EF4444; border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.12); }

.gradient-table { width: 100%; border-collapse: collapse; }
.gradient-table th {
  position: sticky; top: 0; background: rgba(12, 18, 30, 0.98);
  color: var(--hud-accent); font-size: 11px; letter-spacing: 1px;
  padding: 8px 10px; text-align: left; border-bottom: 1px solid rgba(197, 168, 123, 0.25);
}
.gradient-table td { padding: 8px 10px; border-bottom: 1px solid rgba(107, 142, 173, 0.08); font-size: 11px; color: var(--hud-text); }
.gradient-table tr.row-active { background: rgba(0, 229, 255, 0.06); }
.gradient-table tr.row-active td { color: var(--hud-text); font-weight: 500; }
.mono { font-family: var(--hud-mono); }

.measures-list { display: flex; flex-direction: column; gap: 8px; }
.measure-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(5,8,14,0.5); border-radius: 4px; border: 1px solid rgba(107,142,173,0.12); }
.measure-idx {
  width: 22px; height: 22px; border-radius: 50%; background: rgba(0, 229, 255, 0.12);
  border: 1px solid rgba(0, 229, 255, 0.3); color: #00E5FF;
  display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600;
  flex-shrink: 0;
}
.measure-text { font-size: 12px; color: var(--hud-text); }
</style>
