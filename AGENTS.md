# AGENTS.md - Development Guidelines for AnyTrack Converter

## Project Overview

AnyTrack Converter is a web application for converting audio files and extracting audio from YouTube videos. It consists of a Rust backend and a React frontend, both containerized with Docker.

## Project Structure

```
anytrack-converter/
├── backend/                 # Rust backend (Actix-web)
│   ├── src/
│   │   └── main.rs         # Main application entry point, all API routes
│   ├── Cargo.toml          # Rust dependencies
│   ├── Dockerfile          # Backend container configuration
│   ├── uploads/            # Temporary upload storage (gitignored)
│   └── outputs/            # Converted file storage (gitignored)
├── frontend/                # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx         # Main React component with all UI logic
│   │   ├── App.css         # All application styles
│   │   ├── main.jsx        # React entry point
│   │   └── index.css       # Base/global styles
│   ├── nginx.conf          # Nginx configuration for production
│   ├── package.json        # Node.js dependencies
│   └── Dockerfile          # Frontend container configuration
├── docker-compose.yml       # Container orchestration
├── README.md               # User documentation
├── QUICKSTART.md           # Quick setup guide
└── LICENSE                 # MIT License
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend | Rust + Actix-web | High-performance API server |
| Frontend | React + Vite | Modern SPA with fast HMR |
| Audio Processing | FFmpeg | Audio conversion, metadata editing |
| Video Download | yt-dlp | YouTube audio extraction |
| Container Runtime | Docker + Docker Compose | Consistent deployment |
| Frontend Server | Nginx | Static file serving, SPA routing |

## Architecture

### Backend (Port 8080)

Single-file Rust application (`main.rs`) with the following API endpoints:

- `GET /health` - Health check
- `POST /api/convert` - Convert audio files (multipart form)
- `POST /api/youtube` - Extract audio from YouTube URL (JSON)
- `POST /api/metadata` - Update audio file metadata (multipart form)
- `GET /api/download/{file_id}` - Download converted files

The backend uses:
- UUID-based file IDs for unique file naming
- Subprocess calls to FFmpeg and yt-dlp
- Automatic cleanup of input files after processing

### Frontend (Port 3000)

Single-page React application with three main features (tabs):
1. **Convert Audio** - Upload and convert audio files with format/quality options
2. **YouTube to Audio** - Extract audio from YouTube videos
3. **Edit Metadata** - Update artist, title, album, genre tags

State management is handled via React hooks (useState).

## Development Guidelines

### Running Locally

```bash
# Start both services
docker compose up --build

# Rebuild without cache (after dependency changes)
docker compose build --no-cache && docker compose up -d

# View logs
docker compose logs -f
```

### Making Changes

#### Backend Changes
1. Edit `backend/src/main.rs`
2. Rebuild: `docker compose build --no-cache backend && docker compose up -d backend`
3. Test API at http://localhost:8080

#### Frontend Changes
1. Edit files in `frontend/src/`
2. Rebuild: `docker compose build --no-cache frontend && docker compose up -d frontend`
3. View at http://localhost:3000

### Code Style

**Rust (Backend)**
- Single `main.rs` file - keep it modular with clear function separation
- Use `ApiResponse` struct for consistent JSON responses
- Clean up temporary files after processing
- Log errors to stderr with `eprintln!`

**React (Frontend)**
- Single `App.jsx` component - use helper functions for logic
- Single `App.css` file - use CSS classes, avoid inline styles
- Reset UI state when switching tabs
- Use async/await for API calls with try/catch error handling

### Adding New Features

1. **New conversion format**: Add option to format select dropdowns in `App.jsx`, update FFmpeg command in `main.rs`
2. **New API endpoint**: Add route in `main.rs`, create corresponding handler function
3. **New UI component**: Add to `App.jsx`, style in `App.css`

### Testing

- Backend: Test API endpoints directly with curl or Postman
- Frontend: Manual browser testing at localhost:3000
- Full stack: Use docker-compose for integration testing

## Environment Variables

| Variable | Service | Default | Description |
|----------|---------|---------|-------------|
| `RUST_LOG` | backend | info | Rust logging level |
| `VITE_API_URL` | frontend | http://localhost:8080 | Backend API URL |

## Common Issues

1. **Large header/cookie errors**: Nginx buffer size configured in `nginx.conf`
2. **CORS errors**: Backend allows all origins (adjust for production)
3. **yt-dlp failures**: Ensure yt-dlp is updated in the backend container

## Future Improvements

- [ ] Add batch conversion support
- [ ] Implement user authentication
- [ ] Add audio waveform visualization
- [ ] Support more video platforms
- [ ] Add conversion queue with WebSocket status updates
