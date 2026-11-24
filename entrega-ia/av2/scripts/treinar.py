#!/usr/bin/env python3
"""Treina, avalia e salva a clusterização dos investidores (AV2)."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import pandas as pd  # noqa: E402

from dados import carregar_bases  # noqa: E402
from features import FEATURES_INVESTIDOR, construir_features_investidores  # noqa: E402
from modelos import avaliar_estabilidade, avaliar_k, comparar_algoritmos, treinar_modelo  # noqa: E402
from selecao import (  # noqa: E402
    FEATURES_CLUSTERIZACAO,
    K_MAXIMO,
    K_MINIMO,
    escolher_k,
    selecionar_features,
)

RAIZ = Path(__file__).resolve().parents[1]
RAIZ_REPOSITORIO = RAIZ.parents[1]
MODELOS = RAIZ / "modelos"
EVIDENCIAS = RAIZ / "evidencias"
GRAFICOS = EVIDENCIAS / "graficos"
SEED = 20261006


def _relativo(caminho: str) -> str:
    """Guarda evidências com caminhos relativos, sem vazar o diretório local."""
    try:
        return Path(caminho).resolve().relative_to(RAIZ_REPOSITORIO).as_posix()
    except ValueError:
        return caminho


def _rotulo(cluster: int, setores: list[str], estagios: list[str]) -> str:
    setor = setores[0] if setores else "diversos"
    estagio = estagios[0] if estagios else "misto"
    return f"{setor} · {estagio} (cluster {cluster})"


def _perfis(rotulos: pd.Series, meta: pd.DataFrame) -> pd.DataFrame:
    registros: list[dict[str, object]] = []
    for cluster in sorted(set(rotulos)):
        selecionados = meta.loc[rotulos == cluster]
        setores = Counter(
            setor
            for lista in selecionados["setores_normalizados"]
            for setor in set(lista)
        )
        estagios = Counter(
            etapa
            for lista in selecionados["estagios_normalizados"]
            for etapa in set(lista)
        )
        setores_top = [nome for nome, _ in setores.most_common(3)]
        estagios_top = [nome for nome, _ in estagios.most_common(2)]
        tickets = [
            (mini + maxi) / 2
            for mini, maxi in zip(
                selecionados["ticket_min"], selecionados["ticket_max"]
            )
            if pd.notna(mini) and pd.notna(maxi)
        ]
        registros.append(
            {
                "cluster": int(cluster),
                "nome": _rotulo(int(cluster), setores_top, estagios_top),
                "n_investidores": int(len(selecionados)),
                "setores_top": ", ".join(setores_top),
                "estagios_top": ", ".join(estagios_top),
                "ticket_medio": round(float(pd.Series(tickets).median()), 2)
                if tickets
                else 0.0,
            }
        )
    return pd.DataFrame(registros)


def main() -> None:
    MODELOS.mkdir(parents=True, exist_ok=True)
    GRAFICOS.mkdir(parents=True, exist_ok=True)

    startups, investidores, origem = carregar_bases()
    X_completa, meta = construir_features_investidores(investidores)
    X = selecionar_features(X_completa)
    ks = tuple(range(K_MINIMO, K_MAXIMO + 1))

    comparacao_features = {
        "todas_as_features": float(
            avaliar_k(X_completa, (5,), seed=SEED)["silhueta"].iloc[0]
        ),
        "perfil_de_interesses": float(
            avaliar_k(X, (5,), seed=SEED)["silhueta"].iloc[0]
        ),
    }
    print("Silhueta por grupo de features (k=5):", comparacao_features)

    print("Avaliando k =", ks)
    avaliacao = avaliar_k(X, ks, seed=SEED)
    k = escolher_k(avaliacao)
    print(avaliacao.to_string(index=False))
    print("k escolhido:", k)

    pipeline, rotulos = treinar_modelo(X, k, seed=SEED)
    estabilidade = avaliar_estabilidade(X, k, seed=SEED)
    comparacao = comparar_algoritmos(X, k, seed=SEED)
    perfis = _perfis(pd.Series(rotulos, name="cluster"), meta)

    metricas = {
        # só caminhos viram relativos; `motivo` é texto descritivo, não caminho
        "fonte": {
            chave: _relativo(valor) if chave in {"startups", "investidores"} else valor
            for chave, valor in origem.items()
        },
        "seed": SEED,
        "registros": int(len(X)),
        "features": list(FEATURES_INVESTIDOR),
        "features_clusterizacao": list(FEATURES_CLUSTERIZACAO),
        "features_descartadas": [
            nome for nome in FEATURES_INVESTIDOR if nome not in FEATURES_CLUSTERIZACAO
        ],
        "comparacao_features": comparacao_features,
        "k": k,
        "avaliacao_k": avaliacao.to_dict(orient="records"),
        "estabilidade": estabilidade,
        "comparacao_algoritmos": comparacao.to_dict(orient="records"),
        "silhueta_final": float(avaliacao.loc[avaliacao["k"] == k, "silhueta"].iloc[0]),
        "clusters": perfis.to_dict(orient="records"),
    }

    joblib.dump(
        {"pipeline": pipeline, "features": list(FEATURES_CLUSTERIZACAO), "k": k},
        MODELOS / "segmentos.joblib",
    )
    (EVIDENCIAS / "metricas.json").write_text(
        json.dumps(metricas, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    perfis.to_csv(EVIDENCIAS / "perfis_clusters.csv", index=False, encoding="utf-8-sig")

    fig, eixo = plt.subplots(figsize=(7, 4))
    eixo.bar(avaliacao["k"].astype(str), avaliacao["silhueta"], color="#2f6f4f")
    eixo.set_title("Silhueta média por número de clusters")
    eixo.set_xlabel("k")
    eixo.set_ylabel("silhueta")
    fig.tight_layout()
    fig.savefig(GRAFICOS / "silhueta.png", dpi=120)
    plt.close(fig)

    inercias = [
        float(treinar_modelo(X, candidato, seed=SEED)[0].named_steps["kmeans"].inertia_)
        for candidato in ks
    ]
    fig, eixo = plt.subplots(figsize=(7, 4))
    eixo.plot(list(ks), inercias, marker="o", color="#b45309")
    eixo.set_title("Método do cotovelo — inércia por k")
    eixo.set_xlabel("k")
    eixo.set_ylabel("inércia")
    fig.tight_layout()
    fig.savefig(GRAFICOS / "elbow.png", dpi=120)
    plt.close(fig)

    print("\nEstabilidade:", estabilidade)
    print("\nComparação de algoritmos:")
    print(comparacao.to_string(index=False))
    print("\nPerfis:")
    print(perfis.to_string(index=False))
    print(f"\nStartups carregadas: {len(startups)}")


if __name__ == "__main__":
    main()
