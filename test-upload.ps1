# Test script for file upload
# Usage: .\test-upload.ps1 YOUR_AUTH_TOKEN

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

Write-Host "🧪 Testing File Upload" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 File: sample_products.csv"
Write-Host "🔑 Token: $($Token.Substring(0, [Math]::Min(20, $Token.Length)))..."
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $Token"
}

$filePath = "sample_products.csv"

if (-not (Test-Path $filePath)) {
    Write-Host "❌ Error: sample_products.csv not found!" -ForegroundColor Red
    exit 1
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/import/upload" `
        -Method Post `
        -Headers $headers `
        -Form @{
            file = Get-Item -Path $filePath
        } `
        -ContentType "multipart/form-data"
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
}

Write-Host ""
Write-Host "✅ Test complete!"
