const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function fixImages() {
  const dir = path.join(process.cwd(), 'mobile-app/assets');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
  for (const file of files) {
    const p = path.join(dir, file);
    try {
      const buffer = fs.readFileSync(p);
      await sharp(buffer)
        .png({ force: true, quality: 100 })
        .toFile(p + '.tmp');
      fs.renameSync(p + '.tmp', p);
      console.log('Fixed', file);
    } catch (e) {
      console.error('Error fixing', file, e);
    }
  }
}
fixImages();
