import { promises as fs } from 'fs';
import path from 'path';

const initialData = {
  screens: [],
  playlists: []
};

async function initializeDataFiles() {
  const dataDir = path.join(process.cwd(), 'data');
  
  try {
    // Asegurarse de que el directorio data existe
    await fs.mkdir(dataDir, { recursive: true });
    
    // Inicializar screens.json si no existe
    const screensPath = path.join(dataDir, 'screens.json');
    try {
      await fs.access(screensPath);
      console.log('✅ screens.json ya existe');
    } catch {
      await fs.writeFile(screensPath, JSON.stringify([], null, 2));
      console.log('✅ screens.json creado');
    }
    
    // Inicializar playlists.json si no existe
    const playlistsPath = path.join(dataDir, 'playlists.json');
    try {
      await fs.access(playlistsPath);
      console.log('✅ playlists.json ya existe');
    } catch {
      await fs.writeFile(playlistsPath, JSON.stringify([], null, 2));
      console.log('✅ playlists.json creado');
    }
  } catch (error) {
    console.error('❌ Error al inicializar archivos de datos:', error);
    process.exit(1);
  }
}

initializeDataFiles();
