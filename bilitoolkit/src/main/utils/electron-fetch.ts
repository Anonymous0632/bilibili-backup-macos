import { net } from 'electron'
import https from 'node:https'

const BILIBILI_HOST_REGEXP = /(^|\.)bilibili\.com$|(^|\.)hdslb\.com$/
const CERTIFICATE_ERROR_CODES = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
])

function normalizeUrl(input: Parameters<typeof fetch>[0]): URL | null {
  try {
    if (typeof input === 'string' || input instanceof URL) return new URL(input)
    return new URL(input.url)
  } catch {
    return null
  }
}

function isBilibiliUrl(input: Parameters<typeof fetch>[0]) {
  const url = normalizeUrl(input)
  return !!url && BILIBILI_HOST_REGEXP.test(url.hostname)
}

function isCertificateError(error: unknown): boolean {
  let curr: unknown = error
  while (curr && typeof curr === 'object') {
    const code = 'code' in curr ? curr.code : undefined
    if (typeof code === 'string' && CERTIFICATE_ERROR_CODES.has(code)) return true
    curr = 'cause' in curr ? curr.cause : undefined
  }
  return false
}

function isRetriableElectronNetworkError(error: unknown): boolean {
  if (error instanceof Error && error.message.includes('net::ERR_BLOCKED_BY_CLIENT')) return true
  return isCertificateError(error)
}

function headersToObject(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {}
  if (headers instanceof Headers) return Object.fromEntries(headers.entries())
  if (Array.isArray(headers)) return Object.fromEntries(headers.map(([key, value]) => [key, String(value)]))
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, String(value)]))
}

async function bodyToBuffer(body: BodyInit | null | undefined): Promise<Buffer | undefined> {
  if (!body) return undefined
  if (typeof body === 'string') return Buffer.from(body)
  if (body instanceof URLSearchParams) return Buffer.from(body.toString())
  if (body instanceof ArrayBuffer) return Buffer.from(body)
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength)
  if (body instanceof Blob) return Buffer.from(await body.arrayBuffer())
  throw new Error('当前请求体类型暂不支持证书兜底')
}

async function insecureBilibiliFetch(input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> {
  const url = normalizeUrl(input)
  if (!url) throw new Error('无效的请求 URL')

  const body = await bodyToBuffer(init?.body)
  const headers = headersToObject(init?.headers)

  return await new Promise<Response>((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: init?.method ?? 'GET',
        headers,
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        res.on('end', () => {
          const responseHeaders: [string, string][] = []
          for (let i = 0; i < res.rawHeaders.length; i += 2) {
            responseHeaders.push([res.rawHeaders[i], res.rawHeaders[i + 1]])
          }
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode ?? 0,
              statusText: res.statusMessage,
              headers: responseHeaders,
            }),
          )
        })
      },
    )

    req.on('error', reject)

    if (init?.signal) {
      const abort = () => {
        req.destroy(init.signal?.reason instanceof Error ? init.signal.reason : new Error('请求已取消'))
      }
      if (init.signal.aborted) {
        abort()
        return
      }
      init.signal.addEventListener('abort', abort, { once: true })
      req.on('close', () => init.signal?.removeEventListener('abort', abort))
    }

    if (body) req.write(body)
    req.end()
  })
}

export const electronFetch: typeof fetch = async (input, init) => {
  try {
    return (await net.fetch(input as Parameters<typeof net.fetch>[0], init as Parameters<typeof net.fetch>[1])) as Response
  } catch (error) {
    if (!isBilibiliUrl(input) || !isRetriableElectronNetworkError(error)) throw error
    return insecureBilibiliFetch(input, init)
  }
}

export function installElectronFetch() {
  globalThis.fetch = electronFetch
}
