#!/bin/bash

echo "🚀 Reparación rápida del sistema de contenido..."
echo "=============================================="

# Función para mostrar mensajes con colores
log_info() {
    echo -e "\033[34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[32m[OK]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

log_warning() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    log_error "No se encontró package.json. Ejecuta este script desde el directorio raíz del proyecto."
    exit 1
fi

log_info "Paso 1: Verificando archivos..."

# Contar archivos en uploads
UPLOAD_COUNT=$(find public/uploads -type f \( -name "*.mp4" -o -name "*.webm" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif" \) 2>/dev/null | wc -l)
log_info "Archivos multimedia encontrados: $UPLOAD_COUNT"

if [ $UPLOAD_COUNT -eq 0 ]; then
    log_warning "No se encontraron archivos multimedia en public/uploads"
else
    log_success "Archivos multimedia detectados"
fi

log_info "Paso 2: Ejecutando reparación de contenido..."

# Ejecutar script de reparación
if node scripts/fix-missing-content.js; then
    log_success "Reparación de contenido completada"
else
    log_error "Error en la reparación de contenido"
    exit 1
fi

log_info "Paso 3: Limpiando caché..."

# Limpiar caché de Next.js
if [ -d ".next" ]; then
    rm -rf .next/cache
    log_success "Caché de Next.js limpiada"
fi

log_info "Paso 4: Reconstruyendo aplicación..."

# Reconstruir la aplicación
if npm run build > /dev/null 2>&1; then
    log_success "Aplicación reconstruida"
else
    log_error "Error al reconstruir la aplicación"
    exit 1
fi

log_info "Paso 5: Reiniciando servicio..."

# Reiniciar el servicio
if systemctl is-active --quiet tv-signage.service; then
    if sudo systemctl restart tv-signage.service; then
        log_success "Servicio reiniciado"
        
        # Esperar a que el servicio esté listo
        log_info "Esperando a que el servicio esté listo..."
        sleep 5
        
        # Verificar que el servicio responde
        if curl -s -f http://localhost:3000/api/health > /dev/null; then
            log_success "Servicio respondiendo correctamente"
        else
            log_warning "El servicio puede tardar un poco más en estar listo"
        fi
    else
        log_error "Error al reiniciar el servicio"
        exit 1
    fi
else
    log_warning "El servicio tv-signage.service no está activo"
    log_info "Iniciando servidor manualmente..."
    
    # Matar procesos existentes
    pkill -f "next start" 2>/dev/null || true
    
    # Iniciar servidor en background
    nohup npm start > /dev/null 2>&1 &
    
    sleep 3
    
    if curl -s -f http://localhost:3000/api/health > /dev/null; then
        log_success "Servidor iniciado manualmente"
    else
        log_error "Error al iniciar el servidor"
        exit 1
    fi
fi

echo ""
echo "🎉 ¡Reparación completada exitosamente!"
echo "=============================================="
log_success "El sistema debería estar funcionando correctamente"
log_info "Refresca la pantalla en el navegador para ver los cambios"
echo ""
