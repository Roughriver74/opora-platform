from enum import Enum


class VisitStatus(Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


class EntityType(Enum):
    CLINIC = "clinic"
    VISIT = "visit"
    DOCTOR = "doctor"
    NETWORK_CLINIC = "network_clinic"
