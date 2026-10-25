# Diretrizes de engenharia — Laco (matchmaking-porto-digital)

Plataforma de matchmaking entre startups e investidores anjo (Porto Digital).

## Stack

- **Backend:** Node.js + Express 4 + TypeScript (strict), Prisma ORM, PostgreSQL, Zod, JWT, Helmet.
- **Frontend:** React + TypeScript, Vite, Tailwind CSS 3, React Router, Axios.
- **Infra:** Docker Compose, GitHub Actions, deploy Vercel (front + API) e Supabase (banco).

## Regras obrigatorias

1. **Tipagem estrita.** `strict: true` em todas as camadas. Nao use `any`; prefira `unknown` + narrowing ou tipos explicitos. Tipos compartilhados ficam em `frontend/src/types` (front) e nos DTOs/services (back).
2. **Arquitetura em camadas.** `routes -> controllers -> services -> repositories`.
   - Controller: so HTTP (parse Zod, chamar service, responder status/JSON).
   - Service: regra de negocio pura, sem `Request`/`Response`.
   - Repository: unico lugar que fala com o Prisma.
   - Codigo existente ainda acessa Prisma direto no controller: **codigo novo deve seguir as camadas** e migracoes de divida tecnica devem ser incrementais.
3. **Validacao de entrada com Zod** em toda rota REST (body, params e query). Erros de validacao sobem como `ZodError` e sao tratados por `error.middleware.ts`.
4. **Estilizacao com React + Tailwind CSS**, mobile-first e responsiva. Reutilize os componentes de `frontend/src/components` antes de criar novos; respeite os tokens de tema (`areia`/`noite`) e o dark mode.
5. **Prettier + ESLint obrigatorios.** Antes de concluir qualquer tarefa: `npm run format` e `npm run lint`. Nenhum aviso novo de lint pode ser introduzido.
6. **Erros padronizados** via `HttpError` (status + mensagem em portugues, sem detalhes internos). Nunca vaze stack trace na resposta HTTP.
7. **Segredos nunca no repositorio.** Use `.env` (ignorado pelo Git) e mantenha `.env.example` atualizado. Nunca commite tokens de Vercel, Supabase ou JWT.
8. **Testes:** novas regras de negocio em `services` devem vir com teste (padrao atual: `matching.rules.test.ts`).

## Comandos

```bash
npm install                 # tooling raiz (prettier, eslint)
npm run format              # Prettier em todo o repo
npm run lint                # ESLint em todo o repo
npm run typecheck           # tsc --noEmit no backend e no frontend

cd backend && npm run dev   # API em http://localhost:5000/api
cd frontend && npm run dev  # SPA em http://localhost:3000

cd backend && npm run prisma:deploy && npm run prisma:seed
```

No PowerShell use `npm.cmd` (execution policy bloqueia `npm.ps1`).
