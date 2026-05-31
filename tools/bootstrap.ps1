$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

Write-Host "[bootstrap] repo: $RootDir"

if (Test-Path ".nvmrc") {
  $nvm = Get-Command nvm -ErrorAction SilentlyContinue
  if ($null -ne $nvm) {
    $nodeVer = (Get-Content ".nvmrc" | Select-Object -First 1).Trim()
    if ($nodeVer) {
      Write-Host "[bootstrap] using nvm version $nodeVer"
      nvm install $nodeVer | Out-Host
      nvm use $nodeVer | Out-Host
    }
  } else {
    Write-Host "[bootstrap] .nvmrc present but nvm not found; continuing with current node"
  }
}

Write-Host ("[bootstrap] node: " + (node -v))
Write-Host ("[bootstrap] npm:  " + (npm -v))

Write-Host "[bootstrap] enabling corepack (yarn via corepack)"
corepack enable | Out-Host

Write-Host "[bootstrap] installing dependencies with yarn"
try {
  yarn install --immutable | Out-Host
} catch {
  yarn install | Out-Host
}

Write-Host "[bootstrap] fetching toolchain/external deps"
npm run fetch-deps | Out-Host

Write-Host "[bootstrap] starting app"
npm start | Out-Host
