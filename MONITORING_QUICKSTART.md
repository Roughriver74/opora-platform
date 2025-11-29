# 🚀 Быстрый старт: Подключение мониторинга

## На сервере beton-crm

```bash
# 1. Перейти в проект и обновить код
cd /path/to/beton-crm
git pull

# 2. Пересоздать контейнеры с мониторингом
docker-compose up -d

# 3. Проверить статус
docker-compose ps | grep -E "promtail|node|cadvisor"

# Должны быть запущены:
# - beton_promtail
# - beton_node_exporter  
# - beton_cadvisor
```

## На центральном сервере мониторинга (45.146.164.152)

```bash
# 1. Подключиться
ssh root@45.146.164.152

# 2. Добавить конфигурацию (УКАЖИТЕ РЕАЛЬНЫЙ IP!)
cd /root/monitoring_deploy
nano prometheus.yml

# Добавить в scrape_configs:
  - job_name: 'beton-crm'
    static_configs:
      - targets:
          - 'ВАШ_IP:9100'  # Node Exporter
          - 'ВАШ_IP:8081'  # cAdvisor
        labels:
          host: 'beton-crm'
          environment: 'production'

# 3. Перезапустить Prometheus
docker restart monitoring_deploy-prometheus-1

# 4. Проверить
# Откройте: http://45.146.164.152:9090/targets
# Должны быть beton-crm endpoints со статусом UP
```

## Готово! 🎉

- **Логи**: автоматически в Loki
- **Метрики**: в Prometheus после настройки
- **Grafana**: http://45.146.164.152:3000

---

**⚠️ Если у вас файрвол:**
```bash
# На сервере beton-crm разрешить доступ с мониторинга
ufw allow from 45.146.164.152 to any port 9100
ufw allow from 45.146.164.152 to any port 8081
```
