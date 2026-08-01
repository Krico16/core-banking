# PowerShell helper script para Windows
# Equivalente a los targets del Makefile

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("up", "down", "stop", "status", "health", "test", "test-app", "migrate", "seed", "lint", "build", "logs", "ps", "clean", "psql", "rpk-cluster", "rpk-topics")]
    [string]$Command,

    [string]$name = ""
)

$ComposeFile = "compose.yaml"

switch ($Command) {
    "up" { docker compose -f $ComposeFile up -d --build }
    "down" { docker compose -f $ComposeFile down --volumes --remove-orphans }
    "stop" { docker compose -f $ComposeFile stop }
    "status" { docker compose -f $ComposeFile ps }
    "health" { docker compose -f $ComposeFile ps --format json | ConvertFrom-Json | Select-Object Name, State, Health, Status | Format-Table -AutoSize }
    "test" { Write-Host "TODO: implement per-service test runner" }
    "test-app" { Set-Location -LiteralPath "apps\$name"; npm test; Set-Location -LiteralPath $PSScriptRoot\.. }
    "migrate" { Set-Location -LiteralPath "apps\$name"; npm run migration:run; Set-Location -LiteralPath $PSScriptRoot\.. }
    "seed" { Write-Host "TODO: implement seed script" }
    "lint" { Set-Location -LiteralPath "apps\auth-service"; npm run lint; Set-Location -LiteralPath $PSScriptRoot\..; Set-Location -LiteralPath "apps\customer-service"; npm run lint; Set-Location -LiteralPath $PSScriptRoot\.. }
    "build" { docker compose -f $ComposeFile build }
    "logs" { docker compose -f $ComposeFile logs -f }
    "ps" { docker compose -f $ComposeFile ps }
    "clean" { docker compose -f $ComposeFile down --volumes --remove-orphans; docker volume ls -q | Where-Object { $_ -like "*banking*" } | ForEach-Object { docker volume rm $_ } }
    "psql" { psql postgresql://postgres:postgres@localhost:5432/postgres }
    "rpk-cluster" { rpk cluster info --brokers localhost:19092 }
    "rpk-topics" { rpk topic list --brokers localhost:19092 }
    default { Write-Host "Unknown command: $Command" }
}
