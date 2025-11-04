<?php

namespace Astral\Ext\Agent;


use Astral\Ext\Integrations\Integration1C\Client\IntegrationClient1C;
use Astral\Ext\Integrations\Integration1C\Client\IntegrationRequest;
use Bitrix\Crm\CompanyTable;
use Bitrix\Crm\EntityRequisite;
use Bitrix\Crm\RequisiteTable;
use Bitrix\Main\ArgumentException;
use Bitrix\Main\Loader;
use Bitrix\Main\Localization\Loc;
use Bitrix\Main\ObjectPropertyException;
use Bitrix\Main\SystemException;
use CCrmCompany;
use CCrmOwnerType;
use CEventLog;
use Exception;

class GetAllCompanies1C
{
    private const AUTH_TOKEN = 'Basic 0JDQtNC80LjQvdC40YHRgtGA0LDRgtC+0YA6NzU5NDg2';
    private const API_URL = 'http://192.168.1.11:8080/uchet_all/hs/AIR_KE_Integration/';
    private const METHOD_GET_KONTR = 'ReloadKontrBitrixAll';

    // --- НАСТРОЙКИ БЕЗОПАСНОСТИ ---
    private static bool $safeMode = false; // Выключить безопасный режим (только чтение)
    private static bool $backupMode = true; // Создать бэкап перед обработкой
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
                    'MODULE_ID' => ASTRAL_EXT,
                    'DESCRIPTION' => Loc::getMessage('START_SYNC_COMPANIES_1C_TO_BITRIX'),
                ]
            );
            Loader::includeModule('crm');
            if (self::$backupMode && !self::$safeMode) {
                $backupDate = self::createBackup();
                if (!$backupDate) {
                    throw new SystemException(Loc::getMessage('ERROR_BACKUP'));
                }
            }
            $httpClient = IntegrationClient1C::getInstance(self::AUTH_TOKEN);
            $dataFrom1C = IntegrationRequest::sendRequest(
                $httpClient,
                'GET',
                self::API_URL . self::METHOD_GET_KONTR
            );
            if (empty($dataFrom1C) || !array_key_exists('Kontr_Bitrix', $dataFrom1C)
                || empty($dataFrom1C['Kontr_Bitrix'])) {
                throw new SystemException(Loc::getMessage('ERROR_GET_DATA_1C'));
            }
            $kontragenty = $dataFrom1C['Kontr_Bitrix'];
            // Статистика
            $stats = [
                'processed' => 0,
                'found_by_uin' => 0,
                'found_by_inn' => 0,
                'created' => 0,
                'updated_xml_id' => 0,
                'updated_title' => 0,
                'updated_inn' => 0,
                'updated_kpp' => 0,
                'assigned_from_responsible' => 0,
                'skipped' => 0,
                'excluded' => 0,
                'errors' => 0,
            ];

            //Обработка каждого контрагента
            foreach ($kontragenty as $kontragent) {
                $stats['processed']++;
                // Проверка на максимальное количество ошибок
                if ($stats['errors'] >= self::$maxErrors) {
                    throw new SystemException(
                        Loc::getMessage(
                            'ERROR_MAX_COUNT_ERROR',
                            [
                                '#MAX_ERRORS#' => self::$maxErrors,
                            ]
                        )
                    );
                }
                // Валидация данных
                if (empty($kontragent['UIN'])) {
                    $stats['skipped']++;
                    continue;
                }

                // Проверка на исключаемые UIN
                if (self::isExcludedUIN($kontragent['UIN'])) {
                    $stats['excluded']++;
                    continue;
                }

                if (empty($kontragent['Name'])) {
                    $stats['skipped']++;
                    continue;
                }

                // ПРИОРИТЕТ: Поиск по UIN (UF_XML_ID)
                $foundCompany = self::findCompanyByUIN(
                    $kontragent['UIN'],
                    $kontragent['INN'] ?? ''
                );
                // Подсчитываем статистику по методам поиска
                if ($foundCompany) {
                    if (str_contains($foundCompany['UF_XML_ID'], $kontragent['UIN'])) {
                        $stats['found_by_uin']++;
                    } elseif (!empty($kontragent['INN'])) {
                        $stats['found_by_inn']++;
                    }

                    // Обновляем название если отличается
                    if ($foundCompany['TITLE'] !== $kontragent['Name']) {
                        if (self::updateCompanyTitle((int)$foundCompany['ID'], $kontragent['Name'])) {
                            $stats['updated_title']++;
                        } else {
                            $stats['errors']++;
                            // ЛОГИРУЕМ ОШИБКУ
                            CEventLog::Add([
                                'SEVERITY' => CEventLog::SEVERITY_ERROR,
                                'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                                'ITEM_ID' => __FILE__ . ':' . __LINE__,
                                'MODULE_ID' => ASTRAL_EXT,
                                'DESCRIPTION' => sprintf(
                                    "ОШИБКА #%d: Не удалось обновить название компании ID=%d (UIN=%s). Старое: '%s', Новое: '%s'",
                                    $stats['errors'],
                                    $foundCompany['ID'],
                                    $kontragent['UIN'],
                                    $foundCompany['TITLE'],
                                    $kontragent['Name']
                                ),
                            ]);
                        }
                    }

                    // РЕКВИЗИТЫ НЕ ОБНОВЛЯЕМ ДЛЯ СУЩЕСТВУЮЩИХ КОМПАНИЙ
                    // Обновление реквизитов отключено из-за ограничений Битрикс (КПП max 9 символов)
                } else {
                    // СОЗДАЕМ НОВУЮ КОМПАНИЮ
                    $result = self::createCompanyWithRequisites($kontragent);
                    if ($result['success']) {
                        $stats['created']++;
                        if ($result['assigned_from_responsible']) {
                            $stats['assigned_from_responsible']++;
                        }
                    } else {
                        $stats['errors']++;
                        // ЛОГИРУЕМ ОШИБКУ
                        CEventLog::Add([
                            'SEVERITY' => CEventLog::SEVERITY_ERROR,
                            'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                            'ITEM_ID' => __FILE__ . ':' . __LINE__,
                            'MODULE_ID' => ASTRAL_EXT,
                            'DESCRIPTION' => sprintf(
                                "ОШИБКА #%d: Не удалось создать новую компанию (UIN=%s, Name=%s, ИНН=%s, КПП=%s)",
                                $stats['errors'],
                                $kontragent['UIN'],
                                $kontragent['Name'],
                                $kontragent['INN'] ?? 'нет',
                                $kontragent['KPP'] ?? 'нет'
                            ),
                        ]);
                    }
                }
            }
            // --- ИТОГОВАЯ СТАТИСТИКА ---
            CEventLog::Add(
                [
                    'SEVERITY' => CEventLog::SEVERITY_INFO,
                    'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                    'ITEM_ID' => __FILE__ . ':' . __LINE__,
                    'MODULE_ID' => ASTRAL_EXT,
                    'DESCRIPTION' => Loc::getMessage(
                        'TOTAL_STATS',
                        [
                            '#PROCESSED#' => $stats['processed'],
                            '#EXCLUDED#' => $stats['excluded'],
                            '#FOUND_BY_UIN#' => $stats['found_by_uin'],
                            '#FOUND_BY_INN#' => $stats['found_by_inn'],
                            '#CREATED#' => $stats['created'],
                            '#UPDATED_XML_ID#' => $stats['updated_xml_id'],
                            '#UPDATED_TITLE#' => $stats['updated_title'],
                            '#UPDATED_INN#' => $stats['updated_inn'],
                            '#UPDATED_KPP#' => $stats['updated_kpp'],
                            '#ASSIGNED_FROM_RESPONSIBLE#' => $stats['assigned_from_responsible'],
                            '#SKIPPED#' => $stats['skipped'],
                            '#ERRORS#' => $stats['errors'],
                        ]
                    ),
                ]
            );

            if ($stats['errors'] === 0) {
                CEventLog::Add(
                    [
                        'SEVERITY' => CEventLog::SEVERITY_INFO,
                        'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                        'ITEM_ID' => __FILE__ . ':' . __LINE__,
                        'MODULE_ID' => ASTRAL_EXT,
                        'DESCRIPTION' => Loc::getMessage('SYNC_DONE_SUCCESS'),
                    ]
                );
            } else {
                CEventLog::Add(
                    [
                        'SEVERITY' => CEventLog::SEVERITY_INFO,
                        'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                        'ITEM_ID' => __FILE__ . ':' . __LINE__,
                        'MODULE_ID' => ASTRAL_EXT,
                        'DESCRIPTION' => Loc::getMessage('SYNC_DONE_WITH_ERROR'),
                    ]
                );
            }

            if (self::$backupMode && !self::$safeMode && isset($backupDate)) {
                CEventLog::Add(
                    [
                        'SEVERITY' => CEventLog::SEVERITY_INFO,
                        'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                        'ITEM_ID' => __FILE__ . ':' . __LINE__,
                        'MODULE_ID' => ASTRAL_EXT,
                        'DESCRIPTION' => Loc::getMessage(
                            'LOG_CREATE_BACKUP',
                            [
                                '#BACKUP_DATE#' => $backupDate,
                            ]
                        ),
                    ]
                );
            }
        } catch (Exception $exception) {
            CEventLog::Add(
                [
                    'SEVERITY' => CEventLog::SEVERITY_ERROR,
                    'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                    'ITEM_ID' => $exception->getFile() . ':' . $exception->getLine(),
                    'MODULE_ID' => ASTRAL_EXT,
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
            // Бэкап таблицы компаний
            $sql = "CREATE TABLE b_crm_company_backup_{$backupDate} AS SELECT * FROM b_crm_company";
            $DB->Query($sql);
            // Бэкап таблицы реквизитов
            $sql = "CREATE TABLE b_crm_requisite_backup_{$backupDate} AS SELECT * FROM b_crm_requisite";
            $DB->Query($sql);
            return $backupDate;
        } catch (Exception $e) {
            throw new SystemException(
                Loc::getMessage(
                    'ERROR_CREATE_BACKUP',
                    [
                        '#ERROR#' => $e->getMessage(),
                    ]
                )
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
            'f3def0ca-5292-11e8-810a-00155d735300',
            'f3def10d-5292-11e8-810a-00155d735300',
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
     * Получение ID ответственного по UIN_Otvetstvennyiy
     * @param string $uinResponsible
     * @return int
     */
    private static function getResponsibleByUIN(string $uinResponsible): int
    {
        if (empty($uinResponsible)) {
            return 1; // По умолчанию администратор
        }

        try {
            $normalizedUIN = self::normalizeUIN($uinResponsible);
            
            $dbRes = CCrmCompany::GetListEx(
                [],
                ['=UF_XML_ID' => $normalizedUIN, 'CHECK_PERMISSIONS' => 'N'],
                false,
                false,
                ['ID', 'ASSIGNED_BY_ID']
            );

            if ($company = $dbRes->Fetch()) {
                if (!empty($company['ASSIGNED_BY_ID']) && (int)$company['ASSIGNED_BY_ID'] > 0) {
                    return (int)$company['ASSIGNED_BY_ID'];
                }
            }
        } catch (Exception $e) {
            // В случае ошибки возвращаем администратора
        }

        return 1; // По умолчанию администратор
    }

    /**
     * Проверка и обновление реквизитов компании (ИНН, КПП)
     * @param int $companyId
     * @param string $inn
     * @param string $kpp
     * @return array
     */
    private static function checkAndUpdateRequisites(int $companyId, string $inn, string $kpp = ''): array
    {
        $result = [
            'success' => true,
            'inn' => false,
            'kpp' => false,
        ];

        if ((empty($inn) && empty($kpp)) || self::$safeMode) {
            return $result;
        }

        try {
            // Ищем существующие реквизиты компании
            $requisites = RequisiteTable::getList(
                [
                    'filter' => [
                        'ENTITY_TYPE_ID' => CCrmOwnerType::Company,
                        'ENTITY_ID' => $companyId,
                    ],
                    'select' => ['ID', 'RQ_INN', 'RQ_KPP', 'NAME'],
                ]
            );

            $existingRequisite = null;
            if ($req = $requisites->fetch()) {
                $existingRequisite = $req;
            }

            if ($existingRequisite) {
                // Проверяем, нужно ли обновить ИНН или КПП
                $needUpdate = false;
                $updateFields = [];

                if (!empty($inn) && $existingRequisite['RQ_INN'] !== $inn) {
                    $updateFields['RQ_INN'] = $inn;
                    $needUpdate = true;
                    $result['inn'] = true;
                }

                if (!empty($kpp) && $existingRequisite['RQ_KPP'] !== $kpp) {
                    $updateFields['RQ_KPP'] = $kpp;
                    $needUpdate = true;
                    $result['kpp'] = true;
                }

                if ($needUpdate) {
                    $updateResult = RequisiteTable::update(
                        $existingRequisite['ID'],
                        $updateFields
                    );

                    if (!$updateResult->isSuccess()) {
                        $result['success'] = false;
                        // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ОШИБКИ
                        $errors = $updateResult->getErrorMessages();
                        CEventLog::Add([
                            'SEVERITY' => CEventLog::SEVERITY_ERROR,
                            'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                            'ITEM_ID' => __FILE__ . ':' . __LINE__,
                            'MODULE_ID' => ASTRAL_EXT,
                            'DESCRIPTION' => sprintf(
                                "checkAndUpdateRequisites UPDATE FAILED: Company ID=%d, Requisite ID=%d, Fields=%s. Errors: %s",
                                $companyId,
                                $existingRequisite['ID'],
                                json_encode($updateFields, JSON_UNESCAPED_UNICODE),
                                implode('; ', $errors)
                            ),
                        ]);
                    }
                }
                return $result;
            }

            // Создаем новые реквизиты
            $requisite = new EntityRequisite();
            $addFields = [
                'ENTITY_TYPE_ID' => CCrmOwnerType::Company,
                'ENTITY_ID' => $companyId,
                'PRESET_ID' => 1,
                'NAME' => Loc::getMessage('TITLE_MAIN_REQ'),
            ];

            if (!empty($inn)) {
                $addFields['RQ_INN'] = $inn;
                $result['inn'] = true;
            }

            if (!empty($kpp)) {
                $addFields['RQ_KPP'] = $kpp;
                $result['kpp'] = true;
            }

            $addReqResult = $requisite->add($addFields);

            if (!$addReqResult->isSuccess()) {
                $result['success'] = false;
                // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ОШИБКИ
                $errors = $addReqResult->getErrorMessages();
                CEventLog::Add([
                    'SEVERITY' => CEventLog::SEVERITY_ERROR,
                    'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                    'ITEM_ID' => __FILE__ . ':' . __LINE__,
                    'MODULE_ID' => ASTRAL_EXT,
                    'DESCRIPTION' => sprintf(
                        "checkAndUpdateRequisites ADD FAILED: Company ID=%d, Fields=%s. Errors: %s",
                        $companyId,
                        json_encode($addFields, JSON_UNESCAPED_UNICODE),
                        implode('; ', $errors)
                    ),
                ]);
            }

            return $result;
        } catch (Exception $e) {
            $result['success'] = false;
            // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ EXCEPTION
            CEventLog::Add([
                'SEVERITY' => CEventLog::SEVERITY_ERROR,
                'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                'ITEM_ID' => __FILE__ . ':' . __LINE__,
                'MODULE_ID' => ASTRAL_EXT,
                'DESCRIPTION' => sprintf(
                    "checkAndUpdateRequisites EXCEPTION: Company ID=%d, INN=%s, KPP=%s. Exception: %s at %s:%d",
                    $companyId,
                    $inn,
                    $kpp,
                    $e->getMessage(),
                    $e->getFile(),
                    $e->getLine()
                ),
            ]);
            return $result;
        }
    }

    /**
     * Поиск компании по UIN (UF_XML_ID) и fallback по ИНН
     * @param string $uin
     * @param string $inn
     * @return mixed
     * @throws ArgumentException
     * @throws ObjectPropertyException
     * @throws SystemException
     * @throws Exception
     */
    private static function findCompanyByUIN(string $uin, string $inn = ''): mixed
    {
        $normalizedUIN = self::normalizeUIN($uin);

        // МЕТОД 1: Точный поиск по UF_XML_ID (UIN)
        $dbRes = CCrmCompany::GetListEx(
            [],
            ['=UF_XML_ID' => $normalizedUIN, 'CHECK_PERMISSIONS' => 'N'],
            false,
            false,
            ['ID', 'TITLE', 'UF_XML_ID', 'COMPANY_TYPE']
        );

        if ($company = $dbRes->Fetch()) {
            return $company;
        }

        // МЕТОД 2: Fallback поиск по ИНН (только если UIN не найден и ИНН указан)
        if (!empty($inn)) {
            $requisites = RequisiteTable::getList(
                [
                    'filter' => [
                        'ENTITY_TYPE_ID' => CCrmOwnerType::Company,
                        'RQ_INN' => $inn,
                    ],
                    'select' => ['ENTITY_ID', 'RQ_INN', 'NAME'],
                ]
            );

            if ($req = $requisites->fetch()) {
                $company = CCrmCompany::GetByID($req['ENTITY_ID'], false);
                if ($company) {
                    // Обновляем UF_XML_ID на правильный UIN из 1С (только если не безопасный режим)
                    if (!self::$safeMode) {
                        CompanyTable::update(
                            $company['ID'],
                            [
                                'UF_XML_ID' => $normalizedUIN,
                            ]
                        );
                        // Обновляем значение в возвращаемом массиве
                        $company['UF_XML_ID'] = $normalizedUIN;
                    }
                    return $company;
                }
            }
        }

        return null;
    }

    /**
     * Обновление названия компании
     * @param int $companyId
     * @param string $newTitle
     * @return bool
     * @throws Exception
     */
    private static function updateCompanyTitle(int $companyId, string $newTitle): bool
    {
        if (self::$safeMode) {
            return true;
        }

        $updateResult = CompanyTable::update(
            $companyId,
            [
                'TITLE' => $newTitle,
            ]
        );

        if ($updateResult->isSuccess()) {
            return true;
        }

        // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ОШИБКИ
        $errors = $updateResult->getErrorMessages();
        CEventLog::Add([
            'SEVERITY' => CEventLog::SEVERITY_ERROR,
            'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
            'ITEM_ID' => __FILE__ . ':' . __LINE__,
            'MODULE_ID' => ASTRAL_EXT,
            'DESCRIPTION' => sprintf(
                "updateCompanyTitle FAILED: Company ID=%d, Title='%s'. Errors: %s",
                $companyId,
                $newTitle,
                implode('; ', $errors)
            ),
        ]);

        return false;
    }

    /**
     * Создание новой компании с реквизитами
     * @param array $kontragent
     * @return array
     * @throws Exception
     */
    private static function createCompanyWithRequisites(array $kontragent): array
    {
        $result = [
            'success' => false,
            'company_id' => false,
            'assigned_from_responsible' => false,
        ];

        if (self::$safeMode) {
            $result['success'] = true;
            return $result;
        }

        $normalizedUIN = self::normalizeUIN($kontragent['UIN']);
        
        // Получаем ответственного по UIN_Otvetstvennyiy
        $assignedById = 1; // По умолчанию


        $entityFields = [
            'TITLE' => $kontragent['Name'],
            'UF_XML_ID' => $normalizedUIN,
            'COMPANY_TYPE' => 'CUSTOMER',
            'ASSIGNED_BY_ID' => $assignedById,
			'MODIFY_BY_ID' => $assignedById,

        ];
        
        $entityObject = new CCrmCompany(false);
        $newCompanyId = $entityObject->Add($entityFields);

        if ($newCompanyId !== false) {
            $result['success'] = true;
            $result['company_id'] = $newCompanyId;

            // Добавляем реквизиты если есть ИНН (КПП не добавляем - ограничение Битрикс 9 символов)
            if (!empty($kontragent['INN'])) {
                $requisite = new EntityRequisite();
                $requisiteFields = [
                    'ENTITY_TYPE_ID' => CCrmOwnerType::Company,
                    'ENTITY_ID' => $newCompanyId,
                    'PRESET_ID' => 1,
                    'NAME' => Loc::getMessage('TITLE_MAIN_REQ'),
                    'RQ_INN' => $kontragent['INN'],
                ];

                $addReqResult = $requisite->add($requisiteFields);

                if (!$addReqResult->isSuccess()) {
                    // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ОШИБКИ ПРИ СОЗДАНИИ РЕКВИЗИТОВ
                    $errors = $addReqResult->getErrorMessages();
                    CEventLog::Add([
                        'SEVERITY' => CEventLog::SEVERITY_WARNING,
                        'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                        'ITEM_ID' => __FILE__ . ':' . __LINE__,
                        'MODULE_ID' => ASTRAL_EXT,
                        'DESCRIPTION' => sprintf(
                            "createCompanyWithRequisites: Компания создана (ID=%d), но не удалось добавить ИНН. UIN=%s, INN=%s. Errors: %s",
                            $newCompanyId,
                            $kontragent['UIN'],
                            $kontragent['INN'],
                            implode('; ', $errors)
                        ),
                    ]);
                }
            }
        } else {
            // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ОШИБКИ ПРИ СОЗДАНИИ КОМПАНИИ
            $lastError = $entityObject->LAST_ERROR;
            CEventLog::Add([
                'SEVERITY' => CEventLog::SEVERITY_ERROR,
                'AUDIT_TYPE_ID' => 'ASTRAL_ALERT',
                'ITEM_ID' => __FILE__ . ':' . __LINE__,
                'MODULE_ID' => ASTRAL_EXT,
                'DESCRIPTION' => sprintf(
                    "createCompanyWithRequisites FAILED: Не удалось создать компанию. UIN=%s, Fields=%s. Error: %s",
                    $kontragent['UIN'],
                    json_encode($entityFields, JSON_UNESCAPED_UNICODE),
                    $lastError ?: 'Unknown error'
                ),
            ]);
        }

        return $result;
    }
}