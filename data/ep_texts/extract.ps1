$ErrorActionPreference = 'Stop'
$ids = @(921926,922062,922106,923622,925552,927541,929393,931256,933104,935137,936754,938197,940303,941942,947125,948124,951889,954200,955632,957500,959352)
$srcDir = 'C:\Users\yejin\Documents\projects\v2ex-funny\data\topics'
$outDir = 'C:\Users\yejin\Documents\projects\v2ex-funny\tmp_weekly_read'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function TsToDate($ts) {
  if ($null -eq $ts -or $ts -eq 0) { return '?' }
  $dt = [DateTimeOffset]::FromUnixTimeSeconds([long]$ts).ToOffset([TimeSpan]::FromHours(8))
  return $dt.ToString('yyyy-MM-dd HH:mm')
}

foreach ($id in $ids) {
  $j = Get-Content -Raw -Encoding UTF8 (Join-Path $srcDir "$id.json") | ConvertFrom-Json
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("=== TOPIC $id ===")
  [void]$sb.AppendLine("TITLE: $($j.title)")
  [void]$sb.AppendLine("EP: $($j.episode.ep) / ep2=$($j.episode.ep2)")
  [void]$sb.AppendLine("CREATED: $(TsToDate $j.created)  (Beijing)")
  [void]$sb.AppendLine("MEMBER: $($j.member)  REPLIES_COUNT: $($j.replies_count)  STARS: $($j.stars)  THANKS: $($j.thanks)")
  [void]$sb.AppendLine("URL: $($j.url)")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("----- CONTENT (markdown) -----")
  $c = $j.content
  if ($null -eq $c) { $c = '(null)' }
  $c = $c -replace "`r`n", "`n"
  # strip image URLs to reduce noise? keep but shorten
  [void]$sb.AppendLine($c)
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("----- SUPPLEMENTS -----")
  if ($j.supplements -and $j.supplements.Count -gt 0) {
    foreach ($s in $j.supplements) {
      [void]$sb.AppendLine(">> SUPPLEMENT (date: $($s.date) / $(TsToDate $s.created))")
      $sc = $s.content
      if ($null -eq $sc) { $sc = '(null)' }
      $sc = $sc -replace "`r`n", "`n"
      [void]$sb.AppendLine($sc)
      [void]$sb.AppendLine("")
    }
  } else {
    [void]$sb.AppendLine("(none)")
  }
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("----- REPLIES -----")
  if ($j.replies -and $j.replies.Count -gt 0) {
    foreach ($r in $j.replies) {
      $rc = $r.content
      if ($null -eq $rc) { $rc = '(null)' }
      $rc = $rc -replace "`r`n", "`n"
      [void]$sb.AppendLine(">> @$($r.author) ($(TsToDate $r.created)):")
      [void]$sb.AppendLine($rc)
      [void]$sb.AppendLine("")
    }
  } else {
    [void]$sb.AppendLine("(none)")
  }
  $outFile = Join-Path $outDir "$id.txt"
  [System.IO.File]::WriteAllText($outFile, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "wrote $outFile"
}
