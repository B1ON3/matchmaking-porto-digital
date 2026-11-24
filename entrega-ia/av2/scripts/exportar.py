#!/usr/bin/env python3
"""Exporta a clusterização para o backend Node como um modelo substituto."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

if __package__:
    from .dados import carregar_bases
    from .features import ALIASES, SETORES_PRINCIPAIS, construir_features_investidores
    from .selecao import selecionar_features
else:  # execução direta: python scripts/exportar.py
    from dados import carregar_bases
    from features import ALIASES, SETORES_PRINCIPAIS, construir_features_investidores
    from selecao import selecionar_features

RAIZ = Path(__file__).resolve().parents[1]
BACKEND_CONTEUDO = RAIZ.parents[1] / "backend" / "src" / "content"
PROFUNDIDADE = 6


def avaliar_fidelidade(X: pd.DataFrame, rotulos: np.ndarray, seed: int = 42) -> float:
    """Estima a fidelidade: árvore treinada em 75%, acurácia nos 25% restantes.

    A árvore efetivamente exportada é treinada com 100% dos rótulos; este
    número é a estimativa honesta da configuração em dados não vistos.
    """
    treino, teste, rotulos_treino, rotulos_teste = train_test_split(
        X, rotulos, test_size=0.25, random_state=seed, stratify=rotulos
    )
    arvore = DecisionTreeClassifier(max_depth=PROFUNDIDADE, random_state=seed)
    arvore.fit(treino, rotulos_treino)
    return float(accuracy_score(rotulos_teste, arvore.predict(teste)))


def ajustar_arvore(X: pd.DataFrame, rotulos: np.ndarray) -> DecisionTreeClassifier:
    arvore = DecisionTreeClassifier(max_depth=PROFUNDIDADE, random_state=42)
    arvore.fit(X, rotulos)
    return arvore


def serializar_arvore(
    arvore: DecisionTreeClassifier, features: list[str]
) -> dict[str, Any]:
    """Converte a árvore do sklearn emJSON que o TypeScript consegue percorrer."""
    estrutura = arvore.tree_

    def no(indice: int) -> dict[str, Any]:
        esquerda = estrutura.children_left[indice]
        if esquerda == -1:
            return {"classe": int(np.argmax(estrutura.value[indice][0]))}
        return {
            "feature": features[estrutura.feature[indice]],
            "limite": float(estrutura.threshold[indice]),
            "esquerda": no(esquerda),
            "direita": no(estrutura.children_right[indice]),
        }

    return no(0)


def _segmentos() -> list[dict[str, Any]]:
    caminho = RAIZ / "evidencias" / "perfis_clusters.csv"
    if not caminho.exists():
        return []
    perfis = pd.read_csv(
        caminho, dtype=str, keep_default_na=False, encoding="utf-8-sig"
    )
    return [
        {
            "id": int(linha["cluster"]),
            "nome": linha["nome"],
            "setores": [
                item.strip() for item in linha["setores_top"].split(",") if item.strip()
            ],
            "estagios": [
                item.strip()
                for item in linha["estagios_top"].split(",")
                if item.strip()
            ],
            "descricao": (
                f"Perfil {linha['nome']}: {linha['n_investidores']} investidores, "
                f"ticket mediano de R$ {float(linha['ticket_medio']):,.0f}".replace(
                    ",", "."
                )
            ),
        }
        for _, linha in perfis.iterrows()
    ]


def exportar_integracao(
    saida: Path | None = None,
    diretorio_metricas: Path | None = None,
    fidelidade_minima: float = 0.85,
) -> dict[str, Any]:
    pacote = joblib.load(RAIZ / "modelos" / "segmentos.joblib")
    _, investidores, _ = carregar_bases()
    X_completa, _ = construir_features_investidores(investidores)
    X = selecionar_features(X_completa)
    rotulos = np.asarray(pacote["pipeline"].predict(X))
    features = list(pacote["features"])

    fidelidade = avaliar_fidelidade(X, rotulos)
    if fidelidade < fidelidade_minima:
        raise ValueError(
            f"Fidelidade estimada da árvore substituta ({fidelidade:.3f}) abaixo do mínimo "
            f"de {fidelidade_minima:.3f}; aumente a profundidade antes de exportar."
        )

    dados = {
        "versao": f"av2-{date.today().isoformat()}",
        "modelo": "KMeans + árvore substituta",
        "k": int(pacote["k"]),
        "fidelidade": fidelidade,
        "features": features,
        "aliases": ALIASES,
        "setores_principais": list(SETORES_PRINCIPAIS),
        "arvore": serializar_arvore(ajustar_arvore(X, rotulos), features),
        "segmentos": _segmentos(),
    }

    destino = saida or BACKEND_CONTEUDO / "segmentos-matchmaking.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(
        json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    pasta_metricas = diretorio_metricas or (RAIZ / "evidencias")
    caminho_metricas = pasta_metricas / "metricas.json"
    metricas = (
        json.loads(caminho_metricas.read_text(encoding="utf-8"))
        if caminho_metricas.exists()
        else {}
    )
    metricas["fidelidade_arvore"] = fidelidade
    metricas["fidelidade_metodo"] = (
        "estimativa em split estratificado 75/25; árvore exportada usa 100% dos rótulos"
    )
    try:
        metricas["integracao"] = (
            destino.resolve().relative_to(RAIZ.parents[1]).as_posix()
        )
    except ValueError:
        metricas["integracao"] = str(destino)
    caminho_metricas.parent.mkdir(parents=True, exist_ok=True)
    caminho_metricas.write_text(
        json.dumps(metricas, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    return dados


if __name__ == "__main__":
    exportado = exportar_integracao()
    print(f"Exportado para {BACKEND_CONTEUDO / 'segmentos-matchmaking.json'}")
    print(f"Fidelidade: {exportado['fidelidade']:.3f}")
