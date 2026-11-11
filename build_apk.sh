#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 [1/3] Building frontend bundle..."
cd "$DIR/frontend"
npm run build

echo "🔄 [2/3] Syncing web assets with Capacitor Android..."
npx cap sync android

echo "📦 [3/3] Compiling Android APK with Gradle..."
cd "$DIR/frontend/android"
export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

./gradlew assembleDebug

cp "$DIR/frontend/android/app/build/outputs/apk/debug/app-debug.apk" "$DIR/daytrader.apk"

echo ""
echo "✅ Build Complete!"
echo "📱 APK generated at: $DIR/daytrader.apk"

