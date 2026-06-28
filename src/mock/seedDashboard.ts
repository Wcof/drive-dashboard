// 大屏扩展 mock 数据 —— 复刻参考页面 safety-dashboard/app.js 的 DATA 块
// 含任务层级/时间轴/充电站/AP 设备/告警扩展/机器人扩展/挂件指标/里程
// 独立于 bot 契约 seed，仅供大屏可视化使用

import { makeMockImg } from "@/utils/mockImage"
import { siteCoord } from "@/utils/siteCoord"
import type {
  AlertExt,
  ApDevice,
  Dock,
  EnvSummaryCard,
  FacilityPoint,
  FacilitySummaryCard,
  InspectionExpiryItem,
  PlanSummaryCard,
  RiskBreakdownItem,
  RobotExt,
  TaskExt,
  TaskHierarchy,
} from "@/types/dashboard"

// 机器人里程（km）
export const ROBOT_MILEAGE_KM: Record<string, number> = {
  "robot-north-1": 4820,
  "robot-east-1": 3960,
  "robot-west-1": 2740,
  "robot-south-1": 3210,
  "robot-center-1": 3920,
}

// 环境指标定义
export const ENV_METRIC_DEFS: Record<string, { label: string; unit: string }> = {
  O2: { label: "氧气 O2", unit: "次" },
  CH4: { label: "可燃气体 CH4", unit: "次" },
  CO: { label: "一氧化碳 CO", unit: "次" },
  H2S: { label: "硫化氢 H2S", unit: "次" },
}

// 挂件统计
export const ATTACHMENT_SUMMARY_BASE = {
  gasSensors: { total: 24, normal: 22, offline: 2 },
  gimbals: { total: 10, normal: 9, offline: 1 },
}

// 天气
export const WEATHER_SNAPSHOT = { condition: "晴", temp: 26, wind: "东南风2级", humidity: 58 }

// 机器人业务状态标签
export const ROBOT_BIZ_STATUS_LABEL: Record<string, string> = {
  executing: "执行中",
  returning: "返航中",
  charging: "充电中",
  standby: "待机",
  warning: "异常",
}

// 巡检点状态标签
export const POINT_STATUS_LABEL: Record<string, string> = {
  running: "已巡",
  pending: "未巡",
  warn: "异常",
  danger: "异常",
  completed: "已巡",
}

// 机器人扩展（覆盖参考页面 DATA.robots）
export const seedRobotsExt: RobotExt[] = [
  { id: "robot-north-1", status: "safe", label: "执行中", task: "E区|动力站房特巡", battery: 82, coords: siteCoord(0.67, 0.58), taskId: "task-e-power", robotType: "四轮" },
  { id: "robot-east-1", status: "safe", label: "执行中", task: "B区|例行安防", battery: 65, coords: siteCoord(0.43, 0.56), taskId: "task-b-security", robotType: "履带" },
  { id: "robot-west-1", status: "warn", label: "返航中", task: "返回C区基站", battery: 15, coords: siteCoord(0.58, 0.71), taskId: null, robotType: "滑轨" },
  { id: "robot-center-1", status: "charging", label: "充电中", task: "A区充换站|待命", battery: 100, coords: siteCoord(0.16, 0.36), taskId: null, robotType: "四轮" },
  { id: "robot-south-1", status: "danger", label: "故障", task: "底盘驱动脱机", battery: 45, coords: siteCoord(0.46, 0.74), taskId: null, robotType: "履带" },
]

// 巡检点坐标表（参考页面 INSPECTION_POINT_COORDS）
export const INSPECTION_POINT_COORDS: Record<string, [number, number]> = {
  "ip-e3": siteCoord(0.72, 0.57),
  "ip-e5": siteCoord(0.84, 0.68),
  "ip-b1": siteCoord(0.21, 0.63),
  "ip-b3": siteCoord(0.57, 0.56),
}

// 任务层级（巡检点 → 监控点 → 指标）
export const seedTaskHierarchy: Record<string, TaskHierarchy> = {
  "task-e-power": {
    inspectionPoints: [
      {
        id: "ip-e3",
        name: "E区-3#高压柜",
        status: "running",
        progress: "68%",
        monitorPoints: [
          {
            id: "mp-e3-env",
            name: "环境监测",
            progress: "68%",
            metrics: {
              O2: { icon: "O₂", label: "氧气浓度", value: "20.5%", history: ["20.4%", "20.3%", "20.2%"] },
              CH4: { icon: "CH₄", label: "甲烷泄漏", value: "1%LEL", history: ["0.8%LEL", "0.5%LEL", "0.3%LEL"] },
              CO: { icon: "CO", label: "一氧化碳", value: "0ppm", history: ["0ppm", "0ppm", "0ppm"] },
              H2S: { icon: "H₂S", label: "硫化氢", value: "1ppm", history: ["1ppm", "0ppm", "0ppm"] },
              TVOC: { icon: "VOC", label: "VOC有机物", value: "0.2ppm", history: ["0.2ppm", "0.1ppm", "0.1ppm"] },
              Noise: { icon: "🔊", label: "噪声等级", value: "85dB", history: ["83dB", "82dB", "80dB"] },
            },
          },
        ],
      },
      {
        id: "ip-e5",
        name: "E区-5#冷凝塔",
        status: "pending",
        progress: "10%",
        monitorPoints: [
          {
            id: "mp-e5-env",
            name: "环境监测",
            progress: "10%",
            metrics: {
              O2: { icon: "O₂", label: "氧气浓度", value: "20.9%", history: ["20.8%", "20.8%", "20.7%"] },
              CH4: { icon: "CH₄", label: "甲烷泄漏", value: "0%LEL", history: ["0%LEL", "0%LEL", "0%LEL"] },
              CO: { icon: "CO", label: "一氧化碳", value: "0ppm", history: ["0ppm", "0ppm", "0ppm"] },
              H2S: { icon: "H₂S", label: "硫化氢", value: "0ppm", history: ["0ppm", "0ppm", "0ppm"] },
              TVOC: { icon: "VOC", label: "VOC有机物", value: "0.1ppm", history: ["0.1ppm", "0.1ppm", "0.1ppm"] },
              Noise: { icon: "🔊", label: "噪声等级", value: "79dB", history: ["78dB", "77dB", "76dB"] },
            },
          },
        ],
      },
    ],
  },
  "task-b-security": {
    inspectionPoints: [
      {
        id: "ip-b1",
        name: "B区主门入闸点",
        status: "running",
        progress: "60%",
        monitorPoints: [
          {
            id: "mp-b1-env",
            name: "环境监测",
            progress: "60%",
            metrics: {
              O2: { icon: "O₂", label: "氧气浓度", value: "20.6%", history: ["20.5%", "20.5%", "20.4%"] },
              CH4: { icon: "CH₄", label: "甲烷泄漏", value: "1%LEL", history: ["1%LEL", "1%LEL", "0.8%LEL"] },
              CO: { icon: "CO", label: "一氧化碳", value: "0ppm", history: ["0ppm", "0ppm", "0ppm"] },
              H2S: { icon: "H₂S", label: "硫化氢", value: "0ppm", history: ["0ppm", "0ppm", "0ppm"] },
              TVOC: { icon: "VOC", label: "VOC有机物", value: "0.2ppm", history: ["0.2ppm", "0.2ppm", "0.1ppm"] },
              Noise: { icon: "🔊", label: "噪声等级", value: "60dB", history: ["59dB", "58dB", "58dB"] },
            },
          },
        ],
      },
      {
        id: "ip-b3",
        name: "B区换热阀",
        status: "warn",
        progress: "55%",
        monitorPoints: [
          {
            id: "mp-b3-env",
            name: "环境监测",
            progress: "55%",
            metrics: {
              O2: { icon: "O₂", label: "氧气浓度", value: "20.4%", history: ["20.5%", "20.4%", "20.4%"] },
              CH4: { icon: "CH₄", label: "甲烷泄漏", value: "0%LEL", history: ["0%LEL", "0%LEL", "0%LEL"] },
              CO: { icon: "CO", label: "一氧化碳", value: "0ppm", history: ["0ppm", "0ppm", "0ppm"] },
              H2S: { icon: "H₂S", label: "硫化氢", value: "0ppm", history: ["0ppm", "0ppm", "0ppm"] },
              TVOC: { icon: "VOC", label: "VOC有机物", value: "0.3ppm", history: ["0.2ppm", "0.2ppm", "0.2ppm"] },
              Noise: { icon: "🔊", label: "噪声等级", value: "63dB", history: ["62dB", "60dB", "60dB"] },
            },
          },
        ],
      },
    ],
  },
}

// 任务扩展（含时间轴/路径/目标/证据影像）
export const seedTasksExt: Record<string, TaskExt> = {
  "task-e-power": {
    bot: "robot-north-1",
    bgImg: makeMockImg("Task T-01", "#16212f", "#274764"),
    taskName: "动力站房综合特巡",
    state: "running",
    type: "例行防爆",
    region: "E区",
    stage: "检测 3# 点",
    cov: "85%",
    inspected: 142,
    anomaly: 1,
    highRisk: 0,
    review: 2,
    prog: "33%",
    eta: "14m",
    bar: "33%",
    targetCoords: siteCoord(0.84, 0.63),
    robotCoords: siteCoord(0.67, 0.58),
    path: [siteCoord(0.35, 0.48), siteCoord(0.53, 0.48), siteCoord(0.67, 0.58)],
    futurePath: [siteCoord(0.67, 0.58), siteCoord(0.84, 0.63), siteCoord(0.84, 0.68)],
    targetLine: [siteCoord(0.67, 0.58), siteCoord(0.84, 0.63)],
    aimSafe: true,
    targetLabel: "2#高压机组",
    eviResult: "自动识别: 未见表面裂纹及发热",
    eviClass: "safe-txt",
    timeline: {
      title: "当前执行：动力站房全域防爆巡检 (robot-north-1)",
      nodes: [
        { time: "09:50", name: "门禁", res: "✓", status: "safe", pos: "15%", coords: siteCoord(0.35, 0.48) },
        { time: "10:15", name: "配电", res: "✓", status: "safe", pos: "35%", coords: siteCoord(0.53, 0.48) },
        { time: "10:32", name: "机组", res: "✖ 异响", status: "danger", pop: true, pos: "55%", coords: siteCoord(0.72, 0.57), alertId: "alert-003" },
        { time: "前往中(ETA 2m)", name: "变压器", res: "当前目标", status: "active", pos: "75%", coords: siteCoord(0.84, 0.63) },
        { time: "待定", name: "冷凝塔", res: "", status: "future", pos: "95%", coords: siteCoord(0.84, 0.68) },
      ],
    },
  },
  "task-b-security": {
    bot: "robot-east-1",
    bgImg: makeMockImg("Task T-02", "#17271d", "#3a5c44"),
    taskName: "主干道例行安防护卫",
    state: "running",
    type: "自主安保",
    region: "B区",
    stage: "前往入闸",
    cov: "42%",
    inspected: 64,
    anomaly: 1,
    highRisk: 1,
    review: 5,
    prog: "60%",
    eta: "7m",
    bar: "60%",
    targetCoords: siteCoord(0.57, 0.56),
    robotCoords: siteCoord(0.43, 0.56),
    path: [siteCoord(0.21, 0.63), siteCoord(0.43, 0.56)],
    futurePath: [siteCoord(0.43, 0.56), siteCoord(0.57, 0.56), siteCoord(0.33, 0.45)],
    targetLine: [siteCoord(0.43, 0.56), siteCoord(0.57, 0.56)],
    aimSafe: false,
    targetLabel: "目标丢失",
    eviResult: "自动识别: 无匹配件 (需人为修正)",
    eviClass: "dim",
    timeline: {
      title: "当前执行：主干道例行安防护卫 (robot-east-1)",
      nodes: [
        { time: "09:00", name: "入口", res: "✓", status: "safe", pos: "25%", coords: siteCoord(0.21, 0.63) },
        { time: "09:15", name: "换热阀", res: "高温警示", status: "warn", pos: "55%", coords: siteCoord(0.57, 0.56), alertId: "alert-005" },
        { time: "巡航扫描", name: "出入口", res: "前往", status: "active", pos: "85%", coords: siteCoord(0.33, 0.45) },
      ],
    },
  },
}

// 告警扩展（参考页面 DATA.alerts）
export const seedAlertsExt: AlertExt[] = [
  {
    id: "alert-003",
    bgImg: makeMockImg("Alert A-01", "#3a1212", "#5d1d1d"),
    time: "10:32",
    level: "danger",
    state: "未确认",
    device: "2#高压冷凝机组",
    loc: "E区-3#点",
    defect: "轴承频域异响(800Hz峰值)",
    taskId: "task-e-power",
    coords: siteCoord(0.72, 0.57),
    aimSafe: true,
    targetLabel: "冷凝轴承 [锁死]",
    eviResult: "分析: 剧烈共振摩擦声",
    eviClass: "danger-txt",
    lastTime: "昨日 15:00",
    lastResult: "正常",
    comp: "突发异常",
  },
  {
    id: "alert-005",
    bgImg: makeMockImg("Alert A-02", "#3a2a14", "#594321"),
    time: "09:15",
    level: "warn",
    state: "待复核",
    device: "A区换热阀",
    loc: "主管廊前端",
    defect: "热成像法兰面超限 85℃",
    taskId: "task-b-security",
    coords: siteCoord(0.57, 0.56),
    aimSafe: true,
    targetLabel: "换热阀法兰 [热成像]",
    eviResult: "分析: 温度超阈 12%",
    eviClass: "warn-txt",
    lastTime: "本周一",
    lastResult: "78℃",
    comp: "持续升温(+7℃)",
  },
  {
    id: "alert-ext-003",
    bgImg: makeMockImg("Alert A-03", "#172033", "#334f7c"),
    time: "11:45",
    level: "danger",
    state: "待复核",
    device: "B区冷媒管线",
    loc: "侧边管囊",
    defect: "气体压力突降",
    taskId: "task-e-power",
    coords: siteCoord(0.63, 0.67),
    aimSafe: false,
    targetLabel: "压力表视窗 [未对准]",
    eviResult: "分析: 镜头失焦，无法读数",
    eviClass: "danger-txt",
    lastTime: "2天前",
    lastResult: "正常",
    comp: "未见异常",
  },
  {
    id: "alert-ext-004",
    bgImg: makeMockImg("Alert A-04", "#1a2b14", "#2f4a1f"),
    time: "13:08",
    level: "warn",
    state: "未确认",
    device: "C区反应釜R-201",
    loc: "北侧平台",
    defect: "液位计读数漂移",
    taskId: "task-b-security",
    coords: siteCoord(0.45, 0.48),
    aimSafe: true,
    targetLabel: "磁翻板液位计 [标框]",
    eviResult: "分析: 读数偏差 +8%",
    eviClass: "warn-txt",
    lastTime: "昨日",
    lastResult: "正常",
    comp: "渐变漂移",
  },
  {
    id: "alert-ext-005",
    bgImg: makeMockImg("Alert A-05", "#331f1f", "#5c2d2d"),
    time: "14:22",
    level: "danger",
    state: "未确认",
    device: "储罐区T-305",
    loc: "罐顶呼吸阀",
    defect: "红外测温异常 92℃",
    taskId: "task-e-power",
    coords: siteCoord(0.68, 0.42),
    aimSafe: true,
    targetLabel: "呼吸阀法兰 [热成像]",
    eviResult: "分析: 温度超阈 22%",
    eviClass: "danger-txt",
    lastTime: "3小时前",
    lastResult: "70℃",
    comp: "急升(+22℃)",
  },
  {
    id: "alert-ext-006",
    bgImg: makeMockImg("Alert A-06", "#1f2a33", "#2d4258"),
    time: "15:05",
    level: "warn",
    state: "待复核",
    device: "D区配电柜",
    loc: "低压开关室",
    defect: "柜门未闭合",
    taskId: "task-a-morning",
    coords: siteCoord(0.38, 0.62),
    aimSafe: true,
    targetLabel: "柜门状态 [开闭识别]",
    eviResult: "分析: 门禁异常",
    eviClass: "warn-txt",
    lastTime: "今晨",
    lastResult: "已闭合",
    comp: "状态突变",
  },
  {
    id: "alert-ext-007",
    bgImg: makeMockImg("Alert A-07", "#3a2a14", "#594321"),
    time: "15:48",
    level: "safe",
    state: "已处置",
    device: "A区蒸汽阀",
    loc: "主管廊中段",
    defect: "法兰微漏(已紧固)",
    taskId: "task-b-security",
    coords: siteCoord(0.52, 0.55),
    aimSafe: true,
    targetLabel: "法兰密封 [已处理]",
    eviResult: "分析: 复测无泄漏",
    eviClass: "dim",
    lastTime: "1小时前",
    lastResult: "微量泄漏",
    comp: "已消除",
  },
  {
    id: "alert-ext-008",
    bgImg: makeMockImg("Alert A-08", "#2a1a33", "#4d2d5c"),
    time: "16:12",
    level: "warn",
    state: "未确认",
    device: "E区压缩机K-402",
    loc: "西侧平台",
    defect: "振动速度超限 4.5mm/s",
    taskId: "task-c-night",
    coords: siteCoord(0.71, 0.61),
    aimSafe: true,
    targetLabel: "振动传感器 [读数]",
    eviResult: "分析: 振速超阈 12%",
    eviClass: "warn-txt",
    lastTime: "30分钟前",
    lastResult: "正常",
    comp: "突发振动",
  },
]

// 充电站（参考页面 DATA.docks）
export const seedDocks: Dock[] = [
  { id: "dock-01", name: "A区-主干道充电站", status: "charging", bot: "robot-center-1", lastRobot: "robot-north-1", voltage: "398V", totalCharges: 18, fullNotLeave: 1, queueCount: 2, facadeImg: makeMockImg("A区主干道充电站门面", "#112437", "#294c73"), coords: siteCoord(0.16, 0.36) },
  { id: "dock-02", name: "C区-仓库备用站", status: "safe", bot: "空闲", lastRobot: "robot-west-1", voltage: "401V", totalCharges: 12, fullNotLeave: 2, queueCount: 0, facadeImg: makeMockImg("C区仓库备用站门面", "#1a2b2c", "#2f6164"), coords: siteCoord(0.89, 0.39) },
  { id: "dock-03", name: "B区-巡检入口充电站", status: "charging", bot: "robot-west-1", lastRobot: "robot-east-1", voltage: "396V", totalCharges: 16, fullNotLeave: 1, queueCount: 1, facadeImg: makeMockImg("B区入口充电站门面", "#2c1d1d", "#654037"), coords: siteCoord(0.33, 0.34) },
  { id: "dock-04", name: "E区-动力站房充电站", status: "safe", bot: "空闲", lastRobot: "robot-center-1", voltage: "400V", totalCharges: 21, fullNotLeave: 3, queueCount: 0, facadeImg: makeMockImg("E区动力站房充电站门面", "#241f33", "#4a3f71"), coords: siteCoord(0.63, 0.36) },
  { id: "dock-05", name: "北侧-临停补能站", status: "safe", bot: "空闲", lastRobot: "robot-south-1", voltage: "399V", totalCharges: 9, fullNotLeave: 1, queueCount: 1, facadeImg: makeMockImg("北侧临停补能站门面", "#233021", "#496b44"), coords: siteCoord(0.78, 0.74) },
  { id: "dock-06", name: "南侧-备用充电站", status: "charging", bot: "robot-south-1", lastRobot: "robot-east-1", voltage: "397V", totalCharges: 14, fullNotLeave: 2, queueCount: 2, facadeImg: makeMockImg("南侧备用充电站门面", "#2c2222", "#634646"), coords: siteCoord(0.46, 0.74) },
]

// AP 设备（参考页面 DATA.apDevices）
export const seedApDevices: ApDevice[] = [
  { id: "ap-a1", name: "A区-入口AP", area: "A", status: "safe", signal: "-51dBm", channel: "CH-6", band: "2.4GHz", users: 8, uptime: "17天", coords: siteCoord(0.24, 0.48) },
  { id: "ap-b2", name: "B区-廊道AP", area: "B", status: "safe", signal: "-58dBm", channel: "CH-40", band: "5GHz", users: 5, uptime: "31天", coords: siteCoord(0.52, 0.60) },
  { id: "ap-c3", name: "C区-仓储AP", area: "C", status: "danger", signal: "-87dBm", channel: "CH-149", band: "5GHz", users: 1, uptime: "离线 18m", coords: siteCoord(0.82, 0.44) },
]

// 设施点位（地图设施锚点）
export const seedFacilityPoints: FacilityPoint[] = [
  { lng: 121.4740, lat: 31.2295, name: "门禁01", type: "gate" },
  { lng: 121.4760, lat: 31.2315, name: "办公楼A", type: "office" },
  { lng: 121.4760, lat: 31.2308, name: "办公楼B", type: "office" },
  { lng: 121.4760, lat: 31.2301, name: "办公楼C", type: "office" },
  { lng: 121.4745, lat: 31.2308, name: "生产车间05", type: "plant" },
  { lng: 121.4745, lat: 31.2300, name: "生产车间06", type: "plant" },
  { lng: 121.4730, lat: 31.2301, name: "储罐区07", type: "tank" },
  { lng: 121.4768, lat: 31.2295, name: "设备区08", type: "equip" },
  { lng: 121.4768, lat: 31.2318, name: "污水处理09", type: "water" },
  { lng: 121.4755, lat: 31.2318, name: "综合厂房10", type: "plant" },
  { lng: 121.4738, lat: 31.2292, name: "消防站01", type: "fire" },
  { lng: 121.4762, lat: 31.2318, name: "充电站01", type: "charge" },
  { lng: 121.4730, lat: 31.2298, name: "充电站02", type: "charge" },
  { lng: 121.4752, lat: 31.2301, name: "配电室D", type: "equip" },
  { lng: 121.4736, lat: 31.2299, name: "中控楼E", type: "office" },
  { lng: 121.4744, lat: 31.2306, name: "管廊B", type: "plant" },
]

// 设施设备概览卡
export const seedFacilitySummary: FacilitySummaryCard[] = [
  { label: "摄像头", total: 48, online: 46, offline: 2, tone: "safe" },
  { label: "气体感应器", total: 24, online: 22, offline: 2, tone: "warn" },
  { label: "云台", total: 10, online: 9, offline: 1, tone: "info" },
  { label: "门禁", total: 8, online: 8, offline: 0, tone: "safe" },
]

// 环境检测概览卡（含采样时间与数据新鲜度）
export const seedEnvSummary: EnvSummaryCard[] = [
  { key: "O2", icon: "O₂", label: "氧气浓度", value: "20.5%", status: "safe", samplingTime: "10:32:15", freshness: "realtime" },
  { key: "CH4", icon: "CH₄", label: "甲烷泄漏", value: "1%LEL", status: "safe", samplingTime: "10:32:15", freshness: "realtime" },
  { key: "CO", icon: "CO", label: "一氧化碳", value: "0ppm", status: "safe", samplingTime: "10:30:22", freshness: "realtime" },
  { key: "H2S", icon: "H₂S", label: "硫化氢", value: "1ppm", status: "safe", samplingTime: "10:28:10", freshness: "recent" },
  { key: "TVOC", icon: "VOC", label: "VOC有机物", value: "0.2ppm", status: "safe", samplingTime: "10:28:10", freshness: "recent" },
  { key: "Noise", icon: "🔊", label: "噪声等级", value: "85dB", status: "warn", samplingTime: "10:32:15", freshness: "realtime" },
]

// 巡检总览卡
export const seedPlanSummary: PlanSummaryCard[] = [
  { label: "今日计划", value: 12, tone: "base" },
  { label: "已完成", value: 8, tone: "safe" },
  { label: "执行中", value: 3, tone: "active" },
  { label: "异常", value: 1, tone: "danger" },
]

// 安全风险细分（含监测失效类型 + 趋势）
export const seedRiskBreakdown: RiskBreakdownItem[] = [
  { category: "infrared", label: "巡检点异常", value: 1, trend: "down" },
  { category: "device", label: "设施设备异常", value: 2, trend: "up" },
  { category: "gas", label: "气体异常", value: 0, trend: "flat" },
  { category: "safeBehavior", label: "安全行为异常", value: 1, trend: "up" },
  { category: "monitorFailure", label: "监测失效", value: 1, trend: "down" },
]

// 强检设备到期（30/15/5/0 天梯度，模拟截止日期）
export const seedInspectionExpiry: InspectionExpiryItem[] = [
  {
    id: "exp-001", name: "A区-1#干粉灭火器", location: "A区主厂房", deadline: "2026-07-28",
    daysRemaining: 30, category: "灭火器", lastInspectionDate: "2025-07-28", inspectionCycle: 12,
    responsiblePerson: "王运维", riskLevel: "低", status: "临近到期",
    measures: ["工程：定期检查压力表", "培训：操作工每月目检", "管理：纳入到期台账"],
  },
  {
    id: "exp-002", name: "B区-2#可燃气体感应器", location: "B区换热站", deadline: "2026-07-13",
    daysRemaining: 15, category: "气体感应器", lastInspectionDate: "2025-07-13", inspectionCycle: 12,
    responsiblePerson: "李安全", riskLevel: "中", status: "临近到期",
    measures: ["工程：标定灵敏度", "培训：报警处置流程", "技术：接入机器人巡检"],
  },
  {
    id: "exp-003", name: "C区-1#安全阀", location: "C区储罐区", deadline: "2026-07-03",
    daysRemaining: 5, category: "安全阀", lastInspectionDate: "2025-07-03", inspectionCycle: 12,
    responsiblePerson: "张主任", riskLevel: "高", status: "紧急",
    measures: ["工程：安排紧急检验", "管理：上报公司领导", "应急：研判是否停车"],
  },
  {
    id: "exp-004", name: "E区-3#烟雾报警器", location: "E区配电室", deadline: "2026-06-28",
    daysRemaining: 0, category: "报警器", lastInspectionDate: "2025-06-28", inspectionCycle: 12,
    responsiblePerson: "刘电工", riskLevel: "高", status: "已过期",
    measures: ["应急：立即停车检查", "管理：全员告警", "工程：联系检验机构"],
  },
  {
    id: "exp-005", name: "D区-1#消防栓", location: "D区走廊", deadline: "2026-07-22",
    daysRemaining: 24, category: "消防设备", lastInspectionDate: "2025-07-22", inspectionCycle: 12,
    responsiblePerson: "王运维", riskLevel: "低", status: "正常",
    measures: ["工程：水压测试", "培训：消防演练", "管理：台账更新"],
  },
  {
    id: "exp-006", name: "A区-2#CO感应器", location: "A区地下车库", deadline: "2026-07-08",
    daysRemaining: 10, category: "气体感应器", lastInspectionDate: "2025-07-08", inspectionCycle: 12,
    responsiblePerson: "李安全", riskLevel: "中", status: "临近到期",
    measures: ["工程：标定校准", "技术：接入监控系统", "管理：安排检验计划"],
  },
]

// 任务池（含未在 seedTasksExt 中的占位任务）
export const seedTaskPool = [
  { tk: "task-e-power", name: "动力站房综合特巡", bot: "robot-north-1", state: "running" as const, prog: "33%" },
  { tk: "task-b-security", name: "主干道例行安防护卫", bot: "robot-east-1", state: "running" as const, prog: "60%" },
  { tk: "task-a-morning", name: "A区晨检", bot: "robot-center-1", state: "completed" as const, prog: "100%" },
  { tk: "task-c-night", name: "C区夜间覆盖", bot: "待调拨", state: "pending" as const, prog: "0%" },
  { tk: "task-d-tank", name: "储罐区T-305监护", bot: "robot-north-1", state: "running" as const, prog: "78%" },
  { tk: "task-e-valve", name: "E区阀门法兰复查", bot: "robot-east-1", state: "pending" as const, prog: "0%" },
  { tk: "task-a-pipe", name: "A区管廊泄漏排查", bot: "robot-center-1", state: "completed" as const, prog: "100%" },
  { tk: "task-b-power", name: "B区配电室特巡", bot: "待调拨", state: "pending" as const, prog: "0%" },
  { tk: "task-c-compressor", name: "C区压缩机振动监测", bot: "robot-north-1", state: "running" as const, prog: "45%" },
]
