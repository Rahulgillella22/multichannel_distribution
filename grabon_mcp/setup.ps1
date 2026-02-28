# =============================================================================
# GrabOn MCP Server - Auto Setup Script
# Run this once before using Claude Desktop
# Usage: Right-click → "Run with PowerShell"
# =============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GrabOn MCP Server - Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Find node.exe ---
Write-Host "[1/5] Locating node.exe..." -ForegroundColor Yellow
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
    Write-Host "ERROR: Node.js not found. Please install Node.js from https://nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "     Found: $nodePath" -ForegroundColor Green

# --- Step 2: Get absolute path to server.js ---
Write-Host "[2/5] Resolving server path..." -ForegroundColor Yellow
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPath = Join-Path $projectDir "src\mcp\server.js"
if (-not (Test-Path $serverPath)) {
    Write-Host "ERROR: src\mcp\server.js not found. Make sure you're running from the project root." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "     Found: $serverPath" -ForegroundColor Green

# --- Step 3: Install npm dependencies ---
Write-Host "[3/5] Installing dependencies..." -ForegroundColor Yellow
Push-Location $projectDir
npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "     Dependencies installed." -ForegroundColor Green
Pop-Location

# --- Step 4: Create .env if missing ---
Write-Host "[4/5] Checking .env file..." -ForegroundColor Yellow
$envPath = Join-Path $projectDir ".env"
if (-not (Test-Path $envPath)) {
    $envExample = Join-Path $projectDir ".env.example"
    if (Test-Path $envExample) {
        Copy-Item $envExample $envPath
        Write-Host "     .env created from .env.example" -ForegroundColor Green
    } else {
        # Create .env with the Supabase credentials
        @"
SUPABASE_URL=https://hzucgufphsubwnvpzetv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6dWNndWZwaHN1YndudnB6ZXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTg0NDEsImV4cCI6MjA4NzgzNDQ0MX0.pkV_MW2g-JKetU_6h9w9CZP1lpP9_YUG4wvHnrqM-qU
PORT=3001
"@ | Set-Content $envPath -Encoding UTF8
        Write-Host "     .env created with credentials." -ForegroundColor Green
    }
} else {
    Write-Host "     .env already exists, skipping." -ForegroundColor Green
}

# --- Step 5: Generate claude_desktop_config.json and copy to Claude AppData ---
Write-Host "[5/5] Configuring Claude Desktop..." -ForegroundColor Yellow

# Escape backslashes for JSON
$nodePathJson  = $nodePath  -replace '\\', '\\\\'
$serverPathJson = $serverPath -replace '\\', '\\\\'
$projectDirJson = $projectDir -replace '\\', '\\\\'

$config = @"
{
    "mcpServers": {
        "grabon-deal-distributor": {
            "command": "$nodePathJson",
            "args": [
                "$serverPathJson"
            ],
            "cwd": "$projectDirJson"
        }
    }
}
"@

# Save to project folder
$localConfig = Join-Path $projectDir "claude_desktop_config.json"
$config | Set-Content $localConfig -Encoding UTF8
Write-Host "     claude_desktop_config.json updated." -ForegroundColor Green

# Copy to Claude AppData
$claudeConfigDir = Join-Path $env:APPDATA "Claude"
if (-not (Test-Path $claudeConfigDir)) {
    New-Item -ItemType Directory -Path $claudeConfigDir | Out-Null
}
$claudeConfigPath = Join-Path $claudeConfigDir "claude_desktop_config.json"
Copy-Item $localConfig $claudeConfigPath -Force
Write-Host "     Copied to: $claudeConfigPath" -ForegroundColor Green

# --- Done ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor White
Write-Host "  1. Fully QUIT Claude Desktop (system tray → Quit)" -ForegroundColor White
Write-Host "  2. Reopen Claude Desktop" -ForegroundColor White
Write-Host "  3. Go to Settings → Developer" -ForegroundColor White
Write-Host "  4. Confirm 'grabon-deal-distributor' shows as RUNNING (green)" -ForegroundColor White
Write-Host "  5. Start a new chat and type:" -ForegroundColor White
Write-Host '     "Distribute an emergency food deal for merchant M001, 30% off, expires 2026-03-30T23:59:00"' -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
