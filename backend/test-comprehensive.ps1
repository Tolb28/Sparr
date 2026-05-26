param(
  [string]$BaseUrl = "http://localhost:4000",
  [switch]$SkipCleanup,
  [switch]$Verbose,
  [switch]$BailOnFirstFailure
)

$ErrorActionPreference = "Stop"

$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultsDir = Join-Path $BackendDir "test-results"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackendLog = Join-Path $ResultsDir "backend-$Timestamp.log"
$BackendErrLog = Join-Path $ResultsDir "backend-$Timestamp.err.log"
$ContextPath = Join-Path $ResultsDir "test-context-$Timestamp.json"
$ScenarioResults = Join-Path $ResultsDir "scenario-results-$Timestamp.json"
$BenchResults = Join-Path $ResultsDir "benchmarks-$Timestamp.json"

function Write-Status {
  param([string]$Message)
  Write-Host $Message
}

function Invoke-NodeScript {
  param(
    [string]$ScriptPath,
    [string[]]$Arguments = @(),
    [int[]]$AllowedExitCodes = @(0)
  )
  $argsString = $Arguments -join " "
  Write-Status "Running: node $ScriptPath $argsString"
  & node $ScriptPath @Arguments
  if ($AllowedExitCodes -notcontains $LASTEXITCODE) {
    throw "Command failed: node $ScriptPath $argsString"
  }
  return $LASTEXITCODE
}

function Wait-ForServer {
  param([string]$Url)
  $maxAttempts = 20
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
      Invoke-WebRequest -Method Head -Uri $Url -TimeoutSec 3 | Out-Null
      Write-Status "Backend is reachable at $Url"
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  throw "Backend did not become ready at $Url"
}

function Test-DbConnection {
  $command = @"
require('ts-node/register/transpile-only');
const { pool } = require('./src/config/db');
pool.query('SELECT 1')
  .then(() => { console.log('DB OK'); return pool.end(); })
  .catch((err) => { console.error(err); process.exit(1); });
"@
  Write-Status "Verifying DB connectivity..."
  & node -e $command
  if ($LASTEXITCODE -ne 0) {
    throw "Database connectivity check failed."
  }
}

New-Item -ItemType Directory -Force -Path $ResultsDir | Out-Null
Get-ChildItem -Path $ResultsDir -File | Remove-Item -Force -ErrorAction SilentlyContinue
New-Item -ItemType File -Force -Path $BackendLog | Out-Null
New-Item -ItemType File -Force -Path $BackendErrLog | Out-Null
if (-not $env:CACHE_TTL_MS) {
  $env:CACHE_TTL_MS = "5000"
}

$backendProcess = $null
$runnerExitCode = 0

try {
  Push-Location $BackendDir
  Write-Status "Starting backend..."
  $backendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $BackendDir -RedirectStandardOutput $BackendLog -RedirectStandardError $BackendErrLog -PassThru

  Wait-ForServer -Url $BaseUrl
  Test-DbConnection

  Invoke-NodeScript -ScriptPath "tests/utils/data-seeder.js" -Arguments @("--cleanup-only")
  Invoke-NodeScript -ScriptPath "tests/utils/data-seeder.js"

  Invoke-NodeScript -ScriptPath "tests/utils/test-context.js" -Arguments @("--output", $ContextPath, "--base-url", $BaseUrl)

  $scenarioList = "integration.json,skill-level.json,intensity-score.json,caching.json,security.json,isolation.json,edge-cases.json,badge-integration.json"
  $runnerArgs = @(
    "--scenarios=$scenarioList",
    "--base-url=$BaseUrl",
    "--context=$ContextPath",
    "--log-file=$BackendLog",
    "--output=$ScenarioResults"
  )
  if ($BailOnFirstFailure) { $runnerArgs += "--bail" }
  if ($Verbose) { $runnerArgs += "--verbose" }

  $runnerExitCode = Invoke-NodeScript -ScriptPath "tests/test-runner.js" -Arguments $runnerArgs -AllowedExitCodes @(0, 1)

  Invoke-NodeScript -ScriptPath "tests/performance-benchmarks.js" -Arguments @("--context=$ContextPath", "--output=$BenchResults", "--base-url=$BaseUrl")

  Invoke-NodeScript -ScriptPath "tests/report-generator.js" -Arguments @("--results=$ScenarioResults", "--performance=$BenchResults", "--output-dir=$ResultsDir")
} finally {
  if (-not $SkipCleanup) {
    try {
      Invoke-NodeScript -ScriptPath "tests/utils/data-seeder.js" -Arguments @("--cleanup-only")
    } catch {
      Write-Status "Cleanup failed: $($_.Exception.Message)"
    }
  } else {
    Write-Status "SkipCleanup enabled: leaving seeded data intact."
  }

  if ($backendProcess -and -not $backendProcess.HasExited) {
    Write-Status "Stopping backend process..."
    Stop-Process -Id $backendProcess.Id -Force
  }
  Pop-Location
}

Write-Status "Comprehensive test run complete."
if ($runnerExitCode -ne 0) {
  throw "Scenario tests reported failures. Review scenario and benchmark outputs in $ResultsDir."
}
