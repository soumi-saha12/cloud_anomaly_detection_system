from backend.services.correlation_engine import generate_incident


def run_case(
    title,
    auth_total,
    auth_anomalies,
    api_total,
    api_anomalies,
    system_total,
    system_anomalies
):

    print("\n")
    print("=" * 80)
    print(title)
    print("=" * 80)

    result = generate_incident(
        auth_total,
        auth_anomalies,
        api_total,
        api_anomalies,
        system_total,
        system_anomalies
    )

    print(f"Risk Score : {result['risk_score']}")
    print(f"Risk Level : {result['risk_level']}")
    print()

    print("Summary:")
    print(result["incident_summary"])
    print()

    print("Explanations:")

    for item in result["explanations"]:
        print(f"- {item}")


if __name__ == "__main__":

    run_case(
        "LOW RISK",
        1000, 1,
        1000, 0,
        1000, 1
    )

    run_case(
        "MEDIUM RISK",
        1000, 20,
        1000, 10,
        1000, 5
    )

    run_case(
        "HIGH RISK",
        1000, 50,
        1000, 40,
        1000, 30
    )

    run_case(
        "CRITICAL RISK",
        1000, 100,
        1000, 80,
        1000, 90
    )