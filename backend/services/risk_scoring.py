AUTH_WEIGHT = 0.35
API_WEIGHT = 0.25
SYSTEM_WEIGHT = 0.40


def normalize_percentage(anomaly_percentage: float) -> float:
    """
    Converts anomaly percentage into a 0-100 score using a gradual linear scale.

    Example:
    1% anomalies   -> 5
    5% anomalies   -> 25
    10% anomalies  -> 50
    15% anomalies  -> 75
    20% anomalies  -> 100

    Caps at 100.
    """

    return min(max(anomaly_percentage, 0) * 5, 100)


def calculate_base_risk_score(
    auth_percentage: float,
    api_percentage: float,
    system_percentage: float
) -> float:

    auth_score = normalize_percentage(auth_percentage)
    api_score = normalize_percentage(api_percentage)
    system_score = normalize_percentage(system_percentage)

    weighted_score = (
        auth_score * AUTH_WEIGHT +
        api_score * API_WEIGHT +
        system_score * SYSTEM_WEIGHT
    )

    return weighted_score


def calculate_correlation_bonus(
    auth_percentage: float,
    api_percentage: float,
    system_percentage: float
) -> float:

    bonus = 0

    auth_active = auth_percentage >= 5
    api_active = api_percentage >= 5
    system_active = system_percentage >= 5

    if auth_active and api_active:
        bonus += 5

    if auth_active and system_active:
        bonus += 5

    if api_active and system_active:
        bonus += 5

    if auth_active and api_active and system_active:
        bonus += 10

    return bonus


def calculate_risk_score(
    auth_percentage: float,
    api_percentage: float,
    system_percentage: float
) -> float:
    
    print("AUTH %:", auth_percentage)
    print("API %:", api_percentage)
    print("SYSTEM %:", system_percentage)

    base_score = calculate_base_risk_score(
        auth_percentage,
        api_percentage,
        system_percentage
    )

    correlation_bonus = calculate_correlation_bonus(
        auth_percentage,
        api_percentage,
        system_percentage
    )

    final_score = min(
        round(base_score + correlation_bonus, 2),
        100
    )

    return final_score


def generate_risk_level(
    risk_score: float
) -> str:

    if risk_score < 40:
        return "LOW"

    elif risk_score < 75:
        return "MEDIUM"

    elif risk_score < 88:
        return "HIGH"

    else:
        return "CRITICAL"

