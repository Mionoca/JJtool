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
const clipboardTypes = readFileSync("src/types/clipboard.ts", "utf8");
const clipboardItem = readFileSync("src/components/clipboard/ClipboardItem.tsx", "utf8");

test("pet context menu uses complete clear Chinese labels and scrollable layout", () => {
  for (const label of [
    "添加学习计划",
    "添加提醒事项",
    "添加便签",
    "查看剪贴板历史",
    "查看今日计划",
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
