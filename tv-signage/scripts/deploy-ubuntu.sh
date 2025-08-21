#!/bin/bash

# 🚀 Script de Despliegue para Ubuntu - UCT TV System
# Actualiza el proyecto sin interrumpir el servicio

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
PROJECT_NAME="uct-tv-system"
SERVICE_NAME="uct-tv"
PROJECT_DIR="/opt/uct-tv-system"
BACKUP_DIR="/opt/uct-tv-backups"
USER="uct-tv"
PORT=3000

echo -e "${BLUE}🚀 [Deploy] Iniciando despliegue de UCT TV System...${NC}\n"

# Función para logging
log() {
    echo -e "${GREEN}✅ [Deploy]${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠️ [Deploy]${NC} $1"
}

error() {
    echo -e "${RED}❌ [Deploy]${NC} $1"
}

# Función para verificar si el usuario existe
check_user() {
    if ! id "$USER" &>/dev/null; then
        log "Creando usuario del sistema: $USER"
        sudo useradd -r -s /bin/false -d "$PROJECT_DIR" "$USER"
    else
        log "Usuario $USER ya existe"
    fi
}

# Función para crear directorios necesarios
create_directories() {
    log "Creando directorios necesarios..."
    sudo mkdir -p "$PROJECT_DIR"
    sudo mkdir -p "$BACKUP_DIR"
    sudo mkdir -p "/var/log/uct-tv"
    sudo chown -R "$USER:$USER" "$PROJECT_DIR"
    sudo chown -R "$USER:$USER" "/var/log/uct-tv"
}

# Función para hacer backup
create_backup() {
    if [ -d "$PROJECT_DIR" ] && [ "$(ls -A $PROJECT_DIR)" ]; then
        local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
        log "Creando backup: $backup_name"
        
        sudo mkdir -p "$BACKUP_DIR/$backup_name"
        sudo cp -r "$PROJECT_DIR"/* "$BACKUP_DIR/$backup_name/" 2>/dev/null || true
        
        # Mantener solo los últimos 5 backups
        sudo find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup-*" | sort -r | tail -n +6 | sudo xargs rm -rf
        
        log "Backup creado en: $BACKUP_DIR/$backup_name"
    else
        warn "No hay proyecto existente para hacer backup"
    fi
}

# Función para detener el servicio
stop_service() {
    if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
        log "Deteniendo servicio $SERVICE_NAME..."
        sudo systemctl stop "$SERVICE_NAME"
        sleep 2
    else
        warn "Servicio $SERVICE_NAME no está ejecutándose"
    fi
}

# Función para actualizar código
update_code() {
    log "Actualizando código del proyecto..."
    
    # Si es un repositorio git
    if [ -d "$PROJECT_DIR/.git" ]; then
        log "Actualizando desde repositorio Git..."
        cd "$PROJECT_DIR"
        sudo -u "$USER" git fetch origin
        sudo -u "$USER" git reset --hard origin/main
    else
        # Si se está copiando desde otro directorio
        if [ -n "$SOURCE_DIR" ] && [ -d "$SOURCE_DIR" ]; then
            log "Copiando archivos desde: $SOURCE_DIR"
            sudo rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' "$SOURCE_DIR/" "$PROJECT_DIR/"
        else
            error "No se especificó SOURCE_DIR o no existe"
            exit 1
        fi
    fi
    
    sudo chown -R "$USER:$USER" "$PROJECT_DIR"
}

# Función para instalar dependencias
install_dependencies() {
    log "Instalando dependencias..."
    cd "$PROJECT_DIR"
    
    # Verificar si Node.js está instalado
    if ! command -v node &> /dev/null; then
        log "Instalando Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Instalar dependencias del proyecto
    sudo -u "$USER" npm ci --production=false
    
    # Construir el proyecto
    log "Construyendo proyecto..."
    sudo -u "$USER" npm run build
}

# Función para configurar el servicio systemd
setup_service() {
    log "Configurando servicio systemd..."
    
    sudo tee "/etc/systemd/system/$SERVICE_NAME.service" > /dev/null <<EOF
[Unit]
Description=UCT TV System
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
Environment=NODE_ENV=production
Environment=PORT=$PORT
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Límites de recursos
LimitNOFILE=65536
LimitNPROC=4096

# Configuración de red
Environment=HOSTNAME=0.0.0.0

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
}

# Función para configurar firewall
setup_firewall() {
    log "Configurando firewall..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw allow "$PORT/tcp" comment "UCT TV System"
        log "Puerto $PORT abierto en UFW"
    else
        warn "UFW no está instalado, configura el firewall manualmente"
    fi
}

# Función para iniciar el servicio
start_service() {
    log "Iniciando servicio $SERVICE_NAME..."
    sudo systemctl start "$SERVICE_NAME"
    
    # Esperar un momento y verificar el estado
    sleep 5
    
    if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
        log "Servicio iniciado exitosamente"
        
        # Mostrar logs recientes
        log "Logs recientes del servicio:"
        sudo journalctl -u "$SERVICE_NAME" --no-pager -n 10
    else
        error "Error al iniciar el servicio"
        sudo journalctl -u "$SERVICE_NAME" --no-pager -n 20
        exit 1
    fi
}

# Función para verificar el despliegue
verify_deployment() {
    log "Verificando despliegue..."
    
    # Verificar que el servicio esté ejecutándose
    if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
        log "✅ Servicio está ejecutándose"
    else
        error "❌ Servicio no está ejecutándose"
        return 1
    fi
    
    # Verificar que el puerto esté escuchando
    if netstat -tuln | grep -q ":$PORT "; then
        log "✅ Puerto $PORT está escuchando"
    else
        warn "⚠️ Puerto $PORT no está escuchando"
    fi
    
    # Verificar conectividad HTTP
    sleep 3
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/public/settings" | grep -q "200"; then
        log "✅ API responde correctamente"
    else
        warn "⚠️ API no responde en http://localhost:$PORT"
    fi
}

# Función para mostrar información del despliegue
show_deployment_info() {
    echo -e "\n${BLUE}📋 [Deploy] Información del Despliegue${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${GREEN}✅ Despliegue completado exitosamente${NC}"
    echo ""
    echo "🌐 URLs de acceso:"
    echo "   • Local: http://localhost:$PORT"
    echo "   • Red: http://$(hostname -I | awk '{print $1}'):$PORT"
    echo "   • Admin: http://$(hostname -I | awk '{print $1}'):$PORT/admin"
    echo ""
    echo "🔧 Comandos útiles:"
    echo "   • Ver estado: sudo systemctl status $SERVICE_NAME"
    echo "   • Ver logs: sudo journalctl -u $SERVICE_NAME -f"
    echo "   • Reiniciar: sudo systemctl restart $SERVICE_NAME"
    echo "   • Detener: sudo systemctl stop $SERVICE_NAME"
    echo ""
    echo "📁 Directorios:"
    echo "   • Proyecto: $PROJECT_DIR"
    echo "   • Backups: $BACKUP_DIR"
    echo "   • Logs: /var/log/uct-tv"
    echo ""
    echo "👤 Usuario del servicio: $USER"
    echo "🔥 Puerto: $PORT"
    echo "═══════════════════════════════════════════════════════════════"
}

# Función principal
main() {
    # Verificar que se ejecute como root o con sudo
    if [ "$EUID" -ne 0 ]; then
        error "Este script debe ejecutarse como root o con sudo"
        exit 1
    fi
    
    # Verificar argumentos
    if [ "$1" = "--source" ] && [ -n "$2" ]; then
        SOURCE_DIR="$2"
        log "Usando directorio fuente: $SOURCE_DIR"
    fi
    
    # Ejecutar pasos del despliegue
    check_user
    create_directories
    create_backup
    stop_service
    update_code
    install_dependencies
    setup_service
    setup_firewall
    start_service
    verify_deployment
    show_deployment_info
    
    log "🎉 Despliegue completado exitosamente!"
}

# Función de ayuda
show_help() {
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  --source DIR    Directorio fuente del proyecto"
    echo "  --help         Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  sudo $0 --source /home/user/uct-tv-system"
    echo "  sudo $0  # Para actualizar desde Git"
}

# Manejar argumentos
case "$1" in
    --help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
