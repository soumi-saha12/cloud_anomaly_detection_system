from extensions import db


class SourceResult(db.Model):
    __tablename__ = "source_results"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    analysis_run_id = db.Column(
        db.Integer,
        db.ForeignKey("analysis_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    source_type = db.Column(db.String(20), nullable=False)  # 'auth', 'api', 'system'
    total_records = db.Column(db.Integer, nullable=False)
    anomaly_count = db.Column(db.Integer, nullable=False)
    anomaly_percentage = db.Column(db.Float, nullable=False)

    # Unique constraint: only one result per source type per run
    __table_args__ = (
        db.UniqueConstraint("analysis_run_id", "source_type", name="uq_run_source"),
    )

    # Relationships
    analysis_run = db.relationship("AnalysisRun", back_populates="source_results")

    def to_dict(self):
        return {
            "id": self.id,
            "analysis_run_id": self.analysis_run_id,
            "source_type": self.source_type,
            "total_records": self.total_records,
            "anomaly_count": self.anomaly_count,
            "anomaly_percentage": self.anomaly_percentage,
        }
