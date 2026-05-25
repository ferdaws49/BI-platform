"""
train_deficit.py
─────────────────────────────────────────────────────────────────────────────
Standalone training script for Session Deficit Prediction model.

Usage:
  python train_deficit.py --input data/sessions.json
  python train_deficit.py --input data/sessions.json --min-samples 20

Can also be called programmatically from deficit_route.py /train endpoint.
─────────────────────────────────────────────────────────────────────────────
"""

import argparse
import json
import logging
import sys
from pathlib import Path



from schemas.deficit_schema import RawSessionInput, TrainResponse
from services.deficit_service import (
    clean_sessions,
    create_labels,
    engineer_features,
    load_model,
    model_exists,
    save_model,
    train_model,
    run_training,
)

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
  python train_deficit.py --input data/sessions.json
  python train_deficit.py --input data/sessions.json --min-samples 20
  python train_deficit.py --input data/sessions.json --output-metrics metrics.json
        """,
    )
    parser.add_argument(
        "--input",
        required=True,
        type=Path,
        help="Path to JSON file containing list of raw session objects",
    )
    parser.add_argument(
        "--min-samples",
        type=int,
        default=10,
        help="Minimum number of sessions required to train (default: 10)",
    )
    parser.add_argument(
        "--output-metrics",
        type=Path,
        default=None,
        help="Optional path to save training metrics as JSON",
    )

    args = parser.parse_args()

    # Load sessions from JSON file
    if not args.input.exists():
        logger.error(f"Input file not found: {args.input}")
        sys.exit(1)

    with open(args.input, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    # Handle both {"sessions": [...]} and plain [...] formats
    if isinstance(raw_data, dict) and "sessions" in raw_data:
        raw_data = raw_data["sessions"]

    logger.info(f"Loaded {len(raw_data)} sessions from {args.input}")

    # Parse into Pydantic models
    try:
        sessions = [RawSessionInput(**item) for item in raw_data]
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
