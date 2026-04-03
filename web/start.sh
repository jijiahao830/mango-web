#!/usr/bin/env bash
# 芒果 web：会员 API + 静态页面（member_api.py）
# 用法：
#   ./start.sh              显示菜单，输入数字操作
#   ./start.sh 1            直接执行对应项（1–4、0）
#   ALLOW_KILL_PORT=1 已合并到菜单「2」

set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if [[ ! -f "app_config.json" ]]; then
  echo "未找到 app_config.json，请先按仓库 README.md 创建并填写数据库配置。" >&2
  exit 1
fi

get_port() {
  python3 -c "
import json
with open('app_config.json', encoding='utf-8') as f:
    print(int(json.load(f).get('api_port') or 8765))
" 2>/dev/null || echo "8765"
}

install_deps() {
  echo "安装依赖（requirements-member-api.txt）…"
  python3 -m pip install -q -r requirements-member-api.txt
}

# 参数: fail | kill
ensure_port_free() {
  local mode="$1"
  local PORT
  PORT="$(get_port)"
  if ! command -v lsof >/dev/null 2>&1; then
    return 0
  fi
  local PIDS
  PIDS="$(lsof -ti ":${PORT}" 2>/dev/null || true)"
  if [[ -z "${PIDS}" ]]; then
    return 0
  fi
  if [[ "${mode}" == "kill" ]]; then
    echo "端口 ${PORT} 已被占用，正在结束相关进程…"
    kill ${PIDS} 2>/dev/null || true
    sleep 0.4
    PIDS="$(lsof -ti ":${PORT}" 2>/dev/null || true)"
    if [[ -n "${PIDS}" ]]; then
      echo "仍被占用，请手动: kill ${PIDS}" >&2
      exit 1
    fi
    return 0
  fi
  echo "错误：端口 ${PORT} 已被占用。" >&2
  echo "可选：菜单选「2」结束占用后启动，或执行 kill \$(lsof -ti :${PORT})" >&2
  exit 1
}

show_port_status() {
  local PORT
  PORT="$(get_port)"
  echo "当前配置端口: ${PORT}"
  if command -v lsof >/dev/null 2>&1; then
    if lsof -i ":${PORT}" 2>/dev/null; then
      :
    else
      echo "（该端口当前无进程监听）"
    fi
  else
    echo "（本机无 lsof，无法列出占用）"
  fi
  echo ""
}

# 参数: kill_first(0|1) open_browser(0|1)
run_server() {
  local kill_first="$1"
  local open_browser="$2"
  install_deps
  if [[ "${kill_first}" == "1" ]]; then
    ensure_port_free kill
  else
    ensure_port_free fail
  fi

  local PORT
  PORT="$(get_port)"
  echo ""
  echo "服务将监听: http://127.0.0.1:${PORT}"
  echo "首页:       http://127.0.0.1:${PORT}/index.html"
  echo "登录页:     http://127.0.0.1:${PORT}/login.html"
  echo "按 Ctrl+C 停止"
  echo ""

  if [[ "${open_browser}" == "1" ]] && command -v open >/dev/null 2>&1; then
    (sleep 1.2 && open "http://127.0.0.1:${PORT}/index.html") &
  fi

  exec python3 member_api.py
}

print_menu() {
  echo "========== 芒果 web =========="
  echo "请输入数字后回车："
  echo "  1) 启动服务"
  echo "  2) 结束占用端口后启动服务"
  echo "  3) 启动服务（不自动打开浏览器）"
  echo "  4) 查看当前端口占用情况"
  echo "  0) 退出"
  echo ""
}

# 非交互：./start.sh 1
if [[ -n "${1:-}" ]]; then
  case "$1" in
    1) run_server 0 1 ;;
    2) run_server 1 1 ;;
    3) run_server 0 0 ;;
    4) show_port_status ;;
    0) exit 0 ;;
    *)
      echo "用法: $0 [1|2|3|4|0]  或不带参数进入菜单" >&2
      exit 1
      ;;
  esac
  exit 0
fi

# 交互菜单
while true; do
  print_menu
  read -r choice || exit 0
  echo ""
  case "${choice}" in
    1) run_server 0 1 ;;
    2) run_server 1 1 ;;
    3) run_server 0 0 ;;
    4)
      show_port_status
      read -rp "按回车返回菜单…" _ || true
      echo ""
      ;;
    0)
      echo "已退出。"
      exit 0
      ;;
    *)
      echo "无效输入，请输入 0–4。"
      echo ""
      ;;
  esac
done
