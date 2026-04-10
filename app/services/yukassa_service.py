"""
YuKassa payment service.
Docs: https://yookassa.ru/developers/api

Uses raw HTTP requests via aiohttp (no yookassa SDK dependency).
Environment variables:
  YUKASSA_SHOP_ID      - shop ID from YuKassa dashboard
  YUKASSA_SECRET_KEY   - secret key from YuKassa dashboard
  YUKASSA_RETURN_URL   - URL to redirect after payment (e.g. https://myopora.ru/admin/billing)
"""

import uuid
import logging
from typing import Optional

import aiohttp

from app.config import Settings

logger = logging.getLogger(__name__)

YUKASSA_API_BASE = "https://api.yookassa.ru/v3"


class YuKassaError(Exception):
    """Raised when YuKassa API returns an error or is not configured."""
    pass


def _get_credentials() -> tuple[str, str]:
    """Return (shop_id, secret_key) or raise if not configured."""
    shop_id = Settings.YUKASSA_SHOP_ID
    secret_key = Settings.YUKASSA_SECRET_KEY
    if not shop_id or not secret_key:
        raise YuKassaError(
            "ЮКасса не настроена. Укажите YUKASSA_SHOP_ID и YUKASSA_SECRET_KEY в переменных окружения."
        )
    return shop_id, secret_key


async def create_payment(
    amount_kopecks: int,
    description: str,
    metadata: Optional[dict] = None,
) -> dict:
    """
    Create a payment via YuKassa API.

    Args:
        amount_kopecks: Payment amount in kopecks (100 kopecks = 1 RUB).
        description: Human-readable description shown to the payer.
        metadata: Arbitrary key-value pairs stored with the payment
                  (e.g. {"organization_id": 1, "local_payment_id": 42}).

    Returns:
        {
            "payment_id": str,        # YuKassa payment UUID
            "confirmation_url": str,   # URL to redirect the user to
            "status": str,             # "pending" / "waiting_for_capture" / etc.
        }

    Raises:
        YuKassaError on configuration or API errors.
    """
    shop_id, secret_key = _get_credentials()

    amount_rub = f"{amount_kopecks / 100:.2f}"
    idempotence_key = str(uuid.uuid4())

    payload = {
        "amount": {
            "value": amount_rub,
            "currency": "RUB",
        },
        "confirmation": {
            "type": "redirect",
            "return_url": Settings.YUKASSA_RETURN_URL,
        },
        "capture": True,
        "description": description,
    }

    if metadata:
        payload["metadata"] = {k: str(v) for k, v in metadata.items()}

    headers = {
        "Idempotence-Key": idempotence_key,
        "Content-Type": "application/json",
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{YUKASSA_API_BASE}/payments",
            json=payload,
            headers=headers,
            auth=aiohttp.BasicAuth(shop_id, secret_key),
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            body = await resp.json()

            if resp.status not in (200, 201):
                error_description = body.get("description", body.get("message", str(body)))
                logger.error(
                    "YuKassa create_payment error: status=%s body=%s",
                    resp.status,
                    body,
                )
                raise YuKassaError(
                    f"Ошибка создания платежа ЮКасса: {error_description}"
                )

    confirmation_url = (
        body.get("confirmation", {}).get("confirmation_url", "")
    )
    payment_id = body.get("id", "")
    status = body.get("status", "")

    logger.info(
        "YuKassa payment created: payment_id=%s status=%s amount=%s",
        payment_id,
        status,
        amount_rub,
    )

    return {
        "payment_id": payment_id,
        "confirmation_url": confirmation_url,
        "status": status,
    }


async def check_payment_status(payment_id: str) -> dict:
    """
    Check payment status via YuKassa API.

    Args:
        payment_id: YuKassa payment UUID.

    Returns:
        {
            "status": str,    # "pending", "waiting_for_capture", "succeeded", "canceled"
            "paid": bool,
            "amount": int,    # amount in kopecks
        }

    Raises:
        YuKassaError on configuration or API errors.
    """
    shop_id, secret_key = _get_credentials()

    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{YUKASSA_API_BASE}/payments/{payment_id}",
            auth=aiohttp.BasicAuth(shop_id, secret_key),
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            body = await resp.json()

            if resp.status != 200:
                error_description = body.get("description", body.get("message", str(body)))
                logger.error(
                    "YuKassa check_payment_status error: status=%s body=%s",
                    resp.status,
                    body,
                )
                raise YuKassaError(
                    f"Ошибка проверки платежа ЮКасса: {error_description}"
                )

    amount_value = body.get("amount", {}).get("value", "0")
    amount_kopecks = int(float(amount_value) * 100)

    return {
        "status": body.get("status", ""),
        "paid": body.get("paid", False),
        "amount": amount_kopecks,
    }
