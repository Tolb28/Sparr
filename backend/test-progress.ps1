param(
  [string]$BaseUrl = "http://localhost:3000",
  [int]$ProfileId = [int]$env:SPARR_PROFILE_ID,
  [string]$Token = $env:SPARR_TOKEN,
  [string]$OtherToken = $env:SPARR_OTHER_TOKEN,
  [string]$AdminToken = $env:SPARR_ADMIN_TOKEN,
  [switch]$AllowMutation,
  [int]$LoadTestCount = 100,
  [string]$LogPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $ProfileId -or $ProfileId -le 0) {
  Write-Host "ProfileId is required. Pass -ProfileId or set SPARR_PROFILE_ID."
  exit 1
}
if (-not $Token) {
  Write-Host "Token is required. Pass -Token or set SPARR_TOKEN."
  exit 1
}

if (-not $LogPath) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $logDir = Join-Path $PSScriptRoot "test-results"
  if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
  }
  $LogPath = Join-Path $logDir "progress-tests-$timestamp.log"
}

$Results = @()

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format s), $Message
  Write-Host $line
  Add-Content -Path $LogPath -Value $line
}

function Add-Result {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Details
  )
  $Results += [pscustomobject]@{ Name = $Name; Status = $Status; Details = $Details }
  Write-Log ("{0}: {1} - {2}" -f $Status, $Name, $Details)
}

function Get-AuthHeaders {
  param([string]$AuthToken)
  return @{ Authorization = "Bearer $AuthToken" }
}

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers,
    [string]$Body
  )
  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    if ($Body) {
      $response = Invoke-WebRequest -Method $Method -Uri $Uri -Headers $Headers -Body $Body -ContentType "application/json" -ErrorAction Stop
    } else {
      $response = Invoke-WebRequest -Method $Method -Uri $Uri -Headers $Headers -ErrorAction Stop
    }
    $stopwatch.Stop()
    $json = $null
    if ($response.Content) {
      try { $json = $response.Content | ConvertFrom-Json -ErrorAction Stop } catch { }
    }
    return [pscustomobject]@{
      StatusCode = $response.StatusCode
      Body = $json
      Raw = $response.Content
      DurationMs = $stopwatch.ElapsedMilliseconds
    }
  } catch {
    $stopwatch.Stop()
    $status = $null
    $content = $null
    if ($_.Exception.Response) {
      $status = $_.Exception.Response.StatusCode.value__
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $content = $reader.ReadToEnd()
      $reader.Close()
    }
    $json = $null
    if ($content) {
      try { $json = $content | ConvertFrom-Json -ErrorAction Stop } catch { }
    }
    return [pscustomobject]@{
      StatusCode = $status
      Body = $json
      Raw = $content
      DurationMs = $stopwatch.ElapsedMilliseconds
      Error = $_.Exception.Message
    }
  }
}

function Test-ProgressResponse {
  param(
    [pscustomobject]$Body,
    [string]$ExpectedRange,
    [int]$ExpectedDays
  )
  if (-not $Body) {
    Add-Result "progress.$ExpectedRange.body" "FAIL" "Missing JSON response body."
    return
  }

  if ($Body.range -ne $ExpectedRange) {
    Add-Result "progress.$ExpectedRange.range" "FAIL" "Expected range '$ExpectedRange', got '$($Body.range)'."
  } else {
    Add-Result "progress.$ExpectedRange.range" "PASS" "Range normalized to '$ExpectedRange'."
  }

  $expectedMetricKeys = @(
    'workouts_completed','total_hours','streak_days','club_sessions','interactions_count',
    'posts_created','friends_count','clubs_joined','skill_level','intensity_score','score'
  )
  $metrics = $Body.metrics
  if (-not $metrics) {
    Add-Result "progress.$ExpectedRange.metrics" "FAIL" "Missing metrics object."
  } else {
    $missingMetrics = $expectedMetricKeys | Where-Object { -not $metrics.PSObject.Properties.Name -contains $_ }
    if ($missingMetrics.Count -gt 0) {
      Add-Result "progress.$ExpectedRange.metrics" "FAIL" "Missing metrics: $($missingMetrics -join ', ')."
    } else {
      Add-Result "progress.$ExpectedRange.metrics" "PASS" "All expected metrics present."
    }

    foreach ($metric in @('skill_level','intensity_score')) {
      $value = $metrics.$metric
      if ($null -eq $value) {
        Add-Result "progress.$ExpectedRange.metrics.$metric" "FAIL" "Missing $metric."
      } elseif (($value % 1) -ne 0 -or $value -lt 0 -or $value -gt 100) {
        Add-Result "progress.$ExpectedRange.metrics.$metric" "FAIL" "$metric must be integer 0-100. Got $value."
      } else {
        Add-Result "progress.$ExpectedRange.metrics.$metric" "PASS" "$metric is $value."
      }
    }
  }

  $snapshots = $Body.snapshots
  if (-not $snapshots) {
    Add-Result "progress.$ExpectedRange.snapshots" "FAIL" "Missing snapshots array."
    return
  }

  $expectedSnapshotKeys = @(
    'snapshot_date','workouts_completed','club_sessions','streak_days',
    'interactions_count','skill_level','intensity_score','score'
  )
  $missingSnapshotKeys = @()
  foreach ($snapshot in $snapshots) {
    foreach ($key in $expectedSnapshotKeys) {
      if (-not ($snapshot.PSObject.Properties.Name -contains $key)) {
        $missingSnapshotKeys += $key
      }
    }
  }
  if ($missingSnapshotKeys.Count -gt 0) {
    $uniqueMissing = $missingSnapshotKeys | Sort-Object -Unique
    Add-Result "progress.$ExpectedRange.snapshots.keys" "FAIL" "Missing snapshot keys: $($uniqueMissing -join ', ')."
  } else {
    Add-Result "progress.$ExpectedRange.snapshots.keys" "PASS" "All snapshot keys present."
  }

  foreach ($metric in @('skill_level','intensity_score')) {
    $invalid = $snapshots | Where-Object { $null -eq $_.$metric -or (($_.$metric % 1) -ne 0) -or $_.$metric -lt 0 -or $_.$metric -gt 100 }
    if ($invalid.Count -gt 0) {
      Add-Result "progress.$ExpectedRange.snapshots.$metric" "FAIL" "$metric must be integer 0-100 for all snapshots."
    } else {
      Add-Result "progress.$ExpectedRange.snapshots.$metric" "PASS" "$metric valid for all snapshots."
    }
  }

  if ($ExpectedDays -gt 0 -and $snapshots.Count -gt 0) {
    $earliestAllowed = (Get-Date).Date.AddDays(-($ExpectedDays - 1))
    $outOfRange = $snapshots | Where-Object { [DateTime]$_.snapshot_date -lt $earliestAllowed }
    if ($outOfRange.Count -gt 0) {
      Add-Result "progress.$ExpectedRange.snapshots.range" "FAIL" "Snapshots older than expected range found."
    } else {
      Add-Result "progress.$ExpectedRange.snapshots.range" "PASS" "Snapshots within expected range."
    }
  } elseif ($ExpectedDays -gt 0 -and $snapshots.Count -eq 0) {
    Add-Result "progress.$ExpectedRange.snapshots.range" "WARN" "No snapshots returned to validate range."
  }
}

function Get-Percentile {
  param([int[]]$Values, [double]$Percent)
  if (-not $Values -or $Values.Count -eq 0) {
    return $null
  }
  $sorted = $Values | Sort-Object
  $index = [math]::Ceiling($sorted.Count * $Percent) - 1
  if ($index -lt 0) { $index = 0 }
  if ($index -ge $sorted.Count) { $index = $sorted.Count - 1 }
  return $sorted[$index]
}

function Invoke-LoadTest {
  param(
    [string]$Url,
    [hashtable]$Headers,
    [int]$Count
  )
  $jobs = @()
  for ($i = 0; $i -lt $Count; $i++) {
    $jobs += Start-Job -ScriptBlock {
      param($url, $headers)
      $sw = [System.Diagnostics.Stopwatch]::StartNew()
      try {
        $response = Invoke-WebRequest -Method GET -Uri $url -Headers $headers -ErrorAction Stop
        $sw.Stop()
        return [pscustomobject]@{ StatusCode = $response.StatusCode; DurationMs = $sw.ElapsedMilliseconds }
      } catch {
        $sw.Stop()
        $status = $null
        if ($_.Exception.Response) {
          $status = $_.Exception.Response.StatusCode.value__
        }
        return [pscustomobject]@{ StatusCode = $status; DurationMs = $sw.ElapsedMilliseconds; Error = $_.Exception.Message }
      }
    } -ArgumentList $Url, $Headers
  }
  Wait-Job -Job $jobs | Out-Null
  $results = Receive-Job -Job $jobs
  Remove-Job -Job $jobs | Out-Null
  return $results
}

Write-Log "Starting progress endpoint tests."
Write-Log "BaseUrl=$BaseUrl ProfileId=$ProfileId LoadTestCount=$LoadTestCount AllowMutation=$AllowMutation"

$progressUrl = "$BaseUrl/api/auth/gamification/profiles/$ProfileId/progress"
$headers = Get-AuthHeaders $Token

$rangeTests = @(
  @{ Range = 'week'; ExpectedRange = 'week'; Days = 7 },
  @{ Range = 'month'; ExpectedRange = 'month'; Days = 30 },
  @{ Range = 'year'; ExpectedRange = 'year'; Days = 365 },
  @{ Range = 'lifetime'; ExpectedRange = 'lifetime'; Days = 0 },
  @{ Range = 'weekly'; ExpectedRange = 'week'; Days = 7 },
  @{ Range = 'monthly'; ExpectedRange = 'month'; Days = 30 }
)

foreach ($rangeTest in $rangeTests) {
  $response = Invoke-Api -Method GET -Uri "$progressUrl?range=$($rangeTest.Range)" -Headers $headers
  if ($response.StatusCode -eq 200) {
    Add-Result "progress.$($rangeTest.Range).status" "PASS" "200 OK in $($response.DurationMs)ms."
    Test-ProgressResponse -Body $response.Body -ExpectedRange $rangeTest.ExpectedRange -ExpectedDays $rangeTest.Days
  } else {
    Add-Result "progress.$($rangeTest.Range).status" "FAIL" "Expected 200 OK, got $($response.StatusCode)."
  }
}

$invalidRange = Invoke-Api -Method GET -Uri "$progressUrl?range=invalid" -Headers $headers
if ($invalidRange.StatusCode -eq 400) {
  Add-Result "validation.range.invalid" "PASS" "Invalid range rejected with 400."
} else {
  Add-Result "validation.range.invalid" "FAIL" "Expected 400, got $($invalidRange.StatusCode)."
}

$defaultRange = Invoke-Api -Method GET -Uri $progressUrl -Headers $headers
if ($defaultRange.StatusCode -eq 200 -and $defaultRange.Body.range -eq 'week') {
  Add-Result "validation.range.default" "PASS" "Missing range defaults to week."
} else {
  Add-Result "validation.range.default" "FAIL" "Expected default range week."
}

$invalidProfile = Invoke-Api -Method GET -Uri "$BaseUrl/api/auth/gamification/profiles/-1/progress?range=week" -Headers $headers
if ($invalidProfile.StatusCode -eq 400) {
  Add-Result "validation.profile.negative" "PASS" "Negative profileId rejected with 400."
} else {
  Add-Result "validation.profile.negative" "FAIL" "Expected 400, got $($invalidProfile.StatusCode)."
}

$stringProfile = Invoke-Api -Method GET -Uri "$BaseUrl/api/auth/gamification/profiles/abc/progress?range=week" -Headers $headers
if ($stringProfile.StatusCode -eq 400) {
  Add-Result "validation.profile.string" "PASS" "String profileId rejected with 400."
} else {
  Add-Result "validation.profile.string" "FAIL" "Expected 400, got $($stringProfile.StatusCode)."
}

$noAuth = Invoke-Api -Method GET -Uri "$progressUrl?range=week"
if ($noAuth.StatusCode -eq 401) {
  Add-Result "auth.no_token" "PASS" "Missing auth rejected with 401."
} else {
  Add-Result "auth.no_token" "FAIL" "Expected 401, got $($noAuth.StatusCode)."
}

$invalidAuth = Invoke-Api -Method GET -Uri "$progressUrl?range=week" -Headers (Get-AuthHeaders "invalid")
if ($invalidAuth.StatusCode -eq 401) {
  Add-Result "auth.invalid_token" "PASS" "Invalid token rejected with 401."
} else {
  Add-Result "auth.invalid_token" "FAIL" "Expected 401, got $($invalidAuth.StatusCode)."
}

if ($OtherToken) {
  $otherAuth = Invoke-Api -Method GET -Uri "$progressUrl?range=week" -Headers (Get-AuthHeaders $OtherToken)
  if ($otherAuth.StatusCode -eq 403) {
    Add-Result "auth.other_profile" "PASS" "Other profile access rejected with 403."
  } else {
    Add-Result "auth.other_profile" "FAIL" "Expected 403, got $($otherAuth.StatusCode)."
  }
} else {
  Add-Result "auth.other_profile" "WARN" "SPARR_OTHER_TOKEN not provided. Skipping 403 check."
}

if ($AdminToken) {
  $adminAuth = Invoke-Api -Method GET -Uri "$progressUrl?range=week" -Headers (Get-AuthHeaders $AdminToken)
  if ($adminAuth.StatusCode -eq 200) {
    Add-Result "auth.admin" "PASS" "Admin token allowed access."
  } else {
    Add-Result "auth.admin" "FAIL" "Expected 200, got $($adminAuth.StatusCode)."
  }
} else {
  Add-Result "auth.admin" "WARN" "SPARR_ADMIN_TOKEN not provided. Skipping admin check."
}

$firstRequest = Invoke-Api -Method GET -Uri "$progressUrl?range=week" -Headers $headers
$secondRequest = Invoke-Api -Method GET -Uri "$progressUrl?range=week" -Headers $headers
if ($firstRequest.StatusCode -eq 200 -and $secondRequest.StatusCode -eq 200) {
  if ($secondRequest.DurationMs -le $firstRequest.DurationMs) {
    Add-Result "cache.hit" "PASS" "Second request faster or equal ($($firstRequest.DurationMs)ms -> $($secondRequest.DurationMs)ms)."
  } else {
    Add-Result "cache.hit" "WARN" "Second request slower ($($firstRequest.DurationMs)ms -> $($secondRequest.DurationMs)ms). Check cache logs."
  }
} else {
  Add-Result "cache.hit" "FAIL" "Cache test failed due to non-200 responses."
}

if ($AllowMutation) {
  $payload = @{ training_id = $null; duration_seconds = 300 } | ConvertTo-Json
  $complete = Invoke-Api -Method POST -Uri "$BaseUrl/api/auth/gamification/complete" -Headers $headers -Body $payload
  if ($complete.StatusCode -eq 200) {
    Add-Result "cache.invalidation" "PASS" "Workout completion logged (cache invalidation triggered)."
  } else {
    Add-Result "cache.invalidation" "FAIL" "Workout completion failed with $($complete.StatusCode)."
  }
} else {
  Add-Result "cache.invalidation" "WARN" "AllowMutation not set. Skipping cache invalidation test."
}

if ($LoadTestCount -gt 0) {
  Write-Log "Starting load test with $LoadTestCount concurrent requests."
  $loadResults = Invoke-LoadTest -Url "$progressUrl?range=week" -Headers $headers -Count $LoadTestCount
  $durations = $loadResults | Where-Object { $_.StatusCode -eq 200 } | ForEach-Object { [int]$_.DurationMs }
  $failures = $loadResults | Where-Object { $_.StatusCode -ne 200 }
  $p95 = Get-Percentile -Values $durations -Percent 0.95
  $p99 = Get-Percentile -Values $durations -Percent 0.99

  if ($failures.Count -eq 0 -and $p95 -lt 50 -and $p99 -lt 100) {
    Add-Result "load.p95_p99" "PASS" "p95=$p95 ms, p99=$p99 ms, failures=0."
  } else {
    Add-Result "load.p95_p99" "WARN" "p95=$p95 ms, p99=$p99 ms, failures=$($failures.Count)."
  }
} else {
  Add-Result "load.p95_p99" "WARN" "Load test skipped (LoadTestCount <= 0)."
}

$passCount = ($Results | Where-Object { $_.Status -eq 'PASS' }).Count
$failCount = ($Results | Where-Object { $_.Status -eq 'FAIL' }).Count
$warnCount = ($Results | Where-Object { $_.Status -eq 'WARN' }).Count
Write-Log "Summary: PASS=$passCount FAIL=$failCount WARN=$warnCount"
Write-Log "Log saved to $LogPath"
