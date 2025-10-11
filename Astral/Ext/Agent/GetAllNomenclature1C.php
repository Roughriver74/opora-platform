<?php

namespace Astral\Ext\Agent;

// Убираем несуществующие зависимости
use Bitrix\Iblock\ElementTable;
use Bitrix\Iblock\IblockTable;
use Bitrix\Iblock\SectionTable;
use Bitrix\Catalog\ProductTable;
use Bitrix\Main\ArgumentException;
use Bitrix\Main\Loader;
use Bitrix\Main\Localization\Loc;
use Bitrix\Main\ObjectPropertyException;
use Bitrix\Main\SystemException;
use CEventLog;
use CIBlockElement;
use CIBlockSection;
use Exception;

class GetAllNomenclature1C
{
    private const AUTH_TOKEN = 'Basic 0JDQtNC80LjQvdC40YHRgtGA0LDRgtC+0YA6NzU5NDg2';
    private const API_URL = 'http://192.168.1.11:8080/uchet_all/hs/AIR_KE_Integration/';
    private const METHOD_GET_NOM = 'Reload_NomBitrixAll';
    private const CATALOG_IBLOCK_ID = 14;

    // --- НАСТРОЙКИ БЕЗОПАСНОСТИ ---
    private static bool $safeMode = false; // Выключить безопасный режим (только чтение)
    private static bool $backupMode = true; // Создать бэкап перед обработкой
    private static int $batchSize = 50; // Размер пакета для обработки
    private static int $maxErrors = 10; // Максимум ошибок перед остановкой

    /**
     * @param bool $isCron
     * @return string
     */
    public static function execute(bool $isCron = true): string
    {
        try {
            CEventLog::Add(
                [
                    'SEVERITY' => CEventLog::SEVERITY_INFO,
                    'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                    'ITEM_ID' => __FILE__ . ':' . __LINE__,
                    'MODULE_ID' => 'main',
                    'DESCRIPTION' => 'Начало синхронизации номенклатуры из 1С в Битрикс24',
                ]
            );

            Loader::includeModule('iblock');
            Loader::includeModule('catalog');

            if (self::$backupMode && !self::$safeMode) {
                $backupDate = self::createBackup();
                if (!$backupDate) {
                    throw new SystemException('Ошибка создания бэкапа');
                }
            }

            // Получаем данные из 1С через cURL
            $curl = curl_init();
            curl_setopt_array($curl, array(
                CURLOPT_URL => self::API_URL . self::METHOD_GET_NOM,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => '',
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => 'GET',
                CURLOPT_HTTPHEADER => array(
                    'Content-Type: application/json',
                    'Authorization: ' . self::AUTH_TOKEN
                ),
            ));

            $response1c = curl_exec($curl);
            $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);

            if ($http_code != 200 || !$response1c) {
                throw new SystemException('Ошибка: Не удалось получить данные из 1С. HTTP статус: ' . $http_code);
            }

            $dataFrom1C = json_decode($response1c, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new SystemException('Ошибка: Некорректный JSON от 1С');
            }

            if (empty($dataFrom1C) || !array_key_exists('NOM', $dataFrom1C) || empty($dataFrom1C['NOM'])) {
                throw new SystemException('Ошибка получения данных из 1С');
            }

            $nomenclature = $dataFrom1C['NOM'];

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
                'errors' => 0,
            ];

            // Создаем карту родительских разделов для правильной обработки иерархии
            $parentSectionsMap = [];

            // Обрабатываем ВСЕ позиции номенклатуры
            foreach ($nomenclature as $nom) {
                $stats['processed']++;

                // Проверка на максимальное количество ошибок
                if ($stats['errors'] >= self::$maxErrors) {
                    throw new SystemException(
                        'Достигнуто максимальное количество ошибок (' . self::$maxErrors . ')'
                    );
                }

                // Валидация данных
                if (empty($nom['UIN'])) {
                    $stats['skipped']++;
                    continue;
                }

                if (empty($nom['Name'])) {
                    $stats['skipped']++;
                    continue;
                }

                // Проверка на исключаемые UIN
                if (self::isExcludedUIN($nom['UIN'])) {
                    $stats['excluded']++;
                    continue;
                }

                // Определяем родительский раздел
                $parentSectionId = 0;
                if (!empty($nom['Parent_UIN'])) {
                    $parentUIN = self::normalizeUIN($nom['Parent_UIN']);

                    // Проверяем карту родительских разделов
                    if (isset($parentSectionsMap[$parentUIN])) {
                        $parentSectionId = $parentSectionsMap[$parentUIN];
                    } else {
                        // Ищем родительский раздел
                        $parentSection = self::findSectionByUIN($nom['Parent_UIN'], '', self::$safeMode);
                        if ($parentSection) {
                            $parentSectionId = $parentSection['ID'];
                            $parentSectionsMap[$parentUIN] = $parentSectionId;
                        }
                    }
                }

                // Поиск элемента по UIN
                $foundElement = self::findElementByUIN(
                    $nom['UIN'],
                    $nom['Name'],
                    $nom['Parent_UIN'] ?? '',
                    self::$safeMode
                );

                // Подсчитываем статистику по методам поиска
                if ($foundElement) {
                    if (str_contains($foundElement['XML_ID'], $nom['UIN'])) {
                        $stats['found_by_uin']++;
                    } else {
                        $stats['found_by_name']++;
                    }

                    // Обновляем название если отличается
                    if ($foundElement['NAME'] !== $nom['Name']) {
                        if (self::updateElementTitle($foundElement['ID'], $nom['Name'], self::$safeMode)) {
                            $stats['updated_title']++;
                        } else {
                            $stats['errors']++;
                        }
                    }
                } else {
                    // СОЗДАЕМ НОВЫЙ ЭЛЕМЕНТ ИЛИ РАЗДЕЛ
                    if ($nom['Folder'] == true) {
                        // Для папок сначала ищем существующий раздел
                        $foundSection = self::findSectionByUIN($nom['UIN'], $nom['Name'], self::$safeMode);

                        if ($foundSection) {
                            // Обновляем название если отличается
                            if ($foundSection['NAME'] !== $nom['Name']) {
                                if (!self::$safeMode) {
                                    $updateResult = SectionTable::update($foundSection['ID'], [
                                        'NAME' => $nom['Name']
                                    ]);

                                    if ($updateResult->isSuccess()) {
                                        $stats['updated_title']++;
                                    } else {
                                        $stats['errors']++;
                                    }
                                }
                            }

                            $parentSectionsMap[self::normalizeUIN($nom['UIN'])] = $foundSection['ID'];
                        } else {
                            $newSectionId = self::createSectionWithData($nom, $parentSectionId, self::$safeMode);

                            if ($newSectionId) {
                                $stats['created_sections']++;
                                $parentSectionsMap[self::normalizeUIN($nom['UIN'])] = $newSectionId;
                            } else {
                                $stats['errors']++;
                            }
                        }
                    } else {
                        $newElementId = self::createElementWithData($nom, $parentSectionId, self::$safeMode);

                        if ($newElementId) {
                            $stats['created_elements']++;
                        } else {
                            $stats['errors']++;
                        }
                    }
                }
            }

            // --- ИТОГОВАЯ СТАТИСТИКА ---
            CEventLog::Add(
                [
                    'SEVERITY' => CEventLog::SEVERITY_INFO,
                    'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                    'ITEM_ID' => __FILE__ . ':' . __LINE__,
                    'MODULE_ID' => 'main',
                    'DESCRIPTION' => 'Статистика синхронизации номенклатуры: обработано ' . $stats['processed'] . 
                        ', исключено ' . $stats['excluded'] . 
                        ', найдено по UIN ' . $stats['found_by_uin'] . 
                        ', найдено по названию ' . $stats['found_by_name'] . 
                        ', создано товаров ' . $stats['created_elements'] . 
                        ', создано разделов ' . $stats['created_sections'] . 
                        ', обновлено XML_ID ' . $stats['updated_xml_id'] . 
                        ', обновлено названий ' . $stats['updated_title'] . 
                        ', пропущено ' . $stats['skipped'] . 
                        ', ошибок ' . $stats['errors'],
                ]
            );

            if ($stats['errors'] === 0) {
                CEventLog::Add(
                    [
                        'SEVERITY' => CEventLog::SEVERITY_INFO,
                        'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                        'ITEM_ID' => __FILE__ . ':' . __LINE__,
                        'MODULE_ID' => 'main',
                        'DESCRIPTION' => 'Синхронизация номенклатуры завершена успешно',
                    ]
                );
            } else {
                CEventLog::Add(
                    [
                        'SEVERITY' => CEventLog::SEVERITY_INFO,
                        'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                        'ITEM_ID' => __FILE__ . ':' . __LINE__,
                        'MODULE_ID' => 'main',
                        'DESCRIPTION' => 'Синхронизация номенклатуры завершена с ошибками',
                    ]
                );
            }

            if (self::$backupMode && !self::$safeMode && isset($backupDate)) {
                CEventLog::Add(
                    [
                        'SEVERITY' => CEventLog::SEVERITY_INFO,
                        'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                        'ITEM_ID' => __FILE__ . ':' . __LINE__,
                        'MODULE_ID' => 'main',
                        'DESCRIPTION' => 'Создан бэкап: ' . $backupDate,
                    ]
                );
            }
        } catch (Exception $exception) {
            CEventLog::Add(
                [
                    'SEVERITY' => CEventLog::SEVERITY_ERROR,
                    'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                    'ITEM_ID' => $exception->getFile() . ':' . $exception->getLine(),
                    'MODULE_ID' => 'main',
                    'DESCRIPTION' => $exception->getMessage(),
                ]
            );
        }
        return $isCron ? __METHOD__ . '();' : '';
    }

    /**
     * Создание бэкапа таблиц
     * @throws SystemException
     */
    private static function createBackup(): bool|string
    {
        global $DB;
        $backupDate = date('Ymd_His');
        try {
            // Бэкап таблицы элементов
            $sql = "CREATE TABLE b_iblock_element_backup_{$backupDate} AS SELECT * FROM b_iblock_element WHERE IBLOCK_ID = " . self::CATALOG_IBLOCK_ID;
            $DB->Query($sql);

            // Бэкап таблицы разделов
            $sql = "CREATE TABLE b_iblock_section_backup_{$backupDate} AS SELECT * FROM b_iblock_section WHERE IBLOCK_ID = " . self::CATALOG_IBLOCK_ID;
            $DB->Query($sql);

            return $backupDate;
        } catch (Exception $e) {
            throw new SystemException(
                'Ошибка создания бэкапа: ' . $e->getMessage()
            );
        }
    }

    /**
     * Нормализация UIN - очистка от лишних символов
     * @param string $uin
     * @return string|string[]|null
     */
    private static function normalizeUIN(string $uin): array|string|null
    {
        if (empty($uin)) {
            return '';
        }

        // Убираем пробелы
        $uin = trim($uin);

        // Убираем все символы кроме цифр, букв и дефисов
        $uin = preg_replace('/[^a-zA-Z0-9\-]/', '', $uin);

        return $uin;
    }

    /**
     * Проверка на исключаемые UIN
     * @param string $uin
     * @return bool
     */
    private static function isExcludedUIN(string $uin): bool
    {
        $excludedUINs = [
            // Добавьте UIN для исключения здесь
        ];

        $normalizedUIN = self::normalizeUIN($uin);

        foreach ($excludedUINs as $excludedUIN) {
            if ($normalizedUIN === self::normalizeUIN($excludedUIN)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Поиск элемента по UIN (XML_ID) с fallback методами
     * @param string $uin
     * @param string $elementName
     * @param string $parentUIN
     * @param bool $safeMode
     * @return mixed
     * @throws ArgumentException
     * @throws ObjectPropertyException
     * @throws SystemException
     */
    private static function findElementByUIN(string $uin, string $elementName = '', string $parentUIN = '', bool $safeMode = false): mixed
    {
        $normalizedUIN = self::normalizeUIN($uin);
        $foundElements = [];

        // ПРИОРИТЕТ 1: Точный поиск по XML_ID (UIN)
        $dbRes = CIBlockElement::GetList(
            [],
            [
                'IBLOCK_ID' => self::CATALOG_IBLOCK_ID,
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
        }

        // ПРИОРИТЕТ 2: Частичный поиск по XML_ID (на случай опечаток)
        if (empty($foundElements)) {
            $dbRes = CIBlockElement::GetList(
                [],
                [
                    'IBLOCK_ID' => self::CATALOG_IBLOCK_ID,
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
            }
        }

        // FALLBACK 3: Поиск по названию (только если UIN не найден)
        if (empty($foundElements) && !empty($elementName)) {
            $cleanName = trim(preg_replace('/[^\w\s\-\.]/u', '', $elementName));

            $dbRes = CIBlockElement::GetList(
                [],
                [
                    'IBLOCK_ID' => self::CATALOG_IBLOCK_ID,
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

                    // Обновляем XML_ID на UIN из 1С (только если не безопасный режим)
                    if (!$safeMode) {
                        $updateResult = ElementTable::update($element['ID'], [
                            'XML_ID' => $normalizedUIN
                        ]);

                        if (!$updateResult->isSuccess()) {
                            // Логируем ошибку, но не прерываем выполнение
                            CEventLog::Add(
                                [
                                    'SEVERITY' => CEventLog::SEVERITY_WARNING,
                                    'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                                    'ITEM_ID' => __FILE__ . ':' . __LINE__,
                                    'MODULE_ID' => 'main',
                                    'DESCRIPTION' => 'Ошибка обновления XML_ID: ' . implode(', ', $updateResult->getErrorMessages()),
                                ]
                            );
                        }
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
            return $bestMatch['element'];
        }

        return null;
    }

    /**
     * Поиск раздела по UIN (XML_ID)
     * @param string $uin
     * @param string $sectionName
     * @param bool $safeMode
     * @return mixed
     * @throws ArgumentException
     * @throws ObjectPropertyException
     * @throws SystemException
     */
    private static function findSectionByUIN(string $uin, string $sectionName = '', bool $safeMode = false): mixed
    {
        $normalizedUIN = self::normalizeUIN($uin);

        // Поиск по XML_ID
        $dbRes = CIBlockSection::GetList(
            [],
            [
                'IBLOCK_ID' => self::CATALOG_IBLOCK_ID,
                '=XML_ID' => $normalizedUIN,
                'CHECK_PERMISSIONS' => 'N'
            ],
            false,
            ['ID', 'NAME', 'XML_ID', 'IBLOCK_SECTION_ID', 'ACTIVE']
        );

        while ($section = $dbRes->Fetch()) {
            return $section;
        }

        // Fallback по названию
        if (!empty($sectionName)) {
            $cleanName = trim(preg_replace('/[^\w\s\-\.]/u', '', $sectionName));

            $dbRes = CIBlockSection::GetList(
                [],
                [
                    'IBLOCK_ID' => self::CATALOG_IBLOCK_ID,
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
                    // Обновляем XML_ID на UIN из 1С (только если не безопасный режим)
                    if (!$safeMode) {
                        $updateResult = SectionTable::update($section['ID'], [
                            'XML_ID' => $normalizedUIN
                        ]);

                        if (!$updateResult->isSuccess()) {
                            // Логируем ошибку, но не прерываем выполнение
                            CEventLog::Add(
                                [
                                    'SEVERITY' => CEventLog::SEVERITY_WARNING,
                                    'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                                    'ITEM_ID' => __FILE__ . ':' . __LINE__,
                                    'MODULE_ID' => 'main',
                                    'DESCRIPTION' => 'Ошибка обновления XML_ID раздела: ' . implode(', ', $updateResult->getErrorMessages()),
                                ]
                            );
                        }
                    }

                    return $section;
                }
            }
        }

        return null;
    }

    /**
     * Обновление названия элемента
     * @param int $elementId
     * @param string $newTitle
     * @param bool $safeMode
     * @return bool
     * @throws Exception
     */
    private static function updateElementTitle(int $elementId, string $newTitle, bool $safeMode = false): bool
    {
        if ($safeMode) {
            return true;
        }

        $updateResult = ElementTable::update($elementId, [
            'NAME' => $newTitle
        ]);

        if ($updateResult->isSuccess()) {
            return true;
        }

        return false;
    }

    /**
     * Создание нового элемента (товара или папки)
     * @param array $nomenclature
     * @param int $parentSectionId
     * @param bool $safeMode
     * @return int|bool
     * @throws Exception
     */
    private static function createElementWithData(array $nomenclature, int $parentSectionId = 0, bool $safeMode = false): int|bool
    {
        if ($safeMode) {
            return true;
        }

        $normalizedUIN = self::normalizeUIN($nomenclature['UIN']);

        $elementFields = [
            'IBLOCK_ID' => self::CATALOG_IBLOCK_ID,
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

            // Если это товар (не папка), создаем запись в каталоге
            if ($nomenclature['Folder'] != true) {
                try {
                    $productResult = ProductTable::add([
                        'ID' => $newElementId,
                        'TYPE' => ProductTable::TYPE_PRODUCT,
                        'AVAILABLE' => 'Y',
                        'QUANTITY' => 0
                    ]);

                    if (!$productResult->isSuccess()) {
                        // Логируем ошибку, но не прерываем выполнение
                        CEventLog::Add(
                            [
                                'SEVERITY' => CEventLog::SEVERITY_WARNING,
                                'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                                'ITEM_ID' => __FILE__ . ':' . __LINE__,
                                'MODULE_ID' => 'main',
                                'DESCRIPTION' => 'Ошибка добавления в каталог: ' . implode(', ', $productResult->getErrorMessages()),
                            ]
                        );
                    }
                } catch (Exception $e) {
                    // Логируем ошибку, но не прерываем выполнение
                    CEventLog::Add(
                        [
                            'SEVERITY' => CEventLog::SEVERITY_WARNING,
                            'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                            'ITEM_ID' => __FILE__ . ':' . __LINE__,
                            'MODULE_ID' => 'main',
                            'DESCRIPTION' => 'Исключение при добавлении в каталог: ' . $e->getMessage(),
                        ]
                    );
                }
            }

            return $newElementId;
        }

        return false;
    }

    /**
     * Создание нового раздела
     * @param array $nomenclature
     * @param int $parentSectionId
     * @param bool $safeMode
     * @return int|bool
     * @throws Exception
     */
    private static function createSectionWithData(array $nomenclature, int $parentSectionId = 0, bool $safeMode = false): int|bool
    {
        if ($safeMode) {
            return true;
        }

        $normalizedUIN = self::normalizeUIN($nomenclature['UIN']);

        $sectionFields = [
            'IBLOCK_ID' => self::CATALOG_IBLOCK_ID,
            'NAME' => $nomenclature['Name'],
            'XML_ID' => $normalizedUIN,
            'ACTIVE' => 'Y',
            'IBLOCK_SECTION_ID' => $parentSectionId
        ];

        $addResult = SectionTable::add($sectionFields);

        if ($addResult->isSuccess()) {
            $newSectionId = $addResult->getId();
            return $newSectionId;
        }

        return false;
    }
}
