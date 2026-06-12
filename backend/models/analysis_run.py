from datetime import datetime
from extensions import db


class AnalysisRun(db.Model):
    __tablename__ = "analysis_runs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    run_name = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="completed")
    risk_score = db.Column(db.Float, nullable=True)
    risk_level = db.Column(db.String(20), nullable=True)
    summary = db.Column(db.Text, nullable=True)
    auth_file_name = db.Column(db.String(255), nullable=False)
    api_file_name = db.Column(db.String(255), nullable=False)
    system_file_name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    user = db.relationship("User", back_populates="analysis_runs")
    source_results = db.relationship(
        "SourceResult",
        back_populates="analysis_run",
        cascade="all, delete-orphan",
        lazy="select"
    )
    incident = db.relationship(
        "Incident",
        back_populates="analysis_run",
        uselist=False,
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "run_id": self.id,
            "user_id": self.user_id,
            "run_name": self.run_name,
            "status": self.status,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "summary": self.summary,
            "timestamp": self.created_at.isoformat() if self.created_at else None,
            "auth_file_name": self.auth_file_name,
            "api_file_name": self.api_file_name,
            "system_file_name": self.system_file_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "source_results": [res.to_dict() for res in self.source_results] if self.source_results else [],
            "incident": self.incident.to_dict() if self.incident else None,
        }
