# AnyTrack Converter

AnyTrack Converter is a self-hosted web app for converting audio, extracting audio from YouTube videos, and updating audio metadata. A React/Vite interface sends files and URLs to a Rust/Actix-web API, which runs FFmpeg and yt-dlp on your machine.

It is intended for single-user, local or trusted-network use, not as a public conversion service. There are no accounts, cloud storage, or background job queues.

## Features

- **Audio conversion:** upload audio readable by your FFmpeg installation and export MP3, WAV, FLAC, OGG, AAC, or M4A.
- **YouTube extraction:** submit a video URL and download its audio in one of the same six formats.
- **Conversion controls:** adjust lossy bitrate, MP3 constant/variable bitrate, sample rate, mono/stereo channels, fade-in, and reverse playback for uploaded files.
- **Metadata editing:** update artist, title, album, and genre without re-encoding the audio, where the file format supports those tags.
- **Preview and download:** listen in the browser where the codec is supported, then save a file named `<normalized-name>_anytrack.<format>`.

MP3, OGG, AAC, and M4A expose a bitrate slider. WAV is uncompressed and FLAC is lossless. Input compatibility depends on FFmpeg; browser preview support is a separate limitation.

## Get started

With Git installed, clone the repository:

```bash
git clone https://github.com/mbianchidev/anytrack-converter.git
cd anytrack-converter
```

## Native development setup

The commands below target macOS and Linux; Windows users can use WSL2.

### Requirements

- Available ports **3000** and **8080**, disk space for uploaded/generated files, and internet access for dependencies and YouTube downloads.
- A current stable [Rust toolchain and Cargo](https://rustup.rs/).
- [Node.js](https://nodejs.org/) **24+**, or **22.13+ within the 22.x line**, with npm. Node 18 is not compatible with the current frontend tooling.
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

In a second terminal, from the repository root:

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

## Docker Compose setup

> **Known runtime limitation:** the backend [Dockerfile](backend/Dockerfile) builds with `rust:1.89-slim` but runs on `debian:bookworm-slim`. An ARM64 build currently exits with `GLIBC_2.39 not found` because the runtime's glibc is older than the binary requires. Image builds can succeed even though the API cannot start. Use the [native setup](#native-development-setup) until the build/runtime bases are made compatible.

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

Stop the services with `docker compose down`. Uploaded and generated files are bind-mounted to `backend/uploads/` and `backend/outputs/`; stopping or rebuilding containers does not delete them.

**Network exposure:** the supplied Compose file publishes both ports on all host interfaces. For local-only access, change its port mappings to `127.0.0.1:3000:80` and `127.0.0.1:8080:8080`, or restrict access with your firewall. The native API also binds to all interfaces.

## Use the app

| Tab | Workflow |
| --- | --- |
| **Convert Audio** | Choose a file and output format, optionally adjust bitrate or advanced settings, then select **Convert**. |
| **YouTube to Audio** | Paste a video URL, choose the output format and bitrate, then select **Convert from YouTube**. |
| **Edit Metadata** | Choose a file, fill in the tags to change, then select **Update Metadata**. Blank fields are omitted, so they do not clear existing tags. |

Successful requests show a preview and **Download File** button. Browser defaults are MP3, 192 kbps, 44.1 kHz, and stereo. Advanced settings apply only to uploaded-file conversion; variable bitrate is implemented only for MP3.

Only download or convert content you have permission to use, and follow the source service's terms.

## Configuration

| Setting | Current behavior |
| --- | --- |
| `VITE_API_URL` | Browser-facing API base URL, default `http://localhost:8080`. Vite reads it when starting the dev server or building the frontend. |
| API address | Hardcoded to `0.0.0.0:8080` in `backend/src/main.rs`; there is no host/port environment setting. |
| Storage | `./uploads` and `./outputs`, relative to the backend working directory. Compose bind-mounts the matching directories under `backend/`. |
| `RUST_LOG` | Set to `info` by Compose, but the backend does not initialize a logging subscriber or read this variable. It is not currently a working log-level control. |

For native development, copy the supplied example and edit the API URL, then restart Vite:

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

## API

| Method and route | Request / response |
| --- | --- |
| `GET /health` | Returns `{"status":"healthy","version":"0.1.0"}`. |
| `POST /api/convert` | Multipart: `file`, `format` (default `mp3`), optional `quality` in kbps and advanced fields below. |
| `POST /api/youtube` | JSON: `url`, `format`, optional `quality` as a string, such as `"192"`. |
| `POST /api/metadata` | Multipart: `file` and optional `artist`, `title`, `album`, `genre`. Preserves the input extension and copies audio streams. |
| `GET /api/download/{file_id}` | Downloads a generated file; use the complete `file_id` returned by a successful request, including its extension. |

The conversion form also accepts `bitrate_mode` (`constant` or `variable`), `sample_rate` (default `44100`), `channels` (`1` or `2`, default `2`), and `fade_in`, `fade_out`, `reverse` as `"true"`/`"false"` strings (default `"false"`). See the fade-out caveat below.

For example, convert a local file:

```bash
curl --fail-with-body http://localhost:8080/api/convert \
  -F 'file=@path/to/input.wav' \
  -F 'format=mp3' \
  -F 'quality=192'
```

A successful conversion returns JSON shaped like:

```json
{
  "success": true,
  "message": "Conversion successful",
  "file_id": "<uuid>.mp3",
  "original_name": "input"
}
```

Download using that response's `file_id`:

```bash
curl --fail -o converted.mp3 \
  'http://localhost:8080/api/download/<file_id>'
```

YouTube requests use JSON instead:

```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "format": "mp3",
  "quality": "192"
}
```

Conversion and metadata handlers use `success`, `message`, `file_id`, and `original_name` for their JSON results. The health check has its own shape; downloads are file responses, and framework-level errors may not be JSON.

## Limitations and deployment safety

- **Not hardened for public access:** the API has no authentication, rate limiting, application-level upload quota, or strict URL/format validation, and CORS allows any origin. Restrict network access. Public deployment requires additional controls and HTTPS; CORS alone is not access control.
- **Local storage needs maintenance:** generated files are not automatically expired or deleted after download. Input cleanup is attempted on successful conversion and some other paths, but failures can leave uploads or partial outputs behind. Monitor both directories and remove files only when no request or download is using them.
- **Requests perform the work directly:** FFmpeg and yt-dlp run synchronously inside request handlers. There is no queue, cancellation, or per-job resource isolation. Large files can occupy a worker and consume substantial RAM, disk, and CPU.
- **Progress is approximate:** the UI simulates percentages; it does not receive actual FFmpeg or yt-dlp progress.
- **Fade-out is not an end-of-track fade:** the existing option uses `afade=t=out:d=3` without a start time, so it fades from the beginning rather than the final three seconds. Fade-in is fixed at three seconds.
- **Media support varies:** FFmpeg selects encoders from its installed build. OGG may contain FLAC rather than Vorbis, in which case the bitrate setting does not apply. Metadata support depends on the container, and some output formats cannot play in every browser. YouTube extraction downloads video before conversion and depends on yt-dlp, network access, and upstream availability. Keep the media tools current.

## Development and project layout

The existing [CI workflow](.github/workflows/ci.yml) checks Rust formatting, Clippy, builds/tests, frontend lint/build, and Docker image builds.

```bash
# From backend/
cargo fmt --check
cargo clippy -- -D warnings
cargo build --release
cargo test

# From frontend/ after npm ci
npm run lint
npm run build
```

Vite provides frontend hot reload with `npm run dev`. Backend reload is optional via `cargo watch -x run` if you separately install `cargo-watch`.

| Path | Purpose |
| --- | --- |
| [`backend/src/main.rs`](backend/src/main.rs) | Actix routes, FFmpeg/yt-dlp commands, and local storage. |
| [`frontend/src/App.jsx`](frontend/src/App.jsx) | React interface and API calls; styles are in `App.css`. |
| [`frontend/vite.config.js`](frontend/vite.config.js) | Development server configuration. |
| [`frontend/nginx.conf`](frontend/nginx.conf) | Static frontend serving in the production image. |
| [`docker-compose.yml`](docker-compose.yml) | Service builds, published ports, storage mounts, and backend health check. |

## Documentation and contributing

Contributions are welcome. See the [contribution guide](CONTRIBUTING.md) and [code of conduct](CODE_OF_CONDUCT.md). The current setup requirements above reflect the dependency lockfile.

For help, read [SUPPORT.md](SUPPORT.md) or [open an issue](https://github.com/mbianchidev/anytrack-converter/issues). Report vulnerabilities privately using the process in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE).

## Acknowledgments

- [FFmpeg](https://ffmpeg.org/) - Powerful multimedia framework
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube video downloader
- [Actix-web](https://actix.rs/) - Rust web framework
- [React](https://react.dev/) - Frontend library
- [Vite](https://vite.dev/) - Build tool

Created by [Matteo Bianchi](https://github.com/mbianchidev).
