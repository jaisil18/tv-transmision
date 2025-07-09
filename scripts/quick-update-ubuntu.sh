#!/bin/bash

# 🔄 Script de Actualización Rápida para Ubuntu - UCT TV System
# Para cambios menores sin interrumpir el servicio por mucho tiempo

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuración
SERVICE_NAME="uct-tv"
PROJECT_DIR="/opt/uct-tv-system"
USER="uct-tv"

log() { echo -e "${GREEN}✅${NC} $1"; }
warn() { echo -e "${YELLOW}⚠️${NC} $1"; }
error() { echo -e "${RED}❌${NC} $1"; }
info() { echo -e "${BLUE}ℹ️${NC} $1"; }

echo -e "${BLUE}🔄 [Quick Update] Actualización rápida de UCT TV System...${NC}\n"

# Verificar permisos
if [ "$EUID" -ne 0 ]; then
    error "Este script debe ejecutarse como root o con sudo"
    exit 1
fi

# Verificar que el proyecto existe
if [ ! -d "$PROJECT_DIR" ]; then
    error "Proyecto no encontrado en $PROJECT_DIR"
    error "Ejecuta primero el script de despliegue completo"
    exit 1
fi

# Función para actualización desde Git
update_from_git() {
    log "Actualizando desde repositorio Git..."
    cd "$PROJECT_DIR"
    
    # Verificar si hay cambios
    sudo -u "$USER" git fetch origin
    LOCAL=$(sudo -u "$USER" git rev-parse HEAD)
    REMOTE=$(sudo -u "$USER" git rev-parse origin/main)
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        info "No hay cambios nuevos en el repositorio"
        return 0
    fi
    
    log "Nuevos cambios detectados, actualizando..."
    sudo -u "$USER" git reset --hard origin/main
    return 1
}

# Función para actualización desde directorio
update_from_directory() {
    local source_dir="$1"
    
    if [ ! -d "$source_dir" ]; then
        error "Directorio fuente no existe: $source_dir"
        exit 1
    fi
    
    log "Actualizando desde directorio: $source_dir"
    
    # Comparar checksums para ver si hay cambios
    local source_checksum=$(find "$source_dir" -type f -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" | sort | xargs md5sum | md5sum | cut -d' ' -f1)
    local current_checksum=$(find "$PROJECT_DIR" -type f -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" | sort | xargs md5sum | md5sum | cut -d' ' -f1)
    
    if [ "$source_checksum" = "$current_checksum" ]; then
        info "No hay cambios en los archivos"
        return 0
    fi
    
    log "Cambios detectados, copiando archivos..."
    sudo rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='data' "$source_dir/" "$PROJECT_DIR/"
    sudo chown -R "$USER:$USER" "$PROJECT_DIR"
    return 1
}

# Función para verificar si necesita rebuild
needs_rebuild() {
    # Verificar si hay cambios en package.json o archivos de configuración
    if [ ! -f "$PROJECT_DIR/.next/BUILD_ID" ]; then
        return 0  # Necesita build inicial
    fi
    
    # Verificar si package.json cambió
    if [ "$PROJECT_DIR/package.json" -nt "$PROJECT_DIR/.next/BUILD_ID" ]; then
        return 0  # package.json es más nuevo
    fi
    
    # Verificar si hay archivos TypeScript/JavaScript más nuevos que el build
    if find "$PROJECT_DIR" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs ls -t | head -1 | xargs test "$PROJECT_DIR/.next/BUILD_ID" -ot; then
        return 0  # Hay archivos más nuevos
    fi
    
    return 1  # No necesita rebuild
}

# Función para actualización rápida
quick_update() {
    local source_dir="$1"
    local has_changes=0
    
    # Actualizar código
    if [ -n "$source_dir" ]; then
        update_from_directory "$source_dir" || has_changes=1
    else
        update_from_git || has_changes=1
    fi
    
    if [ $has_changes -eq 0 ]; then
        info "No hay cambios, no es necesario actualizar"
        return 0
    fi
    
    # Verificar si necesita reinstalar dependencias
    if [ "$PROJECT_DIR/package.json" -nt "$PROJECT_DIR/node_modules/.package-lock.json" ] 2>/dev/null; then
        log "Instalando dependencias actualizadas..."
        cd "$PROJECT_DIR"
        sudo -u "$USER" npm ci
    fi
    
    # Verificar si necesita rebuild
    if needs_rebuild; then
        log "Reconstruyendo proyecto..."
        cd "$PROJECT_DIR"
        sudo -u "$USER" npm run build
    else
        info "No es necesario reconstruir el proyecto"
    fi
    
    # Reiniciar servicio con downtime mínimo
    log "Reiniciando servicio..."
    sudo systemctl restart "$SERVICE_NAME"
    
    # Verificar que el servicio esté funcionando
    sleep 3
    if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
        log "✅ Servicio reiniciado exitosamente"
        
        # Verificar API
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/public/settings" | grep -q "200"; then
            log "✅ API responde correctamente"
        else
            warn "⚠️ API no responde, verificando logs..."
            sudo journalctl -u "$SERVICE_NAME" --no-pager -n 10
        fi
    else
        error "❌ Error al reiniciar el servicio"
        sudo journalctl -u "$SERVICE_NAME" --no-pager -n 20
        exit 1
    fi
}

# Función para mostrar estado
show_status() {
    echo -e "\n${BLUE}📊 [Status] Estado del Sistema${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    
    # Estado del servicio
    if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
        echo -e "🟢 Servicio: ${GREEN}Ejecutándose${NC}"
    else
        echo -e "🔴 Servicio: ${RED}Detenido${NC}"
    fi
    
    # Información de red
    local ip=$(hostname -I | awk '{print $1}')
    echo "🌐 IP del servidor: $ip"
    echo "🔗 URL principal: http://$ip:3000"
    echo "🔧 Panel admin: http://$ip:3000/admin"
    
    # Información del proyecto
    if [ -f "$PROJECT_DIR/package.json" ]; then
        local version=$(grep '"version"' "$PROJECT_DIR/package.json" | cut -d'"' -f4)
        echo "📦 Versión: $version"
    fi
    
    # Último build
    if [ -f "$PROJECT_DIR/.next/BUILD_ID" ]; then
        local build_time=$(stat -c %y "$PROJECT_DIR/.next/BUILD_ID" | cut -d'.' -f1)
        echo "🔨 Último build: $build_time"
    fi
    
    echo "═══════════════════════════════════════════════════════════════"
}

# Función de ayuda
show_help() {
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  --source DIR    Actualizar desde directorio específico"
    echo "  --status        Mostrar estado del sistema"
    echo "  --logs          Mostrar logs del servicio"
    echo "  --help          Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  sudo $0                                    # Actualizar desde Git"
    echo "  sudo $0 --source /home/user/uct-tv-system # Actualizar desde directorio"
    echo "  sudo $0 --status                          # Ver estado"
    echo "  sudo $0 --logs                            # Ver logs"
}

# Manejar argumentos
case "$1" in
    --help)
        show_help
        exit 0
        ;;
    --status)
        show_status
        exit 0
        ;;
    --logs)
        echo "📋 Logs del servicio $SERVICE_NAME:"
        sudo journalctl -u "$SERVICE_NAME" -f
        exit 0
        ;;
    --source)
        if [ -z "$2" ]; then
            error "Debes especificar el directorio fuente"
            show_help
            exit 1
        fi
        quick_update "$2"
        ;;
    "")
        quick_update
        ;;
    *)
        error "Opción desconocida: $1"
        show_help
        exit 1
        ;;
esac

show_status
log "🎉 Actualización completada!"
