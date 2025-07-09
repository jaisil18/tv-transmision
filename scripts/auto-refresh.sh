#!/bin/bash

# Script de auto-refresh para TV Signage System
# Monitorea cambios en el proyecto y reinicia el servicio automáticamente

PROJECT_DIR="/mnt/raid1/tv-signage"
SERVICE_NAME="tv-signage"
LOG_FILE="/var/log/tv-signage-auto-refresh.log"

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | sudo tee -a "$LOG_FILE"
}

# Función para construir y reiniciar
rebuild_and_restart() {
    log "🔄 Detectados cambios en el proyecto. Iniciando rebuild..."
    
    cd "$PROJECT_DIR" || exit 1
    
    # Construir el proyecto
    log "📦 Construyendo proyecto..."
    if npm run build > /tmp/build.log 2>&1; then
        log "✅ Build completado exitosamente"
        
        # Reiniciar el servicio
        log "🔄 Reiniciando servicio $SERVICE_NAME..."
        if sudo systemctl restart "$SERVICE_NAME"; then
            log "✅ Servicio reiniciado exitosamente"
            
            # Verificar que el servicio esté funcionando
            sleep 3
            if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
                log "✅ Servicio está activo y funcionando"
            else
                log "❌ Error: El servicio no está activo después del reinicio"
                sudo systemctl status "$SERVICE_NAME" >> "$LOG_FILE" 2>&1
            fi
        else
            log "❌ Error al reiniciar el servicio"
            sudo systemctl status "$SERVICE_NAME" >> "$LOG_FILE" 2>&1
        fi
    else
        log "❌ Error en el build del proyecto"
        cat /tmp/build.log >> "$LOG_FILE"
    fi
}

# Función principal de monitoreo
monitor_changes() {
    log "🚀 Iniciando monitoreo de cambios en $PROJECT_DIR"
    
    # Usar inotifywait para monitorear cambios
    inotifywait -m -r -e modify,create,delete,move \
        --exclude '\.(git|next|node_modules|\.log)' \
        --format '%w%f %e' \
        "$PROJECT_DIR" | while read file event; do
        
        # Filtrar solo archivos relevantes
        if [[ "$file" =~ \.(ts|tsx|js|jsx|json|css|scss)$ ]]; then
            log "📝 Cambio detectado: $file ($event)"
            
            # Esperar un poco para evitar múltiples rebuilds por cambios rápidos
            sleep 2
            
            # Verificar si hay más cambios pendientes
            if ! inotifywait -t 1 -r -e modify,create,delete,move \
                --exclude '\.(git|next|node_modules|\.log)' \
                "$PROJECT_DIR" >/dev/null 2>&1; then
                
                rebuild_and_restart
            fi
        fi
    done
}

# Verificar dependencias
if ! command -v inotifywait &> /dev/null; then
    log "❌ inotifywait no está instalado. Instalando inotify-tools..."
    sudo apt-get update && sudo apt-get install -y inotify-tools
fi

# Crear directorio de logs si no existe
sudo mkdir -p "$(dirname "$LOG_FILE")"
sudo touch "$LOG_FILE"
sudo chown uct:uct "$LOG_FILE"

# Iniciar monitoreo
monitor_changes
