import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// scrypt con parámetros recomendados por OWASP (N=2^15, r=8, p=3). El formato guarda los parámetros
// para poder endurecerlos en el futuro sin invalidar contraseñas existentes.
const PARAMS = { N: 2 ** 15, r: 8, p: 3 };
const KEYLEN = 64;

function scryptAsync(password: string, salt: Buffer, opts: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEYLEN, { ...opts, maxmem: 256 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))));
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, N, r, p, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const key = await scryptAsync(password, Buffer.from(salt, 'base64'), { N: +N, r: +r, p: +p });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Hash fijo para comparar cuando el correo no existe: iguala el tiempo de respuesta y evita revelar qué cuentas existen.
let dummy: Promise<string> | undefined;
export const dummyHash = () => (dummy ??= hashPassword(randomToken()));
