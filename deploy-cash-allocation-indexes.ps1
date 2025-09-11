# PowerShell script to deploy Firestore indexes for cash_allocations
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   DEPLOYING CASH ALLOCATION FIRESTORE INDEXES" -ForegroundColor Cyan  
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check Firebase CLI installation
Write-Host "🔥 Checking Firebase CLI installation..." -ForegroundColor Yellow
try {
    $version = firebase --version
    Write-Host "✅ Firebase CLI found: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found!" -ForegroundColor Red
    Write-Host "Please install: npm install -g firebase-tools" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "📊 Deploying Firestore indexes for cash_allocations..." -ForegroundColor Yellow
Write-Host "This will create the following indexes:" -ForegroundColor White
Write-Host ""
Write-Host "1. allocatedTo + createdAt (DESC)    - For PM queries" -ForegroundColor Cyan
Write-Host "2. allocatedBy + createdAt (DESC)    - For Accountant queries" -ForegroundColor Cyan
Write-Host "3. allocatedTo + status + updatedAt (DESC) - For filtered PM queries" -ForegroundColor Cyan
Write-Host "4. allocatedTo + status + createdAt (DESC) - For filtered PM queries with creation order" -ForegroundColor Cyan
Write-Host ""

$continue = Read-Host "Continue with deployment? (y/n)"
if ($continue.ToLower() -ne "y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host ""
Write-Host "🚀 Starting deployment..." -ForegroundColor Green

# Deploy indexes
$process = Start-Process -FilePath "firebase" -ArgumentList "deploy", "--only", "firestore:indexes" -Wait -PassThru -NoNewWindow

if ($process.ExitCode -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCCESS! Firestore indexes deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 IMPORTANT NOTES:" -ForegroundColor Yellow
    Write-Host "- Index creation may take 5-15 minutes" -ForegroundColor White
    Write-Host "- You can monitor progress in Firebase Console" -ForegroundColor White  
    Write-Host "- Queries will work automatically once indexes are ready" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 Monitor index creation:" -ForegroundColor Cyan
    Write-Host "https://console.firebase.google.com/project/equitysys-41320/firestore/indexes" -ForegroundColor Blue
    Write-Host ""
    Write-Host "🎯 Test your allocation interfaces:" -ForegroundColor Cyan
    Write-Host "- PM Active Allocations: http://localhost:3000/dashboard/purchase-manager/active-allocations" -ForegroundColor Blue
    Write-Host "- PM Daily Allocation: http://localhost:3000/dashboard/purchase-manager/daily-allocation" -ForegroundColor Blue
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ ERROR: Index deployment failed!" -ForegroundColor Red
    Write-Host "Please check your Firebase authentication and project settings." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Run: firebase login" -ForegroundColor White
    Write-Host "2. Run: firebase use equitysys-41320" -ForegroundColor White
    Write-Host "3. Check your Firebase permissions" -ForegroundColor White
    Write-Host ""
}

Read-Host "Press Enter to exit"



