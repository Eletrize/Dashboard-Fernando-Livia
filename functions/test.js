/**
 * Test endpoint para verificar se as Cloudflare Functions estão funcionando
 * Route: /test
 */

export async function onRequest(context) {
  const { request, env } = context;

  return new Response(JSON.stringify({
    message: '✅ Cloudflare Functions estão funcionando!',
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    testId: Math.random().toString(36).substring(7),
    environmentVariables: {
      hasHubitatBaseUrl: !!env.HUBITAT_BASE_URL,
      hasHubitatAccessToken: !!env.HUBITAT_ACCESS_TOKEN,
      allEnvKeys: Object.keys(env || {})
    }
  }, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}