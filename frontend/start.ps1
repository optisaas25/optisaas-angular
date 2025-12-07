# OptiSaas Startup Script

Write-Host "Starting OptiSaas Server..." -ForegroundColor Cyan
Write-Host ""

# Add Node.js to PATH for this session
$env:Path = $env:Path + ";C:\Program Files\nodejs\"

# Navigate to project folder
Set-Location "C:\Users\ASUS\.gemini\antigravity\playground\golden-cluster\frontend"

Write-Host "Folder: $PWD" -ForegroundColor Green
Write-Host ""

# Check Node.js access
$nodePath = "C:\Program Files\nodejs\node.exe"
$npmPath = "C:\Program Files\nodejs\npm.cmd"

if (Test-Path $nodePath) {
    $nodeVersion = & $nodePath --version
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
}
else {
    Write-Host "Error: Node.js (node.exe) not found in C:\Program Files\nodejs\" -ForegroundColor Red
    pause
    exit
}

if (Test-Path $npmPath) {
    Write-Host "npm found" -ForegroundColor Green
    Write-Host ""
    Write-Host "Server will start at http://localhost:4200/" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    
    # Start server
    & $npmPath start
}
else {
    Write-Host "Error: npm (npm.cmd) not found in C:\Program Files\nodejs\" -ForegroundColor Red
    pause
    exit
}
