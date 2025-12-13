@echo off
setlocal EnableDelayedExpansion

REM Load variables from .env
FOR /F "tokens=1,2 delims==" %%a IN (.env) DO (
    IF "%%a"=="DB_USER" set DB_USER=%%b
    IF "%%a"=="DB_PASSWORD" set DB_PASSWORD=%%b
)

REM Create backup folder
set BACKUP_DIR=mongo_backups
if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

REM Generate timestamp
for /f "tokens=1-5 delims=/: " %%d in ("%date% %time%") do (
  set TIMESTAMP=%%d-%%e-%%f_%%g-%%h
)

set FILE_NAME=backup_%TIMESTAMP%.gz

REM Build URI
set URI=mongodb+srv://%DB_USER%:%DB_PASSWORD%@cluster0.nfwacai.mongodb.net/?retryWrites=true&w=majority

echo Creating MongoDB backup...
echo Output file: %BACKUP_DIR%\%FILE_NAME%

mongodump --uri="%URI%" --gzip --archive="%BACKUP_DIR%\%FILE_NAME%"

echo Backup completed!
pause
