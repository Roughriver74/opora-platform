import enum


class UserRole(str, enum.Enum):
    PLATFORM_ADMIN = "platform_admin"
    ORG_ADMIN = "org_admin"
    USER = "user"


class OrgPlan(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    BUSINESS = "business"
