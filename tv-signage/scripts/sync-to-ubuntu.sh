#!/bin/bash

# 🔄 Script de Sincronización Automática para Ubuntu
# Sincroniza cambios locales con el servidor Ubuntu automáticamente

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

# Configuración por defecto
SERVER=""
USER=""
PROJECT_DIR=""
WATCH_MODE=false
EXCLUDE_PATTERNS=(
    "node_modules"
    ".git"
    ".next"
    "dist"
    "build"
    "*.log"
    ".env.local"
    ".DS_Store"
    "Thumbs.db"
)

# Función de ayuda
show_help() {
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  -s, --server HOST      IP o hostname del servidor Ubuntu"
    echo "  -u, --user USER        Usuario SSH para conectar"
    echo "  -d, --dir PATH         Directorio del proyecto en el servidor"
    echo "  -w, --watch            Modo watch (sincronización automática)"
    echo "  -o, --once             Sincronización única"
    echo "  --dry-run              Mostrar qué se sincronizaría sin hacerlo"
    echo "  -h, --help             Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 -s 192.168.1.100 -u ubuntu -d /opt/uct-tv-system -o"
    echo "  $0 -s mi-servidor -u admin -w"
    echo "  $0 --server 10.0.0.5 --user deploy --watch"
    echo ""
    echo "Variables de entorno:"
    echo "  UCT_SERVER=192.168.1.100"
    echo "  UCT_USER=ubuntu"
    echo "  UCT_PROJECT_DIR=/opt/uct-tv-system"
}

# Función para verificar dependencias
check_dependencies() {
    local missing_deps=()
    
    if ! command -v rsync &> /dev/null; then
        missing_deps+=("rsync")
    fi
    
    if ! command -v ssh &> /dev/null; then
        missing_deps+=("ssh")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        error "Dependencias faltantes: ${missing_deps[*]}"
        error "Instala con: sudo apt install ${missing_deps[*]}"
        exit 1
    fi
}

# Función para verificar conectividad SSH
check_ssh_connection() {
    info "Verificando conexión SSH a $USER@$SERVER..."
    
    if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$USER@$SERVER" exit 2>/dev/null; then
        error "No se puede conectar a $USER@$SERVER"
        error "Verifica:"
        error "  1. El servidor está encendido y accesible"
        error "  2. Las credenciales SSH son correctas"
        error "  3. Tu clave SSH está configurada"
        exit 1
    fi
    
    log "Conexión SSH exitosa"
}

# Función para crear exclusiones de rsync
build_exclude_args() {
    local exclude_args=""
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        exclude_args="$exclude_args --exclude=$pattern"
    done
    echo "$exclude_args"
}

# Función para sincronizar archivos
sync_files() {
    local dry_run_flag=""
    if [ "$1" = "--dry-run" ]; then
        dry_run_flag="--dry-run"
        info "Modo dry-run: mostrando qué se sincronizaría..."
    else
        log "Sincronizando archivos con $SERVER..."
    fi
    
    local exclude_args=$(build_exclude_args)
    local source_dir="$(pwd)/"
    local dest_dir="$USER@$SERVER:/tmp/uct-tv-sync/"
    
    # Crear directorio temporal en el servidor
    ssh "$USER@$SERVER" "mkdir -p /tmp/uct-tv-sync"
    
    # Sincronizar archivos
    rsync -avz --delete $dry_run_flag $exclude_args \
        "$source_dir" "$dest_dir"
    
    if [ "$1" != "--dry-run" ]; then
        # Ejecutar actualización en el servidor
        log "Ejecutando actualización en el servidor..."
        ssh "$USER@$SERVER" "sudo $PROJECT_DIR/scripts/quick-update-ubuntu.sh --source /tmp/uct-tv-sync"
        
        # Verificar estado
        log "Verificando estado del servicio..."
        ssh "$USER@$SERVER" "sudo $PROJECT_DIR/scripts/quick-update-ubuntu.sh --status"
    fi
}

# Función para modo watch
watch_mode() {
    log "Iniciando modo watch..."
    log "Presiona Ctrl+C para detener"
    
    # Verificar si inotify-tools está disponible
    if command -v inotifywait &> /dev/null; then
        log "Usando inotifywait para monitoreo de archivos"
        
        while true; do
            # Esperar cambios en archivos
            inotifywait -r -e modify,create,delete,move \
                --exclude '(node_modules|\.git|\.next|dist|build)' \
                . 2>/dev/null
            
            log "Cambios detectados, sincronizando..."
            sync_files
            log "Sincronización completada. Esperando más cambios..."
            sleep 2
        done
    else
        warn "inotifywait no está disponible, usando polling cada 30 segundos"
        warn "Instala inotify-tools para mejor rendimiento: sudo apt install inotify-tools"
        
        local last_sync=0
        
        while true; do
            local current_time=$(date +%s)
            local files_changed=false
            
            # Verificar si hay archivos modificados en los últimos 30 segundos
            if find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" \) \
                -not -path "./node_modules/*" \
                -not -path "./.git/*" \
                -not -path "./.next/*" \
                -newer /tmp/uct-tv-last-sync 2>/dev/null | grep -q .; then
                files_changed=true
            fi
            
            if [ "$files_changed" = true ] && [ $((current_time - last_sync)) -gt 30 ]; then
                log "Cambios detectados, sincronizando..."
                sync_files
                touch /tmp/uct-tv-last-sync
                last_sync=$current_time
                log "Sincronización completada. Esperando más cambios..."
            fi
            
            sleep 30
        done
    fi
}

# Función para configuración inicial
setup_config() {
    local config_file="$HOME/.uct-tv-sync.conf"
    
    echo "🔧 Configuración inicial de sincronización"
    echo ""
    
    read -p "Servidor (IP o hostname): " server_input
    read -p "Usuario SSH: " user_input
    read -p "Directorio del proyecto (/opt/uct-tv-system): " dir_input
    
    # Usar valores por defecto si están vacíos
    dir_input=${dir_input:-/opt/uct-tv-system}
    
    # Guardar configuración
    cat > "$config_file" << EOF
# Configuración de sincronización UCT TV
UCT_SERVER="$server_input"
UCT_USER="$user_input"
UCT_PROJECT_DIR="$dir_input"
EOF
    
    log "Configuración guardada en $config_file"
    log "Puedes editarla manualmente o usar variables de entorno"
    
    # Cargar configuración
    source "$config_file"
    SERVER="$UCT_SERVER"
    USER="$UCT_USER"
    PROJECT_DIR="$UCT_PROJECT_DIR"
}

# Función para cargar configuración
load_config() {
    local config_file="$HOME/.uct-tv-sync.conf"
    
    # Cargar desde archivo de configuración si existe
    if [ -f "$config_file" ]; then
        source "$config_file"
        SERVER="${UCT_SERVER:-$SERVER}"
        USER="${UCT_USER:-$USER}"
        PROJECT_DIR="${UCT_PROJECT_DIR:-$PROJECT_DIR}"
    fi
    
    # Variables de entorno tienen prioridad
    SERVER="${UCT_SERVER:-$SERVER}"
    USER="${UCT_USER:-$USER}"
    PROJECT_DIR="${UCT_PROJECT_DIR:-$PROJECT_DIR}"
}

# Función principal
main() {
    echo -e "${BLUE}🔄 [Sync] Sincronización UCT TV System${NC}\n"
    
    # Cargar configuración
    load_config
    
    # Procesar argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--server)
                SERVER="$2"
                shift 2
                ;;
            -u|--user)
                USER="$2"
                shift 2
                ;;
            -d|--dir)
                PROJECT_DIR="$2"
                shift 2
                ;;
            -w|--watch)
                WATCH_MODE=true
                shift
                ;;
            -o|--once)
                WATCH_MODE=false
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --setup)
                setup_config
                exit 0
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                error "Opción desconocida: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Verificar configuración
    if [ -z "$SERVER" ] || [ -z "$USER" ] || [ -z "$PROJECT_DIR" ]; then
        warn "Configuración incompleta"
        echo "Ejecuta: $0 --setup"
        echo "O usa variables de entorno:"
        echo "  export UCT_SERVER=tu-servidor"
        echo "  export UCT_USER=tu-usuario"
        echo "  export UCT_PROJECT_DIR=/opt/uct-tv-system"
        exit 1
    fi
    
    info "Configuración:"
    info "  Servidor: $SERVER"
    info "  Usuario: $USER"
    info "  Directorio: $PROJECT_DIR"
    echo ""
    
    # Verificar dependencias
    check_dependencies
    
    # Verificar conexión SSH
    check_ssh_connection
    
    # Ejecutar sincronización
    if [ "$DRY_RUN" = true ]; then
        sync_files --dry-run
    elif [ "$WATCH_MODE" = true ]; then
        watch_mode
    else
        sync_files
    fi
}

# Manejar Ctrl+C
trap 'echo -e "\n${YELLOW}⚠️ Sincronización interrumpida${NC}"; exit 0' INT

# Ejecutar función principal
main "$@"
