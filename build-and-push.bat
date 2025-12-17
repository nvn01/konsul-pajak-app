@echo off
REM Build and Push Docker Images for Konsul Pajak Applications
REM Run this script from the 03_Source_Code directory

echo ========================================
echo Building Konsul Pajak Docker Images
echo ========================================
echo.

REM Build Landing Page
echo [1/4] Building landing page image...
cd landing-page
docker build -t novn01/konsul-pajak-landing:latest .
if %errorlevel% neq 0 (
    echo ERROR: Landing page build failed!
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/4] Building chat application image...
cd konsul-pajak-App
docker build -t novn01/konsul-pajak-chat:latest .
if %errorlevel% neq 0 (
    echo ERROR: Chat app build failed!
    exit /b %errorlevel%
)
cd ..

echo.
echo ========================================
echo Pushing Images to Docker Hub
echo ========================================
echo.

echo [3/4] Pushing landing page image...
docker push novn01/konsul-pajak-landing:latest
if %errorlevel% neq 0 (
    echo ERROR: Landing page push failed!
    exit /b %errorlevel%
)

echo.
echo [4/4] Pushing chat application image...
docker push novn01/konsul-pajak-chat:latest
if %errorlevel% neq 0 (
    echo ERROR: Chat app push failed!
    exit /b %errorlevel%
)

echo.
echo ========================================
echo SUCCESS! All images built and pushed
echo ========================================
echo.
echo Next steps:
echo 1. Upload docker-compose.yml to server: scp docker-compose.yml root@ubserver1:/docker/konsul-pajak/
echo 2. SSH to server: ssh root@ubserver1
echo 3. Deploy: cd /docker/konsul-pajak ^&^& docker compose pull ^&^& docker compose up -d
echo.
