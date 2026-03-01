"""Normalize salary data to annual USD amounts."""


def normalize_salary_to_annual(
    amount: float,
    period: str = "",
    currency: str = "USD"
) -> float:
    """Convert any salary period to annual USD equivalent.

    Supported periods: hourly, monthly, weekly, daily, annual (default).
    Currency conversion is not implemented yet (assumes USD).
    """
    if amount is None or amount <= 0:
        return 0.0

    period_lower = (period or "").lower().strip()

    if "hour" in period_lower:
        return round(amount * 2080, 2)  # 40hrs/week * 52 weeks
    elif "month" in period_lower:
        return round(amount * 12, 2)
    elif "week" in period_lower:
        return round(amount * 52, 2)
    elif "day" in period_lower:
        return round(amount * 260, 2)  # 5 days/week * 52 weeks
    else:
        # Assume annual
        return round(amount, 2)
