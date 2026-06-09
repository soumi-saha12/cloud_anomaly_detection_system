from services.risk_scoring import (
    calculate_risk_score,
    generate_risk_level
)

from services.explanations import (
    generate_explanations,
    generate_incident_summary
)


def calculate_source_metrics(
    total_records: int,
    anomaly_count: int
):

    if total_records == 0:
        percentage = 0

    else:
        percentage = round(
            (anomaly_count / total_records) * 100,
            2
        )

    return {
        "total_records": total_records,
        "anomaly_count": anomaly_count,
        "anomaly_percentage": percentage
    }


def generate_incident(
    auth_total: int,
    auth_anomalies: int,
    api_total: int,
    api_anomalies: int,
    system_total: int,
    system_anomalies: int
):

    auth_metrics = calculate_source_metrics(
        auth_total,
        auth_anomalies
    )

    api_metrics = calculate_source_metrics(
        api_total,
        api_anomalies
    )

    system_metrics = calculate_source_metrics(
        system_total,
        system_anomalies
    )

    risk_score = calculate_risk_score(
        auth_metrics["anomaly_percentage"],
        api_metrics["anomaly_percentage"],
        system_metrics["anomaly_percentage"]
    )

    risk_level = generate_risk_level(
        risk_score
    )

    explanations = generate_explanations(
        auth_metrics["anomaly_percentage"],
        api_metrics["anomaly_percentage"],
        system_metrics["anomaly_percentage"]
    )

    incident_summary = generate_incident_summary(
        risk_level,
        auth_anomalies,
        api_anomalies,
        system_anomalies
    )

    return {

        "risk_score": risk_score,

        "risk_level": risk_level,

        "auth_anomalies": auth_anomalies,
        "api_anomalies": api_anomalies,
        "system_anomalies": system_anomalies,

        "source_breakdown": {

            "auth": auth_metrics,
            "api": api_metrics,
            "system": system_metrics
        },

        "incident_summary": incident_summary,

        "explanations": explanations
    }
