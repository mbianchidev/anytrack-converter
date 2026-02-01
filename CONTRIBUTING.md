# Contributing to AnyTrack Converter

Thanks for your interest in contributing! This guide helps you get set up and submit changes smoothly.

## Getting Started

### Prerequisites

- Docker + Docker Compose (recommended)
- Node.js 18+ (frontend)
- Rust toolchain (backend)
- FFmpeg and yt-dlp (for local non-Docker runs)

### Setup

```bash
git clone https://github.com/mbianchidev/anytrack-converter.git
cd anytrack-converter

docker compose up --build
```

## Development Workflow

1. Fork the repository and create a feature branch.
2. Make your changes with small, focused commits.
3. Ensure linting and basic checks pass.
4. Open a pull request with a clear summary.

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

## Communication Channels

- GitHub Issues: https://github.com/mbianchidev/anytrack-converter/issues
