import { useEffect, useRef, useState } from 'react'
import './App.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')
const FORMATS = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a']
const BITRATE_FORMATS = ['mp3', 'ogg', 'aac', 'm4a']
const SAMPLE_RATES = ['8000', '11025', '16000', '22050', '32000', '44100', '48000', '96000']
const TAGS = [
  { key: 'artist', label: 'Artist', placeholder: 'Artist name' },
  { key: 'title', label: 'Title', placeholder: 'Track title' },
  { key: 'album', label: 'Album', placeholder: 'Album name' },
  { key: 'genre', label: 'Genre', placeholder: 'Genre' },
]
const TOOLS = {
  convert: {
    label: 'Convert audio',
    title: 'Convert audio',
    description: 'Choose a file and set the output you need.',
    action: 'Convert file',
    pendingAction: 'Converting...',
    pending: 'Converting audio...',
    success: 'Audio converted.',
    failure: 'Could not convert this file.',
    fallbackName: 'converted',
  },
  youtube: {
    label: 'YouTube audio',
    title: 'Extract YouTube audio',
    description: 'Turn a video link into an audio file on your server.',
    action: 'Extract audio',
    pendingAction: 'Extracting...',
    pending: 'Extracting YouTube audio...',
    success: 'YouTube audio extracted.',
    failure: 'Could not extract this audio.',
    fallbackName: 'youtube-audio',
  },
  metadata: {
    label: 'Edit metadata',
    title: 'Edit metadata',
    description: 'Update tags without re-encoding your audio.',
    action: 'Save metadata',
    pendingAction: 'Saving...',
    pending: 'Saving metadata...',
    success: 'Metadata saved.',
    failure: 'Could not save these tags.',
    fallbackName: 'metadata',
  },
}

function normalizeFilename(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() || 'audio'
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} ${bytes === 1 ? 'byte' : 'bytes'}`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}

async function fetchResource(url, options) {
  try {
    return await fetch(url, options)
  } catch (error) {
    throw new Error('Could not reach the API. Check the server connection and API address, then try again.', { cause: error })
  }
}

async function readApiResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json') && !contentType.includes('+json')) {
    const detail = !response.ok && contentType.startsWith('text/plain') ? (await response.text()).trim() : ''
    throw new Error(detail || `The server returned an unexpected response (HTTP ${response.status}). Check the API address or server logs.`)
  }

  let data
  try {
    data = await response.json()
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('The server returned an invalid response. Try again or check the server logs.', { cause: error })
    }
    throw error
  }
  if (!response.ok || data?.success !== true) {
    const detail = data?.success !== true && typeof data?.message === 'string' ? data.message : ''
    throw new Error(detail || `Request failed (HTTP ${response.status}). Try again or check the server logs.`)
  }
  if (typeof data.file_id !== 'string' || !/^[a-z0-9_-]+\.[a-z0-9]+$/i.test(data.file_id)) {
    throw new Error('The server did not return a valid output file. Try again.')
  }
  if (data.original_name != null && typeof data.original_name !== 'string') {
    throw new Error('The server returned an invalid response for the output filename. Try again.')
  }
  return data
}

function ArrowIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false">
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </svg>
  )
}

function App() {
  const [activeTool, setActiveTool] = useState('convert')
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('mp3')
  const [quality, setQuality] = useState('192')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [urlInvalid, setUrlInvalid] = useState(false)
  const [metadata, setMetadata] = useState({ artist: '', title: '', album: '', genre: '' })
  const [advancedSettings, setAdvancedSettings] = useState({
    bitrateMode: 'constant', sampleRate: '44100', channels: '2',
    fadeIn: false, fadeOut: false, reverse: false,
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [status, setStatus] = useState({ kind: 'idle', message: '' })
  const [result, setResult] = useState(null)
  const [previewError, setPreviewError] = useState(false)
  const requestFocus = useRef(null)
  const busy = loading || downloading
  const tool = TOOLS[activeTool]
  const isMetadata = activeTool === 'metadata'
  const isYoutube = activeTool === 'youtube'
  const hasBitrate = BITRATE_FORMATS.includes(format)
  const target = isMetadata ? 'Updated tags'
    : `${format.toUpperCase()}${hasBitrate ? ` / requested ${quality} kbps` : format === 'wav' ? ' / uncompressed' : ' / lossless'}`
  const source = isYoutube ? youtubeUrl.trim() || 'YouTube URL' : file?.name || 'Audio file'

  useEffect(() => {
    if (!busy && requestFocus.current) {
      // Native disabled controls can move keyboard focus to the document body.
      if (document.activeElement === document.body) requestFocus.current.focus()
      requestFocus.current = null
    }
  }, [busy])

  const clearResults = () => {
    setStatus({ kind: 'idle', message: '' })
    setResult(null)
    setPreviewError(false)
  }

  const handleToolChange = (nextTool) => {
    if (busy || nextTool === activeTool) return
    clearResults()
    setUrlInvalid(false)
    setActiveTool(nextTool)
  }

  const handleFileChange = (nextFile) => {
    if (!nextFile) return
    setFile(nextFile)
    clearResults()
    setIsDragging(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    if (busy) return
    if (event.dataTransfer.files.length !== 1) {
      setStatus({ kind: 'error', message: 'Choose one audio file at a time, using the picker or drag-and-drop.' })
      return
    }
    handleFileChange(event.dataTransfer.files[0])
  }

  const updateAdvanced = (key, value) => {
    setAdvancedSettings((previous) => ({ ...previous, [key]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (busy) return
    if (!isYoutube && !file) {
      setStatus({ kind: 'error', message: 'Choose an audio file before continuing.' })
      return
    }
    if (isYoutube && !/^https?:\/\//i.test(youtubeUrl.trim())) {
      setUrlInvalid(true)
      setStatus({ kind: 'error', message: 'Enter a valid YouTube URL, starting with http:// or https://.' })
      event.currentTarget.elements.namedItem('url').focus()
      return
    }

    let body
    let headers
    if (isYoutube) {
      body = JSON.stringify({ url: youtubeUrl.trim(), format, quality })
      headers = { 'Content-Type': 'application/json' }
    } else {
      body = new FormData()
      body.append('file', file)
      const fields = isMetadata ? metadata : {
        format, quality, bitrate_mode: advancedSettings.bitrateMode,
        sample_rate: advancedSettings.sampleRate, channels: advancedSettings.channels,
        fade_in: advancedSettings.fadeIn, fade_out: advancedSettings.fadeOut, reverse: advancedSettings.reverse,
      }
      for (const [key, value] of Object.entries(fields)) {
        if (!isMetadata || value.trim()) body.append(key, String(value))
      }
    }

    requestFocus.current = document.activeElement
    clearResults()
    setLoading(true)
    setStatus({ kind: 'processing', message: tool.pending })
    const summary = target
    try {
      const response = await fetchResource(`${API_URL}/api/${activeTool}`, { method: 'POST', body, headers })
      const data = await readApiResponse(response)
      const extension = data.file_id.split('.').pop()
      setResult({
        url: `${API_URL}/api/download/${encodeURIComponent(data.file_id)}`,
        filename: `${normalizeFilename(data.original_name || tool.fallbackName)}_anytrack.${extension}`,
        summary, extension,
      })
      setStatus({ kind: 'success', message: tool.success })
    } catch (error) {
      console.error(`${tool.title} request failed`, error)
      setStatus({ kind: 'error', message: `${tool.failure} ${error instanceof Error ? error.message : 'An unexpected error occurred. Check the browser console and try again.'}` })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!result || busy) return
    requestFocus.current = document.activeElement
    setDownloading(true)
    let objectUrl
    let link
    try {
      const response = await fetchResource(result.url)
      if (!response.ok) throw new Error(`Download failed (HTTP ${response.status}). Try again or convert the file again.`)
      const contentType = response.headers.get('content-type') || ''
      if (contentType.startsWith('text/') || contentType.includes('json')) {
        throw new Error('Download failed: the server did not return an audio file. Check the API address.')
      }
      const blob = await response.blob()
      if (!blob.size) throw new Error('The server returned an empty file. Convert the file again before downloading.')
      objectUrl = URL.createObjectURL(blob)
      link = document.createElement('a')
      link.href = objectUrl
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      setStatus({ kind: 'success', message: 'Download started.' })
    } catch (error) {
      console.error('Audio download failed', error)
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Download failed. Check the browser console and try again.' })
    } finally {
      link?.remove()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setDownloading(false)
    }
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="app-header">
        <div className="brand">
          <img src="/favicon.svg" width="48" height="48" alt="" />
          <div>
            <h1>AnyTrack Converter</h1>
            <p>Audio conversion, extraction, and tags.</p>
          </div>
        </div>
        <p className="hosting-label">Self-hosted audio tools</p>
      </header>

      <div className="tools" role="group" aria-label="Audio tools">
        {Object.entries(TOOLS).map(([key, item]) => (
          <button key={key} type="button" aria-pressed={activeTool === key} disabled={busy} onClick={() => handleToolChange(key)}>
            {item.label}
          </button>
        ))}
      </div>

      <main className="workspace" id="main-content" tabIndex={-1}>
        <div className="workspace-heading">
          <h2 id="tool-title">{tool.title}</h2>
          <p>{tool.description}</p>
        </div>

        <div className="signal-path">
          <p><span className="eyebrow">Source</span><span className="signal-value">{source}</span></p>
          <ArrowIcon className="signal-arrow" />
          <p><span className="eyebrow">{isMetadata ? 'Update' : 'Target'}</span><span className="signal-value">{target}</span></p>
        </div>

        <form aria-labelledby="tool-title" aria-busy={loading} onSubmit={handleSubmit}>
          <fieldset className="workflow-fields" disabled={busy}>
            <legend className="visually-hidden">{tool.title} settings</legend>
            <div className="workflow-grid">
              <div className="source-column">
                <h3>{isYoutube ? 'Source video' : 'Source audio'}</h3>
                {isYoutube ? (
                  <div className="form-field">
                    <label htmlFor="youtube-url">YouTube URL</label>
                    <input
                      id="youtube-url" name="url" type="url" inputMode="url" required
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl} aria-invalid={urlInvalid || undefined} aria-describedby="url-help"
                      onInvalid={() => {
                        setUrlInvalid(true)
                        setStatus({ kind: 'error', message: 'Enter a valid YouTube URL, starting with http:// or https://.' })
                      }}
                      onChange={(event) => {
                        setYoutubeUrl(event.target.value)
                        setUrlInvalid(false)
                        clearResults()
                      }}
                    />
                    <p className="form-hint" id="url-help">Use a video you have permission to download. Extraction contacts YouTube through yt-dlp.</p>
                  </div>
                ) : (
                  <>
                    <label
                      className={`file-picker${isDragging ? ' is-dragging' : ''}${busy ? ' is-disabled' : ''}`}
                      htmlFor="audio-file"
                      onDragOver={(event) => {
                        event.preventDefault()
                        if (!busy) setIsDragging(true)
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false)
                      }}
                      onDrop={handleDrop}
                    >
                      <svg className="file-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false">
                        <path d="M13 5h15l9 9v29H13zM28 5v10h9M21 30v-9l9-2v9" />
                        <ellipse cx="18" cy="31" rx="3" ry="2" />
                        <ellipse cx="27" cy="29" rx="3" ry="2" />
                      </svg>
                      <span className="file-picker-action">{file ? 'Replace audio file' : 'Choose audio file'}</span>
                      <span className="form-hint" id="file-hint">or drop a file here</span>
                      <input
                        id="audio-file" className="file-input" type="file" accept="audio/*"
                        aria-label={file ? 'Replace audio file' : 'Choose audio file'}
                        aria-describedby={file ? 'selected-file' : 'file-hint'}
                        onChange={(event) => {
                          handleFileChange(event.target.files[0])
                          event.target.value = ''
                        }}
                      />
                    </label>
                    {file ? (
                      <div className="source-details">
                        <p id="selected-file"><span className="file-name">{file.name}</span><span className="form-hint">{formatFileSize(file.size)}</span></p>
                        <button type="button" className="button-quiet" onClick={() => { setFile(null); clearResults() }}>Remove file</button>
                      </div>
                    ) : <p className="form-hint">Choose audio readable by your server&apos;s FFmpeg installation.</p>}
                  </>
                )}
              </div>

              <div className="settings-column">
                <h3>{isMetadata ? 'Audio tags' : 'Output settings'}</h3>
                {isMetadata ? (
                  <>
                    <p className="form-hint">Leave a field blank to keep its existing tag.</p>
                    <div className="metadata-grid">
                      {TAGS.map(({ key, label, placeholder }) => (
                        <div className="form-field" key={key}>
                          <label htmlFor={key}>{label}</label>
                          <input id={key} type="text" value={metadata[key]} placeholder={placeholder}
                            onChange={(event) => setMetadata((previous) => ({ ...previous, [key]: event.target.value }))} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-field">
                      <label htmlFor="output-format">Output format</label>
                      <select id="output-format" value={format} onChange={(event) => setFormat(event.target.value)}>
                        {FORMATS.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
                      </select>
                      <p className="form-hint">WAV is uncompressed. FLAC is lossless.</p>
                    </div>
                    {hasBitrate && (
                      <div className="form-field">
                        <label className="label-row" htmlFor="output-quality">Bitrate <span className="setting-value" aria-hidden="true">{quality} kbps</span></label>
                        <input id="output-quality" type="range" min="64" max="320" step="32" value={quality}
                          aria-valuetext={`${quality} kilobits per second`}
                          onChange={(event) => setQuality(event.target.value)} />
                        {format === 'ogg' && <p className="form-hint">Some FFmpeg builds encode OGG as FLAC; bitrate then has no effect.</p>}
                      </div>
                    )}
                  </>
                )}

                {activeTool === 'convert' && (
                  <>
                    <button type="button" className="advanced-toggle" aria-expanded={showAdvanced} aria-controls="advanced-settings" onClick={() => setShowAdvanced(!showAdvanced)}>
                      Advanced settings <span aria-hidden="true">{showAdvanced ? '-' : '+'}</span>
                    </button>
                    <div className="advanced-settings" id="advanced-settings" hidden={!showAdvanced}>
                      {format === 'mp3' && (
                        <fieldset className="bitrate-mode">
                          <legend>Bitrate mode</legend>
                          <div className="radio-options">
                            {['constant', 'variable'].map((mode) => (
                              <label className="choice" key={mode}>
                                <input type="radio" name="bitrateMode" value={mode} checked={advancedSettings.bitrateMode === mode}
                                  onChange={(event) => updateAdvanced('bitrateMode', event.target.value)} />
                                {mode === 'constant' ? 'Constant' : 'Variable'}
                              </label>
                            ))}
                          </div>
                          <p className="form-hint">MP3 only. Variable mode maps the bitrate setting to an FFmpeg quality level, not a fixed bitrate.</p>
                        </fieldset>
                      )}
                      <div className="advanced-grid">
                        <div className="form-field">
                          <label htmlFor="sample-rate">Sample rate</label>
                          <select id="sample-rate" value={advancedSettings.sampleRate} onChange={(event) => updateAdvanced('sampleRate', event.target.value)}>
                            {SAMPLE_RATES.map((rate) => <option key={rate} value={rate}>{Number(rate).toLocaleString('en-US')} Hz</option>)}
                          </select>
                        </div>
                        <div className="form-field">
                          <label htmlFor="audio-channels">Channels</label>
                          <select id="audio-channels" value={advancedSettings.channels} onChange={(event) => updateAdvanced('channels', event.target.value)}>
                            <option value="1">Mono</option><option value="2">Stereo</option>
                          </select>
                        </div>
                      </div>
                      <div className="effects">
                        <label className="choice"><input type="checkbox" checked={advancedSettings.fadeIn} onChange={(event) => updateAdvanced('fadeIn', event.target.checked)} />Fade in</label>
                        <label className="choice"><input type="checkbox" checked={advancedSettings.fadeOut} aria-describedby="fade-out-help" onChange={(event) => updateAdvanced('fadeOut', event.target.checked)} />Fade out</label>
                        <p className="form-hint" id="fade-out-help">Current backend behavior: fade-out starts at the beginning, not the end. Both fades last three seconds.</p>
                        <label className="choice"><input type="checkbox" checked={advancedSettings.reverse} onChange={(event) => updateAdvanced('reverse', event.target.checked)} />Reverse</label>
                      </div>
                    </div>
                  </>
                )}

                <div className="action-row">
                  <button type="submit" className="button-primary" disabled={busy || (isYoutube ? !youtubeUrl.trim() : !file)}>
                    {loading ? tool.pendingAction : tool.action}<ArrowIcon />
                  </button>
                </div>
              </div>
            </div>
          </fieldset>
        </form>

        <div className="status-region" role="status" aria-atomic="true">
          {status.message && (
            <div className={`status-message status-${status.kind}`}>
              {loading && <span className="activity-indicator" aria-hidden="true" />}
              <div>
                <p>{status.message}</p>
                {loading && <p className="processing-note">Waiting for the server. Processing progress is not available.</p>}
              </div>
            </div>
          )}
        </div>

        {result && (
          <section className="result-panel" aria-labelledby="result-title">
            <div className="result-heading">
              <h3 id="result-title">Your file is ready</h3>
              <span className="result-format">{result.extension.toUpperCase()} file</span>
            </div>
            <p className="form-hint">Completed request: {result.summary}</p>
            <p className="result-filename">{result.filename}</p>
            <div className="preview">
              <p className="preview-label" id="preview-label">Audio preview</p>
              <audio id="audio-preview" controls preload="metadata" src={result.url} aria-labelledby="preview-label" aria-describedby="preview-help" onError={() => setPreviewError(true)}>
                Your browser does not support audio preview. Download the file to listen.
              </audio>
              <p className="form-hint" id="preview-help">
                {previewError ? 'Your browser cannot preview this file. Download it to listen.' : 'Playback depends on your browser and the output codec. Download is always available.'}
              </p>
            </div>
            <button type="button" className="button-primary download-button" disabled={busy} onClick={handleDownload}>
              {downloading ? 'Downloading...' : 'Download file'}<ArrowIcon />
            </button>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by FFmpeg + yt-dlp</p>
        <p>Files are processed on your server.</p>
      </footer>
    </div>
  )
}

export default App
