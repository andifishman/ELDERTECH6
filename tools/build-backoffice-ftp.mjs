// Compila el backoffice para servirlo en https://eldertech.ledor.com.ar/admin/ (base '/admin/').
// Se hace con un script para que funcione igual en Windows, Mac y Linux (sin sintaxis de variables de entorno).
import { spawnSync } from 'node:child_process';

const cwd = 'backoffice';
const env = { ...process.env, VITE_BASE_PATH: '/admin/' };
for (const args of [['install'], ['run', 'build']]) {
  const r = spawnSync('npm', args, { cwd, env, stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
