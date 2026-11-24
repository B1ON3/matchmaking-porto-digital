import pandas as pd
import pytest

from scripts.features import (
    FEATURES_INVESTIDOR,
    construir_features_investidores,
    construir_features_startups,
    normalizar_categoria,
    normalizar_uf,
    parse_moeda,
)


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        ("Tech", "tecnologia"),
        ("fintech", "fintech"),
        ("SAUDE", "saude"),
        ("Economia criativa", "economia criativa"),
        ("Pre-Seed", "pre-seed"),
        ("SÉRIE A", "serie a"),
        ("  SaaS  ", "tecnologia"),
    ],
)
def test_normalizacao_valores_sujos(entrada: str, esperado: str) -> None:
    assert normalizar_categoria(entrada) == esperado


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        ("R$ 120 mil", 120000.0),
        ("1,5 mi", 1500000.0),
        ("250k", 250000.0),
        ("n/d", None),
        ("-5000", None),
    ],
)
def test_parse_moeda(entrada: str, esperado: float | None) -> None:
    assert parse_moeda(entrada) == esperado


def test_ticket_invertido_e_nulo() -> None:
    linhas = pd.DataFrame(
        [
            {
                "id_investidor": "IV001",
                "setores_interesse": "Tecnologia",
                "estagios_interesse": "Seed",
                "ticket_minimo": "300000",
                "ticket_maximo": "50000",
                "cidade": "Recife",
                "uf": "PE",
                "modelo_negocio_preferido": "B2B",
                "perfil_risco": "Moderado",
                "experiencia_anos": "12",
                "investimentos_realizados": "8",
            },
            {
                "id_investidor": "IV002",
                "setores_interesse": "Fintech",
                "estagios_interesse": "Série A",
                "ticket_minimo": "",
                "ticket_maximo": "",
                "cidade": "São Paulo",
                "uf": "São Paulo",
                "modelo_negocio_preferido": "",
                "perfil_risco": "",
                "experiencia_anos": "n/d",
                "investimentos_realizados": "-2",
            },
        ]
    )

    _, meta = construir_features_investidores(linhas)

    assert meta.iloc[0]["ticket_min"] == 50000.0
    assert meta.iloc[0]["ticket_max"] == 300000.0
    assert pd.isna(meta.iloc[1]["ticket_min"])
    assert normalizar_uf("São Paulo") == "sp"


def test_features_sao_numericas_e_sem_nan() -> None:
    linhas = pd.DataFrame(
        [
            {
                "id_investidor": "IV001",
                "setores_interesse": "Tech; Saúde | Fintech",
                "estagios_interesse": "Pré-seed / Seed",
                "ticket_minimo": "R$ 120 mil",
                "ticket_maximo": "1,5 mi",
                "cidade": "Recife",
                "uf": " PE ",
                "modelo_negocio_preferido": "B2B SaaS",
                "perfil_risco": "Arrojado",
                "experiencia_anos": "12",
                "investimentos_realizados": "8",
            },
            {
                "id_investidor": "IV002",
                "setores_interesse": "Educação",
                "estagios_interesse": "Série B",
                "ticket_minimo": "n/d",
                "ticket_maximo": "n/d",
                "cidade": "Fortaleza",
                "uf": "CE",
                "modelo_negocio_preferido": "Assinatura",
                "perfil_risco": "Conservador",
                "experiencia_anos": "",
                "investimentos_realizados": "",
            },
        ]
    )

    X, meta = construir_features_investidores(linhas)

    assert list(X.columns) == list(FEATURES_INVESTIDOR)
    assert X.isna().sum().sum() == 0
    assert all(pd.api.types.is_numeric_dtype(X[coluna]) for coluna in X.columns)
    assert len(X) == 2
    assert X.iloc[0]["setor_tecnologia"] == 1
    assert X.iloc[0]["setor_saude"] == 1
    assert X.iloc[0]["estagio_inicial"] == 1
    assert X.iloc[0]["uf_pe"] == 1
    assert X.iloc[0]["modelo_b2b"] == 1
    assert X.iloc[0]["perfil_risco"] == 2
    assert meta.iloc[0]["ticket_min"] == 120000.0
    assert meta.iloc[0]["ticket_max"] == 1500000.0


def test_features_descarta_duplicidade_por_id() -> None:
    linha = {
        "id_investidor": "IV001",
        "setores_interesse": "Tecnologia",
        "estagios_interesse": "Seed",
        "ticket_minimo": "100000",
        "ticket_maximo": "300000",
        "cidade": "Recife",
        "uf": "PE",
        "modelo_negocio_preferido": "B2B",
        "perfil_risco": "Moderado",
        "experiencia_anos": "10",
        "investimentos_realizados": "5",
    }
    X, meta = construir_features_investidores(pd.DataFrame([linha, linha]))

    assert len(X) == 1
    assert list(meta["id_investidor"]) == ["IV001"]


def test_features_startups_normalizam_setor_estagio_e_capital() -> None:
    linhas = pd.DataFrame(
        [
            {
                "id_startup": "ST0001",
                "setor": "saas",
                "estagio": "Série A",
                "uf": "Pernambuco",
                "capital_procurado": "R$ 500 mil",
            }
        ]
    )

    meta = construir_features_startups(linhas)

    assert meta.iloc[0]["setor_normalizado"] == "tecnologia"
    assert meta.iloc[0]["estagio_normalizado"] == "serie a"
    assert meta.iloc[0]["capital"] == 500000.0
    assert meta.iloc[0]["uf"] == "pe"
