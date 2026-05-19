import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../safety-dashboard.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../safety-dashboard/app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../safety-dashboard/styles.css", import.meta.url), "utf8");

test("homepage uses operations, inspection, robot, risk, broadcast, facility, and environment sections", () => {
  [
    "总体运营概览",
    "巡检总览",
    "机器人总览",
    "安全风险",
    "信息播报",
    "设施设备概览",
    "环境检测",
    "充电站概览",
    "机器人与云台控制",
    "环境指标历史",
  ].forEach((label) => assert.match(html, new RegExp(label)));
});

test("homepage avoids unsupported value claims and direct handling wording", () => {
  ["替代人工", "减少高危进入", "预估减少损失", "省钱", "进入处置"].forEach((forbidden) => {
    assert.doesNotMatch(html, new RegExp(forbidden));
  });
});

test("risk categories use meeting-review vocabulary", () => {
  ["安全行为", "气体异常", "巡检点", "设施设备"].forEach((category) => {
    assert.match(`${html}\n${app}`, new RegExp(category));
  });

  ["safeBehavior", "gas", "infrared", "device"].forEach((category) => {
    assert.match(app, new RegExp(category));
  });
});

test("app keeps a single mock data source with required collections and risk fields", () => {
  ["taskHierarchy", "robots", "tasks", "alerts", "docks", "apDevices"].forEach((key) => {
    assert.match(app, new RegExp(`${key}:`));
  });

  ["id", "level", "time", "state", "device", "defect", "type", "bgImg", "coords"].forEach((key) => {
    assert.match(app, new RegExp(`${key}:`));
  });
});

test("dashboard stylesheet uses the reference command-center visual system", () => {
  [
    "--accent-titan",
    "--accent-smog",
    ".top-bar",
    ".map-toolbar",
    ".left-panel",
    ".right-panel",
    ".control-modal-content",
    ".bottom-timeline",
  ].forEach((token) => assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));
});

test("dashboard reuses inspection-dashboard static map asset", () => {
  assert.match(app, /safety-dashboard\/assets\/site-map\.png/);
});

test("map supports MapLibre layers, toolbar controls, and entity popups", () => {
  [
    "map-info-popup",
    "map-popup-body",
    "btn-display-control",
    "display-control-popover",
    "map-search-popover",
    "data-map-toggle-check=\"labels\"",
    "data-map-toggle-check=\"robots\"",
    "data-map-toggle-check=\"points\"",
    "data-map-point-area=\"A\"",
    "data-map-point-area=\"B\"",
    "data-map-point-area=\"C\"",
    "data-map-toggle-check=\"docks\"",
    "data-map-toggle-check=\"route\"",
  ].forEach((token) => assert.match(html, new RegExp(token)));

  [
    "map.addSource('site-background'",
    "map.addSource('business-layers'",
    "map.addSource('alerts'",
    "'id': 'pts-robot'",
    "'id': 'pts-target'",
    "'id': 'pts-dock'",
    "'id': 'pts-ap'",
    "'id': 'layer-with-pulsing-dot'",
    "showRobotPopup",
    "showInspectionPointPopup",
    "showDockPopup",
    "showApPopup",
    "closeMapPopup",
    "positionPopupAtFeature",
    "applyMapUiVisibility",
    "handleMapSearch",
  ].forEach((token) => assert.match(app, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));
});
