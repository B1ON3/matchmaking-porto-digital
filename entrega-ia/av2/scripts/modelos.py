"""Treinamento e validação da clusterização de investidores."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.cluster import AgglomerativeClustering, KMeans
from sklearn.metrics import (
    adjusted_rand_score,
    calinski_harabasz_score,
    davies_bouldin_score,
    silhouette_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


def _pipeline(k: int, seed: int) -> Pipeline:
    return Pipeline(
        [
            ("scaler", StandardScaler()),
            ("kmeans", KMeans(n_clusters=k, n_init=20, random_state=seed)),
        ]
    )


def treinar_modelo(
    X: pd.DataFrame, k: int, seed: int = 42
) -> tuple[Pipeline, np.ndarray]:
    """Ajusta scaler + K-Means e devolve o pipeline e os rótulos."""
    pipeline = _pipeline(k, seed)
    rotulos = pipeline.fit_predict(X)
    return pipeline, np.asarray(rotulos)


def avaliar_k(X: pd.DataFrame, ks: tuple[int, ...], seed: int = 42) -> pd.DataFrame:
    """Compara configurações de k por silhueta, Calinski-Harabasz e Davies-Bouldin."""
    registros: list[dict[str, float]] = []
    escalado = StandardScaler().fit_transform(X)
    for k in ks:
        _, rotulos = treinar_modelo(X, k, seed)
        registros.append(
            {
                "k": float(k),
                "silhueta": float(silhouette_score(escalado, rotulos)),
                "calinski": float(calinski_harabasz_score(escalado, rotulos)),
                "davies": float(davies_bouldin_score(escalado, rotulos)),
            }
        )
    return pd.DataFrame(registros, columns=["k", "silhueta", "calinski", "davies"])


def avaliar_estabilidade(
    X: pd.DataFrame, k: int, seed: int = 42, amostras: int = 5
) -> dict[str, float]:
    """Mede a concordância (ARI) entre reajustes em 80% dos registros."""
    rng = np.random.default_rng(seed)
    _, referencia = treinar_modelo(X, k, seed)
    tamanho = max(k + 1, int(len(X) * 0.8))
    concordancias: list[float] = []

    for _ in range(amostras):
        indices = rng.choice(len(X), size=tamanho, replace=False)
        _, rotulos = treinar_modelo(X.iloc[indices], k, seed)
        concordancias.append(float(adjusted_rand_score(referencia[indices], rotulos)))

    return {
        "ari_medio": float(np.mean(concordancias)),
        "ari_min": float(np.min(concordancias)),
        "ari_max": float(np.max(concordancias)),
        "amostras": float(amostras),
    }


def comparar_algoritmos(X: pd.DataFrame, k: int, seed: int = 42) -> pd.DataFrame:
    """Compara K-Means com Agglomerative (ward) no mesmo k."""
    escalado = StandardScaler().fit_transform(X)
    _, rotulos_kmeans = treinar_modelo(X, k, seed)
    agglomerative = AgglomerativeClustering(n_clusters=k, linkage="ward")
    rotulos_ward = agglomerative.fit_predict(escalado)

    return pd.DataFrame(
        [
            {
                "algoritmo": "KMeans",
                "silhueta": float(silhouette_score(escalado, rotulos_kmeans)),
                "calinski": float(calinski_harabasz_score(escalado, rotulos_kmeans)),
                "davies": float(davies_bouldin_score(escalado, rotulos_kmeans)),
            },
            {
                "algoritmo": "Agglomerative(ward)",
                "silhueta": float(silhouette_score(escalado, rotulos_ward)),
                "calinski": float(calinski_harabasz_score(escalado, rotulos_ward)),
                "davies": float(davies_bouldin_score(escalado, rotulos_ward)),
            },
        ]
    )
