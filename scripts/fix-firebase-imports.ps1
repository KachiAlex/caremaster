# Bulk rewrite Firebase imports to backend compatibility layer
$files = Get-ChildItem -Path src -Recurse -Include "*.js","*.jsx" | Where-Object { Select-String -Path $_.FullName -Pattern "firebase/" -Quiet }
$count = 0
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    $original = $content

    # Replace firebase/* imports with backend/* equivalents
    $content = $content -replace "from 'firebase/firestore'", "from 'backend/database'"
    $content = $content -replace 'from "firebase/firestore"', 'from "backend/database"'
    $content = $content -replace "from 'firebase/auth'", "from 'backend/auth'"
    $content = $content -replace 'from "firebase/auth"', 'from "backend/auth"'
    $content = $content -replace "from 'firebase/storage'", "from 'backend/storage'"
    $content = $content -replace 'from "firebase/storage"', 'from "backend/storage"'
    $content = $content -replace "from 'firebase/functions'", "from 'backend/functions'"
    $content = $content -replace 'from "firebase/functions"', 'from "backend/functions"'
    $content = $content -replace "from 'firebase/app'", "from 'backend/app'"
    $content = $content -replace 'from "firebase/app"', 'from "backend/app"'

    # Replace ../firebase/config with ../backend/config (any depth)
    $content = $content -replace "/firebase/config'", "/backend/config'"
    $content = $content -replace '/firebase/config"', '/backend/config"'

    if ($content -ne $original) {
        Set-Content -Path $f.FullName -Value $content -NoNewline
        $count++
    }
}
Write-Output "Updated $count files"
