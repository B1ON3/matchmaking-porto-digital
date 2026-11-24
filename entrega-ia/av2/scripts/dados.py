"""Carrega as bases da AV1 para uso da AV2.

Prefere a base preparada pelo outro chat, mas só a aceita se ela trouxer
as colunas que a AV2 precisa. Enquanto a AV1 evolui, a base original é
usada como fonte estável — a preparação da AV2 roda em ``features.py``.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

RAIZ_REPOSITORIO = Path(__file__).resolve().parents[3]
AV1_PADRAO = RAIZ_REPOSITORIO / "entrega-ia" / "av1"

PADROES = {
    "startups": (
        "startups_preparada.csv",
        "startups_preparado.csv",
        "startups_tratada.csv",
        "startups_tratado.csv",
        "startups_limpa.csv",
        "startups.csv",
        "startups_original.csv",
    ),
    "investidores": (
        "investidores_preparada.csv",
        "investidores_preparado.csv",
        "investidores_tratada.csv",
        "investidores_tratado.csv",
        "investidores_limpa.csv",
        "investidores.csv",
        "investidores_original.csv",
    ),
}

NECESSARIAS = {
    "startups": {"id_startup", "setor", "estagio", "uf", "capital_procurado"},
    "investidores": {
        "id_investidor",
        "setores_interesse",
        "estagios_interesse",
        "ticket_minimo",
        "ticket_maximo",
        "uf",
    },
}


def _localizar(diretorio: Path, tipo: str) -> Path | None:
    if not diretorio.exists():
        return None
    arquivos = {arquivo.name.lower(): arquivo for arquivo in diretorio.glob("*.csv")}
    for nome in PADROES[tipo]:
        if nome in arquivos:
            return arquivos[nome]
    return None


def _le(caminho: Path) -> pd.DataFrame:
    return pd.read_csv(
        caminho, dtype=str, keep_default_na=False, encoding="utf-8-sig"
    ).replace("", pd.NA)


def carregar_bases(
    diretorio_av1: Path | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, str]]:
    """Retorna (startups, investidores, origem dos arquivos usados)."""
    av1 = diretorio_av1 or AV1_PADRAO
    dados = av1 / "dados"
    motivos: list[str] = []

    for subpasta in ("preparada", "preparado", "tratada", "original"):
        encontrados = {
            tipo: caminho
            for tipo in ("startups", "investidores")
            if (caminho := _localizar(dados / subpasta, tipo)) is not None
        }
        if len(encontrados) < 2:
            continue

        tabelas = {tipo: _le(caminho) for tipo, caminho in encontrados.items()}
        faltando = {
            tipo: sorted(NECESSARIAS[tipo] - set(tabela.columns))
            for tipo, tabela in tabelas.items()
        }
        if any(faltando.values()):
            motivos.append(
                f"{subpasta}: esquema incompatível "
                + "; ".join(
                    f"{tipo} sem {', '.join(colunas)}"
                    for tipo, colunas in faltando.items()
                    if colunas
                )
            )
            continue

        origem = {tipo: str(caminho) for tipo, caminho in encontrados.items()}
        if motivos:
            origem["motivo"] = " | ".join(motivos)
        return tabelas["startups"], tabelas["investidores"], origem

    detalhe = " | ".join(motivos) if motivos else f"nenhuma pasta encontrada em {dados}"
    raise FileNotFoundError(
        f"Não encontrei a base de startups e investidores: {detalhe}"
    )
