param([int]$Port = 8080)
if ($env:PORT) { $Port = [int]$env:PORT }

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$http = [System.Net.HttpListener]::new()
$http.Prefixes.Add("http://localhost:$Port/")
$http.Start()
Write-Host "Serving $root on http://localhost:$Port"

while ($http.IsListening) {
    $ctx = $null
    try { $ctx = $http.GetContext() } catch { break }

    $localPath = $ctx.Request.Url.LocalPath.TrimStart('/')
    if ($localPath -eq '') { $localPath = 'preview.html' }
    $localPath = $localPath -replace '/', [IO.Path]::DirectorySeparatorChar
    $file = [IO.Path]::Combine($root, $localPath)

    $resp = $ctx.Response
    Write-Host "REQ: $($ctx.Request.HttpMethod) $($ctx.Request.Url.LocalPath)"

    try {
        if ([IO.File]::Exists($file)) {
            # Read as text to avoid BOM byte-count mismatch
            $text = [IO.File]::ReadAllText($file, [Text.Encoding]::UTF8)
            $bytes = [Text.Encoding]::UTF8.GetBytes($text)

            $ext = [IO.Path]::GetExtension($file).ToLower()
            $mime = switch ($ext) {
                '.html' { 'text/html; charset=utf-8' }
                '.js'   { 'application/javascript' }
                '.css'  { 'text/css; charset=utf-8' }
                default { 'application/octet-stream' }
            }

            $resp.StatusCode = 200
            $resp.ContentType = $mime
            $resp.ContentLength64 = [long]$bytes.Length
            # HEAD requests: headers only, no body
            if ($ctx.Request.HttpMethod -ne 'HEAD') {
                $resp.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            Write-Host "  -> OK $($ctx.Request.HttpMethod) $($bytes.Length) bytes"
        } else {
            $bytes = [Text.Encoding]::UTF8.GetBytes("404 Not found: $localPath")
            $resp.StatusCode = 404
            $resp.ContentLength64 = [long]$bytes.Length
            $resp.OutputStream.Write($bytes, 0, $bytes.Length)
        }
    } catch {
        Write-Host "  ERR: $_"
    } finally {
        try { $resp.OutputStream.Flush(); $resp.OutputStream.Close() } catch {}
    }
}
$http.Stop()
