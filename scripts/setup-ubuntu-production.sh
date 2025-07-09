#!/bin/bash

# 🐧 Script de Configuración Inicial para Ubuntu - UCT TV System
# Prepara el servidor Ubuntu para producción

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}✅${NC} $1"; }
warn() { echo -e "${YELLOW}⚠️${NC} $1"; }
error() { echo -e "${RED}❌${NC} $1"; }
info() { echo -e "${BLUE}ℹ️${NC} $1"; }

echo -e "${BLUE}🐧 [Setup] Configuración inicial de Ubuntu para UCT TV System...${NC}\n"

# Verificar permisos
if [ "$EUID" -ne 0 ]; then
    error "Este script debe ejecutarse como root o con sudo"
    exit 1
fi

# Actualizar sistema
update_system() {
    log "Actualizando sistema Ubuntu..."
    apt update
    apt upgrade -y
    apt autoremove -y
}

# Instalar dependencias del sistema
install_system_dependencies() {
    log "Instalando dependencias del sistema..."
    
    apt install -y \
        curl \
        wget \
        git \
        build-essential \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        ufw \
        htop \
        nano \
        rsync \
        unzip \
        ffmpeg \
        netstat-nat \
        telnet
}

# Instalar Node.js
install_nodejs() {
    log "Instalando Node.js 18..."
    
    # Verificar si ya está instalado
    if command -v node &> /dev/null; then
        local current_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$current_version" -ge 18 ]; then
            log "Node.js $current_version ya está instalado"
            return 0
        fi
    fi
    
    # Instalar Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    
    # Verificar instalación
    log "Node.js instalado: $(node --version)"
    log "NPM instalado: $(npm --version)"
}

# Configurar firewall
setup_firewall() {
    log "Configurando firewall UFW..."
    
    # Habilitar UFW si no está habilitado
    if ! ufw status | grep -q "Status: active"; then
        ufw --force enable
    fi
    
    # Reglas básicas
    ufw default deny incoming
    ufw default allow outgoing
    
    # Permitir SSH
    ufw allow ssh
    
    # Permitir puerto de la aplicación
    ufw allow 3000/tcp comment "UCT TV System"
    
    # Permitir RTSP si se usa
    ufw allow 8554/tcp comment "UCT TV RTSP"
    
    log "Firewall configurado:"
    ufw status numbered
}

# Configurar límites del sistema
configure_system_limits() {
    log "Configurando límites del sistema..."
    
    # Configurar límites para el usuario uct-tv
    cat > /etc/security/limits.d/uct-tv.conf << EOF
uct-tv soft nofile 65536
uct-tv hard nofile 65536
uct-tv soft nproc 4096
uct-tv hard nproc 4096
EOF

    # Configurar límites del kernel
    cat >> /etc/sysctl.conf << EOF

# UCT TV System optimizations
fs.file-max = 2097152
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_max_tw_buckets = 1440000
EOF

    sysctl -p
}

# Configurar logrotate
setup_logrotate() {
    log "Configurando rotación de logs..."
    
    cat > /etc/logrotate.d/uct-tv << EOF
/var/log/uct-tv/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 uct-tv uct-tv
    postrotate
        systemctl reload uct-tv || true
    endscript
}
EOF
}

# Configurar monitoreo básico
setup_monitoring() {
    log "Configurando monitoreo básico..."
    
    # Script de monitoreo
    cat > /usr/local/bin/uct-tv-monitor.sh << 'EOF'
#!/bin/bash

SERVICE_NAME="uct-tv"
LOG_FILE="/var/log/uct-tv/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Verificar si el servicio está ejecutándose
if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "[$DATE] ERROR: Servicio $SERVICE_NAME no está ejecutándose" >> "$LOG_FILE"
    systemctl start "$SERVICE_NAME"
    echo "[$DATE] INFO: Intentando reiniciar servicio $SERVICE_NAME" >> "$LOG_FILE"
fi

# Verificar conectividad HTTP
if ! curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/public/settings" | grep -q "200"; then
    echo "[$DATE] WARNING: API no responde en puerto 3000" >> "$LOG_FILE"
fi

# Verificar uso de memoria
MEMORY_USAGE=$(ps -o pid,ppid,cmd,%mem,%cpu --sort=-%mem -C node | head -2 | tail -1 | awk '{print $4}')
if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
    echo "[$DATE] WARNING: Alto uso de memoria: $MEMORY_USAGE%" >> "$LOG_FILE"
fi
EOF

    chmod +x /usr/local/bin/uct-tv-monitor.sh
    
    # Cron job para monitoreo cada 5 minutos
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/uct-tv-monitor.sh") | crontab -
}

# Crear estructura de directorios
create_directory_structure() {
    log "Creando estructura de directorios..."
    
    mkdir -p /opt/uct-tv-system
    mkdir -p /opt/uct-tv-backups
    mkdir -p /var/log/uct-tv
    mkdir -p /etc/uct-tv
    
    # Crear usuario del sistema si no existe
    if ! id "uct-tv" &>/dev/null; then
        useradd -r -s /bin/false -d /opt/uct-tv-system uct-tv
    fi
    
    chown -R uct-tv:uct-tv /opt/uct-tv-system
    chown -R uct-tv:uct-tv /var/log/uct-tv
}

# Configurar variables de entorno
setup_environment() {
    log "Configurando variables de entorno..."
    
    cat > /etc/uct-tv/environment << EOF
# UCT TV System Environment Variables
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/uct-tv/application.log

# Performance
UV_THREADPOOL_SIZE=16
NODE_OPTIONS="--max-old-space-size=2048"
EOF
}

# Instalar PM2 como alternativa a systemd
install_pm2() {
    log "Instalando PM2 para gestión de procesos..."
    
    npm install -g pm2
    
    # Configurar PM2 para inicio automático
    pm2 startup systemd -u uct-tv --hp /opt/uct-tv-system
    
    log "PM2 instalado. Configuración disponible después del despliegue."
}

# Optimizar para producción
optimize_for_production() {
    log "Aplicando optimizaciones para producción..."
    
    # Configurar swap si no existe
    if [ ! -f /swapfile ]; then
        log "Creando archivo swap de 2GB..."
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    
    # Configurar timezone
    timedatectl set-timezone America/Lima
    
    # Configurar NTP
    apt install -y ntp
    systemctl enable ntp
}

# Crear scripts de utilidad
create_utility_scripts() {
    log "Creando scripts de utilidad..."
    
    # Script de estado del sistema
    cat > /usr/local/bin/uct-tv-status << 'EOF'
#!/bin/bash
echo "🖥️  UCT TV System - Estado del Sistema"
echo "═══════════════════════════════════════════════════════════════"
echo "📊 Servicio: $(systemctl is-active uct-tv 2>/dev/null || echo 'No configurado')"
echo "🌐 Puerto 3000: $(netstat -tuln | grep :3000 >/dev/null && echo 'Escuchando' || echo 'No escuchando')"
echo "💾 Memoria: $(free -h | grep Mem | awk '{print $3"/"$2}')"
echo "💽 Disco: $(df -h / | tail -1 | awk '{print $3"/"$2" ("$5" usado)"}')"
echo "🔥 CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)% usado"
echo "⏰ Uptime: $(uptime -p)"
echo "═══════════════════════════════════════════════════════════════"
EOF

    chmod +x /usr/local/bin/uct-tv-status
    
    # Script de logs
    cat > /usr/local/bin/uct-tv-logs << 'EOF'
#!/bin/bash
case "$1" in
    "app"|"")
        journalctl -u uct-tv -f
        ;;
    "monitor")
        tail -f /var/log/uct-tv/monitor.log
        ;;
    "all")
        tail -f /var/log/uct-tv/*.log
        ;;
    *)
        echo "Uso: uct-tv-logs [app|monitor|all]"
        ;;
esac
EOF

    chmod +x /usr/local/bin/uct-tv-logs
}

# Función principal
main() {
    log "🚀 Iniciando configuración de Ubuntu para UCT TV System..."
    
    update_system
    install_system_dependencies
    install_nodejs
    setup_firewall
    configure_system_limits
    create_directory_structure
    setup_environment
    setup_logrotate
    setup_monitoring
    install_pm2
    optimize_for_production
    create_utility_scripts
    
    echo -e "\n${GREEN}🎉 Configuración inicial completada!${NC}"
    echo -e "\n${BLUE}📋 Próximos pasos:${NC}"
    echo "1. Ejecutar el script de despliegue:"
    echo "   sudo ./scripts/deploy-ubuntu.sh --source /ruta/a/tu/proyecto"
    echo ""
    echo "2. Verificar el estado:"
    echo "   uct-tv-status"
    echo ""
    echo "3. Ver logs:"
    echo "   uct-tv-logs"
    echo ""
    echo "4. Para actualizaciones futuras:"
    echo "   sudo ./scripts/quick-update-ubuntu.sh --source /ruta/a/tu/proyecto"
    echo ""
    echo -e "${YELLOW}⚠️ Reinicia el servidor para aplicar todos los cambios:${NC}"
    echo "   sudo reboot"
}

# Ejecutar función principal
main "$@"
