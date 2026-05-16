# vulf

[![web / quality](https://github.com/totallynotdavid/web-osiptel/actions/workflows/web-quality.yml/badge.svg)](https://github.com/totallynotdavid/web-osiptel/actions/workflows/web-quality.yml)
[![web / test](https://github.com/totallynotdavid/web-osiptel/actions/workflows/web-test.yml/badge.svg)](https://github.com/totallynotdavid/web-osiptel/actions/workflows/web-test.yml)

vulf is a monorepo centered on the SolidStart web application in `apps/web`.

## Setup

Install system build dependencies, then install all runtimes:

```bash
sudo apt-get install -y build-essential bison flex libreadline-dev zlib1g-dev uuid-dev
mise install
```

Initialize the database (one-time):

```bash
initdb -D ~/.local/share/vulf/pgdata --no-locale --encoding=UTF8
pg_ctl -D ~/.local/share/vulf/pgdata -l ~/.local/share/vulf/pg.log start
createdb vulf
```

Copy and fill in the environment files:

```bash
cp .env.example .env
cp apps/robot/.env.example apps/robot/.env
```

`SESSION_SECRET` and `ENCRYPTION_KEY` in `.env` each need a random 32-byte hex
string (`openssl rand -hex 32`). Set `GEONODE_USER` and `GEONODE_PASS` in
`apps/robot/.env` to your Geonode credentials.

Then install dependencies and run:

```bash
bun install
bun run dev
```

## Commands

```bash
bun run dev      # migrate, seed, web + robot
bun run test     # integration tests (auto-starts postgres on port 5433)
bun run check    # tsc + mypy
bun run lint
bun run format
```
