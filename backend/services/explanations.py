def generate_explanations(
    auth_percentage: float,
    api_percentage: float,
    system_percentage: float
):

    explanations = []

    if auth_percentage > 0:
        explanations.append(
            f"Authentication anomalies detected ({auth_percentage:.2f}% anomalous activity)."
        )

    if api_percentage > 0:
        explanations.append(
            f"API activity anomalies detected ({api_percentage:.2f}% anomalous requests)."
        )

    if system_percentage > 0:
        explanations.append(
            f"System telemetry anomalies detected ({system_percentage:.2f}% anomalous metrics)."
        )

    if (
        auth_percentage > 0 and
        api_percentage > 0
    ):
        explanations.append(
            "Authentication and API anomalies occurred simultaneously."
        )

    if (
        auth_percentage > 0 and
        system_percentage > 0
    ):
        explanations.append(
            "Authentication and system anomalies show correlated activity."
        )

    if (
        auth_percentage > 0 and
        api_percentage > 0 and
        system_percentage > 0
    ):
        explanations.append(
            "All telemetry sources reported anomalies during the same analysis window."
        )

    if not explanations:
        explanations.append(
            "No significant anomalies detected."
        )

    return explanations


def generate_incident_summary(
    risk_level: str,
    auth_count: int,
    api_count: int,
    system_count: int
) -> str:

    active_sources = sum([
        auth_count > 0,
        api_count > 0,
        system_count > 0
    ])

    if active_sources == 0:
        return "No anomalies detected."

    if active_sources == 1:
        return (
            f"{risk_level} risk generated from a single anomaly source."
        )

    if active_sources == 2:
        return (
            f"{risk_level} risk generated from correlated anomalies across two telemetry sources."
        )

    return (
        f"{risk_level} risk generated from correlated authentication, API, and system anomalies."
    )