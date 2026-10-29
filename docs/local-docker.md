# Track the local game with Docker Desktop

Use Docker Desktop's Linux-container engine and Docker Compose v2. The game appears in **Docker Desktop → Containers → fruit-box → game** (container name `fruit-box-game-1`). That view shows whether it is running, its published port, logs and start/stop controls. This is the local development/test server, not a production hosting or automatic-deployment decision.

Run these commands from the repository root:

| Action | Command |
| --- | --- |
| Build and start in the background | `docker compose up --build --detach --wait` |
| See running status, health and port | `docker compose ps` |
| Include stopped containers | `docker compose ps --all` |
| See all Docker containers across projects | `docker ps --all` |
| Follow game logs (Ctrl+C only stops following logs) | `docker compose logs --follow game` |
| Stop, keeping the visible container record | `docker compose stop` |
| Start that stopped container | `docker compose start --wait` |
| Stop and remove this project's containers/network | `docker compose down` |

`restart: "no"` means the game will not automatically restart after stopping or after Docker restarts. Detached start deliberately leaves it running after the terminal/chat closes. Use **Stop** in Docker Desktop or `docker compose stop` when done. A stopped record stays in the Containers view until removed. `docker compose down` does not delete the source or built image. Stopping/recreating the server ends in-memory matches; no game persistence or live deployment migration is implied.

Open http://localhost:2567 on this computer. For a phone on the same Wi-Fi, use this computer's current Wi-Fi IPv4 address with `http://` and port `2567`; `localhost` on a phone refers to the phone. The default published binding permits LAN access, matching the owner's current phone-testing request. No router forwarding/firewall rules are configured. Existing Windows/network policy may affect phone access.

## Optional binding and port

PowerShell, for access from this computer only or a port conflict:

```powershell
$env:FRUIT_BOX_BIND = '127.0.0.1'
$env:FRUIT_BOX_PORT = '2568'
docker compose up --build --detach --wait
```

Open http://localhost:2568 for that configuration. Clear these overrides to return to the normal LAN port:

```powershell
Remove-Item Env:FRUIT_BOX_BIND -ErrorAction SilentlyContinue
Remove-Item Env:FRUIT_BOX_PORT -ErrorAction SilentlyContinue
docker compose up --detach --wait
```

Changing binding/port recreates the container. Compose `start` keeps its existing configuration; use `up --build` after source changes because no host-source bind mount or hot reload is configured. Docker must be running; `docker desktop start` starts an installed Desktop engine. If port 2567 is occupied by a previous bare Node server, stop that verified game process first or use the alternate port; do not end unrelated processes. Docker tracks only servers running as containers, not arbitrary host Node/Python processes.

## Image and verification

The Node base image is pinned by digest; updating that digest is an explicit maintenance change.

The multi-stage [Dockerfile](../Dockerfile) builds the browser and TypeScript server with the lockfile, then installs production dependencies in a separate non-root Node 22 runtime. It includes the browser files, compiled rules/server and upstream MIT notice. A whitelist [.dockerignore](../.dockerignore) excludes Git, environment files, credentials, local dependencies, screenshots and unrelated workspace data from the context. A root-page healthcheck gives an explicit healthy/unhealthy status; HTTP health alone is not proof of multiplayer correctness.

[The container smoke check](../scripts/check_container.mjs) validates page, bundle, CSS, MIT notice and real SDK guests starting a match, seeing the same board, pausing/resuming and reconnecting through the published HTTP/WebSocket port. Run `node scripts/check_container.mjs` with a healthy default-port container, or set `FRUIT_BOX_TEST_URL` for an alternate test address. The script creates temporary matches; stopping the local test container cleans them up. CI checks the Linux build, smoke flow and stop/start, with teardown even on failure. The existing cross-platform game checks remain required too.

The source `web/` files and dependency manifests must be available in the build context; the runtime serves no repository/secret directories. The image is a local artifact, not published to a registry by this workflow. Existing physical-phone interaction acceptance remains in issue 3; changing the process manager does not supply that evidence.

References: [Docker Desktop Containers view](https://docs.docker.com/desktop/use-desktop/container/), [Compose stop](https://docs.docker.com/reference/cli/docker/compose/stop/), [Compose down](https://docs.docker.com/reference/cli/docker/compose/down/).
