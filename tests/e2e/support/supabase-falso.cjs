/**
 * Servidor HTTP mínimo que imita los tres endpoints de Supabase Auth que usan
 * el login del navegador y `middleware.ts` (`getUser()`) — para que los E2E
 * corran la app real (middleware incluido) sin depender de un proyecto
 * Supabase cloud. Solo se usa en tests/e2e, nunca en la app.
 */
const http = require('node:http');

const PUERTO = Number(process.env.E2E_SUPABASE_PORT || 54321);
const EMAIL = 'dueno@e2e.test';
const PASSWORD = 'e2e-password';
const USUARIO_ID = '11111111-1111-4111-8111-111111111111';

function base64url(objeto) {
  return Buffer.from(JSON.stringify(objeto)).toString('base64url');
}

const ahora = () => Math.floor(Date.now() / 1000);
const usuario = {
  id: USUARIO_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: EMAIL,
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00.000Z',
};

function crearSesion() {
  const expiraEn = 3600;
  const token = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({
    sub: USUARIO_ID,
    aud: 'authenticated',
    role: 'authenticated',
    exp: ahora() + expiraEn,
  })}.firma-falsa-e2e`;
  return {
    access_token: token,
    token_type: 'bearer',
    expires_in: expiraEn,
    expires_at: ahora() + expiraEn,
    refresh_token: 'refresh-e2e',
    user: usuario,
  };
}

function responder(res, estado, cuerpo) {
  res.writeHead(estado, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(cuerpo === undefined ? undefined : JSON.stringify(cuerpo));
}

const servidor = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PUERTO}`);

  if (req.method === 'OPTIONS') return responder(res, 204);
  if (req.method === 'GET' && pathname === '/health') return responder(res, 200, { ok: true });

  if (req.method === 'POST' && pathname === '/auth/v1/token') {
    let cuerpo = '';
    req.on('data', (fragmento) => (cuerpo += fragmento));
    req.on('end', () => {
      let datos = {};
      try {
        datos = JSON.parse(cuerpo || '{}');
      } catch {
        /* cuerpo inválido: cae en credenciales inválidas */
      }
      if (datos.email === EMAIL && datos.password === PASSWORD) {
        return responder(res, 200, crearSesion());
      }
      return responder(res, 400, {
        code: 400,
        error_code: 'invalid_credentials',
        msg: 'Invalid login credentials',
      });
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/auth/v1/user') {
    const autorizacion = req.headers.authorization || '';
    if (autorizacion.startsWith('Bearer ') && autorizacion.includes('firma-falsa-e2e')) {
      return responder(res, 200, usuario);
    }
    return responder(res, 401, { code: 401, msg: 'invalid JWT' });
  }

  if (req.method === 'POST' && pathname === '/auth/v1/logout') return responder(res, 204);
  if (req.method === 'POST' && pathname === '/rest/v1/rpc/rol_actual') {
    return responder(res, 200, 'dueño');
  }

  return responder(res, 404, { message: `Ruta no simulada: ${req.method} ${pathname}` });
});

servidor.listen(PUERTO, () => {
  console.log(`Supabase falso (E2E) escuchando en http://localhost:${PUERTO}`);
});
