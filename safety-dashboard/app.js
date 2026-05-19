const MAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const SITE_IMAGE_COORDS = [
    [121.4688, 31.2356], // top-left
    [121.4794, 31.2356], // top-right
    [121.4794, 31.2264], // bottom-right
    [121.4688, 31.2264]  // bottom-left
];
const SITE_VIEW_BOUNDS = [
    [SITE_IMAGE_COORDS[0][0], SITE_IMAGE_COORDS[2][1]], // west, south
    [SITE_IMAGE_COORDS[1][0], SITE_IMAGE_COORDS[0][1]]  // east, north
];
const siteCoord = (x, y) => {
    const left = SITE_IMAGE_COORDS[0][0];
    const right = SITE_IMAGE_COORDS[1][0];
    const top = SITE_IMAGE_COORDS[0][1];
    const bottom = SITE_IMAGE_COORDS[2][1];
    return [
        +(left + (right - left) * x).toFixed(6),
        +(top - (top - bottom) * y).toFixed(6)
    ];
};
const SITE_CENTER = siteCoord(0.5, 0.5);

const map = new maplibregl.Map({
    container: 'map',
    style: MAP_STYLE_URL,
    center: SITE_CENTER,
    zoom: 17.15,
    pitch: 0,
    bearing: 0,
    antialias: true,
    interactive: true,
    dragRotate: false,
    dragPan: true
});

const DEFAULT_VIEW = { center: SITE_CENTER, zoom: 17.15, pitch: 0, bearing: 0 };

// ==== 1. State Model ====
let robotFilter = 'all';
window.robotFilter = robotFilter;

const state = {
    currentRobotId: 'R-07',
    currentTaskId: 'T-01',
    viewMode: 'global',
    selectedRobotIds: ['R-07', 'R-12', 'R-02', 'R-11', 'R-05'],
    currentAlertId: null,
    currentDockId: null,
    currentEvidenceMode: 'normal',
    pointAlertDecision: {},
    autoplayEnabled: true,
    autoplayIndex: 0,
    lastClick: { type: null, id: null },
    taskFilter: 'all',
    currentInspectionPointId: null,
    currentMonitorPointId: null,
    currentMetricKey: null,
    lastAlertAction: null,
    alertPanelVisible: false,
    envMetricPopupKey: 'O2',
    envHistoryRange: 7,
    envFocusPointIndex: 0,
    currentControlRobotId: null,
    mapUi: {
        labels: true,
        robots: true,
        points: true,
        pointAreas: { A: true, B: true, C: true },
        docks: true,
        pointStatus: true,
        route: true
    }
};
let envRealtimeTicker = null;

const ROBOT_MILEAGE_KM = {
    'R-07': 4820,
    'R-12': 3960,
    'R-02': 2740,
    'R-11': 3210,
    'R-05': 3920
};

const ENV_METRIC_DEFS = {
    O2: { label: '氧气 O2', unit: '次' },
    CH4: { label: '可燃气体 CH4', unit: '次' },
    CO: { label: '一氧化碳 CO', unit: '次' },
    H2S: { label: '硫化氢 H2S', unit: '次' }
};
const ATTACHMENT_SUMMARY_BASE = {
    gasSensors: { total: 24, normal: 22, offline: 2 },
    gimbals: { total: 10, normal: 9, offline: 1 }
};
const WEATHER_SNAPSHOT = { condition: '晴', temp: 26, wind: '东南风2级', humidity: 58 };
const ROBOT_BIZ_STATUS_LABEL = {
    executing: '执行中',
    returning: '返航中',
    charging: '充电中',
    standby: '待机',
    warning: '异常'
};
const POINT_STATUS_LABEL = { running: '已巡', pending: '未巡', warn: '异常', danger: '异常', completed: '已巡' };
let broadcastTickerTimer = null;
let broadcastTickerIndex = 0;

let mapPopup = null;
const getRobotBizStatus = (robot) => {
    if (!robot) return 'standby';
    if (robot.status === 'charging') return 'charging';
    if ((robot.label || '').includes('返航')) return 'returning';
    if (robot.status === 'danger' || robot.status === 'warn') return 'returning';
    if (robot.taskId) return 'executing';
    return 'executing';
};
const setAlertPanelVisible = (visible) => {
    state.alertPanelVisible = visible;
    const panel = document.getElementById('alert-center');
    if (panel) panel.style.display = visible ? 'flex' : 'none';
};
const setTimelineVisible = (visible) => {
    const tl = document.getElementById('map-popup-timeline');
    if (!tl) return;
    tl.style.display = visible ? 'flex' : 'none';
};
const closeMapPopup = () => {
    const el = document.getElementById('map-popup-body');
    if (el) el.style.display = 'none';
    mapPopup = null;
};

const getRobotSpeedKmh = (robot) => {
    const biz = getRobotBizStatus(robot);
    if (biz === 'executing') return 6 + ((robot?.battery || 0) % 4);
    if (biz === 'returning') return 4 + ((robot?.battery || 0) % 3);
    return 0;
};

const toTaskShortName = (name = '') => {
    const simple = String(name).replace(/例行|巡检|任务|主干道|动力站房|安防护卫/g, '').trim();
    return (simple || name || '--').slice(0, 8);
};

const getPointVisitStats = (pointId) => {
    const point = getAllInspectionPoints().find((p) => p.id === pointId);
    const base = point?.status === 'pending' ? 0 : (point?.status === 'running' ? 2 : 3);
    const normal = 2 + base;
    const temporary = point?.status === 'warn' || point?.status === 'danger' ? 2 : 1;
    return { total: normal + temporary, normal, temporary };
};

const getDockQueueStats = (dock) => {
    const charging = dock.status === 'charging' ? 1 : 0;
    const parked = dock.status === 'safe' ? 1 : 0;
    const fullNotLeave = dock.fullNotLeave ?? (dock.status === 'safe' ? 1 : 0);
    const queue = dock.queueCount ?? (dock.status === 'charging' ? 1 : 0);
    return { charging, parked, fullNotLeave, queue };
};

const openEvidenceModal = ({
    image,
    device = '巡检影像',
    meta = '',
    title = '',
    thumbs = []
} = {}) => {
    const modal = document.getElementById('evi-modal');
    const content = document.getElementById('evi-modal-content');
    if (!modal || !content) return;
    modal.style.display = 'flex';
    content.style.backgroundImage = `url('${image || ''}')`;
    document.getElementById('modal-device').innerText = device;
    document.getElementById('modal-meta').innerText = meta;
    const titleEl = document.getElementById('evi-modal-title');
    if (titleEl) titleEl.innerText = title || `${device}${meta ? ` | ${meta}` : ''}`;
    const thumbsEl = document.getElementById('evi-modal-thumbs');
    if (thumbsEl) {
        thumbsEl.innerHTML = (thumbs || []).map((t, idx) => `
          <button class="evi-thumb ${idx === 0 ? 'active' : ''}" data-img="${t.img}" data-label="${t.label || ''}">
            <span class="evi-thumb-img" style="background-image:url('${t.img}')"></span>
            <span class="evi-thumb-label">${t.label || '检测项'}</span>
          </button>
        `).join('');
        thumbsEl.querySelectorAll('.evi-thumb').forEach((btn) => {
            btn.onclick = (e) => {
                e.stopPropagation();
                thumbsEl.querySelectorAll('.evi-thumb').forEach((x) => x.classList.remove('active'));
                btn.classList.add('active');
                content.style.backgroundImage = `url('${btn.dataset.img}')`;
            };
        });
    }
};

const positionPopupAtFeature = (coords) => {
    const el = document.getElementById('map-popup-body');
    if (!el) return;
    try {
        const point = map.project(coords);
        const mapRect = map.getContainer().getBoundingClientRect();
        let left = mapRect.left + point.x + 20;
        let top = mapRect.top + point.y - 170;
        // Keep popup on screen
        const popW = Math.max(340, el.offsetWidth || 340);
        const popH = Math.max(420, el.offsetHeight || 560);
        const margin = 12;
        if (left + popW > window.innerWidth) left = mapRect.left + point.x - popW - 20;
        if (top < margin) top = margin;
        if (top + popH > window.innerHeight - margin) {
            top = Math.max(margin, window.innerHeight - popH - margin - 20);
        }
        el.style.left = left + 'px';
        el.style.top = top + 'px';
    } catch (e) {
        // Fallback: center of screen
        el.style.left = '50%';
        el.style.top = '50%';
        el.style.transform = 'translate(-50%, -50%)';
    }
};

const showRobotPopup = (robotId) => {
    try {
        closeMapPopup();
        const r = DATA.robots.find(x => x.id === robotId);
        if (!r) { console.warn('[Popup] Robot not found:', robotId); return; }
        const t = DATA.tasks[r.taskId] || {};
        const activeNode = t.timeline?.nodes?.find((n) => n.status === 'active') || t.timeline?.nodes?.[0];
        const totalMileage = ROBOT_MILEAGE_KM[r.id] || 0;
        const todayMileage = Math.max(18, Math.round((r.battery / 100) * 42));
        const remainMileage = Math.round((r.battery / 100) * 120);
        const bc = r.battery > 50 ? 'high' : r.battery > 20 ? 'mid' : 'low';
        const sm = { safe: '执行中', warn: '注意', danger: '异常', charging: '充电中' };
        const sc = { safe: '#22C55E', warn: '#F59E0B', danger: '#EF4444', charging: '#3B82F6' };
        const bgImg = t.bgImg || makeMockImg('Live', '#152338', '#2f4866');
        const now = new Date();
        const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const taskPoints = DATA.taskHierarchy[r.taskId]?.inspectionPoints || [];
        const selectedPoint = taskPoints.find((p) => p.id === state.currentInspectionPointId) || taskPoints[0];
        const attachmentMetrics = selectedPoint?.monitorPoints?.[0]?.metrics || {};
        const attachmentCardsHtml = buildAttachmentRealtimeCardsHtml(attachmentMetrics);

        const html = `
        <div class="map-popup">
            <div class="popup-header">
                <span class="popup-title">${r.id} 实时状态</span>
                <span class="tag gold">${r.label}</span>
                <span class="popup-close-btn" onclick="closeMapPopup()">✕</span>
            </div>
            <div class="popup-body">
                <div class="popup-stats">
                    <div class="popup-stat">
                        <span class="popup-stat-label">运行状态</span>
                        <span class="popup-stat-value" style="color:${sc[r.status] || '#94A3B8'}">${sm[r.status] || r.label}</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">当前任务</span>
                        <span class="popup-stat-value">${t.taskName || r.task || '无任务'}</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">机器人类型</span>
                        <span class="popup-stat-value">${r.robotType || '四轮'}</span>
                    </div>
                    <div class="popup-stat" style="grid-column:span 2">
                        <span class="popup-stat-label">剩余电量 / 剩余里程</span>
                        <div class="popup-battery">
                            <span class="popup-stat-value" style="min-width:86px">${r.battery}% / ${remainMileage}km</span>
                            <div class="battery-bar"><div class="battery-fill ${bc}" style="width:${r.battery}%"></div></div>
                        </div>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">当前巡检点</span>
                        <span class="popup-stat-value highlight">${activeNode?.name || '待命'}</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">剩余里程</span>
                        <span class="popup-stat-value">${remainMileage}km</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">今日里程</span>
                        <span class="popup-stat-value">${todayMileage}km</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">总里程</span>
                        <span class="popup-stat-value">${totalMileage}km</span>
                    </div>
                </div>
                <div class="popup-ptz">
                    <div class="ptz-header">
                        <span>☰ 云台实时视角</span>
                        <span class="ptz-live">● LIVE</span>
                    </div>
                    <div class="ptz-view" style="background-image:url('${bgImg}')">
                        <div class="ptz-crosshair"></div>
                        <div class="ptz-overlay-text">${r.id} | CAM-01 | ${ts}</div>
                    </div>
                    <div class="ptz-action">
                        <button class="ptz-control-entry" onclick="goDispatchCenter('${r.id}')">前往调度台</button>
                    </div>
                </div>
                <div class="popup-metrics-section">
                    <div class="popup-metrics-title">挂件检测</div>
                    <div class="summary-grid two-columns env-realtime-grid slide-in">${attachmentCardsHtml}</div>
                </div>
            </div>
        </div>`;

        const el = document.getElementById('map-popup-body');
        if (el) {
            el.innerHTML = html;
            el.style.display = 'block';
            el.style.transform = '';
        }
        positionPopupAtFeature(r.coords);
        mapPopup = robotId;
        setTimelineVisible(true);
        renderTimeline();
        console.log('[Popup] Robot popup shown for:', robotId);
    } catch (err) {
        console.error('[Popup] Error showing robot popup:', err);
    }
};
window.showRobotPopup = showRobotPopup;

const openControlModal = (robotId) => {
    state.currentControlRobotId = robotId || state.currentRobotId || '--';
    const idEl = document.getElementById('control-robot-id');
    if (idEl) idEl.innerText = state.currentControlRobotId;
    const feedback = document.getElementById('control-feedback');
    if (feedback) feedback.innerText = '就绪，等待控制指令。';
    const selectedRobot = DATA.robots.find(r => r.id === state.currentControlRobotId);
    const taskData = selectedRobot?.taskId ? DATA.tasks[selectedRobot.taskId] : null;
    const viewScreen = document.getElementById('control-view-screen');
    if (viewScreen) {
        viewScreen.style.backgroundImage = `url('${taskData?.bgImg || makeMockImg('Control', '#152338', '#2f4866')}')`;
        viewScreen.style.filter = 'grayscale(10%)';
    }
    state.currentEvidenceMode = 'normal';
    document.querySelectorAll('.control-view-tab').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.view === 'optical');
    });
    const meta = document.getElementById('control-view-meta');
    if (meta) meta.innerText = `${state.currentControlRobotId} | CAM-01 | OPTICAL`;
    const modal = document.getElementById('control-modal');
    if (modal) modal.style.display = 'flex';
};
window.openControlModal = openControlModal;
const goDispatchCenter = (robotId = '') => {
    const ctx = robotId ? `调度入口: ${robotId}` : '调度入口';
    document.getElementById('top-context').innerText = `${ctx}（首页仅跳转，不执行）`;
};
const goCockpit = () => {
    document.getElementById('top-context').innerText = '驾驶舱入口（首页仅跳转）';
};
window.goDispatchCenter = goDispatchCenter;
window.goCockpit = goCockpit;

const showInspectionPointPopup = (pointId) => {
    try {
        closeMapPopup();
        let point = null, taskId = null, taskData = null;
        for (const tk of Object.keys(DATA.taskHierarchy)) {
            const found = DATA.taskHierarchy[tk].inspectionPoints?.find(p => p.id === pointId);
            if (found) { point = found; taskId = tk; taskData = DATA.tasks[tk]; break; }
        }
        if (!point) { console.warn('[Popup] Inspection point not found:', pointId); return; }
        const coords = INSPECTION_POINT_COORDS[pointId];
        if (!coords) { console.warn('[Popup] No coords for:', pointId); return; }
        const stMap = { running: '巡检中', pending: '待巡检', completed: '已完成', warn: '有告警', danger: '严重告警' };
        const stTag = { running: 'gold', pending: 'smog', completed: 'safe', warn: 'warn' };
        const monitor = point.monitorPoints?.[0];
        const metrics = monitor?.metrics || {};
        const timelineNodes = taskData?.timeline?.nodes || [];
        const matchIdx = timelineNodes.findIndex((n) => {
            if (!Array.isArray(n.coords)) return false;
            return Math.abs(n.coords[0] - coords[0]) < 0.0002 && Math.abs(n.coords[1] - coords[1]) < 0.0002;
        });
        let inspectTimeText = '待巡检';
        if (point.status !== 'pending' && matchIdx >= 0) {
            const endTime = timelineNodes[matchIdx]?.time || '--';
            const startTime = timelineNodes[Math.max(0, matchIdx - 1)]?.time || endTime;
            inspectTimeText = `${startTime} - ${endTime}`;
        } else if (point.status !== 'pending' && point.progress) {
            inspectTimeText = `最近一次巡检（进度 ${point.progress}）`;
        }
        const visitStats = getPointVisitStats(pointId);
        const pointImgs = {
            optical: [
                taskData?.bgImg || makeMockImg(`${point.name} 光学总览`, '#1f3047', '#3d5e7f'),
                makeMockImg(`${point.name} 阀体`, '#1e2f42', '#44638b'),
                makeMockImg(`${point.name} 接线端子`, '#20344f', '#3f5c7f'),
                makeMockImg(`${point.name} 外观面板`, '#273e55', '#476784')
            ],
            thermal: [
                makeMockImg(`${point.name} 热成像总览`, '#3a1f1f', '#5f382a'),
                makeMockImg(`${point.name} 法兰热斑`, '#4b241f', '#743b2a'),
                makeMockImg(`${point.name} 轴承温升`, '#442121', '#63392d'),
                makeMockImg(`${point.name} 电缆温差`, '#3a1c23', '#5f2d36')
            ]
        };
        const pointAlert = DATA.alerts.find((a) => {
            if (!Array.isArray(a.coords)) return false;
            return Math.abs(a.coords[0] - coords[0]) < 0.0002 && Math.abs(a.coords[1] - coords[1]) < 0.0002;
        });

        const envOverviewHtml = Object.keys(metrics).slice(0, 6).map((k) => {
            const m = metrics[k];
            return `<div class="point-env-card">
                <span class="pev-name">${m.icon} ${m.label}</span>
                <span class="pev-val">${m.value}</span>
            </div>`;
        }).join('');
        const alertTab = pointAlert
            ? `<button class="point-photo-tab active" data-view="alert">巡检告警</button>`
            : `<button class="point-photo-tab disabled" data-view="alert" disabled>巡检告警</button>`;
        const alertImgs = {
            optical: [
                pointAlert?.bgImg || pointImgs.optical[0],
                makeMockImg(`${point.name} 告警-阀体`, '#4e1d1d', '#6d3434'),
                makeMockImg(`${point.name} 告警-接线`, '#491f2a', '#6c2f41'),
                makeMockImg(`${point.name} 告警-机壳`, '#50282a', '#723f36')
            ],
            thermal: [
                makeMockImg(`${point.name} 告警热成像1`, '#431c1c', '#6e3b2b'),
                makeMockImg(`${point.name} 告警热成像2`, '#4e2017', '#7a4329'),
                makeMockImg(`${point.name} 告警热成像3`, '#55241a', '#7b472d'),
                makeMockImg(`${point.name} 告警热成像4`, '#44211f', '#6b3e33')
            ]
        };
        const alertPanelHtml = pointAlert
            ? `<div class="point-alert-card">
                <div class="point-photo-tabs" style="margin-bottom:8px;">
                    <button class="point-photo-tab active" data-alert-mode="optical">光学视角</button>
                    <button class="point-photo-tab" data-alert-mode="thermal">热成像视角</button>
                </div>
                <div class="point-photo-frame" id="point-alert-frame">
                    <div class="point-photo-grid" id="point-alert-grid"></div>
                </div>
                <div style="margin-top:8px; color:var(--text-main);">${pointAlert.time} ${pointAlert.state}</div>
                <div style="margin-top:4px">${pointAlert.defect}</div>
                <div style="margin-top:6px;color:var(--text-sub)">设备：${pointAlert.device}</div>
                <div class="point-alert-actions">
                    <button class="point-alert-btn active" data-alert-action="dispose">处置</button>
                </div>
                <div class="point-alert-decision" id="point-alert-decision">首页仅做提醒，请前往风险详情</div>
            </div>`
            : `<div class="point-alert-card dim">当前点位暂无告警</div>`;
        const defaultMediaActive = pointAlert ? '' : ' active';
        const defaultMediaDisplay = pointAlert ? 'none' : 'block';
        const defaultAlertDisplay = pointAlert ? 'block' : 'none';

        const html = `
        <div class="map-popup">
            <div class="popup-header">
                <span class="popup-title">${point.name}</span>
                <span class="tag ${stTag[point.status] || 'smog'}">${stMap[point.status] || point.status}</span>
                <span class="popup-close-btn" onclick="closeMapPopup()">✕</span>
            </div>
            <div class="popup-body">
                <div class="popup-stats">
                    <div class="popup-stat">
                        <span class="popup-stat-label">巡检点名称</span>
                        <span class="popup-stat-value">${point.name}</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">今日巡检次数</span>
                        <span class="popup-stat-value">${visitStats.total}次</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">时间间隔</span>
                        <span class="popup-stat-value">每2小时/次</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">时间范围</span>
                        <span class="popup-stat-value">${inspectTimeText}</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">最近采集时间</span>
                        <span class="popup-stat-value">${point.status === 'pending' ? '待采集' : (timelineNodes[matchIdx]?.time || '--')}</span>
                    </div>
                </div>
                <div class="point-photo-section">
                    <div class="popup-metrics-title">巡检信息</div>
                    <div class="point-photo-tabs">
                        <button class="point-photo-tab${defaultMediaActive}" data-view="media">最新影像</button>
                        ${alertTab}
                    </div>
                    <div id="point-media-panel" style="display:${defaultMediaDisplay};">
                        <div class="point-photo-tabs" style="margin-top:8px">
                            <button class="point-photo-tab active" data-mode="optical">光学视角</button>
                            <button class="point-photo-tab" data-mode="thermal">热成像视角</button>
                        </div>
                        <div class="point-photo-frame" id="point-media-frame">
                            <div class="point-photo-grid" id="point-media-grid"></div>
                        </div>
                    </div>
                    <div id="point-alert-panel" style="display:${defaultAlertDisplay}; margin-top:8px;">
                        ${alertPanelHtml}
                    </div>
                </div>
                <div class="popup-metrics-section">
                    <div class="popup-metrics-title">当前节点环境指标概览</div>
                    <div class="point-env-grid">${envOverviewHtml}</div>
                </div>
            </div>
        </div>`;

        const el = document.getElementById('map-popup-body');
        if (el) {
            el.innerHTML = html;
            el.style.display = 'block';
            el.style.transform = '';
            const modeTabs = el.querySelectorAll('.point-photo-tab[data-mode]');
            const alertModeTabs = el.querySelectorAll('.point-photo-tab[data-alert-mode]');
            const viewTabs = el.querySelectorAll('.point-photo-tab[data-view]');
            const mediaPanel = el.querySelector('#point-media-panel');
            const alertPanel = el.querySelector('#point-alert-panel');
            const mediaFrame = el.querySelector('#point-media-frame');
            const alertFrame = el.querySelector('#point-alert-frame');
            const mediaGrid = el.querySelector('#point-media-grid');
            const alertGrid = el.querySelector('#point-alert-grid');
            const modeFilter = {
                optical: 'grayscale(10%) contrast(1.05)',
                thermal: 'saturate(4) hue-rotate(120deg) contrast(1.7)'
            };
            let currentMediaMode = 'optical';
            let currentAlertMode = 'optical';
            const paintGrid = (targetEl, images, mode, labelsPrefix) => {
                if (!targetEl) return;
                targetEl.innerHTML = images.map((img, idx) => `
                  <button class="point-photo-cell" data-img="${img}" data-label="${labelsPrefix}${idx + 1}">
                    <span class="point-photo-cell-img" style="background-image:url('${img}'); filter:${modeFilter[mode] || 'none'}"></span>
                    <span class="point-photo-cell-label">${labelsPrefix}${idx + 1}</span>
                  </button>
                `).join('');
                targetEl.querySelectorAll('.point-photo-cell').forEach((cell) => {
                    cell.onclick = (ev) => {
                        ev.stopPropagation();
                        const img = cell.dataset.img;
                        openEvidenceModal({
                            image: img,
                            title: `${point.name} | ${taskData?.bot || '--'} | ${inspectTimeText}`,
                            device: point.name,
                            meta: `${cell.dataset.label} | ${point.status === 'pending' ? '待巡检' : '已采集'}`,
                            thumbs: images.map((t, tIdx) => ({ img: t, label: `${labelsPrefix}${tIdx + 1}` }))
                        });
                    };
                });
            };
            paintGrid(mediaGrid, pointImgs.optical, 'optical', '光学项');
            if (pointAlert) paintGrid(alertGrid, alertImgs.optical, 'optical', '告警项');
            viewTabs.forEach((tab) => {
                tab.onclick = (e) => {
                    e.stopPropagation();
                    if (tab.disabled) return;
                    viewTabs.forEach((t) => t.classList.remove('active'));
                    tab.classList.add('active');
                    const isMedia = tab.dataset.view === 'media';
                    if (mediaPanel) mediaPanel.style.display = isMedia ? 'block' : 'none';
                    if (alertPanel) alertPanel.style.display = isMedia ? 'none' : 'block';
                };
            });
            modeTabs.forEach((tab) => {
                tab.onclick = (e) => {
                    e.stopPropagation();
                    modeTabs.forEach((t) => t.classList.remove('active'));
                    tab.classList.add('active');
                    const mode = tab.dataset.mode;
                    currentMediaMode = mode;
                    paintGrid(mediaGrid, pointImgs[mode] || pointImgs.optical, mode, mode === 'optical' ? '光学项' : '热成像项');
                };
            });
            alertModeTabs.forEach((tab) => {
                tab.onclick = (e) => {
                    e.stopPropagation();
                    alertModeTabs.forEach((t) => t.classList.remove('active'));
                    tab.classList.add('active');
                    const mode = tab.dataset.alertMode;
                    currentAlertMode = mode;
                    paintGrid(alertGrid, alertImgs[mode] || alertImgs.optical, mode, mode === 'optical' ? '告警项' : '热成像项');
                };
            });
            if (mediaFrame) {
                mediaFrame.onclick = (e) => {
                    e.stopPropagation();
                    openEvidenceModal({
                        image: (pointImgs[currentMediaMode] || pointImgs.optical)[0],
                        title: `${point.name} | ${taskData?.bot || '--'} | ${inspectTimeText}`,
                        device: point.name,
                        meta: `${taskData?.bot || '--'} | ${inspectTimeText}`,
                        thumbs: (pointImgs[currentMediaMode] || pointImgs.optical).map((img, idx) => ({ img, label: `${currentMediaMode === 'optical' ? '光学项' : '热成像项'}${idx + 1}` }))
                    });
                };
            }
            if (alertFrame && pointAlert) {
                alertFrame.onclick = (e) => {
                    e.stopPropagation();
                    openEvidenceModal({
                        image: (alertImgs[currentAlertMode] || alertImgs.optical)[0],
                        title: `${pointAlert.device} ${taskData?.bot || ''} | ${pointAlert.time}`,
                        device: pointAlert.device,
                        meta: `${pointAlert.time} | ${pointAlert.state}`,
                        thumbs: (alertImgs[currentAlertMode] || alertImgs.optical).map((img, idx) => ({ img, label: `告警项${idx + 1}` }))
                    });
                };
            }
            const actionBtns = el.querySelectorAll('[data-alert-action]');
            actionBtns.forEach((btn) => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    if (!pointAlert) return;
                    if (btn.dataset.alertAction === 'dispose') {
                        document.getElementById('top-context').innerText = `风险详情入口: ${pointAlert.device}`;
                    }
                };
            });
        }
        positionPopupAtFeature(coords);
        mapPopup = pointId;
        console.log('[Popup] Inspection point popup shown for:', pointId);
    } catch (err) {
        console.error('[Popup] Error showing inspection point popup:', err);
    }
};
window.showInspectionPointPopup = showInspectionPointPopup;
window.closeMapPopup = closeMapPopup;

const showDockPopup = (dockId) => {
    try {
        closeMapPopup();
        const dock = DATA.docks.find(d => d.id === dockId);
        if (!dock) return;
        const dockStats = getDockQueueStats(dock);
        const statusText = dock.status === 'charging' ? '服务中' : '待命';
        const statusClass = dock.status === 'charging' ? 'highlight' : 'safe-txt';
        const currentRobot = dock.status === 'charging' ? dock.bot : '暂无';
        const html = `
        <div class="map-popup">
            <div class="popup-header">
                <span class="popup-title">${dock.name}</span>
                <span class="tag ${dock.status === 'charging' ? 'gold' : 'smog'}">${statusText}</span>
                <span class="popup-close-btn" onclick="closeMapPopup()">✕</span>
            </div>
            <div class="popup-body">
                <div class="popup-stats">
                    <div class="popup-stat">
                        <span class="popup-stat-label">当前状态</span>
                        <span class="popup-stat-value ${statusClass}">${statusText}</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">当前充电台数</span>
                        <span class="popup-stat-value">${dockStats.charging}</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">当前停放台数</span>
                        <span class="popup-stat-value">${dockStats.parked}</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">当前服务机器人</span>
                        <span class="popup-stat-value">${currentRobot}</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">上一次充电机器人</span>
                        <span class="popup-stat-value">${dock.lastRobot || '--'}</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">当前节点电压</span>
                        <span class="popup-stat-value">${dock.voltage || '--'}</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">累计充电次数</span>
                        <span class="popup-stat-value">${dock.totalCharges || 0}次</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">站点编号</span>
                        <span class="popup-stat-value">${dock.id}</span>
                    </div>
                </div>
                <div class="popup-metrics-section">
                    <div class="popup-metrics-title">站点门面</div>
                    <div class="point-photo-frame">
                        <div class="point-photo-image" style="background-image:url('${dock.facadeImg || makeMockImg(`${dock.name}门面`, '#233043', '#4b6a8f')}')"></div>
                    </div>
                </div>
            </div>
        </div>`;

        const el = document.getElementById('map-popup-body');
        if (el) {
            el.innerHTML = html;
            el.style.display = 'block';
            el.style.transform = '';
        }
        positionPopupAtFeature(dock.coords);
        mapPopup = dockId;
    } catch (err) {
        console.error('[Popup] Error showing dock popup:', err);
    }
};
window.showDockPopup = showDockPopup;

const showApPopup = (apId) => {
    try {
        closeMapPopup();
        const ap = DATA.apDevices.find((x) => x.id === apId);
        if (!ap) return;
        const statusText = ap.status === 'safe' ? '正常' : '异常';
        const statusClass = ap.status === 'safe' ? 'safe-txt' : 'danger-txt';
        const html = `
        <div class="map-popup">
            <div class="popup-header">
                <span class="popup-title">${ap.name}</span>
                <span class="tag ${ap.status === 'safe' ? 'gold' : 'warn'}">${statusText}</span>
                <span class="popup-close-btn" onclick="closeMapPopup()">✕</span>
            </div>
            <div class="popup-body">
                <div class="popup-stats">
                    <div class="popup-stat"><span class="popup-stat-label">AP 编号</span><span class="popup-stat-value">${ap.id}</span></div>
                    <div class="popup-stat"><span class="popup-stat-label">区域</span><span class="popup-stat-value">${ap.area} 区域</span></div>
                    <div class="popup-stat"><span class="popup-stat-label">运行状态</span><span class="popup-stat-value ${statusClass}">${statusText}</span></div>
                    <div class="popup-stat"><span class="popup-stat-label">信号强度</span><span class="popup-stat-value">${ap.signal}</span></div>
                    <div class="popup-stat"><span class="popup-stat-label">频段/信道</span><span class="popup-stat-value">${ap.band} / ${ap.channel}</span></div>
                    <div class="popup-stat"><span class="popup-stat-label">当前接入终端</span><span class="popup-stat-value">${ap.users}</span></div>
                    <div class="popup-stat" style="grid-column:span 2"><span class="popup-stat-label">最近状态</span><span class="popup-stat-value">${ap.uptime}</span></div>
                </div>
            </div>
        </div>`;
        const el = document.getElementById('map-popup-body');
        if (el) {
            el.innerHTML = html;
            el.style.display = 'block';
            el.style.transform = '';
        }
        setTimelineVisible(false);
        positionPopupAtFeature(ap.coords);
        mapPopup = ap.id;
    } catch (err) {
        console.error('[Popup] Error showing AP popup:', err);
    }
};
window.showApPopup = showApPopup;

// ==== 2. Mock Data ====
const makeMockImg = (title, c1, c2) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 360'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='${c1}'/><stop offset='100%' stop-color='${c2}'/>
        </linearGradient>
      </defs>
      <rect width='600' height='360' fill='url(#g)'/>
      <g opacity='0.25' fill='#fff'>
        <circle cx='90' cy='70' r='50'/><circle cx='510' cy='290' r='70'/><rect x='170' y='80' width='260' height='190' rx='14'/>
      </g>
      <text x='50%' y='52%' font-size='32' text-anchor='middle' fill='#d9e3f0' font-family='Arial, sans-serif'>${title}</text>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const DATA = {
    taskHierarchy: {
        'T-01': {
            inspectionPoints: [
                {
                    id: 'IP-E3',
                    name: 'E区-3#高压柜',
                    status: 'running',
                    progress: '68%',
                    monitorPoints: [
                        {
                            id: 'MP-E3-ENV',
                            name: '环境监测',
                            progress: '68%',
                            metrics: {
                                O2: { icon: 'O₂', label: '氧气浓度', value: '20.5%', history: ['20.4%', '20.3%', '20.2%'] },
                                CH4: { icon: 'CH₄', label: '甲烷泄漏', value: '1%LEL', history: ['0.8%LEL', '0.5%LEL', '0.3%LEL'] },
                                CO: { icon: 'CO', label: '一氧化碳', value: '0ppm', history: ['0ppm', '0ppm', '0ppm'] },
                                H2S: { icon: 'H₂S', label: '硫化氢', value: '1ppm', history: ['1ppm', '0ppm', '0ppm'] },
                                TVOC: { icon: 'VOC', label: 'VOC有机物', value: '0.2ppm', history: ['0.2ppm', '0.1ppm', '0.1ppm'] },
                                Noise: { icon: '🔊', label: '噪声等级', value: '85dB', history: ['83dB', '82dB', '80dB'] }
                            }
                        }
                    ]
                },
                {
                    id: 'IP-E5',
                    name: 'E区-5#冷凝塔',
                    status: 'pending',
                    progress: '10%',
                    monitorPoints: [
                        {
                            id: 'MP-E5-ENV',
                            name: '环境监测',
                            progress: '10%',
                            metrics: {
                                O2: { icon: 'O₂', label: '氧气浓度', value: '20.9%', history: ['20.8%', '20.8%', '20.7%'] },
                                CH4: { icon: 'CH₄', label: '甲烷泄漏', value: '0%LEL', history: ['0%LEL', '0%LEL', '0%LEL'] },
                                CO: { icon: 'CO', label: '一氧化碳', value: '0ppm', history: ['0ppm', '0ppm', '0ppm'] },
                                H2S: { icon: 'H₂S', label: '硫化氢', value: '0ppm', history: ['0ppm', '0ppm', '0ppm'] },
                                TVOC: { icon: 'VOC', label: 'VOC有机物', value: '0.1ppm', history: ['0.1ppm', '0.1ppm', '0.1ppm'] },
                                Noise: { icon: '🔊', label: '噪声等级', value: '79dB', history: ['78dB', '77dB', '76dB'] }
                            }
                        }
                    ]
                }
            ]
        },
        'T-02': {
            inspectionPoints: [
                {
                    id: 'IP-B1',
                    name: 'B区主门入闸点',
                    status: 'running',
                    progress: '60%',
                    monitorPoints: [
                        {
                            id: 'MP-B1-ENV',
                            name: '环境监测',
                            progress: '60%',
                            metrics: {
                                O2: { icon: 'O₂', label: '氧气浓度', value: '20.6%', history: ['20.5%', '20.5%', '20.4%'] },
                                CH4: { icon: 'CH₄', label: '甲烷泄漏', value: '1%LEL', history: ['1%LEL', '1%LEL', '0.8%LEL'] },
                                CO: { icon: 'CO', label: '一氧化碳', value: '0ppm', history: ['0ppm', '0ppm', '0ppm'] },
                                H2S: { icon: 'H₂S', label: '硫化氢', value: '0ppm', history: ['0ppm', '0ppm', '0ppm'] },
                                TVOC: { icon: 'VOC', label: 'VOC有机物', value: '0.2ppm', history: ['0.2ppm', '0.2ppm', '0.1ppm'] },
                                Noise: { icon: '🔊', label: '噪声等级', value: '60dB', history: ['59dB', '58dB', '58dB'] }
                            }
                        }
                    ]
                },
                {
                    id: 'IP-B3',
                    name: 'B区换热阀',
                    status: 'warn',
                    progress: '55%',
                    monitorPoints: [
                        {
                            id: 'MP-B3-ENV',
                            name: '环境监测',
                            progress: '55%',
                            metrics: {
                                O2: { icon: 'O₂', label: '氧气浓度', value: '20.4%', history: ['20.5%', '20.4%', '20.4%'] },
                                CH4: { icon: 'CH₄', label: '甲烷泄漏', value: '0%LEL', history: ['0%LEL', '0%LEL', '0%LEL'] },
                                CO: { icon: 'CO', label: '一氧化碳', value: '0ppm', history: ['0ppm', '0ppm', '0ppm'] },
                                H2S: { icon: 'H₂S', label: '硫化氢', value: '0ppm', history: ['0ppm', '0ppm', '0ppm'] },
                                TVOC: { icon: 'VOC', label: 'VOC有机物', value: '0.3ppm', history: ['0.2ppm', '0.2ppm', '0.2ppm'] },
                                Noise: { icon: '🔊', label: '噪声等级', value: '63dB', history: ['62dB', '60dB', '60dB'] }
                            }
                        }
                    ]
                }
            ]
        }
    },
    robots: [
        { id: 'R-07', status: 'safe', label: '执行中', task: 'E区|动力站房特巡', battery: 82, coords: [121.4755, 31.2315], taskId: 'T-01', robotType: '四轮' },
        { id: 'R-12', status: 'safe', label: '执行中', task: 'B区|例行安防', battery: 65, coords: [121.4710, 31.2290], taskId: 'T-02', robotType: '履带' },
        { id: 'R-02', status: 'warn', label: '返航中', task: '返回C区基站', battery: 15, coords: [121.4770, 31.2295], taskId: null, robotType: '滑轨' },
        { id: 'R-11', status: 'charging', label: '充电中', task: 'A区充换站|待命', battery: 100, coords: [121.4725, 31.2280], taskId: null, robotType: '四轮' },
        { id: 'R-05', status: 'danger', label: '故障', task: '底盘驱动脱机', battery: 45, coords: [121.4765, 31.2320], taskId: null, robotType: '履带' }
    ],
    tasks: {
        'T-01': {
            bot: 'R-07',
            bgImg: makeMockImg('Task T-01', '#16212f', '#274764'),
            taskName: '动力站房综合特巡',
            state: 'running',
            type: "例行防爆", region: "E区", stage: "检测 3# 点",
            cov: "85%", inspected: 142, anomaly: 1, highRisk: 0, review: 2, prog: "33%", eta: "14m", bar: "33%",
            targetCoords: [121.4740, 31.2270], robotCoords: [121.4755, 31.2315],
            path: [[121.4725, 31.2315], [121.4755, 31.2315]],
            futurePath: [[121.4755, 31.2315], [121.4785, 31.2315], [121.4785, 31.2285], [121.4760, 31.2285]],
            targetLine: [[121.4755, 31.2315], [121.4740, 31.2270]],
            aimSafe: true, targetLabel: "2#高压机组", eviResult: "自动识别: 未见表面裂纹及发热", eviClass: "safe-txt",
            timeline: {
                title: "当前执行：动力站房全域防爆巡检 (R-07)",
                nodes: [
                    { time: '09:50', name: '门禁', res: '✓', status: 'safe', pos: '15%', coords: [121.4745, 31.2300] },
                    { time: '10:15', name: '配电', res: '✓', status: 'safe', pos: '35%', coords: [121.4750, 31.2285] },
                    { time: '10:32', name: '机组', res: '✖ 异响', status: 'danger', pop: true, pos: '55%', coords: [121.4725, 31.2325], alertId: 'A-01' },
                    { time: '前往中(ETA 2m)', name: '变压器', res: '当前目标', status: 'active', pos: '75%', coords: [121.4740, 31.2270] },
                    { time: '待定', name: '冷凝塔', res: '', status: 'future', pos: '95%', coords: [121.4760, 31.2260] }
                ]
            }
        },
        'T-02': {
            bot: 'R-12',
            bgImg: makeMockImg('Task T-02', '#17271d', '#3a5c44'),
            taskName: '主干道例行安防护卫',
            state: 'running',
            type: "自主安保", region: "B区", stage: "前往入闸",
            cov: "42%", inspected: 64, anomaly: 1, highRisk: 1, review: 5, prog: "60%", eta: "7m", bar: "60%",
            targetCoords: [121.4715, 31.2335], robotCoords: [121.4710, 31.2290],
            path: [[121.4700, 31.2290], [121.4710, 31.2290]],
            futurePath: [[121.4710, 31.2290], [121.4750, 31.2290], [121.4750, 31.2330], [121.4735, 31.2345]],
            targetLine: [[121.4710, 31.2290], [121.4715, 31.2335]],
            aimSafe: false, targetLabel: "目标丢失", eviResult: "自动识别: 无匹配件 (需人为修正)", eviClass: "dim",
            timeline: {
                title: "当前执行：主干道例行安防护卫 (R-12)",
                nodes: [
                    { time: '09:00', name: '入口', res: '✓', status: 'safe', pos: '25%', coords: [121.4700, 31.2290] },
                    { time: '09:15', name: '换热阀', res: '高温警示', status: 'warn', pos: '55%', coords: [121.4715, 31.2335], alertId: 'A-02' },
                    { time: '巡航扫描', name: '出入口', res: '前往', status: 'active', pos: '85%', coords: [121.4720, 31.2340] }
                ]
            }
        }
    },
    alerts: [
        { id: 'A-01', bgImg: makeMockImg('Alert A-01', '#3a1212', '#5d1d1d'), time: '10:32', level: 'danger', state: '未确认', device: '2#高压冷凝机组', loc: 'E区-3#点', defect: '轴承频域异响(800Hz峰值)', taskId: 'T-01', coords: [121.4725, 31.2325], aimSafe: true, targetLabel: '冷凝轴承 [锁死]', eviResult: '分析: 剧烈共振摩擦声', eviClass: 'danger-txt', lastTime: '昨日 15:00', lastResult: '正常', comp: '突发异常' },
        { id: 'A-02', bgImg: makeMockImg('Alert A-02', '#3a2a14', '#594321'), time: '09:15', level: 'warn', state: '待复核', device: 'A区换热阀', loc: '主管廊前端', defect: '热成像法兰面超限 85℃', taskId: 'T-02', coords: [121.4715, 31.2335], aimSafe: true, targetLabel: '换热阀法兰 [热成像]', eviResult: '分析: 温度超阈 12%', eviClass: 'warn-txt', lastTime: '本周一', lastResult: '78℃', comp: '持续升温(+7℃)' },
        { id: 'A-03', bgImg: makeMockImg('Alert A-03', '#172033', '#334f7c'), time: '11:45', level: 'danger', state: '待复核', device: 'B区冷媒管线', loc: '侧边管囊', defect: '气体压力突降', taskId: 'T-01', coords: [121.4729, 31.2331], aimSafe: false, targetLabel: '压力表视窗 [未对准]', eviResult: '分析: 镜头失焦，无法读数', eviClass: 'danger-txt', lastTime: '2天前', lastResult: '正常', comp: '未见异常' }
    ],
    docks: [
        { id: 'D-01', name: 'A区-主干道充电站', status: 'charging', bot: 'R-11', lastRobot: 'R-07', voltage: '398V', totalCharges: 18, fullNotLeave: 1, queueCount: 2, facadeImg: makeMockImg('A区主干道充电站门面', '#112437', '#294c73'), coords: [121.4725, 31.2280] },
        { id: 'D-02', name: 'C区-仓库备用站', status: 'safe', bot: '空闲', lastRobot: 'R-02', voltage: '401V', totalCharges: 12, fullNotLeave: 2, queueCount: 0, facadeImg: makeMockImg('C区仓库备用站门面', '#1a2b2c', '#2f6164'), coords: [121.4760, 31.2345] },
        { id: 'D-03', name: 'B区-巡检入口充电站', status: 'charging', bot: 'R-02', lastRobot: 'R-12', voltage: '396V', totalCharges: 16, fullNotLeave: 1, queueCount: 1, facadeImg: makeMockImg('B区入口充电站门面', '#2c1d1d', '#654037'), coords: [121.4708, 31.2282] },
        { id: 'D-04', name: 'E区-动力站房充电站', status: 'safe', bot: '空闲', lastRobot: 'R-11', voltage: '400V', totalCharges: 21, fullNotLeave: 3, queueCount: 0, facadeImg: makeMockImg('E区动力站房充电站门面', '#241f33', '#4a3f71'), coords: [121.4775, 31.2318] },
        { id: 'D-05', name: '北侧-临停补能站', status: 'safe', bot: '空闲', lastRobot: 'R-05', voltage: '399V', totalCharges: 9, fullNotLeave: 1, queueCount: 1, facadeImg: makeMockImg('北侧临停补能站门面', '#233021', '#496b44'), coords: [121.4732, 31.2342] },
        { id: 'D-06', name: '南侧-备用充电站', status: 'charging', bot: 'R-05', lastRobot: 'R-03', voltage: '397V', totalCharges: 14, fullNotLeave: 2, queueCount: 2, facadeImg: makeMockImg('南侧备用充电站门面', '#2c2222', '#634646'), coords: [121.4768, 31.2274] }
    ],
    apDevices: [
        { id: 'AP-A1', name: 'A区-入口AP', area: 'A', status: 'safe', signal: '-51dBm', channel: 'CH-6', band: '2.4GHz', users: 8, uptime: '17天', coords: siteCoord(0.24, 0.48) },
        { id: 'AP-B2', name: 'B区-廊道AP', area: 'B', status: 'safe', signal: '-58dBm', channel: 'CH-40', band: '5GHz', users: 5, uptime: '31天', coords: siteCoord(0.52, 0.60) },
        { id: 'AP-C3', name: 'C区-仓储AP', area: 'C', status: 'danger', signal: '-87dBm', channel: 'CH-149', band: '5GHz', users: 1, uptime: '离线 18m', coords: siteCoord(0.82, 0.44) }
    ]
};

const INSPECTION_POINT_COORDS = {
    'IP-E3': siteCoord(0.72, 0.57),
    'IP-E5': siteCoord(0.84, 0.68),
    'IP-B1': siteCoord(0.21, 0.63),
    'IP-B3': siteCoord(0.57, 0.56)
};

const applySiteLayout = () => {
    const pt = {
        E3: INSPECTION_POINT_COORDS['IP-E3'],
        E5: INSPECTION_POINT_COORDS['IP-E5'],
        B1: INSPECTION_POINT_COORDS['IP-B1'],
        B3: INSPECTION_POINT_COORDS['IP-B3'],
        R07: siteCoord(0.67, 0.58),
        R12: siteCoord(0.43, 0.56),
        R02: siteCoord(0.58, 0.71),
        R11: siteCoord(0.16, 0.36),
        R05: siteCoord(0.46, 0.74),
        A03: siteCoord(0.63, 0.67),
        D1: siteCoord(0.16, 0.36),
        D2: siteCoord(0.89, 0.39),
        D3: siteCoord(0.33, 0.34),
        D4: siteCoord(0.63, 0.36),
        D5: siteCoord(0.78, 0.74),
        D6: siteCoord(0.46, 0.74),
        T1N1: siteCoord(0.35, 0.48),
        T1N2: siteCoord(0.53, 0.48),
        T1N4: siteCoord(0.84, 0.63),
        T2N3: siteCoord(0.33, 0.45)
    };

    const setRobotCoord = (id, coord) => {
        const robot = DATA.robots.find((r) => r.id === id);
        if (robot) robot.coords = coord;
    };
    setRobotCoord('R-07', pt.R07);
    setRobotCoord('R-12', pt.R12);
    setRobotCoord('R-02', pt.R02);
    setRobotCoord('R-11', pt.R11);
    setRobotCoord('R-05', pt.R05);

    const setDockCoord = (id, coord) => {
        const dock = DATA.docks.find((d) => d.id === id);
        if (dock) dock.coords = coord;
    };
    setDockCoord('D-01', pt.D1);
    setDockCoord('D-02', pt.D2);
    setDockCoord('D-03', pt.D3);
    setDockCoord('D-04', pt.D4);
    setDockCoord('D-05', pt.D5);
    setDockCoord('D-06', pt.D6);

    const setAlertCoord = (id, coord) => {
        const alert = DATA.alerts.find((a) => a.id === id);
        if (alert) alert.coords = coord;
    };
    setAlertCoord('A-01', pt.E3);
    setAlertCoord('A-02', pt.B3);
    setAlertCoord('A-03', pt.A03);

    const t1 = DATA.tasks['T-01'];
    if (t1) {
        t1.robotCoords = pt.R07;
        t1.targetCoords = pt.T1N4;
        t1.path = [pt.T1N1, pt.T1N2, pt.R07];
        t1.futurePath = [pt.R07, pt.T1N4, pt.E5];
        t1.targetLine = [pt.R07, pt.T1N4];
        if (Array.isArray(t1.timeline?.nodes)) {
            t1.timeline.nodes[0].coords = pt.T1N1;
            t1.timeline.nodes[1].coords = pt.T1N2;
            t1.timeline.nodes[2].coords = pt.E3;
            t1.timeline.nodes[3].coords = pt.T1N4;
            t1.timeline.nodes[4].coords = pt.E5;
        }
    }

    const t2 = DATA.tasks['T-02'];
    if (t2) {
        t2.robotCoords = pt.R12;
        t2.targetCoords = pt.B3;
        t2.path = [pt.B1, pt.R12];
        t2.futurePath = [pt.R12, pt.B3, pt.T2N3];
        t2.targetLine = [pt.R12, pt.B3];
        if (Array.isArray(t2.timeline?.nodes)) {
            t2.timeline.nodes[0].coords = pt.B1;
            t2.timeline.nodes[1].coords = pt.B3;
            t2.timeline.nodes[2].coords = pt.T2N3;
        }
    }
};
applySiteLayout();

const getInspectionPointIdByCoords = (coords) => {
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const [lng, lat] = coords.map(Number);
    const EPS = 0.0002;
    for (const [id, c] of Object.entries(INSPECTION_POINT_COORDS)) {
        if (Math.abs(c[0] - lng) < EPS && Math.abs(c[1] - lat) < EPS) return id;
    }
    return null;
};

const getNearestInspectionPointId = (coords, maxDistance = 0.00055) => {
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const [lng, lat] = coords.map(Number);
    let nearestId = null;
    let nearestDist = Infinity;
    for (const [id, c] of Object.entries(INSPECTION_POINT_COORDS)) {
        const dx = c[0] - lng;
        const dy = c[1] - lat;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearestId = id;
        }
    }
    return nearestDist <= maxDistance ? nearestId : null;
};

const focusAlertPoint = (alertId) => {
    const alert = DATA.alerts.find(a => a.id === alertId);
    if (!alert?.coords) return false;
    const pointId = getNearestInspectionPointId(alert.coords, 0.00035) || getInspectionPointIdByCoords(alert.coords);
    if (!pointId) return false;
    state.currentAlertId = alertId;
    setFocus('inspectionPoint', pointId, { instantPopup: true });
    return true;
};

const getTaskPool = () => ([
    ...Object.keys(DATA.tasks).map(tk => ({
        tk,
        name: DATA.tasks[tk].taskName,
        bot: DATA.tasks[tk].bot,
        state: DATA.tasks[tk].state || 'running',
        prog: DATA.tasks[tk].prog
    })),
    { tk: 'T-03', name: 'A区晨检', bot: 'R-03', state: 'completed', prog: '100%' },
    { tk: 'T-04', name: 'C区夜间覆盖', bot: '待调拨', state: 'pending', prog: '0%' }
]);

const ensureHierarchySelection = () => {
    const hierarchy = DATA.taskHierarchy[state.currentTaskId];
    if (!hierarchy || !hierarchy.inspectionPoints || hierarchy.inspectionPoints.length === 0) {
        state.currentInspectionPointId = null;
        state.currentMonitorPointId = null;
        state.currentMetricKey = null;
        return;
    }

    const hasPoint = hierarchy.inspectionPoints.some(p => p.id === state.currentInspectionPointId);
    if (!hasPoint) state.currentInspectionPointId = hierarchy.inspectionPoints[0].id;
    const selectedPoint = hierarchy.inspectionPoints.find(p => p.id === state.currentInspectionPointId);
    const monitorPoints = selectedPoint?.monitorPoints || [];
    if (monitorPoints.length === 0) {
        state.currentMonitorPointId = null;
        state.currentMetricKey = null;
        return;
    }
    const hasMonitor = monitorPoints.some(m => m.id === state.currentMonitorPointId);
    if (!hasMonitor) state.currentMonitorPointId = monitorPoints[0].id;

    const selectedMonitor = monitorPoints.find(m => m.id === state.currentMonitorPointId);
    const metricKeys = Object.keys(selectedMonitor?.metrics || {});
    if (!metricKeys.length) {
        state.currentMetricKey = null;
        return;
    }
    if (!metricKeys.includes(state.currentMetricKey)) state.currentMetricKey = metricKeys[0];
};

const withTaskSelection = (taskId, botId) => {
    state.currentTaskId = taskId;
    if (botId) state.currentRobotId = botId;
    ensureHierarchySelection();
};

const pad2 = (n) => String(n).padStart(2, '0');
const formatDateTime = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
const toMetricHistoryRecords = (metric) => {
    const values = Array.isArray(metric?.history) ? metric.history : [];
    const base = new Date('2029-03-23T10:33:42');
    return values.map((value, idx) => {
        const dt = new Date(base.getTime() - idx * 24 * 60 * 60 * 1000);
        return { time: formatDateTime(dt), value };
    });
};

// UI Triggers
const setFocus = (type, id, opts = {}) => {
    state.autoplayEnabled = false;
    closeMapPopup();

    if (type === 'robot') {
        if (state.lastClick.type === 'robot' && state.lastClick.id === id && state.viewMode === 'focus') {
            state.lastClick = { type: null, id: null };
            state.currentAlertId = null;
            state.currentDockId = null;
            state.viewMode = 'global';
            map.easeTo(DEFAULT_VIEW);
            document.getElementById('top-context').innerText = '当前视角: 全局场站总览';
            setAlertPanelVisible(false);
            setTimelineVisible(false);
            renderAll();
            return;
        }

        state.lastClick = { type, id };
        state.viewMode = 'focus';
        state.currentRobotId = id;
        state.currentAlertId = null;
        state.currentDockId = null;
        document.getElementById('top-context').innerText = `巡检追踪: ${id}`;
        setAlertPanelVisible(false);
        setTimelineVisible(true);
        const bot = DATA.robots.find(r => r.id === id);
        if (bot && bot.taskId) withTaskSelection(bot.taskId, bot.id);
        if (bot) {
            map.easeTo({ center: bot.coords, zoom: 18, pitch: 0, bearing: 0 });
            if (opts.instantPopup) {
                showRobotPopup(id);
            } else {
                setTimeout(() => showRobotPopup(id), 400);
            }
        }
    } else if (type === 'inspectionPoint') {
        state.lastClick = { type, id };
        state.viewMode = 'focus';
        state.currentInspectionPointId = id;
        state.currentMonitorPointId = null;
        state.currentMetricKey = null;
        ensureHierarchySelection();
        document.getElementById('top-context').innerText = `巡检点详情: ${id}`;
        setAlertPanelVisible(false);
        // Keep timeline visible for quick backtrack across inspection points.
        setTimelineVisible(true);
        const coords = INSPECTION_POINT_COORDS[id];
        if (coords) {
            map.easeTo({ center: coords, zoom: 19, pitch: 0, bearing: 0 });
            let opened = false;
            const openPopup = () => {
                if (opened) return;
                opened = true;
                showInspectionPointPopup(id);
            };
            map.once('moveend', openPopup);
            setTimeout(openPopup, 450);
        }
    } else if (type === 'alert') {
        if (state.lastClick.type === 'alert' && state.lastClick.id === id && state.viewMode === 'focus') {
            state.lastClick = { type: null, id: null };
            state.currentAlertId = null;
            state.viewMode = 'global';
            map.easeTo(DEFAULT_VIEW);
            document.getElementById('top-context').innerText = '当前视角: 全局场站总览';
            setAlertPanelVisible(false);
            setTimelineVisible(false);
            renderAll();
            return;
        }

        state.lastClick = { type, id };
        state.viewMode = 'focus';
        state.currentAlertId = id;
        state.currentDockId = null;
        document.getElementById('top-context').innerText = `异常聚焦处置: ${id}`;
        setAlertPanelVisible(true);
        setTimelineVisible(false);
        const alt = DATA.alerts.find(a => a.id === id);
        if (alt && alt.taskId) {
            withTaskSelection(alt.taskId, DATA.tasks[alt.taskId].bot);
            map.easeTo({ center: alt.coords, zoom: 19, pitch: 0, bearing: 0 });
        }
    } else if (type === 'dock') {
        if (state.lastClick.type === 'dock' && state.lastClick.id === id && state.viewMode === 'focus') {
            state.lastClick = { type: null, id: null };
            state.currentDockId = null;
            state.viewMode = 'global';
            map.easeTo(DEFAULT_VIEW);
            document.getElementById('top-context').innerText = '当前视角: 全局场站总览';
            setAlertPanelVisible(false);
            setTimelineVisible(false);
            renderAll();
            return;
        }

        state.lastClick = { type, id };
        state.viewMode = 'focus';
        state.currentDockId = id;
        state.currentAlertId = null;
        document.getElementById('top-context').innerText = `场站设施: ${id}`;
        setAlertPanelVisible(false);
        setTimelineVisible(false);
        const dock = DATA.docks.find(d => d.id === id);
        if (dock) {
            map.flyTo({ center: dock.coords, zoom: 19.5, pitch: 0, bearing: 0 });
            let opened = false;
            const openPopup = () => {
                if (opened) return;
                opened = true;
                showDockPopup(id);
            };
            map.once('moveend', openPopup);
            setTimeout(openPopup, 450);
        }
    } else if (type === 'node') {
        const coords = id.split(',').map(Number);
        const pointId = getInspectionPointIdByCoords(coords);
        if (pointId) {
            setFocus('inspectionPoint', pointId, { instantPopup: true });
            return;
        }
        setAlertPanelVisible(false);
        setTimelineVisible(false);
        map.easeTo({ center: coords, zoom: 19, pitch: 0, bearing: 0 });
    } else if (type === 'all' && id === 'global') {
        state.lastClick = { type: null, id: null };
        state.currentAlertId = null;
        state.currentDockId = null;
        state.viewMode = 'global';
        map.easeTo(DEFAULT_VIEW);
        document.getElementById('top-context').innerText = '当前视角: 全局场站总览';
        setAlertPanelVisible(false);
        setTimelineVisible(false);
        renderAll();
        return;
    }
    renderAll();
};
window.setFocus = setFocus;

const tickAutoplay = () => {
    if (!state.autoplayEnabled) return;
    const taskKeys = Object.keys(DATA.tasks).filter(k => DATA.tasks[k].state !== 'completed');
    state.autoplayIndex = (state.autoplayIndex + 1) % taskKeys.length;
    withTaskSelection(taskKeys[state.autoplayIndex], DATA.tasks[taskKeys[state.autoplayIndex]].bot);
    state.currentAlertId = null;
    document.getElementById('top-context').innerText = `当前视角: 机器人自动漫游 (${state.currentRobotId})`;
    renderAll();
};

setInterval(tickAutoplay, 8000);

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.taskFilter = btn.dataset.filter;
        renderTaskCard();
    };
});

// Alert Actions
const confirmAlertBtn = document.getElementById('btn-confirm-alert');
if (confirmAlertBtn) confirmAlertBtn.onclick = () => {
    if (!state.currentAlertId) return;
    const alt = DATA.alerts.find(a => a.id === state.currentAlertId);
    if (alt) {
        state.lastAlertAction = {
            alertId: alt.id,
            prevState: alt.state,
            prevLevel: alt.level
        };
        alt.state = '已发单处置';
        alt.level = 'warn';
        renderAll();
    }
};
const clearAlertBtn = document.getElementById('btn-clear-alert');
if (clearAlertBtn) clearAlertBtn.onclick = () => {
    if (!state.currentAlertId) return;
    const alt = DATA.alerts.find(a => a.id === state.currentAlertId);
    if (alt) {
        state.lastAlertAction = {
            alertId: alt.id,
            prevState: alt.state,
            prevLevel: alt.level
        };
        alt.state = '现场已查无异常';
        alt.level = 'safe';
        renderAll();
    }
};
const undoAlertBtn = document.getElementById('btn-undo-alert');
if (undoAlertBtn) undoAlertBtn.onclick = () => {
    if (!state.lastAlertAction) return;
    const alt = DATA.alerts.find(a => a.id === state.lastAlertAction.alertId);
    if (!alt) return;
    alt.state = state.lastAlertAction.prevState;
    alt.level = state.lastAlertAction.prevLevel;
    state.currentAlertId = alt.id;
    state.lastAlertAction = null;
    renderAll();
};

// ==== 3. Renders ====

const setRobotFilter = (f) => {
    window.robotFilter = f;
    const filtered = f === 'all' ? DATA.robots : DATA.robots.filter(r => r.status === f);
    if (filtered.length > 0 && filtered[0].taskId) {
        withTaskSelection(filtered[0].taskId, filtered[0].id);
    }
    renderAll();
}
window.setRobotFilter = setRobotFilter;

const renderRobots = () => {
    const robotTotalMileage = DATA.robots.reduce((sum, r) => sum + (ROBOT_MILEAGE_KM[r.id] || 0), 0);
    const robotTotalMileageEl = document.getElementById('robot-total-mileage');
    if (robotTotalMileageEl) robotTotalMileageEl.innerText = `${robotTotalMileage} km`;

    const tbody = document.getElementById('robot-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const filtered = window.robotFilter === 'all' ? DATA.robots : DATA.robots.filter(r => r.status === window.robotFilter);
    filtered.forEach(r => {
        const bizStatus = getRobotBizStatus(r);
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        if (r.id === state.currentRobotId) tr.style.background = 'rgba(197, 168, 123, 0.1)';
        tr.onclick = () => setFocus('robot', r.id);
        const battClass = r.battery <= 20 ? 'warn-txt' : '';
        const tClass = bizStatus === 'warning' ? 'danger-txt' : '';
        const statusTagClass = bizStatus === 'warning' ? 'danger' : (bizStatus === 'charging' ? 'charging' : (bizStatus === 'returning' ? 'warn' : 'safe'));
        tr.innerHTML = `
            <td class="r-name">${r.id}</td>
            <td><span class="r-tag ${statusTagClass}">${ROBOT_BIZ_STATUS_LABEL[bizStatus]}</span></td>
            <td class="${battClass}">${r.battery}%</td>
            <td>${ROBOT_MILEAGE_KM[r.id] || 0}km</td>
            <td class="r-task ${tClass}">${r.task}</td>
        `;
        tbody.appendChild(tr);
    });
};

const renderAlerts = () => {
    if (!state.alertPanelVisible) return;
    const ul = document.getElementById('alert-list-container');
    if (!ul) return;
    ul.innerHTML = '';

    if (!state.currentAlertId) {
        const defaultDanger = DATA.alerts.find(a => a.level === 'danger' && (a.state === '未确认' || a.state === '待复核'));
        const fallback = DATA.alerts[0];
        if (defaultDanger || fallback) state.currentAlertId = (defaultDanger || fallback).id;
    }

    let unack = 0; let ack = 0;
    const alertsToShow = state.currentAlertId
        ? DATA.alerts.filter(a => a.id === state.currentAlertId)
        : DATA.alerts.slice(0, 1);
    alertsToShow.forEach(a => {
        if (a.state === '未确认' || a.state === '待复核') unack++; else ack++;
        const li = document.createElement('li');
        li.className = `alert-row ${a.level}`;
        if (a.id === state.currentAlertId) { li.style.background = 'rgba(255,255,255,0.08)'; li.style.borderColor = 'var(--text-main)'; }
        li.onclick = (e) => {
            e.stopPropagation();
            setFocus('alert', a.id);
        };

        let lvlLabel = a.level === 'danger' ? '严重' : (a.level === 'warn' ? '警告' : '提示');
        const taskName = DATA.tasks[a.taskId] ? DATA.tasks[a.taskId].taskName : a.taskId;
        const botId = DATA.tasks[a.taskId] ? DATA.tasks[a.taskId].bot : '';
        li.innerHTML = `
            <div class="a-ctx"><span class="a-time">${a.time}</span> <span class="a-level ${a.level}">${lvlLabel}</span><span class="a-state">${a.state}</span></div>
            <div class="a-desc">
                <strong><span class="danger-txt">[${a.defect.split('(')[0]}]</span> 任务:</strong> ${taskName}<br>
                <strong>机体:</strong> ${botId} | <strong>点位:</strong> ${a.loc} (${a.device})<br>
                <strong style="color:var(--status-${a.level});">缺陷详情:</strong> ${a.defect}<br>
                <div style="font-size:10px; margin-top:4px; padding-top:4px; border-top:1px dashed rgba(255,255,255,0.1);">
                  上次(${a.lastTime}): ${a.lastResult} <span style="margin-left:8px;color:var(--text-sub);">对比差异: ${a.comp}</span>
                </div>
            </div>
        `;

        if (a.id === state.currentAlertId) {
            const eviDiv = document.createElement('div');
            eviDiv.className = 'alert-evi-inline';
            eviDiv.style.cssText = 'margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 2px;';
            eviDiv.innerHTML = `
                <div class="evi-tabs" style="margin-bottom: 6px;">
                   <button class="e-tab ${state.currentEvidenceMode === 'normal' ? 'active' : ''}" data-mode="normal">可见光追踪</button>
                   <button class="e-tab ${state.currentEvidenceMode === 'thermal' ? 'active' : ''}" data-mode="thermal">热红外追踪</button>
                   <button class="e-tab ${state.currentEvidenceMode === 'video' ? 'active' : ''}" data-mode="video">巡检异状片段</button>
                </div>
                <div class="evi-frame" style="height: 160px; cursor: pointer;" id="alert-evi-frame">
                    <div class="evi-mock" id="alert-evi-mock" style="background-image: url('${a.bgImg}');"></div>
                    <div class="target-box" style="top:30%; left:40%;">
                      <span class="target-lbl">${a.targetLabel}</span>
                    </div>
                </div>
                <div style="font-size: 10px; margin-top: 4px; display: flex; justify-content: space-between;">
                    <span class="${a.eviClass}">${a.eviResult}</span>
                    <span style="color: var(--accent-titan);">点击图片放大查看</span>
                </div>
            `;
            li.appendChild(eviDiv);

            eviDiv.querySelectorAll('.e-tab').forEach(tab => {
                tab.onclick = (e) => {
                    e.stopPropagation();
                    state.currentEvidenceMode = tab.dataset.mode;
                    renderEvidence();
                    renderAlerts();
                };
            });

            const eviFrame = eviDiv.querySelector('#alert-evi-frame');
            eviFrame.onclick = (e) => {
                e.stopPropagation();
                const mock = document.getElementById('alert-evi-mock');
                const img = mock?.style.backgroundImage?.replace(/^url\(["']?/, '').replace(/["']?\)$/, '') || a.bgImg;
                openEvidenceModal({
                    image: img,
                    title: `${a.device} ${botId} | ${a.time}`,
                    device: a.device,
                    meta: `${botId} | ${a.time}`,
                    thumbs: [
                        { img: a.bgImg, label: '告警主视角' },
                        { img: makeMockImg(`${a.device} 热异常`, '#4b1f1f', '#7a3f2f'), label: '热异常' },
                        { img: makeMockImg(`${a.device} 接线端子`, '#213045', '#3d6288'), label: '接线端子' },
                        { img: makeMockImg(`${a.device} 仪表区`, '#2b3341', '#4d6076'), label: '仪表区' }
                    ]
                });
            };
        }

        ul.appendChild(li);
    });

    document.getElementById('alert-unack').innerText = unack;
    document.getElementById('alert-ack').innerText = ack;

    document.getElementById('alert-distribution').innerHTML = `
        <div class="sb-fill gold" style="width:50%" title="一般异常: 50%"></div>
        <div class="sb-fill warn-txt" style="width:30%; background:#F59E0B" title="严重异常: 30%"></div>
        <div class="sb-fill danger" style="width:20%; background:#EF4444" title="停机风险: 20%"></div>
    `;

    const actionBox = document.getElementById('alert-actions');
    const btnConfirm = document.getElementById('btn-confirm-alert');
    const btnClear = document.getElementById('btn-clear-alert');
    const btnUndo = document.getElementById('btn-undo-alert');
    const hasUndo = !!state.lastAlertAction;

    actionBox.style.display = state.currentAlertId ? 'flex' : 'none';
    if (!state.currentAlertId) return;

    if (hasUndo) {
        btnConfirm.style.display = 'none';
        btnClear.style.display = 'none';
        btnUndo.style.display = 'block';
    } else {
        btnConfirm.style.display = 'block';
        btnClear.style.display = 'block';
        btnUndo.style.display = 'none';
    }
};

const getFilterStyle = (mode) => {
    if (mode === 'normal') return 'grayscale(15%) hue-rotate(0deg)';
    if (mode === 'thermal') return 'saturate(4) hue-rotate(120deg) contrast(1.7)';
    return 'sepia(0.3) blur(1px)';
};

const renderDocks = () => {
    const totalStations = DATA.docks.length;
    const chargingStations = DATA.docks.reduce((sum, d) => sum + getDockQueueStats(d).charging, 0);
    const fullNotLeave = DATA.docks.reduce((sum, d) => sum + getDockQueueStats(d).fullNotLeave, 0);
    const queueStations = DATA.docks.reduce((sum, d) => sum + getDockQueueStats(d).queue, 0);
    const grid = document.getElementById('dock-grid-container');
    if (!grid) return;
    const metrics = [
        { value: totalStations, label: '充电站数量', tone: 'base' },
        { value: chargingStations, label: '当前充电台数', tone: 'active' },
        { value: fullNotLeave, label: '已充满未离站台数', tone: 'safe' },
        { value: queueStations, label: '排队台数', tone: 'warn' }
    ];
    grid.innerHTML = metrics.map((m, idx) => `
      <button class="dock-item clickable" data-dock-metric-index="${idx}">
        <div class="di-val tone-${m.tone}">${m.value}</div>
        <div class="di-lbl">${m.label}</div>
      </button>
    `).join('');
    const preferredDock = DATA.docks.find((d) => d.status === 'charging') || DATA.docks[0];
    grid.querySelectorAll('.dock-item.clickable').forEach((el) => {
        el.onclick = () => {
            if (preferredDock) setFocus('dock', preferredDock.id);
        };
    });
};

const renderTaskCard = () => {
    // 检查元素是否存在
    const cont = document.getElementById('task-info-container');
    if (!cont) return;

    ensureHierarchySelection();
    const t = DATA.tasks[state.currentTaskId];
    const hierarchy = DATA.taskHierarchy[state.currentTaskId];
    if (!t) {
        cont.innerHTML = '<div style="color:var(--text-sub); margin-bottom:8px;">选中的终端当前不在巡检流内...</div>';
        return;
    }

    const selectedPoint = hierarchy?.inspectionPoints?.find(p => p.id === state.currentInspectionPointId);
    const selectedMonitor = selectedPoint?.monitorPoints?.find(m => m.id === state.currentMonitorPointId);
    const selectedMetrics = selectedMonitor?.metrics || {};
    const selectedMetric = selectedMetrics[state.currentMetricKey];
    const metricDeviceMap = {
        O2: '储氧罐',
        CH4: '甲烷管廊',
        CO: '燃烧室',
        H2S: '硫化区',
        TVOC: '有机溶剂区',
        Noise: '压缩机组'
    };

    const genTasks = getTaskPool();
    const filteredTasks = state.taskFilter === 'all'
        ? genTasks
        : genTasks.filter(k => k.state === state.taskFilter);

    cont.innerHTML = `
        <div class="task-layout">
            <section class="task-section">
                <div class="section-title">巡检任务列表</div>
                <div id="inspection-task-list" class="task-scroll task-scroll-lg">
                    ${filteredTasks.map((ot) => `
                        <div class="task-mini-row ${ot.tk === state.currentTaskId ? 'active' : ''}" data-task-id="${ot.tk}" data-task-bot="${ot.bot}">
                            <span><b>${ot.name}</b></span><span class="task-mini-meta">${ot.prog}</span>
                        </div>
                    `).join('')}
                </div>
            </section>

            <section class="task-section task-summary">
                <h4 class="epic-name">${t.taskName}</h4>
                <div class="epic-grid">
                    <div class="eg-item"><span class="eg-lbl">任务结构</span><span class="eg-val">${t.type}</span></div>
                    <div class="eg-item"><span class="eg-lbl">责任分区</span><span class="eg-val">${t.region}</span></div>
                    <div class="eg-item"><span class="eg-lbl">作业终端</span><span class="eg-val">${t.bot}</span></div>
                    <div class="eg-item"><span class="eg-lbl">当前阶段</span><span class="eg-val highlight">${t.stage}</span></div>
                </div>
            </section>

            <section class="task-section">
                <div class="section-title">巡检点列表（随任务联动）</div>
                <div id="inspection-point-list" class="task-scroll">
                    ${(hierarchy?.inspectionPoints || []).map((p) => `
                        <div class="task-mini-row ${p.id === state.currentInspectionPointId ? 'active' : ''}" data-point-id="${p.id}">
                            <span><b>${p.name}</b></span><span class="task-mini-meta">${p.progress}</span>
                        </div>
                    `).join('')}
                </div>
            </section>

            <section class="task-section">
                <div class="section-title">监控指标</div>
                <div id="task-metric-list" class="task-metric-grid">
                    ${Object.keys(selectedMetrics).map((k) => `
                        <div class="metric-tile ${k === state.currentMetricKey ? 'active' : ''}" data-metric-key="${k}">
                            <div class="metric-tile-head">
                                <span class="metric-device">${metricDeviceMap[k] || (selectedMonitor?.name || '设备')}</span>
                                <span class="metric-icon">${selectedMetrics[k].icon}</span>
                            </div>
                            <div class="metric-indicator">${selectedMetrics[k].label}</div>
                            <div class="metric-value">${selectedMetrics[k].value}</div>
                        </div>
                    `).join('')}
                </div>
                ${selectedMetric ? `
                    <div class="metric-history">
                        <div class="metric-history-title">${selectedMetric.icon} ${selectedMetric.label} 历史列表</div>
                        <div class="metric-history-grid">
                            ${toMetricHistoryRecords(selectedMetric).map((h) => `
                                <span class="metric-history-row"><span class="metric-history-time">${h.time}</span><b class="safe-txt">${h.value}</b></span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </section>
        </div>
    `;

    // 检查元素是否存在
    const taskProg = document.getElementById('task-prog');
    const taskEta = document.getElementById('task-eta');
    const taskBar = document.getElementById('task-bar');

    if (taskProg) taskProg.innerText = t.prog;
    if (taskEta) taskEta.innerText = t.eta;
    if (taskBar) taskBar.style.width = t.bar;

    cont.querySelectorAll('[data-task-id]').forEach((el) => {
        el.onclick = () => {
            const taskId = el.dataset.taskId;
            if (!taskId || !DATA.tasks[taskId]) return;
            withTaskSelection(taskId, el.dataset.taskBot);
            state.autoplayEnabled = false;
            renderAll();
        };
    });

    cont.querySelectorAll('[data-point-id]').forEach((el) => {
        el.onclick = () => {
            state.currentInspectionPointId = el.dataset.pointId;
            state.currentMonitorPointId = null;
            state.currentMetricKey = null;
            ensureHierarchySelection();
            renderTaskCard();
        };
    });
    cont.querySelectorAll('[data-metric-key]').forEach((el) => {
        el.onclick = () => {
            state.currentMetricKey = el.dataset.metricKey;
            renderTaskCard();
        };
    });
};

const renderEvidence = () => {
    let aimSafe, targetLabel, eviResult, eviClass, bgImg;
    let titleBadge = `实录跟拍`;
    const mock = document.getElementById('evidence-mock');
    const eviRobotEl = document.getElementById('evi-robot');
    const eviDeviceEl = document.getElementById('evi-device');
    const liveTagEl = document.getElementById('live-camera-tag');
    const aimBox = document.getElementById('aim-box');
    const aimStatus = document.getElementById('aim-status');
    const eviResultEl = document.getElementById('evi-result');
    const modalContent = document.getElementById('evi-modal-content');
    const hasMainEvidence = !!(mock && eviRobotEl && eviDeviceEl && liveTagEl && aimBox && aimStatus && eviResultEl);

    if (!hasMainEvidence) {
        if (modalContent) modalContent.style.filter = getFilterStyle(state.currentEvidenceMode);
        document.querySelectorAll('#modal-evi-tabs .e-tab').forEach(tab => {
            if (tab.dataset.mode === state.currentEvidenceMode) tab.classList.add('active');
            else tab.classList.remove('active');
        });
        return;
    }

    if (state.currentAlertId) {
        const a = DATA.alerts.find(x => x.id === state.currentAlertId);
        aimSafe = a.aimSafe; targetLabel = a.targetLabel; eviResult = a.eviResult; eviClass = a.eviClass; bgImg = a.bgImg;
        eviRobotEl.innerText = `${DATA.tasks[a.taskId] ? DATA.tasks[a.taskId].bot : ''} | ${a.time} (历史异常快照)`;
        titleBadge = '证据回查';
    } else {
        const t = DATA.tasks[state.currentTaskId];
        if (!t) return;
        aimSafe = t.aimSafe; targetLabel = t.targetLabel; eviResult = t.eviResult; eviClass = t.eviClass; bgImg = t.bgImg || makeMockImg('Live View', '#152338', '#2f4866');
        eviRobotEl.innerText = `${t.bot} | 同步影像`;
        // if no explicit alert, just show task's nominal target
        targetLabel = t.targetLabel || '广角巡视';
    }

    eviDeviceEl.innerText = state.currentAlertId ? DATA.alerts.find(a => a.id === state.currentAlertId).device : (targetLabel);
    liveTagEl.innerText = titleBadge;

    if (aimSafe) {
        aimBox.style.borderColor = '#EF4444';
        aimBox.querySelector('.target-lbl').innerText = `${targetLabel} [视觉判定锁入]`;
        aimStatus.innerHTML = '<span class="dot safe"></span> 云台对位精准';
        aimStatus.className = 'aim-status safe-txt';
        eviResultEl.innerText = eviResult;
        eviResultEl.className = eviClass;
    } else {
        aimBox.style.borderColor = '#F59E0B';
        aimBox.querySelector('.target-lbl').innerText = `${targetLabel} [尝试自动寻迹]`;
        aimStatus.innerHTML = '<span class="dot danger"></span> 镜头偏离巡检面';
        aimStatus.className = 'aim-status danger-txt';
        eviResultEl.innerText = eviResult;
        eviResultEl.className = eviClass;
    }

    if (bgImg) mock.style.backgroundImage = `url('${bgImg}')`;

    mock.style.filter = getFilterStyle(state.currentEvidenceMode);

    if (modalContent) {
        modalContent.style.backgroundImage = mock.style.backgroundImage;
        modalContent.style.filter = mock.style.filter;
        document.getElementById('modal-device').innerText = eviDeviceEl.innerText;
        document.getElementById('modal-meta').innerText = eviRobotEl.innerText;
        const titleEl = document.getElementById('evi-modal-title');
        if (titleEl) titleEl.innerText = `${eviDeviceEl.innerText} | ${eviRobotEl.innerText}`;
        const thumbsEl = document.getElementById('evi-modal-thumbs');
        if (thumbsEl && bgImg) {
            thumbsEl.innerHTML = `<button class="evi-thumb active"><span class="evi-thumb-img" style="background-image:url('${bgImg}')"></span><span class="evi-thumb-label">主视角</span></button>`;
        }
    }

    document.querySelectorAll('.e-tab').forEach(tab => {
        if (tab.dataset.mode === state.currentEvidenceMode) tab.classList.add('active');
        else tab.classList.remove('active');
    });
};

const renderTimeline = () => {
    const t = DATA.tasks[state.currentTaskId];
    if (!t) return;
    const headerEl = document.getElementById('tl-header');
    const track = document.getElementById('tl-track');
    if (!headerEl || !track) return;

    const bot = DATA.robots.find(r => r.id === t.bot);
    const botStatusMap = { safe: '执行中', warn: '注意', danger: '故障', charging: '充电中' };
    const botStatusColor = { safe: 'safe-txt', warn: 'warn-txt', danger: 'danger-txt', charging: 'dim' };

    const activeNode = t.timeline.nodes.find(n => n.status === 'active') || t.timeline.nodes[0];
    const postActionText = t.anomaly > 0 ? `<span class="danger-txt" style="display:flex; align-items:center;"><span class="dot danger" style="width:6px;height:6px;margin-right:4px;"></span>异常处置: 绕路前往下一个点位</span>` : `<span class="safe-txt" style="display:flex; align-items:center;"><span class="dot safe" style="width:6px;height:6px;margin-right:4px;"></span>状态正常: 继续前进</span>`;

    headerEl.innerHTML = `
        <div id="tl-focus-pivot" style="display:flex; justify-content:space-between; width:100%; cursor:pointer; align-items:center;" data-coords="${activeNode.coords.join(',')}">
            <div style="display:flex; align-items:center; gap:16px;">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:bold;">${t.timeline.title}</span>
                    ${bot ? `<span style="font-size:11px; color:var(--text-sub); margin-top:2px;">
                        <span class="${botStatusColor[bot.status]}">${bot.id}</span>
                        <span style="margin:0 8px;">•</span>
                        <span style="color:var(--text-sub);">${botStatusMap[bot.status] || '待命'}</span>
                        <span style="margin:0 8px;">•</span>
                        <span style="color:var(--text-sub);">电量: ${bot.battery}%</span>
                    </span>` : ''}
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:20px; font-size:11px;">
                <span>位置: <span style="color:var(--accent-titan)">${activeNode.name}</span></span>
                ${postActionText}
            </div>
        </div>
    `;

    const pivotEl = document.getElementById('tl-focus-pivot');
    if (pivotEl && bot) {
        pivotEl.onclick = (e) => {
            e.stopPropagation();
            setFocus('robot', bot.id);
        };
    }

    let html = '<div class="f-line"></div>';
    const rawNodes = [...(t.timeline.nodes || [])];
    while (rawNodes.length < 5) {
        const nextCoord = t.futurePath?.[rawNodes.length] || t.targetLine?.[1] || rawNodes[rawNodes.length - 1]?.coords || t.robotCoords;
        rawNodes.push({
            time: '待定',
            name: rawNodes.length === 4 ? '终点' : `巡检点${rawNodes.length + 1}`,
            res: '',
            status: 'future',
            coords: nextCoord
        });
    }
    const nodes = rawNodes.map((n, idx, arr) => ({
        ...n,
        _idx: idx,
        _posValue: n.pos ? Number(String(n.pos).replace('%', '')) : (arr.length <= 1 ? 50 : (idx / (arr.length - 1)) * 100)
    }));
    const activeIdx = Math.max(0, nodes.findIndex((n) => n.status === 'active'));
    const keyIdxSet = new Set([0, nodes.length - 1, Math.max(0, activeIdx - 1), activeIdx, Math.min(nodes.length - 1, activeIdx + 1)]);

    nodes.forEach(node => {
        let pExtra = node.pop ? 'pop-pulse' : '';
        let resClass = (node.status === 'safe') ? 'safe-txt' : ((node.status === 'danger' || node.status === 'warn') ? 'danger-txt' : 'dim');
        let timeClass = (node.status === 'active') ? 'highlight' : (node.status === 'future' ? 'dim' : '');
        let nameClass = (node.status === 'active') ? 'highlight' : (node.status === 'future' ? 'dim' : '');
        let hasRobot = bot && node.status === 'active';
        const isKeyNode = keyIdxSet.has(node._idx);
        const isAlertMini = !isKeyNode && (node.status === 'warn' || node.status === 'danger' || !!node.alertId);
        const extraClass = `${hasRobot ? 'has-robot' : ''} ${isKeyNode ? 'key-node' : 'mini-node'} ${isAlertMini ? 'mini-alert' : ''}`;

        html += `
            <div class="f-node ${node.status} ${extraClass}" style="left: ${node._posValue}%; cursor: pointer;" data-coords="${node.coords.join(',')}">
                <div class="f-point ${pExtra}"></div>
                <div class="f-info">
                    <span class="time ${timeClass}">${node.time}</span>
                    <span class="name ${nameClass}">${node.name}</span>
                    <span class="res ${resClass}">${node.res}</span>
                    ${hasRobot ? `<span class="bot-tag" style="font-size:10px; margin-top:2px; padding:2px 6px; border-radius:2px; background:rgba(197,168,123,0.15); color:var(--accent-titan);">${bot.id}</span>` : ''}
                </div>
            </div>
        `;
    });
    track.innerHTML = html;
    if (bot && activeNode?.pos) {
        const robotPosHtml = `
            <div class="tl-robot-pos" style="left:${activeNode.pos}" data-bot-id="${bot.id}" title="点击查看 ${bot.id} 状态">
                <span class="tl-robot-icon">🤖</span>
                <span class="tl-robot-id">${bot.id}</span>
            </div>
        `;
        track.insertAdjacentHTML('beforeend', robotPosHtml);
        const robotPosEl = track.querySelector('.tl-robot-pos');
        if (robotPosEl) {
            robotPosEl.onclick = (e) => {
                e.stopPropagation();
                setFocus('robot', bot.id, { instantPopup: true });
            };
        }
    }

    track.querySelectorAll('.f-node').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            const coordsStr = el.dataset.coords;
            setFocus('node', coordsStr);
        };
    });
};

const shortenPointName = (name = '') => {
    const core = String(name).replace(/区|点|#|高压柜|冷凝塔|主门|入闸|换热阀/g, '');
    const simple = core.trim() || name;
    return simple.length > 4 ? simple.slice(0, 4) : simple;
};

const applyMapUiVisibility = () => {
    if (!map || !map.isStyleLoaded()) return;
    const vis = (on) => on ? 'visible' : 'none';
    const showRobots = !!state.mapUi.robots;
    const showPoints = !!state.mapUi.points;
    const showDocks = !!state.mapUi.docks;
    const showRobotLabels = showRobots && !!state.mapUi.labels;
    const showPointLabels = showPoints && !!state.mapUi.labels;
    const showDockLabels = showDocks && !!state.mapUi.labels;
    const showApLabels = showPoints && !!state.mapUi.labels;
    const showRoutes = !!state.mapUi.route && showRobots && showPoints;
    const statusMode = !!state.mapUi.pointStatus;
    const targetColorExpr = statusMode
        ? ['match', ['get', 'status'], 'warn', '#EF4444', 'danger', '#EF4444', 'pending', '#3B82F6', 'running', '#10B981', 'completed', '#10B981', '#C5A87B']
        : '#C5A87B';

    const maybeSet = (layer, prop, value, paint = false) => {
        if (!map.getLayer(layer)) return;
        if (paint) map.setPaintProperty(layer, prop, value);
        else map.setLayoutProperty(layer, prop, value);
    };
    maybeSet('route-backbone', 'visibility', vis(showRoutes));
    maybeSet('route-plan-all', 'visibility', vis(showRoutes));
    maybeSet('route-active', 'visibility', vis(showRoutes));
    maybeSet('route-future', 'visibility', vis(showRoutes));
    maybeSet('route-target', 'visibility', vis(showRoutes));

    maybeSet('pts-target', 'visibility', vis(showPoints));
    maybeSet('pts-target-hit', 'visibility', vis(showPoints));
    maybeSet('pts-ap', 'visibility', vis(showPoints));
    maybeSet('pts-ap-hit', 'visibility', vis(showPoints));
    maybeSet('pts-dock', 'visibility', vis(showDocks));
    maybeSet('pts-robot', 'visibility', vis(showRobots));
    maybeSet('pts-robot-hit', 'visibility', vis(showRobots));
    maybeSet('layer-with-pulsing-dot', 'visibility', vis(showPoints));
    maybeSet('pts-target-label', 'visibility', vis(showPointLabels));
    maybeSet('pts-robot-label', 'visibility', vis(showRobotLabels));
    maybeSet('pts-dock-label', 'visibility', vis(showDockLabels));
    maybeSet('pts-ap-label', 'visibility', vis(showApLabels));
    maybeSet('pts-target', 'circle-color', targetColorExpr, true);
    maybeSet('pts-target', 'circle-stroke-color', statusMode ? '#ffffff' : '#C5A87B', true);
};

const updateMapLayers = () => {
    if (!map.isStyleLoaded()) return;

    const isSameCoord = (a, b, eps = 0.00008) => {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
    };
    const buildTaskRoute = (taskId, task, robotCoords) => {
        const plannedPointCoords = ((DATA.taskHierarchy[taskId]?.inspectionPoints) || [])
            .map((p) => INSPECTION_POINT_COORDS[p.id])
            .filter((c) => Array.isArray(c) && c.length === 2);
        const nodes = (task?.timeline?.nodes || []).filter((n) => Array.isArray(n.coords));
        if (plannedPointCoords.length >= 2) {
            const activeNode = nodes.find((n) => n.status === 'active');
            const anchorCoords = activeNode?.coords || robotCoords || plannedPointCoords[0];
            let anchorIdx = 0;
            let minDist = Infinity;
            plannedPointCoords.forEach((c, idx) => {
                const dx = c[0] - anchorCoords[0];
                const dy = c[1] - anchorCoords[1];
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                    minDist = dist;
                    anchorIdx = idx;
                }
            });
            const active = plannedPointCoords.slice(0, anchorIdx + 1);
            const future = plannedPointCoords.slice(anchorIdx);
            const target = plannedPointCoords[anchorIdx + 1]
                ? [plannedPointCoords[anchorIdx], plannedPointCoords[anchorIdx + 1]]
                : (task?.targetLine || []);

            if (Array.isArray(robotCoords) && robotCoords.length === 2) {
                if (active.length && !isSameCoord(active[active.length - 1], robotCoords)) {
                    active.push(robotCoords);
                }
                if (!future.length || !isSameCoord(future[0], robotCoords)) {
                    future.unshift(robotCoords);
                }
            }

            return { active, future, target, allPoints: plannedPointCoords };
        }
        if (!nodes.length) {
            return {
                active: task?.path || [],
                future: task?.futurePath || [],
                target: task?.targetLine || [],
                allPoints: []
            };
        }
        const activeIdxRaw = nodes.findIndex((n) => n.status === 'active');
        const activeIdx = activeIdxRaw >= 0 ? activeIdxRaw : nodes.length - 1;
        const active = nodes.slice(0, activeIdx + 1).map((n) => n.coords);
        const future = nodes.slice(activeIdx).map((n) => n.coords);
        const target = nodes[activeIdx + 1]
            ? [nodes[activeIdx].coords, nodes[activeIdx + 1].coords]
            : (task?.targetLine || []);

        if (Array.isArray(robotCoords) && robotCoords.length === 2) {
            if (active.length && !isSameCoord(active[active.length - 1], robotCoords)) {
                active.push(robotCoords);
            }
            if (!future.length || !isSameCoord(future[0], robotCoords)) {
                future.unshift(robotCoords);
            }
        }
        return { active, future, target, allPoints: nodes.map((n) => n.coords) };
    };

    // Heatmap Update (Removed)

    const rFeats = DATA.robots.map(r => ({
        type: 'Feature',
        properties: {
            type: 'robot',
            id: r.id,
            status: r.status,
            bizStatus: getRobotBizStatus(r),
            speed: getRobotSpeedKmh(r),
            shortTask: toTaskShortName(r.task),
            labelText: `${r.id} ${getRobotSpeedKmh(r)}km/h\n${toTaskShortName(r.task)}`
        },
        geometry: { type: 'Point', coordinates: r.coords }
    }));

    const dFeats = DATA.docks.map(d => {
        const ds = getDockQueueStats(d);
        return {
            type: 'Feature',
            properties: {
                type: 'dock',
                id: d.id,
                status: d.status,
                labelText: `${d.id} 充${ds.charging} 停${ds.parked}`
            },
            geometry: { type: 'Point', coordinates: d.coords }
        };
    });

    const enabledAreas = state.mapUi.pointAreas || { A: true, B: true, C: true };
    const tFeats = [];
    Object.keys(DATA.taskHierarchy).forEach(tk => {
        (DATA.taskHierarchy[tk].inspectionPoints || []).forEach(p => {
            const coords = INSPECTION_POINT_COORDS[p.id];
            const area = getPointAreaKey(p);
            if (!enabledAreas[area]) return;
            if (coords) {
                const visit = getPointVisitStats(p.id);
                const plannedTimes = visit.total + 1;
                const doneTimes = visit.normal;
                const stText = POINT_STATUS_LABEL[p.status] || '';
                tFeats.push({
                    type: 'Feature',
                    properties: {
                        type: 'target',
                        area,
                        id: p.id,
                        name: p.name,
                        status: p.status,
                        taskId: tk,
                        labelText: `${shortenPointName(p.name)}\n今计${plannedTimes} / 已巡${doneTimes} / ${stText}`.trim()
                    },
                    geometry: { type: 'Point', coordinates: coords }
                });
            }
        });
    });
    const apFeats = DATA.apDevices
        .filter((ap) => enabledAreas[ap.area])
        .map((ap) => ({
            type: 'Feature',
            properties: {
                type: 'ap',
                id: ap.id,
                name: ap.name,
                area: ap.area,
                status: ap.status,
                labelText: `${ap.id}\n${ap.signal}`
            },
            geometry: { type: 'Point', coordinates: ap.coords }
        }));

    const canShowRoute = state.mapUi.route && state.mapUi.robots && state.mapUi.points;
    let pathFeats = canShowRoute ? [
        { type: 'Feature', properties: { type: 'backbone' }, geometry: { type: 'LineString', coordinates: [siteCoord(0.12, 0.52), siteCoord(0.9, 0.52)] } }
    ] : [];

    if (state.viewMode === 'global') {
        // Show paths for all running robots
        DATA.robots.forEach(r => {
            if (r.taskId && DATA.tasks[r.taskId]) {
                const t = DATA.tasks[r.taskId];
                const route = buildTaskRoute(r.taskId, t, r.coords);
                if (route.active.length >= 2) {
                    pathFeats.push({ type: 'Feature', properties: { type: 'active' }, geometry: { type: 'LineString', coordinates: route.active } });
                }
                if (route.future.length >= 2) {
                    pathFeats.push({ type: 'Feature', properties: { type: 'future' }, geometry: { type: 'LineString', coordinates: route.future } });
                }
                if (route.allPoints.length >= 2) {
                    pathFeats.push({ type: 'Feature', properties: { type: 'plan-all' }, geometry: { type: 'LineString', coordinates: route.allPoints } });
                }
            }
        });
    } else {
        const t = DATA.tasks[state.currentTaskId];
        if (t) {
            const focusRobot = DATA.robots.find(r => r.id === t.bot);
            const route = buildTaskRoute(state.currentTaskId, t, focusRobot?.coords || t.robotCoords);
            if (route.active.length >= 2) {
                pathFeats.push({ type: 'Feature', properties: { type: 'active' }, geometry: { type: 'LineString', coordinates: route.active } });
            }
            if (route.future.length >= 2) {
                pathFeats.push({ type: 'Feature', properties: { type: 'future' }, geometry: { type: 'LineString', coordinates: route.future } });
            }
            if (route.target.length >= 2) {
                pathFeats.push({ type: 'Feature', properties: { type: 'target-line' }, geometry: { type: 'LineString', coordinates: route.target } });
            }
            if (route.allPoints.length >= 2) {
                pathFeats.push({ type: 'Feature', properties: { type: 'plan-all' }, geometry: { type: 'LineString', coordinates: route.allPoints } });
            }
        }
    }

    const mapLayerData = map.getSource('business-layers');
    if (mapLayerData) {
        mapLayerData.setData({
            type: 'FeatureCollection',
            features: [
                ...(state.mapUi.robots ? rFeats : []),
                ...(state.mapUi.docks ? dFeats : []),
                ...(state.mapUi.points ? tFeats : []),
                ...(state.mapUi.points ? apFeats : [])
            ]
        });
    }

    if (!canShowRoute) pathFeats = [];
    const pathData = map.getSource('patrol-paths');
    if (pathData) pathData.setData({ type: 'FeatureCollection', features: pathFeats });

    // Alerts
    const alertFeats = DATA.alerts.filter(a => a.state.includes('未确认') || a.state.includes('待复')).map(a => ({
        type: 'Feature', properties: { id: a.id }, geometry: { type: 'Point', coordinates: a.coords }
    }));
    const alertData = map.getSource('alerts');
    if (alertData) alertData.setData({ type: 'FeatureCollection', features: state.mapUi.points ? alertFeats : [] });
    applyMapUiVisibility();

    if (state.viewMode === 'focus' && state.autoplayEnabled && !state.lastClick.type) {
        const t = DATA.tasks[state.currentTaskId];
        if (t) map.easeTo({ center: t.robotCoords, zoom: 17, pitch: 0, bearing: 0 });
    }
};

const classifyRiskCategory = (alert) => {
    const text = `${alert?.defect || ''}${alert?.loc || ''}${alert?.device || ''}`;
    if (/红外|热|温|测温/.test(text)) return 'infrared';
    if (/气|甲烷|硫化氢|co|voc|压力/.test(text.toLowerCase())) return 'gas';
    if (/行为|闯入|门禁/.test(text)) return 'safeBehavior';
    return 'device';
};

const buildBroadcastMessages = () => {
    const msgs = [];
    Object.values(DATA.tasks).forEach((t) => {
        const done = t.timeline?.nodes?.filter((n) => n.status !== 'future').length || 0;
        const total = t.timeline?.nodes?.length || 0;
        msgs.push({ type: 'normal', text: `${t.bot} 正在执行 ${t.taskName}，已完成 ${done}/${total} 点` });
    });
    DATA.alerts.slice(0, 2).forEach((a) => {
        msgs.push({ type: 'alert', alertId: a.id, text: `${a.loc} 发现异常：${a.defect.split('(')[0]}，已置顶风险` });
    });
    return msgs.length ? msgs : [{ type: 'normal', text: '系统运行中，等待巡检任务更新' }];
};

const renderBroadcastPanel = (items) => {
    const pinEl = document.getElementById('broadcast-pin');
    const listEl = document.getElementById('broadcast-list');
    if (!pinEl || !listEl) return;
    const alerts = items.filter((i) => i.type === 'alert');
    const normals = items.filter((i) => i.type !== 'alert');
    pinEl.innerText = alerts[0]?.text || '暂无置顶告警';
    pinEl.style.cursor = alerts[0]?.alertId ? 'pointer' : 'default';
    pinEl.onclick = () => {
        const alertId = alerts[0]?.alertId;
        if (!alertId) return;
        focusAlertPoint(alertId);
    };

    const rolling = normals.length ? normals : [{ type: 'normal', text: '暂无普通播报消息' }];
    const draw = () => {
        const rows = [];
        for (let i = 0; i < 3; i += 1) {
            const cur = rolling[(broadcastTickerIndex + i) % rolling.length];
            rows.push(`<div class="broadcast-row ${cur.type === 'alert' ? 'alert' : ''}">${cur.text}</div>`);
        }
        listEl.innerHTML = rows.join('');
        listEl.classList.remove('slide-up');
        void listEl.offsetWidth;
        listEl.classList.add('slide-up');
    };

    if (broadcastTickerTimer) clearInterval(broadcastTickerTimer);
    broadcastTickerIndex = 0;
    draw();
    broadcastTickerTimer = setInterval(() => {
        broadcastTickerIndex = (broadcastTickerIndex + 1) % rolling.length;
        draw();
    }, 2600);
};

const renderStats = () => {
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };
    const totalRobots = DATA.robots.length;
    const totalAlerts = DATA.alerts.length;
    const robotBiz = DATA.robots.reduce((acc, r) => {
        const k = getRobotBizStatus(r);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
    }, { executing: 0, returning: 0, charging: 0, standby: 0, warning: 0 });

    const todayTaskTotal = 26;
    const executedTaskTotal = 184;
    const totalRuntimeHours = 1258;
    setText('total-robots', totalRobots);
    setText('executing-robots', robotBiz.executing);
    setText('charging-robots', robotBiz.charging);
    setText('today-tasks', todayTaskTotal);
    setText('executed-task-total', executedTaskTotal);
    setText('total-alerts', totalAlerts);
    setText('total-runtime', totalRuntimeHours);
    setText('robot-runtime', `${totalRuntimeHours}h`);

    const riskCats = DATA.alerts.reduce((acc, a) => {
        const cat = classifyRiskCategory(a);
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, { safeBehavior: 0, infrared: 0, gas: 0, device: 0 });
    setText('risk-safe-behavior', riskCats.safeBehavior);
    setText('risk-infrared', riskCats.infrared);
    setText('risk-gas', riskCats.gas);
    setText('risk-device', riskCats.device);
    setText('equipment-health-rate', '128天');
    setText('weather-summary', `${WEATHER_SNAPSHOT.condition} ${WEATHER_SNAPSHOT.temp}°C ${WEATHER_SNAPSHOT.wind} 湿度${WEATHER_SNAPSHOT.humidity}%`);

    document.querySelectorAll('[data-risk-cat]').forEach((item) => {
        const cat = item.dataset.riskCat;
        const count = riskCats[cat] || 0;
        item.classList.toggle('has-alert', count > 0);
        item.onclick = (e) => {
            e.stopPropagation();
            const target = DATA.alerts.find((a) => classifyRiskCategory(a) === cat);
            if (target) focusAlertPoint(target.id);
        };
    });

    const msgs = buildBroadcastMessages();
    const topMsgs = [
        msgs.find((m) => m.type === 'normal') || msgs[0],
        msgs.find((m) => m.type === 'alert') || msgs[1] || msgs[0]
    ];
    const topTrack = document.getElementById('message-marquee-track');
    if (topTrack) {
        const htmlMsgs = topMsgs.map((m) => m.type === 'alert' ? `<span class="msg-alert">${m.text}</span>` : `<span>${m.text}</span>`).join('   ｜   ');
        topTrack.innerHTML = `${htmlMsgs}   ｜   ${htmlMsgs}`;
    }
    renderBroadcastPanel(msgs);
};

const getAllInspectionPoints = () => {
    const all = [];
    Object.keys(DATA.taskHierarchy).forEach(tk => {
        const points = DATA.taskHierarchy[tk].inspectionPoints || [];
        points.forEach(p => all.push({ ...p, taskId: tk }));
    });
    return all;
};

const getPointAreaKey = (point) => {
    const text = `${point?.name || ''}${point?.id || ''}`;
    if (/^A区|A区|IP-A/i.test(text)) return 'A';
    if (/^B区|B区|IP-B/i.test(text)) return 'B';
    if (/^C区|C区|IP-C/i.test(text)) return 'C';
    if (/^E区|E区|IP-E/i.test(text)) return 'C';
    return 'C';
};

const parseMetricValueParts = (raw) => {
    const val = String(raw || '');
    const num = parseFloat(val.replace(/[^\d.]/g, ''));
    const unit = (val.match(/[^\d.\s]+$/) || [''])[0];
    return { num: Number.isNaN(num) ? 0 : num, unit };
};

const buildAttachmentRealtimeCardsHtml = (metrics = {}) => {
    return Object.keys(ENV_METRIC_DEFS).map((key) => {
        const metric = metrics[key] || {};
        const realtime = metric.value || '--';
        const values = [metric.value, ...(metric.history || [])].map((v) => parseMetricValueParts(v));
        const maxNum = values.reduce((m, it) => Math.max(m, it.num), 0);
        const maxUnit = values.find((it) => it.unit)?.unit || '';
        return `
          <div class="env-rt-card">
            <div class="env-rt-title">${ENV_METRIC_DEFS[key].label}</div>
            <div class="env-rt-minis">
              <div class="env-rt-mini"><span>实时(机器)</span><b>${realtime}</b></div>
            </div>
            <div class="env-rt-max"><span>最大值</span><b>${maxNum}${maxUnit}</b></div>
          </div>
        `;
    }).join('');
};

const computeEnvMetrics = () => {
    const thresholds = {
        O2: { min: 19.5, max: 23.5 },
        CH4: { max: 2.0 },
        CO: { max: 10 },
        H2S: { max: 5 }
    };
    const points = getAllInspectionPoints();
    const agg = { O2: 0, CH4: 0, CO: 0, H2S: 0 };
    points.forEach(p => {
        const monitor = p.monitorPoints?.[0];
        const metrics = monitor?.metrics || {};
        Object.keys(agg).forEach(k => {
            const v = metrics[k]?.value;
            if (!v) return;
            const num = parseFloat(String(v).replace(/[^\d.]/g, ''));
            if (Number.isNaN(num)) return;
            if (k === 'O2') {
                if (num < thresholds.O2.min || num > thresholds.O2.max) agg[k] += 1;
            } else {
                if (num > thresholds[k].max) agg[k] += 1;
            }
        });
    });
    const exceedTotal = Object.values(agg).reduce((s, n) => s + n, 0);
    const score = Math.max(40, 100 - exceedTotal * 8);
    return { agg, score, exceedTotal };
};

const renderLeadershipPanels = () => {
    const points = getAllInspectionPoints();
    const pointTotal = points.length;
    const inspectedPoints = points.filter(p => p.status !== 'pending').length;
    const pointCoverage = pointTotal ? Math.round(inspectedPoints / pointTotal * 100) : 0;

    const totalRobots = DATA.robots.length;
    const robotBiz = DATA.robots.reduce((acc, r) => {
        const k = getRobotBizStatus(r);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
    }, { executing: 0, returning: 0, charging: 0, standby: 0, warning: 0 });
    const returningCount = robotBiz.returning;
    const onTaskCount = robotBiz.executing;
    const totalMileage = 18650; // POC: 累计行驶里程（km）
    const todayMileage = 286;   // POC: 今日行驶里程（km）
    const inspectionTotalMileage = 326; // POC: 已巡检里程（km）
    const tempTaskCount = 3;
    const inspectionPointTimes = inspectedPoints * 3 + 8;

    const env = computeEnvMetrics();

    const planSummary = document.getElementById('plan-summary-cards');
    if (planSummary) {
        const taskCount = inspectionPointTimes;
        const facilities = DATA.docks.length + points.length + 8;
        const anomalies = DATA.alerts.length;
        const detectionItemCount = points.reduce((total, point) => {
            const monitorPoints = point.monitorPoints || [];
            return total + monitorPoints.reduce((sum, monitorPoint) => {
                const metrics = monitorPoint.metrics || {};
                return sum + Object.keys(metrics).length;
            }, 0);
        }, 0);
        planSummary.innerHTML = `
          <div class="summary-item"><span class="s-label">巡检点次</span><span class="s-val">${taskCount}</span><span class="s-meta">今日累计</span></div>
          <div class="summary-item"><span class="s-label">已巡检里程</span><span class="s-val">${inspectionTotalMileage}km</span><span class="s-meta">巡检里程</span></div>
          <div class="summary-item"><span class="s-label">覆盖率</span><span class="s-val">${pointCoverage}%</span><span class="s-meta">当日覆盖</span></div>
          <div class="summary-item"><span class="s-label">检测项</span><span class="s-val">${detectionItemCount}</span><span class="s-meta">检测项数量</span></div>
          <div class="summary-item"><span class="s-label">设施设备数</span><span class="s-val">${facilities}</span><span class="s-meta">纳管设备</span></div>
          <div class="summary-item"><span class="s-label">异常数</span><span class="s-val">${anomalies}</span><span class="s-meta">待跟踪项</span></div>
        `;
    }

    const robotSummary = document.getElementById('robot-summary-cards');
    if (robotSummary) {
        const avgSpeed = Math.max(6, robotBiz.executing * 2 + robotBiz.returning);
        robotSummary.innerHTML = `
          <div class="summary-item"><span class="s-label">执行中 / 返航中</span><span class="s-val">${onTaskCount}/${returningCount}</span><span class="s-meta">当前状态</span></div>
          <div class="summary-item"><span class="s-label">充电中</span><span class="s-val">${robotBiz.charging}</span><span class="s-meta">充电状态</span></div>
          <div class="summary-item"><span class="s-label">临时任务</span><span class="s-val">${tempTaskCount}</span><span class="s-meta">临时插单</span></div>
          <div class="summary-item"><span class="s-label">机器人总数</span><span class="s-val">${totalRobots}</span><span class="s-meta">在册机器人</span></div>
          <div class="summary-item"><span class="s-label">今日里程</span><span class="s-val">${todayMileage}km</span><span class="s-meta">总里程 ${totalMileage}km</span></div>
          <div class="summary-item"><span class="s-label">平均时速</span><span class="s-val">${avgSpeed}km/h</span><span class="s-meta">当日均值</span></div>
        `;
    }
    const attachmentGasSummary = document.getElementById('attachment-gas-cards');
    if (attachmentGasSummary) {
        const gas = ATTACHMENT_SUMMARY_BASE.gasSensors;
        attachmentGasSummary.innerHTML = `
          <div class="summary-item"><span class="s-label">气体传感器总数</span><span class="s-val">${gas.total}</span><span class="s-meta">总数</span></div>
          <div class="summary-item"><span class="s-label">传感器正常</span><span class="s-val">${gas.normal}</span><span class="s-meta">正常</span></div>
          <div class="summary-item"><span class="s-label">传感器异常</span><span class="s-val">${gas.offline}</span><span class="s-meta">已掉线</span></div>
        `;
    }
    const attachmentGimbalSummary = document.getElementById('attachment-gimbal-cards');
    if (attachmentGimbalSummary) {
        const gimbal = ATTACHMENT_SUMMARY_BASE.gimbals;
        attachmentGimbalSummary.innerHTML = `
          <div class="summary-item"><span class="s-label">云台总数</span><span class="s-val">${gimbal.total}</span><span class="s-meta">总数</span></div>
          <div class="summary-item"><span class="s-label">云台正常</span><span class="s-val">${gimbal.normal}</span><span class="s-meta">正常</span></div>
          <div class="summary-item"><span class="s-label">云台异常</span><span class="s-val">${gimbal.offline}</span><span class="s-meta">已掉线</span></div>
        `;
    }
    const facilitySummary = document.getElementById('facility-summary-cards');
    if (facilitySummary) {
        const typed = [
            { name: '温度计', count: 12, risk: 0 },
            { name: '直流阀', count: 28, risk: 0 },
            { name: '交流柜', count: 16, risk: 0 },
            { name: 'AP设备', count: 9, risk: 0 }
        ];
        const total = typed.reduce((s, t) => s + t.count, 0);
        const totalEl = document.getElementById('facility-total');
        if (totalEl) totalEl.innerText = total;
        facilitySummary.innerHTML = typed.map((it) => `
         <div class="summary-item"><span class="s-label">${it.name}</span><span class="s-val">${it.count}</span><span class="s-meta">异常 ${it.risk} </span></div>
        `).join('');
    }

    const envSummary = document.getElementById('env-summary-cards');
    if (envSummary) {
        if (!state.envRealtimePointList?.length) {
            state.envRealtimePointList = points;
        }
        const focusPoint = state.envRealtimePointList[state.envFocusPointIndex % state.envRealtimePointList.length] || points[0];
        const focusMetrics = focusPoint?.monitorPoints?.[0]?.metrics || {};
        const metricKeys = Object.keys(ENV_METRIC_DEFS);
        const parseNum = (raw) => {
            const num = parseFloat(String(raw || '').replace(/[^\d.]/g, ''));
            return Number.isNaN(num) ? 0 : num;
        };
        envSummary.innerHTML = metricKeys.map((key) => {
            const machine = Math.max(0, (env.agg[key] || 0) + (key === 'CO' ? 1 : 0));
            const remote = Math.max(0, (env.agg[key] || 0) + 2);
            const maxVal = parseNum(focusMetrics[key]?.value || 0);
            return `
          <div class="env-rt-card clickable" data-env-metric="${key}">
            <div class="env-rt-title">${ENV_METRIC_DEFS[key].label}</div>
            <div class="env-rt-minis">
              <div class="env-rt-mini"><span>机器</span><b>${machine}</b></div>
              <div class="env-rt-mini"><span>远端</span><b>${remote}</b></div>
            </div>
            <div class="env-rt-max"><span>最大值</span><b>${maxVal}</b></div>
          </div>`;
        }).join('');
        envSummary.classList.remove('slide-in');
        void envSummary.offsetWidth;
        envSummary.classList.add('slide-in');
        envSummary.querySelectorAll('[data-env-metric]').forEach((item) => {
            item.onclick = (e) => {
                e.stopPropagation();
                openEnvMetricModal(item.dataset.envMetric);
            };
        });
        const focusPointEl = document.getElementById('env-focus-point');
        if (focusPointEl) {
            focusPointEl.innerText = focusPoint?.name || '--';
        }
        if (!envRealtimeTicker) {
            envRealtimeTicker = setInterval(() => {
                if (!state.envRealtimePointList?.length) return;
                state.envFocusPointIndex = (state.envFocusPointIndex + 1) % state.envRealtimePointList.length;
                renderLeadershipPanels();
            }, 4200);
        }
    }
};

const showAlertModal = (alert) => {
    if (!alert) return;

    const modal = document.getElementById('alert-modal');
    const body = document.getElementById('alert-modal-body');

    if (!modal || !body) return;

    const taskName = DATA.tasks[alert.taskId] ? DATA.tasks[alert.taskId].taskName : alert.taskId;
    const botId = DATA.tasks[alert.taskId] ? DATA.tasks[alert.taskId].bot : '';
    let lvlLabel = alert.level === 'danger' ? '严重' : (alert.level === 'warn' ? '警告' : '提示');

    body.innerHTML = `
        <div class="alert-modal-content">
            <div class="alert-ctx" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                    <span class="a-time" style="color: var(--text-sub); font-family: var(--font-data); margin-right: 16px;">${alert.time}</span>
                    <span class="a-level ${alert.level}" style="color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 12px;">${lvlLabel}</span>
                    <span class="a-state" style="color: var(--text-dim); font-size: 12px; margin-left: 12px;">${alert.state}</span>
                </div>
            </div>
            
            <div class="alert-desc" style="margin-bottom: 20px; line-height: 1.6;">
                <p style="margin-bottom: 8px;"><strong><span class="danger-txt">[${alert.defect.split('(')[0]}]</span> 任务:</strong> ${taskName}</p>
                <p style="margin-bottom: 8px;"><strong>机体:</strong> ${botId} | <strong>点位:</strong> ${alert.loc} (${alert.device})</p>
                <p style="margin-bottom: 8px;"><strong style="color:var(--status-${alert.level});">缺陷详情:</strong> ${alert.defect}</p>
                <div style="font-size: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,0.1);">
                    上次(${alert.lastTime}): ${alert.lastResult} <span style="margin-left: 16px; color: var(--text-sub);">对比差异: ${alert.comp}</span>
                </div>
            </div>
            
            <div class="alert-evidence" style="margin-bottom: 20px;">
                <div class="evi-tabs" style="margin-bottom: 12px;">
                    <button class="e-tab active" data-mode="normal">可见光追踪</button>
                    <button class="e-tab" data-mode="thermal">热红外追踪</button>
                    <button class="e-tab" data-mode="video">巡检异状片段</button>
                </div>
                <div class="evi-frame" style="height: 240px; cursor: pointer; border: 1px solid var(--border-focus); border-radius: 4px; overflow: hidden;">
                    <div class="evi-mock" style="background-image: url('${alert.bgImg}'); width: 100%; height: 100%; background-size: cover; background-position: center;"></div>
                    <div class="target-box" style="position: absolute; top: 30%; left: 40%; width: 80px; height: 80px; border: 2px dashed var(--status-danger); box-shadow: 0 0 0 9999px rgba(0,0,0,0.3);">
                        <span class="target-lbl" style="position: absolute; bottom: -24px; left: 0; font-size: 12px; color: var(--status-danger); white-space: nowrap; background: rgba(0,0,0,0.5); padding: 2px 8px;">${alert.targetLabel}</span>
                    </div>
                </div>
                <div style="font-size: 12px; margin-top: 8px; display: flex; justify-content: space-between;">
                    <span class="${alert.eviClass}">${alert.eviResult}</span>
                    <span style="color: var(--accent-titan); cursor: pointer;">点击图片放大查看</span>
                </div>
            </div>
            
            <div class="alert-actions" style="display: flex; gap: 12px; justify-content: flex-end;">
                <button class="btn-action secondary" onclick="showAlertDetailOnly('${alert.id}')" style="padding: 8px 24px; background: rgba(255,255,255,0.1); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; cursor: pointer; font-size: 14px;">查看详情</button>
                <button class="btn-action primary" onclick="goDispatchCenter('${botId}')" style="padding: 8px 24px; background: var(--status-danger); color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">前往调度台</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    // 绑定标签切换事件
    body.querySelectorAll('.e-tab').forEach(tab => {
        tab.onclick = (e) => {
            e.stopPropagation();
            body.querySelectorAll('.e-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        };
    });

    // 绑定图片点击事件
    const eviFrame = body.querySelector('.evi-frame');
    if (eviFrame) {
        eviFrame.onclick = (e) => {
            e.stopPropagation();
            const thumbs = [
                { img: alert.bgImg, label: '阀体外观' },
                { img: makeMockImg(`${alert.device} 热斑`, '#4b1f1f', '#7a3f2f'), label: '热异常' },
                { img: makeMockImg(`${alert.device} 接线端子`, '#213045', '#3d6288'), label: '接线端子' },
                { img: makeMockImg(`${alert.device} 仪表区`, '#2b3341', '#4d6076'), label: '仪表区' }
            ];
            openEvidenceModal({
                image: alert.bgImg,
                title: `${alert.device} ${botId} | ${alert.time}`,
                device: alert.device,
                meta: `${botId} | ${alert.time}`,
                thumbs
            });
        };
    }
};

const confirmAlert = (alertId) => {
    const alt = DATA.alerts.find(a => a.id === alertId);
    if (alt) {
        state.lastAlertAction = {
            alertId: alt.id,
            prevState: alt.state,
            prevLevel: alt.level
        };
        alt.state = '已发单处置';
        alt.level = 'warn';
        renderAll();
        document.getElementById('alert-modal').style.display = 'none';
    }
};
const showAlertDetailOnly = (alertId) => {
    const alt = DATA.alerts.find(a => a.id === alertId);
    if (!alt) return;
    state.currentAlertId = alertId;
    document.getElementById('top-context').innerText = `告警详情查看: ${alertId}`;
};
window.showAlertDetailOnly = showAlertDetailOnly;

const clearAlert = (alertId) => {
    const alt = DATA.alerts.find(a => a.id === alertId);
    if (alt) {
        state.lastAlertAction = {
            alertId: alt.id,
            prevState: alt.state,
            prevLevel: alt.level
        };
        alt.state = '现场已查无异常';
        alt.level = 'safe';
        renderAll();
        document.getElementById('alert-modal').style.display = 'none';
    }
};

const formatShortDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const initLeadershipDateFilter = () => {
    const startEl = document.getElementById('leadership-start-date');
    const endEl = document.getElementById('leadership-end-date');
    if (!startEl || !endEl) return;

    const today = formatShortDate(new Date());
    startEl.value = today;
    endEl.value = today;
    startEl.max = today;
    endEl.max = today;

    startEl.addEventListener('change', () => {
        if (startEl.value && endEl.value && startEl.value > endEl.value) {
            endEl.value = startEl.value;
        }
        renderLeadershipPanels();
    });

    endEl.addEventListener('change', () => {
        if (startEl.value && endEl.value && endEl.value < startEl.value) {
            startEl.value = endEl.value;
        }
        renderLeadershipPanels();
    });
};

const generateEnvMetricHistory = (metricKey, days) => {
    const env = computeEnvMetrics();
    const base = env.agg[metricKey] || 0;
    const code = metricKey.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const rows = [];
    for (let i = 0; i < days; i++) {
        const dt = new Date();
        dt.setDate(dt.getDate() - i);
        const delta = ((i + code) % 5) - 2;
        const periodicBump = days === 30 && i % 9 === 0 ? 1 : 0;
        const value = Math.max(0, base + delta + periodicBump);
        rows.push({ date: formatShortDate(dt), value });
    }
    return rows;
};

const renderEnvMetricHistory = () => {
    const metricKey = state.envMetricPopupKey;
    const days = state.envHistoryRange;
    const metricDef = ENV_METRIC_DEFS[metricKey];
    const modalTitle = document.getElementById('env-modal-title');
    const valueLabel = document.getElementById('env-modal-value-label');
    const listEl = document.getElementById('env-modal-history');
    if (!modalTitle || !valueLabel || !listEl || !metricDef) return;

    modalTitle.innerText = `${metricDef.label} 历史数据（近${days}天）`;
    valueLabel.innerText = `超阈点位(${metricDef.unit})`;
    const rows = generateEnvMetricHistory(metricKey, days);
    listEl.innerHTML = rows.map((row) => `
      <div class="env-history-row">
        <span class="date">${row.date}</span>
        <span class="value">${row.value}</span>
      </div>
    `).join('');

    document.querySelectorAll('.env-range-btn').forEach((btn) => {
        btn.classList.toggle('active', Number(btn.dataset.range) === days);
    });
};

const openEnvMetricModal = (metricKey) => {
    if (!ENV_METRIC_DEFS[metricKey]) return;
    state.envMetricPopupKey = metricKey;
    state.envHistoryRange = state.envHistoryRange || 7;
    renderEnvMetricHistory();
    const modal = document.getElementById('env-metric-modal');
    if (modal) modal.style.display = 'flex';
};

const renderAll = () => {
    renderStats(); renderRobots(); renderAlerts(); renderDocks();
    renderTaskCard(); renderTimeline(); renderEvidence();
    updateMapLayers();
    renderLeadershipPanels();
};

document.querySelectorAll('.e-tab').forEach(tab => {
    tab.onclick = () => { state.currentEvidenceMode = tab.dataset.mode; renderEvidence(); renderAlerts(); };
});

document.querySelectorAll('#modal-evi-tabs .e-tab').forEach(tab => {
    tab.onclick = () => {
        state.currentEvidenceMode = tab.dataset.mode;
        renderEvidence();
        renderAlerts();
        document.querySelectorAll('#modal-evi-tabs .e-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('evi-modal-content').style.filter = getFilterStyle(state.currentEvidenceMode);
    };
});

const modalCloseBtn = document.getElementById('evi-modal-close');
if (modalCloseBtn) {
    modalCloseBtn.onclick = () => {
        document.getElementById('evi-modal').style.display = 'none';
    };
}

const alertModalCloseBtn = document.getElementById('alert-modal-close');
if (alertModalCloseBtn) {
    alertModalCloseBtn.onclick = () => {
        document.getElementById('alert-modal').style.display = 'none';
    };
}

const controlModal = document.getElementById('control-modal');
const controlModalCloseBtn = document.getElementById('control-modal-close');
if (controlModalCloseBtn) {
    controlModalCloseBtn.onclick = () => {
        if (controlModal) controlModal.style.display = 'none';
    };
}
if (controlModal) {
    controlModal.onclick = (e) => {
        if (e.target === controlModal) controlModal.style.display = 'none';
    };
}
document.querySelectorAll('.control-view-tab').forEach((tab) => {
    tab.onclick = () => {
        const view = tab.dataset.view;
        document.querySelectorAll('.control-view-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const viewScreen = document.getElementById('control-view-screen');
        const meta = document.getElementById('control-view-meta');
        if (viewScreen) {
            viewScreen.style.filter = view === 'thermal'
                ? 'saturate(4) hue-rotate(120deg) contrast(1.7)'
                : 'grayscale(10%)';
        }
        if (meta) {
            meta.innerText = `${state.currentControlRobotId || '--'} | CAM-01 | ${view === 'thermal' ? 'THERMAL' : 'OPTICAL'}`;
        }
    };
});

document.querySelectorAll('.game-pad-btn').forEach((btn) => {
    btn.onclick = () => {
        const feedback = document.getElementById('control-feedback');
        const robotId = state.currentControlRobotId || state.currentRobotId || '--';
        const labels = {
            'ptz-up': '云台上仰',
            'ptz-down': '云台下俯',
            'ptz-left': '云台左转',
            'ptz-right': '云台右转',
            'ptz-home': '云台归中',
            'bot-forward': '机器人前进',
            'bot-backward': '机器人后退',
            'bot-left': '机器人左转',
            'bot-right': '机器人右转',
            'bot-stop': '机器人紧急停止'
        };
        if (feedback) {
            feedback.innerText = `已下发控制指令：${labels[btn.dataset.ctrl] || btn.dataset.ctrl}（目标 ${robotId}）`;
        }
    };
});

const envMetricModal = document.getElementById('env-metric-modal');
const envModalCloseBtn = document.getElementById('env-modal-close');
if (envModalCloseBtn) {
    envModalCloseBtn.onclick = () => {
        if (envMetricModal) envMetricModal.style.display = 'none';
    };
}
if (envMetricModal) {
    envMetricModal.onclick = (e) => {
        if (e.target === envMetricModal) envMetricModal.style.display = 'none';
    };
}
document.querySelectorAll('.env-range-btn').forEach((btn) => {
    btn.onclick = (e) => {
        e.stopPropagation();
        state.envHistoryRange = Number(btn.dataset.range) || 7;
        renderEnvMetricHistory();
    };
});

const cockpitEntryBtn = document.getElementById('btn-entry-cockpit');
if (cockpitEntryBtn) cockpitEntryBtn.onclick = () => goCockpit();
const tempDispatchBtn = document.getElementById('btn-temp-dispatch');
if (tempDispatchBtn) tempDispatchBtn.onclick = () => goDispatchCenter(state.currentRobotId || '');
const resetViewBtn = document.getElementById('btn-reset-view');
if (resetViewBtn) {
    resetViewBtn.onclick = () => {
        state.lastClick = { type: null, id: null };
        state.viewMode = 'global';
        map.easeTo(DEFAULT_VIEW);
        document.getElementById('top-context').innerText = '当前视角: 全局场站总览';
        setAlertPanelVisible(false);
        setTimelineVisible(false);
        renderAll();
    };
}
initLeadershipDateFilter();
const displayControlBtn = document.getElementById('btn-display-control');
const displayControlPopover = document.getElementById('display-control-popover');
const mapSearchBtn = document.getElementById('btn-map-search');
const mapSearchPopover = document.getElementById('map-search-popover');
const mapSearchInput = document.getElementById('map-search-input');
const mapSearchType = document.getElementById('map-search-type');
const mapSearchSubmit = document.getElementById('btn-map-search-submit');

const syncMapToolbarState = () => {
    document.querySelectorAll('[data-map-toggle-check]').forEach((cb) => {
        const key = cb.dataset.mapToggleCheck;
        cb.checked = !!state.mapUi[key];
        if (key === 'route') cb.disabled = !(state.mapUi.robots && state.mapUi.points);
        if (key === 'labels') cb.disabled = !(state.mapUi.robots || state.mapUi.points || state.mapUi.docks);
    });
    document.querySelectorAll('[data-map-point-area]').forEach((cb) => {
        const area = cb.dataset.mapPointArea;
        cb.checked = !!state.mapUi.pointAreas?.[area];
        cb.disabled = !state.mapUi.points;
    });
};

document.querySelectorAll('[data-map-toggle-check]').forEach((cb) => {
    cb.onchange = () => {
        const key = cb.dataset.mapToggleCheck;
        if (!key) return;
        state.mapUi[key] = cb.checked;
        if (!state.mapUi.robots && !state.mapUi.points) state.mapUi.route = false;
        if (!state.mapUi.robots && !state.mapUi.points && !state.mapUi.docks) state.mapUi.labels = false;
        syncMapToolbarState();
        updateMapLayers();
    };
});
document.querySelectorAll('[data-map-point-area]').forEach((cb) => {
    cb.onchange = () => {
        const area = cb.dataset.mapPointArea;
        if (!area) return;
        state.mapUi.pointAreas[area] = cb.checked;
        if (!Object.values(state.mapUi.pointAreas).some(Boolean)) {
            state.mapUi.pointAreas[area] = true;
            cb.checked = true;
        }
        updateMapLayers();
    };
});

if (displayControlBtn && displayControlPopover) {
    displayControlBtn.onclick = (e) => {
        e.stopPropagation();
        displayControlPopover.classList.toggle('open');
        mapSearchPopover?.classList.remove('open');
    };
}
if (mapSearchBtn && mapSearchPopover) {
    mapSearchBtn.onclick = (e) => {
        e.stopPropagation();
        mapSearchPopover.classList.toggle('open');
        displayControlPopover?.classList.remove('open');
        mapSearchInput?.focus();
    };
}

const handleMapSearch = () => {
    const kw = (mapSearchInput?.value || '').trim().toLowerCase();
    const t = mapSearchType?.value || 'all';
    if (!kw) return;
    const matchRobot = () => DATA.robots.find((r) => `${r.id} ${r.task}`.toLowerCase().includes(kw));
    const allPoints = getAllInspectionPoints();
    const matchPoint = () => allPoints.find((p) => `${p.id} ${p.name}`.toLowerCase().includes(kw));
    const matchAp = () => DATA.apDevices.find((ap) => `${ap.id} ${ap.name}`.toLowerCase().includes(kw));
    const matchDock = () => DATA.docks.find((d) => `${d.id} ${d.name}`.toLowerCase().includes(kw));
    let hit = null;
    if (t === 'robot') hit = { type: 'robot', data: matchRobot() };
    if (t === 'point') hit = { type: 'inspectionPoint', data: matchPoint() };
    if (t === 'ap') hit = { type: 'ap', data: matchAp() };
    if (t === 'dock') hit = { type: 'dock', data: matchDock() };
    if (t === 'all') {
        const robot = matchRobot();
        const point = matchPoint();
        const ap = matchAp();
        const dock = matchDock();
        if (robot) hit = { type: 'robot', data: robot };
        else if (point) hit = { type: 'inspectionPoint', data: point };
        else if (ap) hit = { type: 'ap', data: ap };
        else if (dock) hit = { type: 'dock', data: dock };
    }
    if (hit?.data?.id) {
        if (hit.type === 'ap') {
            map.easeTo({ center: hit.data.coords, zoom: 19, pitch: 0, bearing: 0 });
            setTimeout(() => showApPopup(hit.data.id), 320);
        } else {
            setFocus(hit.type, hit.data.id, { instantPopup: hit.type === 'robot' });
        }
        mapSearchPopover?.classList.remove('open');
    }
};

if (mapSearchSubmit) mapSearchSubmit.onclick = (e) => { e.stopPropagation(); handleMapSearch(); };
if (mapSearchInput) {
    mapSearchInput.onkeydown = (e) => {
        if (e.key === 'Enter') handleMapSearch();
    };
}
document.addEventListener('click', (e) => {
    if (!displayControlPopover?.contains(e.target) && e.target !== displayControlBtn) {
        displayControlPopover?.classList.remove('open');
    }
    if (!mapSearchPopover?.contains(e.target) && e.target !== mapSearchBtn) {
        mapSearchPopover?.classList.remove('open');
    }
});
syncMapToolbarState();

// ==== 4. Map Init ====
map.on('load', () => {
    const panMarginLng = 0.0024;
    const panMarginLat = 0.0016;
    map.setMaxBounds([
        [SITE_VIEW_BOUNDS[0][0] - panMarginLng, SITE_VIEW_BOUNDS[0][1] - panMarginLat],
        [SITE_VIEW_BOUNDS[1][0] + panMarginLng, SITE_VIEW_BOUNDS[1][1] + panMarginLat]
    ]);
    map.jumpTo(DEFAULT_VIEW);

    const buildFactoryGeojson = () => {
        const features = [];
        const createCylinder = (cx, cy, r, h, color) => {
            const pts = [];
            for (let i = 0; i <= 32; i++) { const ang = (i / 32) * Math.PI * 2; pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.85]); }
            features.push({ type: 'Feature', properties: { height: h, color }, geometry: { type: 'Polygon', coordinates: [pts] } });
        };

        const baseColor = '#1B2430'; const wingColor = '#222d3d';
        features.push({ type: 'Feature', properties: { height: 45, color: baseColor }, geometry: { type: 'Polygon', coordinates: [[[121.4730, 31.2325], [121.4750, 31.2325], [121.4750, 31.2295], [121.4730, 31.2295], [121.4730, 31.2325]]] } });
        features.push({ type: 'Feature', properties: { height: 30, color: wingColor }, geometry: { type: 'Polygon', coordinates: [[[121.4715, 31.2315], [121.4730, 31.2315], [121.4730, 31.2305], [121.4715, 31.2305], [121.4715, 31.2315]]] } });
        features.push({ type: 'Feature', properties: { height: 30, color: wingColor }, geometry: { type: 'Polygon', coordinates: [[[121.4750, 31.2315], [121.4765, 31.2315], [121.4765, 31.2305], [121.4750, 31.2305], [121.4750, 31.2315]]] } });

        for (let i = 0; i < 6; i++) {
            const h = 15 + (Math.sin(i) * 5); const x = 121.4700 + (i * 0.0018);
            features.push({ type: 'Feature', properties: { height: h, color: '#1A212D' }, geometry: { type: 'Polygon', coordinates: [[[x, 31.2285], [x + 0.0012, 31.2285], [x + 0.0012, 31.2275], [x, 31.2275], [x, 31.2285]]] } });
        }
        createCylinder(121.4765, 31.2290, 0.0004, 25, '#28364A'); createCylinder(121.4775, 31.2290, 0.0004, 25, '#28364A');
        createCylinder(121.4765, 31.2280, 0.0004, 25, '#28364A'); createCylinder(121.4775, 31.2280, 0.0004, 25, '#28364A');

        for (let j = 0; j < 4; j++) {
            const y = 31.2340 + (j * 0.0008);
            features.push({ type: 'Feature', properties: { height: 8, color: '#131e2b' }, geometry: { type: 'Polygon', coordinates: [[[121.4720, y], [121.4760, y], [121.4760, y + 0.0005], [121.4720, y + 0.0005], [121.4720, y]]] } });
        }
        return { type: 'FeatureCollection', features };
    };

    map.addSource('factory-buildings', { type: 'geojson', data: buildFactoryGeojson() });
    map.addSource('site-background', {
        type: 'image',
        url: 'safety-dashboard/assets/site-map.png',
        coordinates: SITE_IMAGE_COORDS
    });
    map.addSource('business-layers', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('patrol-paths', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    const size = 60;
    const pulsingDot = {
        width: size, height: size, data: new Uint8Array(size * size * 4),
        onAdd: function () { const cv = document.createElement('canvas'); cv.width = this.width; cv.height = this.height; this.ctx = cv.getContext('2d'); },
        render: function () {
            const dur = 2000; const t = (performance.now() % dur) / dur;
            const r = (size / 2) * 0.2; const outR = (size / 2) * 0.6 * t + r; const ctx = this.ctx;
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.beginPath(); ctx.arc(this.width / 2, this.height / 2, outR, 0, Math.PI * 2); ctx.fillStyle = `rgba(239, 68, 68, ${0.6 - t * 0.6})`; ctx.fill();
            ctx.beginPath(); ctx.arc(this.width / 2, this.height / 2, r, 0, Math.PI * 2); ctx.fillStyle = '#EF4444'; ctx.fill();
            this.data = ctx.getImageData(0, 0, this.width, this.height).data; map.triggerRepaint(); return true;
        }
    };
    map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });

    // Custom CAR icon logic
    const carSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#C5A87B" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H6a2 2 0 0 0-2 2.2l.4 4.2-.8.6V16h3M4 16h5m10 0a2 2 0 1 0-4 0 2 2 0 0 0 4 0zm-10 0a2 2 0 1 0-4 0 2 2 0 0 0 4 0z"/></svg>`;
    const carImg = new Image();
    carImg.onload = () => {
        if (!map.hasImage('car-icon')) {
            map.addImage('car-icon', carImg);
        }
        // Ensure robot symbols appear on first screen after icon is ready.
        renderAll();
    };
    carImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(carSvg);

    map.addSource('alerts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    // Layers Extrusion n Paths
    map.addLayer({ 'id': 'site-background-layer', 'type': 'raster', 'source': 'site-background', 'paint': { 'raster-opacity': 1 } });
    map.addLayer({ 'id': 'factory-ground', 'type': 'fill', 'source': 'factory-buildings', 'paint': { 'fill-color': '#000000', 'fill-opacity': 0 } });
    map.addLayer({ 'id': 'factory-3d-buildings', 'source': 'factory-buildings', 'type': 'fill-extrusion', 'paint': { 'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0 } });
    map.addLayer({ 'id': 'route-backbone', 'type': 'line', 'source': 'patrol-paths', 'filter': ['==', 'type', 'backbone'], 'paint': { 'line-color': '#3b4b5e', 'line-width': 1, 'line-opacity': 0.5 } });
    map.addLayer({ 'id': 'route-plan-all', 'type': 'line', 'source': 'patrol-paths', 'filter': ['==', 'type', 'plan-all'], 'paint': { 'line-color': '#8CA0B9', 'line-width': 1.6, 'line-dasharray': [1, 2.2], 'line-opacity': 0.45 } });
    map.addLayer({ 'id': 'route-active', 'type': 'line', 'source': 'patrol-paths', 'filter': ['==', 'type', 'active'], 'paint': { 'line-color': '#C5A87B', 'line-width': 3.2, 'line-opacity': 0.9 } });
    map.addLayer({ 'id': 'route-future', 'type': 'line', 'source': 'patrol-paths', 'filter': ['==', 'type', 'future'], 'paint': { 'line-color': '#C5A87B', 'line-width': 2.4, 'line-dasharray': [1, 2.4], 'line-opacity': 0.7 } });
    map.addLayer({ 'id': 'route-target', 'type': 'line', 'source': 'patrol-paths', 'filter': ['==', 'type', 'target-line'], 'paint': { 'line-color': '#C5A87B', 'line-width': 2, 'line-dasharray': [2, 4], 'line-opacity': 0.6 } });

    // Nodes - larger click targets
    map.addLayer({
        'id': 'pts-target',
        'type': 'circle',
        'source': 'business-layers',
        'filter': ['==', 'type', 'target'],
        'paint': {
            'circle-color': ['match', ['get', 'status'], 'warn', '#EF4444', 'danger', '#EF4444', 'pending', '#3B82F6', 'running', '#10B981', 'completed', '#10B981', '#C5A87B'],
            'circle-radius': 8,
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95
        }
    });
    map.addLayer({
        'id': 'pts-target-hit',
        'type': 'circle',
        'source': 'business-layers',
        'filter': ['==', 'type', 'target'],
        'paint': {
            'circle-radius': 18,
            'circle-color': '#000000',
            'circle-opacity': 0.001
        }
    });
    map.addLayer({
        'id': 'pts-ap',
        'type': 'circle',
        'source': 'business-layers',
        'filter': ['==', 'type', 'ap'],
        'paint': {
            'circle-color': ['match', ['get', 'status'], 'danger', '#EF4444', 'warn', '#EF4444', '#10B981'],
            'circle-radius': 8,
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95
        }
    });
    map.addLayer({
        'id': 'pts-ap-hit',
        'type': 'circle',
        'source': 'business-layers',
        'filter': ['==', 'type', 'ap'],
        'paint': {
            'circle-radius': 18,
            'circle-color': '#000000',
            'circle-opacity': 0.001
        }
    });
    map.addLayer({ 'id': 'pts-dock', 'type': 'circle', 'source': 'business-layers', 'filter': ['==', 'type', 'dock'], 'paint': { 'circle-color': ['match', ['get', 'status'], 'charging', '#C5A87B', '#6B8EAD'], 'circle-radius': 9, 'circle-opacity': 0.92, 'circle-stroke-width': 3, 'circle-stroke-color': '#05080E' } });
    map.addLayer({
        'id': 'pts-robot-hit',
        'type': 'circle',
        'source': 'business-layers',
        'filter': ['==', 'type', 'robot'],
        'paint': {
            'circle-radius': 18,
            'circle-color': '#000000',
            'circle-opacity': 0.001
        }
    });
    map.addLayer({ 'id': 'pts-robot', 'type': 'symbol', 'source': 'business-layers', 'filter': ['==', 'type', 'robot'], 'layout': { 'icon-image': 'car-icon', 'icon-size': ['case', ['==', ['get', 'id'], state.currentRobotId], 1.5, 1.0], 'icon-allow-overlap': true } });
    map.addLayer({
        'id': 'pts-target-label',
        'type': 'symbol',
        'source': 'business-layers',
        'filter': ['==', 'type', 'target'],
        'layout': {
            'text-field': ['get', 'labelText'],
            'text-size': 10.5,
            'text-offset': [0, 1.35],
            'text-anchor': 'top',
            'text-allow-overlap': true
        },
        'paint': {
            'text-color': '#E2E8F0',
            'text-halo-color': 'rgba(5,8,14,0.95)',
            'text-halo-width': 1.25
        }
    });
    map.addLayer({
        'id': 'pts-robot-label',
        'type': 'symbol',
        'source': 'business-layers',
        'filter': ['==', 'type', 'robot'],
        'layout': {
            'text-field': ['get', 'labelText'],
            'text-size': 11,
            'text-offset': [0, 1.4],
            'text-anchor': 'top',
            'text-allow-overlap': true
        },
        'paint': {
            'text-color': ['match', ['get', 'bizStatus'], 'charging', '#60A5FA', 'returning', '#F59E0B', 'executing', '#10B981', '#E2E8F0'],
            'text-halo-color': 'rgba(5,8,14,0.95)',
            'text-halo-width': 1.2
        }
    });
    map.addLayer({
        'id': 'pts-dock-label',
        'type': 'symbol',
        'source': 'business-layers',
        'filter': ['==', 'type', 'dock'],
        'layout': {
            'text-field': ['get', 'labelText'],
            'text-size': 11,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-allow-overlap': true
        },
        'paint': {
            'text-color': '#93C5FD',
            'text-halo-color': 'rgba(5,8,14,0.95)',
            'text-halo-width': 1
        }
    });
    map.addLayer({
        'id': 'pts-ap-label',
        'type': 'symbol',
        'source': 'business-layers',
        'filter': ['==', 'type', 'ap'],
        'layout': {
            'text-field': ['get', 'labelText'],
            'text-size': 10.5,
            'text-offset': [0, 1.35],
            'text-anchor': 'top',
            'text-allow-overlap': true
        },
        'paint': {
            'text-color': '#E2E8F0',
            'text-halo-color': 'rgba(5,8,14,0.95)',
            'text-halo-width': 1.2
        }
    });
    map.addLayer({ 'id': 'layer-with-pulsing-dot', 'type': 'symbol', 'source': 'alerts', 'layout': { 'icon-image': 'pulsing-dot', 'icon-allow-overlap': true } });


    // Events - with debug logging
    let lastLayerClickAt = 0;
    let suppressMapClickUntil = 0;
    const shouldIgnoreMapClick = () => Date.now() < suppressMapClickUntil;

    // Keep middle map draggable with left mouse button.
    map.dragPan.enable();
    map.on('dragstart', () => {
        suppressMapClickUntil = Date.now() + 240;
        map.getCanvas().style.cursor = 'grabbing';
    });
    map.on('dragend', () => {
        suppressMapClickUntil = Date.now() + 240;
        map.getCanvas().style.cursor = '';
    });
    map.on('mousedown', (e) => {
        if (e.originalEvent?.button === 0) {
            map.getCanvas().style.cursor = 'grabbing';
        }
    });
    map.on('mouseup', () => {
        map.getCanvas().style.cursor = '';
    });

    map.on('click', 'pts-robot-hit', (e) => {
        if (shouldIgnoreMapClick()) return;
        lastLayerClickAt = Date.now();
        e.preventDefault();
        const id = e.features[0].properties.id;
        console.log('[MAP] Robot clicked:', id);
        setFocus('robot', id, { instantPopup: true });
    });
    map.on('click', 'pts-dock', (e) => {
        if (shouldIgnoreMapClick()) return;
        lastLayerClickAt = Date.now();
        e.preventDefault();
        const id = e.features[0].properties.id;
        console.log('[MAP] Dock clicked:', id);
        setFocus('dock', id);
    });
    map.on('click', 'pts-target-hit', (e) => {
        if (shouldIgnoreMapClick()) return;
        lastLayerClickAt = Date.now();
        e.preventDefault();
        const pointId = e.features[0].properties.id;
        console.log('[MAP] Target clicked:', pointId, e.features[0].properties);
        if (pointId) {
            setFocus('inspectionPoint', pointId);
        } else {
            const coords = e.features[0].geometry.coordinates;
            setFocus('node', coords.join(','));
        }
    });
    map.on('click', 'pts-ap-hit', (e) => {
        if (shouldIgnoreMapClick()) return;
        lastLayerClickAt = Date.now();
        e.preventDefault();
        const apId = e.features[0].properties.id;
        if (apId) {
            showApPopup(apId);
        }
    });
    map.on('click', 'layer-with-pulsing-dot', (e) => {
        if (shouldIgnoreMapClick()) return;
        lastLayerClickAt = Date.now();
        e.preventDefault();
        console.log('[MAP] Alert clicked:', e.features[0].properties.id);
        if (!focusAlertPoint(e.features[0].properties.id)) {
            setFocus('all', 'global');
        }
    });
    // Fallback: query rendered features around click to avoid occasional layer event misses.
    map.on('click', (e) => {
        if (shouldIgnoreMapClick()) return;
        if (Date.now() - lastLayerClickAt < 80) return;
        const feats = map.queryRenderedFeatures(e.point, {
            layers: ['pts-target-hit', 'pts-target', 'pts-ap-hit', 'pts-ap', 'pts-robot-hit', 'pts-dock', 'layer-with-pulsing-dot']
        });
        if (!feats?.length) {
            const nearestPointId = getNearestInspectionPointId([e.lngLat.lng, e.lngLat.lat]);
            if (nearestPointId && state.mapUi.points) {
                const allPoints = getAllInspectionPoints();
                const targetPoint = allPoints.find((p) => p.id === nearestPointId);
                const area = getPointAreaKey(targetPoint);
                if (!state.mapUi.pointAreas?.[area]) return;
                setFocus('inspectionPoint', nearestPointId);
            }
            return;
        }
        const f = feats[0];
        const p = f.properties || {};
        if (p.type === 'robot' && p.id) {
            setFocus('robot', p.id, { instantPopup: true });
            return;
        }
        if (p.type === 'dock' && p.id) {
            setFocus('dock', p.id);
            return;
        }
        if (p.type === 'target' && p.id) {
            setFocus('inspectionPoint', p.id);
            return;
        }
        if (p.type === 'ap' && p.id) {
            showApPopup(p.id);
            return;
        }
        if (p.id) {
            focusAlertPoint(p.id);
        }
    });

    map.on('mouseenter', 'pts-robot-hit', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'pts-robot-hit', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'pts-robot', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'pts-robot', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'pts-dock', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'pts-dock', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'pts-target-hit', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'pts-target-hit', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'pts-ap-hit', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'pts-ap-hit', () => { map.getCanvas().style.cursor = ''; });

    // Zoom UI
    const zoomBtn = document.getElementById('btn-zoom-evi');
    if (zoomBtn) {
        zoomBtn.onclick = () => {
            const mock = document.getElementById('evidence-mock');
            const img = mock?.style.backgroundImage?.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
            const titleMeta = document.getElementById('evi-robot')?.innerText || '';
            const device = document.getElementById('evi-device')?.innerText || '巡检影像';
            openEvidenceModal({
                image: img,
                title: `${device} | ${titleMeta}`,
                device,
                meta: titleMeta,
                thumbs: img ? [{ img, label: '主视角' }] : []
            });
        };
    }

    applyMapUiVisibility();
    document.getElementById('main-evi-frame') && (document.getElementById('main-evi-frame').onclick = () => {
        const mock = document.getElementById('evidence-mock');
        const img = mock?.style.backgroundImage?.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
        const titleMeta = document.getElementById('evi-robot')?.innerText || '';
        const device = document.getElementById('evi-device')?.innerText || '巡检影像';
        openEvidenceModal({
            image: img,
            title: `${device} | ${titleMeta}`,
            device,
            meta: titleMeta,
            thumbs: img ? [{ img, label: '主视角' }] : []
        });
    });

    // Initial render
    renderAll();
    // Stabilize first-screen data painting (lines/points/icons) after style settles.
    map.once('idle', () => renderAll());
    setTimeout(() => renderAll(), 300);
});

setInterval(() => {
    const now = new Date();
    document.getElementById('clock').innerText = now.toTimeString().split(' ')[0];
}, 1000);
