# JJtool - Windows AI 桌面助手

一款运行于 Windows 系统上的桌面 AI 助手应用，融合桌宠交互、剪贴板管理、智能提醒等功能。

## 功能特性

### 桌宠系统
- 二次元风格桌宠，常驻桌面
- 可拖拽移动，点击交互
- 多种状态表情（开心、普通、生气、困倦、工作中）
- 聊天气泡弹窗交互

### 剪贴板管理
- 自动记录剪贴板历史（文本、图片、文件路径、代码）
- 支持搜索、收藏、置顶、删除
- 3 天自动过期清理
- 快捷键 `Ctrl+Shift+V` 快速打开

### 智能提醒（开发中）
- 自然语言输入提醒
- 到时弹窗提醒

### 桌面便签（开发中）
- 侧边栏便签
- Markdown 支持
- 待办事项

## 系统要求

- Windows 10 / 11
- WebView2（Windows 11 自带，Windows 10 需要安装）

## 安装方式

### 从 Release 下载
1. 前往 [Releases](https://github.com/Mionoca/JJtool/releases) 页面
2. 下载最新版本的 `JJtool-x.x.x.msi` 或 `JJtool-Setup.exe`
3. 双击安装

### 从源码构建
```bash
# 前置要求：Node.js 18+、Rust (rustup)
git clone https://github.com/Mionoca/JJtool.git
cd JJtool
npm install
npm run tauri dev    # 开发模式
npm run tauri build  # 构建安装包
```

## 使用方法

1. 启动后，桌宠会出现在桌面右下角
2. 点击桌宠查看问候语
3. 右键桌宠打开功能菜单
4. 复制任何内容会自动记录到剪贴板历史
5. `Ctrl+Shift+V` 快速打开剪贴板面板
6. 最小化时会缩到系统托盘

## 技术栈

- **框架**: [Tauri v2](https://v2.tauri.app/) (Rust + WebView2)
- **前端**: React 18 + TypeScript + Tailwind CSS
- **数据库**: SQLite (本地存储)
- **状态管理**: Zustand
- **构建**: Vite

## 项目结构

```
JJtool/
├── src/                  # React 前端
│   ├── components/       # UI 组件
│   ├── stores/           # Zustand 状态管理
│   ├── hooks/            # React Hooks
│   ├── types/            # TypeScript 类型
│   └── styles/           # 样式文件
├── src-tauri/            # Rust 后端
│   ├── src/              # Rust 源码
│   │   ├── commands/     # Tauri 命令 (IPC)
│   │   ├── db/           # 数据库层
│   │   ├── models/       # 数据模型
│   │   └── services/     # 后台服务
│   └── tauri.conf.json   # Tauri 配置
└── .github/workflows/    # CI/CD
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

[MIT License](LICENSE)
