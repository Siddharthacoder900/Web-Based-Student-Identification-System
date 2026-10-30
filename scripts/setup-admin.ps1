param(
  [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
$packagePath = Join-Path $projectRoot 'package.json'
$bootstrapPath = Join-Path $projectRoot 'server\scripts\create-admin.js'
$gitIgnorePath = Join-Path $projectRoot '.gitignore'
$createdEnvironment = $false

function ConvertFrom-SecureInput {
  param([Parameter(Mandatory = $true)][Security.SecureString]$Value)
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Read-RequiredText {
  param([Parameter(Mandatory = $true)][string]$Prompt)
  do {
    $value = (Read-Host $Prompt).Trim()
    if (-not $value) { Write-Host 'A value is required.' -ForegroundColor Yellow }
  } while (-not $value)
  return $value
}

Push-Location $projectRoot
try {
  if (-not (Test-Path -LiteralPath $packagePath) -or -not (Test-Path -LiteralPath $bootstrapPath)) {
    throw 'The BIET project package.json or server/scripts/create-admin.js was not found.'
  }
  $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
  if ($package.scripts.'create-admin' -ne 'node server/scripts/create-admin.js') {
    throw 'The package.json create-admin script does not match the expected BIET bootstrap command.'
  }

  $ignoreLines = @()
  if (Test-Path -LiteralPath $gitIgnorePath) {
    $ignoreLines = @(Get-Content -LiteralPath $gitIgnorePath)
  }
  if ($ignoreLines -notcontains '.env') {
    Add-Content -LiteralPath $gitIgnorePath -Value '.env' -Encoding UTF8
  }

  if ($ValidateOnly) {
    Write-Host 'Setup wizard validated: project root, create-admin command, and .env Git exclusion are ready.' -ForegroundColor Green
    Write-Host "Environment file exists: $(Test-Path -LiteralPath $envPath)"
    return
  }

  if (-not (Test-Path -LiteralPath $envPath)) {
    Write-Host 'Enter the MongoDB Atlas connection string from your Atlas Connect dialog.' -ForegroundColor Cyan
    Write-Host 'Use the database user credentials, not your Atlas website sign-in. Percent-encode reserved password characters.' -ForegroundColor Cyan
    $mongoUri = ConvertFrom-SecureInput (Read-Host 'MongoDB Atlas URI (input hidden)' -AsSecureString)
    if ($mongoUri -notmatch '^mongodb(\+srv)?://\S+$' -or $mongoUri -match '["\r\n]') {
      throw 'The MongoDB URI format is invalid. Expected mongodb:// or mongodb+srv:// without spaces or quotes.'
    }

    $secretBytes = New-Object byte[] 48
    $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
      $randomGenerator.GetBytes($secretBytes)
      $jwtSecret = [Convert]::ToBase64String($secretBytes)
    }
    finally {
      [Array]::Clear($secretBytes, 0, $secretBytes.Length)
      $randomGenerator.Dispose()
    }

    $environment = @(
      'NODE_ENV=development'
      'PORT=5001'
      "MONGODB_URI=$mongoUri"
      "JWT_SECRET=$jwtSecret"
      'JWT_EXPIRES_IN=8h'
      'FRONTEND_ORIGINS=http://localhost:5173'
      'PUBLIC_APP_URL=http://localhost:5173'
    ) -join "`n"
    $bytes = (New-Object Text.UTF8Encoding($false)).GetBytes("$environment`n")
    $fileStream = $null
    try {
      $fileStream = [IO.File]::Open($envPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
      $fileStream.Write($bytes, 0, $bytes.Length)
    }
    finally {
      if ($fileStream) { $fileStream.Dispose() }
      [Array]::Clear($bytes, 0, $bytes.Length)
    }
    $mongoUri = $null
    $jwtSecret = $null
    $createdEnvironment = $true
    Write-Host 'Created .env with a new cryptographically random JWT secret. The secret was not displayed.' -ForegroundColor Green
  }
  else {
    Write-Host 'Existing .env found; it will be reused and not overwritten.' -ForegroundColor Yellow
    $environmentText = Get-Content -LiteralPath $envPath -Raw
    $mongoMatch = [regex]::Match($environmentText, '(?m)^\s*MONGODB_URI\s*=\s*(.+?)\s*$')
    $jwtMatch = [regex]::Match($environmentText, '(?m)^\s*JWT_SECRET\s*=\s*(.+?)\s*$')
    if (-not $mongoMatch.Success -or $mongoMatch.Groups[1].Value -notmatch '^["'']?mongodb(\+srv)?://\S+') {
      throw 'The existing .env does not contain a valid MONGODB_URI. It was not changed; correct it locally and rerun setup.'
    }
    if (-not $jwtMatch.Success -or $jwtMatch.Groups[1].Value.Trim('"', "'").Length -lt 32) {
      throw 'The existing .env does not contain a JWT_SECRET of at least 32 characters. It was not changed; correct it locally and rerun setup.'
    }
    $environmentText = $null
    $mongoMatch = $null
    $jwtMatch = $null
  }

  $adminName = Read-RequiredText 'Administrator display name'
  $adminEmail = Read-RequiredText 'Administrator email'
  if ($adminEmail -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
    throw 'Enter a valid administrator email address.'
  }

  $password = Read-Host 'New unique administrator password (at least 12 characters; input hidden)' -AsSecureString
  $passwordConfirmation = Read-Host 'Confirm administrator password (input hidden)' -AsSecureString
  $plainPassword = ConvertFrom-SecureInput $password
  $confirmedPassword = ConvertFrom-SecureInput $passwordConfirmation
  if ($plainPassword.Length -lt 12) { throw 'Administrator password must contain at least 12 characters.' }
  if ($plainPassword -cne $confirmedPassword) { throw 'The passwords did not match.' }

  $env:ADMIN_NAME = $adminName
  $env:ADMIN_EMAIL = $adminEmail
  $env:ADMIN_PASSWORD = $plainPassword
  Write-Host 'Connecting to MongoDB and creating the initial administrator…' -ForegroundColor Cyan
  & npm.cmd run create-admin
  if ($LASTEXITCODE -ne 0) {
    throw 'Administrator setup failed. Check Atlas network access, database user permissions, and the URI in .env; then rerun this script.'
  }

  Write-Host 'Administrator created. Start the API and frontend using the commands in README.md.' -ForegroundColor Green
}
catch {
  Write-Error $_
  if ($createdEnvironment) {
    Write-Host 'The generated .env was retained for retry. It is ignored by Git and was not printed.' -ForegroundColor Yellow
  }
  exit 1
}
finally {
  $env:ADMIN_NAME = $null
  $env:ADMIN_EMAIL = $null
  $env:ADMIN_PASSWORD = $null
  if ($plainPassword) {
    $plainPassword = $null
    $confirmedPassword = $null
  }
  $mongoUri = $null
  $jwtSecret = $null
  $environment = $null
  $environmentText = $null
  if ($password) { $password.Dispose() }
  if ($passwordConfirmation) { $passwordConfirmation.Dispose() }
  Pop-Location
}
