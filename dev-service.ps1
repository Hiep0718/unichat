<#
.SYNOPSIS
    Service runner for UniChat local dev. Called by dev.ps1 in each WT tab.
.PARAMETER Service
    Which service to run: chromadb, ai-service, core-api, frontend.
#>
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('chromadb', 'ai-service', 'core-api', 'frontend')]
    [string]$Service
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$rootDir = $PSScriptRoot
$statusDir = Join-Path $rootDir '.tmp\dev-runner'
$venvScripts = Join-Path $rootDir 'ai-service\.venv\Scripts'

if (-not (Test-Path $statusDir)) {
    New-Item -Path $statusDir -ItemType Directory -Force | Out-Null
}

$cfg = @{
    'chromadb'   = @{ Title = 'ChromaDB';   Port = 8000 }
    'ai-service' = @{ Title = 'AI Service'; Port = 8001 }
    'core-api'   = @{ Title = 'Core API';   Port = 8082 }
    'frontend'   = @{ Title = 'Frontend';   Port = 5173 }
}[$Service]

$host.UI.RawUI.WindowTitle = "$($cfg.Title) - UniChat Dev"

function Import-DotEnv {
    $envFile = Join-Path $rootDir '.env'
    if (-not (Test-Path $envFile)) { return }
    foreach ($line in Get-Content $envFile) {
        $tLine = $line.Trim()
        if ($tLine -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $key = $Matches[1].Trim()
            $val = $Matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($key, $val, 'Process')
            Set-Item -Path "env:$key" -Value $val
        }
    }
}

function Test-PortFree([int]$Port) {
    $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return ($null -eq $c)
}

function Set-Status([string]$Value) {
    $file = Join-Path $statusDir "$Service.status"
    $Value | Out-File -FilePath $file -Force -NoNewline -Encoding ascii
}

function Set-ServicePid([int]$Id) {
    $file = Join-Path $statusDir "$Service.pid"
    "$Id" | Out-File -FilePath $file -Force -NoNewline -Encoding ascii
}

function Read-Command {
    $cmdFile = Join-Path $statusDir "$Service.cmd"
    if (Test-Path $cmdFile) {
        $cmd = (Get-Content $cmdFile -Raw).Trim()
        Remove-Item $cmdFile -Force -ErrorAction SilentlyContinue
        return $cmd
    }
    return $null
}

function Start-ServiceProcess {
    switch ($Service) {
        'chromadb' {
            $dataDir = Join-Path $rootDir '.tmp\chroma-data'
            if (-not (Test-Path $dataDir)) {
                New-Item -Path $dataDir -ItemType Directory -Force | Out-Null
            }
            $exe = Join-Path $venvScripts 'chroma.exe'
            return Start-Process -FilePath $exe -ArgumentList "run --path `"$dataDir`" --port $($cfg.Port)" -NoNewWindow -PassThru
        }
        'ai-service' {
            $exe = Join-Path $venvScripts 'uvicorn.exe'
            $aiDir = Join-Path $rootDir 'ai-service'
            return Start-Process -FilePath $exe -ArgumentList "app.main:app --port $($cfg.Port) --reload" -WorkingDirectory $aiDir -NoNewWindow -PassThru
        }
        'core-api' {
            $jdk = Join-Path $rootDir '.tools\jdk-21.0.11+10'
            if (Test-Path $jdk) { $env:JAVA_HOME = $jdk }
            $mvnw = Join-Path $rootDir 'core-api\mvnw.cmd'
            $coreDir = Join-Path $rootDir 'core-api'
            $jvmArgs = "-Dspring-boot.run.jvmArguments=`"-DPOSTGRES_URL=$env:POSTGRES_URL -DPOSTGRES_USER=$env:POSTGRES_USER -DPOSTGRES_PASSWORD=$env:POSTGRES_PASSWORD -DAI_SERVICE_BASE_URL=$env:AI_SERVICE_BASE_URL`""
            return Start-Process -FilePath $mvnw -ArgumentList @('spring-boot:run', $jvmArgs) -WorkingDirectory $coreDir -NoNewWindow -PassThru
        }
        'frontend' {
            $toolsNode = Join-Path $rootDir '.tools\node-v24.18.0-win-x64'
            if (Test-Path $toolsNode) {
                $env:PATH = "$toolsNode;$env:PATH"
            }
            $npm = 'npm.cmd'
            $toolsNpm = Join-Path $toolsNode 'npm.cmd'
            if (Test-Path $toolsNpm) { $npm = $toolsNpm }
            $feDir = Join-Path $rootDir 'frontend'
            return Start-Process -FilePath $npm -ArgumentList 'run dev' -WorkingDirectory $feDir -NoNewWindow -PassThru
        }
    }
}

Import-DotEnv

Write-Host ""
Write-Host "  === $($cfg.Title) (Port $($cfg.Port)) ===" -ForegroundColor Cyan
Write-Host ""

while ($true) {
    if (-not (Test-PortFree $cfg.Port)) {
        Write-Host "  [!] Port $($cfg.Port) is already in use." -ForegroundColor Red
        Set-Status 'port-conflict'
        while ($true) {
            $cmd = Read-Command
            if ($cmd -eq 'restart') { break }
            if ($cmd -eq 'quit') { Set-Status 'stopped'; exit 0 }
            Start-Sleep -Seconds 1
        }
        continue
    }

    Write-Host "  >> Starting $($cfg.Title)..." -ForegroundColor Yellow
    Set-Status 'starting'

    try {
        $proc = Start-ServiceProcess
        if ($null -eq $proc) { throw 'Start-Process returned null' }
        Set-ServicePid $proc.Id
        Write-Host "  >> PID $($proc.Id) running." -ForegroundColor Green
        Write-Host ""
        $proc.WaitForExit()

        if ($proc.ExitCode -ne 0) {
            Write-Host ""
            Write-Host "  [X] Process stopped with exit code $($proc.ExitCode)" -ForegroundColor Red
            Set-Status 'failed'
        }
        else {
            Set-Status 'stopped'
        }
    }
    catch {
        Write-Host "  [X] Error: $_" -ForegroundColor Red
        Set-Status 'failed'
    }

    Write-Host ""
    Write-Host "  Waiting for dashboard command..." -ForegroundColor DarkGray
    while ($true) {
        $cmd = Read-Command
        if ($cmd -eq 'restart') {
            Write-Host ""
            Write-Host "  [~] Restarting $($cfg.Title)..." -ForegroundColor Cyan
            Write-Host ""
            break
        }
        if ($cmd -eq 'quit') {
            Set-Status 'stopped'
            Write-Host "  Exiting..." -ForegroundColor Gray
            exit 0
        }
        Start-Sleep -Seconds 1
    }
}
