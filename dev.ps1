<#
.SYNOPSIS
    UniChat Dev Runner - sequential build & launch with 3 retries and live dashboard monitoring.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$rootDir = $PSScriptRoot
$statusDir = Join-Path $rootDir '.tmp\dev-runner'

$script:Svcs = [ordered]@{
    'chromadb'   = @{
        Title = 'ChromaDB'; Port = 8000; Color = '#9B59B6'; Tag = '[CHROMA]'
        Health = 'http://127.0.0.1:8000/api/v1/heartbeat'; TimeoutSec = 20
        State = 'QUEUED'; Attempt = 0; Skip = $false
    }
    'ai-service' = @{
        Title = 'AI Service'; Port = 8001; Color = '#3498DB'; Tag = '[AI-SVC]'
        Health = 'http://127.0.0.1:8001/internal/v1/health'; TimeoutSec = 30
        State = 'QUEUED'; Attempt = 0; Skip = $false
    }
    'core-api'   = @{
        Title = 'Core API'; Port = 8082; Color = '#2ECC71'; Tag = '[CORE  ]'
        Health = 'http://127.0.0.1:8082/actuator/health'; TimeoutSec = 60
        State = 'QUEUED'; Attempt = 0; Skip = $false
    }
    'frontend'   = @{
        Title = 'Frontend'; Port = 5173; Color = '#F1C40F'; Tag = '[WEB   ]'
        Health = 'http://127.0.0.1:5173'; TimeoutSec = 20
        State = 'QUEUED'; Attempt = 0; Skip = $false
    }
}

$script:CurrentAction = 'Initializing...'

function Test-PortFree([int]$Port) {
    $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return ($null -eq $c)
}

function Get-PortOwner([int]$Port) {
    $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($c) {
        $id = $c[0].OwningProcess
        $name = (Get-Process -Id $id -ErrorAction SilentlyContinue).ProcessName
        return @{ Pid = $id; Name = $name }
    }
    return $null
}

function Test-Health([string]$Url, [int]$Port) {
    try {
        $r = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -lt 400) { return $true }
    }
    catch {}

    # Robust fallback: check if process is actively listening on the service port
    $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $c)
}

function Kill-ServiceProcess([string]$Key) {
    $pidFile = Join-Path $statusDir "$Key.pid"
    if (Test-Path $pidFile) {
        $idStr = (Get-Content $pidFile -Raw -ErrorAction SilentlyContinue)
        if ($idStr) {
            $id = [int]$idStr.Trim()
            & taskkill /PID $id /T /F 2>$null | Out-Null
        }
    }
}

function Render-Dashboard {
    $ts = Get-Date -Format 'HH:mm:ss'
    $keys = @($script:Svcs.Keys)
    $rowItems = @()

    for ($i = 0; $i -lt $keys.Count; $i++) {
        $k = $keys[$i]
        $s = $script:Svcs[$k]
        
        $stateText = switch -regex ($s.State) {
            '^READY$'       { '[READY]    ' }
            '^STARTING'     { "[$($s.State)]".PadRight(11) }
            '^FAILED$'      { '[FAILED]   ' }
            '^SKIPPED$'     { '[SKIPPED]  ' }
            '^QUEUED$'      { '[QUEUED]   ' }
            '^PORT_ERR$'    { '[PORT ERR] ' }
            default         { "[$($s.State)]".PadRight(11) }
        }

        $color = switch -regex ($s.State) {
            '^READY$'       { 'Green' }
            '^STARTING'     { 'Yellow' }
            '^FAILED$'      { 'Red' }
            '^PORT_ERR$'    { 'Red' }
            default         { 'DarkGray' }
        }

        $num = $i + 1
        $tag = $s.Tag
        $title = $s.Title.PadRight(10)
        $portStr = ":$($s.Port)".PadRight(6)
        $line = "  |  [$num] $tag $title $stateText $portStr  |"

        $rowItems += @{ Text = $line; Color = $color }
    }

    Clear-Host
    Write-Host ""
    Write-Host "  +--------------------------------------------------+" -ForegroundColor DarkGray
    Write-Host "  |  UniChat Sequential Dev Dashboard   $ts   |" -ForegroundColor Cyan
    Write-Host "  +--------------------------------------------------+" -ForegroundColor DarkGray
    foreach ($item in $rowItems) {
        Write-Host $item.Text -ForegroundColor $item.Color
    }
    Write-Host "  +--------------------------------------------------+" -ForegroundColor DarkGray
    Write-Host "  |  Status: $($script:CurrentAction.PadRight(39)) |" -ForegroundColor White
    Write-Host "  +--------------------------------------------------+" -ForegroundColor DarkGray
    Write-Host ""
}

function Assert-Prerequisites {
    $script:CurrentAction = 'Checking pre-flight prerequisites...'
    Render-Dashboard

    $ok = $true
    if (-not (Get-Command wt -ErrorAction SilentlyContinue)) { $ok = $false }
    
    $jdk = Join-Path $rootDir '.tools\jdk-21.0.11+10'
    if (-not (Test-Path $jdk) -and -not $env:JAVA_HOME) { $ok = $false }

    $venv = Join-Path $rootDir 'ai-service\.venv'
    if (-not (Test-Path $venv)) { $ok = $false }
    else {
        # Ensure pika & requirements are installed in venv
        $pip = Join-Path $venv 'Scripts\pip.exe'
        $pikaPkg = Join-Path $venv 'Lib\site-packages\pika'
        if (Test-Path $pip) {
            if (-not (Test-Path $pikaPkg)) {
                $script:CurrentAction = 'Installing missing ai-service dependencies (pika)...'
                Render-Dashboard
                $reqs = Join-Path $rootDir 'ai-service\requirements.txt'
                & $pip install -r $reqs | Out-Null
            }
        }
    }

    $nm = Join-Path $rootDir 'frontend\node_modules'
    if (-not (Test-Path $nm)) { $ok = $false }

    if (-not $ok) {
        $script:CurrentAction = 'ERROR: Prerequisites missing!'
        Render-Dashboard
        Write-Host "  [X] Missing WT, JDK, Python venv, or node_modules." -ForegroundColor Red
        exit 1
    }
}

function Launch-ServiceTab([string]$Key) {
    $svc = $script:Svcs[$Key]
    $workerScript = Join-Path $rootDir 'dev-service.ps1'

    'launching' | Out-File (Join-Path $statusDir "$Key.status") -Force -NoNewline -Encoding ascii

    $wtArgs = @(
        '-w', '0', 'new-tab',
        '--tabColor', $svc.Color,
        '--title', $svc.Title,
        '--', 'powershell', '-ExecutionPolicy', 'Bypass', '-File', $workerScript, '-Service', $Key
    )
    & wt $wtArgs
}

function Start-ServicesSequentially {
    if (Test-Path $statusDir) {
        Remove-Item $statusDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    New-Item $statusDir -ItemType Directory -Force | Out-Null

    $keys = @($script:Svcs.Keys)

    foreach ($key in $keys) {
        $svc = $script:Svcs[$key]
        $port = $svc.Port

        # Check port
        if (-not (Test-PortFree $port)) {
            $owner = Get-PortOwner $port
            $svc.State = 'PORT_ERR'
            $script:CurrentAction = "Port $port used by $($owner.Name) PID $($owner.Pid)"
            Render-Dashboard

            Write-Host "  [!] Port $port ($($svc.Title)) is occupied." -ForegroundColor Yellow
            Write-Host "      [K] Kill process  [S] Skip service  [Q] Abort" -ForegroundColor White
            
            $choice = ''
            while ($choice -notin @('K', 'S', 'Q')) {
                Write-Host "      Select (K/S/Q) > " -NoNewline
                $choice = (Read-Host).ToUpper()
            }

            if ($choice -eq 'K') {
                & taskkill /PID $owner.Pid /T /F 2>$null | Out-Null
                Start-Sleep -Seconds 1
                if (-not (Test-PortFree $port)) {
                    Write-Host "  [X] Failed to free port $port." -ForegroundColor Red
                    exit 1
                }
            }
            elseif ($choice -eq 'S') {
                $svc.Skip = $true
                $svc.State = 'SKIPPED'
                continue
            }
            else {
                exit 0
            }
        }

        # Attempt build / start up to 3 times
        $maxAttempts = 3
        $success = $false

        for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
            $svc.Attempt = $attempt
            $svc.State = "STARTING $attempt/$maxAttempts"
            $script:CurrentAction = "Starting $($svc.Title) (Attempt $attempt/$maxAttempts)..."
            Render-Dashboard

            # Launch tab
            Launch-ServiceTab $key

            # Wait for health check or timeout
            $elapsed = 0
            $timeout = $svc.TimeoutSec

            while ($elapsed -lt $timeout) {
                Start-Sleep -Seconds 1
                $elapsed++

                if (Test-Health $svc.Health $svc.Port) {
                    $success = $true
                    break
                }

                # Check if worker script reported crash
                $sf = Join-Path $statusDir "$key.status"
                if (Test-Path $sf) {
                    $st = (Get-Content $sf -Raw -ErrorAction SilentlyContinue).Trim()
                    if ($st -eq 'failed') { break }
                }
            }

            if ($success) {
                $svc.State = 'READY'
                $script:CurrentAction = "✅ $($svc.Title) started successfully!"
                Render-Dashboard
                break
            }
            else {
                # Clean up process before retry
                Kill-ServiceProcess $key
                'quit' | Out-File (Join-Path $statusDir "$key.cmd") -Force -NoNewline -Encoding ascii
                Start-Sleep -Seconds 1

                if ($attempt -lt $maxAttempts) {
                    $script:CurrentAction = "⚠️ $($svc.Title) failed attempt $attempt/$maxAttempts. Retrying..."
                    Render-Dashboard
                    Start-Sleep -Seconds 2
                }
            }
        }

        if (-not $success) {
            $svc.State = 'FAILED'
            $script:CurrentAction = "❌ $($svc.Title) failed after $maxAttempts attempts."
            Render-Dashboard

            Write-Host "  [!] $($svc.Title) failed after $maxAttempts retries." -ForegroundColor Red
            Write-Host "      [R] Retry service  [S] Skip & continue  [Q] Quit all" -ForegroundColor White

            $c = ''
            while ($c -notin @('R', 'S', 'Q')) {
                Write-Host "      Select (R/S/Q) > " -NoNewline
                $c = (Read-Host).ToUpper()
            }

            if ($c -eq 'R') {
                # Decrement loop index to retry this service
                $idx = [array]::IndexOf($keys, $key) - 1
                # Retry by restarting outer logic for this key
                continue
            }
            elseif ($c -eq 'S') {
                $svc.Skip = $true
                $svc.State = 'SKIPPED'
            }
            else {
                Stop-AllServices
                exit 0
            }
        }
    }

    $script:CurrentAction = 'All services active! Opening Frontend browser...'
    Render-Dashboard

    # Auto open Frontend web app in default browser
    if (-not $script:Svcs['frontend'].Skip) {
        Start-Process 'http://127.0.0.1:5173/'
    }
}

function Restart-Svc([string]$Key) {
    Kill-ServiceProcess $Key
    'restart' | Out-File (Join-Path $statusDir "$Key.cmd") -Force -NoNewline -Encoding ascii
}

function Stop-AllServices {
    foreach ($key in $script:Svcs.Keys) {
        if ($script:Svcs[$key].Skip) { continue }
        Kill-ServiceProcess $key
        'quit' | Out-File (Join-Path $statusDir "$key.cmd") -Force -NoNewline -Encoding ascii
    }
    Start-Sleep -Seconds 2
    Remove-Item $statusDir -Recurse -Force -ErrorAction SilentlyContinue
}

function Enter-DashboardLoop {
    $host.UI.RawUI.WindowTitle = 'UniChat Dashboard'
    $keys = @($script:Svcs.Keys)

    while ($true) {
        # Periodic health verification
        for ($i = 0; $i -lt $keys.Count; $i++) {
            $k = $keys[$i]
            $s = $script:Svcs[$k]
            if ($s.Skip) { continue }

            if (Test-Health $s.Health $s.Port) {
                $s.State = 'READY'
            }
            else {
                $sf = Join-Path $statusDir "$k.status"
                $st = if (Test-Path $sf) { (Get-Content $sf -Raw -ErrorAction SilentlyContinue).Trim() } else { 'UNKNOWN' }
                if ($st -eq 'failed') { $s.State = 'FAILED' }
                elseif ($st -eq 'stopped') { $s.State = 'STOPPED' }
            }
        }

        Render-Dashboard

        # Interactive controls
        Write-Host "  Controls: [1-4] Restart Service | [R] Restart All | [Q] Quit All" -ForegroundColor Cyan
        Write-Host ""

        $waited = 0
        while ($waited -lt 4000) {
            if ([Console]::KeyAvailable) {
                $ch = [Console]::ReadKey($true).KeyChar.ToString().ToUpper()

                switch ($ch) {
                    'Q' {
                        $script:CurrentAction = 'Shutting down all services...'
                        Render-Dashboard
                        Stop-AllServices
                        Write-Host "  [*] All services stopped." -ForegroundColor Gray
                        exit 0
                    }
                    'R' {
                        foreach ($k in $keys) {
                            if (-not $script:Svcs[$k].Skip) { Restart-Svc $k }
                        }
                    }
                    { '1', '2', '3', '4' -contains $_ } {
                        $idx = [int]$ch - 1
                        if ($idx -lt $keys.Count -and -not $script:Svcs[$keys[$idx]].Skip) {
                            Restart-Svc $keys[$idx]
                        }
                    }
                }
                break
            }
            Start-Sleep -Milliseconds 250
            $waited += 250
        }
    }
}

# Entry point: relaunch in WT if needed
if (-not $env:WT_SESSION) {
    $me = Join-Path $rootDir 'dev.ps1'
    $wtArgs = @('-w', '0', 'new-tab', '--tabColor', '#E74C3C', '--title', 'UniChat Dashboard', '--', 'powershell', '-ExecutionPolicy', 'Bypass', '-File', $me)
    & wt $wtArgs
    exit
}

Assert-Prerequisites
Start-ServicesSequentially
Enter-DashboardLoop
