# AnyTrack Converter

Convert any audio file or YouTube video to any format you want!

## Features

- 🎵 **Audio File Conversion**: Convert between MP3, WAV, FLAC, OGG, AAC, and M4A formats
- 🎬 **YouTube to Audio**: Extract audio from YouTube videos in your preferred format
- 🎚️ **Quality Control**: Adjust bitrate/quality for lossy formats (MP3, OGG, AAC, M4A)
- 📝 **Metadata Editing**: Edit artist, title, album, and genre information
- 🚀 **High Performance**: Built with Rust backend for fast processing
- 🎨 **Modern UI**: Clean and intuitive React frontend
- 🐳 **Easy Deployment**: Fully containerized with Docker Compose

## Tech Stack

- **Backend**: Rust with Actix-web
- **Frontend**: React with Vite
- **Audio Processing**: FFmpeg
- **Video Download**: yt-dlp
- **Deployment**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose installed on your system

### Running with Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/mbianchidev/anytrack-converter.git
cd anytrack-converter
```

2. Start the application:
```bash
docker-compose up --build
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

### Manual Setup

#### Backend Setup

1. Install Rust (if not already installed):
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. Install FFmpeg and yt-dlp:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install ffmpeg python3-pip
pip3 install yt-dlp

# macOS
brew install ffmpeg yt-dlp
```

3. Build and run the backend:
```bash
cd backend
cargo build --release
cargo run
```

The API will be available at http://localhost:8080

#### Frontend Setup

1. Install Node.js (v18 or higher)

2. Install dependencies and run:
```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:3000

## API Endpoints

### Health Check
```
GET /health
```

### Convert Audio File
```
POST /api/convert
Content-Type: multipart/form-data

Parameters:
- file: Audio file to convert
- format: Output format (mp3, wav, flac, ogg, aac, m4a)
- quality: Bitrate in kbps (optional, for lossy formats)
```

### Convert YouTube Video
```
POST /api/youtube
Content-Type: application/json

Body:
{
  "url": "https://www.youtube.com/watch?v=...",
  "format": "mp3",
  "quality": "192"
}
```

### Update Metadata
```
POST /api/metadata
Content-Type: multipart/form-data

Parameters:
- file: Audio file
- artist: Artist name (optional)
- title: Song title (optional)
- album: Album name (optional)
- genre: Music genre (optional)
```

### Download File
```
GET /api/download/{filename}
```

## Usage Examples

### Convert Audio File
1. Go to the "Convert Audio" tab
2. Select an audio file from your computer
3. Choose the output format
4. Adjust quality/bitrate if needed
5. Click "Convert"
6. Download the converted file

### YouTube to Audio
1. Go to the "YouTube to Audio" tab
2. Paste a YouTube video URL
3. Select the output format
4. Adjust quality/bitrate if needed
5. Click "Convert from YouTube"
6. Download the extracted audio

### Edit Metadata
1. Go to the "Edit Metadata" tab
2. Select an audio file
3. Fill in the metadata fields (artist, title, album, genre)
4. Click "Update Metadata"
5. Download the file with updated metadata

## Configuration

### Environment Variables

Backend:
- `RUST_LOG`: Log level (default: info)

Frontend:
- `VITE_API_URL`: Backend API URL (default: http://localhost:8080)

## Development

### Backend Development
```bash
cd backend
cargo watch -x run  # Auto-reload on changes
```

### Frontend Development
```bash
cd frontend
npm run dev  # Hot module replacement enabled
```

## Project Structure

```
anytrack-converter/
├── backend/
│   ├── src/
│   │   └── main.rs          # Rust backend server
│   ├── Cargo.toml           # Rust dependencies
│   ├── Dockerfile           # Backend container
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── App.css          # Styles
│   │   ├── main.jsx         # React entry point
│   │   └── index.css        # Global styles
│   ├── package.json         # Node dependencies
│   ├── vite.config.js       # Vite configuration
│   ├── nginx.conf           # Nginx config for production
│   ├── Dockerfile           # Frontend container
│   └── .dockerignore
├── docker-compose.yml       # Docker Compose configuration
├── README.md                # This file
└── LICENSE                  # MIT License
```

## Supported Formats

### Input Formats
- MP3 (MPEG Audio Layer 3)
- WAV (Waveform Audio File Format)
- FLAC (Free Lossless Audio Codec)
- OGG (Ogg Vorbis)
- AAC (Advanced Audio Coding)
- M4A (MPEG-4 Audio)
- And many more supported by FFmpeg

### Output Formats
- MP3 - Lossy compression (adjustable bitrate)
- WAV - Uncompressed audio
- FLAC - Lossless compression
- OGG - Lossy compression (adjustable bitrate)
- AAC - Lossy compression (adjustable bitrate)
- M4A - MPEG-4 audio (adjustable bitrate)

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

### Production Considerations

When deploying this application in production, please consider the following security measures:

1. **CORS Configuration**: Update the backend CORS settings to restrict allowed origins instead of using `allow_any_origin()`
2. **HTTPS**: Always use HTTPS in production environments
3. **File Upload Limits**: Configure appropriate file size limits to prevent abuse
4. **Rate Limiting**: Implement rate limiting to prevent denial of service attacks
5. **Input Validation**: Validate YouTube URLs and file types on both client and server
6. **Temporary File Cleanup**: Monitor disk space and implement cleanup policies for old files
7. **Environment Variables**: Use environment variables for sensitive configuration

### Known Limitations

- Temporary files are stored locally and should be cleaned up regularly
- No authentication/authorization system is included
- File storage is not distributed or replicated

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [FFmpeg](https://ffmpeg.org/) - Powerful multimedia framework
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube video downloader
- [Actix-web](https://actix.rs/) - Rust web framework
- [React](https://react.dev/) - Frontend library
- [Vite](https://vite.dev/) - Build tool

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

Made with ❤️ by [Matteo Bianchi](https://github.com/mbianchidev)
