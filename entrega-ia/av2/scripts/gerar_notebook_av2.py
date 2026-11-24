#!/usr/bin/env python3
"""Gera o notebook executável da AV2 a partir das funções do pacote scripts."""

from __future__ import annotations

from pathlib import Path

import nbformat as nbf

RAIZ = Path(__file__).resolve().parents[1]
SAIDA = RAIZ / "notebook" / "AV2_Clusterizacao_Investidores.ipynb"


def md(fonte: str) -> nbf.NotebookNode:
    return nbf.v4.new_markdown_cell(source=fonte)


def codigo(fonte: str) -> nbf.NotebookNode:
    return nbf.v4.new_code_cell(source=fonte)


def main() -> None:
    nb = nbf.v4.new_notebook()
    nb["metadata"] = {
        "kernelspec": {
            "display_name": "Python 3 (venv-ia)",
            "language": "python",
            "name": "python3",
        },
        "language_info": {"name": "python", "version": "3.12"},
    }

    nb["cells"] = [
        md(
            "# AV2 — Clusterização de investidores para matchmaking\n"
            "\n"
            "Objetivo: descobrir perfis de investidores sem rótulos e usá-los para "
            "desempatar matches com score idêntico. Pipeline: dados da AV1 → "
            "feature engineering → feature selection → K-Means → validação → "
            "árvore substituta exportada para o backend.\n"
            "\n"
            "Execute as células em ordem a partir da pasta `entrega-ia/av2`."
        ),
        codigo(
            "import json\n"
            "import sys\n"
            "from pathlib import Path\n"
            "\n"
            "import matplotlib\n"
            "\n"
            "matplotlib.use('Agg')\n"
            "\n"
            "import matplotlib.pyplot as plt\n"
            "import pandas as pd\n"
            "\n"
            "RAIZ = Path.cwd() if (Path.cwd() / 'scripts').exists() else Path('entrega-ia/av2')\n"
            "if str(RAIZ) not in sys.path:\n"
            "    sys.path.insert(0, str(RAIZ))\n"
            "\n"
            "from scripts.dados import carregar_bases\n"
            "from scripts.features import FEATURES_INVESTIDOR, construir_features_investidores\n"
            "from scripts.modelos import (\n"
            "    avaliar_estabilidade,\n"
            "    avaliar_k,\n"
            "    comparar_algoritmos,\n"
            "    treinar_modelo,\n"
            ")\n"
            "from scripts.selecao import FEATURES_CLUSTERIZACAO, escolher_k, selecionar_features\n"
            "\n"
            "SEED = 20261006\n"
            "print('Pasta de trabalho:', RAIZ)"
        ),
        md(
            "## 1. Dados\n"
            "\n"
            "O carregador prefere a base preparada da AV1 e valida as colunas necessárias. "
            "Se o esquema estiver incompatível, usa a base original e registra o motivo — "
            "a AV2 faz a própria preparação."
        ),
        codigo(
            "startups, investidores, origem = carregar_bases()\n"
            "print('Startups:', startups.shape, 'Investidores:', investidores.shape)\n"
            "print('Origem:', json.dumps(origem, ensure_ascii=False, indent=2))"
        ),
        md(
            "## 2. Feature engineering\n"
            "\n"
            "Normalização de setores/estágios, moeda, percentual e UF; deduplicação por "
            "`id_investidor`; imputação por mediana. Resultado: matriz numérica sem `NaN`."
        ),
        codigo(
            "X_completa, meta = construir_features_investidores(investidores)\n"
            "print('Matriz completa:', X_completa.shape)\n"
            "print('NaN:', int(X_completa.isna().sum().sum()))\n"
            "display(X_completa.head())"
        ),
        md(
            "## 3. Feature selection\n"
            "\n"
            "A clusterização usa apenas o perfil de interesses: 12 features. Ticket, região, "
            "experiência e volume de negócios foram descartados por já entrarem no score ou "
            "por dominarem a variância sem melhorar a separação."
        ),
        codigo(
            "X = selecionar_features(X_completa)\n"
            "print('Features usadas:', list(FEATURES_CLUSTERIZACAO))\n"
            "print('Descartadas:', [f for f in FEATURES_INVESTIDOR if f not in FEATURES_CLUSTERIZACAO])\n"
            "display(X.head())"
        ),
        md("## 4. Escolha de k (silhueta, Calinski-Harabasz e Davies-Bouldin)"),
        codigo(
            "ks = tuple(range(2, 9))\n"
            "avaliacao = avaliar_k(X, ks, seed=SEED)\n"
            "display(avaliacao)\n"
            "\n"
            "fig, eixo = plt.subplots(figsize=(7, 4))\n"
            "eixo.bar(avaliacao['k'].astype(str), avaliacao['silhueta'], color='#2f6f4f')\n"
            "eixo.set_title('Silhueta média por k')\n"
            "eixo.set_xlabel('k')\n"
            "eixo.set_ylabel('silhueta')\n"
            "plt.show()\n"
            "\n"
            "k = escolher_k(avaliacao)\n"
            "print('k escolhido:', k)"
        ),
        md("## 5. Treino, estabilidade e comparação de algoritmos"),
        codigo(
            "pipeline, rotulos = treinar_modelo(X, k, seed=SEED)\n"
            "estabilidade = avaliar_estabilidade(X, k, seed=SEED)\n"
            "comparacao = comparar_algoritmos(X, k, seed=SEED)\n"
            "print('Estabilidade (ARI):', estabilidade)\n"
            "display(comparacao)"
        ),
        md("## 6. Interpretação dos segmentos"),
        codigo(
            "from collections import Counter\n"
            "\n"
            "perfis = []\n"
            "rotulos_serie = pd.Series(rotulos, name='cluster')\n"
            "for cluster in sorted(set(rotulos)):\n"
            "    selecionados = meta.loc[rotulos_serie == cluster]\n"
            "    setores = Counter(\n"
            "        setor for lista in selecionados['setores_normalizados'] for setor in set(lista)\n"
            "    )\n"
            "    perfis.append(\n"
            "        {\n"
            "            'cluster': int(cluster),\n"
            "            'n_investidores': int(len(selecionados)),\n"
            "            'setores_top': ', '.join(nome for nome, _ in setores.most_common(3)),\n"
            "        }\n"
            "    )\n"
            "perfis = pd.DataFrame(perfis)\n"
            "display(perfis)"
        ),
        md(
            "## 7. Exportação\n"
            "\n"
            "A árvore substituta reproduz os rótulos do K-Means e é gravada em "
            "`backend/src/content/segmentos-matchmaking.json`. A fidelidade mínima estimada é 0,85; "
            "o valor real obtido está em `evidencias/metricas.json`. A árvore exportada usa 100% "
            "dos rótulos; a fidelidade é estimada em 25% não visto."
        ),
        codigo(
            "metricas = json.loads((RAIZ / 'evidencias' / 'metricas.json').read_text(encoding='utf-8'))\n"
            "print('Silhueta final:', round(metricas['silhueta_final'], 4))\n"
            "print('Fidelidade estimada:', round(metricas['fidelidade_arvore'], 3))\n"
            "print('Arquivos de evidência:')\n"
            "for caminho in sorted((RAIZ / 'evidencias').rglob('*')):\n"
            "    if caminho.is_file():\n"
            "        print(' -', caminho.relative_to(RAIZ))"
        ),
        md(
            "## Conclusão\n"
            "\n"
            "O modelo entrega seis perfis interpretáveis e um desempate auditável. "
            "Os números são moderados (silhueta 0,18; ARI 0,59), por isso a IA refina a "
            "ordenação sem alterar o score calculado pela AV1. Próximo passo: capturar "
            "desfechos reais para treinar um modelo supervisionado de propensão."
        ),
    ]

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    nbf.write(nb, SAIDA)
    print(f"Notebook gerado: {SAIDA}")


if __name__ == "__main__":
    main()
