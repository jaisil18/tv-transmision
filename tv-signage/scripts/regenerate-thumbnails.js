#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

console.log('🎬 Regenerando miniaturas para videos existentes...\n');

async function generateThumbnail(inputPath, outputPath) {
  const command = [
    'ffmpeg',
    '-i', `"${inputPath}"`,
    '-ss', '00:00:02',
    '-vframes', '1',
    '-vf', '"scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2:black"',
    '-q:v', '2',
    '-y',
    `"${outputPath}"`
  ].join(' ');

  console.log(`🔧 Generando: ${path.basename(outputPath)}`);
  
  try {
    await execAsync(command);
    const stats = fs.statSync(outputPath);
    console.log(`✅ Generada: ${path.basename(outputPath)} (${Math.round(stats.size/1024)} KB)`);
    return true;
  } catch (error) {
    console.error(`❌ Error: ${path.basename(outputPath)} - ${error.message}`);
    return false;
  }
}

async function main() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const thumbnailsDir = path.join(process.cwd(), 'public', 'thumbnails');

  // Crear directorio de miniaturas si no existe
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
    console.log('📁 Directorio de miniaturas creado');
  }

  // Verificar ffmpeg
  try {
    await execAsync('ffmpeg -version');
    console.log('✅ FFmpeg disponible\n');
  } catch (error) {
    console.error('❌ FFmpeg no está disponible. Instálalo primero.');
    process.exit(1);
  }

  // Obtener archivos de video
  const files = fs.readdirSync(uploadsDir);
  const videoFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.mp4', '.webm', '.avi', '.mov'].includes(ext);
  });

  if (videoFiles.length === 0) {
    console.log('📭 No se encontraron videos para procesar');
    return;
  }

  console.log(`📊 Videos encontrados: ${videoFiles.length}\n`);

  let successful = 0;
  let failed = 0;

  for (const videoFile of videoFiles) {
    const inputPath = path.join(uploadsDir, videoFile);
    const thumbnailName = path.basename(videoFile, path.extname(videoFile)) + '.jpg';
    const outputPath = path.join(thumbnailsDir, thumbnailName);

    // Verificar si ya existe la miniatura
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  Saltando: ${thumbnailName} (ya existe)`);
      continue;
    }

    const success = await generateThumbnail(inputPath, outputPath);
    if (success) {
      successful++;
    } else {
      failed++;
    }
  }

  console.log('\n📈 Resumen:');
  console.log(`✅ Exitosas: ${successful}`);
  console.log(`❌ Fallidas: ${failed}`);
  console.log(`📁 Total procesados: ${successful + failed}`);

  if (successful > 0) {
    console.log('\n🔄 Reinicia el servidor para ver los cambios:');
    console.log('npm run service-restart');
  }
}

main().catch(console.error);
