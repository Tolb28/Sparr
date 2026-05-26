param(
  [string]$BaseUrl = "http://localhost:4000",
  [int]$Baseline = 5,
  [int]$Spike = 20,
  [int]$Stress = 50,
  [double]$MaxErrorRate = 1,
  [int]$Users = 3,
  [switch]$SkipBackendStart
)

$ErrorActionPreference = "Stop"

$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultsDir = Join-Path $BackendDir "test-results\load"

function Wait-ForServer {
  param([string]$Url)
  $maxAttempts = 30
  $uri = [System.Uri]$Url
  $port = if ($uri.Port -gt 0) { $uri.Port } else { 80 }
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
      $tcp = Test-NetConnection -ComputerName $uri.Host -Port $port -WarningAction SilentlyContinue -InformationLevel Quiet
      if ($tcp) {
        Write-Host "Backend is reachable at $Url"
        return
      }
    } catch {
      # continue retry loop
    } finally {
      Start-Sleep -Seconds 2
    }
  }
  throw "Backend did not become ready at $Url"
}

function Invoke-LoadRunner {
  $cmdArgs = @(
    "tests/load/load-runner.js",
    "--base-url=$BaseUrl",
    "--output-dir=$ResultsDir",
    "--baseline=$Baseline",
    "--spike=$Spike",
    "--stress=$Stress",
    "--max-error-rate=$MaxErrorRate",
    "--users=$Users",
    "--write-manifest"
  )

  Write-Host "Running: node $($cmdArgs -join ' ')"
  & node @cmdArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Load runner failed."
  }
}

New-Item -ItemType Directory -Force -Path $ResultsDir | Out-Null

$backendProcess = $null
try {
  Push-Location $BackendDir
  if (-not $env:SUPABASE_URL) {
    $env:SUPABASE_URL = "https://placeholder.supabase.co"
    Write-Host "SUPABASE_URL missing, using placeholder for local load probing."
  }
  if (-not $env:SUPABASE_ANON_KEY) {
    $env:SUPABASE_ANON_KEY = "placeholder-anon-key"
    Write-Host "SUPABASE_ANON_KEY missing, using placeholder for local load probing."
  }
  if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    $env:SUPABASE_SERVICE_ROLE_KEY = "placeholder-service-role-key"
    Write-Host "SUPABASE_SERVICE_ROLE_KEY missing, using placeholder for local load probing."
  }
  if (-not $SkipBackendStart) {
    Write-Host "Starting backend..."
    $backendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $BackendDir -PassThru
    Wait-ForServer -Url $BaseUrl
  }

  Invoke-LoadRunner
  Write-Host "Load test run complete."
} finally {
  if ($backendProcess -and -not $backendProcess.HasExited) {
    Write-Host "Stopping backend process..."
    Stop-Process -Id $backendProcess.Id -Force
  }
  Pop-Location
}
