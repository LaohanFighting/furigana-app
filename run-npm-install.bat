@echo off
chcp 65001 >nul
echo 正在查找 Node.js / npm ...

set "NPM="
if exist "C:\Program Files\nodejs\npm.cmd" set "NPM=C:\Program Files\nodejs\npm.cmd"
if exist "%LOCALAPPDATA%\Programs\node\npm.cmd" set "NPM=%LOCALAPPDATA%\Programs\node\npm.cmd"
if exist "%APPDATA%\nvm\*\npm.cmd" (
  for /d %%i in ("%APPDATA%\nvm\*") do set "NPM=%%i\npm.cmd"
)

if defined NPM (
  echo 找到 npm: %NPM%
  echo.
  cd /d "%~dp0"
  call "%NPM%" install
  if errorlevel 1 ( echo 安装失败。 ) else ( echo 依赖安装完成。 )
  pause
  exit /b
)

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo 未检测到 Node.js。请先安装：
  echo   1. 打开 https://nodejs.org/
  echo   2. 下载并安装 LTS 版本
  echo   3. 安装时勾选 "Add to PATH"
  echo   4. 安装完成后关闭并重新打开终端，再运行本脚本或执行: npm install
) else (
  echo 找到 node，尝试用 npx 运行 npm...
  cd /d "%~dp0"
  node -e "const c=require('child_process'); c.spawn('npm', ['install'], {stdio:'inherit', shell:true});"
)
echo.
pause
