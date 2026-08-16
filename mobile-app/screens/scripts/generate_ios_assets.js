import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ASSETS_DIR = 'ios/App/App/Assets.xcassets';
const ICON_SET_DIR = path.join(ASSETS_DIR, 'AppIcon.appiconset');
const SPLASH_SET_DIR = path.join(ASSETS_DIR, 'Splash.imageset');

console.log('Starting iOS Asset Generation...');

// 1. Create a beautiful base high-res icon (1024x1024)
const tempIconPath = 'temp_base_icon.png';
console.log('Drawing base 1024x1024 App Icon...');
try {
  execSync(
    `convert -size 1024x1024 xc:#0c0c0e ` +
    `-fill none -stroke "#ef4444" -strokewidth 30 -draw "circle 512,512 512,212" ` + // outer red ring
    `-stroke "#f87171" -strokewidth 10 -draw "line 512,512 712,312" ` + // red needle
    `-fill "#ef4444" -stroke none -draw "circle 512,512 512,542" ` + // red center hub
    `-fill "#ffffff" -font "Helvetica-Bold" -pointsize 180 -gravity center -draw "text 0,150 'RevItUp'" ` + // brand text
    `-colorspace sRGB -type truecolor -depth 8 png24:${tempIconPath}`
  );
} catch (e) {
  console.log('Failed to draw with Helvetica-Bold, falling back to basic shapes...');
  // Fallback if Helvetica font is missing on the host
  execSync(
    `convert -size 1024x1024 xc:#0c0c0e ` +
    `-fill none -stroke "#ef4444" -strokewidth 30 -draw "circle 512,512 512,212" ` +
    `-stroke "#f87171" -strokewidth 10 -draw "line 512,512 712,312" ` +
    `-fill "#ef4444" -stroke none -draw "circle 512,512 512,542" ` +
    `-colorspace sRGB -type truecolor -depth 8 png24:${tempIconPath}`
  );
}

// 2. Generate all App Icons from base icon
const iconJsonPath = path.join(ICON_SET_DIR, 'Contents.json');
if (fs.existsSync(iconJsonPath)) {
  const iconJson = JSON.parse(fs.readFileSync(iconJsonPath, 'utf8'));
  console.log(`Generating ${iconJson.images.length} AppIcon sizes...`);
  for (const img of iconJson.images) {
    if (!img.filename) continue;
    const sizeParts = img.size.split('x');
    const scaleValue = parseFloat(img.scale.replace('x', ''));
    const width = Math.round(parseFloat(sizeParts[0]) * scaleValue);
    const height = Math.round(parseFloat(sizeParts[1]) * scaleValue);
    const targetPath = path.join(ICON_SET_DIR, img.filename);
    console.log(` -> Resizing to ${width}x${height} -> ${img.filename}`);
    execSync(`convert ${tempIconPath} -resize ${width}x${height} -colorspace sRGB -type truecolor -depth 8 png24:${targetPath}`);
  }
} else {
  console.error('AppIcon Contents.json not found!');
}

// Clean up temporary base icon
if (fs.existsSync(tempIconPath)) {
  fs.unlinkSync(tempIconPath);
}

// 3. Create a beautiful base high-res splash screen (2732x2732)
const tempSplashPath = 'temp_base_splash.png';
console.log('Drawing base 2732x2732 Splash Screen...');
try {
  execSync(
    `convert -size 2732x2732 xc:#0c0c0e ` +
    `-fill none -stroke "#ef4444" -strokewidth 60 -draw "circle 1366,1366 1366,666" ` + // larger outer red ring
    `-stroke "#f87171" -strokewidth 20 -draw "line 1366,1366 1766,966" ` + // red needle
    `-fill "#ef4444" -stroke none -draw "circle 1366,1366 1366,1426" ` + // center hub
    `-fill "#ffffff" -font "Helvetica-Bold" -pointsize 240 -gravity center -draw "text 0,400 'RevItUp'" ` + // brand text
    `-colorspace sRGB -type truecolor -depth 8 png24:${tempSplashPath}`
  );
} catch (e) {
  console.log('Failed to draw splash with Helvetica-Bold, falling back to basic shapes...');
  execSync(
    `convert -size 2732x2732 xc:#0c0c0e ` +
    `-fill none -stroke "#ef4444" -strokewidth 60 -draw "circle 1366,1366 1366,666" ` +
    `-stroke "#f87171" -strokewidth 20 -draw "line 1366,1366 1766,966" ` +
    `-fill "#ef4444" -stroke none -draw "circle 1366,1366 1366,1426" ` +
    `-colorspace sRGB -type truecolor -depth 8 png24:${tempSplashPath}`
  );
}

// 4. Generate all Splash Images from base splash
const splashJsonPath = path.join(SPLASH_SET_DIR, 'Contents.json');
if (fs.existsSync(splashJsonPath)) {
  const splashJson = JSON.parse(fs.readFileSync(splashJsonPath, 'utf8'));
  console.log(`Generating ${splashJson.images.length} Splash sizes...`);
  for (const img of splashJson.images) {
    if (!img.filename) continue;
    const targetPath = path.join(SPLASH_SET_DIR, img.filename);
    console.log(` -> Resizing to 2732x2732 -> ${img.filename}`);
    execSync(`convert ${tempSplashPath} -resize 2732x2732 -colorspace sRGB -type truecolor -depth 8 png24:${targetPath}`);
  }
} else {
  console.error('Splash Contents.json not found!');
}

// Clean up temporary base splash
if (fs.existsSync(tempSplashPath)) {
  fs.unlinkSync(tempSplashPath);
}

console.log('All iOS assets generated successfully in sRGB 8-bit/color (png24) standard format!');
