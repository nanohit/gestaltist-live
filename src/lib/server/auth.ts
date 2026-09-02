import { env } from '$env/dynamic/private';

const DEFAULT_LOGIN = 'admin';
const DEFAULT_PASSWORD = '123456789';

const adminLogin = () => env.ADMIN_LOGIN || DEFAULT_LOGIN;
const adminPassword = () => env.ADMIN_PASSWORD || DEFAULT_PASSWORD;

/** Сравнение без ранних выходов — чтобы время ответа не подсказывало пароль. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkCredentials(login: string, password: string): boolean {
  return safeEqual(login, adminLogin()) && safeEqual(password, adminPassword());
}

/** Токен = пароль администратора, приходит в заголовке от админской сессии. */
export function isAuthorized(request: Request): boolean {
  const token = request.headers.get('x-admin-token') ?? '';
  return safeEqual(token, adminPassword());
}
