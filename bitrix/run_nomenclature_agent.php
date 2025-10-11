<?php
require_once $_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/main/include/prolog_before.php';

// Подключаем файл агента
require_once $_SERVER['DOCUMENT_ROOT'].'/Astral/Ext/Agent/GetAllNomenclature1C.php';

use Astral\Ext\Agent\GetAllNomenclature1C;

// Запускаем агент
return GetAllNomenclature1C::execute(true);
