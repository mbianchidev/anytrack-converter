# AGENTS.md - AI Agent Guide for anytrack-converter

This document provides comprehensive guidance for AI coding agents working on the anytrack-converter codebase.

## Project Overview

**anytrack-converter** is an audio and video conversion tool designed to convert any audio file or YouTube video into various formats.

- **Repository**: mbianchidev/anytrack-converter
- **License**: MIT License
- **Author**: Matteo Bianchi
- **Description**: Convert any audio file or YouTube video, in anything you want!

## Current Project State

**Status**: Early-stage/Bootstrap phase

As of the current state, this repository contains:
- `README.md` - Basic project description
- `LICENSE` - MIT License file
- `AGENTS.md` - This file

⚠️ **Important**: The project is in its initial stages with no source code yet. AI agents should be prepared to help bootstrap the project structure from scratch.

## Expected Project Structure

Based on the project description (audio/video conversion tool), the following structure is anticipated:

```
anytrack-converter/
├── src/                    # Source code directory
│   ├── converters/        # Audio/video conversion modules
│   ├── downloaders/       # YouTube downloader functionality
│   ├── utils/             # Utility functions
│   └── main.*             # Entry point
├── tests/                 # Test files
├── docs/                  # Documentation
├── examples/              # Usage examples
├── config/                # Configuration files
├── .github/               # GitHub workflows and templates
│   └── workflows/         # CI/CD pipelines
├── README.md              # Project overview
├── LICENSE                # MIT License
├── AGENTS.md              # This file
└── [build/config files]   # Package.json, requirements.txt, Cargo.toml, etc.
```

## Tech Stack Considerations

Since the codebase is not yet implemented, AI agents should consider the following when suggesting or implementing technology choices:

### Recommended Languages
- **Python**: Excellent libraries for audio/video processing (FFmpeg, youtube-dl/yt-dlp, pydub)
- **Node.js/TypeScript**: Good for CLI tools and cross-platform compatibility
- **Go**: Great for fast, standalone binaries
- **Rust**: Performance-critical operations

### Key Dependencies (Expected)
Regardless of language choice, this project will likely need:
- **FFmpeg**: Core audio/video conversion engine
- **YouTube downloader**: yt-dlp (Python) or similar library
- **CLI framework**: For command-line interface
- **Audio/video processing libraries**: Format detection, metadata handling

## Navigation Guidance

### File Location Patterns

When the project is developed, follow these conventions:

- **Source Code**: `src/` or language-specific directory
- **Tests**: `tests/` or `__tests__/` (mirror structure of src/)
- **Configuration**: Root level or `config/` directory
- **Documentation**: `docs/` or inline in README.md
- **Examples**: `examples/` directory
- **CI/CD**: `.github/workflows/`

### Finding Specific Components

| Component Type | Expected Location | Naming Pattern |
|---------------|-------------------|----------------|
| Converters | `src/converters/` | `*_converter.*` or `convert_*.* ` |
| Downloaders | `src/downloaders/` | `*_downloader.*` or `download_*.*` |
| Tests | `tests/` | `test_*.*` or `*.test.*` or `*_test.*` |
| CLI Entry | `src/` or root | `main.*`, `cli.*`, `index.*` |
| Utilities | `src/utils/` or `src/helpers/` | Descriptive names |

## Coding Conventions

### To Be Established

When creating the codebase, AI agents should:

1. **Follow language-specific best practices**
   - Use linters and formatters (ESLint, Prettier, Black, rustfmt, etc.)
   - Follow official style guides

2. **Code Organization**
   - Separate concerns (download, convert, output)
   - Keep functions small and focused
   - Use meaningful variable and function names

3. **Documentation**
   - Document public APIs
   - Add inline comments for complex logic
   - Keep README.md updated with usage examples

4. **Error Handling**
   - Handle network failures gracefully
   - Provide clear error messages
   - Log errors appropriately

5. **Testing**
   - Write unit tests for core functionality
   - Add integration tests for conversion workflows
   - Mock external dependencies (YouTube API, file system)

## Build and Run Instructions

### To Be Added

When implementing the project, include:

1. **Installation Instructions**
   ```bash
   # Example structure (language-dependent)
   # Clone the repository
   git clone https://github.com/mbianchidev/anytrack-converter.git
   cd anytrack-converter
   
   # Install dependencies
   [npm install / pip install -r requirements.txt / cargo build]
   ```

2. **Running the Application**
   ```bash
   # Example usage pattern
   [npm start / python main.py / cargo run] [arguments]
   ```

3. **Building/Testing**
   ```bash
   # Build
   [npm run build / python setup.py build / cargo build --release]
   
   # Test
   [npm test / pytest / cargo test]
   
   # Lint
   [npm run lint / flake8 / cargo clippy]
   ```

## Special Considerations for AI Agents

### 1. Bootstrap Priority

When starting development, establish in this order:
1. Choose primary programming language
2. Set up project structure
3. Configure build tools and dependency management
4. Add linting and formatting tools
5. Set up testing framework
6. Implement core conversion functionality
7. Add YouTube downloading capability
8. Create CLI interface
9. Add CI/CD pipeline

### 2. External Dependencies

- **FFmpeg**: Must be available on the system or bundled
- **YouTube downloaders**: Consider legal implications and terms of service
- **Format support**: Prioritize common formats (MP3, MP4, WAV, AAC)

### 3. Cross-Platform Compatibility

- Ensure the tool works on Windows, macOS, and Linux
- Handle path separators correctly
- Consider packaging as standalone executable

### 4. Performance Considerations

- Large file handling (streaming vs. loading into memory)
- Parallel processing for batch conversions
- Progress indicators for long operations
- Temporary file cleanup

### 5. Security Considerations

- **Input validation**: Sanitize file paths and URLs
- **Command injection**: Be careful when calling external tools like FFmpeg
- **File system access**: Limit to intended directories
- **Network requests**: Validate and sanitize YouTube URLs

### 6. User Experience

- Clear command-line interface
- Helpful error messages
- Progress bars for downloads and conversions
- Support for common use cases with minimal flags

### 7. License Compliance

- MIT License allows commercial use and modification
- Ensure any dependencies are compatible with MIT
- Check licenses of FFmpeg and YouTube downloader libraries

## Development Workflow

### For AI Agents Making Changes

1. **Before Making Changes**
   - Understand the current project state
   - Check for existing tests
   - Review coding conventions in existing code

2. **When Adding Features**
   - Start with tests (TDD approach preferred)
   - Implement minimal working version
   - Add error handling
   - Update documentation
   - Run all tests

3. **When Fixing Bugs**
   - Add a failing test that reproduces the bug
   - Fix the bug
   - Verify the test passes
   - Check for similar issues elsewhere

4. **Pull Request Guidelines**
   - Keep changes focused and minimal
   - Update relevant documentation
   - Ensure all tests pass
   - Follow existing code style

## Project Roadmap Suggestions

For AI agents considering what to implement:

### Phase 1: Foundation
- [ ] Choose programming language and set up project structure
- [ ] Implement basic file conversion using FFmpeg
- [ ] Add CLI argument parsing
- [ ] Create unit tests

### Phase 2: Core Features
- [ ] YouTube video downloading
- [ ] Support multiple output formats
- [ ] Batch conversion support
- [ ] Progress indicators

### Phase 3: Enhancement
- [ ] Audio quality presets
- [ ] Metadata preservation/editing
- [ ] GUI interface (optional)
- [ ] Configuration file support

### Phase 4: Distribution
- [ ] Packaging for multiple platforms
- [ ] CI/CD for automated builds
- [ ] Docker container
- [ ] Installation guides

## Useful Resources

- **FFmpeg Documentation**: https://ffmpeg.org/documentation.html
- **yt-dlp**: https://github.com/yt-dlp/yt-dlp (YouTube downloader)
- **Audio Formats**: MP3, AAC, FLAC, WAV, OGG
- **Video Formats**: MP4, AVI, MKV, WebM

## Questions to Consider

When implementing features, consider:

1. What audio/video formats should be supported?
2. Should the tool support playlists or single videos only?
3. How should quality selection work (bitrate, resolution)?
4. Should there be a GUI or CLI only?
5. How to handle large files efficiently?
6. Should conversions be done locally or support cloud processing?

## Updates to This Document

AI agents should update this document as the project evolves:

- Update tech stack section when languages/frameworks are chosen
- Add actual build commands when build system is implemented
- Document discovered coding conventions
- Update structure as directories are created
- Add specific navigation tips as patterns emerge

---

**Last Updated**: 2026-01-31  
**Version**: 1.0.0 (Bootstrap)  
**Status**: Initial documentation for empty repository
