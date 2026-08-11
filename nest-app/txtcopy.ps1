param(
    [string]$source,   # a.txt
    [string]$target    # b.txt
)

cd D:\myProject\chatGpt\EEF\nest-app

echo $source
echo $target

# 1. 대상 폴더 자동 생성
$dir = Split-Path $target
New-Item -ItemType Directory -Path $dir -Force | Out-Null

# 2. a.txt 내용을 b.txt로 복사
Copy-Item -Path $source -Destination $target -Force

# 3. VS Code에서 b.txt 열기
code $target