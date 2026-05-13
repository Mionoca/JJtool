import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync("src/components/pet/PetWindow.tsx", "utf8");
const tauriConfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
const mainWindow = tauriConfig.app.windows.find((window) => window.label === "main");
const petMenuWindow = tauriConfig.app.windows.find((window) => window.label === "pet-menu");
const newsWindow = tauriConfig.app.windows.find((window) => window.label === "news");
const studyWindow = tauriConfig.app.windows.find((window) => window.label === "study");
const appSource = readFileSync("src/App.tsx", "utf8");
const menuSource = readFileSync("src/components/pet/PetMenu.tsx", "utf8");
const contextMenuSource = readFileSync("src/components/pet/PetContextMenu.tsx", "utf8");

test("pet window does not start in cursor-event passthrough mode", () => {
  assert.equal(
    source.includes("setClickThrough(true)"),
    false,
    "Starting the pet with cursor events ignored makes the whole window unable to receive click or drag events."
  );
});

test("pet character keeps direct mouse handlers for click, drag, and context menu", () => {
  assert.match(source, /onMouseDown=\{handleMouseDown\}/);
  assert.match(source, /onClick=\{handleClick\}/);
  assert.match(source, /onContextMenu=\{handleContextMenu\}/);
});

test("pet window disables the native frameless shadow", () => {
  assert.equal(
    mainWindow.shadow,
    false,
    "The pet should not show a native rectangular shadow/border around the transparent window."
  );
});

test("pet window does not use native startDragging", () => {
  assert.equal(
    source.includes(".startDragging("),
    false,
    "Manual drag positioning avoids native frameless-window snap/misplacement when clicking near the top edge."
  );
});

test("pet window does not force-reset from screen origin on startup", () => {
  assert.equal(
    source.includes("setPosition(new PhysicalPosition(1200, 600))"),
    false,
    "The user must be able to place the pet at the top-left area without startup code forcing another position."
  );
});

test("context menu uses a dedicated always-on-top window so it cannot be clipped by the pet window", () => {
  assert.ok(petMenuWindow, "tauri.conf.json must define a dedicated pet-menu window");
  assert.equal(petMenuWindow.visible, false);
  assert.equal(petMenuWindow.transparent, true);
  assert.equal(petMenuWindow.decorations, false);
  assert.equal(petMenuWindow.alwaysOnTop, true);
  assert.equal(petMenuWindow.shadow, false);
  assert.match(appSource, /case "pet-menu":/);
  assert.match(source, /getByLabel\("pet-menu"\)/);
  assert.match(source, /setPosition\(new PhysicalPosition\(e\.screenX, e\.screenY\)\)/);
  assert.match(contextMenuSource, /pet-context-menu/);
  assert.match(contextMenuSource, /position:\s*"fixed"/);
  assert.match(contextMenuSource, /zIndex:\s*999999/);
  assert.match(contextMenuSource, /maxHeight:\s*"calc\(100vh - 32px\)"/);
  assert.equal(
    source.includes("translate-x-full"),
    false,
    "A menu rendered outside the 160px pet window is clipped and cannot be used."
  );
  assert.equal(
    source.includes("<PetMenu"),
    false,
    "The active menu must not be rendered inside the pet webview."
  );
});

test("large pet panels use dedicated windows instead of the 160x200 pet window", () => {
  assert.equal(newsWindow.visible, false);
  assert.equal(studyWindow.visible, false);
  assert.ok(newsWindow.width >= 340);
  assert.ok(newsWindow.height >= 520);
  assert.ok(studyWindow.width >= 340);
  assert.ok(studyWindow.height >= 520);
  assert.match(appSource, /case "news":/);
  assert.match(appSource, /case "study":/);
  assert.match(menuSource, /windowLabel: "news"/);
  assert.match(menuSource, /windowLabel: "study"/);
  assert.match(menuSource, /openWindow\(item\.windowLabel/);
  assert.equal(source.includes("<NewsPanel />"), false);
  assert.equal(source.includes("<StudyPanel />"), false);
  assert.equal(source.includes("PANEL_WINDOW_SIZE"), false);
});

test("pet context menu merges duplicate actions into clear entries", () => {
  for (const label of [
    "添加计划 / 提醒",
    "查看计划与提醒",
    "添加便签",
    "打开便签栏",
    "查看剪贴板历史",
    "刷新资讯",
    "设置兴趣关键词",
    "打开设置",
    "退出程序",
  ]) {
    assert.match(menuSource, new RegExp(label));
  }

  for (const duplicate of ["添加学习计划", "添加提醒事项", "查看今日计划"]) {
    assert.equal(menuSource.includes(duplicate), false);
  }
});
