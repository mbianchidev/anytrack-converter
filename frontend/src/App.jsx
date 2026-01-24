import { useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function App() {
  const [activeTab, setActiveTab] = useState('convert');
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('mp3');
  const [quality, setQuality] = useState('192');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [metadata, setMetadata] = useState({
    artist: '',
    title: '',
    album: '',
    genre: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
    setDownloadUrl('');
  };

  const handleConvert = async () => {
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setLoading(true);
    setMessage('');
    setDownloadUrl('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    formData.append('quality', quality);

    try {
      const response = await fetch(`${API_URL}/api/convert`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Conversion successful!');
        setDownloadUrl(`${API_URL}/api/download/${data.file_id}`);
      } else {
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleYoutubeConvert = async () => {
    if (!youtubeUrl) {
      setMessage('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setMessage('');
    setDownloadUrl('');

    try {
      const response = await fetch(`${API_URL}/api/youtube`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: youtubeUrl,
          format: format,
          quality: quality,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ YouTube conversion successful!');
        setDownloadUrl(`${API_URL}/api/download/${data.file_id}`);
      } else {
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMetadataUpdate = async () => {
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setLoading(true);
    setMessage('');
    setDownloadUrl('');

    const formData = new FormData();
    formData.append('file', file);
    if (metadata.artist) formData.append('artist', metadata.artist);
    if (metadata.title) formData.append('title', metadata.title);
    if (metadata.album) formData.append('album', metadata.album);
    if (metadata.genre) formData.append('genre', metadata.genre);

    try {
      const response = await fetch(`${API_URL}/api/metadata`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Metadata updated successfully!');
        setDownloadUrl(`${API_URL}/api/download/${data.file_id}`);
      } else {
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>🎵 AnyTrack Converter</h1>
        <p>Convert any audio file or YouTube video to any format</p>
      </header>

      <div className="tabs">
        <button
          className={activeTab === 'convert' ? 'active' : ''}
          onClick={() => setActiveTab('convert')}
        >
          Convert Audio
        </button>
        <button
          className={activeTab === 'youtube' ? 'active' : ''}
          onClick={() => setActiveTab('youtube')}
        >
          YouTube to Audio
        </button>
        <button
          className={activeTab === 'metadata' ? 'active' : ''}
          onClick={() => setActiveTab('metadata')}
        >
          Edit Metadata
        </button>
      </div>

      <div className="content">
        {activeTab === 'convert' && (
          <div className="section">
            <h2>Convert Audio File</h2>
            <div className="form-group">
              <label>Select Audio File:</label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Output Format:</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                disabled={loading}
              >
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
                <option value="flac">FLAC</option>
                <option value="ogg">OGG</option>
                <option value="aac">AAC</option>
                <option value="m4a">M4A</option>
              </select>
            </div>

            {['mp3', 'ogg', 'aac', 'm4a'].includes(format) && (
              <div className="form-group">
                <label>Bitrate (kbps): {quality}</label>
                <input
                  type="range"
                  min="64"
                  max="320"
                  step="32"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <button
              onClick={handleConvert}
              disabled={loading || !file}
              className="btn-primary"
            >
              {loading ? 'Converting...' : 'Convert'}
            </button>
          </div>
        )}

        {activeTab === 'youtube' && (
          <div className="section">
            <h2>Convert YouTube Video to Audio</h2>
            <div className="form-group">
              <label>YouTube URL:</label>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Output Format:</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                disabled={loading}
              >
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
                <option value="flac">FLAC</option>
                <option value="ogg">OGG</option>
                <option value="aac">AAC</option>
                <option value="m4a">M4A</option>
              </select>
            </div>

            {['mp3', 'ogg', 'aac', 'm4a'].includes(format) && (
              <div className="form-group">
                <label>Bitrate (kbps): {quality}</label>
                <input
                  type="range"
                  min="64"
                  max="320"
                  step="32"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <button
              onClick={handleYoutubeConvert}
              disabled={loading || !youtubeUrl}
              className="btn-primary"
            >
              {loading ? 'Converting...' : 'Convert from YouTube'}
            </button>
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="section">
            <h2>Edit Audio Metadata</h2>
            <div className="form-group">
              <label>Select Audio File:</label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Artist:</label>
              <input
                type="text"
                placeholder="Artist name"
                value={metadata.artist}
                onChange={(e) =>
                  setMetadata({ ...metadata, artist: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Title:</label>
              <input
                type="text"
                placeholder="Song title"
                value={metadata.title}
                onChange={(e) =>
                  setMetadata({ ...metadata, title: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Album:</label>
              <input
                type="text"
                placeholder="Album name"
                value={metadata.album}
                onChange={(e) =>
                  setMetadata({ ...metadata, album: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Genre:</label>
              <input
                type="text"
                placeholder="Music genre"
                value={metadata.genre}
                onChange={(e) =>
                  setMetadata({ ...metadata, genre: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <button
              onClick={handleMetadataUpdate}
              disabled={loading || !file}
              className="btn-primary"
            >
              {loading ? 'Updating...' : 'Update Metadata'}
            </button>
          </div>
        )}

        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {downloadUrl && (
          <div className="download-section">
            <a href={downloadUrl} download className="btn-download">
              📥 Download File
            </a>
          </div>
        )}
      </div>

      <footer>
        <p>Powered by FFmpeg & yt-dlp | Made with ❤️</p>
      </footer>
    </div>
  );
}

export default App;
