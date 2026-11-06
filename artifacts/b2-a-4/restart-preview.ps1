$ErrorActionPreference='Stop'
$root='E:/Recovery/jinxi-web'
$record=Join-Path $root 'artifacts/b2-a-4/preview-process.json'
$info=Get-Content -LiteralPath $record | ConvertFrom-Json
$old=Get-CimInstance Win32_Process -Filter ('ProcessId='+$info.pid)
if($old.CommandLine -notmatch 'artifacts/b2-a-4/preview.cjs'){throw 'Owned preview PID mismatch'}
foreach($port in @(3048,3050)){
  $listener=Get-NetTCPConnection -State Listen -LocalPort $port
  if($listener.OwningProcess -ne $info.pid){throw 'Port ownership changed'}
}
Stop-Process -Id $info.pid
$node='C:/Users/lilei/AppData/Local/Temp/jinxi-005s-next-runtime/node-v20.20.2-win-x64/node.exe'
$next=Start-Process -FilePath $node -ArgumentList 'artifacts/b2-a-4/preview.cjs' -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput 'E:/Recovery/.jinxi-research/b2-0-publication/a4-preview.log' -RedirectStandardError 'E:/Recovery/.jinxi-research/b2-0-publication/a4-preview.err'
$info.pid=$next.Id
$info | ConvertTo-Json | Set-Content -LiteralPath $record
Write-Output ('Restarted owned local preview with current static CSP; PID '+$next.Id)
