const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const DEFAULT_HUBITAT_BASE_URL =
  "https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15";
const DEFAULT_HUBITAT_ACCESS_TOKEN = "1d9b367b-e4cd-4042-b726-718b759a82ef";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

// Hubitat Proxy - envia comandos para dispositivos
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const url = new URL(request.url);
  const device = url.searchParams.get("device");
  const command = url.searchParams.get("command");
  const value = url.searchParams.get("value");

  if (!device || !command) {
    return jsonResponse(
      { error: "Parâmetros obrigatórios: device e command" },
      400
    );
  }

  // Prioridade: secrets do ambiente. Fallback: configuração padrão do projeto.
  const baseUrl = (
    env.HUBITAT_BASE_URL ||
    env.HUBITAT_FULL_BASE_URL ||
    DEFAULT_HUBITAT_BASE_URL
  )
    ?.trim()
    .replace(/\/$/, "");
  const accessToken = (
    env.HUBITAT_ACCESS_TOKEN ||
    env.HUBITAT_TOKEN ||
    DEFAULT_HUBITAT_ACCESS_TOKEN
  )?.trim();

  if (!baseUrl || !accessToken) {
    return jsonResponse(
      {
        error:
          "Configuração Hubitat ausente: HUBITAT_BASE_URL/HUBITAT_ACCESS_TOKEN",
      },
      500
    );
  }

  try {
    // Monta URL: base/devices/{device}/{command}/{value}?access_token=token
    const hasDevicesPath = /\/devices(?:\/|$)/i.test(baseUrl);
    let cmdUrl = hasDevicesPath
      ? `${baseUrl}/${encodeURIComponent(device)}/${encodeURIComponent(
          command
        )}`
      : `${baseUrl}/devices/${encodeURIComponent(device)}/${encodeURIComponent(
          command
        )}`;

    if (value !== null && value !== undefined && value !== "") {
      cmdUrl += `/${encodeURIComponent(value)}`;
    }
    cmdUrl += `?access_token=${encodeURIComponent(accessToken)}`;

    const response = await fetch(cmdUrl, {
      method: "GET",
      headers: { Accept: "application/json, text/plain, */*" },
      cf: {
        cacheTtl: 0,
        cacheEverything: false,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      return jsonResponse(
        {
          error: `Hubitat retornou HTTP ${response.status}`,
          details: text.slice(0, 300),
        },
        response.status
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: true, text };
    }

    return jsonResponse(data, 200);
  } catch (error) {
    return jsonResponse(
      {
        error: error?.message || "Falha ao enviar comando para o Hubitat",
      },
      500
    );
  }
}
