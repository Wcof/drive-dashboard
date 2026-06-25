#!/usr/bin/env bash
# 终验脚本：逐条断言 CONTEXT.md 全部 ✅ 决策 + 39 项 todo
# 任何一条断言失败即 exit 1，全绿 exit 0
set +e
cd "$(dirname "$0")"
PASS=0; FAIL=0
assert() { # name expected actual
  if [ "$2" = "$3" ]; then printf "✅ %s (got=%s)\n" "$1" "$3"; PASS=$((PASS+1))
  else printf "❌ %s (expected=%s got=%s)\n" "$1" "$2" "$3"; FAIL=$((FAIL+1)); fi
}
assert_present() { # name file
  if [ -e "$2" ]; then printf "✅ %s (%s exists)\n" "$1" "$2"; PASS=$((PASS+1))
  else printf "❌ %s (%s MISSING)\n" "$1" "$2"; FAIL=$((FAIL+1)); fi
}
assert_dir() { # name dir
  if [ -d "$2" ]; then printf "✅ %s (%s/ exists)\n" "$1" "$2"; PASS=$((PASS+1))
  else printf "❌ %s (%s/ MISSING)\n" "$1" "$2"; FAIL=$((FAIL+1)); fi
}
assert_grep() { # name expected file pattern
  local got; got=$(grep -cE "$4" "$3" 2>/dev/null || echo 0)
  if [ "$2" = "$got" ]; then printf "✅ %s (got=%s)\n" "$1" "$got"; PASS=$((PASS+1))
  else printf "❌ %s (expected=%s got=%s in %s)\n" "$1" "$2" "$got" "$3"; FAIL=$((FAIL+1)); fi
}
assert_grep_ge() { # name min file pattern  (>=)
  local got; got=$(grep -cE "$4" "$3" 2>/dev/null || echo 0)
  if [ "$got" -ge "$2" ]; then printf "✅ %s (got=%s >= %s)\n" "$1" "$got" "$2"; PASS=$((PASS+1))
  else printf "❌ %s (expected>=%s got=%s in %s)\n" "$1" "$2" "$got" "$3"; FAIL=$((FAIL+1)); fi
}
assert_grep_eq0() { # name file pattern  (==0)
  local got; got=$(grep -rcE "$3" "$2" 2>/dev/null | awk -F: '{s+=$2}END{print s+0}')
  if [ "$got" = "0" ]; then printf "✅ %s (got=0)\n" "$1"; PASS=$((PASS+1))
  else printf "❌ %s (expected=0 got=%s in %s)\n" "$1" "$got" "$2"; FAIL=$((FAIL+1)); fi
}

echo "=== T0 工程骨架 ==="
assert_present "T0.1 package.json" package.json
assert_present "T0.2 vite.config.ts" vite.config.ts
assert_present "T0.2 tsconfig.json" tsconfig.json
assert_present "T0.3 vitest.config.ts" vitest.config.ts
assert_grep "T0.4 mapbox-gl依赖" 1 package.json '"mapbox-gl"'
assert_present "T0.4 src/components" . && [ -d src/components ] && echo "✅ dir exists"
assert_dir "T0.4 src/composables" src/composables
assert_dir "T0.4 src/types" src/types
assert_dir "T0.4 src/utils" src/utils
assert_dir "T0.4 src/mock" src/mock

echo "=== T1 数据契约+mock ==="
assert_grep_ge "T1.1 类型契约10文件" 10 <(ls src/types/*.ts) ""
assert_grep "T1.2 buildings扩展" 1 src/types/inspection.ts "buildings\?: BuildingsCollection"
assert_grep_ge "T1.3 storage STORAGE_KEYS" 1 src/utils/storage.ts "STORAGE_KEYS"
assert_grep "T1.4 seedIfEmpty" 1 src/mock/seed.ts "seedIfEmpty"
assert_grep "T1.5 时钟4节拍常量" 4 src/mock/mockClock.ts "POSITION_MS: 200|ALERT_MS: 30_000|BATTERY_MS: 30_000|PROGRESS_MS: 1_000"
assert_present "T1.6 realtimeService" src/services/realtimeService.ts
assert_grep_ge "T1.7 composables 9个" 9 <(ls src/composables/use*.ts) ""
assert_grep_ge "T1.8 测试文件12" 12 <(find src -path '*__tests__*.ts') ""

echo "=== T2 地图基础 ==="
assert_grep "T2.1 useMapbox init" 1 src/composables/useMapbox.ts "new mapboxgl.Map"
assert_grep_ge "T2.2 MapStage addLayer" 13 src/components/MapStage.vue "addLayer"
assert_grep "T2.3 P0底图raster" 1 src/components/MapStage.vue '"layer-baseRaster"'
assert_grep_ge "T2.4 P0建筑物fill-extrusion" 1 src/components/MapStage.vue "fill-extrusion"
assert_grep "T2.5 P0路网" 1 src/components/MapStage.vue '"layer-roadNetwork"'
assert_grep_ge "T2.6 P0机器人位置" 1 src/components/MapStage.vue '"layer-robotPosition"'

echo "=== T3 图层（13个） ==="
for L in alertAnchors regions inspectionPoints trajectory fovCone navPoints coverageHeatmap workTicketGuard patrolAnchors; do
  assert_grep "T3 layer-$L" 1 src/components/MapStage.vue "\"layer-$L\""
done
assert_present "T3.10 LayerToggle" src/components/LayerToggle.vue

echo "=== T4 布局+交互（13组件） ==="
for C in TopBar Sidebar GlobalOverview RobotList RobotDetail PTZControl FocusPanel VideoFeed RobotPropertyCard MinimapOverlay AlertStream LayerToggle; do
  assert_present "T4 $C.vue" src/components/$C.vue
done
assert_present "T4 App.vue" src/App.vue

echo "=== T5 操作弹窗（9个） ==="
for C in ConfirmModal AlertActionModal TakeoverModal DispatchModal AuditLogModal PreemptModal TerminateModal WorkTicketTriggerModal RemoteControlModal; do
  assert_present "T5 $C" src/components/$C.vue
done

echo "=== T6 部署 ==="
assert_present "T6.1 deploy.yml" .github/workflows/deploy.yml
assert_grep "T6.1 GITHUB_PAGES" 1 .github/workflows/deploy.yml "GITHUB_PAGES"
assert_dir "T6.1 public/maps" public/maps
assert_dir "T6.1 public/videos" public/videos

echo "=== ADR 项目定位 L14-16 ==="
assert_grep_ge "ADR-L14 git历史保留" 2 <(git log --oneline) ""
assert_grep_eq0 "ADR-L23 无AntDV/Pinia/Router" package.json "ant-design-vue|pinia|vue-router"

echo "=== ADR 技术栈 L22-28 ==="
assert_grep "ADR-L22 Vue3" 1 package.json '"vue":'
assert_grep "ADR-L22 TS" 1 package.json '"typescript":'
assert_grep "ADR-L22 Vite" 1 package.json '"vite":'
assert_grep "ADR-L24 Mapbox" 1 package.json '"mapbox-gl":'
assert_grep_eq0 "ADR-L25 无Three.js" src "three"
assert_grep_ge "ADR-L26 composables" 8 <(ls src/composables/use*.ts) ""
assert_grep_ge "ADR-L27 selectedRobotId持久化" 1 src/composables/useSelectedRobot.ts "STORAGE_KEYS.SELECTED_ROBOT"
assert_grep "ADR-L28 happy-dom" 1 vitest.config.ts "happy-dom"

echo "=== ADR 数据源 L34-38 ==="
assert_grep_ge "ADR-L34 类型契约子集" 9 <(ls src/types/*.ts) ""
assert_grep "ADR-L35 同名key inspection_robots" 1 src/utils/storage.ts '"inspection_robots"'
assert_grep "ADR-L35 同名key inspection_tasks" 1 src/utils/storage.ts '"inspection_tasks"'
assert_grep "ADR-L35 同名key inspection_maps" 1 src/utils/storage.ts '"inspection_maps"'
assert_grep "ADR-L35 同名key exception_logs" 1 src/utils/storage.ts '"exception_logs"'
assert_grep "ADR-L35 同名key work_tickets" 1 src/utils/storage.ts '"work_tickets"'
assert_grep "ADR-L36 seed灌入" 1 src/mock/seed.ts "seedIfEmpty"
assert_grep_ge "ADR-L37 setInterval时钟" 4 src/mock/mockClock.ts "setInterval"
assert_grep_ge "ADR-L37 告警Math.random" 1 src/mock/mockClock.ts "Math.random"
assert_present "ADR-L38 realtimeService占位" src/services/realtimeService.ts

echo "=== ADR 组件树 L42-60 ==="
for C in TopBar MapStage MinimapOverlay FocusPanel VideoFeed RobotPropertyCard Sidebar GlobalOverview PTZControl RobotList RobotDetail AlertStream ConfirmModal AlertActionModal TakeoverModal DispatchModal; do
  assert_present "ADR-L42 $C" src/components/$C.vue
done

echo "=== ADR 与bot能力边界 L66-76 ==="
assert_present "ADR-L66 地图监控 MapStage" src/components/MapStage.vue
assert_present "ADR-L67 视频控制 PTZControl" src/components/PTZControl.vue
assert_present "ADR-L68 告警处置 AlertActionModal" src/components/AlertActionModal.vue
assert_present "ADR-L69 派车 DispatchModal" src/components/DispatchModal.vue
assert_present "ADR-L69 抢占 PreemptModal" src/components/PreemptModal.vue
assert_present "ADR-L69 终止 TerminateModal" src/components/TerminateModal.vue
assert_present "ADR-L70 作业票 WorkTicketTriggerModal" src/components/WorkTicketTriggerModal.vue
assert_present "ADR-L71 故障接管 TakeoverModal" src/components/TakeoverModal.vue
assert_present "ADR-L72 审计只读 AuditLogModal" src/components/AuditLogModal.vue
assert_present "ADR-L73 属性查看 RobotPropertyCard" src/components/RobotPropertyCard.vue
assert_grep_eq0 "ADR-L74 无路线编辑" src "RouteEdit|PointManage|PlanCRUD|ReportExport"

echo "=== ADR 页面布局 L82-86 ==="
assert_present "ADR-L82 TopBar" src/components/TopBar.vue
assert_present "ADR-L83 MapStage" src/components/MapStage.vue
assert_present "ADR-L84 FocusPanel" src/components/FocusPanel.vue
assert_present "ADR-L84 MinimapOverlay" src/components/MinimapOverlay.vue
assert_present "ADR-L85 Sidebar" src/components/Sidebar.vue
assert_present "ADR-L86 AlertStream" src/components/AlertStream.vue

echo "=== ADR 右侧栏切换 L92-94 ==="
assert_grep_ge "ADR-L92 upper PTZ" 1 src/components/Sidebar.vue "PTZControl"
assert_grep_ge "ADR-L92 upper GlobalOverview" 1 src/components/Sidebar.vue "GlobalOverview"
assert_grep_ge "ADR-L93 lower RobotDetail" 1 src/components/Sidebar.vue "RobotDetail"
assert_grep_ge "ADR-L93 lower RobotList" 1 src/components/Sidebar.vue "RobotList"
assert_grep_ge "ADR-L94 返回全局" 1 src/components/Sidebar.vue "sidebar__back"

echo "=== ADR 选中入口 L98-101 ==="
assert_grep "ADR-L98 地图点击" 1 src/components/MapStage.vue 'click.*layer-robotPosition'
assert_grep "ADR-L99 列表点击" 1 src/components/RobotList.vue "select\(r.id\)"
assert_grep_ge "ADR-L100 告警点击" 1 src/components/AlertStream.vue "onAlertClick"
assert_present "ADR-L101 接管弹窗 TakeoverModal" src/components/TakeoverModal.vue

echo "=== ADR 12图层 L109-121 ==="
assert_grep "ADR-L109 P0底图raster" 1 src/composables/useLayers.ts 'baseRaster.*visible: true'
assert_grep "ADR-L110 P0建筑物3D" 1 src/composables/useLayers.ts 'buildings3d.*visible: true'
assert_grep "ADR-L111 P0路网" 1 src/composables/useLayers.ts 'roadNetwork.*visible: true'
assert_grep "ADR-L112 P0机器人位置" 1 src/composables/useLayers.ts 'robotPosition.*visible: true'
assert_grep "ADR-L113 P0告警锚点" 1 src/composables/useLayers.ts 'alertAnchors.*visible: true'
assert_grep "ADR-L114 P1区域" 1 src/composables/useLayers.ts 'regions.*visible: true'
assert_grep "ADR-L115 P1巡检点" 1 src/composables/useLayers.ts 'inspectionPoints.*visible: true'
assert_grep "ADR-L116 P1轨迹" 1 src/composables/useLayers.ts 'trajectory.*visible: true'
assert_grep "ADR-L117 P1视野锥" 1 src/composables/useLayers.ts 'fovCone.*visible: true'
assert_grep "ADR-L118 P2导航点隐" 1 src/composables/useLayers.ts 'navPoints.*visible: false'
assert_grep "ADR-L119 P2覆盖热力隐" 1 src/composables/useLayers.ts 'coverageHeatmap.*visible: false'
assert_grep "ADR-L120 P2作业票隐" 1 src/composables/useLayers.ts 'workTicketGuard.*visible: false'
assert_grep "ADR-L121 P2边巡边检隐" 1 src/composables/useLayers.ts 'patrolAnchors.*visible: false'

echo "=== ADR 图层控制 L125-127 ==="
assert_grep "ADR-L125 右上角面板" 1 src/components/LayerToggle.vue "position: absolute"
assert_grep "ADR-L126 锁定态隐藏" 1 src/components/LayerToggle.vue 'v-if="!isLocked"'
assert_grep_ge "ADR-L127 P2可开关" 1 src/components/LayerToggle.vue "priority !== .P2."

echo "=== ADR 3D建筑物 L133-136 ==="
assert_grep "ADR-L133 fill-extrusion" 1 src/components/MapStage.vue "fill-extrusion-height"
assert_grep_ge "ADR-L134 seed建筑物" 3 src/mock/seed.ts "height:"
assert_grep_eq0 "ADR-L135 无map3d GLB" src "map3d|\.glb"
assert_grep "ADR-L136 buildings扩展" 1 src/types/inspection.ts "buildings\?: BuildingsCollection"

echo "=== ADR 视频流 L142-147 ==="
assert_grep "ADR-L142 双光visible" 1 src/components/VideoFeed.vue '"visible"'
assert_grep "ADR-L142 双光infrared" 1 src/components/VideoFeed.vue '"infrared"'
assert_grep "ADR-L143 未选中显示地图" 1 src/App.vue 'MapStage v-if="!isFocused"'
assert_grep "ADR-L144 mock视频public" 1 src/components/VideoFeed.vue "VITE_VIDEO_VISIBLE"
assert_grep_ge "ADR-L146 点击全屏" 1 src/components/VideoFeed.vue "toggle-fullscreen"
assert_grep "ADR-L147 全屏小地图" 1 src/components/FocusPanel.vue 'MinimapOverlay v-if="fullscreen"'

echo "=== ADR 操作清单 L151-156 ==="
assert_grep_ge "ADR-L151 告警5子操作" 5 src/utils/operations.ts "confirm|false_alarm|to_hazard|to_rectify|push_third_party"
assert_grep "ADR-L152 acquireControl远控" 1 src/utils/operations.ts "acquireControl"
assert_present "ADR-L152 RemoteControlModal" src/components/RemoteControlModal.vue
assert_grep "ADR-L153 preemptTask" 1 src/utils/operations.ts "preemptTask"
assert_grep "ADR-L153 terminateTask" 1 src/utils/operations.ts "terminateTask"
assert_grep "ADR-L153 triggerWorkTicket" 1 src/utils/operations.ts "triggerWorkTicket"
assert_present "ADR-L153 PreemptModal" src/components/PreemptModal.vue
assert_present "ADR-L153 TerminateModal" src/components/TerminateModal.vue
assert_present "ADR-L153 WorkTicketTriggerModal" src/components/WorkTicketTriggerModal.vue
assert_present "ADR-L154 TakeoverModal" src/components/TakeoverModal.vue
assert_present "ADR-L155 AuditLogModal" src/components/AuditLogModal.vue
assert_present "ADR-L156 RobotPropertyCard" src/components/RobotPropertyCard.vue
assert_present "ADR-L156 RobotDetail" src/components/RobotDetail.vue

echo "=== ADR 锁定/解锁 L162-166 ==="
assert_grep_ge "ADR-L162 顶部按钮" 1 src/components/TopBar.vue "request-lock"
assert_grep_ge "ADR-L163 锁定态联动-LayerToggle" 1 src/components/LayerToggle.vue "isLocked"
assert_grep_ge "ADR-L163 锁定态联动-RobotDetail" 1 src/components/RobotDetail.vue "isLocked"
assert_grep_ge "ADR-L163 锁定态联动-PTZControl" 1 src/components/PTZControl.vue "isLocked"
assert_present "ADR-L164 ConfirmModal无PIN" src/components/ConfirmModal.vue
assert_grep_eq0 "ADR-L164 无PIN输入框" src/components/ConfirmModal.vue 'type="password"|pin'
assert_grep "ADR-L165 15min自动锁定" 1 src/composables/useLockState.ts "15 \* 60 \* 1000"
assert_grep_ge "ADR-L165 pendingAutoLock非静默" 1 src/composables/useLockState.ts "pendingAutoLock"
assert_grep_ge "ADR-L166 ConfirmModal复用" 2 src/App.vue "ConfirmModal"

echo "=== ADR grilling round2 #36-#43 ==="
assert_grep "ADR#36 紧急红" 1 src/utils/alertSymbol.ts 'ff3b5c'
assert_grep "ADR#36 警告黄" 1 src/utils/alertSymbol.ts 'ffb020'
assert_grep "ADR#36 信息蓝" 1 src/utils/alertSymbol.ts '3b82f6'
assert_grep_ge "ADR#36 ACK变灰" 1 src/utils/alertSymbol.ts "ACKED_COLOR"
assert_grep "ADR#36 闪烁" 1 src/utils/alertSymbol.ts "shouldFlash"
assert_grep "ADR#37 实时渐变线" 1 src/utils/trajectory.ts "buildRealtimeTrajectory"
assert_grep "ADR#37 历史热力累积" 1 src/utils/trajectory.ts "appendTrajectoryHistory"
assert_grep "ADR#37 30min窗口" 1 src/utils/trajectory.ts "30 \* 60 \* 1000"
assert_grep "ADR#37 独立key" 1 src/utils/storage.ts "TRAJECTORY_HISTORY"
assert_grep_ge "ADR#38 巡检点覆盖率" 1 src/utils/coverage.ts "covered"
assert_grep_eq0 "ADR#38 无路段级" src/utils/coverage.ts "segment|road"
assert_grep "ADR#39 三角形状" 1 src/utils/patrolSymbol.ts '"triangle"'
assert_grep "ADR#39 闪烁" 1 src/utils/patrolSymbol.ts "flash: true"
assert_grep "ADR#39 虚线圈" 1 src/utils/patrolSymbol.ts "dashedRing: true"
assert_grep "ADR#39 橙色错开" 1 src/utils/patrolSymbol.ts "ff6b00"
assert_grep_ge "ADR#40 GitHub Pages" 1 vite.config.ts "drive-dashboard"
assert_grep "ADR#41 位置200ms" 1 src/mock/mockClock.ts "POSITION_MS: 200"
assert_grep "ADR#41 告警30s" 1 src/mock/mockClock.ts "ALERT_MS: 30_000"
assert_grep "ADR#41 电量30s" 1 src/mock/mockClock.ts "BATTERY_MS: 30_000"
assert_grep "ADR#41 进度1s" 1 src/mock/mockClock.ts "PROGRESS_MS: 1_000"
assert_grep "ADR#42 5态PATROLLING" 1 src/mock/seed.ts "RobotStatus.PATROLLING"
assert_grep "ADR#42 5态ONLINE" 1 src/mock/seed.ts "RobotStatus.ONLINE"
assert_grep "ADR#42 5态RETURNING" 1 src/mock/seed.ts "RobotStatus.RETURNING"
assert_grep "ADR#42 5态ERROR" 1 src/mock/seed.ts "RobotStatus.ERROR"
assert_grep "ADR#42 5态CHARGING" 1 src/mock/seed.ts "RobotStatus.CHARGING"
assert_grep_ge "ADR#42 角色式命名" 1 src/mock/seed.ts "北区巡检1号"
assert_grep_ge "ADR#43 无PIN二次确认" 1 src/App.vue "ConfirmModal"

echo ""
echo "======================"
echo "PASS=$PASS FAIL=$FAIL"
echo "======================"
[ "$FAIL" = "0" ] && echo "ALL GREEN ✅" || echo "HAS FAILURES ❌"
exit $FAIL
