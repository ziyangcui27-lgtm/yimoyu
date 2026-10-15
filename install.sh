#!/bin/bash
# ============================================================
#  熠墨雨 · Yimoyu  远程一键安装（OpenClaw 风格）
#  用法：curl -sL https://raw.githubusercontent.com/ziyangcui27-lgtm/yimoyu/main/install.sh | bash
#  作用：下载项目 → 装依赖 → 引导配置密钥 → 启动 → 打开浏览器
# ============================================================
set -e

APP_DIR="yimoyu"
REPO="https://github.com/ziyangcui27-lgtm/yimoyu.git"

echo "=================================================="
echo "   熠墨雨 · Yimoyu  一键安装"
echo "=================================================="

# 1) 检查依赖
for cmd in git node npm; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ 缺少 $cmd。请先安装 ${cmd} 后再运行本命令。"
    exit 1
  fi
done

# 2) 下载 / 更新项目
if [ -d "$APP_DIR/.git" ]; then
  echo "⏳ 已存在 $APP_DIR，正在拉取最新…"
  cd "$APP_DIR" && git pull --ff-only || true
else
  echo "⏳ 正在从 GitHub 下载项目…"
  git clone "$REPO" "$APP_DIR" || { echo "❌ 下载失败，请检查网络。"; exit 1; }
  cd "$APP_DIR"
fi

# 3) 安装依赖（仅首次）
if [ ! -d node_modules ]; then
  echo "⏳ 正在安装依赖…"
  npm install || { echo "❌ 依赖安装失败，请检查网络。"; exit 1; }
fi

# 4) 引导配置 .env（仅首次）
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "⚠️ 首次使用需要配置密钥（魔珐星云）："
  echo "     VITE_APP_ID     = 应用 ID"
  echo "     VITE_APP_SECRET = 应用密钥"
  echo "   （VITE_GATEWAY 一般不用改）"
  echo ""
  if [ -n "$EDITOR" ]; then "$EDITOR" .env; else open -e .env 2>/dev/null || true; fi
  read -n1 -r -p "填好后回到这里，按任意键启动…"
  echo ""
fi

# 5) 启动 + 打开浏览器
echo "🚀 启动中…"
npm run dev &
DEV_PID=$!
sleep 3
open "http://localhost:5173" 2>/dev/null || xdg-open "http://localhost:5173" 2>/dev/null || true
echo ""
echo "✅ 已启动：http://localhost:5173"
echo "   （停止：关掉本终端窗口即可）"
wait "$DEV_PID"
