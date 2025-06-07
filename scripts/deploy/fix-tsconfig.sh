#!/bin/bash

# Скрипт для исправления tsconfig.json
echo "Исправление конфигурации TypeScript..."

# Создаем исправленную версию tsconfig.json
cat <<EOL > /Users/evgenijsikunov/projects/beton-crm/beton-crm/server/tsconfig.json
{
  "compilerOptions": {
    "target": "es6",
    "module": "commonjs",
    "outDir": "dist",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": false,
    "noImplicitThis": false,
    "strictNullChecks": false,
    "noEmitOnError": false,
    "declaration": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
EOL

echo "Конфигурация TypeScript исправлена."
