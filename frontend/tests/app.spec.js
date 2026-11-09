import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

function audioFile(name = 'sample-tone.wav') {
  const sampleRate = 44100
  const samples = sampleRate / 4
  const buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(buffer.length - 8, 4)
  buffer.write('WAVEfmt ', 8)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples * 2, 40)
  for (let sample = 0; sample < samples; sample++) {
    buffer.writeInt16LE(Math.round(Math.sin(sample * 2 * Math.PI * 440 / sampleRate) * 4096), 44 + sample * 2)
  }
  return { name, mimeType: 'audio/wav', buffer }
}

function apiResult(fileId = 'result.mp3', originalName = 'Sample Tone') {
  return { success: true, message: 'Processed synthetic audio', file_id: fileId, original_name: originalName }
}

async function fulfillJson(route, body = apiResult(), status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  })
}

async function chooseTool(page, name) {
  await page.getByRole('group', { name: 'Audio tools' }).getByRole('button', { name }).click()
}

async function selectFile(page, name) {
  await page.getByLabel(/(?:Select|Choose|Replace) audio file/i).setInputFiles(audioFile(name))
}

function multipartFields(request) {
  const boundary = request.headers()['content-type'].split('boundary=')[1]
  const parts = request.postDataBuffer().toString('latin1').split(`--${boundary}`)
  const fields = {}
  for (const part of parts) {
    const name = part.match(/;\s*name="([^"]+)"/)?.[1]
    const value = part.match(/\r\n\r\n([\s\S]*)\r\n$/)?.[1]
    if (name && name !== 'file') fields[name] = value
  }
  return fields
}

async function expectAccessible(page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(violations).toEqual([])
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, GET, OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
      })
    } else if (request.url().includes('/api/download/')) {
      await route.fulfill({
        contentType: 'audio/wav',
        headers: { 'access-control-allow-origin': '*' },
        body: audioFile().buffer,
      })
    } else {
      await fulfillJson(route)
    }
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
})

test('preserves output formats and bitrate defaults', async ({ page }) => {
  const format = page.getByLabel(/Output format/i)
  const bitrate = page.getByLabel(/^Bitrate/i)
  await expect(format).toHaveValue('mp3')
  await expect(format.locator('option')).toHaveText(['MP3', 'WAV', 'FLAC', 'OGG', 'AAC', 'M4A'])
  await expect(bitrate).toHaveValue('192')
  await expect(bitrate).toHaveAttribute('min', '64')
  await expect(bitrate).toHaveAttribute('max', '320')
  await expect(bitrate).toHaveAttribute('step', '32')
  for (const lossless of ['wav', 'flac']) {
    await format.selectOption(lossless)
    await expect(bitrate).toHaveCount(0)
  }
  await format.selectOption('mp3')
  await expect(bitrate).toHaveValue('192')
})

test('converts a file with the exact existing advanced payload', async ({ page }) => {
  await selectFile(page)
  await page.getByRole('button', { name: 'Advanced settings' }).click()
  await expect(page.getByLabel('Sample rate')).toHaveValue('44100')
  await expect(page.getByLabel('Channels')).toHaveValue('2')
  await page.getByLabel('Variable').check()
  await page.getByLabel('Sample rate').selectOption('48000')
  await page.getByLabel('Channels').selectOption('1')
  await page.getByLabel('Fade in', { exact: true }).check()
  await page.getByLabel('Fade out', { exact: true }).check()
  await page.getByLabel('Reverse', { exact: true }).check()
  const requestPromise = page.waitForRequest((request) => request.url().endsWith('/api/convert'))
  await page.getByRole('button', { name: 'Convert file', exact: true }).click()
  const request = await requestPromise
  expect(request.postDataBuffer().toString('latin1')).toContain('filename="sample-tone.wav"')
  expect(multipartFields(request)).toEqual({
    format: 'mp3', quality: '192', bitrate_mode: 'variable', sample_rate: '48000',
    channels: '1', fade_in: 'true', fade_out: 'true', reverse: 'true',
  })
  await expect(page.getByRole('status')).toContainText('Audio converted.')
  await expect(page.getByRole('region', { name: 'Your file is ready' })).toContainText('sample-tone_anytrack.mp3')
})

test('blocks workflow switching during requests without simulated progress', async ({ page }) => {
  let release
  const responseReady = new Promise((resolve) => { release = resolve })
  await page.route('**/api/convert', async (route) => {
    await responseReady
    await fulfillJson(route)
  })
  await selectFile(page)
  await page.getByRole('button', { name: /^Convert(?: file)?$/i }).click()
  try {
    for (const button of await page.getByRole('group', { name: 'Audio tools' }).getByRole('button').all()) {
      await expect(button).toBeDisabled()
    }
    await expect(page.getByRole('status')).toContainText('Converting audio')
    await expect(page.getByRole('progressbar')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Converting...' })).toBeDisabled()
    await expectAccessible(page)
  } finally {
    release()
  }
  await expect(page.getByRole('status')).toContainText('Audio converted.')
  await expect(page.getByRole('group', { name: 'Audio tools' }).getByRole('button').first()).toBeEnabled()
})

for (const workflow of [
  { tool: 'YouTube audio', endpoint: 'youtube', action: 'Extract audio', pending: 'Extracting...', success: 'YouTube audio extracted.' },
  { tool: 'Edit metadata', endpoint: 'metadata', action: 'Save metadata', pending: 'Saving...', success: 'Metadata saved.' },
]) {
  test(`${workflow.tool} locks input and navigation while processing`, async ({ page }) => {
    await chooseTool(page, workflow.tool)
    if (workflow.endpoint === 'youtube') {
      await page.getByLabel('YouTube URL').fill('https://youtu.be/synthetic-tone')
    } else {
      await selectFile(page)
    }
    let release
    const responseReady = new Promise((resolve) => { release = resolve })
    await page.route(`**/api/${workflow.endpoint}`, async (route) => {
      await responseReady
      await fulfillJson(route)
    })
    await page.getByRole('button', { name: workflow.action, exact: true }).click()
    try {
      await expect(page.getByRole('button', { name: workflow.pending, exact: true })).toBeDisabled()
      for (const button of await page.getByRole('group', { name: 'Audio tools' }).getByRole('button').all()) {
        await expect(button).toBeDisabled()
      }
      await expect(page.getByRole('progressbar')).toHaveCount(0)
    } finally {
      release()
    }
    await expect(page.getByRole('status')).toContainText(workflow.success)
  })
}

test('drag-and-drop selects one file and reports multiple files without replacing it', async ({ page }) => {
  for (const names of [['dropped-tone.wav'], ['first-tone.wav', 'second-tone.wav']]) {
    const transfer = await page.evaluateHandle(({ names, bytes }) => {
      const data = new DataTransfer()
      for (const name of names) data.items.add(new File([new Uint8Array(bytes)], name, { type: 'audio/wav' }))
      return data
    }, { names, bytes: Array.from(audioFile().buffer) })
    try {
      await page.getByLabel(/(?:Choose|Replace) audio file/).dispatchEvent('drop', { dataTransfer: transfer })
    } finally {
      await transfer.dispose()
    }
    await expect(page.locator('#selected-file')).toContainText('dropped-tone.wav')
  }
  await expect(page.getByRole('status')).toContainText('Choose one audio file at a time')
  await expect(page.getByRole('button', { name: 'Convert file', exact: true })).toBeEnabled()
})

test('shows the shared selected file after tool changes and clears old results', async ({ page }) => {
  await selectFile(page)
  await page.getByRole('button', { name: 'Convert file', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download file', exact: true })).toBeVisible()
  await chooseTool(page, 'Edit metadata')
  await expect(page.getByLabel('Replace audio file')).toBeVisible()
  await expect(page.locator('#selected-file')).toContainText('sample-tone.wav')
  await expect(page.getByRole('button', { name: 'Save metadata' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Download file', exact: true })).toHaveCount(0)
  await chooseTool(page, 'Convert audio')
  await expect(page.locator('#selected-file')).toContainText('sample-tone.wav')
  await expect(page.getByRole('button', { name: 'Convert file', exact: true })).toBeEnabled()
})

test('changing or removing the source clears results without clearing settings', async ({ page }) => {
  await selectFile(page)
  await page.getByLabel('Output format').selectOption('flac')
  await page.getByRole('button', { name: 'Convert file', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download file', exact: true })).toBeVisible()
  await selectFile(page, 'replacement.wav')
  await expect(page.getByRole('button', { name: 'Download file', exact: true })).toHaveCount(0)
  await expect(page.locator('#selected-file')).toContainText('replacement.wav')
  await page.getByRole('button', { name: 'Remove file' }).click()
  await expect(page.getByRole('button', { name: 'Convert file', exact: true })).toBeDisabled()
  await expect(page.getByLabel('Output format')).toHaveValue('flac')
})

test('extracts YouTube audio with a trimmed URL and unchanged JSON payload', async ({ page }) => {
  await chooseTool(page, 'YouTube audio')
  await page.getByLabel('YouTube URL').fill('  https://www.youtube.com/watch?v=synthetic-tone  ')
  await page.getByLabel('Output format').selectOption('m4a')
  await page.getByLabel(/^Bitrate/).focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  const requestPromise = page.waitForRequest((request) => request.url().endsWith('/api/youtube') && request.method() === 'POST')
  await page.getByRole('button', { name: 'Extract audio', exact: true }).click()
  expect((await requestPromise).postDataJSON()).toEqual({
    url: 'https://www.youtube.com/watch?v=synthetic-tone', format: 'm4a', quality: '256',
  })
  await expect(page.getByRole('status')).toContainText('YouTube audio extracted.')
  await page.getByLabel('YouTube URL').fill('https://youtu.be/another-synthetic-tone')
  await expect(page.getByRole('button', { name: 'Download file', exact: true })).toHaveCount(0)
})

test('rejects invalid YouTube URLs without making a request', async ({ page }) => {
  await chooseTool(page, 'YouTube audio')
  let requests = 0
  page.on('request', (request) => {
    if (request.method() === 'POST') requests++
  })
  await page.getByLabel('YouTube URL').fill('not-a-url')
  await page.getByRole('button', { name: 'Extract audio', exact: true }).click()
  await expect(page.getByLabel('YouTube URL')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('status')).toContainText('Enter a valid')
  expect(requests).toBe(0)
  await page.getByLabel('YouTube URL').fill('https://youtu.be/synthetic-tone')
  await expect(page.getByLabel('YouTube URL')).not.toHaveAttribute('aria-invalid', 'true')
})

test('updates only nonblank metadata and retains the returned extension', async ({ page }) => {
  await page.route('**/api/metadata', (route) => fulfillJson(route, apiResult('tagged.wav', 'Synthetic Tone')))
  await chooseTool(page, 'Edit metadata')
  await selectFile(page)
  await page.getByLabel('Artist', { exact: true }).fill('Test artist')
  await page.getByLabel('Title', { exact: true }).fill('Synthetic tone')
  await page.getByLabel('Album', { exact: true }).fill('   ')
  await page.getByLabel('Genre', { exact: true }).fill('Test')
  const requestPromise = page.waitForRequest((request) => request.url().endsWith('/api/metadata'))
  await page.getByRole('button', { name: 'Save metadata' }).click()
  expect(multipartFields(await requestPromise)).toEqual({ artist: 'Test artist', title: 'Synthetic tone', genre: 'Test' })
  await expect(page.getByRole('status')).toContainText('Metadata saved.')
  await expect(page.getByRole('region', { name: 'Your file is ready' })).toContainText('synthetic-tone_anytrack.wav')
})

test('keeps result labels and download filename tied to the completed request', async ({ page }) => {
  await selectFile(page)
  await page.getByRole('button', { name: 'Convert file', exact: true }).click()
  const result = page.getByRole('region', { name: 'Your file is ready' })
  await expect(result).toContainText('MP3')
  await page.getByLabel('Output format').selectOption('flac')
  await expect(result).toContainText('MP3')
  await expect(result).not.toContainText('FLAC')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download file', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('sample-tone_anytrack.mp3')
  expect(await download.failure()).toBeNull()
})

for (const response of [
  { name: 'JSON errors', body: JSON.stringify({ success: false, message: 'Synthetic conversion failed' }), status: 500, contentType: 'application/json', message: 'Synthetic conversion failed' },
  { name: 'plain-text framework errors', body: 'FFmpeg could not be started', status: 500, contentType: 'text/plain', message: 'FFmpeg could not be started' },
  { name: 'unexpected HTML', body: '<html>Not an API response</html>', status: 502, contentType: 'text/html', message: 'unexpected response' },
  { name: 'malformed JSON', body: '{broken', status: 200, contentType: 'application/json', message: 'invalid response' },
  { name: 'missing output IDs', body: JSON.stringify({ success: true }), status: 200, contentType: 'application/json', message: 'output file' },
  { name: 'invalid output IDs', body: JSON.stringify(apiResult('../result.mp3')), status: 200, contentType: 'application/json', message: 'output file' },
  { name: 'unsuccessful HTTP status', body: JSON.stringify(apiResult()), status: 500, contentType: 'application/json', message: '500' },
]) {
  test(`handles ${response.name} without exposing a false result`, async ({ page }) => {
    await page.route('**/api/convert', (route) => route.fulfill({
      body: response.body,
      status: response.status,
      contentType: response.contentType,
      headers: { 'access-control-allow-origin': '*' },
    }))
    await selectFile(page)
    await page.getByRole('button', { name: 'Convert file', exact: true }).click()
    await expect(page.getByRole('status')).toContainText(response.message)
    await expect(page.getByRole('button', { name: 'Download file', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Convert file', exact: true })).toBeEnabled()
    await expect(page.locator('#selected-file')).toContainText('sample-tone.wav')
    await expectAccessible(page)
  })
}

test('reports network failures and lets the same input be retried', async ({ page }) => {
  await page.route('**/api/convert', (route) => route.abort('connectionrefused'))
  await selectFile(page)
  await page.getByRole('button', { name: 'Convert file', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('reach the API')
  await page.route('**/api/convert', (route) => fulfillJson(route))
  await page.getByRole('button', { name: 'Convert file', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Audio converted.')
})

test('keeps download available when the browser cannot preview the codec', async ({ page }) => {
  await page.route('**/api/download/**', (route) => route.fulfill({
    contentType: 'audio/wav',
    headers: { 'access-control-allow-origin': '*' },
    body: Buffer.from('not playable audio'),
  }))
  await selectFile(page)
  await page.getByRole('button', { name: 'Convert file', exact: true }).click()
  await expect(page.getByText('Your browser cannot preview this file. Download it to listen.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download file', exact: true })).toBeEnabled()
})

test('does not save failed or empty download responses', async ({ page }) => {
  await selectFile(page)
  await page.getByRole('button', { name: 'Convert file', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download file', exact: true })).toBeVisible()
  let downloads = 0
  page.on('download', () => { downloads++ })
  for (const response of [
    { status: 404, body: 'Missing output', contentType: 'application/octet-stream', message: 'Download failed (HTTP 404)' },
    { status: 200, body: '', contentType: 'application/octet-stream', message: 'empty file' },
    { status: 200, body: '<html>Wrong service</html>', contentType: 'text/html', message: 'did not return an audio file' },
    { status: 200, body: 'Wrong service', contentType: 'text/plain', message: 'did not return an audio file' },
  ]) {
    await page.route('**/api/download/**', (route) => route.fulfill({
      status: response.status,
      body: response.body,
      contentType: response.contentType,
      headers: { 'access-control-allow-origin': '*' },
    }))
    await page.getByRole('button', { name: 'Download file', exact: true }).click()
    await expect(page.getByRole('status')).toContainText(response.message)
    await expect(page.getByRole('button', { name: 'Download file', exact: true })).toBeEnabled()
  }
  expect(downloads).toBe(0)
})

test('prevents duplicate downloads and revokes temporary object URLs', async ({ page }) => {
  await selectFile(page)
  await page.getByRole('button', { name: 'Convert file', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download file', exact: true })).toBeVisible()
  await page.evaluate(() => {
    window.createdDownloads = []
    window.revokedDownloads = []
    const create = URL.createObjectURL.bind(URL)
    const revoke = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = (blob) => {
      const url = create(blob)
      window.createdDownloads.push(url)
      return url
    }
    URL.revokeObjectURL = (url) => {
      window.revokedDownloads.push(url)
      revoke(url)
    }
  })
  let release
  const responseReady = new Promise((resolve) => { release = resolve })
  await page.route('**/api/download/**', async (route) => {
    await responseReady
    await route.fulfill({
      contentType: 'audio/wav',
      headers: { 'access-control-allow-origin': '*' },
      body: audioFile().buffer,
    })
  })
  await page.getByRole('button', { name: 'Download file', exact: true }).click()
  try {
    await expect(page.getByRole('button', { name: 'Downloading...' })).toBeDisabled()
  } finally {
    release()
  }
  await expect(page.getByRole('button', { name: 'Download file', exact: true })).toBeEnabled()
  const urls = await page.evaluate(() => ({ created: window.createdDownloads, revoked: window.revokedDownloads }))
  expect(urls.created).toHaveLength(1)
  expect(urls.revoked).toEqual(urls.created)
})

test('works by keyboard with visible focus and native advanced controls', async ({ page }) => {
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Choose audio file')).toBeFocused()
  const chooserPromise = page.waitForEvent('filechooser')
  await page.keyboard.press('Space')
  await (await chooserPromise).setFiles(audioFile())
  const advanced = page.getByRole('button', { name: 'Advanced settings' })
  for (let index = 0; index < 8 && !(await advanced.evaluate((element) => element === document.activeElement)); index++) {
    await page.keyboard.press('Tab')
  }
  await expect(advanced).toBeFocused()
  const focus = await advanced.evaluate((element) => {
    const style = getComputedStyle(element)
    return { width: style.outlineWidth, style: style.outlineStyle }
  })
  expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(3)
  expect(focus.style).toBe('solid')
  await page.keyboard.press('Space')
  await expect(advanced).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Tab')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByLabel('Variable')).toBeChecked()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Sample rate')).toBeFocused()
  await page.keyboard.type('48')
  await expect(page.getByLabel('Sample rate')).toHaveValue('48000')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Mono')
  await expect(page.getByLabel('Channels')).toHaveValue('1')
  for (const label of ['Fade in', 'Fade out', 'Reverse']) {
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    await expect(page.getByLabel(label, { exact: true })).toBeChecked()
  }
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Convert file', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('Audio converted.')
  await expect(page.getByRole('button', { name: 'Convert file', exact: true })).toBeFocused()
})

test('all workflows and expanded controls pass automated accessibility checks', async ({ page }) => {
  await expectAccessible(page)
  await selectFile(page)
  await page.getByRole('button', { name: 'Advanced settings' }).click()
  await expectAccessible(page)
  await chooseTool(page, 'YouTube audio')
  await expectAccessible(page)
  await chooseTool(page, 'Edit metadata')
  await expectAccessible(page)
  await page.getByRole('button', { name: 'Save metadata' }).click()
  await expect(page.getByRole('region', { name: 'Your file is ready' })).toBeVisible()
  await expectAccessible(page)
})

test('reflows long content across narrow and wide layouts with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/convert', (route) => fulfillJson(route, apiResult('result.mp3', 'long-synthetic-name-'.repeat(15))))
  await selectFile(page, `${'long-synthetic-name-'.repeat(15)}.wav`)
  await page.getByRole('button', { name: 'Advanced settings' }).click()
  for (const width of [320, 375, 768, 959, 960, 961, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    for (const button of await page.getByRole('button').all()) {
      if (await button.isVisible()) {
        const box = await button.boundingBox()
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    }
  }
  await page.getByRole('button', { name: 'Convert file', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Your file is ready' })).toBeVisible()
  await page.setViewportSize({ width: 320, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await expectAccessible(page)
  await chooseTool(page, 'YouTube audio')
  await page.getByLabel('YouTube URL').fill(`https://www.youtube.com/watch?v=${'synthetic-'.repeat(80)}`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await chooseTool(page, 'Edit metadata')
  await page.getByLabel('Artist', { exact: true }).fill('Long synthetic artist '.repeat(20))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})
