import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, statSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    // Determinar la ruta base según el primer segmento
    let basePath;
    if (path[0] === 'content') {
      // Para archivos de content (mosaicos, etc.)
      basePath = join(process.cwd(), 'public', ...path);
    } else {
      // Para archivos de uploads
      basePath = join(process.cwd(), 'public', 'uploads', ...path);
    }
    const filePath = basePath;
    
    // Verificar que el archivo existe
    let stats;
    try {
      stats = statSync(filePath);
    } catch (error) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileSize = stats.size;
    const range = request.headers.get('range');

    // Si no hay range request, servir el archivo completo
    if (!range) {
      const stream = createReadStream(filePath);
      const readableStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: string | Buffer) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            controller.enqueue(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
          });
          stream.on('end', () => {
            controller.close();
          });
          stream.on('error', (error) => {
            controller.error(error);
          });
        },
        cancel() {
          stream.destroy();
        }
      });

      return new NextResponse(readableStream, {
        status: 200,
        headers: {
          'Content-Type': getContentType(filePath),
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Manejar range request
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;

    if (start >= fileSize || end >= fileSize) {
      return new NextResponse('Range not satisfiable', {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileSize}`,
        },
      });
    }

    const stream = createReadStream(filePath, { start, end });
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: string | Buffer) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          controller.enqueue(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
        });
        stream.on('end', () => {
          controller.close();
        });
        stream.on('error', (error) => {
          controller.error(error);
        });
      },
      cancel() {
        stream.destroy();
      }
    });

    return new NextResponse(readableStream, {
      status: 206,
      headers: {
        'Content-Type': getContentType(filePath),
        'Content-Length': chunkSize.toString(),
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error serving video file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function getContentType(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop();
  
  switch (ext) {
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'ogg':
      return 'video/ogg';
    case 'avi':
      return 'video/x-msvideo';
    case 'mov':
      return 'video/quicktime';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    // Determinar la ruta base según el primer segmento
    let basePath;
    if (path[0] === 'content') {
      // Para archivos de content (mosaicos, etc.)
      basePath = join(process.cwd(), 'public', ...path);
    } else {
      // Para archivos de uploads
      basePath = join(process.cwd(), 'public', 'uploads', ...path);
    }
    const filePath = basePath;
    
    let stats;
    try {
      stats = statSync(filePath);
    } catch (error) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': getContentType(filePath),
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}