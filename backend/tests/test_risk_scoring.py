import sys
from pathlib import Path
import unittest

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.risk_scoring import generate_risk_level


class TestRiskScoringThresholds(unittest.TestCase):
    def test_risk_level_mapping(self):
        # LOW: 0 to 39
        self.assertEqual(generate_risk_level(0), "LOW")
        self.assertEqual(generate_risk_level(39), "LOW")
        self.assertEqual(generate_risk_level(39.99), "LOW")

        # MEDIUM: 40 to 74
        self.assertEqual(generate_risk_level(40), "MEDIUM")
        self.assertEqual(generate_risk_level(74), "MEDIUM")
        self.assertEqual(generate_risk_level(74.99), "MEDIUM")

        # HIGH: 75 to 87
        self.assertEqual(generate_risk_level(75), "HIGH")
        self.assertEqual(generate_risk_level(87), "HIGH")
        self.assertEqual(generate_risk_level(87.99), "HIGH")

        # CRITICAL: 88 to 100
        self.assertEqual(generate_risk_level(88), "CRITICAL")
        self.assertEqual(generate_risk_level(100), "CRITICAL")
        self.assertEqual(generate_risk_level(93.36), "CRITICAL")


if __name__ == "__main__":
    unittest.main()
