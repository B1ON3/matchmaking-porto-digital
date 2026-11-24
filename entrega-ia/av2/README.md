# AV2 — IA aplicada ao matchmaking

Clusterização não supervisionada dos investidores do Porto Digital para desempatar matches com score idêntico. A entrega contém código, testes, evidências, notebook, documentação técnica, apresentação e integração com o backend.

## Pré-requisitos

- Python 3.12
- Node.js 20+ e dependências do backend já instaladas (`cd backend && npm install`)
- Bases da AV1 em `entrega-ia/av1/dados/` (a AV2 prefere `preparada/` e cai para `original/` quando o esquema não serve)

## Instalação

```powershell
# na raiz do repositório (PowerShell)
python -m venv .venv-ia
& .\.venv-ia\Scripts\python.exe -m pip install -r entrega-ia/av2/requirements.txt
```

## Execução

```powershell
# 1) treinar modelo e gerar evidências
cd entrega-ia/av2
& ..\..\.venv-ia\Scripts\python.exe scripts\treinar.py

# 2) exportar árvore substituta para o backend
& ..\..\.venv-ia\Scripts\python.exe scripts\exportar.py

# 3) gerar o notebook e o deck de apresentação
& ..\..\.venv-ia\Scripts\python.exe scripts\gerar_notebook_av2.py
& ..\..\.venv-ia\Scripts\python.exe scripts\gerar_apresentacao.py

# 4) testes Python
cd ..\..\  # volta à raiz
& .\.venv-ia\Scripts\python.exe -m pytest entrega-ia/av2/tests -q

# 5) testes e validação do backend
cd backend
npm.cmd run test:segmentos
npm.cmd run test:matching
npm.cmd run typecheck
npm.cmd test

# 6) formatação e lint — rodar na raiz do repositório
cd ..
npm.cmd run format
npm.cmd run lint
```

> No PowerShell use `npm.cmd` (a política de execução bloqueia `npm.ps1`). Os scripts `format` e `lint` existem apenas no `package.json` da raiz.

## Saídas geradas

| Caminho                                           | Conteúdo                                                     |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `scripts/dados.py`                                | carregamento das bases da AV1 com validação de esquema       |
| `scripts/features.py`                             | normalização, parsing de moeda/UF e 20 features              |
| `scripts/selecao.py`                              | feature selection (12 features) e escolha de `k`             |
| `scripts/modelos.py`                              | K-Means, métricas, estabilidade ARI e baseline Agglomerative |
| `scripts/treinar.py`                              | pipeline completo de treino                                  |
| `scripts/exportar.py`                             | árvore substituta + JSON para o backend                      |
| `scripts/gerar_apresentacao.py`                   | deck HTML com métricas reais                                 |
| `modelos/segmentos.joblib`                        | pipeline treinado                                            |
| `evidencias/metricas.json`                        | todas as métricas e a origem dos dados                       |
| `evidencias/perfis_clusters.csv`                  | interpretação dos 6 clusters                                 |
| `evidencias/graficos/silhueta.png`, `elbow.png`   | gráficos de seleção de `k`                                   |
| `notebook/AV2_Clusterizacao_Investidores.ipynb`   | notebook executável                                          |
| `documentacao/Documentacao_Tecnica_AV2.md`        | documentação técnica (13 itens)                              |
| `apresentacao/Apresentacao_AV2_Matchmaking.html`  | deck de 8 slides (navegação por teclado e impressão em PDF)  |
| `apresentacao/README.md`                          | roteiro de 8 slides para o orador                            |
| `backend/src/content/segmentos-matchmaking.json`  | modelo exportado consumido pela API                          |
| `backend/src/services/segmentos-match.service.ts` | validação Zod, travessia da árvore e desempate               |

## Resultados resumidos

- 400 investidores após deduplicação; `k = 6`; silhueta **0,1804**; ARI médio **0,5922**.
- K-Means (0,1804) supera Agglomerative/ward (0,1630).
- Perfil de interesses (0,1585 em k=5) supera todas as features (0,0885).
- Fidelidade **estimada** da árvore substituta: **0,950** em 25% não visto (a árvore exportada é treinada com 100% dos rótulos).
- Integração **não altera** score, `reason` nem `details` — apenas desempata scores iguais.

## Documentação

Leia `documentacao/Documentacao_Tecnica_AV2.md` para problema, abordagem, arquitetura, dados, preparação, implementação, avaliação, resultados, aplicação, limitações e próximos passos.
