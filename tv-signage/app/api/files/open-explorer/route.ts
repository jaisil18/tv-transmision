import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import { BASE_PATH, getFolderPath } from '@/lib/path-config';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { folderPath } = await request.json();
    
    console.log(`🗂️ [Open Explorer] Solicitando abrir explorador para: ${folderPath || 'carpeta base'}`);
    
    // Determinar la ruta a abrir
    let targetPath: string;
    if (folderPath) {
      targetPath = getFolderPath(folderPath);
    } else {
      targetPath = BASE_PATH;
    }
    
    // Verificar que la ruta existe
    if (!existsSync(targetPath)) {
      console.log(`❌ [Open Explorer] Ruta no existe: ${targetPath}`);
      return NextResponse.json(
        { 
          success: false,
          error: 'La carpeta no existe'
        },
        { status: 404 }
      );
    }
    
    // Detectar sistema operativo y ejecutar comando apropiado
    const currentPlatform = platform();
    let command: string;
    
    if (currentPlatform === 'win32') {
      // Windows: usar explorer
      command = `explorer "${targetPath}"`;
    } else if (currentPlatform === 'darwin') {
      // macOS: usar open
      command = `open "${targetPath}"`;
    } else {
      // Linux: intentar xdg-open primero, luego nautilus
      command = `xdg-open "${targetPath}" || nautilus "${targetPath}" || dolphin "${targetPath}" || thunar "${targetPath}"`;
    }
    
    console.log(`🖥️ [Open Explorer] Ejecutando comando: ${command}`);
    
    // Ejecutar comando
    try {
      await execAsync(command);
      console.log(`✅ [Open Explorer] Explorador abierto exitosamente para: ${targetPath}`);
      
      return NextResponse.json({
        success: true,
        message: 'Explorador abierto exitosamente',
        path: targetPath
      });
      
    } catch (execError) {
      console.error(`❌ [Open Explorer] Error al ejecutar comando:`, execError);
      
      return NextResponse.json(
        { 
          success: false,
          error: 'No se pudo abrir el explorador de archivos. Verifica que tu sistema tenga un explorador de archivos instalado.'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ [Open Explorer] Error general:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}