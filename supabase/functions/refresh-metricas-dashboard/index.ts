// Job asincrónico (Paso 2, Historia "Dashboard analítico con mapas de
// calor"): refresca las vistas materializadas del dashboard municipal
// (mv_metricas_reportes_periodo / mv_metricas_turnos_periodo) — NUNCA se
// ejecuta dentro del request de GET /api/municipio/dashboard, siempre fuera
// de ese ciclo, invocado por el scheduler (Supabase Dashboard → Edge
// Functions → Cron Jobs, ver "Programación" más abajo).
//
// Deno (no Node): se ejecuta en el runtime de Supabase Edge Functions, con
// su propio resolvedor de imports (`npm:`), separado del resto del proyecto
// Next.js — no se compila ni se testea con Jest/tsc, solo con
// `supabase functions serve`/`deploy` (Supabase CLI).
//
// Usa el cliente supabase-js con la service role key (nunca la anon key acá:
// esta función corre server-side, fuera del navegador, y `rpc()` necesita
// permiso para ejecutar `refrescar_metricas_dashboard()` — SECURITY DEFINER,
// ver la migración `20260901120000_agrega_vistas_materializadas_dashboard`)
// en vez de abrir una conexión Postgres directa desde Deno: reduce la
// superficie de credenciales que esta función necesita conocer.
//
// Programación (acción manual, no versionable — mismo criterio que
// docs/SETUP.md para el resto de la configuración de paneles externos):
//   Supabase Dashboard → Edge Functions → refresh-metricas-dashboard →
//   Cron Jobs → crear un job con expresión `*/15 * * * *` (cada 15 minutos;
//   ajustar según qué tan "en vivo" necesite verse el dashboard, sabiendo
//   que ese intervalo es el techo de desactualización aceptable).

import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Método no soportado — invocar vía POST (Cron Jobs lo hace así).' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Faltan las variables de entorno SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
    return new Response(JSON.stringify({ ok: false, error: 'Configuración incompleta.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await supabase.rpc('refrescar_metricas_dashboard');

  if (error) {
    console.error('No se pudo refrescar las métricas del dashboard municipal', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, refrescadoEn: new Date().toISOString() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
