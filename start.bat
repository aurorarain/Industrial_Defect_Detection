@echo off
setlocal
cd /d "%~dp0"
echo Starting Industrial Defect Detection Demo...
call mvnw.cmd spring-boot:run

