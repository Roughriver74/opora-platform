<?php
// Оборачиваем вывод в <pre> для удобного форматирования в браузере
echo '<pre>';

// --- ШАГ 0: Подключение окружения Битрикс24 ---
$_SERVER["DOCUMENT_ROOT"] = '/home/bitrix/www'; // <-- ЗАМЕНИТЕ НА ВАШ РЕАЛЬНЫЙ ПУТЬ!
require_once($_SERVER["DOCUMENT_ROOT"]."/bitrix/modules/main/include/prolog_before.php");

if (!\Bitrix\Main\Loader::includeModule('iblock')) {
    die('Ошибка: не удалось подключить модуль IBlock');
}

if (!\Bitrix\Main\Loader::includeModule('catalog')) {
    die('Ошибка: не удалось подключить модуль Catalog');
}

use Bitrix\Iblock\IblockTable;
use Bitrix\Iblock\ElementTable;
use Bitrix\Iblock\SectionTable;
use Bitrix\Catalog\ProductTable;

// --- НАСТРОЙКИ БЕЗОПАСНОСТИ ---
$SAFE_MODE = true; // Включить безопасный режим (только чтение)
$BACKUP_MODE = true; // Создать бэкап перед обработкой
$BATCH_SIZE = 50; // Размер пакета для обработки
$MAX_ERRORS = 10; // Максимум ошибок перед остановкой

// ID каталога номенклатуры
const CATALOG_IBLOCK_ID = 14;

// --- ФУНКЦИИ ---

/**
 * Создание бэкапа таблиц
 */
function createBackup() {
    global $DB;
    
    echo "🛡️ Создание бэкапа таблиц...\n";
    
    $backupDate = date('Ymd_His');
    
    try {
        // Бэкап таблицы элементов
        $sql = "CREATE TABLE b_iblock_element_backup_{$backupDate} AS SELECT * FROM b_iblock_element WHERE IBLOCK_ID = " . CATALOG_IBLOCK_ID;
        $DB->Query($sql);
        echo "✅ Бэкап таблицы элементов создан: b_iblock_element_backup_{$backupDate}\n";
        
        // Бэкап таблицы разделов
        $sql = "CREATE TABLE b_iblock_section_backup_{$backupDate} AS SELECT * FROM b_iblock_section WHERE IBLOCK_ID = " . CATALOG_IBLOCK_ID;
        $DB->Query($sql);
        echo "✅ Бэкап таблицы разделов создан: b_iblock_section_backup_{$backupDate}\n";
        
        return $backupDate;
        
    } catch (Exception $e) {
        echo "❌ Ошибка создания бэкапа: " . $e->getMessage() . "\n";
        return false;
    }
}

/**
 * Нормализация UIN - очистка от лишних символов
 */
function normalizeUIN($uin) {
    if (empty($uin)) return '';
    
    // Убираем пробелы
    $uin = trim($uin);
    
    // Убираем все символы кроме цифр, букв и дефисов
    $uin = preg_replace('/[^a-zA-Z0-9\-]/', '', $uin);
    
    return $uin;
}

/**
 * Проверка на исключаемые UIN
 */
function isExcludedUIN($uin) {
    $excludedUINs = [
        // Добавьте UIN для исключения здесь
    ];
    
    $normalizedUIN = normalizeUIN($uin);
    
    foreach ($excludedUINs as $excludedUIN) {
        if ($normalizedUIN === normalizeUIN($excludedUIN)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Поиск элемента по UIN (XML_ID) с fallback методами
 */
function findElementByUIN($uin, $elementName = '', $parentUIN = '', $safeMode = false) {
    $normalizedUIN = normalizeUIN($uin);
    $foundElements = [];
    
    echo "🔍 Поиск элемента по UIN: '{$uin}' (нормализованный: '{$normalizedUIN}')\n";
    
    if ($safeMode) {
        echo "🛡️ БЕЗОПАСНЫЙ РЕЖИМ: Только поиск, без изменений\n";
    }
    
    // ПРИОРИТЕТ 1: Точный поиск по XML_ID (UIN)
    echo "  📋 Метод 1: Точный поиск по XML_ID (UIN)...\n";
    $dbRes = CIBlockElement::GetList(
        [],
        [
            'IBLOCK_ID' => CATALOG_IBLOCK_ID,
            '=XML_ID' => $normalizedUIN,
            'CHECK_PERMISSIONS' => 'N'
        ],
        false,
        false,
        ['ID', 'NAME', 'XML_ID', 'IBLOCK_SECTION_ID', 'ACTIVE']
    );
    
    while ($element = $dbRes->Fetch()) {
        $foundElements[] = [
            'element' => $element,
            'method' => 'XML_ID точный',
            'match_score' => 100
        ];
        echo "    ✅ Найден по UIN: ID={$element['ID']}, Название='{$element['NAME']}', XML_ID='{$element['XML_ID']}'\n";
    }
    
    // ПРИОРИТЕТ 2: Частичный поиск по XML_ID (на случай опечаток)
    if (empty($foundElements)) {
        echo "  📋 Метод 2: Частичный поиск по XML_ID...\n";
        $dbRes = CIBlockElement::GetList(
            [],
            [
                'IBLOCK_ID' => CATALOG_IBLOCK_ID,
                '%XML_ID' => $normalizedUIN,
                'CHECK_PERMISSIONS' => 'N'
            ],
            false,
            false,
            ['ID', 'NAME', 'XML_ID', 'IBLOCK_SECTION_ID', 'ACTIVE']
        );
        
        while ($element = $dbRes->Fetch()) {
            $foundElements[] = [
                'element' => $element,
                'method' => 'XML_ID частичный',
                'match_score' => 80
            ];
            echo "    ✅ Найден: ID={$element['ID']}, Название='{$element['NAME']}', XML_ID='{$element['XML_ID']}'\n";
        }
    }
    
    // FALLBACK 3: Поиск по названию (только если UIN не найден)
    if (empty($foundElements) && !empty($elementName)) {
        echo "  📋 Метод 3: Fallback поиск по названию...\n";
        
        $cleanName = trim(preg_replace('/[^\w\s\-\.]/u', '', $elementName));
        
        $dbRes = CIBlockElement::GetList(
            [],
            [
                'IBLOCK_ID' => CATALOG_IBLOCK_ID,
                '%NAME' => $cleanName,
                'CHECK_PERMISSIONS' => 'N'
            ],
            false,
            false,
            ['ID', 'NAME', 'XML_ID', 'IBLOCK_SECTION_ID', 'ACTIVE']
        );
        
        while ($element = $dbRes->Fetch()) {
            $similarity = 0;
            similar_text(strtolower($element['NAME']), strtolower($elementName), $similarity);
            
            if ($similarity > 70) {
                $foundElements[] = [
                    'element' => $element,
                    'method' => 'Fallback по названию',
                    'match_score' => $similarity
                ];
                echo "    ✅ Найден по названию: ID={$element['ID']}, Название='{$element['NAME']}', Совпадение={$similarity}%\n";
                
                // Обновляем XML_ID на UIN из 1С (только если не безопасный режим)
                if (!$safeMode) {
                    echo "    🔄 Обновляю XML_ID на UIN из 1С...\n";
                    $updateResult = ElementTable::update($element['ID'], [
                        'XML_ID' => $normalizedUIN
                    ]);
                    
                    if ($updateResult->isSuccess()) {
                        echo "    ✅ XML_ID успешно обновлен\n";
                    } else {
                        echo "    ❌ Ошибка обновления XML_ID: " . implode(', ', $updateResult->getErrorMessages()) . "\n";
                    }
                } else {
                    echo "    🛡️ БЕЗОПАСНЫЙ РЕЖИМ: XML_ID не обновлен\n";
                }
            }
        }
    }
    
    // Возвращаем элемент с наивысшим рейтингом совпадения
    if (!empty($foundElements)) {
        usort($foundElements, function($a, $b) {
            return $b['match_score'] - $a['match_score'];
        });
        
        $bestMatch = $foundElements[0];
        echo "  🎯 Лучшее совпадение: {$bestMatch['method']} (рейтинг: {$bestMatch['match_score']})\n";
        
        return $bestMatch['element'];
    }
    
    echo "  ❌ Элемент не найден ни одним методом\n";
    return null;
}

/**
 * Поиск раздела по UIN (XML_ID)
 */
function findSectionByUIN($uin, $sectionName = '', $safeMode = false) {
    $normalizedUIN = normalizeUIN($uin);
    
    echo "🔍 Поиск раздела по UIN: '{$uin}' (нормализованный: '{$normalizedUIN}')\n";
    
    if ($safeMode) {
        echo "🛡️ БЕЗОПАСНЫЙ РЕЖИМ: Только поиск, без изменений\n";
    }
    
    // Поиск по XML_ID
    echo "  📋 Поиск по XML_ID: '{$normalizedUIN}'\n";
    $dbRes = CIBlockSection::GetList(
        [],
        [
            'IBLOCK_ID' => CATALOG_IBLOCK_ID,
            '=XML_ID' => $normalizedUIN,
            'CHECK_PERMISSIONS' => 'N'
        ],
        false,
        ['ID', 'NAME', 'XML_ID', 'IBLOCK_SECTION_ID', 'ACTIVE']
    );
    
    while ($section = $dbRes->Fetch()) {
        echo "    ✅ Найден раздел: ID={$section['ID']}, Название='{$section['NAME']}', XML_ID='{$section['XML_ID']}'\n";
        return $section;
    }
    
    echo "    ❌ Раздел с XML_ID '{$normalizedUIN}' не найден\n";
    
    // Fallback по названию
    if (!empty($sectionName)) {
        echo "  📋 Fallback поиск по названию...\n";
        
        $cleanName = trim(preg_replace('/[^\w\s\-\.]/u', '', $sectionName));
        
        $dbRes = CIBlockSection::GetList(
            [],
            [
                'IBLOCK_ID' => CATALOG_IBLOCK_ID,
                '%NAME' => $cleanName,
                'CHECK_PERMISSIONS' => 'N'
            ],
            false,
            ['ID', 'NAME', 'XML_ID', 'IBLOCK_SECTION_ID', 'ACTIVE']
        );
        
        while ($section = $dbRes->Fetch()) {
            $similarity = 0;
            similar_text(strtolower($section['NAME']), strtolower($sectionName), $similarity);
            
            if ($similarity > 70) {
                echo "    ✅ Найден раздел по названию: ID={$section['ID']}, Название='{$section['NAME']}', Совпадение={$similarity}%\n";
                
                // Обновляем XML_ID на UIN из 1С (только если не безопасный режим)
                if (!$safeMode) {
                    echo "    🔄 Обновляю XML_ID раздела на UIN из 1С...\n";
                    $updateResult = SectionTable::update($section['ID'], [
                        'XML_ID' => $normalizedUIN
                    ]);
                    
                    if ($updateResult->isSuccess()) {
                        echo "    ✅ XML_ID раздела успешно обновлен\n";
                    } else {
                        echo "    ❌ Ошибка обновления XML_ID раздела: " . implode(', ', $updateResult->getErrorMessages()) . "\n";
                    }
                } else {
                    echo "    🛡️ БЕЗОПАСНЫЙ РЕЖИМ: XML_ID раздела не обновлен\n";
                }
                
                return $section;
            }
        }
    }
    
    echo "  ❌ Раздел не найден\n";
    return null;
}

/**
 * Обновление названия элемента
 */
function updateElementTitle($elementId, $newTitle, $safeMode = false) {
    if ($safeMode) {
        echo "🛡️ БЕЗОПАСНЫЙ РЕЖИМ: Название не обновлено\n";
        return true;
    }
    
    echo "🔄 Обновление названия для элемента ID={$elementId}: '{$newTitle}'\n";
    
    $updateResult = ElementTable::update($elementId, [
        'NAME' => $newTitle
    ]);
    
    if ($updateResult->isSuccess()) {
        echo "✅ Название успешно обновлено\n";
        return true;
    } else {
        echo "❌ Ошибка обновления названия: " . implode(', ', $updateResult->getErrorMessages()) . "\n";
        return false;
    }
}

/**
 * Создание нового элемента (товара или папки)
 */
function createElementWithData($nomenclature, $parentSectionId = 0, $safeMode = false) {
    if ($safeMode) {
        echo "🛡️ БЕЗОПАСНЫЙ РЕЖИМ: Элемент не создан\n";
        return false; // Возвращаем false, чтобы показать, что элемент не был создан
    }
    
    $normalizedUIN = normalizeUIN($nomenclature['UIN']);
    
    echo "➕ Создание нового элемента: '{$nomenclature['Name']}'\n";
    
    $elementFields = [
        'IBLOCK_ID' => CATALOG_IBLOCK_ID,
        'NAME' => $nomenclature['Name'],
        'XML_ID' => $normalizedUIN,
        'ACTIVE' => 'Y',
        'IBLOCK_SECTION_ID' => $parentSectionId
    ];
    
    // Если это папка, добавляем специальные свойства
    if ($nomenclature['Folder'] == true) {
        $elementFields['CODE'] = 'folder_' . $normalizedUIN;
    }
    
    $addResult = ElementTable::add($elementFields);

    if ($addResult->isSuccess()) {
        $newElementId = $addResult->getId();
        echo "✅ Элемент создан с ID: {$newElementId}\n";

        // Если это товар (не папка), создаем запись в каталоге
        if ($nomenclature['Folder'] != true) {
            echo "📦 Добавление в каталог товаров...\n";
            
            try {
                $productResult = ProductTable::add([
                    'ID' => $newElementId,
                    'TYPE' => ProductTable::TYPE_PRODUCT,
                    'AVAILABLE' => 'Y',
                    'QUANTITY' => 0
                ]);
                
                if ($productResult->isSuccess()) {
                    echo "✅ Товар успешно добавлен в каталог\n";
                } else {
                    echo "❌ Ошибка добавления в каталог: " . implode(', ', $productResult->getErrorMessages()) . "\n";
                }
            } catch (Exception $e) {
                echo "❌ Исключение при добавлении в каталог: " . $e->getMessage() . "\n";
            }
        }
        
        return $newElementId;
    } else {
        echo "❌ Ошибка создания элемента: " . implode(', ', $addResult->getErrorMessages()) . "\n";
        return false;
    }
}

/**
 * Создание нового раздела
 */
function createSectionWithData($nomenclature, $parentSectionId = 0, $safeMode = false) {
    if ($safeMode) {
        echo "🛡️ БЕЗОПАСНЫЙ РЕЖИМ: Раздел не создан\n";
        return false; // Возвращаем false, чтобы показать, что раздел не был создан
    }
    
    $normalizedUIN = normalizeUIN($nomenclature['UIN']);
    
    echo "➕ Создание нового раздела: '{$nomenclature['Name']}'\n";
    
    $sectionFields = [
        'IBLOCK_ID' => CATALOG_IBLOCK_ID,
        'NAME' => $nomenclature['Name'],
        'XML_ID' => $normalizedUIN,
        'ACTIVE' => 'Y',
        'IBLOCK_SECTION_ID' => $parentSectionId
    ];
    
    $addResult = SectionTable::add($sectionFields);

    if ($addResult->isSuccess()) {
        $newSectionId = $addResult->getId();
        echo "✅ Раздел создан с ID: {$newSectionId}\n";
        return $newSectionId;
    } else {
        echo "❌ Ошибка создания раздела: " . implode(', ', $addResult->getErrorMessages()) . "\n";
        return false;
    }
}

// --- ШАГ 1: Получение данных из 1С ---
echo "🚀 Начало синхронизации номенклатуры из 1С в Битрикс24\n";
echo "=" . str_repeat("=", 60) . "\n\n";

if ($SAFE_MODE) {
    echo "🛡️ ВНИМАНИЕ: ВКЛЮЧЕН БЕЗОПАСНЫЙ РЕЖИМ - ТОЛЬКО ЧТЕНИЕ!\n";
    echo "🛡️ Никакие изменения в базе данных не будут внесены\n\n";
}

if ($BACKUP_MODE && !$SAFE_MODE) {
    $backupDate = createBackup();
    if (!$backupDate) {
        echo "❌ Не удалось создать бэкап. Остановка выполнения.\n";
        die();
    }
    echo "\n";
}

$curl = curl_init();
curl_setopt_array($curl, array(
    CURLOPT_URL => 'http://192.168.1.11:8080/uchet_all/hs/AIR_KE_Integration/Reload_NomBitrixAll',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'GET',
    CURLOPT_HTTPHEADER => array(
        'Content-Type: application/json',
        'Authorization: Basic 0JDQtNC80LjQvdC40YHRgtGA0LDRgtC+0YA6NzU5NDg2'
    ),
));

$response1c = curl_exec($curl);
$http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

if ($http_code != 200 || !$response1c) {
    die("❌ Ошибка: Не удалось получить данные из 1С. HTTP статус: " . $http_code . "\n");
}

$dataFrom1C = json_decode($response1c, true);
if (json_last_error() !== JSON_ERROR_NONE || !isset($dataFrom1C['NOM'])) {
    die("❌ Ошибка: Некорректный JSON от 1С или отсутствует ключ 'NOM'.\n");
}

$nomenclature = $dataFrom1C['NOM'];
echo "📊 Всего получено " . count($nomenclature) . " позиций номенклатуры из 1С.\n\n";

// Проверяем существующие разделы в каталоге
echo "🔍 Проверка существующих разделов в каталоге...\n";
$existingSections = CIBlockSection::GetList(
    [],
    [
        'IBLOCK_ID' => CATALOG_IBLOCK_ID,
        'CHECK_PERMISSIONS' => 'N'
    ],
    false,
    ['ID', 'NAME', 'XML_ID', 'IBLOCK_SECTION_ID']
);

$sectionCount = 0;
while ($section = $existingSections->Fetch()) {
    $sectionCount++;
    if ($sectionCount <= 10) { // Показываем только первые 10 разделов
        echo "  📁 Раздел ID={$section['ID']}, Название='{$section['NAME']}', XML_ID='{$section['XML_ID']}'\n";
    }
}

if ($sectionCount > 10) {
    echo "  ... и еще " . ($sectionCount - 10) . " разделов\n";
}

echo "📊 Всего разделов в каталоге: {$sectionCount}\n\n";

// Обрабатываем ВСЕ позиции номенклатуры
echo "🚀 ПОЛНАЯ СИНХРОНИЗАЦИЯ: Будет обработано " . count($nomenclature) . " позиций номенклатуры.\n";
echo "📦 Размер пакета: {$BATCH_SIZE} записей\n";
echo "🛑 Максимум ошибок: {$MAX_ERRORS}\n\n";

// Статистика
$stats = [
    'processed' => 0,
    'found_by_uin' => 0,
    'found_by_name' => 0,
    'created_elements' => 0,
    'created_sections' => 0,
    'updated_xml_id' => 0,
    'updated_title' => 0,
    'skipped' => 0,
    'excluded' => 0,
    'errors' => 0
];

// Создаем карту родительских разделов для правильной обработки иерархии
$parentSectionsMap = [];

// --- ШАГ 2: Обработка каждого элемента номенклатуры ---
foreach ($nomenclature as $index => $nom) {
    $stats['processed']++;
    
    // Проверка на максимальное количество ошибок
    if ($stats['errors'] >= $MAX_ERRORS) {
        echo "🛑 ДОСТИГНУТО МАКСИМАЛЬНОЕ КОЛИЧЕСТВО ОШИБОК ({$MAX_ERRORS}). ОСТАНОВКА.\n";
        break;
    }
    
    // Показываем прогресс каждые 50 записей
    if ($stats['processed'] % 50 == 0) {
        echo "📊 Прогресс: {$stats['processed']}/" . count($nomenclature) . " (" . round($stats['processed'] / count($nomenclature) * 100, 1) . "%)\n";
    }
    
    echo str_repeat("-", 60) . "\n";
    echo "📋 Обработка #{$stats['processed']}: '{$nom['Name']}'\n";
    echo "🔢 UIN: '{$nom['UIN']}'\n";
    echo "📁 Папка: " . ($nom['Folder'] ? 'Да' : 'Нет') . "\n";
    echo "👨‍👩‍👧‍👦 Родительский UIN: '{$nom['Parent_UIN']}'\n";
    
    // Проверка на исключаемые UIN
    if (isExcludedUIN($nom['UIN'])) {
        echo "🚫 ПРОПУСК: UIN '{$nom['UIN']}' находится в списке исключений\n";
        $stats['excluded']++;
        continue;
    }
    
    // Валидация данных
    if (empty($nom['UIN'])) {
        echo "⚠️ Пропуск: отсутствует UIN в данных из 1С.\n";
        $stats['skipped']++;
        continue;
    }
    
    if (empty($nom['Name'])) {
        echo "⚠️ Пропуск: отсутствует название номенклатуры.\n";
        $stats['skipped']++;
        continue;
    }
    
    // Определяем родительский раздел
    $parentSectionId = 0;
    if (!empty($nom['Parent_UIN'])) {
        $parentUIN = normalizeUIN($nom['Parent_UIN']);
        
        // Проверяем карту родительских разделов
        if (isset($parentSectionsMap[$parentUIN])) {
            $parentSectionId = $parentSectionsMap[$parentUIN];
            echo "📁 Родительский раздел найден в карте: ID={$parentSectionId}\n";
        } else {
            // Ищем родительский раздел
            $parentSection = findSectionByUIN($nom['Parent_UIN'], '', $SAFE_MODE);
            if ($parentSection) {
                $parentSectionId = $parentSection['ID'];
                $parentSectionsMap[$parentUIN] = $parentSectionId;
                echo "📁 Родительский раздел найден: ID={$parentSectionId}\n";
            } else {
                echo "⚠️ Родительский раздел не найден, элемент будет создан в корне\n";
            }
        }
    }
    
    // Поиск элемента по UIN
    $foundElement = findElementByUIN(
        $nom['UIN'], 
        $nom['Name'], 
        $nom['Parent_UIN'] ?? '',
        $SAFE_MODE
    );
    
    // Подсчитываем статистику по методам поиска
    if ($foundElement) {
        if (strpos($foundElement['XML_ID'], $nom['UIN']) !== false) {
            $stats['found_by_uin']++;
        } else {
            $stats['found_by_name']++;
        }
        
        echo "✅ Элемент найден: ID={$foundElement['ID']}, Название='{$foundElement['NAME']}'\n";
        
        // Обновляем название если отличается
        if ($foundElement['NAME'] != $nom['Name']) {
            if (updateElementTitle($foundElement['ID'], $nom['Name'], $SAFE_MODE)) {
                $stats['updated_title']++;
            } else {
                $stats['errors']++;
            }
        } else {
            echo "ℹ️ Название уже соответствует данным из 1С\n";
        }
        
    } else {
        // СОЗДАЕМ НОВЫЙ ЭЛЕМЕНТ ИЛИ РАЗДЕЛ
        if ($nom['Folder'] == true) {
            // Для папок сначала ищем существующий раздел
            echo "📁 Это папка, ищу существующий раздел...\n";
            $foundSection = findSectionByUIN($nom['UIN'], $nom['Name'], $SAFE_MODE);
            
            if ($foundSection) {
                echo "✅ Раздел найден: ID={$foundSection['ID']}, Название='{$foundSection['NAME']}'\n";
                
                // Обновляем название если отличается
                if ($foundSection['NAME'] != $nom['Name']) {
                    echo "🔄 Обновление названия раздела...\n";
                    if (!$SAFE_MODE) {
                        $updateResult = SectionTable::update($foundSection['ID'], [
                            'NAME' => $nom['Name']
                        ]);
                        
                        if ($updateResult->isSuccess()) {
                            echo "✅ Название раздела успешно обновлено\n";
                            $stats['updated_title']++;
                        } else {
                            echo "❌ Ошибка обновления названия раздела: " . implode(', ', $updateResult->getErrorMessages()) . "\n";
                            $stats['errors']++;
                        }
                    } else {
                        echo "🛡️ БЕЗОПАСНЫЙ РЕЖИМ: Название раздела не обновлено\n";
                    }
                } else {
                    echo "ℹ️ Название раздела уже соответствует данным из 1С\n";
                }
                
                $parentSectionsMap[normalizeUIN($nom['UIN'])] = $foundSection['ID'];
            } else {
                echo "➕ Раздел не найден, создаю новый раздел...\n";
                
                $newSectionId = createSectionWithData($nom, $parentSectionId, $SAFE_MODE);
                
                if ($newSectionId) {
                    $stats['created_sections']++;
                    $parentSectionsMap[normalizeUIN($nom['UIN'])] = $newSectionId;
                    echo "✅ Раздел успешно создан с ID: {$newSectionId}\n";
                } else {
                    $stats['errors']++;
                    echo "❌ Не удалось создать раздел\n";
                }
            }
        } else {
            echo "➕ Элемент не найден, создаю новый товар...\n";
            
            $newElementId = createElementWithData($nom, $parentSectionId, $SAFE_MODE);
            
            if ($newElementId) {
                $stats['created_elements']++;
                echo "✅ Товар успешно создан с ID: {$newElementId}\n";
            } else {
                $stats['errors']++;
                echo "❌ Не удалось создать товар\n";
            }
        }
    }
    
    echo "\n";
}

// --- ИТОГОВАЯ СТАТИСТИКА ---
echo str_repeat("=", 60) . "\n";
echo "📊 ИТОГОВАЯ СТАТИСТИКА:\n";
echo "   📋 Обработано: {$stats['processed']}\n";
echo "   🚫 Исключено: {$stats['excluded']}\n";
echo "   🔍 Найдено по UIN (XML_ID): {$stats['found_by_uin']}\n";
echo "   🔍 Найдено по названию (fallback): {$stats['found_by_name']}\n";
echo "   ➕ Создано товаров: {$stats['created_elements']}\n";
echo "   ➕ Создано разделов: {$stats['created_sections']}\n";
echo "   🔄 Обновлено XML_ID: {$stats['updated_xml_id']}\n";
echo "   🔄 Обновлено названий: {$stats['updated_title']}\n";
echo "   ⚠️ Пропущено: {$stats['skipped']}\n";
echo "   ❌ Ошибок: {$stats['errors']}\n";
echo str_repeat("=", 60) . "\n";

if ($stats['errors'] == 0) {
    echo "🎉 Синхронизация завершена успешно!\n";
} else {
    echo "⚠️ Синхронизация завершена с ошибками. Проверьте логи выше.\n";
}

if ($BACKUP_MODE && !$SAFE_MODE && isset($backupDate)) {
    echo "🛡️ Бэкап создан: b_iblock_element_backup_{$backupDate} и b_iblock_section_backup_{$backupDate}\n";
}

// Закрываем тег
echo '</pre>';

require_once($_SERVER["DOCUMENT_ROOT"]."/bitrix/modules/main/include/epilog_after.php");
