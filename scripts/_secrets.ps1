# Non-interactive helpers for Scankro (reads tokens from .env / envCrendentials_necessary.md)
# Usage (PowerShell):
#   .\scripts\git-push.ps1
#   .\scripts\vercel-deploy.ps1

function Get-ScankroSecret {
  param([string]$Key)
  $envFile = Join-Path $PSScriptRoot "..\.env"
  $credFile = Join-Path $PSScriptRoot "..\envCrendentials_necessary.md"
  if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
      if ($line -match "^\s*$Key=(.+)$") { return $Matches[1].Trim() }
    }
  }
  if (Test-Path $credFile) {
    $raw = Get-Content $credFile -Raw
    $map = @{
      GITHUB_TOKEN = 'github'
      VERCEL_TOKEN = 'vercel'
      RENDER_API_KEY = 'render'
    }
    $alias = $map[$Key]
    if ($alias -and $raw -match "$alias=(\S+)") { return $Matches[1].Trim() }
  }
  return $null
}

function Get-AuthenticatedGitRemote {
  $token = Get-ScankroSecret "GITHUB_TOKEN"
  if (-not $token) { throw "GITHUB_TOKEN missing in .env or envCrendentials_necessary.md" }
  return "https://x-access-token:$token@github.com/yttest379-spec/scankro.git"
}
