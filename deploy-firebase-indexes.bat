@echo off
echo ========================================
echo Firebase Indexes Deployment Script
echo ========================================
echo.

echo Checking Firebase CLI...
npx firebase-tools --version
if %errorlevel% neq 0 (
    echo Error: Firebase CLI not found. Installing...
    npm install -g firebase-tools
)

echo.
echo ========================================
echo Step 1: Login to Firebase
echo ========================================
echo Please complete the login process in your browser...
npx firebase-tools login

echo.
echo ========================================
echo Step 2: Set Project
echo ========================================
npx firebase-tools use equitysys-41320

echo.
echo ========================================
echo Step 3: Deploy Indexes
echo ========================================
echo Deploying Firestore indexes...
npx firebase-tools deploy --only firestore:indexes

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Your Firebase indexes have been deployed.
echo The application should work properly now.
echo.
echo If you see any errors, please:
echo 1. Wait 5-10 minutes for indexes to build
echo 2. Refresh your application
echo 3. Check Firebase Console for index status
echo.
pause 