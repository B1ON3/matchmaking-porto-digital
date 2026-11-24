from pathlib import Path

import pandas as pd
import pytest

from scripts.dados import carregar_bases

COLUNAS_STARTUP = ["id_startup", "setor", "estagio", "uf", "capital_procurado"]
COLUNAS_INVESTIDOR = [
    "id_investidor",
    "setores_interesse",
    "estagios_interesse",
    "ticket_minimo",
    "ticket_maximo",
    "uf",
]


def _escreve(caminho: Path, colunas: list[str], valores: dict[str, str]) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame([{coluna: valores.get(coluna, "") for coluna in colunas}]).to_csv(
        caminho, index=False, encoding="utf-8-sig"
    )


def _bases_compativas(av1: Path, subpasta: str) -> None:
    raiz = av1 / "dados" / subpasta
    _escreve(
        raiz / "startups_original.csv"
        if subpasta == "original"
        else raiz / f"startups_{subpasta}.csv",
        COLUNAS_STARTUP,
        {"id_startup": "ST0001", "setor": "Tecnologia"},
    )
    nome_investidor = (
        "investidores_original.csv"
        if subpasta == "original"
        else f"investidores_{subpasta}.csv"
    )
    _escreve(raiz / nome_investidor, COLUNAS_INVESTIDOR, {"id_investidor": "IV001"})


def test_carregar_bases_prefere_preparada(tmp_path: Path) -> None:
    av1 = tmp_path / "av1"
    _bases_compativas(av1, "original")
    preparada = av1 / "dados" / "preparada"
    _escreve(
        preparada / "startups_preparada.csv", COLUNAS_STARTUP, {"id_startup": "ST0002"}
    )
    _escreve(
        preparada / "investidores_preparada.csv",
        COLUNAS_INVESTIDOR,
        {"id_investidor": "IV002"},
    )

    startups, investidores, origem = carregar_bases(av1)

    assert startups.iloc[0]["id_startup"] == "ST0002"
    assert investidores.iloc[0]["id_investidor"] == "IV002"
    assert "preparada" in origem["startups"]
    assert "preparada" in origem["investidores"]


def test_carregar_bases_sem_preparada_usa_original(tmp_path: Path) -> None:
    av1 = tmp_path / "av1"
    _bases_compativas(av1, "original")

    startups, investidores, origem = carregar_bases(av1)

    assert pd.isna(startups.iloc[0]["setor"]) is False
    assert "original" in origem["startups"]
    assert "original" in origem["investidores"]


def test_carregar_bases_preparada_incompativel_usa_original(tmp_path: Path) -> None:
    av1 = tmp_path / "av1"
    _bases_compativas(av1, "original")
    preparada = av1 / "dados" / "preparada"
    _escreve(
        preparada / "startups_preparada.csv",
        ["id_startup", "setor_principal"],
        {"id_startup": "ST0002"},
    )
    _escreve(
        preparada / "investidores_preparada.csv",
        ["id_investidor", "segmentos_interesse"],
        {"id_investidor": "IV002"},
    )

    startups, investidores, origem = carregar_bases(av1)

    assert startups.iloc[0]["id_startup"] == "ST0001"
    assert investidores.iloc[0]["id_investidor"] == "IV001"
    assert "original" in origem["startups"]
    assert "motivo" in origem


def test_carregar_bases_sem_nenhuma_base_erro_em_portugues(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError, match="base"):
        carregar_bases(tmp_path / "vazia")
