module.exports = {
  apps: [
    {
      name: 'uct-tv-system',
      script: 'npm',
      args: 'start',
      cwd: '/opt/uct-tv-system',
      instances: 1,
      exec_mode: 'fork',
      
      // Variables de entorno
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      
      // Configuración de logs
      log_file: '/var/log/uct-tv/combined.log',
      out_file: '/var/log/uct-tv/out.log',
      error_file: '/var/log/uct-tv/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Configuración de reinicio automático
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Configuración de usuario
      user: 'uct-tv',
      
      // Configuración de clustering (si se necesita)
      instances: 1, // Cambiar a 'max' para usar todos los cores
      exec_mode: 'fork', // Cambiar a 'cluster' si se usan múltiples instancias
      
      // Scripts de hooks
      post_update: ['npm ci', 'npm run build'],
      
      // Configuración de monitoreo
      monitoring: false,
      pmx: false,
      
      // Configuración de tiempo
      time: true,
      
      // Configuración de merge logs
      merge_logs: true,
      
      // Configuración de kill timeout
      kill_timeout: 5000,
      
      // Configuración de listen timeout
      listen_timeout: 8000,
      
      // Variables de entorno específicas para desarrollo
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      
      // Variables de entorno específicas para producción
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        UV_THREADPOOL_SIZE: 16,
        NODE_OPTIONS: '--max-old-space-size=2048'
      }
    }
  ],
  
  // Configuración de despliegue
  deploy: {
    production: {
      user: 'uct-tv',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:tu-usuario/uct-tv-system.git',
      path: '/opt/uct-tv-system',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    }
  }
};
