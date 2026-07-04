"""
train_deficit.py
─────────────────────────────────────────────────────────────────────────────
Standalone training script for Session Deficit Prediction model.

Usage:
  python train_deficit.py
  python train_deficit.py --min-samples 20
  python train_deficit.py --date-from 2024-01-01 --date-to 2024-12-31
─────────────────────────────────────────────────────────────────────────────
"""

import argparse
import json
import logging
import sys
from datetime import date
from services.deficit_service import run_training
from schemas.deficit_schema import RawSessionInput, SessionFilter
from data.postgres_loader_sessions import load_sessions_data

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("train_deficit")


# ─────────────────────────────────────────────────────────────────────────────
# CLI ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Train the Session Deficit Prediction model",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python train_deficit.py
  python train_deficit.py --min-samples 20
  python train_deficit.py --date-from 2024-01-01 --date-to 2024-12-31
  python train_deficit.py --output-metrics metrics.json
        """,
    )
    parser.add_argument(
        "--min-samples",
        type=int,
        default=10,
        help="Minimum number of sessions required to train (default: 10)",
    )
    parser.add_argument(
        "--date-from",
        type=str,
        default=None,
        help="Date de début (format: YYYY-MM-DD). Par défaut: 1er janvier de l'année courante",
    )
    parser.add_argument(
        "--date-to",
        type=str,
        default=None,
        help="Date de fin (format: YYYY-MM-DD). Par défaut: aujourd'hui",
    )
    parser.add_argument(
        "--output-metrics",
        type=str,
        default=None,
        help="Optional path to save training metrics as JSON",
    )

    args = parser.parse_args()

    # Dates par défaut
    date_from = date.fromisoformat(args.date_from) if args.date_from else date(date.today().year, 1, 1)
    date_to = date.fromisoformat(args.date_to) if args.date_to else date.today()

    # Chargement depuis PostgreSQL
    filters = SessionFilter(date_from=date_from, date_to=date_to)
    logger.info(f"Chargement des sessions depuis PostgreSQL ({date_from} → {date_to})")

    df = load_sessions_data(filters)

    if df.empty:
        logger.error("Aucune donnée trouvée en base pour ces filtres.")
        sys.exit(1)

    logger.info(f"{len(df)} sessions chargées depuis la base.")

    # Parse into Pydantic models
    try:
        sessions = [RawSessionInput(**row) for row in df.to_dict("records")]
    except Exception as e:
        logger.error(f"Failed to parse session data: {e}")
        sys.exit(1)

    # Run training pipeline
    try:
        result = run_training(sessions, min_samples=args.min_samples)
        logger.info(f"\n{'='*60}")
        logger.info(f"TRAINING RESULTS:")
        logger.info(f"  {result.message}")
        logger.info(f"  Accuracy:   {result.metrics.accuracy:.3f}")
        logger.info(f"  ROC-AUC:    {result.metrics.roc_auc:.3f}")
        logger.info(f"  Precision:  {result.metrics.precision:.3f}")
        logger.info(f"  Recall:     {result.metrics.recall:.3f}")
        logger.info(f"  F1 Score:   {result.metrics.f1_score:.3f}")
        logger.info(f"  Train size: {result.metrics.n_samples_train}")
        logger.info(f"  Test size:  {result.metrics.n_samples_test}")
        logger.info(f"{'='*60}")

        if args.output_metrics:
            metrics_dict = result.metrics.dict()
            with open(args.output_metrics, "w", encoding="utf-8") as f:
                json.dump(metrics_dict, f, indent=2)
            logger.info(f"Metrics saved to {args.output_metrics}")

    except ValueError as e:
        logger.error(f"Training failed: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()