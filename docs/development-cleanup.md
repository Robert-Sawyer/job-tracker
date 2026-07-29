# Daily cleanup (Windows, Docker Desktop and pnpm)

Docker Desktop stores its Linux images, build cache, containers and named volumes on
the system drive by default, even when this repository is on `E:`. pnpm's global store
and Corepack cache also normally live on `C:`.

## End of a normal workday

Stop this project's containers while keeping the development database:

```powershell
docker compose down
```

Remove unused build cache and dangling images (safe for the `db-data` volume):

```powershell
docker builder prune -f
docker image prune -f
pnpm store prune
```

Inspect what Docker is using before removing more:

```powershell
docker system df -v
docker ps -a
docker volume ls
```

## Occasional deep cleanup

The following removes every stopped container, unused network, unused image and unused
build cache across Docker Desktop. It does not remove the named `job-tracker_db-data`
volume, so the local Postgres data remains available.

```powershell
docker system prune -a
```

To deliberately delete this project's local database, use the project command below. It
is destructive: the next startup creates an empty database.

```powershell
docker compose down -v
docker compose up -d db
pnpm --filter @job-tracker/api db:deploy
pnpm --filter @job-tracker/api db:seed
```

`pnpm store prune` removes only packages that are no longer referenced by any installed
project. Do not delete `node_modules` daily; it creates more download and build work. If
an installation is corrupted, delete only this repository's `node_modules` and install
again with `pnpm install --frozen-lockfile`.

## Working with migration diffs locally

`prisma migrate diff --from-migrations` needs a separate shadow database. The CI workflow
creates `jobtracker_shadow` only for that check. Normal local commands such as
`pnpm --filter @job-tracker/api db:migrate` and `db:deploy` do not need
`SHADOW_DATABASE_URL`; leave it unset unless you deliberately create and configure a
separate shadow database.

## If space on C: does not return

After pruning, quit Docker Desktop fully and start it again. Docker's WSL virtual disk can
remain large until Docker/WSL compacts it. First use Docker Desktop's **Settings →
Resources → Advanced** to move the disk image to `E:` if C: is consistently too small.
Only compact the WSL disk with Docker's current documented procedure after making a backup:
it is an administrator-level maintenance operation and should not be a daily command.
