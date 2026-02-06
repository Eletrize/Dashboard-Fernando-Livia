param(
  [string]$OutputFolder = "PACOTE_TRANSFERENCIA_COMPLETO"
)

$ErrorActionPreference = "Stop"

function Get-RelativePath {
  param(
    [Parameter(Mandatory = $true)][string]$BasePath,
    [Parameter(Mandatory = $true)][string]$TargetPath
  )
  $fullBase = [System.IO.Path]::GetFullPath($BasePath)
  $fullTarget = [System.IO.Path]::GetFullPath($TargetPath)

  if (-not $fullBase.EndsWith("\")) {
    $fullBase = "$fullBase\"
  }

  $baseUri = New-Object System.Uri($fullBase)
  $targetUri = New-Object System.Uri($fullTarget)
  $relativeUri = $baseUri.MakeRelativeUri($targetUri)
  $relativePath = [System.Uri]::UnescapeDataString($relativeUri.ToString())

  return $relativePath.Replace("/", "\")
}

function Add-NumberedList {
  param(
    [Parameter(Mandatory = $true)][System.Text.StringBuilder]$Builder,
    [Parameter(Mandatory = $true)][System.Collections.IEnumerable]$Items
  )

  $index = 1
  foreach ($item in $Items) {
    if ([string]::IsNullOrWhiteSpace([string]$item)) { continue }
    [void]$Builder.AppendLine("$index. $item")
    $index++
  }

  if ($index -eq 1) {
    [void]$Builder.AppendLine("1. (sem dados)")
  }
}

function Parse-AttrMatchesPerLine {
  param(
    [Parameter(Mandatory = $true)][AllowNull()][AllowEmptyCollection()][AllowEmptyString()][string[]]$Lines,
    [Parameter(Mandatory = $true)][string]$Pattern,
    [Parameter(Mandatory = $true)][string]$FieldName
  )

  $items = New-Object System.Collections.Generic.List[object]

  if ($null -eq $Lines) {
    $Lines = @()
  }

  for ($i = 0; $i -lt $Lines.Count; $i++) {
    $line = $Lines[$i]
    $matches = [regex]::Matches($line, $Pattern)
    foreach ($m in $matches) {
      $items.Add([pscustomobject]@{
          Linha   = $i + 1
          $FieldName = $m.Groups[1].Value
          Trecho  = $line.Trim()
        })
    }
  }

  return $items
}

function Test-IsExcludedPath {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string[]]$ExcludedNames
  )

  foreach ($name in $ExcludedNames) {
    $escaped = [regex]::Escape($name)
    if ($Path -match "(^|[\\/])$escaped([\\/]|$)") {
      return $true
    }
  }

  return $false
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$repoRootPath = $repoRoot.Path
$outputDir = Join-Path $repoRootPath $OutputFolder

if (Test-Path $outputDir) {
  try {
    Remove-Item -Path $outputDir -Recurse -Force -ErrorAction Stop
  } catch {
    $fallbackName = "{0}_{1}" -f $OutputFolder, (Get-Date -Format "yyyyMMdd_HHmmss")
    Write-Warning "Nao foi possivel remover $OutputFolder. Gerando em nova pasta: $fallbackName"
    $OutputFolder = $fallbackName
    $outputDir = Join-Path $repoRootPath $OutputFolder
  }
}

$packageFolders = @(
  "fotos_exclusivas",
  "inventarios",
  "fonte_completa"
)

New-Item -Path $outputDir -ItemType Directory -Force | Out-Null
foreach ($folder in $packageFolders) {
  New-Item -Path (Join-Path $outputDir $folder) -ItemType Directory -Force | Out-Null
}

$excludedDirectories = @(".git", ".venv", "node_modules", $OutputFolder)

$sourceFiles = Get-ChildItem -Path $repoRootPath -Recurse -File | Where-Object {
  -not (Test-IsExcludedPath -Path $_.FullName -ExcludedNames $excludedDirectories)
}

foreach ($file in $sourceFiles) {
  $relativePath = Get-RelativePath -BasePath $repoRootPath -TargetPath $file.FullName
  if ($relativePath.StartsWith("$OutputFolder\")) { continue }

  $destPath = Join-Path (Join-Path $outputDir "fonte_completa") $relativePath
  $destFolder = Split-Path -Path $destPath -Parent
  if (-not (Test-Path $destFolder)) {
    New-Item -Path $destFolder -ItemType Directory -Force | Out-Null
  }
  Copy-Item -Path $file.FullName -Destination $destPath -Force
}

$photoSource = Join-Path $repoRootPath "images\Images"
$photoDestination = Join-Path $outputDir "fotos_exclusivas"
if (Test-Path $photoSource) {
  Copy-Item -Path (Join-Path $photoSource "*") -Destination $photoDestination -Force
}

$photoFiles = @()
if (Test-Path $photoDestination) {
  $photoFiles = Get-ChildItem -Path $photoDestination -File | Sort-Object Name
}

$inventoryDir = Join-Path $outputDir "inventarios"

$fileInventory = $sourceFiles | Sort-Object FullName | ForEach-Object {
  [pscustomobject]@{
    ArquivoRelativo = Get-RelativePath -BasePath $repoRootPath -TargetPath $_.FullName
    TamanhoBytes = $_.Length
    UltimaModificacao = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
  }
}
$fileInventory | Export-Csv -Path (Join-Path $inventoryDir "arquivos_programa.csv") -NoTypeInformation -Encoding UTF8

$indexPath = Join-Path $repoRootPath "index.html"
$indexLines = @()
if (Test-Path $indexPath) {
  $indexLines = Get-Content -Path $indexPath -Encoding UTF8
}

$idMatches = Parse-AttrMatchesPerLine -Lines $indexLines -Pattern '(?<![\w-])id\s*=\s*["'']([^"'']+)["'']' -FieldName "Id"
$idMatches | Sort-Object Id, Linha | Export-Csv -Path (Join-Path $inventoryDir "ids_html.csv") -NoTypeInformation -Encoding UTF8

$deviceIdMatches = Parse-AttrMatchesPerLine -Lines $indexLines -Pattern '\bdata-device-id\s*=\s*["'']([^"'']+)["'']' -FieldName "DataDeviceId"
$deviceIdMatches | Sort-Object DataDeviceId, Linha | Export-Csv -Path (Join-Path $inventoryDir "data_device_id.csv") -NoTypeInformation -Encoding UTF8

$deviceIdsMatches = Parse-AttrMatchesPerLine -Lines $indexLines -Pattern '\bdata-device-ids\s*=\s*["'']([^"'']+)["'']' -FieldName "DataDeviceIds"
$expandedDeviceIds = New-Object System.Collections.Generic.List[object]
foreach ($item in $deviceIdsMatches) {
  $parts = [string]$item.DataDeviceIds -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
  foreach ($part in $parts) {
    $expandedDeviceIds.Add([pscustomobject]@{
        Linha = $item.Linha
        DataDeviceId = $part
        Origem = $item.DataDeviceIds
      })
  }
}
$expandedDeviceIdsPath = Join-Path $inventoryDir "data_device_ids_expandido.csv"
if ($expandedDeviceIds.Count -gt 0) {
  $expandedDeviceIds | Sort-Object DataDeviceId, Linha | Export-Csv -Path $expandedDeviceIdsPath -NoTypeInformation -Encoding UTF8
} else {
  "Linha,DataDeviceId,Origem" | Set-Content -Path $expandedDeviceIdsPath -Encoding UTF8
}

$linkItems = New-Object System.Collections.Generic.List[object]
for ($i = 0; $i -lt $indexLines.Count; $i++) {
  $line = $indexLines[$i]

  foreach ($m in [regex]::Matches($line, '(?:href|src|action)\s*=\s*["'']([^"'']+)["'']')) {
    $linkItems.Add([pscustomobject]@{
        Linha = $i + 1
        Link = $m.Groups[1].Value
        Tipo = "href/src/action"
        Trecho = $line.Trim()
      })
  }

  foreach ($m in [regex]::Matches($line, '\bsrcset\s*=\s*["'']([^"'']+)["'']')) {
    $rawSet = $m.Groups[1].Value
    $srcsetParts = $rawSet -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
    foreach ($part in $srcsetParts) {
      $linkValue = ($part -split "\s+")[0].Trim()
      if ($linkValue) {
        $linkItems.Add([pscustomobject]@{
            Linha = $i + 1
            Link = $linkValue
            Tipo = "srcset"
            Trecho = $line.Trim()
          })
      }
    }
  }
}
$linkItems | Sort-Object Link, Linha | Export-Csv -Path (Join-Path $inventoryDir "links_index.csv") -NoTypeInformation -Encoding UTF8

$textExtensions = @(".html", ".js", ".md", ".json", ".toml", ".ps1", ".sh", ".txt", ".css", ".yml", ".yaml")
$textFiles = $sourceFiles | Where-Object { $textExtensions -contains $_.Extension.ToLowerInvariant() }

$externalUrls = New-Object System.Collections.Generic.List[object]
$routeUrls = New-Object System.Collections.Generic.List[object]

foreach ($file in $textFiles) {
  $relativeFile = Get-RelativePath -BasePath $repoRootPath -TargetPath $file.FullName
  $lines = @()
  try {
    $lines = Get-Content -Path $file.FullName -Encoding UTF8
  } catch {
    continue
  }

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    foreach ($m in [regex]::Matches($line, 'https?://[^\s"''<>()]+')) {
      $externalUrls.Add([pscustomobject]@{
          Arquivo = $relativeFile
          Linha = $i + 1
          Url = $m.Value.TrimEnd(".", ",", ";")
        })
    }

    foreach ($m in [regex]::Matches($line, '(?:"|''|`)(/webhook/[A-Za-z0-9_\-\/\.\?\=&]+|/functions/[A-Za-z0-9_\-\/\.\?\=&]+|/polling[A-Za-z0-9_\-\/\.\?\=&]*)(?:"|''|`)')) {
      $routeUrls.Add([pscustomobject]@{
          Arquivo = $relativeFile
          Linha = $i + 1
          Url = $m.Groups[1].Value
        })
    }
  }
}

$externalUrls | Sort-Object Url, Arquivo, Linha | Export-Csv -Path (Join-Path $inventoryDir "urls_externas.csv") -NoTypeInformation -Encoding UTF8
$routeUrls | Sort-Object Url, Arquivo, Linha | Export-Csv -Path (Join-Path $inventoryDir "urls_rotas_locais.csv") -NoTypeInformation -Encoding UTF8

$jsFiles = $sourceFiles | Where-Object { $_.Extension.ToLowerInvariant() -eq ".js" }

$hubCommandsInCode = New-Object System.Collections.Generic.List[object]
$idConstantsInCode = New-Object System.Collections.Generic.List[object]

foreach ($file in $jsFiles) {
  $relativeFile = Get-RelativePath -BasePath $repoRootPath -TargetPath $file.FullName
  $lines = @()
  try {
    $lines = Get-Content -Path $file.FullName -Encoding UTF8
  } catch {
    continue
  }

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]

    foreach ($m in [regex]::Matches($line, 'sendHubitatCommand\(\s*[^,]+,\s*["'']([^"'']+)["'']')) {
      $hubCommandsInCode.Add([pscustomobject]@{
          Arquivo = $relativeFile
          Linha = $i + 1
          Comando = $m.Groups[1].Value
          Trecho = $line.Trim()
        })
    }

    foreach ($m in [regex]::Matches($line, '\b(?:const|let|var)\s+([A-Za-z0-9_]*ID[A-Za-z0-9_]*)\s*=\s*["'']?(\d{1,6})["'']?')) {
      $idConstantsInCode.Add([pscustomobject]@{
          Arquivo = $relativeFile
          Linha = $i + 1
          NomeConstante = $m.Groups[1].Value
          ValorId = $m.Groups[2].Value
          Trecho = $line.Trim()
        })
    }
  }
}

$hubCommandsInCode | Sort-Object Comando, Arquivo, Linha | Export-Csv -Path (Join-Path $inventoryDir "comandos_hubitat_codigo.csv") -NoTypeInformation -Encoding UTF8
$idConstantsInCode | Sort-Object ValorId, NomeConstante, Arquivo, Linha | Export-Csv -Path (Join-Path $inventoryDir "ids_constantes_codigo.csv") -NoTypeInformation -Encoding UTF8

$packageJsonPath = Join-Path $repoRootPath "package.json"
$packageInfo = $null
$npmScripts = @()
if (Test-Path $packageJsonPath) {
  $packageInfo = Get-Content -Path $packageJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($packageInfo.scripts) {
    $npmScripts = $packageInfo.scripts.PSObject.Properties | ForEach-Object {
      [pscustomobject]@{
        Script = $_.Name
        Comando = [string]$_.Value
      }
    }
  }
}
$npmScripts | Sort-Object Script | Export-Csv -Path (Join-Path $inventoryDir "scripts_npm.csv") -NoTypeInformation -Encoding UTF8

$devicesPath = Join-Path $repoRootPath "DevicesID.json"
$devices = @()
if (Test-Path $devicesPath) {
  $devices = Get-Content -Path $devicesPath -Raw -Encoding UTF8 | ConvertFrom-Json
}

$deviceRows = @()
$deviceCommandRows = @()
if ($devices) {
  $deviceRows = $devices | ForEach-Object {
    $commands = @()
    if ($_.commands) {
      $commands = $_.commands | ForEach-Object { $_.command } | Where-Object { $_ }
    }

    [pscustomobject]@{
      ID = [string]$_.id
      Nome = [string]$_.name
      Label = [string]$_.label
      Tipo = [string]$_.type
      Room = [string]$_.room
      DataRegistro = [string]$_.date
      Comandos = ($commands -join ", ")
    }
  }

  $deviceCommandRows = $devices | ForEach-Object {
    $id = [string]$_.id
    $nome = [string]$_.name
    if ($_.commands) {
      $_.commands | ForEach-Object {
        [pscustomobject]@{
          ID = $id
          Nome = $nome
          Comando = [string]$_.command
        }
      }
    }
  }
}

$deviceRows | Sort-Object { [int]($_.ID -as [int]) }, ID | Export-Csv -Path (Join-Path $inventoryDir "dispositivos.csv") -NoTypeInformation -Encoding UTF8
$deviceCommandRows | Sort-Object Comando, ID | Export-Csv -Path (Join-Path $inventoryDir "comandos_dispositivos.csv") -NoTypeInformation -Encoding UTF8

$allIdsHtml = $idMatches | Select-Object -ExpandProperty Id -Unique | Sort-Object
$allDataDeviceIds = @()
$allDataDeviceIds += $deviceIdMatches | Select-Object -ExpandProperty DataDeviceId
$allDataDeviceIds += $expandedDeviceIds | Select-Object -ExpandProperty DataDeviceId
$allDataDeviceIds = $allDataDeviceIds | Where-Object { $_ } | Sort-Object -Unique

$allIndexLinks = $linkItems | Select-Object -ExpandProperty Link -Unique | Sort-Object
$allExternalUrls = $externalUrls | Select-Object -ExpandProperty Url -Unique | Sort-Object
$allLocalRoutes = $routeUrls | Select-Object -ExpandProperty Url -Unique | Sort-Object
$allHubCommandsCode = $hubCommandsInCode | Select-Object -ExpandProperty Comando -Unique | Sort-Object
$allDeviceCommands = $deviceCommandRows | Select-Object -ExpandProperty Comando -Unique | Sort-Object

$scriptsFolderFiles = Get-ChildItem -Path $repoRootPath -Recurse -File | Where-Object {
  -not (Test-IsExcludedPath -Path $_.FullName -ExcludedNames $excludedDirectories) -and
  ($_.Extension.ToLowerInvariant() -in @(".ps1", ".sh", ".py"))
}
$scriptCommandList = $scriptsFolderFiles | Sort-Object FullName | ForEach-Object {
  Get-RelativePath -BasePath $repoRootPath -TargetPath $_.FullName
}

$totalSourceFiles = $sourceFiles.Count
$totalSourceSizeBytes = ($sourceFiles | Measure-Object -Property Length -Sum).Sum
$totalSourceSizeMb = [math]::Round(($totalSourceSizeBytes / 1MB), 2)

$readmePath = Join-Path $outputDir "DADOS_TRANSFERENCIA_COMPLETOS.md"
$sb = New-Object System.Text.StringBuilder

[void]$sb.AppendLine("# Pacote de Transferencia Completo")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("Gerado em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss K")")
[void]$sb.AppendLine("Projeto raiz: $repoRootPath")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## 1. Resumo do Programa")

$projectName = if ($packageInfo) { [string]$packageInfo.name } else { "(nao encontrado)" }
$projectVersion = if ($packageInfo) { [string]$packageInfo.version } else { "(nao encontrado)" }
$projectDescription = if ($packageInfo) { [string]$packageInfo.description } else { "(nao encontrado)" }
$projectRepository = if ($packageInfo -and $packageInfo.repository) { [string]$packageInfo.repository.url } else { "(nao encontrado)" }

[void]$sb.AppendLine("1. Nome do projeto: $projectName")
[void]$sb.AppendLine("2. Versao: $projectVersion")
[void]$sb.AppendLine("3. Descricao: $projectDescription")
[void]$sb.AppendLine("4. Repositorio: $projectRepository")
[void]$sb.AppendLine("5. Total de arquivos fonte copiados: $totalSourceFiles")
[void]$sb.AppendLine("6. Tamanho total dos arquivos fonte: $totalSourceSizeMb MB")
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## 2. Estrutura do Pacote Gerado")
[void]$sb.AppendLine("1. $OutputFolder/fotos_exclusivas -> fotos da pasta images/Images")
[void]$sb.AppendLine("2. $OutputFolder/fonte_completa -> copia completa do codigo (sem .git, .venv e node_modules)")
[void]$sb.AppendLine("3. $OutputFolder/inventarios -> CSVs com dados detalhados (ids, links, comandos, dispositivos, arquivos)")
[void]$sb.AppendLine("4. $OutputFolder/DADOS_TRANSFERENCIA_COMPLETOS.md -> documento principal desta transferencia")
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## 3. Fotos Exclusivas")
$photoItems = $photoFiles | ForEach-Object {
  "$($_.Name) ($([math]::Round($_.Length / 1KB, 2)) KB)"
}
Add-NumberedList -Builder $sb -Items $photoItems
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## 4. Scripts e Comandos de Execucao")
[void]$sb.AppendLine("### 4.1 Scripts NPM (package.json)")
$npmItems = $npmScripts | Sort-Object Script | ForEach-Object {
  "$($_.Script): $($_.Comando)"
}
Add-NumberedList -Builder $sb -Items $npmItems
[void]$sb.AppendLine("")

[void]$sb.AppendLine("### 4.2 Arquivos de Script no Projeto (.ps1, .sh, .py)")
Add-NumberedList -Builder $sb -Items $scriptCommandList
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## 5. IDs HTML (index.html)")
Add-NumberedList -Builder $sb -Items $allIdsHtml
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## 6. IDs de Dispositivos no Front-end")
[void]$sb.AppendLine("### 6.1 data-device-id e data-device-ids (index.html)")
Add-NumberedList -Builder $sb -Items $allDataDeviceIds
[void]$sb.AppendLine("")

[void]$sb.AppendLine("### 6.2 Constantes ID no Codigo JavaScript")
$idConstantItems = $idConstantsInCode | Sort-Object ValorId, NomeConstante | ForEach-Object {
  "$($_.NomeConstante) = $($_.ValorId) ($($_.Arquivo):$($_.Linha))"
}
Add-NumberedList -Builder $sb -Items $idConstantItems
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## 7. Links")
[void]$sb.AppendLine("### 7.1 Links encontrados em index.html (href/src/srcset/action)")
Add-NumberedList -Builder $sb -Items $allIndexLinks
[void]$sb.AppendLine("")

[void]$sb.AppendLine("### 7.2 URLs externas no projeto")
Add-NumberedList -Builder $sb -Items $allExternalUrls
[void]$sb.AppendLine("")

[void]$sb.AppendLine("### 7.3 Rotas locais (webhook/functions/polling)")
Add-NumberedList -Builder $sb -Items $allLocalRoutes
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## 8. Comandos")
[void]$sb.AppendLine("### 8.1 Comandos Hubitat encontrados no codigo")
Add-NumberedList -Builder $sb -Items $allHubCommandsCode
[void]$sb.AppendLine("")

[void]$sb.AppendLine("### 8.2 Comandos disponiveis em DevicesID.json")
Add-NumberedList -Builder $sb -Items $allDeviceCommands
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## 9. Dispositivos (Nome, ID, Label, Tipo, Room, Comandos)")
$deviceItems = $deviceRows | Sort-Object { [int]($_.ID -as [int]) }, ID | ForEach-Object {
  "ID $($_.ID) | Nome: $($_.Nome) | Label: $($_.Label) | Tipo: $($_.Tipo) | Room: $($_.Room) | Comandos: $($_.Comandos)"
}
Add-NumberedList -Builder $sb -Items $deviceItems
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## 10. Inventarios CSV Gerados")
[void]$sb.AppendLine("1. inventarios/arquivos_programa.csv")
[void]$sb.AppendLine("2. inventarios/ids_html.csv")
[void]$sb.AppendLine("3. inventarios/data_device_id.csv")
[void]$sb.AppendLine("4. inventarios/data_device_ids_expandido.csv")
[void]$sb.AppendLine("5. inventarios/links_index.csv")
[void]$sb.AppendLine("6. inventarios/urls_externas.csv")
[void]$sb.AppendLine("7. inventarios/urls_rotas_locais.csv")
[void]$sb.AppendLine("8. inventarios/comandos_hubitat_codigo.csv")
[void]$sb.AppendLine("9. inventarios/ids_constantes_codigo.csv")
[void]$sb.AppendLine("10. inventarios/scripts_npm.csv")
[void]$sb.AppendLine("11. inventarios/dispositivos.csv")
[void]$sb.AppendLine("12. inventarios/comandos_dispositivos.csv")
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## 11. Observacao")
[void]$sb.AppendLine("1. O pacote foi criado para transferencia tecnica completa do programa.")
[void]$sb.AppendLine("2. Os CSVs incluem linha/arquivo para rastreabilidade.")
[void]$sb.AppendLine("3. A pasta fonte_completa contem todo o codigo fonte do projeto sem dependencias pesadas.")

$sb.ToString() | Set-Content -Path $readmePath -Encoding UTF8

Write-Output "Pacote gerado em: $outputDir"
Write-Output "Documento principal: $readmePath"
