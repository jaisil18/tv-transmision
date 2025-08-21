import { NextRequest, NextResponse } from 'next/server';
import { networkInterfaces } from 'os';

// GET - Detectar configuración de red automáticamente
export async function GET(request: NextRequest) {
  try {
    console.log('🌐 [Network Detect] Detectando configuración de red...');

    // Obtener información de la request
    const host = request.headers.get('host') || 'localhost:3000';
    const userAgent = request.headers.get('user-agent') || '';
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const xRealIp = request.headers.get('x-real-ip');
    
    // Detectar el puerto actual
    const portMatch = host.match(/:(\d+)$/);
    const currentPort = portMatch ? parseInt(portMatch[1]) : 3000;
    
    // Obtener interfaces de red del servidor
    const interfaces = networkInterfaces();
    const networkInfo: any[] = [];
    
    for (const [interfaceName, addresses] of Object.entries(interfaces)) {
      if (!addresses) continue;
      
      for (const address of addresses) {
        // Solo incluir direcciones IPv4 no internas
        if (address.family === 'IPv4' && !address.internal) {
          networkInfo.push({
            interface: interfaceName,
            address: address.address,
            netmask: address.netmask,
            mac: address.mac,
            cidr: address.cidr
          });
        }
      }
    }

    // Detectar IP del cliente
    let clientIp = 'unknown';
    if (xForwardedFor) {
      clientIp = xForwardedFor.split(',')[0].trim();
    } else if (xRealIp) {
      clientIp = xRealIp;
    } else {
      // Extraer IP de la conexión directa
      const connection = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'localhost';
      clientIp = connection;
    }

    // Detectar tipo de dispositivo
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad/i.test(userAgent);
    
    // Generar URLs sugeridas para diferentes interfaces
    const suggestedUrls = networkInfo.map(net => ({
      interface: net.interface,
      ip: net.address,
      url: `http://${net.address}:${currentPort}`,
      hlsBaseUrl: `http://${net.address}:${currentPort}/api/hls`,
      isPrivate: isPrivateIP(net.address),
      network: getNetworkType(net.address)
    }));

    // Determinar la mejor URL para el cliente
    const bestUrl = determineBestUrl(suggestedUrls, clientIp);

    const networkConfig = {
      server: {
        currentPort,
        host: host.split(':')[0],
        interfaces: networkInfo,
        primaryIP: networkInfo.length > 0 ? networkInfo[0].address : host.split(':')[0]
      },
      client: {
        ip: clientIp,
        userAgent,
        isMobile,
        isAndroid,
        isIOS,
        sameNetwork: isClientInSameNetwork(clientIp, networkInfo)
      },
      urls: {
        current: `http://${host}`,
        suggested: suggestedUrls,
        best: bestUrl,
        // URLs específicas para diferentes escenarios
        local: `http://localhost:${currentPort}`,
        network: networkInfo.length > 0 ? `http://${networkInfo[0].address}:${currentPort}` : `http://${host}`,
        external: suggestedUrls.length > 0 ? suggestedUrls[0] : `http://${host}`
      },
      hls: {
        baseUrl: bestUrl ? `${bestUrl}/api/hls` : `http://${host}/api/hls`,
        segmentsUrl: bestUrl ? `${bestUrl}/api/hls/segments` : `http://${host}/api/hls/segments`
      },
      access: {
        instructions: generateAccessInstructions(networkInfo, currentPort, clientIp),
        troubleshooting: generateTroubleshootingSteps(networkInfo, currentPort)
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ [Network Detect] Configuración de red detectada:', {
      serverInterfaces: networkInfo.length,
      clientIp,
      bestUrl,
      isMobile,
      isAndroid
    });

    return NextResponse.json(networkConfig, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('❌ [Network Detect] Error:', error);
    return NextResponse.json(
      { 
        error: 'Error al detectar configuración de red',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// OPTIONS - Para CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Función auxiliar para determinar si una IP es privada
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  // 169.254.0.0/16 (APIPA)
  if (parts[0] === 169 && parts[1] === 254) return true;
  
  return false;
}

// Función auxiliar para determinar el tipo de red
function getNetworkType(ip: string): string {
  if (!isPrivateIP(ip)) return 'public';
  
  const parts = ip.split('.').map(Number);
  
  if (parts[0] === 10) return 'private-class-a';
  if (parts[0] === 172) return 'private-class-b';
  if (parts[0] === 192) return 'private-class-c';
  if (parts[0] === 169) return 'link-local';
  
  return 'unknown';
}

// Función auxiliar para determinar la mejor URL
function determineBestUrl(urls: any[], clientIp: string): string | null {
  if (urls.length === 0) return null;
  
  // Si el cliente es localhost, usar localhost
  if (clientIp === 'localhost' || clientIp === '127.0.0.1' || clientIp === '::1') {
    const localhostUrl = urls.find(u => u.ip === '127.0.0.1' || u.ip.startsWith('192.168.') || u.ip.startsWith('10.'));
    return localhostUrl ? localhostUrl.url : urls[0].url;
  }
  
  // Buscar una URL en la misma red que el cliente
  const clientParts = clientIp.split('.').map(Number);
  
  for (const url of urls) {
    const urlParts = url.ip.split('.').map(Number);
    
    // Verificar si están en la misma red (simplificado)
    if (clientParts[0] === urlParts[0] && clientParts[1] === urlParts[1]) {
      return url.url;
    }
  }
  
  // Fallback: usar la primera URL privada disponible
  const privateUrl = urls.find(u => u.isPrivate);
  return privateUrl ? privateUrl.url : urls[0].url;
}

// Función para verificar si el cliente está en la misma red
function isClientInSameNetwork(clientIp: string, networkInfo: any[]): boolean {
  if (!clientIp || clientIp === '::1' || clientIp === '127.0.0.1') {
    return true; // localhost
  }

  for (const netInfo of networkInfo) {
    const serverNetwork = getNetworkAddress(netInfo.address, netInfo.netmask || '255.255.255.0');
    const clientNetwork = getNetworkAddress(clientIp, netInfo.netmask || '255.255.255.0');
    if (serverNetwork === clientNetwork) {
      return true;
    }
  }

  return false;
}

// Función para obtener la dirección de red
function getNetworkAddress(ip: string, netmask: string): string {
  const ipParts = ip.split('.').map(Number);
  const maskParts = netmask.split('.').map(Number);

  const networkParts = ipParts.map((part, index) => part & maskParts[index]);
  return networkParts.join('.');
}

// Función para generar instrucciones de acceso
function generateAccessInstructions(networkInfo: any[], port: number, clientIp: string): any {
  const primaryIP = networkInfo.length > 0 ? networkInfo[0].address : 'localhost';

  return {
    sameNetwork: {
      description: "Acceso desde la misma red",
      url: `http://${primaryIP}:${port}/screen/[SCREEN_ID]`,
      example: `http://${primaryIP}:${port}/screen/1750056135868`,
      steps: [
        "Asegúrate de estar conectado a la misma red WiFi/Ethernet",
        "Usa la URL mostrada arriba",
        "Reemplaza [SCREEN_ID] con el ID real de tu pantalla"
      ]
    },
    differentVLAN: {
      description: "Acceso desde otra VLAN",
      url: `http://${primaryIP}:${port}/screen/[SCREEN_ID]`,
      requirements: [
        "El firewall debe permitir el puerto " + port,
        "Debe haber conectividad entre VLANs",
        "No debe haber restricciones de routing"
      ],
      testCommand: `curl -I http://${primaryIP}:${port}/api/public/settings`
    },
    mobile: {
      description: "Acceso desde dispositivos móviles",
      url: `http://${primaryIP}:${port}/screen/[SCREEN_ID]`,
      steps: [
        "Conecta el móvil a la misma red WiFi",
        "Abre el navegador web",
        "Ingresa la URL completa",
        "El sistema se adaptará automáticamente al móvil"
      ]
    }
  };
}

// Función para generar pasos de solución de problemas
function generateTroubleshootingSteps(networkInfo: any[], port: number): any {
  const primaryIP = networkInfo.length > 0 ? networkInfo[0].address : 'localhost';

  return {
    connectivity: [
      {
        step: "Verificar conectividad básica",
        command: `ping ${primaryIP}`,
        description: "Debe responder sin pérdida de paquetes"
      },
      {
        step: "Verificar puerto del servidor",
        command: `telnet ${primaryIP} ${port}`,
        description: "Debe conectar exitosamente"
      },
      {
        step: "Verificar API pública",
        command: `curl http://${primaryIP}:${port}/api/public/settings`,
        description: "Debe devolver configuraciones JSON"
      }
    ],
    firewall: [
      "Verificar que el puerto " + port + " esté abierto en el firewall",
      "En Windows: netsh advfirewall firewall add rule name=\"UCT TV\" dir=in action=allow protocol=TCP localport=" + port,
      "En Linux: sudo ufw allow " + port + "/tcp",
      "En macOS: Verificar en Preferencias del Sistema > Seguridad > Firewall"
    ],
    network: [
      "Verificar que no haya restricciones de VLAN",
      "Verificar routing entre subredes",
      "Verificar que el servidor esté escuchando en todas las interfaces (0.0.0.0)",
      "Verificar configuración de proxy/NAT si aplica"
    ]
  };
}
