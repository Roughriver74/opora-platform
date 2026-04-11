from datetime import datetime

from passlib.context import CryptContext
from sqlalchemy import (
    ARRAY,
    FLOAT,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

from app.emuns.clinic_enum import SyncStatus

Base = declarative_base()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class Organization(Base):
    """Multi-tenancy support: organization model for tenant scoping"""

    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    plan = Column(String, default="free")
    plan_limits = Column(
        JSONB, default={"max_users": 1, "max_visits_per_month": 100}
    )
    bitrix24_webhook_url = Column(String, nullable=True)
    bitrix24_smart_process_visit_id = Column(Integer, nullable=True)
    settings = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    api_key = Column(String, nullable=True, unique=True, index=True)

    billing_email = Column(String, nullable=True)  # email for invoices
    billing_inn = Column(String, nullable=True)  # company INN for invoices

    owner = relationship("User", foreign_keys=[owner_id], post_update=True)
    users = relationship(
        "User", back_populates="organization", foreign_keys="User.organization_id"
    )
    payments = relationship("Payment", back_populates="organization")


class GlobalSettings(Base):
    """Модель для хранения глобальных настроек приложения"""

    __tablename__ = "global_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OrgSettings(Base):
    """Per-organization settings"""

    __tablename__ = "org_settings"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False
    )
    key = Column(String, nullable=False, index=True)
    value = Column(String, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship("Organization")

    __table_args__ = ({"comment": "Per-organization settings"},)


# Таблицы ассоциаций для отношений многие-ко-многим
visit_doctors = Table(
    "visit_doctors",
    Base.metadata,
    Column("visit_id", Integer, ForeignKey("visits.id")),
    Column("doctor_id", Integer, ForeignKey("doctors.id")),
)

company_contacts = Table(
    "company_contacts",
    Base.metadata,
    Column("company_id", Integer, ForeignKey("companies.id")),
    Column("contact_id", Integer, ForeignKey("contacts.id")),
)

visit_contacts = Table(
    "visit_contacts",
    Base.metadata,
    Column("visit_id", Integer, ForeignKey("visits.id")),
    Column("contact_id", Integer, ForeignKey("contacts.id")),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    bitrix_user_id = Column(Integer, unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    regions = Column(ARRAY(String), default=[])
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=True
    )
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship(
        "Organization", back_populates="users", foreign_keys=[organization_id]
    )
    visits = relationship("Visit", back_populates="user")

    def set_password(self, password):
        self.hashed_password = pwd_context.hash(password)

    def verify_password(self, password):
        return pwd_context.verify(password, self.hashed_password)

    @property
    def is_admin(self):
        """Backward compatibility -- returns True for org_admin and platform_admin"""
        return self.role in ("org_admin", "platform_admin")

    @property
    def is_platform_admin(self):
        return self.role == "platform_admin"

    @property
    def is_org_admin(self):
        return self.role in ("org_admin", "platform_admin")


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    bitrix_id = Column(Integer, unique=True, index=True)
    name = Column(String, index=True)  # Партнер из Excel
    company_type = Column(String, default="CUSTOMER")
    uid_1c = Column(String, unique=True, index=True)  # Код из Excel
    inn = Column(String, index=True)  # ИНН из Excel
    kpp = Column(String, index=True)  # КПП из Excel
    region = Column(String, index=True, nullable=False)  # Бизнес регион из Excel
    main_manager = Column(String)  # Основной менеджер из Excel
    last_sale_date = Column(
        DateTime(timezone=True)
    )  # Дата последней реализации из Excel
    document_amount = Column(String)  # Сумма документа из Excel
    dynamic_fields = Column(JSONB, default={})
    last_synced = Column(DateTime(timezone=True))
    sync_status = Column(String, default="pending")
    sync_error = Column(Text, nullable=True)
    is_network = Column(Boolean, default=False)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False
    )

    visits = relationship("Visit", back_populates="company")
    contacts = relationship(
        "Contact", secondary=company_contacts, back_populates="companies"
    )
    addresses = relationship("ClinicAddress", backref="company", lazy="select")
    network_clinics = relationship("NetworkClinic", backref="parent_company", lazy="select")


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    bitrix_id = Column(Integer, unique=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(DateTime(timezone=True))
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False
    )
    dynamic_fields = Column(JSONB, default={})
    status = Column(String, default="planned")
    visit_type = Column(String)
    comment = Column(Text, default="")
    with_distributor = Column(Boolean, default=False)
    sansus = Column(Boolean, default=False)
    last_synced = Column(DateTime(timezone=True))
    sync_status = Column(String, default="pending")
    sync_error = Column(Text, nullable=True)
    geo = Column(Boolean, default=False)

    company = relationship(
        "Company", back_populates="visits", lazy="selectin"
    )  # Используем selectinload
    user = relationship("User", back_populates="visits", lazy="selectin")
    doctors = relationship(
        "Doctor", secondary=visit_doctors, back_populates="visits", lazy="selectin"
    )
    contacts = relationship(
        "Contact", secondary=visit_contacts, back_populates="visits", lazy="selectin"
    )


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    bitrix_id = Column(Integer, unique=True, index=True)
    name = Column(String)
    dynamic_fields = Column(JSONB, default={})
    last_synced = Column(DateTime(timezone=True))
    sync_status = Column(String, default="pending")
    sync_error = Column(Text, nullable=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False
    )

    visits = relationship("Visit", secondary=visit_doctors, back_populates="doctors")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    bitrix_id = Column(Integer, unique=True, index=True)
    name = Column(String, index=True)
    contact_type = Column(String, default="LPR")
    dynamic_fields = Column(JSONB, default={})
    last_synced = Column(DateTime(timezone=True))
    sync_status = Column(String, default="pending")
    sync_error = Column(Text, nullable=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False
    )

    companies = relationship(
        "Company", secondary=company_contacts, back_populates="contacts"
    )
    visits = relationship("Visit", secondary=visit_contacts, back_populates="contacts")


class FieldMapping(Base):
    __tablename__ = "field_mappings"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String, index=True)
    app_field_name = Column(String, index=True)
    bitrix_field_id = Column(String)
    field_type = Column(String)
    is_required = Column(Boolean, default=False)
    display_name = Column(String)
    value_options = Column(JSONB)
    is_multiple = Column(Boolean, default=False)
    entity_type_id = Column(Integer)
    show_in_card = Column(Boolean, default=False)
    sort_order = Column(
        Integer, default=100
    )  # Порядок сортировки полей в форме, по умолчанию 100
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False
    )


class CustomSection(Base):
    __tablename__ = "custom_sections"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(String, index=True)
    name = Column(String)
    order = Column(Integer)
    fields = Column(JSONB, default=list)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False
    )


class NetworkClinic(Base):
    __tablename__ = "network_clinic"

    id = Column(Integer, primary_key=True, index=True)
    bitrix_id = Column(Integer)
    company_id = Column(Integer, ForeignKey("companies.id"))
    name = Column(String)
    doctor_bitrix_id = Column(JSONB, default=list)
    dynamic_fields = Column(JSONB, default={})
    last_synced = Column(DateTime(timezone=True))
    sync_status = Column(String, default=SyncStatus.PENDING.value)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False
    )


class ClinicAddress(Base):
    __tablename__ = "company_address"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    country = Column(String)
    company_id = Column(Integer, ForeignKey("companies.id"))
    city = Column(String)
    street = Column(String)
    number = Column(String)
    postal_code = Column(String)
    latitude = Column(FLOAT)
    longitude = Column(FLOAT)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    is_network = Column(Boolean, default=False)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False
    )


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False
    )
    email = Column(String, nullable=False)
    role = Column(String, default="user")
    token = Column(String, unique=True, index=True, nullable=False)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization")
    inviter = relationship("User", foreign_keys=[invited_by])


class VisitFormTemplate(Base):
    """Per-organization visit form template — defines which fields appear on the visit creation form."""

    __tablename__ = "visit_form_templates"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False, unique=True
    )
    fields = Column(JSONB, default=[])  # Array of field definitions
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship("Organization")


class FormTemplate(Base):
    """Universal per-organization, per-entity-type form template.
    Replaces VisitFormTemplate + FieldMapping. Fields store Bitrix24 mapping inline."""

    __tablename__ = "form_templates"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    entity_type = Column(String, nullable=False)  # visit, clinic, doctor, contact, network_clinic
    fields = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship("Organization")

    __table_args__ = (
        UniqueConstraint("organization_id", "entity_type", name="uq_form_template_org_entity"),
    )


class Payment(Base):
    """Payment records for billing / subscription management"""

    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False
    )
    amount = Column(Integer, nullable=False)  # in kopecks (100 = 1 rub)
    currency = Column(String, default="RUB")
    status = Column(String, default="pending")  # pending, paid, failed, refunded
    payment_method = Column(
        String, nullable=True
    )  # yukassa, invoice, manual
    payment_id = Column(
        String, nullable=True
    )  # external payment ID from YuKassa
    description = Column(String, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    users_count = Column(Integer, nullable=True)  # how many users paid for
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship("Organization", back_populates="payments")
