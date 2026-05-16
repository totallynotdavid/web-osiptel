# vulf

vulf is a monorepo centered on the SolidStart web application in `apps/web`.

## Running locally

Use Bun `1.3.14`, run Redis locally, and set required environment values in
`.env` before starting the app. Start by copying the example file:

```bash
cp .env.example .env
```

Generate a session secret with OpenSSL and place it in `.env` as
`SESSION_SECRET`:

```bash
openssl rand -base64 32
```

Install dependencies and start development from the repository root:

```bash
bun install
bun run dev
```

`bun run dev` delegates to `apps/web` and runs migrations and seed before
starting both the web server and worker process in parallel.

## Daily commands

Use these commands from repository root:

```bash
bun run dev # runs migrate, seed, server, and worker for apps/web
bun run check
bun run lint
bun run format
bun run test
```
