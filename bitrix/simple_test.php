<?php
// Простой тест без потенциально опасных данных
require_once $_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/main/include/prolog_before.php';

echo "Тест подключения модулей Битрикс...\n";

// Проверяем подключение модулей
if (\Bitrix\Main\Loader::includeModule('iblock')) {
    echo "✅ Модуль IBlock подключен\n";
} else {
    echo "❌ Ошибка подключения модуля IBlock\n";
}

if (\Bitrix\Main\Loader::includeModule('catalog')) {
    echo "✅ Модуль Catalog подключен\n";
} else {
    echo "❌ Ошибка подключения модуля Catalog\n";
}

// Проверяем существование файла агента
$agentFile = $_SERVER['DOCUMENT_ROOT'].'/Astral/Ext/Agent/GetAllNomenclature1C.php';
if (file_exists($agentFile)) {
    echo "✅ Файл агента найден: $agentFile\n";
} else {
    echo "❌ Файл агента не найден: $agentFile\n";
}

echo "Тест завершен.\n";
