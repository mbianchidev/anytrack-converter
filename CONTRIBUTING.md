# Contributing to AnyTrack Converter

Thanks for your interest in contributing! This guide helps you get set up and submit changes smoothly.

## Getting Started

### Prerequisites

Use the current [native setup requirements](docs/user-guide.md#native-development-setup) for Rust, Node.js, FFmpeg, and yt-dlp, or follow the [Docker guide](docs/user-guide.md#docker-compose-setup).

### Setup

```bash
git clone https://github.com/mbianchidev/anytrack-converter.git
cd anytrack-converter
```

Follow the [native setup](docs/user-guide.md#native-development-setup) to start the API and frontend in separate terminals, then verify the health endpoint. See the [developer guide](docs/development.md) for architecture, quality checks, accessibility verification, and local container builds.

Coding agents must read [AGENTS.md](AGENTS.md) before editing. All contributors should follow the [AI contribution policy](README.md#ai-policy) and [Code of Conduct](CODE_OF_CONDUCT.md).

Follow [ACCESSIBILITY.md](ACCESSIBILITY.md) when changing the interface or documentation.

## Development Workflow

1. Fork the repository and create a feature branch.
2. Make your changes with small, focused commits.
3. Ensure linting and basic checks pass.
4. Open a pull request with a clear summary.

Use generated audio and mock metadata for tests. Do not include personal recordings, customer files, credentials, or other real personal data in fixtures or screenshots.

## Code Standards

### Backend (Rust)

- Format with `cargo fmt`.
- Lint with `cargo clippy`.
- Keep API responses in the `ApiResponse` shape.
- Clean up temporary files after processing.

### Frontend (React)

- Run `npm run lint` in `frontend/`.
- Keep UI logic in `App.jsx` and styles in `App.css`.
- Provide user-friendly error messages for failed operations.

## Pull Request Process

- Describe the problem and solution.
- Include testing steps or results.
- Update documentation if behavior changes.

## Issue Guidelines

- Search existing issues before opening a new one.
- Include clear reproduction steps for bugs.
- Provide expected vs actual behavior.
- Report vulnerabilities using the process in [SECURITY.md](SECURITY.md), not by publishing exploit details in ordinary issues.

## Communication Channels

- GitHub Issues: https://github.com/mbianchidev/anytrack-converter/issues
