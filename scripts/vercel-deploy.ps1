# Deploy Scankro to Vercel (production) with env from local .env
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\_secrets.ps1"

$token = Get-ScankroSecret "VERCEL_TOKEN"
if (-not $token) { throw "VERCEL_TOKEN missing" }

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$env:VERCEL_TOKEN = $token
$env:GIT_TERMINAL_PROMPT = "0"

# Load DATABASE_URL and secrets from .env for Vercel
function Get-DotEnv([string]$key) {
  foreach ($line in Get-Content (Join-Path $root ".env")) {
    if ($line -match "^\s*$key=(.+)$") { return $Matches[1].Trim() }
  }
  return $null
}

$db = Get-DotEnv "DATABASE_URL"
$authSecret = Get-DotEnv "BETTER_AUTH_SECRET"
$analytics = Get-DotEnv "ANALYTICS_SALT"
if (-not $db) { throw "DATABASE_URL missing in .env" }
if (-not $authSecret) { $authSecret = "change-me-production-secret-min-32-chars-xx" }
if (-not $analytics) { $analytics = "scankro-analytics-salt" }

Write-Host "Linking/deploying project (non-interactive)..."

# Create project + prod deploy (first run links under token owner)
npx --yes vercel@latest pull --yes --environment=production --token $token 2>$null

# Set critical env vars for production (idempotent-ish: add will fail if exists — ignore)
function Set-VercelEnv([string]$name, [string]$value) {
  if (-not $value) { return }
  # stdin value for vercel env add
  $value | npx --yes vercel@latest env add $name production --token $token 2>&1 | Out-Null
}

# First get a production URL by deploying, then set URLs
Write-Host "Running production deploy..."
$deployOut = npx --yes vercel@latest deploy --prod --yes --token $token 2>&1 | Out-String
Write-Host $deployOut

# Extract production URL
$prodUrl = $null
if ($deployOut -match "https://[a-z0-9.-]+\.vercel\.app") {
  $prodUrl = $Matches[0].TrimEnd('/')
}
# Prefer non-preview alias if present
if ($deployOut -match "(Production:|Aliased:)\s*(https://[^\s]+)") {
  $prodUrl = $Matches[2].TrimEnd('/')
}

if ($prodUrl) {
  Write-Host "Production URL: $prodUrl"
  # Re-set URL-dependent vars (vercel env rm + add if needed is heavy; use env add and continue)
  $prodUrl | npx --yes vercel@latest env add NEXT_PUBLIC_APP_URL production --token $token --force 2>&1 | Out-Null
  $prodUrl | npx --yes vercel@latest env add BETTER_AUTH_URL production --token $token --force 2>&1 | Out-Null
}

$db | npx --yes vercel@latest env add DATABASE_URL production --token $token --force 2>&1 | Out-Null
$authSecret | npx --yes vercel@latest env add BETTER_AUTH_SECRET production --token $token --force 2>&1 | Out-Null
$analytics | npx --yes vercel@latest env add ANALYTICS_SALT production --token $token --force 2>&1 | Out-Null
"local" | npx --yes vercel@latest env add STORAGE_PROVIDER production --token $token --force 2>&1 | Out-Null

Write-Host "Redeploying with env vars..."
$deployOut2 = npx --yes vercel@latest deploy --prod --yes --token $token 2>&1 | Out-String
Write-Host $deployOut2

if ($deployOut2 -match "https://[a-z0-9.-]+\.vercel\.app") {
  Write-Host "DONE:"
  Write-Host $Matches[0]
}
