<#
.SYNOPSIS
    RetroLab Dev Launcher. Like a Makefile but for PowerShell.

.DESCRIPTION
    Spin up all services or individual ones for local development.

.EXAMPLE
    .\make.ps1                  # Show help
    .\make.ps1 all              # Start everything
    .\make.ps1 web              # Start Next.js frontend only
    .\make.ps1 pipeline         # Start news pipeline (Docker)
    .\make.ps1 publisher        # Start publisher backend + frontend
    .\make.ps1 stop             # Stop all services
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet(
        "all", "web", "pipeline", "publisher", "pub-back", "pub-front",
        "stop", "stop-pipeline", "status", "logs-pipeline", "install",
        "build-web", "build-publisher", "deploy-web", "deploy-publisher", "deploy-pipeline",
        "help"
    )]
    [string]$Command = "help"
)

# =====================================================================
#  Paths
# =====================================================================
$Root        = $PSScriptRoot
$Pipeline    = Join-Path $Root "services\news-pipeline"
$PubBack     = Join-Path $Root "services\publisher\backend"
$PubFront    = Join-Path $Root "services\publisher\frontend"
$PubRoot     = Join-Path $Root "services\publisher"

# =====================================================================
#  Helpers
# =====================================================================
function Write-Banner {
    param([string]$Text)
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor DarkGray
    Write-Host "   $Text" -ForegroundColor Cyan
    Write-Host "  ============================================" -ForegroundColor DarkGray
    Write-Host ""
}

function Write-Step {
    param([string]$Icon, [string]$Text)
    Write-Host "  $Icon " -NoNewline -ForegroundColor Yellow
    Write-Host $Text -ForegroundColor White
}

function Write-Err {
    param([string]$Text)
    Write-Host "  [X] $Text" -ForegroundColor Red
}

function Write-Ok {
    param([string]$Text)
    Write-Host "  [OK] $Text" -ForegroundColor Green
}

# =====================================================================
#  Helpers
# =====================================================================

function Kill-Port {
    param([int]$Port)
    $pids = netstat -ano | Select-String ":$Port\s+.*LISTENING" | ForEach-Object {
        ($_.ToString().Trim() -split '\s+')[-1]
    } | Sort-Object -Unique
    foreach ($p in $pids) {
        if ($p -and $p -ne '0') {
            try {
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                Write-Host "    Killed old process on port $Port (PID $p)" -ForegroundColor DarkGray
            } catch {}
        }
    }
}

# =====================================================================
#  Commands
# =====================================================================

function Start-Web {
    Write-Banner "Starting Next.js Frontend (port 3001)"
    Kill-Port 3001
    Write-Step ">>" "npm run dev  ->  http://localhost:3001"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root'; npm run dev" -WindowStyle Normal
    Write-Ok "Next.js started in a new terminal."
}

function Start-PubBackend {
    Write-Banner "Starting Publisher Backend (port 8001)"
    Write-Step ">>" "uvicorn  ->  http://localhost:8001"

    $venvActivate = Join-Path $PubRoot ".venv\Scripts\Activate.ps1"
    if (-not (Test-Path $venvActivate)) {
        Write-Err "No .venv found in $PubRoot -- run '.\make.ps1 install' first."
        return
    }

    Kill-Port 8001
    $cmd = "Set-Location '$PubRoot'; & '$venvActivate'; uvicorn backend.main:app --host 127.0.0.1 --port 8001 --reload"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd -WindowStyle Normal
    Write-Ok "Publisher backend started in a new terminal."
}

function Start-PubFrontend {
    Write-Banner "Starting Publisher Frontend (port 3000)"
    Kill-Port 3000
    Write-Step ">>" "vite dev  ->  http://localhost:3000"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PubFront'; npm run dev" -WindowStyle Normal
    Write-Ok "Publisher frontend started in a new terminal."
}

function Start-Publisher {
    Start-PubBackend
    Start-PubFrontend
}

function Start-Pipeline {
    Write-Banner "Starting News Pipeline (Docker Compose)"
    Write-Step ">>" "docker compose up -d  (postgres, redis, worker, beat, api)"

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Err "Docker is not installed or not in PATH."
        return
    }

    Push-Location $Pipeline
    try {
        # Use cmd /c to avoid PowerShell treating stderr warnings as errors
        $output = cmd /c "docker compose up -d --build 2>&1"
        $output | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        if ($LASTEXITCODE -ne 0) {
            Write-Err "docker compose exited with code $LASTEXITCODE (check port conflicts)"
        } else {
            Write-Ok "Pipeline containers started."
        }
        Write-Host ""
        cmd /c "docker compose ps 2>&1" | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
    finally {
        Pop-Location
    }
}

function Stop-Pipeline {
    Write-Banner "Stopping News Pipeline"
    Push-Location $Pipeline
    try {
        cmd /c "docker compose down 2>&1" | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        Write-Ok "Pipeline containers stopped."
    }
    finally {
        Pop-Location
    }
}

function Show-PipelineLogs {
    Write-Banner "Pipeline Logs (Ctrl+C to exit)"
    Push-Location $Pipeline
    try {
        docker compose logs -f --tail 50
    }
    finally {
        Pop-Location
    }
}

function Start-All {
    Write-Banner "Starting ALL RetroLab Services"
    Start-Web
    Start-Publisher
    Start-Pipeline
    Write-Host ""
    Write-Ok "All services launched!"
    Write-Host ""
    Write-Host "  +---------------------------------------------------+" -ForegroundColor DarkGray
    Write-Host "  |  Next.js Frontend    ->  http://localhost:3001     |" -ForegroundColor White
    Write-Host "  |  Publisher Frontend  ->  http://localhost:3000     |" -ForegroundColor White
    Write-Host "  |  Publisher Backend   ->  http://localhost:8001     |" -ForegroundColor White
    Write-Host "  |  Pipeline API        ->  http://localhost:8002     |" -ForegroundColor White
    Write-Host "  |  PostgreSQL          ->  localhost:5432            |" -ForegroundColor White
    Write-Host "  |  Redis               ->  localhost:6379            |" -ForegroundColor White
    Write-Host "  +---------------------------------------------------+" -ForegroundColor DarkGray
    Write-Host ""
}

function Stop-All {
    Write-Banner "Stopping ALL RetroLab Services"

    # Stop Docker pipeline
    Write-Step ">>" "Stopping pipeline containers..."
    Push-Location $Pipeline
    try { cmd /c "docker compose down 2>&1" | Out-Null } finally { Pop-Location }

    # Kill Node/Python dev processes on known ports
    Write-Step ">>" "Killing processes on ports 3000, 3001, 8001..."
    @(3000, 3001, 8001, 8002) | ForEach-Object {
        $port = $_
        $pids = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique
        foreach ($procId in $pids) {
            if ($procId -and $procId -ne 0) {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Write-Host "    Killed PID $procId on port $port" -ForegroundColor DarkYellow
            }
        }
    }

    Write-Ok "All services stopped."
}

function Show-Status {
    Write-Banner "Service Status"

    $ports = @(
        @{ Name = "Next.js Frontend";   Port = 3001 },
        @{ Name = "Publisher Frontend";  Port = 3000 },
        @{ Name = "Publisher Backend";   Port = 8001 },
        @{ Name = "Pipeline API";       Port = 8002 },
        @{ Name = "PostgreSQL";         Port = 5432 },
        @{ Name = "Redis";              Port = 6379 }
    )

    foreach ($svc in $ports) {
        $conn = Get-NetTCPConnection -LocalPort $svc.Port -ErrorAction SilentlyContinue |
                Where-Object { $_.State -eq 'Listen' }
        if ($conn) {
            Write-Ok "$($svc.Name) (port $($svc.Port)) -- running"
        }
        else {
            Write-Host "  [ ] $($svc.Name) (port $($svc.Port)) -- stopped" -ForegroundColor DarkGray
        }
    }
    Write-Host ""
}

function Install-All {
    Write-Banner "Installing Dependencies"

    # Next.js root
    Write-Step ">>" "Installing Next.js dependencies..."
    Push-Location $Root
    try { npm install } finally { Pop-Location }

    # Publisher frontend
    Write-Step ">>" "Installing Publisher frontend dependencies..."
    Push-Location $PubFront
    try { npm install } finally { Pop-Location }

    # Publisher backend venv
    Write-Step ">>" "Setting up Publisher Python venv..."
    if (-not (Test-Path (Join-Path $PubRoot ".venv"))) {
        python -m venv (Join-Path $PubRoot ".venv")
    }
    $pipExe = Join-Path $PubRoot ".venv\Scripts\pip.exe"
    & $pipExe install -r (Join-Path $PubBack "requirements.txt")
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Failed to install from requirements.txt"
    }

    # Copy .env.example → .env if missing
    $envFiles = @(
        @{ Example = Join-Path $PubRoot ".env.example"; Target = Join-Path $PubRoot ".env" },
        @{ Example = Join-Path $Pipeline ".env.example"; Target = Join-Path $Pipeline ".env" }
    )
    foreach ($ef in $envFiles) {
        if (-not (Test-Path $ef.Target) -and (Test-Path $ef.Example)) {
            Copy-Item $ef.Example $ef.Target
            Write-Step ">>" "Created $($ef.Target) from .env.example - edit it with your API keys!"
        }
    }

    # News pipeline venv (for local dev without Docker)
    Write-Step ">>" "Setting up Pipeline Python venv..."
    if (-not (Test-Path (Join-Path $Pipeline ".venv"))) {
        python -m venv (Join-Path $Pipeline ".venv")
    }
    $pipExe2 = Join-Path $Pipeline ".venv\Scripts\pip.exe"
    & $pipExe2 install -e "$Pipeline[dev]"

    Write-Host ""
    Write-Ok "All dependencies installed!"
}

function Show-Help {
    Write-Host ""
    Write-Host "  +-----------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "  |         RetroLab Dev Launcher (make.ps1)             |" -ForegroundColor Cyan
    Write-Host "  +-----------------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  USAGE:  " -NoNewline -ForegroundColor White
    Write-Host '.\make.ps1 [command]' -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  -- Start Services ------------------------------------" -ForegroundColor DarkGray
    Write-Host "    all             " -NoNewline -ForegroundColor Green
    Write-Host "Start everything (web + publisher + pipeline)"
    Write-Host "    web             " -NoNewline -ForegroundColor Green
    Write-Host "Start Next.js frontend (port 3001)"
    Write-Host "    publisher       " -NoNewline -ForegroundColor Green
    Write-Host "Start publisher backend + frontend"
    Write-Host "    pub-back        " -NoNewline -ForegroundColor Green
    Write-Host "Start publisher backend only (port 8001)"
    Write-Host "    pub-front       " -NoNewline -ForegroundColor Green
    Write-Host "Start publisher frontend only (port 3000)"
    Write-Host "    pipeline        " -NoNewline -ForegroundColor Green
    Write-Host "Start news pipeline via Docker Compose"
    Write-Host ""
    Write-Host "  -- Manage --------------------------------------------" -ForegroundColor DarkGray
    Write-Host "    stop            " -NoNewline -ForegroundColor Red
    Write-Host "Stop ALL services (Docker + dev servers)"
    Write-Host "    stop-pipeline   " -NoNewline -ForegroundColor Red
    Write-Host "Stop only pipeline Docker containers"
    Write-Host "    status          " -NoNewline -ForegroundColor Cyan
    Write-Host "Check which services are running"
    Write-Host "    logs-pipeline   " -NoNewline -ForegroundColor Cyan
    Write-Host "Tail pipeline Docker logs"
    Write-Host "    install         " -NoNewline -ForegroundColor Magenta
    Write-Host "Install all dependencies (npm + pip)"
    Write-Host ""
    Write-Host "  -- Docker Build `& Deploy ---------------------------------" -ForegroundColor DarkGray
    Write-Host "    build-web       " -NoNewline -ForegroundColor Green
    Write-Host "Build Next.js Docker image"
    Write-Host "    build-publisher " -NoNewline -ForegroundColor Green
    Write-Host "Build Publisher Docker image"
    Write-Host "    deploy-web      " -NoNewline -ForegroundColor Yellow
    Write-Host "Deploy blog to Cloud Run"
    Write-Host "    deploy-publisher" -NoNewline -ForegroundColor Yellow
    Write-Host " Deploy publisher to Cloud Run"
    Write-Host "    deploy-pipeline " -NoNewline -ForegroundColor Yellow
    Write-Host "Deploy pipeline to Linux server"
    Write-Host ""
}

# =====================================================================
#  Docker Build
# =====================================================================

function Build-Web {
    Write-Banner "Building Next.js Docker Image"
    # Load .env for build args
    $envFile = Join-Path $Root ".env"
    $envVars = @{}
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^([^#=]+)=(.*)$') { $envVars[$Matches[1].Trim()] = $Matches[2].Trim() }
        }
    }
    $buildArgs = @(
        "--build-arg", "NOTION_API_KEY=$($envVars['NOTION_API_KEY'])",
        "--build-arg", "NOTION_DATABASE_ID=$($envVars['NOTION_DATABASE_ID'])",
        "--build-arg", "NEXT_PUBLIC_SUPABASE_URL=$($envVars['NEXT_PUBLIC_SUPABASE_URL'])",
        "--build-arg", "NEXT_PUBLIC_SUPABASE_ANON_KEY=$($envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'])"
    )
    docker build -f "$Root\Dockerfile.web" @buildArgs -t retrolab-web $Root
    Write-Ok "retrolab-web built."
}

function Build-Publisher {
    Write-Banner "Building Publisher Docker Image"
    docker build -f "$Root\Dockerfile.publisher" -t retrolab-publisher $Root
    Write-Ok "retrolab-publisher built."
}

function Deploy-Web {
    Write-Banner "Deploying Blog to Cloud Run"
    Build-Web
    $region = $(if ($env:GCP_REGION) { $env:GCP_REGION } else { "asia-southeast1" })
    $project = gcloud config get-value project 2>$null
    $image = "$region-docker.pkg.dev/$project/retrolab/web:latest"
    docker tag retrolab-web $image
    docker push $image
    gcloud run deploy retrolab-web --image $image --region $region --platform managed --allow-unauthenticated --port 3001 --memory 512Mi
    Write-Ok "Blog deployed to Cloud Run."
}

function Deploy-Publisher {
    Write-Banner "Deploying Publisher to Cloud Run"
    Build-Publisher
    $region = $(if ($env:GCP_REGION) { $env:GCP_REGION } else { "asia-southeast1" })
    $project = gcloud config get-value project 2>$null
    $image = "$region-docker.pkg.dev/$project/retrolab/publisher:latest"
    docker tag retrolab-publisher $image
    docker push $image
    gcloud run deploy retrolab-publisher --image $image --region $region --platform managed --allow-unauthenticated --port 8001 --memory 1Gi
    Write-Ok "Publisher deployed to Cloud Run."
}

function Deploy-Pipeline {
    Write-Banner "Deploying Pipeline to Linux Server"
    $sshHost = $(if ($env:PIPELINE_HOST) { $env:PIPELINE_HOST } else { 'user@your-server-ip' })
    Write-Step ">>" "Syncing to $sshHost..."
    rsync -avz --delete --exclude '.venv' --exclude '__pycache__' --exclude '.git' --exclude '.env' "$Pipeline/" "${sshHost}:~/news-pipeline/"
    Write-Step ">>" "Starting containers..."
    ssh $sshHost 'cd ~/news-pipeline && docker compose up -d --build'
    Write-Ok "Pipeline deployed to $sshHost."
}

# =====================================================================
#  Router
# =====================================================================
switch ($Command) {
    "all"              { Start-All }
    "web"              { Start-Web }
    "pipeline"         { Start-Pipeline }
    "publisher"        { Start-Publisher }
    "pub-back"         { Start-PubBackend }
    "pub-front"        { Start-PubFrontend }
    "stop"             { Stop-All }
    "stop-pipeline"    { Stop-Pipeline }
    "status"           { Show-Status }
    "logs-pipeline"    { Show-PipelineLogs }
    "install"          { Install-All }
    "build-web"        { Build-Web }
    "build-publisher"  { Build-Publisher }
    "deploy-web"       { Deploy-Web }
    "deploy-publisher" { Deploy-Publisher }
    "deploy-pipeline"  { Deploy-Pipeline }
    "help"             { Show-Help }
}
