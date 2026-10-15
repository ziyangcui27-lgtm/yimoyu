#!/bin/bash
# ============================================================
#  熠墨雨 · Yimoyu  一键启动脚本（macOS 双击即可运行）
#  功能：检查 Node → 装依赖 → 引导配置密钥 → 启动 → 打开浏览器
# ============================================================
cd "$(dirname "$0")"
echo "======================================"
echo "  熠墨雨 · Yimoyu  一键启动"
echo "======================================"

# 1) 检查 Node.js
if ! command -v node &>/dev/null; then
  echo "❌ 未检测到 Node.js。"
  echo "   请先到 https://nodejs.org 下载安装，然后重新运行本脚本。"
  read -n1 -r -p "按任意键退出…"
  exit 1
fi

# 2) 安装依赖（仅首次）
if [ ! -d node_modules ]; then
  echo "⏳ 首次运行，正在安装依赖…"
  npm install || { echo "❌ 依赖安装失败，请检查网络。"; read -n1 -r -p "按任意键退出…"; exit 1; }
fi

# 3) 配置 .env（仅首次）
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "⚠️ 首次使用需要配置密钥。"
  echo "   已为你创建 .env 并打开编辑器，请填写："
  echo "     VITE_APP_ID     = 魔珐星云 应用 ID"
  echo "     VITE_APP_SECRET = 魔珐星云 应用密钥"
  echo "   （VITE_GATEWAY 一般不用改）"
  echo ""
  open -e .env
  read -n1 -r -p "填好后回到这里按任意键继续…"
  echo ""
fi

# 4) 启动 + 打开浏览器
echo "🚀 正在启动…"
npm run dev &
DEV_PID=$!
sleep 3
open "http://localhost:5173"
echo ""
echo "✅ 已启动：http://localhost:5173"
echo "   （关闭方式：关掉这个终端窗口即可停止服务）"
wait $DEV_PID
