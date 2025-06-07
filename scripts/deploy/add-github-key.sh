#!/bin/bash

# Добавляем публичный ключ GitHub Actions на сервер
ssh root@31.128.39.123 "mkdir -p ~/.ssh && chmod 700 ~/.ssh"
cat ~/.ssh/github_deploy_key.pub | ssh root@31.128.39.123 "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

echo "GitHub SSH ключ добавлен на сервер!"
