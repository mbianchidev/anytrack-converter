# User guide

[Project overview](../README.md) | [Contributing](../CONTRIBUTING.md) | [Support](../SUPPORT.md)

## Contents

- [Native development setup](#native-development-setup)
- [Docker Compose setup](#docker-compose-setup)
- [Use the app](#use-the-app)
- [Configuration](#configuration)
- [API reference](development.md#api)
- [Limitations and deployment safety](#limitations-and-deployment-safety)
- [Troubleshooting](#troubleshooting)
- [Development guide](development.md)

## Native development setup

The commands below target macOS and Linux; Windows users can use WSL2. Run them from a checkout of this repository.

### Requirements

- Available ports **3000** and **8080**, disk space for uploaded/generated files, and internet access for dependencies and YouTube downloads.
- A current stable [Rust toolchain and Cargo](https://rustup.rs/).
- [Node.js](https://nodejs.org/) **26.12.1** with npm is recommended and selected by the root [`.nvmrc`](../.nvmrc). **24+**, or **22.13+ within the 22.x line**, remain supported. Node 18 is not compatible with the current frontend tooling.
- [FFmpeg](https://ffmpeg.org/download.html) and [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation), both available on the backend process's `PATH`.

Install the media tools using your platform's package manager, for example:

```bash
# macOS with Homebrew
brew install ffmpeg yt-dlp

# Debian/Ubuntu
sudo apt-get update
sudo apt-get install ffmpeg pipx
pipx install yt-dlp
pipx ensurepath
```

Open a new terminal after `pipx ensurepath` if necessary. Check `ffmpeg -version` and `yt-dlp --version` before starting the API.

### Run the API

From the repository root:

```bash
cd backend
cargo run --release
```

The server listens on `0.0.0.0:8080` and creates `uploads/` and `outputs/` relative to its working directory. Run it from `backend/` to use the same storage locations as Compose.

### Run the frontend

In a second terminal, from the repository root, select the repository's Node.js version if you use nvm:

```bash
nvm install
nvm use
```

Then run the frontend:

```bash
cd frontend
npm ci
npm run dev
```

Open the URL Vite prints, normally **http://localhost:3000**. Both servers must remain running.

Check the API from another terminal:

```bash
curl --fail http://localhost:8080/health
```

The health response is:

```json
{"status":"healthy","version":"0.1.0"}
```

To update a source checkout, stop the servers, obtain the desired repository revision, then rerun the backend build and `npm ci` before restarting. Generated files remain in the local storage directories.

## Docker Compose setup

The backend builder and runtime both use Debian Bookworm so their glibc versions are compatible. The frontend builds with Node.js 26.12.1 and is served by Nginx. FFmpeg and an isolated yt-dlp environment using Python 3.15.1 are included in the backend image.

### Requirements

- A running Docker-compatible engine and Docker Compose v2 or later (`docker compose`).
- Linux containers. On macOS or Windows, use an engine with a Linux VM or WSL2 backend.
- Available host ports **3000** and **8080**, disk space for uploaded/generated files, and internet access for builds and YouTube downloads.

The images install Rust/Node build tools, FFmpeg, and yt-dlp; these are not needed on the host for container builds.

### Build and check

From the repository root:

```bash
docker compose build --no-cache
docker compose up -d --wait
docker compose ps
curl --fail http://localhost:8080/health
```

When the API is healthy, the frontend is at **http://localhost:3000** and the API is at **http://localhost:8080**. For startup errors, run `docker compose logs backend frontend`.

Stop the services with `docker compose down`. Uploaded and generated files are bind-mounted to `backend/uploads/` and `backend/outputs/`; stopping or rebuilding containers does not delete them. Download anything you need before removing those files.

**Network exposure:** the supplied Compose file publishes both ports on all host interfaces. For local-only access, change its port mappings to `127.0.0.1:3000:80` and `127.0.0.1:8080:8080`, or restrict access with your firewall. The native API also binds to all interfaces.

## Use the app

| Tab | Workflow |
| --- | --- |
| **Convert Audio** | Choose a file and output format, optionally adjust bitrate or advanced settings, then select **Convert**. |
| **YouTube to Audio** | Paste a video URL, choose the output format and bitrate, then select **Convert from YouTube**. |
| **Edit Metadata** | Choose a file, fill in the tags to change, then select **Update Metadata**. Blank fields are omitted, so they do not clear existing tags. |

Successful requests show a preview and **Download File** button. Browser defaults are MP3, 192 kbps, 44.1 kHz, and stereo. Advanced settings apply only to uploaded-file conversion; variable bitrate is implemented only for MP3.

MP3, OGG, AAC, and M4A expose a bitrate slider. WAV is uncompressed and FLAC is lossless. Input compatibility depends on FFmpeg; browser preview support is a separate limitation.

Downloads use `<normalized-name>_anytrack.<format>`; the app lowercases names, replaces spaces with dashes, and removes unsupported characters. Only download or convert content you have permission to use, and follow the source service's terms.

## Configuration

| Setting | Current behavior |
| --- | --- |
| `VITE_API_URL` | Browser-facing API base URL, default `http://localhost:8080`. Vite reads it when starting the dev server or building the frontend. |
| API address | Hardcoded to `0.0.0.0:8080` in `backend/src/main.rs`; there is no host/port environment setting. |
| Storage | `./uploads` and `./outputs`, relative to the backend working directory. Compose bind-mounts the matching directories under `backend/`. |
| `RUST_LOG` | Set to `info` by Compose, but the backend does not initialize a logging subscriber or read this variable. It is not currently a working log-level control. |

For native development, copy the supplied example from the repository root and edit the API URL, then restart Vite:

```bash
cp frontend/.env.example frontend/.env.local
```

For a native production build, set the URL at build time:

```bash
cd frontend
VITE_API_URL=https://api.example.com npm run build
```

**Container builds:** the frontend image serves static files with Nginx. Changing `frontend.environment.VITE_API_URL` in Compose does **not** change the already-built JavaScript. To use a different endpoint, put `VITE_API_URL=...` in `frontend/.env` before rebuilding the frontend image. The Docker build excludes `.env.local` and `.env.production.local`, but includes `.env`.

```bash
docker compose build --no-cache frontend
docker compose up -d --wait frontend
```

The URL must be reachable by the **browser**, not just by another container. If you open the UI from another machine, `localhost` refers to that machine. Nginx does not proxy `/api`; configure a reachable API URL and HTTPS for both services when needed. `VITE_` values are public client configuration, not secrets.

## Limitations and deployment safety

- **Not hardened for public access:** the API has no authentication, rate limiting, application-level upload quota, or strict URL/format validation, and CORS allows any origin. Restrict network access. Public deployment requires additional controls and HTTPS; CORS alone is not access control.
- **Local storage needs maintenance:** generated files are not automatically expired or deleted after download. Input cleanup is attempted on successful conversion and some other paths, but failures can leave uploads or partial outputs behind. Monitor both directories and remove files only when no request or download is using them.
- **Requests perform the work directly:** FFmpeg and yt-dlp run synchronously inside request handlers. There is no queue, cancellation, or per-job resource isolation. Large files can occupy a worker and consume substantial RAM, disk, and CPU.
- **Progress is approximate:** the UI simulates percentages; it does not receive actual FFmpeg or yt-dlp progress.
- **Fade-out is not an end-of-track fade:** the existing option uses `afade=t=out:d=3` without a start time, so it fades from the beginning rather than the final three seconds. Fade-in is fixed at three seconds.
- **Media support varies:** FFmpeg selects encoders from its installed build. OGG may contain FLAC rather than Vorbis, in which case the bitrate setting does not apply. Metadata support depends on the container, and some output formats cannot play in every browser. YouTube extraction downloads video before conversion and depends on yt-dlp, network access, and upstream availability. Keep the media tools current.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| The browser cannot reach the API | Run the health check, check that both servers are running, and verify the browser-facing `VITE_API_URL`. Rebuild static frontend files after changing it. |
| FFmpeg or yt-dlp cannot be started | Run `ffmpeg -version` or `yt-dlp --version` in the backend's environment; install the missing tool or correct its `PATH`. |
| An old backend image exits with a glibc error | Rebuild with `docker compose build --no-cache backend` and recreate the service. Both current backend stages use Bookworm. |
| Conversion works but preview does not play | Download the file and use a player that supports its actual codec. Browser playback support varies. |
| YouTube extraction fails | Check the returned error, network access, source restrictions, and the installed yt-dlp version. |
| Disk usage keeps increasing | Inspect both storage directories. Stop active requests and save needed downloads before removing obsolete files; there is no automatic expiry. |

For API examples and code changes, see the [developer guide](development.md). See [accessibility guidance](../ACCESSIBILITY.md) for keyboard operation and interface contribution requirements.
