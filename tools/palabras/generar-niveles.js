// Genera src/constants/nivelesPalabras.ts — los 300 niveles del juego "Palabras"
// (rueda de letras + crucigrama). Se corre una sola vez (o al retocar la
// curva de dificultad); el resultado se commitea, la app NO genera nada en runtime.
//
//   node tools/palabras/generar-niveles.js <diccionario.json> <frecuencias.txt> <salida.ts>
//
// - diccionario.json: array de palabras en español (paquete npm `an-array-of-spanish-words`).
// - frecuencias.txt: "palabra frecuencia" por línea, más frecuente primero (FrequencyWords es_50k).
//
// Criterios pensados para adultos mayores:
//   · Niveles 1-12: rueda de 4 letras (con algunos de 5 intercalados), 5-6 palabras, vocabulario MUY común.
//   · 13-45: 5 letras (con uno de 6 cada 4 niveles) · 46-300: 6 letras (nunca 7: más letras en la rueda confunden).
//   · Ninguna palabra de la grilla se repite en otro nivel (ni siquiera las cortas).
//   · Sin tiempo, sin acentos (se ignoran, como en los juegos de palabras en español).
//   · Se filtran palabras vulgares o desagradables (ver BLOQUEADAS).
const fs = require('fs');

const [, , dicPath, freqPath, outPath] = process.argv;
if (!dicPath || !freqPath || !outPath) {
  console.error('Uso: node generar-niveles.js <diccionario.json> <frecuencias.txt> <salida.ts>');
  process.exit(1);
}

const TOTAL_NIVELES = 300;
const MAX_ANCHO = 8;
const MAX_ALTO = 9;

const sinAcentos = (w) =>
  w
    .toLowerCase()
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/[úü]/g, 'u');

// ── Palabras que NO queremos (vulgares, violentas o tristes para este público) ──
const BLOQUEADAS = new RegExp(
  '^(' +
    [
      'put[aoe]s?', 'mierd[ao]s?', 'joder', 'jod[aeio]\\w*', 'coñ[oa]s?', 'cag[aoue]\\w*', 'verg[ao]s?', 'cul[oa]s?',
      'pij[ao]s?', 'pen[ae]s?', 'tet[ao]s?', 'conchas?', 'bolud[oa]s?', 'pelotud[oa]s?', 'maric[aoó]n?\\w*', 'ching[aoue]\\w*',
      'ping[ao]s?', 'pito', 'pitos', 'sexo', 'sexual\\w*', 'porn\\w*', 'nazi\\w*', 'mata', 'matan', 'matar', 'matas', 'mato',
      'muert[aeo]s?', 'muri[eo]\\w*', 'morir', 'moris', 'cancer', 'tumor\\w*', 'asesin\\w*', 'violar', 'viola', 'violan',
      'drog[ao]s?', 'sida', 'odio', 'odiar', 'odias', 'idiot\\w*', 'estupid\\w*', 'tonta?s?', 'tontos', 'imbecil\\w*',
      'gilipollas', 'hostia\\w*', 'zorr[ao]s?', 'cabron\\w*', 'pend[ae]j\\w*', 'culi\\w*', 'sucio', 'sucia', 'suicid\\w*',
      'sangre', 'sangr\\w*', 'bomba\\w*', 'guerra\\w*', 'arma', 'armas', 'balas?', 'bala[sz]\\w*', 'disparo\\w*', 'tiro', 'tiros',
      'cadaver\\w*', 'tumba\\w*', 'fallec\\w*', 'ataud\\w*', 'infierno', 'demonio\\w*', 'diablo\\w*', 'vomit\\w*', 'caca', 'pedo\\w*',
    ].join('|') +
    ')$',
);

// ── Diccionario + frecuencias ─────────────────────────────────────────────────
const diccionario = new Set();
for (const w of JSON.parse(fs.readFileSync(dicPath, 'utf8'))) {
  const n = sinAcentos(w);
  if (/^[a-zñ]{3,6}$/.test(n)) diccionario.add(n);
}

const ranking = new Map(); // palabra normalizada → posición (1 = la más usada)
fs.readFileSync(freqPath, 'utf8')
  .split(/\r?\n/)
  .forEach((linea, i) => {
    const w = sinAcentos(linea.split(' ')[0] || '');
    if (w && !ranking.has(w)) ranking.set(w, i + 1);
  });

// Nombres propios, siglas, marcas y palabras que se prestan a confusión: no se aceptan ni como objetivo ni como extra.
const EXCLUIDAS = new Set(
  (
    'ali ana dora rene lola alan adan dan carlo lisa nasa rusia brasil paris miss rae ceo uci tac set tao gin oia cai nao cao gil ' +
    'rie rien naci mori sis ica oid dom pis ano anos anal ace ari cap dea ire ide aca tic ron sed les ido des lei eso ese esa ' +
    'abc pan pon ate ata ato fin fan bon ron hum eh ah oh ay uf ufa ole ola oso osa iba ibas ' +
    'arre reid her che cha chan cho epa grand tomad parad anti ami tate too ring cate ben non tus pos seo apos edi mani milan roma ' +
    'corea rob ves vos dean gen vil rab nao tia ' 
  ).split(' '),
);
// Conjugaciones poco naturales (vosotros, futuro, subjuntivo…) — válidas como "extra" pero no como palabra de la grilla.
const CONJUGADA = /(ais|eis|ian|ias|aran|eran|aras|eras|are|ere|ire|aba|abas|aban|asen|esen|ase|ese|ria|rian|rias|ra[ns]|sen)$/;

const RANGO_MAX_VALIDA = 50000; // una palabra "válida" tiene que ser conocida
const validas = [];
for (const w of diccionario) {
  const r = ranking.get(w);
  if (r && r <= RANGO_MAX_VALIDA && !BLOQUEADAS.test(w) && !EXCLUIDAS.has(w)) validas.push({ w, r });
}
const esObjetivoLimpio = (w) => w.length <= 3 ? !CONJUGADA.test(w) || /^(ria|ras)$/.test(w) === false : !CONJUGADA.test(w);
console.log(`Diccionario normalizado: ${diccionario.size} · válidas (con frecuencia): ${validas.length}`);

// ── Utilidades ────────────────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mezclar = (arr, rnd) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const conteo = (w) => {
  const m = {};
  for (const c of w) m[c] = (m[c] || 0) + 1;
  return m;
};
const cabeEn = (w, letras) => {
  const disp = { ...letras };
  for (const c of w) {
    if (!disp[c]) return false;
    disp[c]--;
  }
  return true;
};

// ── Curva de dificultad ──────────────────────────────────────────────────────
function paramsNivel(n) {
  const t = (n - 1) / (TOTAL_NIVELES - 1); // 0 → 1
  let letras = n <= 12 ? 4 : n <= 45 ? 5 : 6;
  // Algunos niveles más largos intercalados entre los primeros (cada 4 niveles, hasta el 45)
  if (n <= 45 && n % 4 === 0) letras = Math.min(6, letras + 1);
  // Cuántas palabras hay que encontrar (más que antes: antes eran 3-9)
  let k;
  if (letras === 4) k = n <= 6 ? 5 : 6;
  else if (letras === 5) k = n <= 80 ? 7 : 8;
  else k = n <= 100 ? 8 : 9;
  // Palabras de 3 letras permitidas en la grilla (en ruedas grandes, casi todas tienen que ser de 4+)
  const maxCortas = letras === 4 ? k : letras === 5 ? 2 : 1;
  // Qué tan comunes tienen que ser las palabras de la grilla (rango en la lista de frecuencias)
  const rangoMax = Math.round(2500 + t * 20000);
  return { letras, k, rangoMax, maxCortas };
}

// ── Armado de la grilla estilo crucigrama ───────────────────────────────────
function armarGrilla(palabras, rnd) {
  const orden = [...palabras].sort((a, b) => b.length - a.length);
  const celdas = new Map(); // "f,c" → { letra, h, v }
  const colocadas = [];
  const clave = (f, c) => `${f},${c}`;
  const vacia = (f, c) => !celdas.has(clave(f, c));

  const intentar = (w, f0, c0, horiz) => {
    const df = horiz ? 0 : 1;
    const dc = horiz ? 1 : 0;
    if (!vacia(f0 - df, c0 - dc) || !vacia(f0 + df * w.length, c0 + dc * w.length)) return null;
    let cruces = 0;
    for (let i = 0; i < w.length; i++) {
      const f = f0 + df * i;
      const c = c0 + dc * i;
      const cel = celdas.get(clave(f, c));
      if (cel) {
        if (cel.letra !== w[i]) return null;
        if (horiz ? cel.h : cel.v) return null; // no solapar en el mismo sentido
        cruces++;
      } else if (!vacia(f + dc, c + df) || !vacia(f - dc, c - df)) {
        return null; // vecinos laterales: formaría palabras sin querer
      }
    }
    return cruces;
  };

  const poner = (w, f0, c0, horiz) => {
    const df = horiz ? 0 : 1;
    const dc = horiz ? 1 : 0;
    for (let i = 0; i < w.length; i++) {
      const k = clave(f0 + df * i, c0 + dc * i);
      const cel = celdas.get(k) || { letra: w[i], h: false, v: false };
      if (horiz) cel.h = true;
      else cel.v = true;
      celdas.set(k, cel);
    }
    colocadas.push({ p: w, f: f0, c: c0, h: horiz });
  };

  poner(orden[0], 0, 0, true);
  for (let idx = 1; idx < orden.length; idx++) {
    const w = orden[idx];
    const candidatos = [];
    for (const horiz of [true, false]) {
      for (const [k, cel] of celdas) {
        const [f, c] = k.split(',').map(Number);
        for (let i = 0; i < w.length; i++) {
          if (w[i] !== cel.letra) continue;
          const f0 = horiz ? f : f - i;
          const c0 = horiz ? c - i : c;
          const cruces = intentar(w, f0, c0, horiz);
          if (cruces && cruces >= 1) {
            // área resultante (para preferir grillas compactas)
            const fs_ = [...celdas.keys()].map((x) => +x.split(',')[0]).concat([f0, f0 + (horiz ? 0 : w.length - 1)]);
            const cs_ = [...celdas.keys()].map((x) => +x.split(',')[1]).concat([c0, c0 + (horiz ? w.length - 1 : 0)]);
            const alto = Math.max(...fs_) - Math.min(...fs_) + 1;
            const ancho = Math.max(...cs_) - Math.min(...cs_) + 1;
            if (alto > MAX_ALTO || ancho > MAX_ANCHO) continue;
            candidatos.push({ f0, c0, horiz, puntaje: alto * ancho - cruces * 2 + rnd() * 3 });
          }
        }
      }
    }
    if (!candidatos.length) return null;
    candidatos.sort((a, b) => a.puntaje - b.puntaje);
    const m = candidatos[0];
    poner(w, m.f0, m.c0, m.horiz);
  }

  const minF = Math.min(...colocadas.map((p) => p.f));
  const minC = Math.min(...colocadas.map((p) => p.c));
  const norm = colocadas.map((p) => ({ ...p, f: p.f - minF, c: p.c - minC }));
  const alto = Math.max(...norm.map((p) => p.f + (p.h ? 0 : p.p.length - 1))) + 1;
  const ancho = Math.max(...norm.map((p) => p.c + (p.h ? p.p.length - 1 : 0))) + 1;
  if (alto > MAX_ALTO || ancho > MAX_ANCHO) return null;
  return { palabras: norm, ancho, alto };
}

// ── Generación de los niveles ───────────────────────────────────────────────
const porLongitud = (n) => validas.filter((v) => v.w.length === n);
const usadas = new Set(); // letras ordenadas ya usadas como base
const palabrasUsadas = new Set(); // palabras de grilla ya usadas en algún nivel (no se repiten)
const niveles = [];

for (let n = 1; n <= TOTAL_NIVELES; n++) {
  const { letras, k: kPedido, rangoMax: rangoBase, maxCortas } = paramsNivel(n);
  const rnd = mulberry32(1000 + n * 7919);

  // Si con el vocabulario "pedido" no alcanza, se amplía de a poco (la dificultad igual sube con el nivel).
  let hecho = null;
  for (const k of [kPedido, kPedido - 1, kPedido - 2, kPedido - 3]) {
    for (const mult of [1, 2, 4, 8, 20]) {
      if (hecho) break;
      const rangoMax = Math.round(rangoBase * mult);
      // Candidatas a palabra base: de `letras` letras, comunes, sin letras raras y con muchos anagramas/sub-palabras.
      const bases = mezclar(
        porLongitud(letras).filter(
          (v) => v.r <= rangoMax && !/[ñwkxzjqy]/.test(v.w) && esObjetivoLimpio(v.w) && !palabrasUsadas.has(v.w),
        ),
        rnd,
      );
      for (const base of bases) {
        const firma = [...base.w].sort().join('');
        if (usadas.has(firma)) continue;
        const disp = conteo(base.w);
        const formables = validas.filter((v) => cabeEn(v.w, disp));
        const comunes = formables.filter(
          (v) => v.r <= rangoMax && v.w !== base.w && esObjetivoLimpio(v.w) && !palabrasUsadas.has(v.w),
        );
        const largas = comunes.filter((v) => v.w.length >= letras - 1);
        const medias = comunes.filter((v) => v.w.length >= 4 && v.w.length < letras - 1);
        const cortas = comunes.filter((v) => v.w.length === 3 && v.w.length < letras - 1);
        if (comunes.length < k - 1) continue;

        for (let intento = 0; intento < 12 && !hecho; intento++) {
          // Primero las palabras largas, después las medianas y, si hace falta, algunas cortas.
          const pool = [...mezclar(largas, rnd), ...mezclar(medias, rnd)];
          const elegidas = [base.w, ...pool.slice(0, k - 1).map((v) => v.w)];
          const cortasElegidas = mezclar(cortas, rnd);
          let usadasCortas = 0;
          while (elegidas.length < k && usadasCortas < maxCortas && usadasCortas < cortasElegidas.length) {
            elegidas.push(cortasElegidas[usadasCortas++].w);
          }
          if (elegidas.length < k) continue;
          if (intento > 0) {
            // variar la selección en los reintentos
            const alt = [base.w, ...mezclar([...largas, ...medias, ...cortas.slice(0, maxCortas)], rnd).slice(0, k - 1).map((v) => v.w)];
            if (alt.filter((w) => w.length === 3).length <= maxCortas) elegidas.splice(0, elegidas.length, ...alt);
          }
          if (new Set(elegidas).size !== elegidas.length) continue; // nunca la misma palabra dos veces
          const grilla = armarGrilla(elegidas, rnd);
          if (grilla) hecho = { base, formables, grilla, firma };
        }
        if (hecho) break;
      }
    }
    if (hecho) break;
  }
  if (!hecho) {
    console.error(`No se pudo generar el nivel ${n}`);
    process.exit(2);
  }
  usadas.add(hecho.firma);
  hecho.grilla.palabras.forEach((p) => palabrasUsadas.add(p.p));
  if (hecho.grilla.palabras.length < kPedido) console.warn(`Nivel ${n}: ${hecho.grilla.palabras.length} palabras (se pedían ${kPedido})`);

  const enGrilla = new Set(hecho.grilla.palabras.map((p) => p.p));
  const extras = hecho.formables
    .filter((v) => !enGrilla.has(v.w))
    .sort((a, b) => a.r - b.r)
    .slice(0, 60)
    .map((v) => v.w.toUpperCase());

  niveles.push({
    n,
    letras: mezclar([...hecho.base.w], rnd).join('').toUpperCase(),
    ancho: hecho.grilla.ancho,
    alto: hecho.grilla.alto,
    palabras: hecho.grilla.palabras.map((p) => `${p.p.toUpperCase()}:${p.f}:${p.c}:${p.h ? 'h' : 'v'}`),
    extras,
  });
}

// ── Salida ───────────────────────────────────────────────────────────────────
const salida = `// ARCHIVO GENERADO — no editar a mano. Se regenera con:
//   node tools/palabras/generar-niveles.js <diccionario.json> <frecuencias.txt> src/constants/nivelesPalabras.ts
//
// Los ${TOTAL_NIVELES} niveles del juego "Palabras" (rueda de letras + crucigrama).
// Cada palabra de la grilla se codifica "PALABRA:fila:columna:orientación" (h = horizontal, v = vertical).
// \`extras\` son palabras válidas que NO están en la grilla (se aceptan como "palabra extra").

export interface NivelPalabrasRaw {
  nivel: number;
  letras: string;
  ancho: number;
  alto: number;
  palabras: string[];
  extras: string[];
}

export const NIVELES_PALABRAS_RAW: NivelPalabrasRaw[] = ${JSON.stringify(
  niveles.map((x) => ({ nivel: x.n, letras: x.letras, ancho: x.ancho, alto: x.alto, palabras: x.palabras, extras: x.extras })),
  null,
  0,
).replace(/\},\{/g, '},\n  {')};
`;
fs.writeFileSync(outPath, salida, 'utf8');
console.log(`OK: ${niveles.length} niveles → ${outPath} (${(salida.length / 1024).toFixed(0)} KB)`);
