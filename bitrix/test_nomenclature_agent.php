<?php
// Простой тест агента номенклатуры
require_once $_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/main/include/prolog_before.php';

// Подключаем файл агента
require_once $_SERVER['DOCUMENT_ROOT'].'/Astral/Ext/Agent/GetAllNomenclature1C.php';

use Astral\Ext\Agent\GetAllNomenclature1C;

echo "Запуск агента синхронизации номенклатуры...\n";

try {
    $result = GetAllNomenclature1C::execute(false);
    echo "Агент выполнен успешно. Результат: " . $result . "\n";
} catch (Exception $e) {
    echo "Ошибка выполнения агента: " . $e->getMessage() . "\n";
    echo "Файл: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "Тест завершен.\n";
