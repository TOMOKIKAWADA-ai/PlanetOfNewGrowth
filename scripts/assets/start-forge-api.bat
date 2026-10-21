@echo off
rem Start Stable Diffusion WebUI Forge headless with the HTTP API on port 7865.
rem webui-user.bat is left untouched; arguments are passed through COMMANDLINE_ARGS here.
call "D:\AI\webui_forge_cu121_torch231\environment.bat"
pushd "D:\AI\webui_forge_cu121_torch231\webui"
set COMMANDLINE_ARGS=--api --nowebui --port 7865 --skip-version-check
call "D:\AI\webui_forge_cu121_torch231\webui\webui.bat"
