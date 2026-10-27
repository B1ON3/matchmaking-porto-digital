# Matchmaking Porto Digital

Plataforma de **matchmaking para startups e investidores anjo** do ecossistema Porto Digital
(Bairro do Recife) / Economia Criativa.

A ideia é resolver o gargalo clássico de startup nascente no Nordeste: encontrar quem investe,
queminveste tempo e quem entende do negócio. A plataforma calcula um **score de afinidade** entre
cada startup e cada investidor anjo e abre o caminho pra conversa e pro agendamento.

---

## 1. Visão Geral e Contextualização da Extensão

O projeto é um ecossistema SaaS web desenhado para conectar startups nascentes do Porto Digital a
investidores anjo e mentores. A extensão busca resolver o gargalo de captação inicial e de rede de
mentoria por meio de uma plataforma com algoritmos de matchmaking baseados em critérios de
afinidade.

- **Curso:** Análise e Desenvolvimento de Sistemas (ADS) — 5º Período
- **Disciplina:** Full Stack (Unidade de Extensão)
- **Entrega:** Kickoff do Projeto

## 2. Arquitetura do Sistema e Conteinerização

Adotou-se uma **Arquitetura Desacoplada (Client-Server)** baseada em serviços RESTful totalmente
conteinerizada com Docker.

### Principais decisões arquiteturais

- **Interface RESTful puramente desacoplada.** O back-end disponibiliza endpoints HTTP
  (`GET`, `POST`, `PUT`, `DELETE`) retornando dados estritamente no formato JSON. O front-end
  consome esses serviços de forma independente, garantindo **RNF09** (modularidade /
  manutenibilidade).
- **Conteinerização com Docker.** Todo o ambiente (back-end, front-end e banco de dados) é
  orquestrado via `docker-compose`, eliminando divergência de ambiente entre desenvolvedores e
  garantindo que o sistema seja reprodutível e portável (**RNF05** e **RNF09**).

## 3. Stack Tecnológica

| Camada         | Tecnologias                                                          |
| -------------- | -------------------------------------------------------------------- |
| Front-end      | React.js + TypeScript (SPA), Tailwind CSS, Axios, Vite, React Router |
| Back-end       | Node.js + Express, JWT, Bcrypt                                       |
| Banco de dados | PostgreSQL + Prisma ORM                                              |
| Infraestrutura | Docker & Docker Compose, Git / GitHub, GitHub Actions                |

- **Front-end:** React + TypeScript traz interface reativa em SPA; Tailwind CSS garante design
  responsivo para desktop e celular (**RNF04** e **RNF08**); Axios padroniza o consumo das rotas.
- **Back-end:** Express por ser minimalista e performático; JWT + Bcrypt dão autenticação
  _stateless_, controle de sessão por token e hash seguro de senha (**RF07**, **RNF02**).
- **Banco de dados:** PostgreSQL como banco relacional robusto; Prisma abstrai a camada de dados e
  automatiza migrações.

> Foi usado `bcryptjs`, que é a implementação do mesmo algoritmo do Bcrypt em JavaScript puro —
> evita compilar binário nativo dentro do container.

## 4. Ambiente de Desenvolvimento (via Docker)

Pré-requisitos: **Docker Engine** com **Docker Compose** e **Git**.

```bash
# 1. clonar o repositório
git clone https://github.com/B1ON3/matchmaking-porto-digital.git
cd matchmaking-porto-digital

# 2. configurar as variáveis de ambiente
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2.1 gerar a chave AES-256 local e colar em DATA_ENCRYPTION_KEYS no backend/.env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. subir todo o ambiente conteinerizado
docker-compose up --build -d
```

| Serviço    | Endereço                  |
| ---------- | ------------------------- |
| Front-end  | http://localhost:3000     |
| API REST   | http://localhost:5000/api |
| PostgreSQL | localhost:5432            |

### Migrações e banco de exemplo

```bash
# aplicar as migrações
docker-compose exec backend npx prisma migrate dev

# popular com um startup, um investidor e um match de exemplo
docker-compose exec backend npm run prisma:seed

# migrar registros legados para o formato cifrado (idempotente)
docker-compose exec backend npm run backfill:encryption
```

### Contas de exemplo (após o seed)

| Perfil        | E-mail                     | Senha      |
| ------------- | -------------------------- | ---------- |
| Startup       | `startup@porto.digital`    | `senha123` |
| Investidor    | `investidor@porto.digital` | `senha123` |
| Administrador | `admin@porto.digital`      | `senha123` |

### Comandos úteis

```bash
docker-compose up --build -d      # sobe tudo em background
docker-compose logs -f backend    # acompanha o log da API
docker-compose exec backend npm run prisma:studio   # abre o Prisma Studio
docker-compose down               # derruba tudo
docker-compose down -v            # derruba tudo e apaga o volume do banco
```

## 5. Endpoints da API REST

Base: `http://localhost:5000/api` — versionada em `/v1`.

| Método   | Rota                                   | Descrição                                                    | Auth            |
| -------- | -------------------------------------- | ------------------------------------------------------------ | --------------- |
| `GET`    | `/health`                              | Status da API e do banco                                     | não             |
| `POST`   | `/v1/auth/register`                    | Cadastro de startup / investidor                             | não             |
| `POST`   | `/v1/auth/login`                       | Login (devolve o JWT)                                        | não             |
| `GET`    | `/v1/auth/me`                          | Perfil do usuário logado                                     | sim             |
| `POST`   | `/v1/startups`                         | Cadastro de startup                                          | não             |
| `GET`    | `/v1/startups`                         | Lista com filtros (`setor`, `estagio`, `cidade`)             | não             |
| `GET`    | `/v1/startups/:id`                     | Detalhe de uma startup                                       | não             |
| `PUT`    | `/v1/startups/:id`                     | Edita perfil                                                 | dono            |
| `DELETE` | `/v1/startups/:id`                     | Remove perfil                                                | dono            |
| `POST`   | `/v1/investors`                        | Cadastro de investidor anjo                                  | não             |
| `GET`    | `/v1/investors`                        | Lista com filtros (`setor`, `estado`)                        | não             |
| `GET`    | `/v1/investors/:id`                    | Detalhe de um investidor                                     | não             |
| `PUT`    | `/v1/investors/:id`                    | Edita perfil                                                 | dono            |
| `DELETE` | `/v1/investors/:id`                    | Remove perfil                                                | dono            |
| `GET`    | `/v1/matches`                          | Matches do usuário logado, com `score`                       | sim             |
| `GET`    | `/v1/matches/:id/compatibility`        | Matriz de compatibilidade do match                           | envolvido       |
| `POST`   | `/v1/matches/gerar`                    | Recalcula os matches de uma startup                          | dono da startup |
| `PUT`    | `/v1/matches/:id/status`               | Aceita / recusa uma conexão                                  | envolvido       |
| `GET`    | `/v1/messages`                         | Lista mensagens paginadas (`conversaCom`, `before`, `limit`) | sim             |
| `GET`    | `/v1/messages/conversas`               | Lista as conversas com contexto do match                     | sim             |
| `GET`    | `/v1/messages/nao-lidas`               | Conta mensagens não lidas                                    | sim             |
| `POST`   | `/v1/messages/conversas/:userId/read`  | Marca a conversa como lida                                   | sim             |
| `POST`   | `/v1/messages`                         | Envia mensagem para uma conexão válida                       | sim             |
| `DELETE` | `/v1/messages/:id`                     | Remove mensagem enviada                                      | sim             |
| `GET`    | `/v1/appointments`                     | Lista agendamentos                                           | sim             |
| `GET`    | `/v1/appointments/conflicts`           | Verifica conflito de horário                                 | sim             |
| `POST`   | `/v1/appointments`                     | Cria agendamento com duração de 30 ou 60 min                 | sim             |
| `PUT`    | `/v1/appointments/:id/status`          | Conclui / cancela com transições válidas                     | sim             |
| `DELETE` | `/v1/appointments/:id`                 | Remove agendamento                                           | sim             |
| `GET`    | `/v1/tickets`                          | Chamados abertos pelo usuário                                | sim             |
| `GET`    | `/v1/tickets/nao-lidos`                | Conta respostas não lidas da administração                   | sim             |
| `POST`   | `/v1/tickets`                          | Abre denúncia ou pedido de suporte                           | sim             |
| `GET`    | `/v1/tickets/:id`                      | Detalhe e conversa do próprio chamado                        | autor           |
| `POST`   | `/v1/tickets/:id/messages`             | Responde no chamado                                          | autor           |
| `POST`   | `/v1/tickets/:id/read`                 | Marca o chamado como lido                                    | autor           |
| `GET`    | `/v1/me/privacy`                       | Visão de privacidade, consentimentos e histórico             | sim             |
| `POST`   | `/v1/me/privacy/consents`              | Registra ou revoga consentimento                             | sim             |
| `GET`    | `/v1/me/privacy/export`                | Exporta os dados pessoais (JSON)                             | sim             |
| `DELETE` | `/v1/me/privacy/account`               | Exclui a conta e anonimiza dados                             | sim             |
| `GET`    | `/v1/me/verification`                  | Situação do selo de perfil verificado                        | sim             |
| `POST`   | `/v1/me/verification`                  | Envia documentos e provas para receber o selo                | sim             |
| `GET`    | `/v1/audit`                            | Logs de auditoria                                            | **admin**       |
| `DELETE` | `/v1/audit/:id`                        | Remove um log                                                | **admin**       |
| `GET`    | `/v1/admin/overview`                   | Visão agregada do ecossistema                                | **admin**       |
| `GET`    | `/v1/admin/users`                      | Consulta de pessoas e reputação                              | **admin**       |
| `PATCH`  | `/v1/admin/users/:id/status`           | Suspende ou reativa uma conta                                | **admin**       |
| `GET`    | `/v1/admin/tickets`                    | Fila de chamados do help desk                                | **admin**       |
| `GET`    | `/v1/admin/tickets/:id`                | Chamado com contexto autorizado da pessoa denunciada         | **admin**       |
| `POST`   | `/v1/admin/tickets/:id/messages`       | Resposta da administração no chamado                         | **admin**       |
| `PATCH`  | `/v1/admin/tickets/:id/status`         | Atualiza status, resolução e histórico                       | **admin**       |
| `POST`   | `/v1/admin/tickets/:id/actions`        | Suspensão, ocultação, reputação e observações                | **admin**       |
| `GET`    | `/v1/admin/verifications`              | Fila de pedidos de selo de perfil                            | **admin**       |
| `GET`    | `/v1/admin/verifications/:id`          | Detalhe do pedido com provas e perfil                        | **admin**       |
| `POST`   | `/v1/admin/verifications/:id/decision` | Aprova ou recusa o selo (motivo obrigatório)                 | **admin**       |

> O administrador **não** acessa `/v1/matches`, `/v1/messages` ou `/v1/appointments` de terceiros.
> Conexões e reuniões de uma pessoa só aparecem em `/v1/admin/tickets/:id`, a partir de uma
> denúncia aberta, e cada acesso é registrado na auditoria.

### Exemplo de autenticação

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"startup@porto.digital","password":"senha123"}'
```

Depois é só mandar o token no header:

```bash
curl http://localhost:5000/api/v1/matches \
  -H "Authorization: Bearer <seu-token>"
```

## 6. Algoritmo de Matchmaking

O score é uma média ponderada de quatro critérios de afinidade
(`backend/src/services/matching.rules.ts`):

| Critério | Peso    | Como é calculado                                           |
| -------- | ------- | ---------------------------------------------------------- |
| Setor    | 35      | o setor da startup está entre os interesses do investidor? |
| Estágio  | 25      | o estágio da startup está entre os estágios de interesse?  |
| Ticket   | 25      | a rodada estimada cabe na faixa `ticketMin`–`ticketMax`?   |
| Região   | 15      | mesma UF? Se não, pelo menos os dois no Nordeste?          |
| Selo     | +5/lado | perfil verificado pela administração (bônus máximo de 10)  |

O selo é um bônus de confiança: quando já existe afinidade entre os dois lados,
soma 5 pontos por perfil verificado, e o resultado final é limitado a 100. Sem
nenhuma afinidade o selo não cria conexão artificial. A aprovação do selo
recalcula os matches da pessoa para refletir o novo peso.

A faixa de resultado vai de 0 a 100 e vem sempre acompanhada de um texto explicando **por que**
aquele par tem aquela pontuação — o objetivo é o usuário entender o resultado, não só receber uma
nota.

## 7. Estrutura do Repositório Git

```
matchmaking-porto-digital/
├── .github/
│   └── workflows/            # CI/CD (typecheck, build e build das imagens)
├── backend/
│   ├── prisma/               # schema, migrações e seed
│   ├── src/
│   │   ├── config/           # variáveis de ambiente e conexão
│   │   ├── controllers/      # processamento das requisições/respostas
│   │   ├── middlewares/      # JWT, controle de acesso e auditoria
│   │   ├── routes/           # endpoints da API REST
│   │   ├── services/         # lógica de negócio (matchmaking, token, senha)
│   │   ├── utils/            # helpers
│   │   └── server.ts         # ponto de inicialização do Express
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/       # componentes reutilizáveis
│   │   ├── context/          # contexto de autenticação
│   │   ├── pages/            # Dashboard, Perfil, Matchmaking, Moderação...
│   │   ├── services/         # conexão HTTP REST (Axios)
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml        # orquestração de Front, Back e Banco
├── .gitignore
└── README.md
```

## 8. Mapeamento de Cobertura dos Requisitos

| ID            | Descrição                                    | Implementação                                                                                   |
| ------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| RF01 / RF02   | Cadastro de startups e investidores          | Endpoints REST `POST /v1/startups` e `POST /v1/investors`, persistidos no PostgreSQL via Prisma |
| RF03 / RF04   | Matchmaking e consulta de perfis compatíveis | `GET /v1/matches` calcula pontuações de relevância e expõe os resultados no front-end           |
| RF05          | Comunicação e agendamento                    | `POST /v1/messages` e `POST /v1/appointments`                                                   |
| RF07          | Autenticação e permissões de perfil          | Middleware Express lê o JWT no header `Authorization` e filtra por `role`                       |
| RF08 / RNF10  | Moderação e logs de auditoria                | Middleware interceptador grava as ações administrativas no banco, consultado em `/moderacao`    |
| RNF05 / RNF09 | Escalabilidade e modularidade                | Contêineres isolados via Docker e API REST desacoplada                                          |
| RNF02         | Segurança de sessão                          | JWT com expiração + hash de senha com Bcrypt                                                    |
| RNF04 / RNF08 | Responsividade                               | Layout em Tailwind CSS com navegação adaptée a desktop e celular                                |

## 9. Deploy na Vercel (frontend + backend)

O repositório é publicado como **dois projetos Vercel independentes**, cada um com seu `package.json`.

### Backend (API)

- **Root Directory:** `backend`
- **Framework Preset:** `Express` (detecta `src/server.ts` e serve o app em todas as rotas)
- **Build Command:** `npm run build` (padrão do preset)
- **Install Command:** `npm install` (o `postinstall` roda `prisma generate`)

> Não crie a pasta `api/` nem um `vercel.json` com `functions`. O preset Express já
> expõe `src/server.ts` em `/*` e o próprio app monta as rotas em `/api`; uma função
> catch-all em `api/` sombreia esse caminho e quebra o build/deploy.

Environment Variables (Production e Preview):

| Variável                         | Valor                                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                   | connection string do Supabase (use o pooler: `...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`) |
| `JWT_SECRET`                     | chave forte, diferente da de desenvolvimento                                                                           |
| `JWT_EXPIRES_IN`                 | `1d`                                                                                                                   |
| `PASSWORD_RESET_EXPIRES_MINUTES` | `30`                                                                                                                   |
| `CORS_ORIGIN`                    | `https://matchmaking-frontend-ochre.vercel.app,https://matchmaking-frontend-*.vercel.app`                              |
| `DATA_ENCRYPTION_KEYS`           | keyring JSON `{"<kid>":"<chave base64 de 32 bytes>"}` com todas as chaves ainda necessárias para leitura               |
| `DATA_ENCRYPTION_ACTIVE_KID`     | kid usado nas novas gravações (ex.: `prod-2026-10`)                                                                    |
| `NODE_ENV`                       | `production`                                                                                                           |

> No Supabase, use `sslmode=require` na conexão do runtime. O pooler (`:6543`) é indicado para a API; migrações usam a porta direta `:5432`.

Migrations devem rodar com a conexão direta do Supabase (porta `5432`), não com o pooler:

```bash
cd backend
DATABASE_URL="postgresql://...@...supabase.com:5432/postgres" npm run prisma:deploy
```

> Sem o domínio do front no `CORS_ORIGIN`, o navegador bloqueia as chamadas.
> O `*` cobre exatamente um nível de subdomínio, o que inclui os previews
> (`matchmaking-frontend-git-main-b1on3.vercel.app`).

### Frontend (SPA)

- **Root Directory:** `frontend`
- **Framework:** Vite (build `npm run build`, output `dist`)
- **Environment Variable:** `VITE_API_URL=https://<projeto-backend>.vercel.app/api` (Production e Preview)

O valor é embutido no bundle durante o build: ao trocar a URL da API, faça um redeploy sem cache.

### Como a URL da API é resolvida

| Ambiente                | `VITE_API_URL`                     | URL usada             |
| ----------------------- | ---------------------------------- | --------------------- |
| Local (`npm run dev`)   | `http://localhost:5000/api`        | localhost             |
| Vercel                  | `https://<backend>.vercel.app/api` | backend publicado     |
| Produção sem a variável | ausente                            | `/api` (mesma origem) |

### Checklist de validação

- [ ] `GET https://<backend>.vercel.app/api/health` responde `banco: online`
- [ ] O front publicado chama a API sem erro de CORS (aba Network)
- [ ] Preview deployments também funcionam

## 10. Criptografia em repouso e rotação de chaves

Mensagens, descrições de reunião e IP/user-agent de auditoria são gravados com
**AES-256-GCM**. O formato versionado `enc:v1:<kid>:<iv>:<tag>:<ciphertext>`
permite ler registros antigos durante a rotação. Texto legado sem o prefixo
continua legível até ser migrado pelo backfill.

```bash
# gerar uma chave AES-256 (32 bytes em base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# simular a migração, sem gravar
docker-compose exec backend npm run backfill:encryption -- --dry-run

# migrar registros em texto claro
docker-compose exec backend npm run backfill:encryption
```

O comando é idempotente: registros já cifrados com o `kid` ativo são ignorados.
Para rotacionar:

1. Gere uma nova chave e adicione-a ao JSON de `DATA_ENCRYPTION_KEYS`, mantendo
   a chave antiga no keyring.
2. Troque `DATA_ENCRYPTION_ACTIVE_KID` para o novo `kid` e faça o deploy.
3. Rode `npm run backfill:encryption -- --rewrap` para recifrar os registros
   antigos com a chave ativa.
4. Confirme que o modo `--dry-run --rewrap` retorna `total: 0`.
5. Após a janela de segurança e o fim dos backups antigos, remova a chave
   anterior do keyring.

**Limitação:** sem nenhuma chave válida do keyring, o conteúdo restrito é
irrecuperável. Guarde as chaves em um cofre de segredos e nunca as commite.
Sem `DATA_ENCRYPTION_KEYS`/`DATA_ENCRYPTION_ACTIVE_KID` a API ainda sobe e o
`/api/health` mostra `criptografia.configurada: false`; nesse estado, rotas que
cifram ou decifram conteúdo respondem `503 CRIPTOGRAFIA_INDISPONIVEL` (é o caso
de `/v1/messages/conversas`). Configure o mesmo keyring do `backend/.env` na
Vercel para reativar mensagens em produção. O Helmet aplica
HSTS em produção, o CORS é restrito por origem e os logs HTTP registram apenas
método, caminho sem query string, status e tempo de resposta.
