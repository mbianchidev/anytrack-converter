# Build stage
FROM rust:1-slim-bookworm AS builder

# Install dependencies for building
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src

# Build the application
RUN cargo build --locked --release

# Runtime stage
FROM python:3.15.1-slim-bookworm

# Install runtime dependencies: FFmpeg and yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && python3 -m venv /opt/yt-dlp \
    && /opt/yt-dlp/bin/pip install --no-cache-dir yt-dlp \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/yt-dlp/bin:${PATH}"

WORKDIR /app

# Copy the built binary
COPY --from=builder /app/target/release/anytrack-converter /app/anytrack-converter

# Create directories for uploads and outputs
RUN mkdir -p /app/uploads /app/outputs

# Expose the port
EXPOSE 8080

# Run the application
CMD ["/app/anytrack-converter"]
