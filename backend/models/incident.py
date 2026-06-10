from datetime import datetime
from extensions import db


class Incident(db.Model):
    __tablename__ = "incidents"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    analysis_run_id = db.Column(
        db.Integer,
        db.ForeignKey("analysis_runs.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    risk_score = db.Column(db.Float, nullable=False)
    risk_level = db.Column(db.String(20), nullable=False)  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    incident_summary = db.Column(db.Text, nullable=False)
    explanations = db.Column(db.JSON, nullable=False)  # JSON list of string messages
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    analysis_run = db.relationship("AnalysisRun", back_populates="incident")

    def to_dict(self):
        return {
            "id": self.id,
            "analysis_run_id": self.analysis_run_id,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "incident_summary": self.incident_summary,
            "explanations": self.explanations,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
