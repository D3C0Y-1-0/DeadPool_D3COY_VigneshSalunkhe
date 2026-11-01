# MIRAGE Endpoint Agent - Automated Windows Deployment Script
# Run in Administrator PowerShell
param (
    [string]$ServerUrl = "http://localhost:8000",
    [string]$AgentToken = "",
    [switch]$Service = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  MIRAGE DEFENSE: Remote Windows Endpoint Provisioning    " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify Python availability
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Error "Python 3.10+ is required but was not found in PATH. Please install Python and retry."
    exit 1
}

$pyVer = & python --version
Write-Host "[+] Found Python environment: $pyVer" -ForegroundColor Green

# 2. Setup agent working directory
$agentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $agentDir
Write-Host "[+] Working directory: $agentDir" -ForegroundColor Gray

# 3. Install required agent dependencies
Write-Host "[+] Installing agent dependencies (pydantic, requests, pywin32)..." -ForegroundColor Yellow
& python -m pip install --quiet --upgrade pip
& python -m pip install --quiet -r requirements.txt

# 4. Configure agent token & server URL
$configPath = Join-Path $agentDir "config.json"
if ($AgentToken -ne "") {
    Write-Host "[+] Configuring agent credentials..." -ForegroundColor Green
    $configContent = @{
        server_url = $ServerUrl
        token = $AgentToken
        log_level = "INFO"
        batch_size = 50
        flush_interval_seconds = 5
    } | ConvertTo-Json -Depth 4
    Set-Content -Path $configPath -Value $configContent
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  PROVISIONING COMPLETE: Outbound Agent Ready" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "To start the monitoring agent immediately, run:" -ForegroundColor White
Write-Host "  python -m mirage_agent.main run --server $ServerUrl" -ForegroundColor Yellow
Write-Host ""
