import OSS from 'ali-oss'
import { randomUUID } from 'node:crypto'
import { config as loadDotenv } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadDotenv({ path: path.join(serverRoot, '.env'), quiet: true })

const ossRegion = String(process.env.OSS_REGION ?? '').trim()
const ossBucket = String(process.env.OSS_BUCKET ?? '').trim()
const ossEndpoint = String(process.env.OSS_ENDPOINT ?? '').trim()
const ossAccessKeyId = String(process.env.OSS_ACCESS_KEY_ID ?? '').trim()
const ossAccessKeySecret = String(process.env.OSS_ACCESS_KEY_SECRET ?? '').trim()
const ossRootPrefix = String(process.env.OSS_ROOT_PREFIX ?? 'prod').trim().replace(/^\/+|\/+$/g, '')
const configuredPublicBaseUrl = String(process.env.OSS_PUBLIC_BASE_URL ?? '').trim().replace(/\/+$/g, '')

let client

function normalizeEndpoint(endpoint) {
  return endpoint.replace(/^https?:\/\//, '').replace(/\/+$/g, '')
}

function sanitizeOssSubdir(value) {
  return String(value ?? '')
    .split('/')
    .map((segment) => segment.trim().replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean)
    .slice(0, 6)
    .join('/')
}

function buildPublicBaseUrl() {
  if (configuredPublicBaseUrl) {
    return configuredPublicBaseUrl
  }

  const endpoint = normalizeEndpoint(ossEndpoint || `${ossRegion}.aliyuncs.com`)
  return `https://${ossBucket}.${endpoint}`
}

export const ossEnabled = Boolean(ossRegion && ossBucket && ossAccessKeyId && ossAccessKeySecret)

export function getOssConfigSummary() {
  return {
    enabled: ossEnabled,
    region: ossRegion,
    bucket: ossBucket,
    endpoint: ossEndpoint || `${ossRegion}.aliyuncs.com`,
    publicBaseUrl: buildPublicBaseUrl(),
    rootPrefix: ossRootPrefix
  }
}

export function buildOssObjectKey(subdir, originalName = 'asset.jpg') {
  const safeSubdir = sanitizeOssSubdir(subdir)
  const extension = path.extname(originalName).toLowerCase() || '.jpg'
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return [ossRootPrefix, safeSubdir, year, month, day, `${Date.now()}-${randomUUID()}${extension}`]
    .filter(Boolean)
    .join('/')
}

export function getOssPublicUrl(key) {
  return `${buildPublicBaseUrl()}/${String(key ?? '').replace(/^\/+/, '')}`
}

export function createOssClient() {
  if (!ossEnabled) {
    throw new Error('OSS 未配置完整，无法创建上传客户端')
  }

  if (!client) {
    client = new OSS({
      region: ossRegion,
      bucket: ossBucket,
      accessKeyId: ossAccessKeyId,
      accessKeySecret: ossAccessKeySecret,
      endpoint: ossEndpoint || undefined,
      secure: true
    })
  }

  return client
}

export async function uploadBufferToOss(buffer, options = {}) {
  const key = options.key || buildOssObjectKey(options.subdir, options.originalName)
  const result = await createOssClient().put(key, buffer, {
    headers: {
      'Content-Type': options.contentType || 'application/octet-stream'
    }
  })

  return {
    key,
    url: getOssPublicUrl(key),
    etag: result.etag
  }
}

export async function uploadLocalFileToOss(filePath, options = {}) {
  const key = options.key || buildOssObjectKey(options.subdir, options.originalName)
  const result = await createOssClient().put(key, filePath, {
    headers: {
      'Content-Type': options.contentType || 'application/octet-stream'
    }
  })

  return {
    key,
    url: getOssPublicUrl(key),
    etag: result.etag
  }
}

export async function deleteOssObject(key) {
  if (!key) {
    return
  }

  await createOssClient().delete(String(key).replace(/^\/+/, ''))
}
