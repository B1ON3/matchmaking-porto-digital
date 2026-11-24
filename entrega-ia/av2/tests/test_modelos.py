import random

import numpy as np
import pandas as pd
import pytest

from scripts.features import FEATURES_INVESTIDOR
from scripts.modelos import (
    avaliar_estabilidade,
    avaliar_k,
    comparar_algoritmos,
    treinar_modelo,
)


def base_sintetica() -> pd.DataFrame:
    rng = random.Random(0)
    linhas: list[dict[str, float]] = []
    for grupo, centro in enumerate((2.0, 5.0, 8.0)):
        for _ in range(12):
            linha = {nome: 0.0 for nome in FEATURES_INVESTIDOR}
            linha["ticket_medio_log"] = centro + rng.uniform(-0.15, 0.15)
            linha["perfil_risco"] = float(grupo)
            linhas.append(linha)
    return pd.DataFrame(linhas, columns=list(FEATURES_INVESTIDOR))


def test_avaliar_k_devolve_metricas() -> None:
    resultados = avaliar_k(base_sintetica(), (2, 3, 4))

    assert list(resultados.columns) == ["k", "silhueta", "calinski", "davies"]
    assert len(resultados) == 3
    assert resultados["silhueta"].between(-1, 1).all()
    intencao = resultados.loc[resultados["k"] == 3, "silhueta"].iloc[0]
    assert intencao == resultados["silhueta"].max()


def test_estabilidade_devolve_ari() -> None:
    resultado = avaliar_estabilidade(base_sintetica(), 3)

    assert (
        0 <= resultado["ari_min"] <= resultado["ari_medio"] <= resultado["ari_max"] <= 1
    )
    assert resultado["amostras"] == 5


def test_treinar_modelo_e_deterministico() -> None:
    X = base_sintetica()
    primeiro, rotulos_um = treinar_modelo(X, 3, seed=42)
    segundo, rotulos_dois = treinar_modelo(X, 3, seed=42)

    assert list(primeiro.named_steps) == ["scaler", "kmeans"]
    np.testing.assert_array_equal(rotulos_um, rotulos_dois)


def test_avaliar_k_e_invariante_a_escala_das_features() -> None:
    X = base_sintetica()
    escalada = X.copy()
    escalada["investimentos_realizados"] = escalada["investimentos_realizados"] * 1000

    original = avaliar_k(X, (3,))["silhueta"].iloc[0]
    alterada = avaliar_k(escalada, (3,))["silhueta"].iloc[0]

    assert original == pytest.approx(alterada)


def test_comparar_algoritmos_avalia_no_espaco_padronizado() -> None:
    X = base_sintetica()
    escalada = X.copy()
    escalada["experiencia_anos"] = escalada["experiencia_anos"] * 1000

    original = comparar_algoritmos(X, 3)
    alterada = comparar_algoritmos(escalada, 3)

    assert original["silhueta"].tolist() == pytest.approx(alterada["silhueta"].tolist())
