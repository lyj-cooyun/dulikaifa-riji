# 通过 GitHub Git Data API 完整推送（绕过本机 ssh/sh 故障）
# 关键：UTF-8 无 BOM 写文件 + core.quotepath=false 保留中文路径
$ErrorActionPreference = 'Stop'
$env:HTTPS_PROXY = 'http://192.168.0.127:7890'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$repo = 'lyj-cooyun/dulikaifa-riji'
$tmp = $env:TEMP
$utf8nb = [Text.UTF8Encoding]::new($false)

function WriteJson($path, $obj) {
  [IO.File]::WriteAllText($path, ($obj | ConvertTo-Json -Depth 5 -Compress), $utf8nb)
}

# 1. 建 blobs
$items = git -c core.quotepath=false ls-files
Write-Host "files: $($items.Count)"
$tree = New-Object System.Collections.Generic.List[object]
$bf = Join-Path $tmp 'blob.json'
$i = 0
foreach ($f in $items) {
  $p = Join-Path $PWD $f
  if (-not (Test-Path -LiteralPath $p)) { throw "missing file: $f" }
  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($p))
  WriteJson $bf @{ content = $b64; encoding = 'base64' }
  $sha = (gh api --method POST "repos/$repo/git/blobs" --input $bf --jq '.sha') 2>$null | Select-Object -Last 1
  if (-not $sha -or $sha -notmatch '^[0-9a-f]{40}$') { throw "blob failed: $f -> $sha" }
  $tree.Add([pscustomobject]@{ path = ($f -replace '\\', '/'); mode = '100644'; type = 'blob'; sha = $sha })
  $i++
  if ($i % 50 -eq 0) { Write-Host "  blobs: $i / $($items.Count)" }
}
Write-Host "blobs done: $i"

# 2. 建 tree
$head = gh api "repos/$repo/git/ref/heads/main" --jq '.object.sha'
Write-Host "head: $head"
$tf = Join-Path $tmp 'tree.json'
WriteJson $tf @{ base_tree = $head; tree = $tree }
$ts = gh api --method POST "repos/$repo/git/trees" --input $tf --jq '.sha'
Write-Host "tree: $ts"

# 3. 建 commit
$msg = git log -1 --pretty=%B
$cf = Join-Path $tmp 'commit.json'
WriteJson $cf @{ message = $msg; tree = $ts; parents = @($head) }
$cs = gh api --method POST "repos/$repo/git/commits" --input $cf --jq '.sha'
Write-Host "commit: $cs"

# 4. 更新 ref
$rf = Join-Path $tmp 'ref.json'
WriteJson $rf @{ sha = $cs; force = $true }
gh api --method PATCH "repos/$repo/git/refs/heads/main" --input $rf --jq '.object.sha'
Write-Host "pushed: $cs"
