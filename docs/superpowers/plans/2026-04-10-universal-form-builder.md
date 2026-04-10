# Universal Form Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic VisitFormEditorPage with a modular Universal Form Builder supporting all entity types with integrated Bitrix24 field mapping and drag-and-drop.

**Architecture:** New `FormTemplate` DB model (replaces `VisitFormTemplate` + `FieldMapping`) stores per-org, per-entity-type field definitions with embedded Bitrix24 mapping. Frontend splits into 8 focused components under `frontend/src/components/FormBuilder/`. The `visit_service.py` Bitrix24 sync is updated to read mapping from `FormTemplate.fields[].bitrix_field_id` instead of querying the `field_mappings` table.

**Tech Stack:** FastAPI + SQLAlchemy 2.0 + Alembic (backend), React 18 + MUI v5 + @dnd-kit + React Query v4 (frontend)

---

## File Map

### New files (backend)
- `app/alembic/versions/XXXX_add_form_templates.py` — migration: create form_templates, migrate data, keep old tables
- `app/routers/form_template_routers.py` — GET/PUT `/api/form-templates/{entity_type}`

### Modified files (backend)
- `app/models.py` — add `FormTemplate` model
- `app/main.py` — register form_template_routers
- `app/routers/admin_routers.py` — add `GET /admin/bitrix/fields/{entity_type}` unified endpoint
- `app/services/visit_service.py` — update `_sync_with_bitrix24` and `_sync_with_bitrix24_update` to read from FormTemplate

### New files (frontend)
- `frontend/src/components/FormBuilder/types.ts`
- `frontend/src/components/FormBuilder/FieldCard.tsx`
- `frontend/src/components/FormBuilder/FieldList.tsx`
- `frontend/src/components/FormBuilder/FieldOptionsEditor.tsx`
- `frontend/src/components/FormBuilder/BitrixFieldSelector.tsx`
- `frontend/src/components/FormBuilder/FieldSettingsDrawer.tsx`
- `frontend/src/components/FormBuilder/FieldPreviewDialog.tsx`
- `frontend/src/components/FormBuilder/FormBuilder.tsx`
- `frontend/src/components/FormBuilder/FormBuilderPage.tsx`

### Modified files (frontend)
- `frontend/package.json` — add @dnd-kit deps
- `frontend/src/App.tsx` — add `/admin/form-builder` route
- `frontend/src/components/Sidebar.tsx` — rename nav item, update path
- `frontend/src/pages/VisitCreatePage.tsx` — update API call to new endpoint

---

## Task 1: Add FormTemplate model to models.py

**Files:**
- Modify: `app/models.py`

- [ ] **Step 1: Read models.py to find the right insertion point**

  Open `app/models.py`. The `VisitFormTemplate` class starts at line 349. Add `FormTemplate` right after it (line ~364).

- [ ] **Step 2: Add the FormTemplate model**

  Insert after the `VisitFormTemplate` class (after line 363):

  ```python
  class FormTemplate(Base):
      """Universal per-organization, per-entity-type form template.
      Replaces VisitFormTemplate + FieldMapping. Fields store Bitrix24 mapping inline."""

      __tablename__ = "form_templates"

      id = Column(Integer, primary_key=True, index=True)
      organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
      entity_type = Column(String, nullable=False)  # visit, clinic, doctor, contact, network_clinic
      fields = Column(JSONB, default=[])
      created_at = Column(DateTime(timezone=True), server_default=func.now())
      updated_at = Column(DateTime(timezone=True), onupdate=func.now())

      organization = relationship("Organization")

      __table_args__ = (
          UniqueConstraint("organization_id", "entity_type", name="uq_form_template_org_entity"),
      )
  ```

  Verify that `UniqueConstraint` is already imported — check the top of models.py. If not, add it to the SQLAlchemy imports line.

- [ ] **Step 3: Verify imports exist**

  At the top of `app/models.py`, find the SQLAlchemy import line. It should contain `UniqueConstraint`. If missing, add it:

  ```python
  from sqlalchemy import (
      Boolean, Column, DateTime, Float, ForeignKey, Integer,
      String, UniqueConstraint, Text, Enum as SAEnum,
  )
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add app/models.py
  git commit -m "feat: add FormTemplate model (universal per-entity form config)"
  ```

---

## Task 2: Create Alembic migration

**Files:**
- Create: `app/alembic/versions/` (new revision file)

- [ ] **Step 1: Generate empty migration**

  ```bash
  cd app && alembic revision -m "add_form_templates_migrate_data"
  ```

  Note the generated filename (e.g., `app/alembic/versions/abc123_add_form_templates_migrate_data.py`).

- [ ] **Step 2: Write the migration**

  Open the generated file and replace its `upgrade()` and `downgrade()` functions:

  ```python
  import sqlalchemy as sa
  from sqlalchemy.dialects import postgresql
  from alembic import op


  def upgrade() -> None:
      # 1. Create form_templates table
      op.create_table(
          "form_templates",
          sa.Column("id", sa.Integer(), nullable=False),
          sa.Column("organization_id", sa.Integer(), nullable=False),
          sa.Column("entity_type", sa.String(), nullable=False),
          sa.Column("fields", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
          sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
          sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
          sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
          sa.PrimaryKeyConstraint("id"),
          sa.UniqueConstraint("organization_id", "entity_type", name="uq_form_template_org_entity"),
      )
      op.create_index("ix_form_templates_id", "form_templates", ["id"])

      # 2. Migrate data from visit_form_templates into form_templates
      # Each row in visit_form_templates becomes entity_type='visit' in form_templates.
      # We also pull FieldMapping data for each org and embed bitrix_field_id into the fields JSONB.
      op.execute("""
          INSERT INTO form_templates (organization_id, entity_type, fields, created_at)
          SELECT
              vft.organization_id,
              'visit',
              (
                  SELECT jsonb_agg(
                      CASE
                          WHEN fm.bitrix_field_id IS NOT NULL THEN
                              field_def || jsonb_build_object(
                                  'bitrix_field_id', fm.bitrix_field_id,
                                  'bitrix_field_type', fm.field_type,
                                  'bitrix_value_mapping', COALESCE(fm.value_options, '[]'::jsonb)
                              )
                          ELSE field_def
                      END
                  )
                  FROM jsonb_array_elements(vft.fields) AS field_def
                  LEFT JOIN field_mappings fm
                      ON fm.organization_id = vft.organization_id
                      AND fm.entity_type = 'visit'
                      AND fm.app_field_name = field_def->>'key'
              ),
              vft.created_at
          FROM visit_form_templates vft
          ON CONFLICT DO NOTHING
      """)


  def downgrade() -> None:
      op.drop_index("ix_form_templates_id", table_name="form_templates")
      op.drop_table("form_templates")
  ```

- [ ] **Step 3: Run migration**

  ```bash
  cd app && alembic upgrade head
  ```

  Expected output ends with: `Running upgrade ... -> ..., add_form_templates_migrate_data`

- [ ] **Step 4: Verify data migrated**

  ```bash
  # Connect to DB and check
  docker-compose exec db psql -U opora_user -d opora_dev -c "SELECT organization_id, entity_type, jsonb_array_length(fields) FROM form_templates;"
  ```

  Expected: rows showing organization_id, 'visit', and field counts matching visit_form_templates.

- [ ] **Step 5: Commit**

  ```bash
  git add app/alembic/versions/
  git commit -m "feat: migrate visit_form_templates + FieldMapping to form_templates"
  ```

---

## Task 3: Create form_template_routers.py

**Files:**
- Create: `app/routers/form_template_routers.py`

- [ ] **Step 1: Create the router file**

  ```python
  # app/routers/form_template_routers.py
  from typing import Any, Dict, List, Optional

  from fastapi import APIRouter, Depends, HTTPException
  from pydantic import BaseModel
  from sqlalchemy import select
  from sqlalchemy.orm.attributes import flag_modified

  from app.dependencies import get_current_admin_user, get_current_user, get_uow
  from app.models import FormTemplate
  from app.uow import UnitOfWork

  router = APIRouter(prefix="/form-templates", tags=["form-templates"])


  ENTITY_TYPES = {"visit", "clinic", "doctor", "contact", "network_clinic"}

  DEFAULT_FIELDS: Dict[str, List[dict]] = {
      "visit": [
          {"key": "visit_type", "label": "Тип визита", "type": "select", "required": True,
           "options": ["Первичный", "Повторный", "Сервисный"]},
          {"key": "comment", "label": "Комментарий", "type": "textarea", "required": False},
          {"key": "with_distributor", "label": "С дистрибьютором", "type": "checkbox", "required": False},
      ],
      "clinic": [],
      "doctor": [],
      "contact": [],
      "network_clinic": [],
  }


  class BitrixValueMapping(BaseModel):
      app_value: str
      bitrix_value: str


  class FieldDefinition(BaseModel):
      key: str
      label: str
      type: str
      required: bool = False
      options: Optional[List[str]] = None
      bitrix_field_id: Optional[str] = None
      bitrix_field_type: Optional[str] = None
      bitrix_value_mapping: Optional[List[Dict[str, Any]]] = None


  class FormTemplateResponse(BaseModel):
      id: Optional[int] = None
      organization_id: Optional[int] = None
      entity_type: str
      fields: List[FieldDefinition]

      class Config:
          from_attributes = True


  class FormTemplateUpdate(BaseModel):
      fields: List[FieldDefinition]


  @router.get("/{entity_type}", response_model=FormTemplateResponse)
  async def get_form_template(
      entity_type: str,
      uow: UnitOfWork = Depends(get_uow),
      current_user=Depends(get_current_user),
  ):
      if entity_type not in ENTITY_TYPES:
          raise HTTPException(status_code=400, detail=f"Unknown entity_type: {entity_type}")

      template = (
          await uow.session.execute(
              select(FormTemplate).where(
                  FormTemplate.organization_id == current_user.organization_id,
                  FormTemplate.entity_type == entity_type,
              )
          )
      ).scalars().first()

      if not template:
          return FormTemplateResponse(
              entity_type=entity_type,
              fields=[FieldDefinition(**f) for f in DEFAULT_FIELDS.get(entity_type, [])],
          )

      return template


  @router.put("/{entity_type}", response_model=FormTemplateResponse)
  async def update_form_template(
      entity_type: str,
      payload: FormTemplateUpdate,
      uow: UnitOfWork = Depends(get_uow),
      current_user=Depends(get_current_admin_user),
  ):
      if entity_type not in ENTITY_TYPES:
          raise HTTPException(status_code=400, detail=f"Unknown entity_type: {entity_type}")

      template = (
          await uow.session.execute(
              select(FormTemplate).where(
                  FormTemplate.organization_id == current_user.organization_id,
                  FormTemplate.entity_type == entity_type,
              )
          )
      ).scalars().first()

      fields_data = [f.dict(exclude_none=False) for f in payload.fields]

      if template is None:
          template = FormTemplate(
              organization_id=current_user.organization_id,
              entity_type=entity_type,
              fields=fields_data,
          )
          uow.session.add(template)
      else:
          template.fields = fields_data
          flag_modified(template, "fields")

      await uow.session.commit()
      await uow.session.refresh(template)
      return template
  ```

- [ ] **Step 2: Register router in main.py**

  Open `app/main.py` and find where other routers are included (look for `app.include_router`). Add:

  ```python
  from app.routers.form_template_routers import router as form_template_router

  app.include_router(form_template_router, prefix="/api")
  ```

- [ ] **Step 3: Start backend and test**

  ```bash
  docker-compose up --build -d backend
  # Test GET
  curl -H "Authorization: Bearer <token>" http://localhost:4201/api/form-templates/visit
  # Expected: JSON with fields array
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add app/routers/form_template_routers.py app/main.py
  git commit -m "feat: add form_template_routers with GET/PUT /api/form-templates/{entity_type}"
  ```

---

## Task 4: Add unified Bitrix fields endpoint to admin_routers.py

**Files:**
- Modify: `app/routers/admin_routers.py`

- [ ] **Step 1: Read the current Bitrix field endpoints**

  In `app/routers/admin_routers.py`, there are separate endpoints:
  - `GET /bitrix/fields/visit` (calls `uow.admin.get_smart_process_fields(1054)`)
  - `GET /bitrix/fields/company` (calls `uow.admin.get_company_fields()`)
  - `GET /bitrix/fields/doctor` (calls `uow.admin.get_contact_fields()`)

  Add a new unified endpoint **after** the existing ones:

  ```python
  @router.get("/bitrix/fields/{entity_type}")
  async def get_entity_bitrix_fields(
      entity_type: str,
      uow: UnitOfWork = Depends(get_uow),
      current_user: User = Depends(get_current_admin_user),
  ):
      """Unified endpoint to get Bitrix24 fields for any entity type."""
      if entity_type == "visit":
          return await uow.admin.get_smart_process_fields(Settings.BITRIX24_SMART_PROCESS_VISIT_ID)
      elif entity_type in ("clinic", "company"):
          return await uow.admin.get_company_fields()
      elif entity_type in ("doctor", "contact", "network_clinic"):
          return await uow.admin.get_contact_fields()
      else:
          raise HTTPException(status_code=400, detail=f"Unknown entity_type: {entity_type}")
  ```

  **Important:** Place this route BEFORE the existing specific routes (e.g., `/bitrix/fields/visit`) or FastAPI will never reach it due to route ordering. Actually, FastAPI matches in order, so place the specific routes FIRST and the `{entity_type}` catch-all AFTER. Or rename existing routes to avoid conflict.

  Actually the safest approach: add the unified endpoint under a different prefix. Use `/bitrix-fields/{entity_type}` to avoid conflict with existing routes:

  ```python
  @router.get("/bitrix-fields/{entity_type}")
  async def get_entity_bitrix_fields(
      entity_type: str,
      uow: UnitOfWork = Depends(get_uow),
      current_user: User = Depends(get_current_admin_user),
  ):
      """Unified endpoint to get Bitrix24 fields for any entity type (used by FormBuilder)."""
      if entity_type == "visit":
          return await uow.admin.get_smart_process_fields(Settings.BITRIX24_SMART_PROCESS_VISIT_ID)
      elif entity_type in ("clinic", "company"):
          return await uow.admin.get_company_fields()
      elif entity_type in ("doctor", "contact", "network_clinic"):
          return await uow.admin.get_contact_fields()
      raise HTTPException(status_code=400, detail=f"Unknown entity_type: {entity_type}")
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routers/admin_routers.py
  git commit -m "feat: add unified GET /admin/bitrix-fields/{entity_type} endpoint"
  ```

---

## Task 5: Update visit_service.py to read from FormTemplate

**Files:**
- Modify: `app/services/visit_service.py`

- [ ] **Step 1: Add FormTemplate import**

  At the top of `app/services/visit_service.py`, find the models import line and add `FormTemplate`:

  ```python
  from app.models import (
      ...,
      FormTemplate,  # add this
  )
  ```

- [ ] **Step 2: Update _sync_with_bitrix24 (lines 574-595)**

  Replace the FieldMapping query block in `_sync_with_bitrix24`:

  ```python
  # OLD (remove this):
  field_mappings = (
      await self.session.execute(
          select(FieldMapping).where(
              FieldMapping.entity_type == EntityType.VISIT.value,
              FieldMapping.organization_id == current_user.organization_id,
          )
      )
  ).scalars().all()
  field_mapping_dict = {m.app_field_name: m.bitrix_field_id for m in field_mappings}
  list_field_mappings = {
      m.app_field_name: json.loads(m.value_options)
      for m in field_mappings
      if m.field_type == "list" and m.value_options
  }
  ```

  ```python
  # NEW (replace with this):
  form_template = (
      await self.session.execute(
          select(FormTemplate).where(
              FormTemplate.entity_type == "visit",
              FormTemplate.organization_id == current_user.organization_id,
          )
      )
  ).scalars().first()

  template_fields = form_template.fields if form_template else []
  field_mapping_dict = {
      f["key"]: f["bitrix_field_id"]
      for f in template_fields
      if f.get("bitrix_field_id")
  }
  list_field_mappings = {
      f["key"]: f["bitrix_value_mapping"]
      for f in template_fields
      if f.get("bitrix_field_type") == "list" and f.get("bitrix_value_mapping")
  }
  ```

  The rest of the method (building `bitrix_data`, processing `dynamic_fields`) stays the same — it already uses `field_mapping_dict` and `list_field_mappings`.

- [ ] **Step 3: Update _sync_with_bitrix24_update (lines 835-856)**

  Same replacement pattern for the FieldMapping query block in `_sync_with_bitrix24_update`:

  ```python
  # NEW:
  form_template = (
      await self.session.execute(
          select(FormTemplate).where(
              FormTemplate.entity_type == "visit",
              FormTemplate.organization_id == current_user.organization_id,
          )
      )
  ).scalars().first()

  template_fields = form_template.fields if form_template else []
  field_mapping_dict = {
      f["key"]: f["bitrix_field_id"]
      for f in template_fields
      if f.get("bitrix_field_id")
  }
  list_field_mappings = {
      f["key"]: f["bitrix_value_mapping"]
      for f in template_fields
      if f.get("bitrix_field_type") == "list" and f.get("bitrix_value_mapping")
  }
  ```

- [ ] **Step 4: Restart backend and test visit creation**

  ```bash
  docker-compose restart backend
  docker-compose logs -f backend
  # Create a test visit via frontend and check Bitrix24 sync works
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add app/services/visit_service.py
  git commit -m "feat: visit_service reads Bitrix24 mapping from FormTemplate instead of FieldMapping"
  ```

---

## Task 6: Install @dnd-kit and create types.ts

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/components/FormBuilder/types.ts`

- [ ] **Step 1: Install dnd-kit**

  ```bash
  cd frontend
  npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
  ```

  Expected: packages added to `node_modules` and `package.json` updated.

- [ ] **Step 2: Create types.ts**

  ```typescript
  // frontend/src/components/FormBuilder/types.ts

  export type EntityType = 'visit' | 'clinic' | 'doctor' | 'contact' | 'network_clinic';

  export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
    visit: 'Визиты',
    clinic: 'Компании',
    doctor: 'Врачи',
    contact: 'Контакты',
    network_clinic: 'Сетевые клиники',
  };

  export const FIELD_TYPES = [
    { value: 'text', label: 'Текст' },
    { value: 'textarea', label: 'Многострочный текст' },
    { value: 'select', label: 'Выпадающий список' },
    { value: 'checkbox', label: 'Чекбокс' },
    { value: 'date', label: 'Дата' },
    { value: 'number', label: 'Число' },
  ] as const;

  export type FieldType = typeof FIELD_TYPES[number]['value'];

  export interface BitrixValueMapping {
    app_value: string;
    bitrix_value: string;
  }

  export interface FieldDefinition {
    key: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: string[];
    bitrix_field_id?: string | null;
    bitrix_field_type?: string | null;
    bitrix_value_mapping?: BitrixValueMapping[];
  }

  export interface FormTemplate {
    id?: number;
    organization_id?: number;
    entity_type: EntityType;
    fields: FieldDefinition[];
  }

  export interface BitrixField {
    field_id: string;
    title: string;
    type: string;           // "list", "string", "datetime", "double", "boolean"
    is_required: boolean;
    items?: Array<{ id: string; value: string }>;
  }

  /** Generate a Latin key from a Cyrillic label (same logic as VisitFormEditorPage) */
  export function generateKey(label: string): string {
    const cyrToLat: Record<string, string> = {
      а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'zh', з:'z',
      и:'i', й:'j', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r',
      с:'s', т:'t', у:'u', ф:'f', х:'h', ц:'ts', ч:'ch', ш:'sh', щ:'sch',
      ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya',
    };
    const result = label
      .toLowerCase()
      .split('')
      .map(c => cyrToLat[c] ?? (c.match(/[a-z0-9]/) ? c : '_'))
      .join('')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    return result || `field_${Date.now()}`;
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  cd frontend
  git add package.json package-lock.json src/components/FormBuilder/types.ts
  git commit -m "feat: add @dnd-kit deps and FormBuilder types"
  ```

---

## Task 7: Create FieldCard.tsx

**Files:**
- Create: `frontend/src/components/FormBuilder/FieldCard.tsx`

- [ ] **Step 1: Create FieldCard.tsx**

  ```tsx
  // frontend/src/components/FormBuilder/FieldCard.tsx
  import { useSortable } from '@dnd-kit/sortable';
  import { CSS } from '@dnd-kit/utilities';
  import DeleteIcon from '@mui/icons-material/Delete';
  import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
  import { Box, Chip, IconButton, Paper, Typography } from '@mui/material';
  import React from 'react';
  import { FIELD_TYPES, FieldDefinition } from './types';

  interface Props {
    field: FieldDefinition;
    index: number;
    selected: boolean;
    onSelect: () => void;
    onDelete: () => void;
  }

  const FieldCard: React.FC<Props> = ({ field, index, selected, onSelect, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useSortable({ id: field.key });

    const typeLabel = FIELD_TYPES.find(t => t.value === field.type)?.label ?? field.type;

    return (
      <Paper
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        elevation={isDragging ? 6 : selected ? 3 : 1}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1.5,
          mb: 1,
          cursor: 'pointer',
          border: selected ? '1px solid' : '1px solid transparent',
          borderColor: selected ? 'primary.main' : 'transparent',
          opacity: isDragging ? 0.5 : 1,
          transition: 'border-color 0.15s',
          '&:hover': { borderColor: 'primary.light' },
        }}
        onClick={onSelect}
      >
        {/* Drag handle */}
        <Box
          {...attributes}
          {...listeners}
          sx={{ cursor: 'grab', color: 'text.disabled', mr: 1, display: 'flex' }}
          onClick={e => e.stopPropagation()}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>

        {/* Label */}
        <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
          {field.label || <em style={{ opacity: 0.5 }}>Без названия</em>}
        </Typography>

        {/* Badges */}
        <Box sx={{ display: 'flex', gap: 0.5, mr: 1, flexWrap: 'nowrap' }}>
          <Chip label={typeLabel} size="small" color="primary" variant="outlined" />
          {field.required && <Chip label="Обязательное" size="small" color="error" variant="outlined" />}
          <Chip
            label="B24"
            size="small"
            color={field.bitrix_field_id ? 'success' : 'default'}
            variant="outlined"
            title={field.bitrix_field_id ? `Привязано: ${field.bitrix_field_id}` : 'Не привязано к Bitrix24'}
          />
        </Box>

        {/* Delete */}
        <IconButton
          size="small"
          color="error"
          onClick={e => { e.stopPropagation(); onDelete(); }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Paper>
    );
  };

  export default FieldCard;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add frontend/src/components/FormBuilder/FieldCard.tsx
  git commit -m "feat: add FieldCard with drag handle and Bitrix24 status badge"
  ```

---

## Task 8: Create FieldList.tsx

**Files:**
- Create: `frontend/src/components/FormBuilder/FieldList.tsx`

- [ ] **Step 1: Create FieldList.tsx**

  ```tsx
  // frontend/src/components/FormBuilder/FieldList.tsx
  import {
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
  } from '@dnd-kit/core';
  import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
  } from '@dnd-kit/sortable';
  import AddIcon from '@mui/icons-material/Add';
  import { Box, Button, Typography } from '@mui/material';
  import React from 'react';
  import FieldCard from './FieldCard';
  import { FieldDefinition } from './types';

  interface Props {
    fields: FieldDefinition[];
    selectedIndex: number | null;
    onSelect: (index: number) => void;
    onDelete: (index: number) => void;
    onReorder: (fields: FieldDefinition[]) => void;
    onAdd: () => void;
  }

  const FieldList: React.FC<Props> = ({
    fields, selectedIndex, onSelect, onDelete, onReorder, onAdd,
  }) => {
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = fields.findIndex(f => f.key === active.id);
        const newIndex = fields.findIndex(f => f.key === over.id);
        onReorder(arrayMove(fields, oldIndex, newIndex));
      }
    };

    return (
      <Box>
        {fields.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Полей нет. Нажмите «+ Добавить поле» чтобы начать.
          </Typography>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map(f => f.key)} strategy={verticalListSortingStrategy}>
            {fields.map((field, index) => (
              <FieldCard
                key={field.key}
                field={field}
                index={index}
                selected={selectedIndex === index}
                onSelect={() => onSelect(index)}
                onDelete={() => onDelete(index)}
              />
            ))}
          </SortableContext>
        </DndContext>

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          fullWidth
          onClick={onAdd}
          sx={{
            mt: 1,
            borderStyle: 'dashed',
            color: 'text.secondary',
            borderColor: 'divider',
            '&:hover': { borderStyle: 'dashed', borderColor: 'primary.main', color: 'primary.main' },
          }}
        >
          Добавить поле
        </Button>
      </Box>
    );
  };

  export default FieldList;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add frontend/src/components/FormBuilder/FieldList.tsx
  git commit -m "feat: add FieldList with real drag-and-drop via @dnd-kit"
  ```

---

## Task 9: Create FieldOptionsEditor.tsx

**Files:**
- Create: `frontend/src/components/FormBuilder/FieldOptionsEditor.tsx`

- [ ] **Step 1: Create FieldOptionsEditor.tsx**

  ```tsx
  // frontend/src/components/FormBuilder/FieldOptionsEditor.tsx
  import AddIcon from '@mui/icons-material/Add';
  import DeleteIcon from '@mui/icons-material/Delete';
  import {
    Box, Chip, Divider, IconButton, MenuItem, Select,
    Stack, TextField, Typography,
  } from '@mui/material';
  import React, { useState } from 'react';
  import { BitrixField, BitrixValueMapping } from './types';

  interface Props {
    options: string[];
    bitrixField: BitrixField | null;
    bitrixValueMapping: BitrixValueMapping[];
    onChange: (options: string[], mapping: BitrixValueMapping[]) => void;
  }

  const FieldOptionsEditor: React.FC<Props> = ({
    options, bitrixField, bitrixValueMapping, onChange,
  }) => {
    const [newOption, setNewOption] = useState('');

    const addOption = () => {
      const trimmed = newOption.trim();
      if (!trimmed || options.includes(trimmed)) return;
      const updatedOptions = [...options, trimmed];
      const updatedMapping = [...bitrixValueMapping, { app_value: trimmed, bitrix_value: '' }];
      onChange(updatedOptions, updatedMapping);
      setNewOption('');
    };

    const removeOption = (opt: string) => {
      onChange(
        options.filter(o => o !== opt),
        bitrixValueMapping.filter(m => m.app_value !== opt),
      );
    };

    const updateBitrixValue = (appValue: string, bitrixValue: string) => {
      onChange(
        options,
        bitrixValueMapping.map(m => m.app_value === appValue ? { ...m, bitrix_value: bitrixValue } : m),
      );
    };

    const showMapping = bitrixField?.type === 'list' && (bitrixField.items?.length ?? 0) > 0;

    return (
      <Box>
        <Typography variant="caption" color="text.secondary" mb={1} display="block">
          Варианты для выбора
        </Typography>

        {/* Existing options */}
        <Stack spacing={1} mb={1}>
          {options.map(opt => (
            <Box key={opt} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={opt} sx={{ flex: showMapping ? 0 : 1 }} />
              {showMapping && (
                <Select
                  size="small"
                  value={bitrixValueMapping.find(m => m.app_value === opt)?.bitrix_value ?? ''}
                  onChange={e => updateBitrixValue(opt, e.target.value)}
                  displayEmpty
                  sx={{ flex: 1 }}
                >
                  <MenuItem value=""><em>Не выбрано</em></MenuItem>
                  {bitrixField!.items!.map(item => (
                    <MenuItem key={item.id} value={item.id}>{item.value}</MenuItem>
                  ))}
                </Select>
              )}
              <IconButton size="small" color="error" onClick={() => removeOption(opt)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>

        {showMapping && (
          <Typography variant="caption" color="text.secondary">
            Слева — значение в приложении, справа — значение в Bitrix24
          </Typography>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Add new option */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Новый вариант"
            value={newOption}
            onChange={e => setNewOption(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
            sx={{ flex: 1 }}
          />
          <IconButton color="primary" onClick={addOption} disabled={!newOption.trim()}>
            <AddIcon />
          </IconButton>
        </Box>
      </Box>
    );
  };

  export default FieldOptionsEditor;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add frontend/src/components/FormBuilder/FieldOptionsEditor.tsx
  git commit -m "feat: add FieldOptionsEditor with Bitrix24 value mapping support"
  ```

---

## Task 10: Create BitrixFieldSelector.tsx

**Files:**
- Create: `frontend/src/components/FormBuilder/BitrixFieldSelector.tsx`

- [ ] **Step 1: Create BitrixFieldSelector.tsx**

  ```tsx
  // frontend/src/components/FormBuilder/BitrixFieldSelector.tsx
  import { Autocomplete, CircularProgress, TextField, Typography } from '@mui/material';
  import React from 'react';
  import { useQuery } from '@tanstack/react-query';
  import api from '../../services/api';
  import { BitrixField, EntityType } from './types';

  const BITRIX_TYPE_GROUP: Record<string, string> = {
    list: 'Списки',
    string: 'Текстовые',
    datetime: 'Даты',
    date: 'Даты',
    double: 'Числа',
    integer: 'Числа',
    boolean: 'Чекбоксы',
  };

  interface Props {
    entityType: EntityType;
    value: string | null;
    onChange: (field: BitrixField | null) => void;
    disabled?: boolean;
  }

  const BitrixFieldSelector: React.FC<Props> = ({ entityType, value, onChange, disabled }) => {
    const { data: bitrixFields = [], isLoading } = useQuery<BitrixField[]>(
      ['bitrixFields', entityType],
      async () => {
        const res = await api.get(`/admin/bitrix-fields/${entityType}`);
        return res.data ?? [];
      },
      { staleTime: 5 * 60 * 1000 }  // cache 5 min
    );

    const selectedField = bitrixFields.find(f => f.field_id === value) ?? null;

    return (
      <Autocomplete
        disabled={disabled}
        loading={isLoading}
        options={bitrixFields}
        groupBy={f => BITRIX_TYPE_GROUP[f.type] ?? 'Прочее'}
        getOptionLabel={f => `${f.title} (${f.field_id})`}
        value={selectedField}
        onChange={(_, newVal) => onChange(newVal)}
        isOptionEqualToValue={(opt, val) => opt.field_id === val.field_id}
        renderInput={params => (
          <TextField
            {...params}
            label="Поле Bitrix24"
            size="small"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoading && <CircularProgress size={16} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.field_id}>
            <Typography variant="body2">{option.title}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {option.field_id}
            </Typography>
          </li>
        )}
        noOptionsText={isLoading ? 'Загрузка...' : 'Поля не найдены'}
      />
    );
  };

  export default BitrixFieldSelector;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add frontend/src/components/FormBuilder/BitrixFieldSelector.tsx
  git commit -m "feat: add BitrixFieldSelector autocomplete for Bitrix24 field linking"
  ```

---

## Task 11: Create FieldSettingsDrawer.tsx

**Files:**
- Create: `frontend/src/components/FormBuilder/FieldSettingsDrawer.tsx`

- [ ] **Step 1: Create FieldSettingsDrawer.tsx**

  ```tsx
  // frontend/src/components/FormBuilder/FieldSettingsDrawer.tsx
  import {
    Box, Divider, Drawer, FormControlLabel, MenuItem,
    Select, FormControl, InputLabel, Switch, Tab, Tabs, TextField, Typography,
  } from '@mui/material';
  import React, { useEffect, useState } from 'react';
  import BitrixFieldSelector from './BitrixFieldSelector';
  import FieldOptionsEditor from './FieldOptionsEditor';
  import { BitrixField, EntityType, FIELD_TYPES, FieldDefinition, generateKey } from './types';

  const DRAWER_WIDTH = 420;

  interface Props {
    open: boolean;
    field: FieldDefinition | null;
    entityType: EntityType;
    hasBitrix: boolean;
    onClose: () => void;
    onChange: (patch: Partial<FieldDefinition>) => void;
  }

  const FieldSettingsDrawer: React.FC<Props> = ({
    open, field, entityType, hasBitrix, onClose, onChange,
  }) => {
    const [tab, setTab] = useState(0);
    const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);

    // Reset tab when field changes
    useEffect(() => {
      setTab(0);
      setKeyManuallyEdited(false);
    }, [field?.key]);

    if (!field) return null;

    const handleLabelChange = (label: string) => {
      if (!keyManuallyEdited) {
        onChange({ label, key: generateKey(label) });
      } else {
        onChange({ label });
      }
    };

    const handleKeyChange = (key: string) => {
      setKeyManuallyEdited(true);
      onChange({ key });
    };

    const handleBitrixFieldChange = (bitrixField: BitrixField | null) => {
      onChange({
        bitrix_field_id: bitrixField?.field_id ?? null,
        bitrix_field_type: bitrixField?.type ?? null,
      });
    };

    const selectedBitrixField: BitrixField | null = field.bitrix_field_id
      ? { field_id: field.bitrix_field_id, title: '', type: field.bitrix_field_type ?? '', is_required: false }
      : null;

    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        variant="persistent"
        sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, p: 0 } }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Настройки поля
          </Typography>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Основные" />
          {hasBitrix && <Tab label="Bitrix24" />}
        </Tabs>

        <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
          {tab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Название поля"
                size="small"
                fullWidth
                value={field.label}
                onChange={e => handleLabelChange(e.target.value)}
              />

              <TextField
                label="Ключ (key)"
                size="small"
                fullWidth
                value={field.key}
                onChange={e => handleKeyChange(e.target.value)}
                helperText="Латинские буквы и подчёркивание. Используется как идентификатор."
              />

              <FormControl size="small" fullWidth>
                <InputLabel>Тип поля</InputLabel>
                <Select
                  label="Тип поля"
                  value={field.type}
                  onChange={e => onChange({ type: e.target.value as FieldDefinition['type'] })}
                >
                  {FIELD_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={field.required}
                    onChange={e => onChange({ required: e.target.checked })}
                  />
                }
                label="Обязательное поле"
              />

              {field.type === 'select' && (
                <>
                  <Divider />
                  <FieldOptionsEditor
                    options={field.options ?? []}
                    bitrixField={
                      field.bitrix_field_type === 'list' && field.bitrix_field_id
                        ? { field_id: field.bitrix_field_id, title: '', type: 'list', is_required: false }
                        : null
                    }
                    bitrixValueMapping={field.bitrix_value_mapping ?? []}
                    onChange={(options, mapping) => onChange({ options, bitrix_value_mapping: mapping })}
                  />
                </>
              )}
            </Box>
          )}

          {tab === 1 && hasBitrix && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Выберите соответствующее поле в Bitrix24. При синхронизации значение будет отправлено в это поле.
              </Typography>

              <BitrixFieldSelector
                entityType={entityType}
                value={field.bitrix_field_id ?? null}
                onChange={handleBitrixFieldChange}
              />

              {field.bitrix_field_id && (
                <TextField
                  label="Тип поля Bitrix24"
                  size="small"
                  value={field.bitrix_field_type ?? ''}
                  InputProps={{ readOnly: true }}
                  helperText="Определяется автоматически при выборе поля"
                />
              )}

              {field.type === 'select' && field.bitrix_field_type === 'list' && (
                <Typography variant="caption" color="text.secondary">
                  Перейдите на вкладку «Основные» чтобы настроить маппинг значений.
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Drawer>
    );
  };

  export default FieldSettingsDrawer;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add frontend/src/components/FormBuilder/FieldSettingsDrawer.tsx
  git commit -m "feat: add FieldSettingsDrawer with basic settings and Bitrix24 tab"
  ```

---

## Task 12: Create FieldPreviewDialog.tsx

**Files:**
- Create: `frontend/src/components/FormBuilder/FieldPreviewDialog.tsx`

- [ ] **Step 1: Create FieldPreviewDialog.tsx**

  ```tsx
  // frontend/src/components/FormBuilder/FieldPreviewDialog.tsx
  import {
    Box, Dialog, DialogContent, DialogTitle,
    FormControl, FormControlLabel, InputLabel,
    MenuItem, Select, Switch, TextField, Typography,
  } from '@mui/material';
  import React from 'react';
  import { EntityType, ENTITY_TYPE_LABELS, FieldDefinition } from './types';

  const STANDARD_FIELDS: Record<EntityType, Array<{ label: string; type: string }>> = {
    visit: [
      { label: 'Компания', type: 'text' },
      { label: 'Дата визита', type: 'date' },
    ],
    clinic: [
      { label: 'Название компании', type: 'text' },
      { label: 'ИНН', type: 'text' },
    ],
    doctor: [{ label: 'ФИО', type: 'text' }],
    contact: [
      { label: 'ФИО', type: 'text' },
      { label: 'Тип контакта', type: 'text' },
    ],
    network_clinic: [{ label: 'Название клиники', type: 'text' }],
  };

  function renderField(field: { label: string; type: string; options?: string[] }, disabled = true) {
    switch (field.type) {
      case 'textarea':
        return <TextField label={field.label} multiline rows={3} fullWidth disabled={disabled} size="small" />;
      case 'select':
        return (
          <FormControl fullWidth size="small" disabled={disabled}>
            <InputLabel>{field.label}</InputLabel>
            <Select label={field.label} value="">
              {(field.options ?? []).map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
        );
      case 'checkbox':
        return <FormControlLabel control={<Switch disabled={disabled} />} label={field.label} />;
      case 'date':
        return <TextField label={field.label} type="date" fullWidth disabled={disabled} size="small" InputLabelProps={{ shrink: true }} />;
      case 'number':
        return <TextField label={field.label} type="number" fullWidth disabled={disabled} size="small" />;
      default:
        return <TextField label={field.label} fullWidth disabled={disabled} size="small" />;
    }
  }

  interface Props {
    open: boolean;
    onClose: () => void;
    entityType: EntityType;
    fields: FieldDefinition[];
  }

  const FieldPreviewDialog: React.FC<Props> = ({ open, onClose, entityType, fields }) => (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Предпросмотр формы: {ENTITY_TYPE_LABELS[entityType]}</DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          Стандартные поля (всегда присутствуют)
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          {STANDARD_FIELDS[entityType].map(f => (
            <Box key={f.label}>{renderField(f)}</Box>
          ))}
        </Box>

        {fields.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Настраиваемые поля
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {fields.map(f => (
                <Box key={f.key}>{renderField(f)}</Box>
              ))}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  export default FieldPreviewDialog;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add frontend/src/components/FormBuilder/FieldPreviewDialog.tsx
  git commit -m "feat: add FieldPreviewDialog for all entity types"
  ```

---

## Task 13: Create FormBuilder.tsx

**Files:**
- Create: `frontend/src/components/FormBuilder/FormBuilder.tsx`

- [ ] **Step 1: Create FormBuilder.tsx**

  ```tsx
  // frontend/src/components/FormBuilder/FormBuilder.tsx
  import SaveIcon from '@mui/icons-material/Save';
  import VisibilityIcon from '@mui/icons-material/Visibility';
  import { Alert, Box, Button, CircularProgress, Snackbar } from '@mui/material';
  import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
  import React, { useCallback, useState } from 'react';
  import api from '../../services/api';
  import { useAuth } from '../../context/AuthContext';
  import FieldList from './FieldList';
  import FieldPreviewDialog from './FieldPreviewDialog';
  import FieldSettingsDrawer from './FieldSettingsDrawer';
  import { EntityType, FieldDefinition, FormTemplate, generateKey } from './types';

  interface Props {
    entityType: EntityType;
  }

  const DRAWER_WIDTH = 420;

  const FormBuilder: React.FC<Props> = ({ entityType }) => {
    const queryClient = useQueryClient();
    const { isOrgAdmin } = useAuth();

    const [fields, setFields] = useState<FieldDefinition[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
      open: false, message: '', severity: 'success',
    });

    // Check if Bitrix24 is configured (org has webhook)
    const { data: settings } = useQuery(['globalSettings'], async () => {
      const res = await api.get('/settings/');
      return res.data as Record<string, string>;
    });
    const hasBitrix = !!(settings?.bitrix24_webhook_url);

    const { isLoading } = useQuery<FormTemplate>(
      ['formTemplate', entityType],
      async () => {
        const res = await api.get(`/form-templates/${entityType}`);
        return res.data;
      },
      {
        onSuccess: data => {
          setFields(data.fields ?? []);
          setHasChanges(false);
        },
      },
    );

    const saveMutation = useMutation(
      async (fieldsData: FieldDefinition[]) => {
        const res = await api.put(`/form-templates/${entityType}`, { fields: fieldsData });
        return res.data;
      },
      {
        onSuccess: () => {
          setHasChanges(false);
          queryClient.invalidateQueries(['formTemplate', entityType]);
          setSnackbar({ open: true, message: 'Шаблон формы сохранён', severity: 'success' });
        },
        onError: () => {
          setSnackbar({ open: true, message: 'Ошибка при сохранении', severity: 'error' });
        },
      },
    );

    const markChanged = useCallback(() => setHasChanges(true), []);

    const addField = () => {
      const newKey = generateKey(`Поле ${fields.length + 1}`);
      const newField: FieldDefinition = {
        key: `${newKey}_${Date.now()}`,
        label: '',
        type: 'text',
        required: false,
      };
      setFields(prev => {
        const updated = [...prev, newField];
        setSelectedIndex(updated.length - 1);
        return updated;
      });
      markChanged();
    };

    const deleteField = (index: number) => {
      setFields(prev => prev.filter((_, i) => i !== index));
      setSelectedIndex(null);
      markChanged();
    };

    const updateField = (index: number, patch: Partial<FieldDefinition>) => {
      setFields(prev => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
      markChanged();
    };

    const reorderFields = (newFields: FieldDefinition[]) => {
      setFields(newFields);
      markChanged();
    };

    const selectedField = selectedIndex !== null ? fields[selectedIndex] : null;

    if (isLoading) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
    }

    return (
      <Box sx={{ display: 'flex', gap: 0 }}>
        {/* Main content */}
        <Box
          sx={{
            flex: 1,
            transition: 'margin-right 0.3s',
            mr: selectedField ? `${DRAWER_WIDTH}px` : 0,
          }}
        >
          {/* Toolbar */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<VisibilityIcon />}
              onClick={() => setPreviewOpen(true)}
            >
              Просмотр
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!hasChanges || saveMutation.isLoading || !isOrgAdmin}
              onClick={() => saveMutation.mutate(fields)}
            >
              {hasChanges ? 'Сохранить *' : 'Сохранено'}
            </Button>
          </Box>

          <FieldList
            fields={fields}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onDelete={deleteField}
            onReorder={reorderFields}
            onAdd={addField}
          />
        </Box>

        {/* Drawer */}
        <FieldSettingsDrawer
          open={!!selectedField}
          field={selectedField}
          entityType={entityType}
          hasBitrix={hasBitrix}
          onClose={() => setSelectedIndex(null)}
          onChange={patch => selectedIndex !== null && updateField(selectedIndex, patch)}
        />

        <FieldPreviewDialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          entityType={entityType}
          fields={fields}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        >
          <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    );
  };

  export default FormBuilder;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add frontend/src/components/FormBuilder/FormBuilder.tsx
  git commit -m "feat: add FormBuilder container with state management"
  ```

---

## Task 14: Create FormBuilderPage.tsx

**Files:**
- Create: `frontend/src/components/FormBuilder/FormBuilderPage.tsx`

- [ ] **Step 1: Create FormBuilderPage.tsx**

  ```tsx
  // frontend/src/components/FormBuilder/FormBuilderPage.tsx
  import { Box, Tab, Tabs, Typography } from '@mui/material';
  import React, { useState } from 'react';
  import FormBuilder from './FormBuilder';
  import { ENTITY_TYPE_LABELS, EntityType } from './types';

  const ENTITY_TABS: EntityType[] = ['visit', 'clinic', 'doctor', 'contact', 'network_clinic'];

  const FormBuilderPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<EntityType>('visit');

    return (
      <Box>
        <Typography variant="h5" fontWeight={600} mb={2}>
          Редактор форм
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val as EntityType)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          {ENTITY_TABS.map(et => (
            <Tab key={et} label={ENTITY_TYPE_LABELS[et]} value={et} />
          ))}
        </Tabs>

        <FormBuilder key={activeTab} entityType={activeTab} />
      </Box>
    );
  };

  export default FormBuilderPage;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add frontend/src/components/FormBuilder/FormBuilderPage.tsx
  git commit -m "feat: add FormBuilderPage with entity type tabs"
  ```

---

## Task 15: Update routing and navigation

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Add route to App.tsx**

  In `frontend/src/App.tsx`, find the line:
  ```tsx
  <Route path="admin/visit-form" element={<AdminRoute><VisitFormEditorPage /></AdminRoute>} />
  ```

  Add after it:
  ```tsx
  <Route path="admin/form-builder" element={<AdminRoute><FormBuilderPage /></AdminRoute>} />
  ```

  And add the import at the top:
  ```tsx
  import FormBuilderPage from './components/FormBuilder/FormBuilderPage';
  ```

- [ ] **Step 2: Update Sidebar.tsx**

  In `frontend/src/components/Sidebar.tsx`, find the adminItems array entry:
  ```tsx
  { label: 'Форма визита', icon: <EditNote />, path: '/admin/visit-form' },
  ```

  Replace with:
  ```tsx
  { label: 'Редактор форм', icon: <EditNote />, path: '/admin/form-builder' },
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/App.tsx frontend/src/components/Sidebar.tsx
  git commit -m "feat: add /admin/form-builder route and update sidebar nav"
  ```

---

## Task 16: Update VisitCreatePage to use new API

**Files:**
- Modify: `frontend/src/pages/VisitCreatePage.tsx`

- [ ] **Step 1: Find the API call in VisitCreatePage.tsx**

  Look for the useQuery that fetches the form template:
  ```tsx
  const { data: formTemplate } = useQuery<VisitFormTemplate>(
    ['visitFormTemplate'],
    async () => {
      const res = await api.get('/visit-form/');
      return res.data;
    }
  );
  ```

  Replace with:
  ```tsx
  const { data: formTemplate } = useQuery(
    ['formTemplate', 'visit'],
    async () => {
      const res = await api.get('/form-templates/visit');
      return res.data;
    }
  );
  ```

  The data shape is identical (fields array with same FieldDefinition structure), so no other changes needed in the component.

- [ ] **Step 2: Commit**

  ```bash
  git add frontend/src/pages/VisitCreatePage.tsx
  git commit -m "feat: update VisitCreatePage to use /form-templates/visit API"
  ```

---

## Task 17: Add backward-compatible alias for old API

**Files:**
- Modify: `app/routers/visit_form_routers.py`

- [ ] **Step 1: Add alias GET endpoint**

  In `app/routers/visit_form_routers.py`, add two alias routes at the bottom that redirect to the new logic:

  ```python
  # Keep old endpoints as aliases for backward compatibility
  from app.routers.form_template_routers import (
      get_form_template as _get_form_template,
      update_form_template as _update_form_template,
      FormTemplateUpdate,
      FormTemplateResponse,
  )

  @router.get("/", response_model=FormTemplateResponse)
  async def get_visit_form_template_alias(
      uow: UnitOfWork = Depends(get_uow),
      current_user=Depends(get_current_user),
  ):
      """Alias for /api/form-templates/visit — kept for backward compatibility."""
      return await _get_form_template("visit", uow, current_user)


  @router.put("/", response_model=FormTemplateResponse)
  async def update_visit_form_template_alias(
      payload: FormTemplateUpdate,
      uow: UnitOfWork = Depends(get_uow),
      current_user=Depends(get_current_admin_user),
  ):
      """Alias for PUT /api/form-templates/visit — kept for backward compatibility."""
      return await _update_form_template("visit", payload, uow, current_user)
  ```

  **Important:** Remove the OLD `get_visit_form_template` and `update_visit_form_template` function bodies from this file — replace them with the aliases above.

- [ ] **Step 2: Restart and test both endpoints**

  ```bash
  docker-compose restart backend
  # Test old endpoint (should still work)
  curl -H "Authorization: Bearer <token>" http://localhost:4201/api/visit-form/
  # Test new endpoint
  curl -H "Authorization: Bearer <token>" http://localhost:4201/api/form-templates/visit
  # Both should return same data
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/routers/visit_form_routers.py
  git commit -m "feat: keep /api/visit-form/ as backward-compatible alias for form-templates/visit"
  ```

---

## Task 18: End-to-end verification

- [ ] **Step 1: Start all services**

  ```bash
  docker-compose up --build
  ```

- [ ] **Step 2: Test Form Builder UI**

  1. Open http://localhost:4200/admin/form-builder
  2. Verify 5 tabs appear: Визиты, Компании, Врачи, Контакты, Сетевые клиники
  3. Switch to Визиты — existing fields should load
  4. Click a field → Drawer opens on the right
  5. Edit field label — changes should reflect in card immediately
  6. Drag a field — order should change
  7. If Bitrix24 configured: click "Bitrix24" tab in Drawer → fields load
  8. Add a select field → go to Основные → add options
  9. Click "Просмотр" → preview modal shows
  10. Save → success snackbar

- [ ] **Step 3: Test visit creation still works**

  1. Open http://localhost:4200/visits/new
  2. Custom fields from the visit form template should appear
  3. Create a visit — verify it saves correctly

- [ ] **Step 4: Test Bitrix24 sync (if configured)**

  1. Link a select field to a Bitrix24 list field
  2. Map the values
  3. Save the form template
  4. Create a visit with that field filled
  5. Check Bitrix24 — the value should appear in the correct field

- [ ] **Step 5: Final commit**

  ```bash
  git add .
  git commit -m "feat: universal form builder complete — all entity types, Bitrix24 mapping, dnd-kit"
  ```

---

## Self-Review Checklist

- [x] **Spec: All entity types** — FormBuilderPage has 5 tabs, FormBuilder accepts entityType prop ✓
- [x] **Spec: Drawer for editing** — FieldSettingsDrawer with 2 tabs ✓
- [x] **Spec: Bitrix24 integration** — BitrixFieldSelector + FieldOptionsEditor with value mapping ✓
- [x] **Spec: drag-and-drop** — FieldList with @dnd-kit ✓
- [x] **Spec: Migrate data** — Alembic migration Task 2 ✓
- [x] **Spec: Update visit_service** — Task 5 ✓
- [x] **Spec: Backward compat** — Task 17 + visit_form_routers aliases ✓
- [x] **Type consistency** — `FieldDefinition` imported from `types.ts` in all components ✓
- [x] **No placeholders** — All steps have concrete code ✓
- [x] **generateKey** — defined in types.ts, imported in FieldSettingsDrawer and FormBuilder ✓
