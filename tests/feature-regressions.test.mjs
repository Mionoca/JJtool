import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const petMenu = readFileSync("src/components/pet/PetMenu.tsx", "utf8");
const petWindow = readFileSync("src/components/pet/PetWindow.tsx", "utf8");
const studyPanel = readFileSync("src/components/study/StudyPanel.tsx", "utf8");
const studyTypes = readFileSync("src/types/study.ts", "utf8");
const studyModel = readFileSync("src-tauri/src/models/study.rs", "utf8");
const studyRepo = readFileSync("src-tauri/src/db/study_repo.rs", "utf8");
const clipboardMonitor = readFileSync("src-tauri/src/services/clipboard_monitor.rs", "utf8");
const clipboardCommand = readFileSync("src-tauri/src/commands/clipboard.rs", "utf8");
const clipboardTypes = readFileSync("src/types/clipboard.ts", "utf8");
const clipboardItem = readFileSync("src/components/clipboard/ClipboardItem.tsx", "utf8");
const libSource = readFileSync("src-tauri/src/lib.rs", "utf8");
const newsPanel = readFileSync("src/components/news/NewsPanel.tsx", "utf8");
const newsStore = readFileSync("src/stores/newsStore.ts", "utf8");
const newsFetcher = readFileSync("src-tauri/src/services/news_fetcher.rs", "utf8");
const tauriConfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));

test("pet context menu uses complete clear Chinese labels and scrollable layout", () => {
  for (const label of [
    "添加计划 / 提醒",
    "添加便签",
    "查看剪贴板历史",
    "查看计划与提醒",
    "打开便签栏",
    "刷新资讯",
    "设置兴趣关键词",
    "打开设置",
    "退出程序",
  ]) {
    assert.match(petMenu, new RegExp(label));
  }

  assert.match(petMenu, /max-h-\[.*\]/);
  assert.match(petMenu, /overflow-y-auto/);
  assert.match(petMenu, /min-w-\[240px\]/);
  assert.match(petMenu, /disabled=\{busyAction !== null\}/);
  assert.match(petWindow, /currentMonitor/);
  assert.match(petWindow, /clampWindowPosition/);
});

test("study tasks support reminder metadata and sync to reminders", () => {
  for (const field of [
    "notes",
    "reminder_at",
    "reminder_enabled",
    "is_recurring",
    "recurrence",
    "priority",
    "reminder_id",
  ]) {
    assert.match(studyTypes, new RegExp(field));
    assert.match(studyModel, new RegExp(field));
    assert.match(studyRepo, new RegExp(field));
  }

  assert.match(studyRepo, /insert_reminder/);
  assert.match(studyPanel, /提醒时间/);
  assert.match(studyPanel, /优先级/);
  assert.match(studyPanel, /备注/);
});

test("clipboard monitor and UI support text, image, file, and code records", () => {
  assert.match(clipboardMonitor, /read_clipboard_image/);
  assert.match(clipboardMonitor, /read_clipboard_files/);
  assert.match(clipboardMonitor, /content_type: "image"/);
  assert.match(clipboardMonitor, /content_type: "file"/);
  assert.match(clipboardMonitor, /detect_content_type/);
  assert.match(clipboardTypes, /preview/);
  assert.match(clipboardTypes, /mime_type/);
  assert.match(clipboardItem, /img/);
  assert.match(clipboardItem, /JSON\.parse/);
});

test("clipboard history restores image and file records as native clipboard data by default", () => {
  assert.match(libSource, /commands::clipboard::restore_clipboard_item/);
  assert.match(clipboardCommand, /restore_clipboard_item/);
  assert.match(clipboardCommand, /SetClipboardData/);
  assert.match(clipboardCommand, /CF_DIB/);
  assert.match(clipboardCommand, /CF_HDROP/);
  assert.match(clipboardCommand, /DROPFILES/);
  assert.match(clipboardItem, /invoke\("restore_clipboard_item"/);
  assert.doesNotMatch(clipboardItem, /writeText\(item\.content\)/);
});

test("news refresh uses saved keywords and surfaces loading and errors", () => {
  assert.match(newsFetcher, /fetch_news_by_keywords/);
  assert.match(newsFetcher, /news_keywords/);
  assert.match(newsFetcher, /category:\s*Some\(keyword/);
  assert.match(newsStore, /error:/);
  assert.match(newsStore, /set\(\{\s*loading:\s*true,\s*error:\s*null/);
  assert.match(newsStore, /await invoke/);
  assert.match(newsPanel, /资讯获取失败/);
  assert.match(newsPanel, /请先设置兴趣关键词/);
});

test("main feature windows are resizable and persist their size", () => {
  for (const label of ["clipboard", "sticky", "news", "study", "settings"]) {
    const windowConfig = tauriConfig.app.windows.find((window) => window.label === label);
    assert.ok(windowConfig, `${label} window must exist`);
    assert.equal(windowConfig.resizable, true, `${label} window must be resizable`);
    assert.ok(windowConfig.minWidth >= 300, `${label} window must have a useful minWidth`);
    assert.ok(windowConfig.minHeight >= 360, `${label} window must have a useful minHeight`);
  }
});
