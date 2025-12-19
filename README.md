# OLAM 数据分析（桌面端）

本仓库为 OLAM 数据分析系统的桌面端（Tauri + Vue3 + Vite）。桌面端通过 HTTP 调用 `olam_api_server` 提供的数据接口，并将结果以图表/表格形式展示。

## 功能概览

- 数据查询与导出（依赖 API 服务）
- 网格分析、时间轴（日视图）等分析页面（依赖 API 服务）
- AI 对话辅助（可选，依赖 API 的 `/api/ai/chat`）

## 运行环境

- Node.js（建议 18+）
- Rust（建议 stable，项目 `src-tauri/Cargo.toml` 声明 `rust-version = 1.77.2`）
- Tauri 2 环境依赖（Windows 需安装 VS Build Tools / MSVC 工具链、WebView2 运行时等）

## 本地开发

1. 启动后端 API（默认 `http://127.0.0.1:5000`）：参见 `../olam_api_server`
2. 安装依赖：`npm ci`
3. 运行桌面端（Tauri Dev）：`npm run tauri:dev`

只调试前端页面可用：`npm run dev`（启动 `http://localhost:5173`）。

## 构建发布

- `npm ci`
- `npm run tauri:build`

构建产物通常位于 `src-tauri/target/release/bundle/`（具体以 Tauri 输出为准）。

## 配置

### API 地址

当前前端请求地址写在 `src/api/index.ts`：

- `baseURL: 'http://127.0.0.1:5000/api'`

如需连接远程或不同端口的 API，请修改该地址后重新构建。

## 目录结构（简要）

- `src/`：前端页面与组件
- `src/api/`：HTTP 接口封装（Axios）
- `src-tauri/`：Tauri（Rust）端与打包配置

## 常见问题

- API 无法访问：确认 `olam_api_server` 已启动且端口/地址与 `src/api/index.ts` 一致
- 请求跨域：桌面端一般不受浏览器限制；Web 开发模式（`npm run dev`）依赖 API 的 CORS 配置
