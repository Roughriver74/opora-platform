# 📊 Настройка мониторинга для beton-crm

## ✅ Что сделано

1. **Добавлены агенты мониторинга в docker-compose.yml:**
   - **Promtail** - сбор и отправка логов в Loki (центральный сервер)
   - **Node Exporter** - метрики системы (CPU, RAM, Disk, Network)
   - **cAdvisor** - метрики Docker контейнеров

2. **Создана конфигурация Promtail:**
   - Файл: `promtail-config.yaml`
   - Отправка на: `http://45.146.164.152:3100/loki/api/v1/push`
   - Хост: `beton-crm`

## 🚀 Деплой на production

Чтобы развернуть мониторинг на prod сервере:

```bash
# 1. Перейти в директорию проекта
cd /path/to/beton-crm

# 2. Остановить старые контейнеры (если нужно)
docker-compose down

# 3. Запустить с новыми сервисами мониторинга
docker-compose up -d

# 4. Проверить статус
docker-compose ps
```

## ⚙️ ОБЯЗАТЕЛЬНО: Настройка Prometheus на центральном сервере

После запуска агентов на сервере beton-crm, нужно настроить **Prometheus** на центральном сервере (`45.146.164.152`), чтобы он начал собирать метрики.

### Шаги:

1. **Подключиться к центральному серверу мониторинга:**
   ```bash
   ssh root@45.146.164.152
   ```

2. **Открыть конфиг Prometheus:**
   ```bash
   cd /root/monitoring_deploy
   nano prometheus.yml
   ```

3. **Добавить новый job для beton-crm:**
   
   Найдите секцию `scrape_configs:` и добавьте:

   ```yaml
   scrape_configs:
     # ... существующие jobs ...
     
     # Новый job для beton-crm
     - job_name: 'beton-crm'
       static_configs:
         - targets: 
             - 'IP_ВАШЕГО_BETON_СЕРВЕРА:9100'  # Node Exporter
             - 'IP_ВАШЕГО_BETON_СЕРВЕРА:8081'  # cAdvisor
           labels:
             host: 'beton-crm'
             environment: 'production'
   ```

   **Замените `IP_ВАШЕГО_BETON_СЕРВЕРА`** на реальный IP-адрес сервера, где развернут beton-crm!

4. **Перезапустить Prometheus:**
   ```bash
   docker restart monitoring_deploy-prometheus-1
   # или
   docker-compose restart prometheus
   ```

5. **Проверить, что Prometheus видит новые таргеты:**
   - Откройте в браузере: `http://45.146.164.152:9090/targets`
   - Должны появиться новые endpoints для `beton-crm` со статусом **UP**

## 📊 Просмотр данных в Grafana

1. Откройте Grafana: `http://45.146.164.152:3000`
2. Логи будут доступны через Loki (автоматически, push-модель)
3. Метрики доступны через Prometheus (после настройки выше)

### Полезные запросы для Grafana:

**Логи от beton-crm:**
```logql
{host="beton-crm"}
```

**Логи конкретного контейнера:**
```logql
{host="beton-crm", container_name="beton_backend"}
```

**CPU Usage:**
```promql
rate(node_cpu_seconds_total{host="beton-crm", mode="user"}[5m])
```

**Memory Usage:**
```promql
node_memory_Active_bytes{host="beton-crm"} / node_memory_MemTotal_bytes{host="beton-crm"} * 100
```

**Docker Container Stats:**
```promql
rate(container_cpu_usage_seconds_total{host="beton-crm"}[5m])
```

## 🔍 Проверка работы агентов

После запуска проверьте, что все агенты работают:

```bash
# Проверить статус контейнеров
docker ps | grep -E "promtail|node-exporter|cadvisor"

# Посмотреть логи Promtail
docker logs beton_promtail

# Проверить Node Exporter (метрики системы)
curl http://localhost:9100/metrics

# Проверить cAdvisor (метрики контейнеров)
curl http://localhost:8081/metrics
```

## 🔒 Firewall (если активен)

Если на сервере beton-crm настроен файрвол, нужно открыть порты для Prometheus (на центральном сервере):

```bash
# Разрешить доступ с центрального сервера мониторинга
ufw allow from 45.146.164.152 to any port 9100 comment 'Node Exporter'
ufw allow from 45.146.164.152 to any port 8081 comment 'cAdvisor'
```

## 📝 Что дальше?

1. ✅ Запустить docker-compose на prod сервере
2. ✅ Настроить Prometheus на центральном сервере (добавить IP beton-crm)
3. ✅ Проверить в Grafana что логи и метрики поступают
4. 🎯 Создать дашборды в Grafana для визуализации
5. 🚨 Настроить алерты (при необходимости)

## 🆘 Troubleshooting

**Promtail не отправляет логи:**
- Проверьте логи: `docker logs beton_promtail`
- Убедитесь что Loki доступен: `curl http://45.146.164.152:3100/ready`

**Prometheus не видит targets:**
- Проверьте prometheus.yml на центральном сервере
- Убедитесь что порты 9100 и 8081 доступны с центрального сервера
- Проверьте файрвол: `ufw status`

**cAdvisor не запускается:**
- Проверьте логи: `docker logs beton_cadvisor`
- Убедитесь что `/dev/kmsg` доступен
- Попробуйте убрать `privileged: true` и `devices` если проблемы

---

**Важно:** Не забудьте указать реальный IP-адрес beton-crm сервера в конфигурации Prometheus!
