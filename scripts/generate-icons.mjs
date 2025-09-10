import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const srcSvg = path.join(projectRoot, 'src', 'app', 'icon.svg');
const publicDir = path.join(projectRoot, 'public');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function generate() {
  try {
    // Ensure prerequisites
    await ensureDir(publicDir);

    const svgExists = fs.existsSync(srcSvg);
    if (!svgExists) {
      console.error(`Source SVG not found at: ${srcSvg}`);
      process.exit(1);
    }

    const svgBuffer = await fs.promises.readFile(srcSvg);

    const outputs = [
      { file: 'favicon-16x16.png', size: 16 },
      { file: 'favicon-32x32.png', size: 32 },
      { file: 'apple-touch-icon.png', size: 180 },
    ];

    for (const { file, size } of outputs) {
      const outPath = path.join(publicDir, file);
      const png = await sharp(svgBuffer, { density: 192 })
        .resize(size, size, { fit: 'contain' })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();
      await fs.promises.writeFile(outPath, png);
      console.log(`Generated ${file}`);
    }

    console.log('Icon generation completed.');
  } catch (err) {
    console.error('Failed to generate icons:', err);
    process.exit(1);
  }
}

generate();
