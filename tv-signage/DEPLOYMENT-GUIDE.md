# 🚀 Guía de Despliegue en Ubuntu - UCT TV System

## 📋 Resumen de Estrategias de Despliegue

### 🎯 **Estrategia Recomendada: Despliegue con Mínimo Downtime**

Para actualizaciones sin interrumpir el servicio, usa esta secuencia:

1. **Configuración inicial** (solo una vez)
2. **Actualizaciones rápidas** (para cambios menores)
3. **Despliegue completo** (para cambios mayores)

---

## 🔧 1. Configuración Inicial del Servidor

### Paso 1: Preparar Ubuntu

```bash
# Copiar scripts al servidor
scp scripts/*.sh usuario@tu-servidor:/tmp/

# Conectar al servidor
ssh usuario@tu-servidor

# Hacer ejecutables los scripts
chmod +x /tmp/*.sh

# Ejecutar configuración inicial (SOLO UNA VEZ)
sudo /tmp/setup-ubuntu-production.sh
```

### Paso 2: Primer Despliegue

```bash
# Despliegue inicial desde tu directorio local
sudo /tmp/deploy-ubuntu.sh --source /ruta/a/tu/proyecto/local

# O desde repositorio Git (si ya está configurado)
sudo /tmp/deploy-ubuntu.sh
```

---

## 🔄 2. Actualizaciones Rutinarias (Recomendado)

### Para Cambios Menores (< 30 segundos de downtime)

```bash
# Opción A: Desde directorio local
sudo ./scripts/quick-update-ubuntu.sh --source /ruta/a/tu/proyecto

# Opción B: Desde Git
sudo ./scripts/quick-update-ubuntu.sh

# Ver estado después de la actualización
sudo ./scripts/quick-update-ubuntu.sh --status
```

### Para Cambios Mayores (1-2 minutos de downtime)

```bash
# Despliegue completo con backup automático
sudo ./scripts/deploy-ubuntu.sh --source /ruta/a/tu/proyecto
```

---

## 📁 3. Métodos de Transferencia de Archivos

### Opción A: Rsync (Recomendado para desarrollo)

```bash
# Desde tu máquina local, sincronizar archivos
rsync -av --exclude='node_modules' --exclude='.git' --exclude='.next' \
  /ruta/local/uct-tv-system/ usuario@servidor:/tmp/uct-tv-update/

# En el servidor, actualizar
sudo ./scripts/quick-update-ubuntu.sh --source /tmp/uct-tv-update
```

### Opción B: Git (Recomendado para producción)

```bash
# Configurar repositorio en el servidor (solo una vez)
cd /opt/uct-tv-system
sudo -u uct-tv git remote add origin https://github.com/tu-usuario/uct-tv-system.git

# Actualizar desde Git
sudo ./scripts/quick-update-ubuntu.sh
```

### Opción C: SCP para archivos específicos

```bash
# Copiar archivos específicos
scp archivo.js usuario@servidor:/tmp/
ssh usuario@servidor "sudo cp /tmp/archivo.js /opt/uct-tv-system/ruta/destino/"
ssh usuario@servidor "sudo systemctl restart uct-tv"
```

---

## 🛠️ 4. Comandos de Gestión del Servicio

### Estado del Sistema

```bash
# Ver estado completo
uct-tv-status

# Ver estado del servicio
sudo systemctl status uct-tv

# Ver logs en tiempo real
uct-tv-logs

# Ver logs específicos
sudo journalctl -u uct-tv -f
```

### Control del Servicio

```bash
# Reiniciar servicio
sudo systemctl restart uct-tv

# Detener servicio
sudo systemctl stop uct-tv

# Iniciar servicio
sudo systemctl start uct-tv

# Recargar configuración
sudo systemctl reload uct-tv
```

### Gestión de Logs

```bash
# Ver logs de aplicación
uct-tv-logs app

# Ver logs de monitoreo
uct-tv-logs monitor

# Ver todos los logs
uct-tv-logs all
```

---

## 🔄 5. Flujo de Trabajo Recomendado

### Para Desarrollo Diario

```bash
# 1. Hacer cambios en tu máquina local
# 2. Probar localmente
npm run dev

# 3. Sincronizar con servidor
rsync -av --exclude='node_modules' --exclude='.git' --exclude='.next' \
  ./ usuario@servidor:/tmp/uct-tv-update/

# 4. Actualizar en servidor (< 30 segundos downtime)
ssh usuario@servidor "sudo /opt/uct-tv-system/scripts/quick-update-ubuntu.sh --source /tmp/uct-tv-update"

# 5. Verificar
ssh usuario@servidor "uct-tv-status"
```

### Para Releases de Producción

```bash
# 1. Commit y push a Git
git add .
git commit -m "Nueva funcionalidad"
git push origin main

# 2. Despliegue en servidor
ssh usuario@servidor "sudo /opt/uct-tv-system/scripts/deploy-ubuntu.sh"

# 3. Verificar despliegue
ssh usuario@servidor "uct-tv-status"
```

---

## 🚨 6. Solución de Problemas

### El Servicio No Inicia

```bash
# Ver logs detallados
sudo journalctl -u uct-tv --no-pager -n 50

# Verificar configuración
sudo systemctl cat uct-tv

# Verificar permisos
sudo ls -la /opt/uct-tv-system/

# Reiniciar desde cero
sudo systemctl stop uct-tv
sudo /opt/uct-tv-system/scripts/deploy-ubuntu.sh
```

### Problemas de Conectividad

```bash
# Verificar puerto
sudo netstat -tuln | grep :3000

# Verificar firewall
sudo ufw status

# Probar API local
curl http://localhost:3000/api/public/settings

# Verificar desde otra máquina
curl http://IP-DEL-SERVIDOR:3000/api/public/settings
```

### Rollback a Versión Anterior

```bash
# Ver backups disponibles
sudo ls -la /opt/uct-tv-backups/

# Restaurar backup específico
sudo systemctl stop uct-tv
sudo cp -r /opt/uct-tv-backups/backup-YYYYMMDD-HHMMSS/* /opt/uct-tv-system/
sudo chown -R uct-tv:uct-tv /opt/uct-tv-system
sudo systemctl start uct-tv
```

---

## 📊 7. Monitoreo y Mantenimiento

### Monitoreo Automático

El sistema incluye monitoreo automático que:
- Verifica el servicio cada 5 minutos
- Reinicia automáticamente si se detiene
- Registra problemas en `/var/log/uct-tv/monitor.log`

### Mantenimiento Regular

```bash
# Limpiar logs antiguos (automático con logrotate)
sudo logrotate -f /etc/logrotate.d/uct-tv

# Limpiar backups antiguos (automático, mantiene últimos 5)
sudo find /opt/uct-tv-backups -type d -name "backup-*" | sort -r | tail -n +6 | sudo xargs rm -rf

# Actualizar sistema
sudo apt update && sudo apt upgrade -y
```

---

## 🎯 8. Mejores Prácticas

### ✅ Recomendaciones

1. **Usa actualizaciones rápidas** para cambios menores diarios
2. **Haz backup antes** de cambios importantes
3. **Prueba localmente** antes de desplegar
4. **Monitorea logs** después de cada despliegue
5. **Usa Git** para control de versiones en producción

### ❌ Evita

1. **No edites archivos directamente** en `/opt/uct-tv-system`
2. **No reinicies el servidor** sin necesidad
3. **No ignores los logs** de error
4. **No hagas cambios** sin backup
5. **No uses `npm install`** directamente en producción

---

## 📞 9. Comandos de Emergencia

### Reinicio Rápido del Servicio

```bash
sudo systemctl restart uct-tv && sleep 3 && uct-tv-status
```

### Verificación Completa del Sistema

```bash
uct-tv-status && curl -s http://localhost:3000/api/public/settings | jq .
```

### Restauración de Emergencia

```bash
# Detener servicio
sudo systemctl stop uct-tv

# Restaurar último backup
sudo cp -r /opt/uct-tv-backups/$(ls -t /opt/uct-tv-backups/ | head -1)/* /opt/uct-tv-system/

# Corregir permisos
sudo chown -R uct-tv:uct-tv /opt/uct-tv-system

# Reiniciar servicio
sudo systemctl start uct-tv
```

---

## 🎉 ¡Listo!

Con esta configuración tendrás:
- ✅ Despliegues rápidos (< 30 segundos)
- ✅ Backups automáticos
- ✅ Monitoreo continuo
- ✅ Logs organizados
- ✅ Rollback fácil
- ✅ Mínimo downtime
