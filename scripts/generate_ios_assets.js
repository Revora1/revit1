import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ASSETS_DIR = 'ios/App/App/Assets.xcassets';
const ICON_SET_DIR = path.join(ASSETS_DIR, 'AppIcon.appiconset');
const SPLASH_SET_DIR = path.join(ASSETS_DIR, 'Splash.imageset');

console.log('=== STARTING BRAND UNIFICATION ASSET GENERATOR ===');

const tempIconPath = 'temp_base_icon.png';
const tempSplashPath = 'temp_base_splash.png';

// 1. Draw base high-res logo (1024x1024) with precise geometry
console.log('Drawing base 1024x1024 App Icon with stylized Red "R" logo...');
try {
  // Draw the red stylized logo, apply the black parallel slit and central loop cutout
  execSync(
    `convert -size 1024x1024 xc:#0c0c0e ` +
    `-fill "#e31b23" -draw "polygon 120,260 740,260 890,420 740,580 860,840 700,840 393,580 300,840 150,840 302,410" ` +
    `-fill "#0c0c0e" -draw "polygon 470,240 515,240 285,860 240,860" ` +
    `-draw "polygon 480,370 660,370 740,450 660,510 435,510" ` +
    `-colorspace sRGB -type truecolor -depth 8 png24:${tempIconPath}`
  );
  console.log(' -> Base App Icon drawn successfully.');
} catch (e) {
  console.error('Failed to draw base App Icon with ImageMagick:', e.message);
}

// 2. Draw base high-res splash screen (2732x2732)
console.log('Drawing base 2732x2732 Splash Screen with centered logo and white typography...');
try {
  execSync(
    `convert -size 2732x2732 xc:#0c0c0e ${tempIconPath} -gravity center -geometry +0-150 -composite ` +
    `-fill "#ffffff" -font "Liberation-Sans-Bold" -pointsize 140 -draw "text 1366,1900 'RevitUp'" ` +
    `-colorspace sRGB -type truecolor -depth 8 png24:${tempSplashPath}`
  );
  console.log(' -> Base Splash Screen drawn successfully.');
} catch (e) {
  console.error('Failed to draw base Splash Screen with ImageMagick:', e.message);
}

// Helper to safely resize
function resizeImage(source, target, w, h) {
  try {
    const targetDir = path.dirname(target);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    execSync(`convert ${source} -resize ${w}x${h} -colorspace sRGB -type truecolor -depth 8 png24:${target}`);
  } catch (e) {
    console.error(`Failed to resize ${source} to ${w}x${h} for ${target}:`, e.message);
  }
}

// 3. Generate all iOS AppIcon sizes
const iconJsonPath = path.join(ICON_SET_DIR, 'Contents.json');
if (fs.existsSync(iconJsonPath)) {
  const iconJson = JSON.parse(fs.readFileSync(iconJsonPath, 'utf8'));
  console.log(`Generating ${iconJson.images.length} iOS AppIcon sizes...`);
  for (const img of iconJson.images) {
    if (!img.filename) continue;
    const sizeParts = img.size.split('x');
    const scaleValue = parseFloat(img.scale.replace('x', ''));
    const width = Math.round(parseFloat(sizeParts[0]) * scaleValue);
    const height = Math.round(parseFloat(sizeParts[1]) * scaleValue);
    const targetPath = path.join(ICON_SET_DIR, img.filename);
    console.log(` -> Resizing to ${width}x${height} -> ${img.filename}`);
    resizeImage(tempIconPath, targetPath, width, height);
  }
} else {
  console.error('AppIcon Contents.json not found!');
}

// 4. Generate all iOS Splash sizes
const splashJsonPath = path.join(SPLASH_SET_DIR, 'Contents.json');
if (fs.existsSync(splashJsonPath)) {
  const splashJson = JSON.parse(fs.readFileSync(splashJsonPath, 'utf8'));
  console.log(`Generating ${splashJson.images.length} iOS Splash sizes...`);
  for (const img of splashJson.images) {
    if (!img.filename) continue;
    const targetPath = path.join(SPLASH_SET_DIR, img.filename);
    console.log(` -> Resizing to 2732x2732 -> ${img.filename}`);
    resizeImage(tempSplashPath, targetPath, 2732, 2732);
  }
} else {
  console.error('Splash Contents.json not found!');
}

// 5. Save main Capacitor resources & assets
console.log('Updating standard assets and Capacitor resource folders...');
resizeImage(tempIconPath, 'resources/icon.png', 1024, 1024);
resizeImage(tempIconPath, 'assets/icon.png', 1024, 1024);
resizeImage(tempSplashPath, 'resources/splash.png', 2732, 2732);
resizeImage(tempSplashPath, 'assets/splash.png', 2732, 2732);

// 6. Update all Web/PWA public icons
console.log('Updating web favicon and PWA touch icons in /public...');
const publicIcons = [
  { name: 'favicon-v10.png', size: 32 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'apple-touch-icon-120x120.png', size: 120 },
  { name: 'apple-touch-icon-152x152.png', size: 152 },
  { name: 'apple-touch-icon-167x167.png', size: 167 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
  { name: 'pwa-icon-192-v10.png', size: 192 },
  { name: 'pwa-icon-512-v10.png', size: 512 },
  { name: 'ios-icon-120-v20.png', size: 120 },
  { name: 'ios-icon-152-v20.png', size: 152 },
  { name: 'ios-icon-167-v20.png', size: 167 },
  { name: 'ios-icon-180-v20.png', size: 180 }
];

for (const icon of publicIcons) {
  resizeImage(tempIconPath, path.join('public', icon.name), icon.size, icon.size);
}

// Update PWA favicon.ico as well
try {
  execSync(`convert ${tempIconPath} -resize 32x32 public/favicon.ico`);
  console.log(' -> public/favicon.ico updated.');
} catch (e) {
  console.error('Failed to update favicon.ico:', e.message);
}

// Also update the dist copies directly if they exist
console.log('Syncing assets into /dist folder for immediate update...');
const distIcons = [
  { name: 'favicon-v10.png', size: 32 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'apple-touch-icon-120x120.png', size: 120 },
  { name: 'apple-touch-icon-152x152.png', size: 152 },
  { name: 'apple-touch-icon-167x167.png', size: 167 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
  { name: 'pwa-icon-192-v10.png', size: 192 },
  { name: 'pwa-icon-512-v10.png', size: 512 },
  { name: 'ios-icon-120-v20.png', size: 120 },
  { name: 'ios-icon-152-v20.png', size: 152 },
  { name: 'ios-icon-167-v20.png', size: 167 },
  { name: 'ios-icon-180-v20.png', size: 180 }
];

for (const icon of distIcons) {
  resizeImage(tempIconPath, path.join('dist', icon.name), icon.size, icon.size);
}
try {
  if (fs.existsSync('dist/favicon.ico')) {
    execSync(`convert ${tempIconPath} -resize 32x32 dist/favicon.ico`);
  }
} catch (e) {}

// Clean up temporary files
if (fs.existsSync(tempIconPath)) {
  fs.unlinkSync(tempIconPath);
}
if (fs.existsSync(tempSplashPath)) {
  fs.unlinkSync(tempSplashPath);
}

console.log('=== BRAND ASSETS UNIFIED SUCCESSFULLY! ===');
