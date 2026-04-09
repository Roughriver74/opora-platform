from enum import Enum


class SyncStatus(Enum):
    PENDING = "pending"
    ERROR = "error"
    SYNCED = "synced"
