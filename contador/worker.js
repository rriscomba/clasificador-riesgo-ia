// Contador anónimo de reportes (Cloudflare Worker + KV).
// Solo suma 1 por cada POST. No lee el cuerpo, no registra IP, origen ni ninguna otra información.
// GET devuelve el total: {"reportes": N}
export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ORIGEN_PERMITIDO || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Cache-Control': 'no-store'
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method === 'POST') {
      const n = parseInt((await env.CONTADOR.get('reportes')) || '0', 10) + 1;
      await env.CONTADOR.put('reportes', String(n));
      return new Response(null, { status: 204, headers: cors });
    }
    if (req.method === 'GET') {
      const n = parseInt((await env.CONTADOR.get('reportes')) || '0', 10);
      return new Response(JSON.stringify({ reportes: n }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    return new Response('Método no permitido', { status: 405, headers: cors });
  }
};
