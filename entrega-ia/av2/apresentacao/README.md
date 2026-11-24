# Apresentação AV2 — IA no matchmaking (8 slides)

**Deck apresentável:** `Apresentacao_AV2_Matchmaking.html` — abra no navegador e navegue com `←`/`→` (ou barra de espaço). `Ctrl+P` gera o PDF com todos os slides. O HTML é gerado a partir de `evidencias/metricas.json`, então os números nunca ficam desatualizados:

```powershell
cd entrega-ia/av2
& ..\..\.venv-ia\Scripts\python.exe scripts\gerar_apresentacao.py
```

Roteiro abaixo, para quem for apresentar. Duração sugerida: 8 a 10 minutos + 3 minutos de demonstração. Orador único; indicar onde outro integrante pode assumir.

---

### Slide 1 — Problema

**Título:** Scores iguais, ordem arbitrária

- O score da AV1 combina setor, estágio, ticket e região com pesos inteiros.
- Vários investidores empatam e aparecem em ordem aleatória na API.
- Startups podem deixar de ver o investidor com maior afinidade real de portfólio.

**Orador:** apresenta o contexto do produto e mostra um exemplo de empate.

---

### Slide 2 — Escolha técnica

**Título:** Clusterizar para desempatar

- K-Means não supervisionado descobre perfis de investidores sem rótulos confiáveis.
- Classificação supervisionada foi descartada: não há desfechos ACEITO/RECUSADO confiáveis.
- LLM/embeddings foram descartados: campos são padronizados, não trariam sinal novo.
- Árvore substituta leva o modelo ao backend sem servir Python em produção.

**Orador:** justifica a ausência de rótulos e o custo das alternativas.

---

### Slide 3 — Arquitetura

**Título:** Do CSV ao JSON consumido pela API

- `dados.py` → `features.py` → `selecao.py` → `modelos.py` → `treinar.py`.
- `exportar.py` escreve `backend/src/content/segmentos-matchmaking.json`.
- `segmentos-match.service.ts` valida o JSON com Zod e percorre a árvore.
- `matching.service.ts` aplica o desempate sem tocar em score, reason ou details.

**Orador:** enfatiza o contrato entre Python (treino) e TypeScript (inferência).

---

### Slide 4 — Dados e preparação

**Título:** 400 perfis limpos, 12 features de interesse

- 1.320 startups e 445 investidores na base original da AV1; 400 investidores únicos após deduplicação.
- Normalização de setores/estágios, moeda (`R$ 120 mil`), percentual, UF e tickets invertidos.
- 20 features calculadas; 12 de perfil de interesses mantidas para clusterizar.
- Ticket, região e volume foram descartados: já estão no score ou dominam a variância.

**Orador:** mostra a tabela de features e cita o fallback para `dados/original/`.

---

### Slide 5 — Implementação

**Título:** k = 6 com validação e exportação

- `StandardScaler + KMeans(n_init=20, seed=20261006)` para k de 2 a 8.
- Escolha de k por silhueta, desempate por Calinski-Harabasz; checagem do cotovelo.
- Estabilidade por ARI em 5 reamostragens de 80%.
- Árvore de profundidade 6 treinada para reproduzir os rótulos; fidelidade mínima exigida: 0,85.

**Orador:** explica determinismo e por que a fidelidade é um gate de publicação.

---

### Slide 6 — Validação

**Título:** Evidências da camada 2

- Silhueta final **0,1804** (k=6); Calinski **46,49**; Davies-Bouldin **1,77**.
- ARI médio **0,5922** (mín. 0,385, máx. 0,673) entre reamostragens.
- K-Means **0,1804** vs Agglomerative/ward **0,1630**.
- Feature selection: **0,1585** (perfil) vs **0,0885** (todas) em k=5; fidelidade **estimada** da árvore **0,950** (25% não visto).

**Orador:** interpreta números moderados com honestidade — a IA refina, não substitui o score.

---

### Slide 7 — Resultados

**Título:** Seis segmentos interpretáveis

- Cluster 0: energia/série B (122 investidores) · Cluster 1: economia criativa/pré-seed (55).
- Cluster 2: tecnologia/série A (53) · Cluster 3: fintech/série A (63).
- Cluster 4: educação/pré-seed (53) · Cluster 5: agro/série B (54).
- O bônus de 3 pontos só atua quando o score já é igual, então nunca inverte a ordem por score.

**Orador:** mostra `evidencias/perfis_clusters.csv` e os gráficos de silhueta/cotovelo.

---

### Slide 8 — Valor e próximos passos

**Título:** Ordenação explicável hoje, aprendizado com desfechos amanhã

- Hoje: recomendação ordenada de forma reproduzível e auditável, com modelo versionado.
- Amanhã: capturar ACEITO/RECUSADO para treinar propensão supervisionada.
- Validar o desempate com A/B de taxa de resposta e reuniões agendadas.
- Monitorar silhueta/ARI e reexportar se a fidelidade cair abaixo de 0,85.

**Orador:** conecta com a entrega da AV1 e fecha com o convite para perguntas.

---

## Demonstração ao vivo (3 min)

1. `& .\.venv-ia\Scripts\python.exe -m pytest entrega-ia/av2/tests -q` — mostrar os testes verdes.
2. `cd entrega-ia/av2; & ..\..\.venv-ia\Scripts\python.exe scripts\exportar.py` — mostrar fidelidade estimada 0,950.
3. `cd ..\..\backend; npm.cmd run test:segmentos` — mostrar o desempate em ação.
4. Abrir `entrega-ia/av2/evidencias/graficos/silhueta.png` e `evidencias/perfis_clusters.csv`.

Fallback sem terminal: abrir `evidencias/metricas.json`, `evidencias/graficos/*.png` e o notebook.
