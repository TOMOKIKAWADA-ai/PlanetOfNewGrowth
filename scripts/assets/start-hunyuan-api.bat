@echo off
rem Hunyuan3D-2mini (turbo) API server for shape-only image-to-3D. Stop it by killing its python process when done.
call D:\AI\3D_local\Hunyuan3D-Environment.bat
cd /d D:\AI\3D_local\Hunyuan3D\Hunyuan3D-2
"%HY3D_APP%\python_standalone\python.exe" -s api_server.py --host 127.0.0.1 --port 8081 --model_path tencent/Hunyuan3D-2mini > D:\0001_App_Dev\search_survive\tmp\hunyuan-api.log 2>&1
