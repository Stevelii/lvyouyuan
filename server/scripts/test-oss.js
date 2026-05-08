import { config as loadDotenv } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { deleteOssObject, getOssConfigSummary, ossEnabled, uploadBufferToOss } from '../src/oss.js'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(scriptDir, '..')
loadDotenv({ path: path.join(serverRoot, '.env'), quiet: true })

const onePixelPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9oN8l1sAAAAASUVORK5CYII='

async function main() {
  if (!ossEnabled) {
    throw new Error('OSS 环境变量未配置完整，请先补齐 server/.env')
  }

  const summary = getOssConfigSummary()
  console.log('OSS 配置:', {
    ...summary,
    accessKeyIdConfigured: true,
    accessKeySecretConfigured: true
  })

  const upload = await uploadBufferToOss(Buffer.from(onePixelPngBase64, 'base64'), {
    subdir: 'test/connectivity',
    originalName: 'ping.png',
    contentType: 'image/png'
  })

  console.log('上传成功:', upload)
  await deleteOssObject(upload.key)
  console.log('测试对象已删除:', upload.key)
}

main().catch((error) => {
  console.error('OSS 测试失败:', error)
  process.exitCode = 1
})
