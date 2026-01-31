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
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Clear all results/preview state
  const clearResults = () => {
    setMessage('');
    setDownloadUrl('');
    setOriginalName('');
    setPreviewUrl('');
    setProgress(0);
  };

  // Handle tab change - clear preview state
  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      clearResults();
      setActiveTab(tab);
    }
  };
  const [advancedSettings, setAdvancedSettings] = useState({
    bitrateMode: 'constant',
    sampleRate: '44100',
    channels: '2',
    fadeIn: false,
    fadeOut: false,
    reverse: false
  });

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    clearResults();
  };

  const handleConvert = async () => {
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setLoading(true);
    clearResults();
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    formData.append('quality', quality);
    formData.append('bitrate_mode', advancedSettings.bitrateMode);
    formData.append('sample_rate', advancedSettings.sampleRate);
    formData.append('channels', advancedSettings.channels);
    formData.append('fade_in', advancedSettings.fadeIn.toString());
    formData.append('fade_out', advancedSettings.fadeOut.toString());
    formData.append('reverse', advancedSettings.reverse.toString());

    // Simulate progress during upload/conversion
    const progressInterval = setInterval(() => {
      setProgress(prev => prev < 85 ? prev + Math.random() * 15 : prev);
    }, 500);

    try {
      const response = await fetch(`${API_URL}/api/convert`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(95);

      const data = await response.json();

      if (data.success) {
        setProgress(100);
        setMessage('✅ Conversion successful!');
        const url = `${API_URL}/api/download/${data.file_id}`;
        setDownloadUrl(url);
        setPreviewUrl(url);
        setOriginalName(data.original_name || 'converted');
      } else {
        setProgress(0);
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      clearInterval(progressInterval);
      setProgress(0);
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
    clearResults();
    setProgress(5);

    // Simulate progress during download/conversion (YouTube takes longer)
    const progressInterval = setInterval(() => {
      setProgress(prev => prev < 80 ? prev + Math.random() * 8 : prev);
    }, 800);

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

      clearInterval(progressInterval);
      setProgress(95);

      const data = await response.json();

      if (data.success) {
        setProgress(100);
        setMessage('✅ YouTube conversion successful!');
        const url = `${API_URL}/api/download/${data.file_id}`;
        setDownloadUrl(url);
        setPreviewUrl(url);
        setOriginalName(data.original_name || 'youtube-audio');
      } else {
        setProgress(0);
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      clearInterval(progressInterval);
      setProgress(0);
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
    clearResults();
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);
    if (metadata.artist) formData.append('artist', metadata.artist);
    if (metadata.title) formData.append('title', metadata.title);
    if (metadata.album) formData.append('album', metadata.album);
    if (metadata.genre) formData.append('genre', metadata.genre);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => prev < 85 ? prev + Math.random() * 20 : prev);
    }, 400);

    try {
      const response = await fetch(`${API_URL}/api/metadata`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(95);

      const data = await response.json();

      if (data.success) {
        setProgress(100);
        setMessage('✅ Metadata updated successfully!');
        const url = `${API_URL}/api/download/${data.file_id}`;
        setDownloadUrl(url);
        setPreviewUrl(url);
        setOriginalName(data.original_name || 'metadata');
      } else {
        setProgress(0);
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      clearInterval(progressInterval);
      setProgress(0);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Normalize filename: replace spaces with dashes, remove special chars
  const normalizeFilename = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleDownload = async () => {
    if (!downloadUrl) return;

    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      
      // Get file extension from the download URL
      const urlParts = downloadUrl.split('.');
      const extension = urlParts[urlParts.length - 1];
      
      // Create normalized filename with _anytrack suffix
      const normalizedName = normalizeFilename(originalName);
      const filename = `${normalizedName}_anytrack.${extension}`;
      
      // Create download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(`❌ Download error: ${error.message}`);
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
          onClick={() => handleTabChange('convert')}
        >
          Convert Audio
        </button>
        <button
          className={activeTab === 'youtube' ? 'active' : ''}
          onClick={() => handleTabChange('youtube')}
        >
          YouTube to Audio
        </button>
        <button
          className={activeTab === 'metadata' ? 'active' : ''}
          onClick={() => handleTabChange('metadata')}
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
              className="btn-advanced"
              onClick={() => setShowAdvanced(!showAdvanced)}
              type="button"
              disabled={loading}
            >
              {showAdvanced ? '▼' : '▶'} Advanced settings
            </button>

            {showAdvanced && (
              <div className="advanced-settings">
                <div className="form-group">
                  <label>Bitrate Mode:</label>
                  <div className="radio-group">
                    <label>
                      <input
                        type="radio"
                        name="bitrateMode"
                        value="constant"
                        checked={advancedSettings.bitrateMode === 'constant'}
                        onChange={(e) => setAdvancedSettings({...advancedSettings, bitrateMode: e.target.value})}
                        disabled={loading}
                      />
                      Constant
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="bitrateMode"
                        value="variable"
                        checked={advancedSettings.bitrateMode === 'variable'}
                        onChange={(e) => setAdvancedSettings({...advancedSettings, bitrateMode: e.target.value})}
                        disabled={loading}
                      />
                      Variable
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Sample Rate:</label>
                  <select
                    value={advancedSettings.sampleRate}
                    onChange={(e) => setAdvancedSettings({...advancedSettings, sampleRate: e.target.value})}
                    disabled={loading}
                  >
                    <option value="8000">8000 Hz</option>
                    <option value="11025">11025 Hz</option>
                    <option value="16000">16000 Hz</option>
                    <option value="22050">22050 Hz</option>
                    <option value="32000">32000 Hz</option>
                    <option value="44100">44100 Hz</option>
                    <option value="48000">48000 Hz</option>
                    <option value="96000">96000 Hz</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Channels:</label>
                  <select
                    value={advancedSettings.channels}
                    onChange={(e) => setAdvancedSettings({...advancedSettings, channels: e.target.value})}
                    disabled={loading}
                  >
                    <option value="1">Mono (1)</option>
                    <option value="2">Stereo (2)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={advancedSettings.fadeIn}
                      onChange={(e) => setAdvancedSettings({...advancedSettings, fadeIn: e.target.checked})}
                      disabled={loading}
                    />
                    <span>Fade in</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={advancedSettings.fadeOut}
                      onChange={(e) => setAdvancedSettings({...advancedSettings, fadeOut: e.target.checked})}
                      disabled={loading}
                    />
                    <span>Fade out</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={advancedSettings.reverse}
                      onChange={(e) => setAdvancedSettings({...advancedSettings, reverse: e.target.checked})}
                      disabled={loading}
                    />
                    <span>Reverse</span>
                  </label>
                </div>
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

        {loading && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        )}

        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {downloadUrl && (
          <div className="download-section">
            <h3>🎧 Preview</h3>
            <audio controls src={previewUrl} className="audio-preview">
              Your browser does not support the audio element.
            </audio>
            <p className="filename-preview">
              Filename: <strong>{normalizeFilename(originalName)}_anytrack.{downloadUrl.split('.').pop()}</strong>
            </p>
            <button onClick={handleDownload} className="btn-download">
              📥 Download File
            </button>
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
