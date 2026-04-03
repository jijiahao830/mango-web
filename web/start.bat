@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "app_config.json" (
  echo 未找到 app_config.json，请先按仓库 README.md 创建并填写数据库配置。
  exit /b 1
)

echo 安装依赖 requirements-member-api.txt …
python -m pip install -q -r requirements-member-api.txt

echo.
echo 启动后请在浏览器打开（端口以 app_config.json 中 api_port 为准）:
echo   http://127.0.0.1:8765/login.html
echo 按 Ctrl+C 停止
echo.

python member_api.py
pause
