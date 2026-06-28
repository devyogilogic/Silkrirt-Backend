# deploy.ps1 -- Deploy Silkriti Backend to AWS Lambda
# Usage:
#   .\deploy.ps1                  (deploy to prod)
#   .\deploy.ps1 -Stage staging   (deploy to staging)
#   .\deploy.ps1 -CreateDomain    (first-time: provision api.silkriti.in in API Gateway)

param(
    [string]$Stage = "prod",
    [switch]$CreateDomain
)

$ErrorActionPreference = "Stop"

function Write-Step { param($msg) Write-Host "" ; Write-Host ">> $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "   [!!] $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "" ; Write-Host "[FAIL] $msg" -ForegroundColor Red ; Write-Host "" ; exit 1 }

function Set-EnvIfMissing {
    param([string]$Key, [string]$Prompt, [switch]$Secret)
    if ([System.Environment]::GetEnvironmentVariable($Key, "Process")) { return }
    if ($Secret) {
        $secure = Read-Host $Prompt -AsSecureString
        $plain  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                      [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
        [System.Environment]::SetEnvironmentVariable($Key, $plain, "Process")
    } else {
        $val = Read-Host $Prompt
        [System.Environment]::SetEnvironmentVariable($Key, $val, "Process")
    }
}

# ---- banner -----------------------------------------------------------------
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Silkriti Backend  ->  AWS Lambda Deploy      " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# ---- load .env.production ---------------------------------------------------
$envFile = Join-Path $PSScriptRoot ".env.production"
if (Test-Path $envFile) {
    Write-Step "Loading .env.production"
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*)$') {
            $k = $matches[1].Trim()
            $v = $matches[2].Trim().Trim('"').Trim("'")
            if ($k -and $v) {
                [System.Environment]::SetEnvironmentVariable($k, $v, "Process")
            }
        }
    }
    Write-Ok "Environment loaded"
} else {
    Write-Warn ".env.production not found -- will prompt for missing values"
    Write-Warn "Tip: create .env.production (see .env.production.example) to skip prompts"
}

# ---- check prerequisites ----------------------------------------------------
Write-Step "Checking prerequisites"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "Node.js not found. Install from https://nodejs.org"
}
Write-Ok "Node.js $(node --version)"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Fail "npm not found"
}
Write-Ok "npm $(npm --version)"

# ---- required environment variables ----------------------------------------
Write-Step "Checking environment variables"

Set-EnvIfMissing "MONGODB_URI" "Enter MONGODB_URI (mongodb+srv://...)" -Secret
Set-EnvIfMissing "JWT_SECRET"  "Enter JWT_SECRET"                      -Secret
Set-EnvIfMissing "AWS_BUCKET"  "Enter AWS_BUCKET (S3 bucket name)"

if (-not $env:AWS_PUBLIC_BASE_URL) {
    Write-Warn "AWS_PUBLIC_BASE_URL not set -- S3 URLs will use default bucket format"
}

Write-Ok "MONGODB_URI   = [hidden]"
Write-Ok "JWT_SECRET    = [hidden]"
Write-Ok "AWS_BUCKET    = $env:AWS_BUCKET"

# ---- check AWS credentials --------------------------------------------------
Write-Step "Checking AWS credentials"

$hasEnvCreds = $env:AWS_ACCESS_KEY_ID -and $env:AWS_SECRET_ACCESS_KEY
$hasCLICreds = $false

if (-not $hasEnvCreds) {
    $awsCheck = & aws sts get-caller-identity --output text 2>&1
    if ($LASTEXITCODE -eq 0) {
        $hasCLICreds = $true
    }
}

if (-not $hasEnvCreds -and -not $hasCLICreds) {
    Write-Host ""
    Write-Host "   AWS credentials not found. Choose an option:" -ForegroundColor Yellow
    Write-Host "   1) Enter Access Key ID + Secret (this session only)"
    Write-Host "   2) Quit and run 'aws configure' to set up the AWS CLI"
    Write-Host ""
    $choice = Read-Host "   Choice [1/2]"
    if ($choice -eq "1") {
        Set-EnvIfMissing "AWS_ACCESS_KEY_ID"     "Enter AWS Access Key ID"     -Secret
        Set-EnvIfMissing "AWS_SECRET_ACCESS_KEY" "Enter AWS Secret Access Key" -Secret
    } else {
        Write-Fail "Run 'aws configure' then re-run this script"
    }
} elseif ($hasEnvCreds) {
    Write-Ok "Using AWS credentials from .env.production"
} else {
    $identity = & aws sts get-caller-identity --query Arn --output text 2>&1
    Write-Ok "Using AWS CLI credentials -- $identity"
}

# ---- npm install ------------------------------------------------------------
Write-Step "Installing dependencies"

npm install
if ($LASTEXITCODE -ne 0) { Write-Fail "npm install failed" }
Write-Ok "Dependencies ready"

# ---- first-time: create custom domain --------------------------------------
if ($CreateDomain) {
    Write-Step "Creating custom domain api.silkriti.in in API Gateway (first-time only)"
    Write-Warn "Make sure the ACM certificate for api.silkriti.in is ISSUED in ap-south-1 first"
    Write-Host ""

    npx serverless create_domain --stage $Stage
    if ($LASTEXITCODE -ne 0) { Write-Fail "create_domain failed" }

    Write-Host ""
    Write-Ok "Domain created. Copy the 'AWS generated domain name' printed above."
    Write-Ok "Add a CNAME in your DNS provider:"
    Write-Ok "   api  ->  <the d-xxxxx.execute-api.ap-south-1.amazonaws.com value above>"
    Write-Host ""
    Write-Warn "DNS propagation can take up to 40 minutes."
    Write-Warn "After DNS is live, run .\deploy.ps1 (without -CreateDomain) to deploy."
    exit 0
}

# ---- deploy -----------------------------------------------------------------
Write-Step "Deploying to AWS Lambda (stage: $Stage)"
Write-Host ""

npx serverless deploy --stage $Stage
if ($LASTEXITCODE -ne 0) { Write-Fail "Deployment failed" }

# ---- done -------------------------------------------------------------------
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "   Deployment complete!                         " -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   API live at : https://api.silkriti.in" -ForegroundColor White
Write-Host "   Health check: https://api.silkriti.in/api/health" -ForegroundColor White
Write-Host ""
