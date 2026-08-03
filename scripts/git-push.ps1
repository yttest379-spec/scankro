# Push main to GitHub without browser prompts
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\_secrets.ps1"

$remote = Get-AuthenticatedGitRemote
$env:GIT_TERMINAL_PROMPT = "0"

# Keep stored origin token-free; push via one-shot URL
git push $remote HEAD:main
Write-Host "Pushed to origin/main"
