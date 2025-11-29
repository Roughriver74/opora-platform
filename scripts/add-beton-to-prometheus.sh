#!/bin/bash

# Скрипт добавления beton-crm в Prometheus на центральном сервере мониторинга
# Использование: ./add-beton-to-prometheus.sh <IP_BETON_СЕРВЕРА>

set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
    echo -e "${RED}❌ Ошибка: Укажите IP-адрес сервера beton-crm${NC}"
    echo "Использование: $0 <IP_АДРЕС>"
    echo "Пример: $0 31.128.39.123"
    exit 1
fi

BETON_IP=$1
PROMETHEUS_DIR="/root/monitoring_deploy"
PROMETHEUS_CONFIG="$PROMETHEUS_DIR/prometheus.yml"
BACKUP_CONFIG="$PROMETHEUS_DIR/prometheus.yml.backup.$(date +%Y%m%d_%H%M%S)"

echo -e "${YELLOW}🔧 Добавление beton-crm сервера в Prometheus...${NC}"
echo "IP сервера: $BETON_IP"

# Проверка что файл конфига существует
if [ ! -f "$PROMETHEUS_CONFIG" ]; then
    echo -e "${RED}❌ Ошибка: Файл $PROMETHEUS_CONFIG не найден!${NC}"
    exit 1
fi

# Создаем бэкап
echo -e "${YELLOW}📦 Создание бэкапа конфига...${NC}"
cp "$PROMETHEUS_CONFIG" "$BACKUP_CONFIG"
echo -e "${GREEN}✅ Бэкап создан: $BACKUP_CONFIG${NC}"

# Проверяем, не добавлен ли уже beton-crm
if grep -q "job_name: 'beton-crm'" "$PROMETHEUS_CONFIG"; then
    echo -e "${YELLOW}⚠️  Job 'beton-crm' уже существует в конфигурации!${NC}"
    echo "Хотите обновить IP? (y/n)"
    read -r response
    if [[ "$response" != "y" ]]; then
        echo "Отменено."
        exit 0
    fi
    # Удаляем старую конфигурацию beton-crm
    sed -i "/job_name: 'beton-crm'/,/environment: 'production'/d" "$PROMETHEUS_CONFIG"
fi

# Добавляем новую конфигурацию
echo -e "${YELLOW}📝 Добавление конфигурации...${NC}"

# Находим последний job и добавляем после него
cat >> "$PROMETHEUS_CONFIG" << EOF

  # beton-crm Production Server
  - job_name: 'beton-crm'
    static_configs:
      - targets:
          - '$BETON_IP:9100'  # Node Exporter (метрики системы)
          - '$BETON_IP:8081'  # cAdvisor (метрики Docker)
        labels:
          host: 'beton-crm'
          environment: 'production'
EOF

echo -e "${GREEN}✅ Конфигурация добавлена${NC}"

# Проверяем валидность конфига
echo -e "${YELLOW}🔍 Проверка валидности конфигурации...${NC}"
if docker exec monitoring_deploy-prometheus-1 promtool check config /etc/prometheus/prometheus.yml > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Конфигурация валидна${NC}"
else
    echo -e "${RED}❌ Ошибка в конфигурации! Восстанавливаем бэкап...${NC}"
    cp "$BACKUP_CONFIG" "$PROMETHEUS_CONFIG"
    echo -e "${YELLOW}Бэкап восстановлен${NC}"
    exit 1
fi

# Перезапускаем Prometheus
echo -e "${YELLOW}🔄 Перезапуск Prometheus...${NC}"
docker restart monitoring_deploy-prometheus-1

echo -e "${GREEN}✅ Готово! Prometheus перезапущен.${NC}"
echo ""
echo -e "${YELLOW}📊 Проверьте targets в Prometheus:${NC}"
echo "   http://45.146.164.152:9090/targets"
echo ""
echo -e "${YELLOW}Новые endpoints:${NC}"
echo "   - $BETON_IP:9100 (Node Exporter - метрики системы)"
echo "   - $BETON_IP:8081 (cAdvisor - метрики Docker)"
echo ""
echo -e "${GREEN}🎉 Настройка завершена!${NC}"
