"""Normalize salary data to annual USD amounts with bounds validation."""

import logging
from typing import Optional

logger = logging.getLogger("etl.salary")

# Reasonable bounds for annual salary in USD
SALARY_FLOOR = 15_000.0   # Below federal minimum wage equivalent
SALARY_CEILING = 1_000_000.0  # Above this is almost certainly bad data


def normalize_salary_to_annual(
    amount: float,
    period: str = "",
    currency: str = "USD"
) -> Optional[float]:
    """Convert any salary period to annual USD equivalent.

    Supported periods: hourly, monthly, weekly, daily, annual (default).
    Currency conversion is not implemented yet (assumes USD).

    Returns None if the computed annual amount falls outside reasonable bounds.
    """
    if amount is None or amount <= 0:
        return None

    period_lower = (period or "").lower().strip()

    if "hour" in period_lower:
        annual = round(amount * 2080, 2)  # 40hrs/week * 52 weeks
    elif "month" in period_lower:
        annual = round(amount * 12, 2)
    elif "week" in period_lower:
        annual = round(amount * 52, 2)
    elif "day" in period_lower:
        annual = round(amount * 260, 2)  # 5 days/week * 52 weeks
    else:
        # Assume annual
        annual = round(amount, 2)

    # Bounds validation
    if annual < SALARY_FLOOR:
        logger.warning(
            "salary_below_floor",
            extra={
                "raw_amount": amount,
                "period": period,
                "computed_annual": annual,
                "floor": SALARY_FLOOR,
            },
        )
        return None

    if annual > SALARY_CEILING:
        logger.warning(
            "salary_above_ceiling",
            extra={
                "raw_amount": amount,
                "period": period,
                "computed_annual": annual,
                "ceiling": SALARY_CEILING,
            },
        )
        return None

    return annual
