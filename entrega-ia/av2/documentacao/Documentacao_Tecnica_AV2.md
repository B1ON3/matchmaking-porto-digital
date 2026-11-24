# AV2 — IA aplicada ao matchmaking da plataforma Laco

**Data:** 24/11/2026 · **Repositório:** `matchmaking-porto-digital` · **Pasta da entrega:** `entrega-ia/av2`

---

## 1. Problema

A regra de negócio da AV1 calcula o score de afinidade entre startup e investidor com quatro critérios — setor (35), estágio (25), ticket (25) e região (15) — mais bônus de verificação. Como os pesos são inteiros e os critérios são categóricos, **vários investidores diferentes recebem exatamente o mesmo score** para a mesma startup. Nesses empates, a API hoje devolve uma ordem arbitrária (a ordem em que o banco devolve as linhas), sem nenhum critério de negócio.

Consequência: um investidor cujo portfólio tem afinidade real com o setor da startup pode aparecer abaixo de outro que apenas bateu os mesmos critérios superficiais. A ordenação do matchmaking, que é a principal superfície de decisão do produto, fica não explicável e não reproduzível.

## 2. Quem se beneficia e que decisão a IA apoia

- **Startups:** passam a ver primeiro os investidores com perfil de portfólio mais próximo do seu setor.
- **Investidores:** recebem recomendações mais coerentes com seu histórico de interesse.
- **Administradores:** ganham um critério de desempate auditável, com modelo versionado e métricas registradas.
- **Decisão apoiada:** apenas a **ordenação** dos matches com score idêntico. A IA **não** troca o score, a justificativa (`reason`) nem os detalhes persistidos.

## 3. Por que IA (e não mais uma regra)

A regra determinística já esgota os atributos estruturados de score. O que faltava era um **agrupamento de perfis de investidores** descoberto a partir dos dados — algo que não existe como coluna no banco e não pode ser escrito à mão sem viés. Clusterização não supervisionada encontra esses perfis sem rótulos prévios, e uma árvore substituta torna o resultado utilizável em TypeScript no backend, sem servidor Python em produção.

## 4. Abordagem e alternativas consideradas

**Abordagem escolhida:** K-Means sobre 12 features do perfil de interesses dos investidores, com padronização, escolha de `k` por silhueta, validação de estabilidade por ARI, comparação com Agglomerative Clustering e exportação de uma árvore de decisão substituta em JSON (fidelidade estimada 0,95). O backend percorre a árvore para descobrir o segmento do investidor e usa os setores principais desse segmento como desempate.

| Alternativa                                           | Por que não foi escolhida                                                                                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classificação supervisionada (prever ACEITO/RECUSADO) | A base não tem desfechos confiáveis rotulados; qualquer rótulo derivado de score seria circular.                                                          |
| LLM / embeddings dos textos livres                    | Os campos relevantes (`sectorInterest`, `stageInterest`) são padronizados; embeddings adicionariam custo, latência e não determinismo sem ganho de sinal. |
| Regra manual por setor                                | Já é o que o score faz; não resolve empates e não se adapta à base.                                                                                       |
| Agglomerative (ward)                                  | Silhueta menor (0,163 contra 0,180) e custo quadrático; mantido apenas como baseline de comparação.                                                       |

## 5. Arquitetura

```text
entrega-ia/av1/dados/{original,preparada}   (CSV, fonte)
              │
              ▼
scripts/dados.py          carrega com validação de esquema (fallback para original)
              ▼
scripts/features.py       normaliza sets/estágios/moeda/UF → 20 features
              ▼
scripts/selecao.py        feature selection → 12 features de perfil de interesses
              ▼
scripts/modelos.py        StandardScaler + KMeans + métricas + ARI + baseline
              ▼
scripts/treinar.py        modelos/segmentos.joblib + evidencias/*
              ▼
scripts/exportar.py       árvore substituta → backend/src/content/segmentos-matchmaking.json
              ▼
backend/src/services/segmentos-match.service.ts   (Zod + travessia da árvore + desempate)
              ▼
backend/src/services/matching.service.ts          (ordenação final da resposta)
```

O backend continua em camadas (`routes → controllers → services → repositories`); o serviço novo não acessa Prisma e recebe somente dados já carregados. O JSON exportado é validado com Zod no carregamento do módulo — se um arquivo corrompido ou incompleto for publicado, a API falha cedo em vez de ordenar com dados inválidos.

## 6. Dados

**Origem:** `entrega-ia/av1/dados/original/startups_original.csv` (1.320 linhas) e `investidores_original.csv` (445 linhas). O carregador prefere `dados/preparada/` quando as colunas necessárias estão presentes; a versão preparada publicada pela AV1 durante o desenvolvimento tinha esquema reduzido (sem `estagios_interesse`, `ticket_*` e `uf`), então a AV2 registrou o motivo em `evidencias/metricas.json → fonte.motivo` e usou a base original. A AV2 executa sua própria preparação, de modo que o trabalho das duas avaliações pode evoluir em paralelo sem travamento.

**Atributos usados na clusterização (12):** `setor_tecnologia`, `setor_financeiro`, `setor_saude`, `setor_educacao`, `setor_agro`, `setor_criativa`, `setor_outros`, `n_setores`, `estagio_inicial`, `estagio_seed`, `estagio_expansao`, `n_estagios`.

**Atributos calculados mas descartados da clusterização (8):** `ticket_medio_log`, `ticket_amplitude`, `perfil_risco`, `experiencia_anos`, `investimentos_realizados`, `uf_pe`, `regiao_nordeste`, `modelo_b2b`. Ticket e região já entram no score da AV1; experiência e volume de negócios são ruidosos e dominavam a variância (ver §8).

**Limitações dos dados:** base simulada, sem desfechos reais de aceitação/recusa; valores sujos (`"R$ 120 mil"`, `"PE "`, `";"`/`"|"` em listas, ticket mínimo invertido) são tratados na preparação — não há campos percentuais na base de investidores; após deduplicação por `id_investidor` restaram **400 investidores** para o treino.

## 7. Preparação dos dados

- Normalização de texto com NFD + remoção de acentos + minúsculas + colapso de espaços, seguida de um mapa de aliases (`TI`, `Tech`, `SaaS` → `tecnologia`; `Finanças` → `fintech`; `SÉRIE A` → `serie a`, etc.).
- Listas de setores/estágios divididas em `[,;/|]` e deduplicadas.
- Moeda convertida para reais com sufixos `mil`, `mi`, `k`, `m`; percentuais convertidos para fração; UF por sigla ou nome; ticket invertido corrigido (mínimo ↔ máximo).
- Imputação por mediana para experiência, negócios realizados e ticket ausente; flags binárias para os demais campos.
- `X` resultante: 400 × 20, sem `NaN`, todos os dtypes numéricos. Testes em `tests/test_features.py` cobrem cada uma dessas transformações.

## 8. Implementação

1. `scripts/treinar.py` treina o pipeline `StandardScaler → KMeans(n_init=20, random_state=20261006)` para `k = 2..8`.
2. `scripts/selecao.py` escolhe o `k` de maior silhueta (desempate por Calinski-Harabasz) e restringe as features ao perfil de interesses.
3. `scripts/modelos.py` mede estabilidade com 5 reamostragens de 80% e `adjusted_rand_score`, e compara contra Agglomerative (ward) no mesmo `k`.
4. `scripts/exportar.py` ajusta `DecisionTreeClassifier(max_depth=6)` para prever os rótulos do K-Means, exige fidelidade **estimada** ≥ 0,85 em split estratificado 75/25 e grava o JSON. A árvore exportada é treinada com 100% dos rótulos; a fidelidade medida é a estimativa da configuração em dados não vistos, não a acurácia de treino da árvore implantada.
5. `backend/src/services/segmentos-match.service.ts` valida o JSON com Zod, reconstrói as 12 features a partir do investidor, percorre a árvore e devolve `bonusPorSegmento` (3 se o setor da startup está entre os três principais do cluster, 0 caso contrário).
6. `reordenarMatches` ordena por score decrescente e usa o bônus somente como critério de desempate, de forma estável e sem mutar a entrada.

## 9. Avaliação

| Métrica                        | Valor                                  | Interpretação                                                                                    |
| ------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| k escolhido                    | **6**                                  | Maior silhueta entre 2 e 8; 6 clusters com 53 a 122 investidores cada.                           |
| Silhueta final                 | **0,1804**                             | Estrutura fraca-modesta, esperada em dados simulados de perfis mistos.                           |
| Calinski-Harabasz              | **46,49**                              | Segundo maior valor (k=2 teve 47,19); o maior entre os k centrais.                               |
| Davies-Bouldin                 | **1,77**                               | Menor que a maioria dos k; quanto menor, melhor.                                                 |
| ARI médio (estabilidade)       | **0,5922** (mín. 0,3849 · máx. 0,6729) | Concordância moderada entre reamostragens — aceitável para exploração, não para decisão crítica. |
| Silhueta — KMeans vs Ward      | **0,1804 vs 0,1630**                   | K-Means vence o baseline.                                                                        |
| Silhueta k=5 — todas vs perfil | **0,0885 vs 0,1585**                   | A feature selection quase dobra a separação.                                                     |
| Fidelidade estimada da árvore  | **0,950**                              | Estimativa em 25% não visto; a árvore exportada usa 100% dos rótulos e acerta 100% no treino.    |

Evidências: `evidencias/metricas.json`, `evidencias/perfis_clusters.csv`, `evidencias/graficos/silhueta.png`, `evidencias/graficos/elbow.png`.

## 10. Resultados interpretados

Os seis segmentos são interpretáveis por setor e estágio:

| Cluster | Perfil                       | Investidores | Setores principais                |
| ------- | ---------------------------- | -----------: | --------------------------------- |
| 0       | energia · série B            |          122 | energia, saúde, varejo            |
| 1       | economia criativa · pré-seed |           55 | economia criativa, energia, saúde |
| 2       | tecnologia · série A         |           53 | tecnologia, varejo, indústria     |
| 3       | fintech · série A            |           63 | fintech, tecnologia, varejo       |
| 4       | educação · pré-seed          |           53 | educação, saúde, energia          |
| 5       | agro · série B               |           54 | agro, economia criativa, saúde    |

O cluster 0 concentra 30% dos investidores e é o mais heterogêneo — coerente com a silhueta moderada. Os clusters 2, 3 e 5 são os mais acionáveis para o desempate: setores bem definidos e estágio avançado.

## 11. Aplicação no sistema

A integração acontece em `backend/src/services/matching.service.ts`, dentro de `gerarMatchesDaStartup`:

- `resultados` passa a ser ordenado por `reordenarMatches` com o contexto `(investidor, setor da startup)`;
- a resposta final do `prisma.match.findMany` recebe o mesmo desempate, porque o `orderBy` do banco só considera `score`;
- `calculaScore`, `reason`, `details`, `createMany` e `update` permanecem intactos — os testes `matching.rules.test.ts` continuam passando sem alteração.

O JSON `backend/src/content/segmentos-matchmaking.json` versiona o modelo (`versao`, `k`, `fidelidade`, `features`, `aliases`, `segmentos`, `arvore`) e é imutável em runtime; uma nova exportação substitui o arquivo e é validada na inicialização.

## 12. Limitações

- Base simulada: não há evidência de que a afinidade de cluster aumente conversão real.
- Silhueta de 0,18 e ARI de 0,59 indicam estrutura moderada; o desempate é um refinamento, não uma mudança de score.
- K-Means assume clusters convexos e padronização euclidiana; perfis mistos (cluster 0) ficam amplos.
- A árvore substituta com profundidade 6 preserva 95% dos rótulos, mas não é o modelo original — 5% dos investidores podem cair em cluster diferente.
- O bônus de 3 é um peso de desempate escolhido heuristicamente; como só atua em scores iguais, nunca inverte a ordem por score.
- A base preparada da AV1 ainda não tem as colunas que a AV2 consome, então a fonte declarada é a original.

## 13. Próximos passos

1. Capturar desfechos reais (`ACEITO`/`RECUSADO`/`ENCONTRO_AGENDADO`) e treinar um modelo supervisionado de propensão, mantendo a clusterização como feature engineering.
2. Fazer a AV1 publicar `estagios_interesse`, `ticket_*` e `uf` na base preparada e mudar o carregador para consumi-la sem alterar o modelo (o contrato de colunas já está testado).
3. Validar o desempate com teste A/B online: taxa de resposta e reuniões agendadas por posição na lista.
4. Monitorar deriva: recalcular silhueta e ARI a cada novo lote de investidores; reexportar o JSON quando a fidelidade cair abaixo de 0,85.
5. Substituir o bônus fixo por um peso calibrado com base em dados de conversão, sem alterar a assinatura de `reordenarMatches`.

## Como reproduzir

Ver `entrega-ia/av2/README.md`. Resumo: `pytest` (Python) e `npm run test:segmentos` / `npm test` (backend).
