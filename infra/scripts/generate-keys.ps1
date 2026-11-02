<#
.SYNOPSIS
    Generates the RS256 key pairs used by the Docker stack (core-service, ai-service, jwt).
.DESCRIPTION
    Local Windows helper mirroring infra/scripts/generate-keys.sh. Existing keys are kept.
    On EC2 use the bash script, which also grants the container user (UID 10001) access.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$rootDir = (Get-Item (Split-Path -Parent $MyInvocation.MyCommand.Path)).Parent.Parent.FullName
$keysDir = Join-Path $rootDir '.service-keys'
New-Item -ItemType Directory -Force -Path $keysDir | Out-Null

if (-not (Get-Command openssl -ErrorAction SilentlyContinue)) {
    throw 'openssl was not found on PATH (it ships with Git for Windows: C:\Program Files\Git\usr\bin).'
}

foreach ($name in @('core-service', 'ai-service', 'jwt')) {
    $privateKey = Join-Path $keysDir "$name-private.pem"
    $publicKey = Join-Path $keysDir "$name-public.pem"
    if (Test-Path $privateKey) {
        Write-Host "- ${name}: already exists, skipped" -ForegroundColor Yellow
        continue
    }
    & openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out $privateKey
    if ($LASTEXITCODE -ne 0) { throw "openssl genpkey failed for $name" }
    & openssl rsa -pubout -in $privateKey -out $publicKey
    if ($LASTEXITCODE -ne 0) { throw "openssl rsa -pubout failed for $name" }
    Write-Host "+ ${name}: generated" -ForegroundColor Green
}

Write-Host "Keys ready in $keysDir" -ForegroundColor Green
