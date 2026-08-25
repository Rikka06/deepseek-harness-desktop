<div align="center">

<img src="build/icon.png" alt="DeepSeek Harness Desktop Logo" width="128" height="128" />

# DeepSeek Harness Desktop

**A Native Desktop Application & Embedded Browser Shell for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-0078d7.svg?logo=windows)](https://github.com/Rikka06/deepseek-harness-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-34.x-47848F.svg?logo=electron)](https://www.electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B%20%7C%2024%2B-339933.svg?logo=node.js)](https://nodejs.org/)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-Harness%20DSH-1d4ed8.svg)](https://github.com/deepseek-ai/deepseek-harness)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Rikka06/deepseek-harness-desktop/pulls)

[English](#english) | [简体中文](#简体中文)

</div>

---

## 简体中文

### 🌟 项目简介

**DeepSeek Harness Desktop** 是专为 DeepSeek 官方开源 Agent 框架 [DeepSeek Harness (`@deepseek-ai/dsh`)](https://github.com/deepseek-ai/deepseek-harness) 打造的桌面客户端套壳应用。

官方目前默认通过终端命令 `npx @deepseek-ai/dsh web` 启动并在外部系统浏览器中打开网页。本项目将其封装为**即开即用的桌面应用程序（`.exe`）**，内置独立 Chromium 渲染容器，无需每次输入终端指令，无需在繁杂的外部浏览器标签页中切换，带来沉浸式、原生的 AI Agent 桌面工作区体验。

### ✨ 核心特性

- 🚀 **一键双击即开**：点击 `.exe` 即可自动拉起后台 Harness Agent 服务与内嵌桌面窗口。
- 🖥️ **内嵌 Chromium 容器**：告别外部浏览器标签页混乱，享受原生的独立桌面应用体验。
- 🐋 **官方纯粹无边框鲸鱼 Logo**：提取官方正版高精度矢量鲸鱼图标，透明底色，质感科技蓝渐变。
- 🎨 **纯净沉浸式窗口**：彻底移除传统顶部菜单栏（无“文件/编辑/帮助”冗余行），全屏纯粹 Web UI。
- ⚡ **智能端口调度**：自动探测并绑定空闲端口（默认 3080，冲突时自动平滑递增）。
- 🔄 **后台静默检测更新**：启动 3 秒后在后台异步校验官方最新版本，有新版本自动友好提示。
- 🧹 **安全进程树回收**：关闭窗口时自动递归终止后台全部 Node / Cordis 进程，绝不残留僵尸进程。
- 📦 **免安装单文件便携版**：提供单文件 `DeepSeek-Harness-Portable.exe` 与解压绿色版，开箱即用。

---

### 🏗️ 架构设计

```text
┌────────────────────────────────────────────────────────┐
│             DeepSeek Harness 桌面应用 (.exe)           │
│                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │   内嵌 Chromium 容器    │  │   后台 Agent 服务   │  │
│  │     (Electron 窗口)     │  │   (@deepseek-ai/dsh)│  │
│  └───────────┬─────────────┘  └──────────┬──────────┘  │
│              │                           │             │
│              │   http://127.0.0.1:3080   │             │
│              └───────────────────────────┘             │
└────────────────────────────────────────────────────────┘
```

---

### 🚀 快速开始

#### 方式一：下载预编译版本（推荐）

1. 前往 [Releases](https://github.com/Rikka06/deepseek-harness-desktop/releases) 页面。
2. 下载最新的 `DeepSeek-Harness-Portable.exe`。
3. 双击即可运行！*(请确保系统已安装 Node.js v22 或 v24)*。

#### 方式二：从源码运行与构建

**前置要求**：
- [Node.js](https://nodejs.org/) (推荐 v22.13+ 或 v24+)
- [pnpm](https://pnpm.io/) (推荐) 或 `npm`

```bash
# 1. 克隆仓库
git clone https://github.com/Rikka06/deepseek-harness-desktop.git
cd deepseek-harness-desktop

# 2. 安装依赖
pnpm install

# 3. 本地开发调试启动
pnpm start

# 4. 构建单文件便携版 EXE
pnpm run build:exe

# 5. 构建解压即用绿色目录版
pnpm run build:dir
```

构建产物将输出在 `dist/` 目录下。

---

### ⌨️ 快捷键

| 快捷键 | 功能 |
| :--- | :--- |
| `F11` | 切换全屏模式 |
| `F12` | 打开 / 关闭 Chrome 开发者工具 |
| `Ctrl + R` / `F5` | 重新载入当前页面 |

---

## English

### 🌟 Introduction

**DeepSeek Harness Desktop** is a lightweight, high-performance desktop wrapper for the official DeepSeek AI Agent framework: [DeepSeek Harness (`@deepseek-ai/dsh`)](https://github.com/deepseek-ai/deepseek-harness).

Instead of running terminal commands and managing multiple browser tabs, DeepSeek Harness Desktop provides a seamless, standalone executable (`.exe`) with an embedded Chromium engine.

### ✨ Features

- 🚀 **One-Click Launch**: Instant startup without manual CLI commands.
- 🖥️ **Embedded Chromium Shell**: Dedicated desktop window without external browser tabs.
- 🐋 **Official Borderless Whale Logo**: Crisp, transparent-background DeepSeek whale branding.
- 🎨 **Minimalist & Clean UI**: Frameless / clean web-view layout without clunky top menu bars.
- ⚡ **Dynamic Port Allocation**: Automatically checks and allocates free ports (default: 3080).
- 🔄 **Silent Update Check**: Background asynchronous check for new `@deepseek-ai/dsh` versions.
- 🧹 **Graceful Process Management**: Recursively terminates the backend server and Cordis plugins on window exit.
- 📦 **Portable Executable**: Standalone single-file portable `.exe` distribution.

---

### 📦 Building from Source

```bash
# Clone the repository
git clone https://github.com/Rikka06/deepseek-harness-desktop.git
cd deepseek-harness-desktop

# Install dependencies
pnpm install

# Start in development mode
pnpm start

# Build portable executable
pnpm run build:exe
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

DeepSeek Harness is an open-source project by [DeepSeek AI](https://github.com/deepseek-ai).
