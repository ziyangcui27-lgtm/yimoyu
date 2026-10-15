# 熠墨雨 · Yimoyu

> 温柔倾听、教育陪伴的 AI 具身学伴 —— 让「AI 活起来」。

**熠墨雨** 是一个运行在网页端的数字人陪伴应用：一位温柔、耐心、懂教育的 AI 学习伙伴，通过语音和文字与用户自然交流，同时内置记忆、任务、闹钟、计算器、天气、网速等贴心小工具，把「陪伴」和「实用」融进日常学习生活。

- 技术栈：Vue 3 + Vite + @xmov/avatar（魔珐星云 XingyunAvatarAgent SDK）
- 运行方式：纯前端 SPA，支持本地开发与 Docker 容器化部署
- 开源协议：MIT License

---

## ✨ 核心功能

| 模块 | 说明 |
|---|---|
| 🗣️ 数字人对话 | 语音问答 + 文字问答，温柔具身形象实时互动 |
| 🧠 记忆 | 自动/手动记录用户信息，发送时携带上下文给 AI |
| 📋 任务 | 任务清单 + 步骤 + 起止日期，右侧任务面板管理 |
| ⏰ 闹钟 | 计时 + 到点语音提醒，环形进度展示 |
| 🧮 计算器 | 支持鼠标点按 + 电脑键盘操作 |
| 🌤️ 天气 / 网速 | 实时天气、空气质量、每秒网速监测 |
| 🌗 深色模式 | 浅色 / 深色主题一键切换 |

## 🛡️ 稳健性设计（减少「崩坏」）

- **自称兜底**：拦截模型自称「豆包 / AI 助手」，清洗掉自我介绍后继续念真实回答，问「你是谁」则念固定人设句
- **公式清洗**：把 LaTeX / `$$` 等转成口语或去除，避免平台 LaTeX 报错
- **空响应兜底**：模型无输出时，温和地请求用户重说一遍
- **密钥脱敏**：应用凭据经 `.env` 读取，`.env` 不入库

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（复制模板后填入真实凭据）
cp .env.example .env
#   在 .env 中填写 VITE_APP_ID / VITE_APP_SECRET

# 3. 启动开发环境
npm run dev
```

浏览器打开终端提示的本地地址即可使用。

### 环境变量

| 变量 | 说明 |
|---|---|
| `VITE_APP_ID` | 魔珐星云应用 ID |
| `VITE_APP_SECRET` | 魔珐星云应用密钥 |
| `VITE_GATEWAY` | 网关地址（有默认值，一般无需修改） |

## 🐳 Docker 部署

```bash
cp .env.example .env   # 先配好环境变量
docker compose up -d --build
```

生产镜像通过 `nginx` 静态托管构建产物，默认端口映射 `8080 -> 80`，访问 `http://localhost:8080`。

## 📁 目录结构

```
yimoyu/
├── src/
│   ├── App.vue            # 主应用（界面组装，逻辑按模块拆分）
│   ├── main.js            # 入口
│   └── composables/       # 可维护的功能模块（组合式函数）
│       ├── useAvatar.js   # 数字人 Agent + 对话兜底 + 公式展示
│       ├── useAlarm.js    # 闹钟 + 到点铃声/语音
│       ├── useMemory.js   # 记忆 + 上下文拼接
│       ├── useTasks.js    # 任务 + localStorage 持久化
│       ├── useCalc.js     # 计算器（鼠标 + 键盘）
│       ├── useWeather.js  # 天气 + 空气质量
│       ├── useSpeed.js    # 实时网速
│       ├── useClock.js    # 时钟
│       └── audio.js       # 共享音频上下文
├── public/                # 静态资源
├── .env.example           # 环境变量模板
├── .gitignore
├── Dockerfile             # 容器镜像
├── docker-compose.yml
├── README.md
└── LICENSE
```

## 📝 使用提示

- 页面底部「⟳」键：刷新页面、重连数字人（socket 瞬时掉线时使用）
- 顶部「切换深色」：浅色 / 深色主题切换
- 左侧手柄展开信息栏（时间 / 天气 / 网速 / 更多组件）
- 右侧手柄展开任务面板

## 致谢

- [魔珐星云](https://xingyun3d.com) XingyunAvatarAgent SDK
- Vue 3 · Vite 开源生态
