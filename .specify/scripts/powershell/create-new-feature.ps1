#!/usr/bin/env pwsh
# Create a new feature
[CmdletBinding()]
param(
    [switch]$Json,
    [string]$ShortName,
    [int]$Number = 0,
    [switch]$Help,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$FeatureDescription
)
$ErrorActionPreference = 'Stop'

if ($Help) {
    Write-Host "Usage: ./create-new-feature.ps1 [-Json] [-ShortName <name>] [-Number N] <feature description>"
    exit 0
}

if (-not $FeatureDescription -or $FeatureDescription.Count -eq 0) {
    Write-Error "Usage: ./create-new-feature.ps1 [-Json] [-ShortName <name>] <feature description>"
    exit 1
}

$featureDesc = ($FeatureDescription -join ' ').Trim()

function Find-RepositoryRoot {
    param([string]$StartDir, [string[]]$Markers = @('.git', '.specify'))
    $current = Resolve-Path $StartDir
    while ($true) {
        foreach ($marker in $Markers) {
            if (Test-Path (Join-Path $current $marker)) { return $current }
        }
        $parent = Split-Path $current -Parent
        if ($parent -eq $current) { return $null }
        $current = $parent
    }
}

function Get-HighestNumberFromSpecs {
    param([string]$SpecsDir)
    $highest = 0
    if (Test-Path $SpecsDir) {
        Get-ChildItem -Path $SpecsDir -Directory | ForEach-Object {
            if ($_.Name -match '^(\d+)') {
                $num = [int]$matches[1]
                if ($num -gt $highest) { $highest = $num }
            }
        }
    }
    return $highest
}

function Get-HighestNumberFromBranches {
    $highest = 0
    try {
        $branches = git branch -a 2>$null
        if ($LASTEXITCODE -eq 0) {
            foreach ($branch in $branches) {
                $cleanBranch = $branch.Trim() -replace '^\*?\s+', '' -replace '^remotes/[^/]+/', ''
                if ($cleanBranch -match '^(\d+)-') {
                    $num = [int]$matches[1]
                    if ($num -gt $highest) { $highest = $num }
                }
            }
        }
    } catch {}
    return $highest
}

function Get-NextBranchNumber {
    param([string]$SpecsDir)
    try { git fetch --all --prune 2>$null | Out-Null } catch {}
    $highestBranch = Get-HighestNumberFromBranches
    $highestSpec = Get-HighestNumberFromSpecs -SpecsDir $SpecsDir
    return [Math]::Max($highestBranch, $highestSpec) + 1
}

function ConvertTo-CleanBranchName {
    param([string]$Name)
    return $Name.ToLower() -replace '[^a-z0-9]', '-' -replace '-{2,}', '-' -replace '^-', '' -replace '-$', ''
}

$fallbackRoot = (Find-RepositoryRoot -StartDir $PSScriptRoot)
if (-not $fallbackRoot) { Write-Error "Error: Could not determine repository root."; exit 1 }

try {
    $repoRoot = git rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0) { $hasGit = $true } else { throw "Git not available" }
} catch { $repoRoot = $fallbackRoot; $hasGit = $false }

Set-Location $repoRoot
$specsDir = Join-Path $repoRoot 'specs'
New-Item -ItemType Directory -Path $specsDir -Force | Out-Null

function Get-BranchName {
    param([string]$Description)
    $stopWords = @('i','a','an','the','to','for','of','in','on','at','by','with','from','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','should','could','can','may','might','must','shall','this','that','these','those','my','your','our','their','want','need','add','get','set')
    $cleanName = $Description.ToLower() -replace '[^a-z0-9\s]', ' '
    $words = $cleanName -split '\s+' | Where-Object { $_ }
    $meaningfulWords = @()
    foreach ($word in $words) {
        if ($stopWords -contains $word) { continue }
        if ($word.Length -ge 3) { $meaningfulWords += $word }
        elseif ($Description -match "\b$($word.ToUpper())\b") { $meaningfulWords += $word }
    }
    if ($meaningfulWords.Count -gt 0) {
        $maxWords = if ($meaningfulWords.Count -eq 4) { 4 } else { 3 }
        return ($meaningfulWords | Select-Object -First $maxWords) -join '-'
    } else {
        $result = ConvertTo-CleanBranchName -Name $Description
        $fallbackWords = ($result -split '-') | Where-Object { $_ } | Select-Object -First 3
        return [string]::Join('-', $fallbackWords)
    }
}

if ($ShortName) { $branchSuffix = ConvertTo-CleanBranchName -Name $ShortName }
else { $branchSuffix = Get-BranchName -Description $featureDesc }

if ($Number -eq 0) {
    if ($hasGit) { $Number = Get-NextBranchNumber -SpecsDir $specsDir }
    else { $Number = (Get-HighestNumberFromSpecs -SpecsDir $specsDir) + 1 }
}

$featureNum = ('{0:000}' -f $Number)
$branchName = "$featureNum-$branchSuffix"

if ($hasGit) {
    try { git checkout -b $branchName | Out-Null } catch { Write-Warning "Failed to create git branch: $branchName" }
} else {
    Write-Warning "[specify] Warning: Git repository not detected; skipped branch creation for $branchName"
}

$featureDir = Join-Path $specsDir $branchName
New-Item -ItemType Directory -Path $featureDir -Force | Out-Null

$template = Join-Path $repoRoot '.specify/templates/spec-template.md'
$specFile = Join-Path $featureDir 'spec.md'
if (Test-Path $template) { Copy-Item $template $specFile -Force } 
else { New-Item -ItemType File -Path $specFile | Out-Null }

$env:SPECIFY_FEATURE = $branchName

if ($Json) {
    [PSCustomObject]@{ 
        BRANCH_NAME = $branchName; SPEC_FILE = $specFile
        FEATURE_NUM = $featureNum; HAS_GIT = $hasGit
    } | ConvertTo-Json -Compress
} else {
    Write-Output "BRANCH_NAME: $branchName"
    Write-Output "SPEC_FILE: $specFile"
}
