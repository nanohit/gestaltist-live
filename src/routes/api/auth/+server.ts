import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkCredentials } from '$lib/server/auth';

export const config = { isr: false };

export const POST: RequestHandler = async ({ request }) => {
  let login = '';
  let password = '';
  try {
    const body = await request.json();
    login = typeof body?.login === 'string' ? body.login : '';
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return json({ success: false, error: 'Некорректный запрос' }, { status: 400 });
  }

  if (!checkCredentials(login, password)) {
    return json({ success: false, error: 'Неверный логин или пароль' }, { status: 401 });
  }
  return json({ success: true, token: password });
};
