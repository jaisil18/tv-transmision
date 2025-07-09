import { NextRequest, NextResponse } from 'next/server';
import { networkInterfaces } from 'os';

// GET - Probar conectividad de red
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Network Test] Iniciando pruebas de conectividad...');

    // Obtener información de la request
    const host = request.headers.get('host') || 'localhost:3000';
    const userAgent = request.headers.get('user-agent') || '';
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const xRealIp = request.headers.get('x-real-ip');
    
    // Detectar IP del cliente
    let clientIp = 'unknown';
    if (xForwardedFor) {
      clientIp = xForwardedFor.split(',')[0].trim();
    } else if (xRealIp) {
      clientIp = xRealIp;
    } else {
      // Intentar extraer de la conexión
      const forwarded = request.headers.get('forwarded');
      if (forwarded) {
        const forMatch = forwarded.match(/for=([^;,\s]+)/);
        if (forMatch) {
          clientIp = forMatch[1].replace(/"/g, '');
        }
      }
    }

    // Obtener interfaces de red del servidor
    const interfaces = networkInterfaces();
    const networkInfo: any[] = [];

    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          networkInfo.push({
            name,
            address: net.address,
            netmask: net.netmask,
            cidr: net.cidr,
            isPrivate: isPrivateIP(net.address)
          });
        }
      }
    }

    // Detectar puerto actual
    const portMatch = host.match(/:(\d+)$/);
    const currentPort = portMatch ? parseInt(portMatch[1]) : 3000;

    // Generar URLs de prueba
    const testUrls = networkInfo.map(iface => ({
      interface: iface.name,
      ip: iface.address,
      url: `http://${iface.address}:${currentPort}`,
      testEndpoint: `http://${iface.address}:${currentPort}/api/public/settings`,
      screenUrl: `http://${iface.address}:${currentPort}/screen/1750056135868`,
      isPrivate: iface.isPrivate
    }));

    // Información de diagnóstico
    const diagnosticInfo = {
      server: {
        host: host.split(':')[0],
        port: currentPort,
        interfaces: networkInfo,
        primaryIP: networkInfo.length > 0 ? networkInfo[0].address : 'localhost'
      },
      client: {
        ip: clientIp,
        userAgent,
        headers: {
          'x-forwarded-for': xForwardedFor,
          'x-real-ip': xRealIp,
          'host': host
        }
      },
      connectivity: {
        testUrls,
        recommendations: generateConnectivityRecommendations(clientIp, networkInfo, currentPort)
      },
      troubleshooting: generateTroubleshootingSteps(networkInfo, currentPort, clientIp),
      timestamp: new Date().toISOString()
    };

    console.log('✅ [Network Test] Información de conectividad generada:', {
      clientIp,
      serverInterfaces: networkInfo.length,
      testUrls: testUrls.length
    });

    return NextResponse.json(diagnosticInfo, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('❌ [Network Test] Error:', error);
    return NextResponse.json(
      { 
        error: 'Error al probar conectividad',
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

// Función para generar recomendaciones de conectividad
function generateConnectivityRecommendations(clientIp: string, networkInfo: any[], port: number) {
  const recommendations = [];

  if (clientIp === 'unknown' || clientIp === '::1' || clientIp === '127.0.0.1') {
    recommendations.push({
      type: 'local',
      title: 'Acceso Local Detectado',
      description: 'Estás accediendo desde el mismo servidor',
      action: 'Para acceso remoto, usa la IP de red del servidor'
    });
  }

  if (networkInfo.length === 0) {
    recommendations.push({
      type: 'error',
      title: 'Sin Interfaces de Red',
      description: 'No se detectaron interfaces de red válidas',
      action: 'Verifica la configuración de red del servidor'
    });
  }

  recommendations.push({
    type: 'firewall',
    title: 'Configuración de Firewall',
    description: `Asegúrate de que el puerto ${port} esté abierto`,
    action: `Ejecuta: netsh advfirewall firewall add rule name="UCT TV" dir=in action=allow protocol=TCP localport=${port}`
  });

  recommendations.push({
    type: 'vlan',
    title: 'Conectividad entre VLANs',
    description: 'Para acceso desde otras VLANs, verifica el routing',
    action: 'Contacta al administrador de red para configurar routing entre VLANs'
  });

  return recommendations;
}

// Función para generar pasos de solución de problemas
function generateTroubleshootingSteps(networkInfo: any[], port: number, clientIp: string) {
  const primaryIP = networkInfo.length > 0 ? networkInfo[0].address : 'localhost';
  
  return {
    immediate: [
      {
        step: 'Verificar que el servidor esté ejecutándose',
        command: 'Verifica que veas "Ready" en la consola del servidor',
        expected: 'El servidor debe mostrar "Network: http://0.0.0.0:3000"'
      },
      {
        step: 'Probar acceso local',
        command: `curl http://localhost:${port}/api/public/settings`,
        expected: 'Debe devolver configuraciones JSON'
      },
      {
        step: 'Probar acceso por IP',
        command: `curl http://${primaryIP}:${port}/api/public/settings`,
        expected: 'Debe devolver las mismas configuraciones'
      }
    ],
    network: [
      {
        step: 'Verificar conectividad básica',
        command: `ping ${primaryIP}`,
        expected: 'Debe responder sin pérdida de paquetes'
      },
      {
        step: 'Verificar puerto abierto',
        command: `telnet ${primaryIP} ${port}`,
        expected: 'Debe conectar exitosamente'
      },
      {
        step: 'Verificar desde otro dispositivo',
        command: `curl -v http://${primaryIP}:${port}/api/public/settings`,
        expected: 'Debe conectar y devolver datos'
      }
    ],
    firewall: [
      {
        step: 'Windows - Abrir puerto en firewall',
        command: `netsh advfirewall firewall add rule name="UCT TV" dir=in action=allow protocol=TCP localport=${port}`,
        expected: 'Regla creada exitosamente'
      },
      {
        step: 'Linux - Abrir puerto en firewall',
        command: `sudo ufw allow ${port}/tcp`,
        expected: 'Regla agregada'
      },
      {
        step: 'Verificar reglas de firewall',
        command: 'netsh advfirewall firewall show rule name="UCT TV"',
        expected: 'Debe mostrar la regla activa'
      }
    ],
    vlan: [
      {
        step: 'Verificar routing entre VLANs',
        description: 'Contacta al administrador de red',
        action: 'Solicitar configuración de routing entre VLANs'
      },
      {
        step: 'Verificar ACLs',
        description: 'Verificar que no haya listas de control de acceso bloqueando',
        action: 'Revisar configuración de switches/routers'
      },
      {
        step: 'Probar desde gateway',
        description: 'Probar conectividad desde el gateway de la VLAN',
        action: `ping ${primaryIP} desde el gateway`
      }
    ]
  };
}
