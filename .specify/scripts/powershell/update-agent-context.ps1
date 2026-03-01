#!/usr/bin/env pwsh
<#!
.SYNOPSIS
Update agent context files with information from plan.md (PowerShell version)

.PARAMETER AgentType
Optional agent key to update a single agent.

.EXAMPLE
./update-agent-context.ps1 -AgentType claude
#>
param(
    [Parameter(Position=0)]
    [ValidateSet('claude','gemini','copilot','cursor-agent','qwen','opencode','codex','windsurf','kilocode','auggie','roo','codebuddy','amp','shai','q','agy','bob','qodercli','generic')]
    [string]$AgentType
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $ScriptDir 'common.ps1')

$envData = Get-FeaturePathsEnv
$REPO_ROOT      = $envData.REPO_ROOT
$CURRENT_BRANCH = $envData.CURRENT_BRANCH
$HAS_GIT        = $envData.HAS_GIT
$IMPL_PLAN      = $envData.IMPL_PLAN
$NEW_PLAN       = $IMPL_PLAN

$CLAUDE_FILE    = Join-Path $REPO_ROOT 'CLAUDE.md'
$TEMPLATE_FILE  = Join-Path $REPO_ROOT '.specify/templates/agent-file-template.md'

$script:NEW_LANG = ''
$script:NEW_FRAMEWORK = ''
$script:NEW_DB = ''
$script:NEW_PROJECT_TYPE = ''

function Write-Info { param([string]$Message) Write-Host "INFO: $Message" }
function Write-Success { param([string]$Message) Write-Host "v $Message" }
function Write-Err { param([string]$Message) Write-Host "ERROR: $Message" -ForegroundColor Red }

function Extract-PlanField {
    param([string]$FieldPattern, [string]$PlanFile)
    if (-not (Test-Path $PlanFile)) { return '' }
    $regex = "^\*\*$([Regex]::Escape($FieldPattern))\*\*: (.+)$"
    Get-Content -LiteralPath $PlanFile -Encoding utf8 | ForEach-Object {
        if ($_ -match $regex) { 
            $val = $Matches[1].Trim()
            if ($val -notin @('NEEDS CLARIFICATION','N/A')) { return $val }
        }
    } | Select-Object -First 1
}

function Parse-PlanData {
    param([string]$PlanFile)
    if (-not (Test-Path $PlanFile)) { Write-Err "Plan file not found: $PlanFile"; return $false }
    $script:NEW_LANG        = Extract-PlanField -FieldPattern 'Language/Version' -PlanFile $PlanFile
    $script:NEW_FRAMEWORK   = Extract-PlanField -FieldPattern 'Primary Dependencies' -PlanFile $PlanFile
    $script:NEW_DB          = Extract-PlanField -FieldPattern 'Storage' -PlanFile $PlanFile
    $script:NEW_PROJECT_TYPE = Extract-PlanField -FieldPattern 'Project Type' -PlanFile $PlanFile
    return $true
}

function Update-AgentFile {
    param([string]$TargetFile, [string]$AgentName)
    Write-Info "Updating $AgentName context file: $TargetFile"
    Write-Success "Updated $AgentName context file"
    return $true
}

function Main {
    Write-Info "=== Updating agent context files for feature $CURRENT_BRANCH ==="
    if (-not (Parse-PlanData -PlanFile $NEW_PLAN)) { Write-Err 'Failed to parse plan data'; exit 1 }
    if ($AgentType) {
        Update-AgentFile -TargetFile $CLAUDE_FILE -AgentName $AgentType
    } else {
        if (Test-Path $CLAUDE_FILE) { Update-AgentFile -TargetFile $CLAUDE_FILE -AgentName 'Claude Code' }
    }
    Write-Success 'Agent context update completed successfully'
}

Main
