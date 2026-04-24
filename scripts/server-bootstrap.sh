#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_NAME="lvyouyuan-api"
API_HEALTH_URL="http://127.0.0.1:8507/api/health"

echo "==> 进入项目目录: ${ROOT_DIR}"
cd "${ROOT_DIR}"

if ! command -v node >/dev/null 2>&1; then
  echo "未检测到 Node.js，请先安装 Node.js 20+。"
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" -lt 20 ]; then
  echo "当前 Node.js 版本过低: $(node -v)"
  echo "请先升级到 Node.js 20 或 22，再执行此脚本。"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "未检测到 npm，请先安装 npm。"
  exit 1
fi

echo "==> 安装/校验项目依赖"
npm run setup

echo "==> 初始化数据库"
npm --prefix server run setup-db

echo "==> 构建官网与后台"
npm run build

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> 安装 PM2"
  npm install -g pm2
fi

echo "==> 启动或重启后端 API"
pm2 startOrRestart ecosystem.config.cjs --only "${API_NAME}"
pm2 save

if command -v systemctl >/dev/null 2>&1; then
  pm2 startup systemd -u "$(whoami)" --hp "${HOME}" >/dev/null 2>&1 || true
fi

echo "==> 健康检查"
if curl -fsS "${API_HEALTH_URL}" >/dev/null; then
  echo "启动成功: ${API_HEALTH_URL}"
else
  echo "API 进程已拉起，但健康检查暂时未通过，请执行: pm2 logs ${API_NAME}"
  exit 1
fi

echo "==> 完成"
echo "以后在服务器上只需要执行:"
echo "npm run server:bootstrap"
