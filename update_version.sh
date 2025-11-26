#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: $0 <new_version>"
    exit 1
fi

NEW_VERSION=$1

# 计算 versionCode: 假设版本格式 x.y.z, versionCode = x*100 + y*10 + z
# 例如 1.3.2 -> 132
IFS='.' read -r MAJOR MINOR PATCH <<< "$NEW_VERSION"
VERSION_CODE=$((MAJOR * 100 + MINOR * 10 + PATCH))

# 更新 package.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" package.json

# 更新 public/version.json
sed -i '' "s/\"latest_version\": \"[^\"]*\"/\"latest_version\": \"$NEW_VERSION\"/" public/version.json

# 更新 android/app/build.gradle
sed -i '' "s/versionCode [0-9]*/versionCode $VERSION_CODE/" android/app/build.gradle
sed -i '' "s/versionName \"[^\"]*\"/versionName \"$NEW_VERSION\"/" android/app/build.gradle

echo "Version updated to $NEW_VERSION"
