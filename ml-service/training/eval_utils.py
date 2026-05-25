"""Métriques communes pour les scripts training/*."""

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    roc_auc_score,
)


def print_classification_metrics(name: str, y_test, y_pred, y_proba=None) -> dict:
    """Affiche et retourne accuracy, F1, AUC (si proba), matrice de confusion."""
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
    }
    if y_proba is not None and len(set(y_test)) > 1:
        metrics["auc"] = float(roc_auc_score(y_test, y_proba))

    print(f"\n=== {name} ===")
    print(f"Accuracy:  {metrics['accuracy']:.4f}")
    print(f"F1-score:  {metrics['f1']:.4f}")
    if "auc" in metrics:
        print(f"AUC-ROC:   {metrics['auc']:.4f}")
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    return metrics


def print_regression_metrics(name: str, y_test, y_pred) -> dict:
    """MAE, RMSE, R² pour régression."""
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))

    print(f"\n=== {name} ===")
    print(f"MAE:  {mae:.4f}")
    print(f"RMSE: {rmse:.4f}")
    print(f"R²:   {r2:.4f}")

    return {"mae": mae, "rmse": rmse, "r2": r2}
