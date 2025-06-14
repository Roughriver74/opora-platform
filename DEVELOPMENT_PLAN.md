# Подробный план разработки Beton CRM

## 1. 🔐 Система авторизации

### Backend (Node.js/Express)
```
server/
├── auth/
│   ├── authController.js (<100 строк)
│   ├── authMiddleware.js (<50 строк)
│   ├── jwtService.js (<80 строк)
│   └── routes.js (<30 строк)
├── models/User.js
└── utils/passwordHash.js
```

**Задачи:**
- [ ] JWT токены (access + refresh)
- [ ] Endpoint `/auth/admin-login`
- [ ] Middleware для защиты роутов
- [ ] Хеширование паролей (bcrypt)
- [ ] Роли пользователей (admin, user)

### Frontend (React)
```
components/auth/
├── LoginForm/
│   ├── index.tsx (<100 строк)
│   ├── hooks/useLogin.ts (<80 строк)
│   ├── types.ts
│   └── validation.ts
├── PrivateRoute/
│   ├── index.tsx (<50 строк)
│   └── hooks/useAuth.ts (<60 строк)
└── AuthContext/
    ├── index.tsx (<120 строк)
    └── types.ts
```

**Задачи:**
- [ ] Форма входа с валидацией
- [ ] Context для состояния авторизации
- [ ] Защищенные роуты
- [ ] Автоматический refresh токенов

---

## 2. 👥 CRUD пользователей

### Backend API
```
server/users/
├── userController.js (<150 строк)
├── userModel.js (<100 строк)
├── userValidation.js (<80 строк)
└── userRoutes.js (<50 строк)
```

**Endpoints:**
- `GET /api/users` - список пользователей
- `POST /api/users` - создание
- `PUT /api/users/:id` - редактирование
- `DELETE /api/users/:id` - удаление
- `PATCH /api/users/:id/status` - изменение статуса

### Frontend Admin
```
components/admin/Users/
├── UsersTable/
│   ├── index.tsx (<120 строк)
│   ├── hooks/useUsersTable.ts (<100 строк)
│   ├── components/UserRow.tsx (<80 строк)
│   └── types.ts
├── UserForm/
│   ├── index.tsx (<100 строк)
│   ├── hooks/useUserForm.ts (<120 строк)
│   ├── components/
│   │   ├── PersonalInfoSection.tsx (<80 строк)
│   │   ├── RoleSection.tsx (<60 строк)
│   │   └── StatusSection.tsx (<50 строк)
│   ├── validation/userValidation.ts (<100 строк)
│   └── types.ts
└── UserModal/
    ├── index.tsx (<80 строк)
    └── hooks/useUserModal.ts (<60 строк)
```

---

## 3. 📋 Управление заявками

### Backend
```
server/applications/
├── applicationController.js (<180 строк)
├── applicationModel.js (<120 строк)
├── statusController.js (<100 строк)
└── applicationRoutes.js (<60 строк)
```

**Статусы заявок:**
- Новая, В обработке, Одобрена, Отклонена, Выполнена

### Frontend
```
components/applications/
├── ApplicationsTable/
│   ├── index.tsx (<130 строк)
│   ├── hooks/useApplicationsTable.ts (<120 строк)
│   ├── components/
│   │   ├── ApplicationRow.tsx (<100 строк)
│   │   ├── StatusBadge.tsx (<40 строк)
│   │   └── ActionButtons.tsx (<60 строк)
│   └── types.ts
├── ApplicationForm/
│   ├── index.tsx (<150 строк)
│   ├── hooks/useApplicationForm.ts (<140 строк)
│   ├── components/
│   │   ├── ClientSection.tsx (<100 строк)
│   │   ├── ProductSection.tsx (<120 строк)
│   │   └── DeliverySection.tsx (<100 строк)
│   └── types.ts
└── StatusManager/
    ├── index.tsx (<80 строк)
    ├── hooks/useStatusManager.ts (<90 строк)
    └── components/StatusHistoryItem.tsx (<50 строк)
```

---

## 4. 🔗 Интеграция с Битрикс24

### Backend
```
server/bitrix/
├── bitrixService.js (<160 строк)
├── userSyncService.js (<140 строк)
├── bitrixController.js (<120 строк)
├── webhookHandler.js (<100 строк)
└── bitrixRoutes.js (<50 строк)
```

**Функционал:**
- [ ] Синхронизация пользователей по email
- [ ] Создание сделок в Битрикс24
- [ ] Загрузка номенклатуры для автокомплита
- [ ] Webhook для уведомлений

### Frontend
```
components/bitrix/
├── UserLinkStatus/
│   ├── index.tsx (<70 строк)
│   ├── hooks/useBitrixLink.ts (<80 строк)
│   └── components/LinkIndicator.tsx (<40 строк)
├── SyncManager/
│   ├── index.tsx (<100 строк)
│   ├── hooks/useSyncManager.ts (<120 строк)
│   └── components/SyncButton.tsx (<50 строк)
└── BitrixSettings/
    ├── index.tsx (<150 строк)
    └── hooks/useBitrixSettings.ts (<100 строк)
```

---

## 5. 🔗 Связанные поля

### Логика автозаполнения
```
components/form/LinkedFields/
├── index.tsx (<80 строк)
├── hooks/
│   ├── useLinkedFields.ts (<150 строк)
│   ├── useFieldMapping.ts (<100 строк)
│   └── useCopyFields.ts (<80 строк)
├── components/
│   ├── CopyButton.tsx (<60 строк)
│   ├── FieldMatcher.tsx (<90 строк)
│   └── CopyPreview.tsx (<100 строк)
├── utils/
│   ├── fieldMapper.ts (<120 строк)
│   ├── valueConverter.ts (<80 строк)
│   └── fieldValidator.ts (<70 строк)
└── types.ts
```

**Принцип работы:**
1. **Маппинг полей:** определение соответствия между разделами
2. **Кнопка копирования:** в разделе "Завод"
3. **Превью изменений:** показать что будет скопировано
4. **Валидация:** проверка совместимости типов полей
5. **История:** возможность отменить копирование

### Интеграция в BetoneForm
```javascript
// В BetoneForm/hooks/useBetoneForm.ts
const { copyFieldsBetweenSections, fieldMappings } = useLinkedFields();

// В BetoneForm/components/FormSection.tsx  
{section.allowCopyFrom && (
  <CopyFieldsButton 
    fromSection="buyer" 
    toSection={section.id}
    onCopy={copyFieldsBetweenSections}
  />
)}
```

---

## 6. 📁 Группировка полей

### Компоненты группировки
```
components/form/FieldGroups/
├── CollapsibleGroup/
│   ├── index.tsx (<90 строк)
│   ├── hooks/useCollapsibleGroup.ts (<70 строк)
│   ├── components/
│   │   ├── GroupHeader.tsx (<50 строк)
│   │   ├── GroupContent.tsx (<60 строк)
│   │   └── CollapseIcon.tsx (<30 строк)
│   └── types.ts
├── GroupManager/
│   ├── index.tsx (<120 строк)
│   ├── hooks/useGroupManager.ts (<140 строк)
│   └── utils/groupHelpers.ts (<100 строк)
└── DividerGroup/
    ├── index.tsx (<80 строк)
    └── hooks/useDividerGroup.ts (<60 строк)
```

### Логика группировки
```javascript
// Группировка по разделителям внутри секций
const groupsByDivider = {
  "Основная информация": [field1, field2],
  "Дополнительно": [field3, field4],
  "Контакты": [field5, field6]
};

// В FormSection компоненте
{Object.entries(groupsByDivider).map(([groupName, fields]) => (
  <CollapsibleGroup 
    key={groupName}
    title={groupName}
    defaultCollapsed={false}
  >
    {fields.map(field => <FormField key={field.id} {...field} />)}
  </CollapsibleGroup>
))}
```

---

## 🚀 Порядок реализации

### Этап 1 (1-2 недели)
1. ✅ Система авторизации (backend + frontend)
2. ✅ CRUD пользователей (админка)

### Этап 2 (1-2 недели)  
3. ✅ Управление заявками
4. ✅ Базовая интеграция с Битрикс24

### Этап 3 (1 неделя)
5. ✅ Связанные поля
6. ✅ Группировка полей

### Этап 4 (0.5 недели)
7. ✅ Тестирование и документация

---

## 🎯 Ключевые принципы

✅ **Модульность:** каждый файл < 200 строк  
✅ **Переиспользование:** хуки и утилиты в отдельных файлах  
✅ **Типизация:** TypeScript для всех компонентов  
✅ **Тестируемость:** изоляция логики в хуках  
✅ **Расширяемость:** легко добавлять новые типы полей и групп

---

## 📝 Статус выполнения

### Этап 1: Система авторизации
- [ ] Backend: JWT сервис
- [ ] Backend: Auth middleware
- [ ] Backend: Auth контроллер
- [ ] Frontend: Auth context
- [ ] Frontend: Login форма
- [ ] Frontend: Защищенные роуты
- [ ] Тестирование авторизации

### Этап 2: CRUD пользователей
- [ ] Backend: User модель
- [ ] Backend: User контроллер
- [ ] Backend: User роуты
- [ ] Frontend: Users таблица
- [ ] Frontend: User форма
- [ ] Frontend: User модал
- [ ] Тестирование CRUD

### Этап 3: Управление заявками
- [ ] Backend: Application модель
- [ ] Backend: Application контроллер
- [ ] Backend: Status управление
- [ ] Frontend: Applications таблица
- [ ] Frontend: Application форма
- [ ] Frontend: Status менеджер
- [ ] Тестирование заявок

### Этап 4: Интеграция Битрикс24
- [ ] Backend: Bitrix сервис
- [ ] Backend: User sync сервис
- [ ] Backend: Webhook handler
- [ ] Frontend: Bitrix индикатор
- [ ] Frontend: Sync менеджер
- [ ] Тестирование интеграции

### Этап 5: Связанные поля
- [ ] Backend: Field mapping API
- [ ] Frontend: Linked fields хук
- [ ] Frontend: Copy button
- [ ] Frontend: Field matcher
- [ ] Интеграция в BetoneForm
- [ ] Тестирование копирования

### Этап 6: Группировка полей
- [ ] Frontend: Collapsible group
- [ ] Frontend: Group manager
- [ ] Frontend: Divider group
- [ ] Интеграция в FormField
- [ ] Тестирование группировки
