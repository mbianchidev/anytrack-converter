# Quick Start Guide

## Running with Docker Compose (Recommended)

This is the easiest way to get started with AnyTrack Converter.

### Prerequisites
- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/mbianchidev/anytrack-converter.git
cd anytrack-converter
```

2. **Start the application**
```bash
docker-compose up --build
```

This will:
- Build the Rust backend with FFmpeg and yt-dlp
- Build the React frontend with Nginx
- Start both services

3. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

4. **Stop the application**
```bash
docker-compose down
```

## Manual Setup (Development)

### Backend Setup

1. **Install dependencies**
```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# FFmpeg and yt-dlp (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install ffmpeg python3-pip
pip3 install yt-dlp

# FFmpeg and yt-dlp (macOS)
brew install ffmpeg yt-dlp
```

2. **Run the backend**
```bash
cd backend
cargo run
```

Backend will run on http://localhost:8080

### Frontend Setup

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Run the frontend**
```bash
npm run dev
```

Frontend will run on http://localhost:3000

## Using the Application

### Converting Audio Files
1. Click on "Convert Audio" tab
2. Select an audio file from your computer
3. Choose the desired output format
4. Adjust quality/bitrate if needed (for lossy formats)
5. Click "Convert"
6. Download the converted file

### YouTube to Audio
1. Click on "YouTube to Audio" tab
2. Paste a YouTube video URL
3. Select the desired audio format
4. Adjust quality/bitrate if needed
5. Click "Convert from YouTube"
6. Download the extracted audio

### Editing Metadata
1. Click on "Edit Metadata" tab
2. Select an audio file
3. Fill in the metadata fields:
   - Artist
   - Title
   - Album
   - Genre
4. Click "Update Metadata"
5. Download the file with updated metadata

## Troubleshooting

### Docker Issues
- **Port already in use**: Change ports in `docker-compose.yml`
- **Build fails**: Ensure you have enough disk space and Docker is up to date

### Manual Setup Issues
- **FFmpeg not found**: Make sure FFmpeg is installed and in your PATH
- **yt-dlp not found**: Install with `pip3 install yt-dlp`
- **Backend won't start**: Check if port 8080 is available
- **Frontend won't start**: Check if port 3000 is available

## Environment Variables

### Backend
- `RUST_LOG`: Set log level (default: info)

### Frontend
- `VITE_API_URL`: Backend API URL (default: http://localhost:8080)

To use custom environment variables:

```bash
# Backend
RUST_LOG=debug cargo run

# Frontend
echo "VITE_API_URL=http://my-backend:8080" > .env.local
npm run dev
```

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check API endpoints in the README
- Configure production settings as described in the Security section
- Contribute to the project on GitHub

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review logs from backend and frontend
3. Open an issue on GitHub with details about the problem
