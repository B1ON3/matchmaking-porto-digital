import pandas as pd

from scripts.features import FEATURES_INVESTIDOR
from scripts.selecao import FEATURES_CLUSTERIZACAO, escolher_k, selecionar_features


def test_escolher_k_maximiza_silhueta_e_desempata_por_calinski() -> None:
    resultados = pd.DataFrame(
        [
            {"k": 2, "silhueta": 0.30, "calinski": 100.0, "davies": 1.0},
            {"k": 3, "silhueta": 0.55, "calinski": 90.0, "davies": 0.7},
            {"k": 4, "silhueta": 0.55, "calinski": 120.0, "davies": 0.6},
        ]
    )

    assert escolher_k(resultados) == 4


def test_escolher_k_respeita_limites() -> None:
    resultados = pd.DataFrame(
        [
            {"k": 1, "silhueta": 0.90, "calinski": 10.0, "davies": 0.1},
            {"k": 2, "silhueta": 0.40, "calinski": 10.0, "davies": 0.9},
        ]
    )

    assert escolher_k(resultados) == 2


def test_selecionar_features_reduz_e_mantem_perfil_de_interesses() -> None:
    X = pd.DataFrame([{nome: 1.0 for nome in FEATURES_INVESTIDOR}] * 3)

    selecionadas = selecionar_features(X)

    assert list(selecionadas.columns) == list(FEATURES_CLUSTERIZACAO)
    assert len(FEATURES_CLUSTERIZACAO) < len(FEATURES_INVESTIDOR)
    assert "setor_tecnologia" in selecionadas.columns
    assert "estagio_seed" in selecionadas.columns
    assert "experiencia_anos" not in selecionadas.columns
