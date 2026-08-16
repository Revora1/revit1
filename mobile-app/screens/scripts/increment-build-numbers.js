import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

console.log('[Auto-Increment] Starting build number incrementation...');

const offset = 200; // Base offset to keep versions higher than previous
const githubRunNumber = process.env.GITHUB_RUN_NUMBER ? parseInt(process.env.GITHUB_RUN_NUMBER, 10) : null;

// Read and increment Expo app.json version
const appJsonPath = path.join(rootDir, 'mobile-app/app.json');
let packageVersion = '1.0.0';
let buildNum = 1;

try {
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const currentVersion = appJson.expo.version || '1.0.0';
    const versionParts = currentVersion.split('.');
    
    if (versionParts.length === 3) {
      let patch = parseInt(versionParts[2], 10);
      
      if (githubRunNumber !== null) {
        patch = offset + githubRunNumber;
      } else if (!isNaN(patch)) {
        patch += 1;
      }
      
      if (!isNaN(patch)) {
        versionParts[2] = patch.toString();
        packageVersion = versionParts.join('.');
      } else {
        packageVersion = currentVersion;
      }
    } else {
      packageVersion = currentVersion;
    }
    
    appJson.expo.version = packageVersion;
    
    if (githubRunNumber !== null) {
      buildNum = offset + githubRunNumber;
    } else {
      buildNum = (parseInt(appJson.expo.ios?.buildNumber || '1', 10) || 1) + 1;
    }

    if (!appJson.expo.ios) appJson.expo.ios = {};
    if (!appJson.expo.android) appJson.expo.android = {};

    appJson.expo.ios.buildNumber = buildNum.toString();
    appJson.expo.android.versionCode = buildNum;

    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
    console.log(`[Auto-Increment] app.json version updated to ${packageVersion} and buildNumber to ${buildNum}`);
  } else {
    console.warn('[Auto-Increment] mobile-app/app.json not found');
  }
} catch (e) {
  console.error('[Auto-Increment] Failed to read or update app.json version:', e);
}

