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

| Camada | Tecnologias |
| --- | --- |
| Front-end | React.js + TypeScript (SPA), Tailwind CSS, Axios, Vite, React Router |
| Back-end | Node.js + Express, JWT, Bcrypt |
| Banco de dados | PostgreSQL + Prisma ORM |
| Infraestrutura | Docker & Docker Compose, Git / GitHub, GitHub Actions |

- **Front-end:** React + TypeScript traz interface reativa em SPA; Tailwind CSS garante design
  responsivo para desktop e celular (**RNF04** e **RNF08**); Axios padroniza o consumo das rotas.
- **Back-end:** Express por ser minimalista e performático; JWT + Bcrypt dão autenticação
  *stateless*, controle de sessão por token e hash seguro de senha (**RF07**, **RNF02**).
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

# 3. subir todo o ambiente conteinerizado
docker-compose up --build -d
```

| Serviço | Endereço |
| --- | --- |
| Front-end | http://localhost:3000 |
| API REST | http://localhost:5000/api |
| PostgreSQL | localhost:5432 |

### Migrações e banco de exemplo

```bash
# aplicar as migrações
docker-compose exec backend npx prisma migrate dev

# popular com um startup, um investidor e um match de exemplo
docker-compose exec backend npm run prisma:seed
```

### Contas de exemplo (após o seed)

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Startup | `startup@porto.digital` | `senha123` |
| Investidor | `investidor@porto.digital` | `senha123` |
| Administrador | `admin@porto.digital` | `senha123` |

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

| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| `GET` | `/health` | Status da API e do banco | não |
| `POST` | `/v1/auth/register` | Cadastro de startup / investidor | não |
| `POST` | `/v1/auth/login` | Login (devolve o JWT) | não |
| `GET` | `/v1/auth/me` | Perfil do usuário logado | sim |
| `POST` | `/v1/startups` | Cadastro de startup | não |
| `GET` | `/v1/startups` | Lista com filtros (`setor`, `estagio`, `cidade`) | não |
| `GET` | `/v1/startups/:id` | Detalhe de uma startup | não |
| `PUT` | `/v1/startups/:id` | Edita perfil | dono ou admin |
| `DELETE` | `/v1/startups/:id` | Remove perfil | dono ou admin |
| `POST` | `/v1/investors` | Cadastro de investidor anjo | não |
| `GET` | `/v1/investors` | Lista com filtros (`setor`, `estado`) | não |
| `GET` | `/v1/investors/:id` | Detalhe de um investidor | não |
| `PUT` | `/v1/investors/:id` | Edita perfil | dono ou admin |
| `DELETE` | `/v1/investors/:id` | Remove perfil | dono ou admin |
| `GET` | `/v1/matches` | Matches do usuário logado, com `score` | sim |
| `POST` | `/v1/matches/gerar` | Recalcula os matches de uma startup | sim |
| `PUT` | `/v1/matches/:id/status` | Aceita / recusa uma conexão | envolvido ou admin |
| `GET` | `/v1/messages` | Lista mensagens (com `conversaCom`) | sim |
| `GET` | `/v1/messages/conversas` | Lista as conversas do usuário | sim |
| `POST` | `/v1/messages` | Envia mensagem | sim |
| `DELETE` | `/v1/messages/:id` | Remove mensagem enviada | sim |
| `GET` | `/v1/appointments` | Lista agendamentos | sim |
| `POST` | `/v1/appointments` | Cria agendamento | sim |
| `PUT` | `/v1/appointments/:id/status` | Conclui / cancela | sim |
| `DELETE` | `/v1/appointments/:id` | Remove agendamento | sim |
| `GET` | `/v1/audit` | Logs de auditoria | **admin** |
| `DELETE` | `/v1/audit/:id` | Remove um log | **admin** |

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
(`backend/src/services/matching.service.ts`):

| Critério | Peso | Como é calculado |
| --- | --- | --- |
| Setor | 35 | o setor da startup está entre os interesses do investidor? |
| Estágio | 25 | o estágio da startup está entre os estágios de interesse? |
| Ticket | 25 | a rodada estimada cabe na faixa `ticketMin`–`ticketMax`? |
| Região | 15 | mesma UF? Se não, pelo menos os dois no Nordeste? |

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

| ID | Descrição | Implementação |
| --- | --- | --- |
| RF01 / RF02 | Cadastro de startups e investidores | Endpoints REST `POST /v1/startups` e `POST /v1/investors`, persistidos no PostgreSQL via Prisma |
| RF03 / RF04 | Matchmaking e consulta de perfis compatíveis | `GET /v1/matches` calcula pontuações de relevância e expõe os resultados no front-end |
| RF05 | Comunicação e agendamento | `POST /v1/messages` e `POST /v1/appointments` |
| RF07 | Autenticação e permissões de perfil | Middleware Express lê o JWT no header `Authorization` e filtra por `role` |
| RF08 / RNF10 | Moderação e logs de auditoria | Middleware interceptador grava as ações administrativas no banco, consultado em `/moderacao` |
| RNF05 / RNF09 | Escalabilidade e modularidade | Contêineres isolados via Docker e API REST desacoplada |
| RNF02 | Segurança de sessão | JWT com expiração + hash de senha com Bcrypt |
| RNF04 / RNF08 | Responsividade | Layout em Tailwind CSS com navegação adaptée a desktop e celular |