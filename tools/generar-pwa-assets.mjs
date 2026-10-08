// Genera los íconos PWA y las pantallas de inicio (splash) de iOS a partir de
// assets/images/logo-puente.png. Se corre a mano cuando cambia el logo:
//   node tools/generar-pwa-assets.mjs
// Los resultados (public/icons, public/splash) se versionan.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const FONDO = '#1B5E3B'; // Colors.brand.greenDark
const LOGO = 'assets/images/logo-puente.png';
mkdirSync('public/icons', { recursive: true });
mkdirSync('public/splash', { recursive: true });

/** Logo centrado sobre el verde de marca. `ancho` = fracción del lado que ocupa el logo. */
async function lienzo(ancho, alto, fraccion) {
  const logoAncho = Math.round(Math.min(ancho, alto) * fraccion);
  const logo = await sharp(LOGO).resize({ width: logoAncho }).png().toBuffer();
  return sharp({ create: { width: ancho, height: alto, channels: 4, background: FONDO } })
    .composite([{ input: logo, gravity: 'centre' }])
    .png();
}

// Íconos "any" (logo ocupa ~78%) y "maskable" (zona segura: ~56%, el SO recorta bordes).
for (const lado of [192, 512]) await (await lienzo(lado, lado, 0.78)).toFile(`public/icons/icon-${lado}.png`);
await (await lienzo(512, 512, 0.56)).toFile('public/icons/icon-maskable-512.png');
await (await lienzo(180, 180, 0.78)).toFile('public/icons/apple-touch-icon.png'); // iOS ignora el manifest para este
await (await lienzo(48, 48, 0.9)).toFile('public/icons/favicon-48.png');

// Splash de iOS (apple-touch-startup-image) — iOS exige una imagen por resolución exacta.
// [ancho CSS, alto CSS, pixel ratio]
const IPHONES = [
  [320, 568, 2], [375, 667, 2], [414, 736, 3], [375, 812, 3], [414, 896, 2], [414, 896, 3],
  [390, 844, 3], [428, 926, 3], [393, 852, 3], [430, 932, 3], [402, 874, 3], [440, 956, 3],
];
for (const [w, h, r] of IPHONES) {
  await (await lienzo(w * r, h * r, 0.6)).toFile(`public/splash/iphone-${w}x${h}@${r}x.png`);
}
console.log('PWA assets generados');
export { IPHONES };
