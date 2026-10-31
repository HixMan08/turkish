$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Установите Node.js LTS вместе с npm, затем откройте терминал заново.' }
if (-not (Test-Path -LiteralPath node_modules)) { npm install; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
npm run dev
