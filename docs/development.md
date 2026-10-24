# Developer guide

[Documentation index](README.md) | [User guide](user-guide.md) | [Contributing](../CONTRIBUTING.md)

## Setup and architecture

Follow the [native setup](user-guide.md#native-development-setup) for Rust, Node.js, media tools, and local execution. Vite reloads frontend changes with `npm run dev`; optional backend reload uses `cargo watch -x run` after separately installing `cargo-watch`.

The React client sends files and options to the Actix API. Request handlers save uploads, run FFmpeg or yt-dlp, and return output IDs for preview and download. There is no database or background job service. New conversion controls must be wired through both the frontend form and backend command construction.

| Path | Purpose |
| --- | --- |
| [`backend/src/main.rs`](../backend/src/main.rs) | Routes, media commands, and local storage. |
| [`frontend/src/App.jsx`](../frontend/src/App.jsx) | UI state, native controls, and API calls. |
| [`frontend/src/index.css`](../frontend/src/index.css) | Shared light/dark theme tokens, focus, and reduced-motion behavior. |
| [`frontend/src/App.css`](../frontend/src/App.css) | App layout and component styling using shared tokens. |
| [`frontend/vite.config.js`](../frontend/vite.config.js) | Development server. |
| [`frontend/nginx.conf`](../frontend/nginx.conf) | Static production frontend; does not proxy the API. |
| [`docker-compose.yml`](../docker-compose.yml) | Local builds, bind mounts, ports, and health check. |

Runtime messages go to the backend terminal or container logs. Inspect browser console/network requests for client failures. [Configuration defaults and storage behavior](user-guide.md#configuration) are documented in the user guide.

## Quality checks

```bash
# From backend/
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo build --locked --release
cargo test --locked

# From frontend/ after npm ci
npm run lint
npm run build
npm audit --audit-level=low
```

There are currently no Rust unit tests or frontend test script. Use synthetic audio and mock metadata for browser/API checks; never use personal recordings or customer files. Verify successful conversion, preview, download filename, metadata updates, and failure messages.

The [CI workflow](../.github/workflows/ci.yml) runs Rust format/Clippy/build/tests, frontend install/lint/build, and no-cache Docker builds with backend/frontend HTTP startup smoke tests. All three jobs use the x64 `ubuntu-latest` image so they follow GitHub's supported Ubuntu image migrations instead of depending on a fixed release. The official checkout/cache/setup-node actions use Node.js 24; frontend builds also use Node.js 24.

CI still runs on every pull request update, including drafts, and on pushes to `main`. A new run cancels obsolete work only for the same pull request; `main` runs have independent concurrency groups and never cancel one another. The three job names and their checks are unchanged, and GitHub-managed CodeQL analysis is independent of this workflow.

Commit `backend/Cargo.lock` when updating Rust dependencies. Native CI and Docker builds use `--locked` so they resolve the same dependency versions. The Cargo cache includes downloaded crate sources and compiled dependencies, keyed by runner OS/architecture, image OS (`ImageOS`), compiler version, lockfile, manifest, and Cargo configuration. The image OS boundary prevents restoring compiled dependencies across Ubuntu release migrations while allowing reuse across image refreshes within the same release; there is no cross-image restore prefix. It excludes Cargo's executable directory so a restored cache cannot replace the selected toolchain. Cache misses still run every check; no tests or builds are skipped on hits. Rust build and test worker counts use the runner's available CPUs.

The npm cache contains downloaded packages, not `node_modules`; `npm ci` always installs dependencies for the active runner. Docker builds remain uncached against the existing container base images, so changing the host runner does not change the containers' distribution or binary ABI requirements.

## Accessibility checks

Use [ACCESSIBILITY.md](../ACCESSIBILITY.md) as the contribution target, not as a certification.

1. In an isolated browser, test both light and dark system preferences. Check every workflow and advanced settings, including selected, hover, disabled, and focus states.
2. Measure foreground/background contrast: normal text at least 4.5:1, large text and necessary control boundaries at least 3:1. Include placeholders and success/error feedback.
3. Use only the keyboard: follow the skip link, switch tool buttons with Tab and Enter/Space, operate all inputs and the bitrate slider, expand advanced controls, and reach preview/download. Tool buttons are native pressed buttons, not an ARIA tab widget.
4. Check visible focus, associated input labels, radio-group naming, expanded state, main landmark, persistent status region, and approximate progress semantics.
5. Test at a 320 CSS-pixel viewport and browser zoom up to 400%, with reduced motion enabled. Confirm controls and results do not force horizontal scrolling.
6. Test announcements and control names with a real screen reader. Automated checks and accessibility snapshots do not replace this step. Record anything not tested.

The [README screenshot](images/anytrack-converter.png) is a real conversion of a six-second synthetic tone, captured in an isolated headless browser. Refresh it when the visible interface changes; do not mock success responses or edit screenshot pixels to hide UI defects.

## Local container builds and releases

```bash
# From the repository root
docker compose build --no-cache
docker compose up -d --wait
curl --fail http://localhost:8080/health
curl --fail http://localhost:3000
docker compose down
```

The backend build and runtime stages both use Debian Bookworm; keep that distribution boundary compatible when upgrading Rust. yt-dlp is installed in `/opt/yt-dlp`, a Python virtual environment on the runtime `PATH`. The frontend builder uses Node.js 24.

The repository has source releases, not a distributed desktop app, published container registry, or signing/publishing workflow. Compose builds local service images; there is no additional release script to invoke. Do not publish images, tags, or releases as a validation step. See the [storage and network notes](user-guide.md#docker-compose-setup) before running containers. Native macOS and Linux containers are separate targets; document untested architectures.

## API

| Method and route | Request / response |
| --- | --- |
| `GET /health` | Returns `{"status":"healthy","version":"0.1.0"}`. |
| `POST /api/convert` | Multipart: `file`, `format` (default `mp3`), optional `quality` in kbps. |
| `POST /api/youtube` | JSON: `url`, `format`, optional `quality` as a string, such as `"192"`. |
| `POST /api/metadata` | Multipart: `file` and optional `artist`, `title`, `album`, `genre`. Preserves the input extension and copies audio streams. |
| `GET /api/download/{file_id}` | Use the complete returned `file_id`, including its extension. |

The conversion form also accepts `bitrate_mode` (`constant` or `variable`), `sample_rate` (default `44100`), `channels` (`1` or `2`, default `2`), and `fade_in`, `fade_out`, `reverse` as `"true"`/`"false"` strings (default `"false"`). See the [media limitations](user-guide.md#limitations-and-deployment-safety), including current fade-out behavior.

```bash
curl --fail-with-body http://localhost:8080/api/convert \
  -F 'file=@path/to/input.wav' \
  -F 'format=mp3' \
  -F 'quality=192'
```

Successful conversion response:

```json
{
  "success": true,
  "message": "Conversion successful",
  "file_id": "<uuid>.mp3",
  "original_name": "input"
}
```

```bash
curl --fail -o converted.mp3 \
  'http://localhost:8080/api/download/<file_id>'
```

YouTube JSON body:

```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "format": "mp3",
  "quality": "192"
}
```

Conversion and metadata handlers use `success`, `message`, `file_id`, and `original_name` for their JSON results. Health has its own shape; downloads are file responses, and framework-level errors may not be JSON.
