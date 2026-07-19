import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

console.log('[Auto-Increment] Starting build number incrementation...');

// 1. Android build.gradle
const androidGradlePath = path.join(rootDir, 'android/app/build.gradle');
if (fs.existsSync(androidGradlePath)) {
  let content = fs.readFileSync(androidGradlePath, 'utf8');
  const match = content.match(/versionCode\s*=\s*(\d+)/);
  if (match) {
    const currentCode = parseInt(match[1], 10);
    const nextCode = currentCode + 1;
    content = content.replace(/versionCode\s*=\s*\d+/, `versionCode = ${nextCode}`);
    fs.writeFileSync(androidGradlePath, content, 'utf8');
    console.log(`[Auto-Increment] Android versionCode bumped from ${currentCode} to ${nextCode}`);
  } else {
    console.warn('[Auto-Increment] Android versionCode not found in build.gradle');
  }
} else {
  console.warn('[Auto-Increment] Android build.gradle not found');
}

// 2. iOS project.pbxproj
const iosProjPath = path.join(rootDir, 'ios/App/App.xcodeproj/project.pbxproj');
if (fs.existsSync(iosProjPath)) {
  let content = fs.readFileSync(iosProjPath, 'utf8');
  const matches = content.match(/CURRENT_PROJECT_VERSION\s*=\s*(\d+);/g);
  if (matches) {
    const singleMatch = content.match(/CURRENT_PROJECT_VERSION\s*=\s*(\d+);/);
    const currentVersion = parseInt(singleMatch[1], 10);
    const nextVersion = currentVersion + 1;
    content = content.replace(/CURRENT_PROJECT_VERSION\s*=\s*\d+;/g, `CURRENT_PROJECT_VERSION = ${nextVersion};`);
    fs.writeFileSync(iosProjPath, content, 'utf8');
    console.log(`[Auto-Increment] iOS CURRENT_PROJECT_VERSION bumped from ${currentVersion} to ${nextVersion}`);
  } else {
    console.warn('[Auto-Increment] iOS CURRENT_PROJECT_VERSION not found in project.pbxproj');
  }
} else {
  console.warn('[Auto-Increment] iOS project.pbxproj not found');
}
