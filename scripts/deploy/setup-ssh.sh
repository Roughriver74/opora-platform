#!/bin/bash

# Настройка SSH для деплоя
mkdir -p ~/.ssh
touch ~/.ssh/known_hosts

# Добавление сервера в known_hosts (без интерактивного подтверждения)
ssh-keyscan -H 31.128.39.123 >> ~/.ssh/known_hosts

echo "SSH setup completed"
