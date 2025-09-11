@echo off
echo ===============================================
echo   DEPLOYING CASH ALLOCATION FIRESTORE INDEXES
echo ===============================================
echo.

echo 🔥 Checking Firebase CLI installation...
firebase --version || (
    echo ❌ Firebase CLI not found!
    echo Please install: npm install -g firebase-tools
    pause
    exit /b 1
)

echo.
echo 📊 Deploying Firestore indexes for cash_allocations...
echo This will create the following indexes:
echo.
echo 1. allocatedTo + createdAt (DESC)    - For PM queries
echo 2. allocatedBy + createdAt (DESC)    - For Accountant queries  
echo 3. allocatedTo + status + updatedAt (DESC) - For filtered PM queries
echo 4. allocatedTo + status + createdAt (DESC) - For filtered PM queries with creation order
echo.

set /p "continue=Continue with deployment? (y/n): "
if /i not "%continue%"=="y" (
    echo Deployment cancelled.
    pause
    exit /b 0
)

echo.
echo 🚀 Starting deployment...
firebase deploy --only firestore:indexes

if %errorlevel% equ 0 (
    echo.
    echo ✅ SUCCESS! Firestore indexes deployed successfully!
    echo.
    echo 📝 IMPORTANT NOTES:
    echo - Index creation may take 5-15 minutes
    echo - You can monitor progress in Firebase Console
    echo - Queries will work automatically once indexes are ready
    echo.
    echo 🔗 Monitor index creation:
    echo https://console.firebase.google.com/project/equitysys-41320/firestore/indexes
    echo.
) else (
    echo.
    echo ❌ ERROR: Index deployment failed!
    echo Please check your Firebase authentication and project settings.
    echo.
)

pause



