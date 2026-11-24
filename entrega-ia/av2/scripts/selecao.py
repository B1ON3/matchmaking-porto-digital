"""Critério de escolha do número de clusters."""

from __future__ import annotations

import pandas as pd

K_MINIMO = 2
K_MAXIMO = 8

FEATURES_CLUSTERIZACAO: tuple[str, ...] = (
    "setor_tecnologia",
    "setor_financeiro",
    "setor_saude",
    "setor_educacao",
    "setor_agro",
    "setor_criativa",
    "setor_outros",
    "n_setores",
    "estagio_inicial",
    "estagio_seed",
    "estagio_expansao",
    "n_estagios",
)


def selecionar_features(X: pd.DataFrame) -> pd.DataFrame:
    """Mantém só o perfil de interesses, que produz clusters interpretáveis."""
    return X.loc[:, list(FEATURES_CLUSTERIZACAO)].copy()


def escolher_k(resultados: pd.DataFrame) -> int:
    """Maior silhueta entre 2 e 8; desempate por maior Calinski-Harabasz."""
    elegiveis = resultados[resultados["k"].between(K_MINIMO, K_MAXIMO)].sort_values(
        ["silhueta", "calinski", "k"], ascending=[False, False, True]
    )
    if elegiveis.empty:
        raise ValueError("Nenhum k entre 2 e 8 foi avaliado.")
    return int(elegiveis.iloc[0]["k"])
