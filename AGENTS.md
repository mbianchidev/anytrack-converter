# AGENTS.md

## Stack & Technologies

- Backend: Rust, Actix-web, actix-multipart, FFmpeg, yt-dlp
- Frontend: React (Vite), CSS
- Deployment: Docker, Docker Compose, Nginx (prod static serving)

## Architecture Overview

- Rust API server handles uploads, conversion, and downloads.
- React SPA calls the API and manages UI state.
- Temporary files are stored in backend uploads/outputs (gitignored).

## Project Scope

In scope:
- Audio conversion and metadata updates.
- YouTube URL audio extraction.
- Single-user, local or self-hosted deployment.

Out of scope:
- User accounts, multi-tenant access, or cloud storage.
- Distributed job queues or long-running background workers.

## API Documentation

- `GET /health` -> `{ status, version }`
- `POST /api/convert` (multipart) -> `file`, `format`, `quality`, advanced options
- `POST /api/youtube` (json) -> `{ url, format, quality }`
- `POST /api/metadata` (multipart) -> `file`, optional metadata fields
- `GET /api/download/{file_id}` -> binary file

Conversion and metadata handlers use `ApiResponse` with `success`, `message`, and optional `file_id`/`original_name`. Health has its own shape and downloads are binary; framework-level failures may not be JSON.

## Directory Structure

```
anytrack-converter/
├── backend/                 # Rust API (Actix-web)
│   └── src/main.rs           # Single entry point + routes
├── frontend/                 # React app (Vite)
│   ├── src/App.jsx           # UI + client logic
│   └── src/App.css           # Styling
├── docker-compose.yml        # Local orchestration
├── README.md                 # Project overview
├── LICENSE                   # MIT License
└── .github/                  # Community files
```

## Design Principles

- Keep UX simple and fast; avoid unnecessary steps.
- Prefer clarity over cleverness; readable code first.
- Fail safely; report errors to users with clear messages.
- Clean up temporary files to prevent disk bloat.

## Backend Rules

- Validate inputs (formats, URLs) before running FFmpeg/yt-dlp.
- Use `ApiResponse` for all JSON responses.
- Do not block the Actix runtime with long sync work; use `web::block` where needed.
- Always delete temporary files after conversion completes or fails.

## Frontend Guidelines

- Accessibility: label all inputs and ensure visible focus states.
- Performance: avoid unnecessary re-renders; keep large lists virtualized if added.
- Loading speed: show progress and disable actions while requests are in flight.
- Errors: display user-friendly error messages; keep `console.error` for unexpected failures.

## Coding Style

- Rust: `rustfmt` for formatting, `clippy` for linting.
- JS/React: ESLint config in `frontend/eslint.config.js`.
- Prefer small helper functions in `App.jsx` over inline logic blocks.

## Development Documentation

- [Setup, configuration, and API reference](docs/README.md)
- [Architecture, quality checks, accessibility, and synthetic test data](docs/development.md)
- [Local container builds and release scope](docs/development.md#local-container-builds-and-releases)
- [Contribution workflow](CONTRIBUTING.md) and [AI contribution policy](README.md#ai-policy)

Run `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo build --release`, and `cargo test` from `backend/`. Run `npm ci`, `npm run lint`, and `npm run build` from `frontend/` after changing dependencies or restoring a missing install. Use synthetic media and follow [ACCESSIBILITY.md](ACCESSIBILITY.md) for UI changes.
