import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync("src/components/pet/PetWindow.tsx", "utf8");
const tauriConfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
const mainWindow = tauriConfig.app.windows.find((window) => window.label === "main");
const newsWindow = tauriConfig.app.windows.find((window) => window.label === "news");
const studyWindow = tauriConfig.app.windows.find((window) => window.label === "study");
const appSource = readFileSync("src/App.tsx", "utf8");
const menuSource = readFileSync("src/components/pet/PetMenu.tsx", "utf8");

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

test("context menu is rendered inside a temporarily enlarged pet window", () => {
  assert.match(source, /MENU_WINDOW_SIZE/);
  assert.match(source, /setSize\(new PhysicalSize/);
  assert.equal(
    source.includes("translate-x-full"),
    false,
    "A menu rendered outside the 160px pet window is clipped and cannot be used."
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
  assert.match(menuSource, /toggleWindow\("news"\)/);
  assert.match(menuSource, /toggleWindow\("study"\)/);
  assert.equal(source.includes("<NewsPanel />"), false);
  assert.equal(source.includes("<StudyPanel />"), false);
  assert.equal(source.includes("PANEL_WINDOW_SIZE"), false);
});
