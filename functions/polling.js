/**
 * Polling function - retorna dados de dispositivos do Hubitat
 * URL hardcoded com access_token incluído
 * 
 * Parâmetros de query:
 * - full=1 : retorna o payload completo do Hubitat sem processamento
 * 
 * Retorna sempre JSON válido
 */
export async function onRequest(context) {
  const { request } = context;
  
  // URL completa do Hubitat Cloud com access token
  const HUBITAT_URL = "https://cloud.hubitat.com/api/88fdad30-2497-4de1-b131-12fc4903ae67/apps/214/devices/all?access_token=0aa81379-277a-42cb-95be-a4fb67e353f0";
  
  // Extrair parâmetro 'full' da URL
  const url = new URL(request.url);
  const wantFull = url.searchParams.get('full') === '1';

  try {
    console.log("📡 [Polling] Requisitando:", HUBITAT_URL);

    // Fazer request ao Hubitat
    const response = await fetch(HUBITAT_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      cf: {
        cacheTtl: 0,
        cacheEverything: false
      }
    });

    console.log("📡 [Polling] Response status:", response.status);
    console.log("📡 [Polling] Content-Type:", response.headers.get("content-type"));

    // Ler resposta como texto PRIMEIRO
    const responseText = await response.text();
    console.log("📡 [Polling] Response length:", responseText.length, "bytes");

    // Verificar se a resposta é bem-sucedida
    if (!response.ok) {
      console.error("❌ [Polling] HTTP Error", response.status);
      console.error("❌ [Polling] Response:", responseText.substring(0, 500));
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Hubitat retornou HTTP ${response.status}`,
          details: responseText.substring(0, 200)
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
          }
        }
      );
    }

    // Tentar parsear como JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log("✅ [Polling] JSON parsed successfully");
    } catch (parseError) {
      console.error("❌ [Polling] Failed to parse JSON:", parseError.message);
      console.error("❌ [Polling] Response text:", responseText.substring(0, 500));
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "Hubitat não retornou JSON válido",
          details: responseText.substring(0, 200)
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
          }
        }
      );
    }

    // Se cliente pediu payload completo, retornar direto
    if (wantFull) {
      console.log("📡 [Polling] Retornando payload completo");
      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
          }
        }
      );
    }

    // Normalizar resposta (garantir array)
    const devices = Array.isArray(data) ? data : [];
    console.log(`✅ [Polling] Retornando ${devices.length} dispositivos`);

    return new Response(
      JSON.stringify({
        success: true,
        source: "hubitat",
        deviceCount: devices.length,
        data: devices
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        }
      }
    );

  } catch (error) {
    console.error("❌ [Polling] Exception:", error.message);
    console.error("❌ [Polling] Stack:", error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Erro ao buscar dados do Hubitat",
        details: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        }
      }
    );
  }
}
