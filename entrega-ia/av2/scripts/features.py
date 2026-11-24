"""Preparação e feature engineering da AV2.

As regras abaixo são independentes da limpeza feita na AV1: a AV2 consegue
consumir tanto a base original quanto a base já preparada. Isso permite que
as duas entregas evoluam em paralelo sem travar uma à outra.
"""

from __future__ import annotations

import math
import re
import unicodedata
from typing import Any

import numpy as np
import pandas as pd

FEATURES_INVESTIDOR: tuple[str, ...] = (
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
    "ticket_medio_log",
    "ticket_amplitude",
    "perfil_risco",
    "experiencia_anos",
    "investimentos_realizados",
    "uf_pe",
    "regiao_nordeste",
    "modelo_b2b",
)

ALIASES: dict[str, str] = {
    "tech": "tecnologia",
    "ti": "tecnologia",
    "software": "tecnologia",
    "saas": "tecnologia",
    "saas startup": "tecnologia",
    "tecnologia da informacao": "tecnologia",
    "fintech": "fintech",
    "financeiro": "fintech",
    "financas": "fintech",
    "servicos financeiros": "fintech",
    "saude": "saude",
    "health": "saude",
    "healthtech": "saude",
    "educacao": "educacao",
    "edtech": "educacao",
    "education": "educacao",
    "agro": "agro",
    "agtech": "agro",
    "agronegocio": "agro",
    "economia criativa": "economia criativa",
    "criativa": "economia criativa",
    "creative": "economia criativa",
    "games": "economia criativa",
    "design": "economia criativa",
    "logistica": "logistica",
    "logtech": "logistica",
    "mobilidade": "logistica",
    "varejo": "varejo",
    "retail": "varejo",
    "e-commerce": "varejo",
    "ecommerce": "varejo",
    "comercio": "varejo",
    "energia": "energia",
    "cleantech": "energia",
    "energia renovavel": "energia",
    "sustentabilidade": "energia",
    "industria": "industria",
    "indtech": "industria",
    "manufatura": "industria",
    "pre seed": "pre-seed",
    "semente": "pre-seed",
    "ideia": "ideacao",
    "serie a": "serie a",
    "series a": "serie a",
    "serie b": "serie b",
    "series b": "serie b",
    "marketplace b2b": "marketplace",
    "plataforma": "marketplace",
    "assinatura": "saas",
    "saas recorrente": "saas",
    "govtech": "governo",
    "setor publico": "governo",
}

SETORES_PRINCIPAIS: tuple[str, ...] = (
    "tecnologia",
    "fintech",
    "saude",
    "educacao",
    "agro",
    "economia criativa",
)

RISCO: dict[str, int] = {"conservador": 0, "moderado": 1, "arrojado": 2}

NORDeste = frozenset({"pe", "pb", "rn", "ce", "al", "se", "ba", "pi", "ma"})

UFS: dict[str, str] = {
    "acre": "ac",
    "alagoas": "al",
    "amazonas": "am",
    "amapa": "ap",
    "bahia": "ba",
    "ceara": "ce",
    "distrito federal": "df",
    "espirito santo": "es",
    "goias": "go",
    "maranhao": "ma",
    "minas gerais": "mg",
    "mato grosso do sul": "ms",
    "mato grosso": "mt",
    "para": "pa",
    "paraiba": "pb",
    "pernambuco": "pe",
    "piaui": "pi",
    "parana": "pr",
    "rio de janeiro": "rj",
    "rio grande do norte": "rn",
    "rondonia": "ro",
    "roraima": "rr",
    "rio grande do sul": "rs",
    "santa catarina": "sc",
    "sergipe": "se",
    "sao paulo": "sp",
    "tocantins": "to",
}

SEP = re.compile(r"[,;/|]")
NUMERO = re.compile(r"\d+(?:[.,]\d+)?")


def _texto(valor: Any) -> str:
    if valor is None or (isinstance(valor, float) and math.isnan(valor)):
        return ""
    texto = str(valor)
    if texto.strip().lower() in {"n/d", "nan", "none", "null", "-"}:
        return ""
    return texto.strip()


def normalizar_categoria(valor: Any) -> str:
    """Remove acentos, caixa e espaços e aplica os aliases conhecidos."""
    texto = _texto(valor)
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(
        caracter for caracter in texto if unicodedata.category(caracter) != "Mn"
    )
    texto = re.sub(r"\s+", " ", texto.lower()).strip()
    return ALIASES.get(texto, texto)


def normalizar_uf(valor: Any) -> str:
    texto = normalizar_categoria(valor)
    if len(texto) == 2 and texto.isalpha():
        return texto
    return UFS.get(texto, texto)


def _numero(valor: Any) -> float | None:
    texto = _texto(valor).replace(" ", "")
    if not texto or texto.startswith("-"):
        return None
    encontrado = NUMERO.search(texto)
    if encontrado is None:
        return None
    return float(encontrado.group(0).replace(",", "."))


def parse_moeda(valor: Any) -> float | None:
    """Converte os formatos sujos da base em reais (ex.: 'R$ 120 mil')."""
    texto = normalizar_categoria(valor).replace("r$", "").replace(" ", "")
    if not texto or texto.startswith("-"):
        return None

    multiplicador = 1.0
    for sufixo, fator in (
        ("mil", 1_000.0),
        ("mi", 1_000_000.0),
        ("k", 1_000.0),
        ("m", 1_000_000.0),
    ):
        if texto.endswith(sufixo):
            multiplicador = fator
            texto = texto[: -len(sufixo)]
            break

    encontrado = NUMERO.search(texto)
    if encontrado is None:
        return None
    bruto = encontrado.group(0)
    if bruto.count(".") > 1:
        bruto = bruto.replace(".", "")
    else:
        bruto = bruto.replace(",", ".")
    try:
        return float(bruto) * multiplicador
    except ValueError:
        return None


def _lista(valor: Any) -> list[str]:
    return [
        item
        for item in (normalizar_categoria(part) for part in SEP.split(_texto(valor)))
        if item
    ]


def _inteiro(valor: Any, teto: int) -> float | None:
    numero = _numero(valor)
    if numero is None or numero > teto:
        return None
    return numero


def _mediana(valores: list[float | None], fallback: float) -> float:
    validos = [valor for valor in valores if valor is not None]
    return float(np.median(validos)) if validos else fallback


def construir_features_investidores(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Devolve a matriz X (somente números) e os metadados normalizados."""
    base = df.drop_duplicates(subset="id_investidor", keep="first").copy()

    setores = [
        _lista(valor) for valor in base.get("setores_interesse", pd.Series(dtype=str))
    ]
    estagios = [
        _lista(valor) for valor in base.get("estagios_interesse", pd.Series(dtype=str))
    ]
    ticket_min = [
        parse_moeda(valor) for valor in base.get("ticket_minimo", pd.Series(dtype=str))
    ]
    ticket_max = [
        parse_moeda(valor) for valor in base.get("ticket_maximo", pd.Series(dtype=str))
    ]
    for indice, (mini, maxi) in enumerate(zip(ticket_min, ticket_max)):
        if mini is not None and maxi is not None and mini > maxi:
            ticket_min[indice], ticket_max[indice] = maxi, mini
    risco = [
        RISCO.get(normalizar_categoria(valor), 1)
        for valor in base.get("perfil_risco", pd.Series(dtype=str))
    ]
    experiencia = [
        _inteiro(valor, 60)
        for valor in base.get("experiencia_anos", pd.Series(dtype=str))
    ]
    negocios = [
        _inteiro(valor, 200)
        for valor in base.get("investimentos_realizados", pd.Series(dtype=str))
    ]
    ufs = [normalizar_uf(valor) for valor in base.get("uf", pd.Series(dtype=str))]
    modelos = [
        normalizar_categoria(valor)
        for valor in base.get("modelo_negocio_preferido", pd.Series(dtype=str))
    ]

    meta = pd.DataFrame(
        {
            "id_investidor": list(base.get("id_investidor", pd.Series(dtype=str))),
            "setores_normalizados": setores,
            "estagios_normalizados": estagios,
            "ticket_min": ticket_min,
            "ticket_max": ticket_max,
            "perfil_risco": risco,
            "uf": ufs,
        }
    )

    med_experiencia = _mediana(experiencia, 10.0)
    med_negocios = _mediana(negocios, 5.0)
    centros = [
        math.log10((mini + maxi) / 2 + 1)
        for mini, maxi in zip(ticket_min, ticket_max)
        if mini is not None and maxi is not None
    ]
    med_centro = _mediana(centros, math.log10(150001.0))

    colunas: dict[str, list[float]] = {nome: [] for nome in FEATURES_INVESTIDOR}
    for indice in range(len(base)):
        itens = setores[indice]
        etapas = estagios[indice]
        mini, maxi = ticket_min[indice], ticket_max[indice]
        if mini is not None and maxi is not None and mini > maxi:
            mini, maxi = maxi, mini
        centro = (
            math.log10((mini + maxi) / 2 + 1)
            if mini is not None and maxi is not None
            else med_centro
        )
        amplitude = (
            (maxi - mini) / max(maxi, 1.0)
            if mini is not None and maxi is not None
            else 0.0
        )

        valores = {
            "setor_tecnologia": float("tecnologia" in itens),
            "setor_financeiro": float("fintech" in itens),
            "setor_saude": float("saude" in itens),
            "setor_educacao": float("educacao" in itens),
            "setor_agro": float("agro" in itens),
            "setor_criativa": float("economia criativa" in itens),
            "setor_outros": float(
                any(item not in SETORES_PRINCIPAIS for item in itens)
            ),
            "n_setores": float(len(set(itens))),
            "estagio_inicial": float(
                any(item in {"ideacao", "pre-seed"} for item in etapas)
            ),
            "estagio_seed": float("seed" in etapas),
            "estagio_expansao": float(
                any(item in {"serie a", "serie b"} for item in etapas)
            ),
            "n_estagios": float(len(set(etapas))),
            "ticket_medio_log": centro,
            "ticket_amplitude": float(min(1.0, max(0.0, amplitude))),
            "perfil_risco": float(risco[indice]),
            "experiencia_anos": experiencia[indice]
            if experiencia[indice] is not None
            else med_experiencia,
            "investimentos_realizados": negocios[indice]
            if negocios[indice] is not None
            else med_negocios,
            "uf_pe": float(ufs[indice] == "pe"),
            "regiao_nordeste": float(ufs[indice] in NORDeste),
            "modelo_b2b": float("b2b" in modelos[indice]),
        }
        for nome, valor in valores.items():
            colunas[nome].append(float(valor))

    X = pd.DataFrame(colunas, columns=list(FEATURES_INVESTIDOR))
    return X, meta


def construir_features_startups(df: pd.DataFrame) -> pd.DataFrame:
    """Metadados normalizados das startups, usados na interpretação dos clusters."""
    base = df.drop_duplicates(subset="id_startup", keep="first").copy()
    setores = [_lista(valor) for valor in base.get("setor", pd.Series(dtype=str))]
    estagios = [_lista(valor) for valor in base.get("estagio", pd.Series(dtype=str))]
    return pd.DataFrame(
        {
            "id_startup": list(base.get("id_startup", pd.Series(dtype=str))),
            "setor_normalizado": [itens[0] if itens else "" for itens in setores],
            "estagio_normalizado": [itens[0] if itens else "" for itens in estagios],
            "capital": [
                parse_moeda(valor)
                for valor in base.get("capital_procurado", pd.Series(dtype=str))
            ],
            "uf": [
                normalizar_uf(valor) for valor in base.get("uf", pd.Series(dtype=str))
            ],
        }
    )
