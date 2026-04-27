import cors from 'cors'
import express from 'express'
import multer from 'multer'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { databaseName, execute, query, queryOne } from './db.js'

const app = express()
const PORT = Number(process.env.PORT ?? 8507)
const DEFAULT_PASSWORD = '111111'
const MOBILE_PHONE_REGEX = /^1\d{10}$/
const DETAIL_SECTION_TYPES = new Set(['text', 'richtext', 'image', 'video', 'gallery', 'features', 'specs', 'downloads', 'quote'])
const sessions = new Map()
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const uploadsRoot = path.join(serverRoot, 'uploads')
const allowedUploadExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])

mkdirSync(uploadsRoot, { recursive: true })

function sanitizeUploadSubdir(value) {
  return String(value ?? 'products')
    .split('/')
    .map((segment) => segment.trim().replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean)
    .slice(0, 3)
    .join('/')
}

const uploadStorage = multer.diskStorage({
  destination(request, _file, callback) {
    const subdir = sanitizeUploadSubdir(request.body.subdir)
    const destination = path.join(uploadsRoot, subdir || 'products')
    mkdirSync(destination, { recursive: true })
    callback(null, destination)
  },
  filename(_request, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase()
    const safeExtension = allowedUploadExtensions.has(extension) ? extension : '.jpg'
    callback(null, `${Date.now()}-${randomUUID()}${safeExtension}`)
  }
})

const uploadImages = multer({
  storage: uploadStorage,
  limits: {
    files: 12,
    fileSize: 8 * 1024 * 1024
  },
  fileFilter(_request, file, callback) {
    if (file.mimetype.startsWith('image/')) {
      callback(null, true)
      return
    }

    callback(new Error('仅支持上传图片文件'))
  }
})

app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use('/api/uploads', express.static(uploadsRoot))

function createPasswordHash(password, salt = randomBytes(16).toString('hex')) {
  return {
    salt,
    hash: scryptSync(password, salt, 64).toString('hex')
  }
}

function verifyPassword(password, hash, salt) {
  const incomingHash = Buffer.from(scryptSync(password, salt, 64).toString('hex'), 'hex')
  const savedHash = Buffer.from(hash, 'hex')

  if (incomingHash.length !== savedHash.length) {
    return false
  }

  return timingSafeEqual(incomingHash, savedHash)
}

function sanitizeAdmin(admin) {
  return {
    id: admin.id,
    phone: admin.phone,
    isSystemAdmin: Boolean(admin.isSystemAdmin),
    mustChangePassword: Boolean(admin.mustChangePassword),
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
    lastLoginAt: admin.lastLoginAt ?? null
  }
}

function sortProducts(products) {
  return [...products].sort((left, right) => {
    if (Number(right.isFeatured) !== Number(left.isFeatured)) {
      return Number(right.isFeatured) - Number(left.isFeatured)
    }

    if ((left.sortOrder ?? 0) !== (right.sortOrder ?? 0)) {
      return (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  })
}

function sortBrands(brands) {
  return [...brands].sort((left, right) => {
    if (Number(right.isVisible) !== Number(left.isVisible)) {
      return Number(right.isVisible) - Number(left.isVisible)
    }

    if (Number(right.isOwned) !== Number(left.isOwned)) {
      return Number(right.isOwned) - Number(left.isOwned)
    }

    if ((left.sortOrder ?? 0) !== (right.sortOrder ?? 0)) {
      return (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  })
}

function extractToken(request) {
  const authorization = request.headers.authorization ?? ''

  if (authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim()
  }

  return ''
}

async function requireAdmin(request, response, next) {
  const token = extractToken(request)

  if (!token || !sessions.has(token)) {
    response.status(401).json({ message: '请先登录后台' })
    return
  }

  const session = sessions.get(token)
  const admin = await fetchAdminById(session.adminId)

  if (!admin) {
    sessions.delete(token)
    response.status(401).json({ message: '登录状态失效，请重新登录' })
    return
  }

  request.auth = {
    token,
    admin
  }
  next()
}

function requireSystemAdmin(request, response, next) {
  if (!request.auth?.admin?.isSystemAdmin) {
    response.status(403).json({ message: '仅系统管理员可管理后台账号' })
    return
  }

  next()
}

function toStringList(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
}

function toSpecList(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => ({
      label: String(item?.label ?? '').trim(),
      value: String(item?.value ?? '').trim()
    }))
    .filter((item) => item.label && item.value)
}

function toDownloadList(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => ({
      name: String(item?.name ?? '').trim(),
      url: String(item?.url ?? '').trim(),
      description: String(item?.description ?? '').trim()
    }))
    .filter((item) => item.name && item.url)
}

function createSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeDetailSection(input = {}, existing = {}) {
  const type = DETAIL_SECTION_TYPES.has(input.type) ? input.type : existing.type ?? 'text'
  const id = String(input.id ?? existing.id ?? '').trim() || randomUUID()
  const base = {
    id,
    type,
    title: String(input.title ?? existing.title ?? '').trim()
  }

  if (type === 'text') {
    return {
      ...base,
      content: String(input.content ?? existing.content ?? '').trim()
    }
  }

  if (type === 'richtext') {
    return {
      ...base,
      content: String(input.content ?? existing.content ?? '').trim()
    }
  }

  if (type === 'image') {
    return {
      ...base,
      image: String(input.image ?? existing.image ?? '').trim(),
      caption: String(input.caption ?? existing.caption ?? '').trim()
    }
  }

  if (type === 'video') {
    return {
      ...base,
      videoUrl: String(input.videoUrl ?? existing.videoUrl ?? '').trim(),
      posterImage: String(input.posterImage ?? existing.posterImage ?? '').trim(),
      caption: String(input.caption ?? existing.caption ?? '').trim()
    }
  }

  if (type === 'gallery') {
    return {
      ...base,
      images: toStringList(input.images ?? existing.images ?? []),
      caption: String(input.caption ?? existing.caption ?? '').trim()
    }
  }

  if (type === 'features') {
    return {
      ...base,
      items: toStringList(input.items ?? existing.items ?? [])
    }
  }

  if (type === 'specs') {
    return {
      ...base,
      specs: toSpecList(input.specs ?? existing.specs ?? [])
    }
  }

  if (type === 'downloads') {
    return {
      ...base,
      files: toDownloadList(input.files ?? existing.files ?? [])
    }
  }

  return {
    ...base,
    quote: String(input.quote ?? existing.quote ?? '').trim(),
    author: String(input.author ?? existing.author ?? '').trim()
  }
}

function normalizeDetailSections(value, existing = []) {
  if (!Array.isArray(value)) {
    return Array.isArray(existing) ? existing.map((item) => normalizeDetailSection(item)) : []
  }

  return value.map((item, index) => normalizeDetailSection(item, existing[index]))
}

function normalizeBrand(input, existing = {}) {
  const now = new Date().toISOString()
  const nextId = existing.id || createSlug(input.englishName || input.name || input.id) || randomUUID()

  return {
    id: nextId,
    name: String(input.name ?? existing.name ?? '').trim(),
    englishName: String(input.englishName ?? existing.englishName ?? '').trim(),
    slogan: String(input.slogan ?? existing.slogan ?? '').trim(),
    description: String(input.description ?? existing.description ?? '').trim(),
    coverImage: String(input.coverImage ?? existing.coverImage ?? '').trim(),
    color: String(input.color ?? existing.color ?? '#57703c').trim() || '#57703c',
    isOwned: Boolean(input.isOwned ?? existing.isOwned),
    isVisible: Boolean(input.isVisible ?? existing.isVisible),
    sortOrder: Number(input.sortOrder ?? existing.sortOrder ?? 0),
    createdAt: existing.createdAt ?? now,
    updatedAt: now
  }
}

function normalizeProduct(input, existing = {}) {
  const now = new Date().toISOString()
  const nextId = String(input.id ?? existing.id ?? '').trim() || existing.id || randomUUID()

  return {
    id: nextId,
    brandId: String(input.brandId ?? existing.brandId ?? '').trim(),
    name: String(input.name ?? existing.name ?? '').trim(),
    category: String(input.category ?? existing.category ?? '').trim(),
    origin: String(input.origin ?? existing.origin ?? '').trim(),
    priceLabel: String(input.priceLabel ?? existing.priceLabel ?? '').trim(),
    description: String(input.description ?? existing.description ?? '').trim(),
    image: String(input.image ?? existing.image ?? '').trim(),
    badge: String(input.badge ?? existing.badge ?? '').trim(),
    highlights: toStringList(input.highlights ?? existing.highlights ?? []),
    detailSections: normalizeDetailSections(input.detailSections ?? existing.detailSections ?? []),
    isFeatured: Boolean(input.isFeatured ?? existing.isFeatured),
    isPublished: Boolean(input.isPublished ?? existing.isPublished),
    sortOrder: Number(input.sortOrder ?? existing.sortOrder ?? 0),
    createdAt: existing.createdAt ?? now,
    updatedAt: now
  }
}

function validateBrand(brand) {
  const requiredFields = ['name', 'slogan', 'description', 'coverImage']
  const missingField = requiredFields.find((field) => !brand[field])

  if (missingField) {
    return `缺少字段：${missingField}`
  }

  return null
}

function validateDetailSections(detailSections) {
  if (!Array.isArray(detailSections)) {
    return null
  }

  for (const section of detailSections) {
    if (section.type === 'text' && !section.content) {
      return '文本模块需要填写内容'
    }

    if (section.type === 'richtext' && !section.content) {
      return '富文本模块需要填写内容'
    }

    if (section.type === 'image' && !section.image) {
      return '图片模块需要填写图片链接'
    }

    if (section.type === 'video' && !section.videoUrl) {
      return '视频模块需要填写视频链接'
    }

    if (section.type === 'gallery' && (!Array.isArray(section.images) || section.images.length === 0)) {
      return '图集模块至少需要一张图片'
    }

    if (section.type === 'features' && (!Array.isArray(section.items) || section.items.length === 0)) {
      return '卖点模块至少需要一项内容'
    }

    if (section.type === 'specs' && (!Array.isArray(section.specs) || section.specs.length === 0)) {
      return '参数模块至少需要一条参数'
    }

    if (section.type === 'downloads' && (!Array.isArray(section.files) || section.files.length === 0)) {
      return '下载资料模块至少需要一个文件'
    }

    if (section.type === 'quote' && !section.quote) {
      return '引用模块需要填写引用内容'
    }
  }

  return null
}

function validateProduct(product, brands) {
  const requiredFields = ['brandId', 'name', 'category', 'origin', 'priceLabel', 'description', 'image']
  const missingField = requiredFields.find((field) => !product[field])

  if (missingField) {
    return `缺少字段：${missingField}`
  }

  if (!brands.some((brand) => brand.id === product.brandId)) {
    return '请选择有效品牌'
  }

  if (!product.highlights.length) {
    return '请至少填写一个产品亮点'
  }

  return validateDetailSections(product.detailSections)
}

function hydrateBrands(brands) {
  return sortBrands(brands)
}

function hydrateProducts(products, brands) {
  return sortProducts(products).map((product) => {
    const brand = brands.find((item) => item.id === product.brandId)

    return {
      ...product,
      detailSections: normalizeDetailSections(product.detailSections),
      brandName: brand?.name ?? '未分配品牌',
      brandEnglishName: brand?.englishName ?? '',
      brandOwned: Boolean(brand?.isOwned),
      brandVisible: Boolean(brand?.isVisible)
    }
  })
}

function parseJsonField(raw, fallback) {
  if (!raw) {
    return fallback
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function mapAdminRow(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    phone: row.phone,
    isSystemAdmin: Boolean(row.is_system_admin),
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    mustChangePassword: Boolean(row.must_change_password),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at ?? null
  }
}

function mapBrandRow(row) {
  return {
    id: row.id,
    name: row.name,
    englishName: row.english_name ?? '',
    slogan: row.slogan,
    description: row.description,
    coverImage: row.cover_image,
    color: row.color ?? '#57703c',
    isOwned: Boolean(row.is_owned),
    isVisible: Boolean(row.is_visible),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapProductRow(row) {
  return {
    id: row.id,
    brandId: row.brand_id,
    name: row.name,
    category: row.category,
    origin: row.origin,
    priceLabel: row.price_label,
    description: row.description,
    image: row.image,
    badge: row.badge ?? '',
    highlights: parseJsonField(row.highlights_json, []),
    detailSections: normalizeDetailSections(parseJsonField(row.detail_sections_json, [])),
    isFeatured: Boolean(row.is_featured),
    isPublished: Boolean(row.is_published),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

async function fetchAdminByPhone(phone) {
  const row = await queryOne('SELECT * FROM admins WHERE phone = ? LIMIT 1', [phone])
  return mapAdminRow(row)
}

async function fetchAdminById(id) {
  const row = await queryOne('SELECT * FROM admins WHERE id = ? LIMIT 1', [id])
  return mapAdminRow(row)
}

async function insertAdmin(admin) {
  await execute(
    `
      INSERT INTO admins (
        id, phone, is_system_admin, password_hash, password_salt, must_change_password, created_at, updated_at, last_login_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      admin.id,
      admin.phone,
      admin.isSystemAdmin ? 1 : 0,
      admin.passwordHash,
      admin.passwordSalt,
      admin.mustChangePassword ? 1 : 0,
      admin.createdAt,
      admin.updatedAt,
      admin.lastLoginAt
    ]
  )
}

async function updateAdminLogin(adminId, now) {
  await execute('UPDATE admins SET last_login_at = ?, updated_at = ? WHERE id = ?', [now, now, adminId])
}

async function updateAdminPassword(admin) {
  await execute(
    `
      UPDATE admins
      SET password_hash = ?, password_salt = ?, must_change_password = ?, is_system_admin = ?, updated_at = ?
      WHERE id = ?
    `,
    [
      admin.passwordHash,
      admin.passwordSalt,
      admin.mustChangePassword ? 1 : 0,
      admin.isSystemAdmin ? 1 : 0,
      admin.updatedAt,
      admin.id
    ]
  )
}

async function fetchAdmins() {
  const rows = await query('SELECT * FROM admins ORDER BY is_system_admin DESC, created_at ASC')
  return rows.map(mapAdminRow)
}

async function fetchBrands() {
  const rows = await query('SELECT * FROM brands')
  return rows.map(mapBrandRow)
}

async function fetchBrandById(id) {
  const row = await queryOne('SELECT * FROM brands WHERE id = ? LIMIT 1', [id])
  return row ? mapBrandRow(row) : null
}

async function insertBrand(brand) {
  await execute(
    `
      INSERT INTO brands (
        id, name, english_name, slogan, description, cover_image, color, is_owned, is_visible, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      brand.id,
      brand.name,
      brand.englishName,
      brand.slogan,
      brand.description,
      brand.coverImage,
      brand.color,
      brand.isOwned ? 1 : 0,
      brand.isVisible ? 1 : 0,
      brand.sortOrder,
      brand.createdAt,
      brand.updatedAt
    ]
  )
}

async function updateBrandRow(brand) {
  await execute(
    `
      UPDATE brands
      SET name = ?, english_name = ?, slogan = ?, description = ?, cover_image = ?, color = ?, is_owned = ?, is_visible = ?, sort_order = ?, updated_at = ?
      WHERE id = ?
    `,
    [
      brand.name,
      brand.englishName,
      brand.slogan,
      brand.description,
      brand.coverImage,
      brand.color,
      brand.isOwned ? 1 : 0,
      brand.isVisible ? 1 : 0,
      brand.sortOrder,
      brand.updatedAt,
      brand.id
    ]
  )
}

async function deleteBrandRow(id) {
  const result = await execute('DELETE FROM brands WHERE id = ?', [id])
  return result.affectedRows
}

async function countProductsByBrandId(brandId) {
  const row = await queryOne('SELECT COUNT(*) AS total FROM products WHERE brand_id = ?', [brandId])
  return Number(row?.total ?? 0)
}

async function fetchProducts() {
  const rows = await query('SELECT * FROM products')
  return rows.map(mapProductRow)
}

async function fetchProductById(id) {
  const row = await queryOne('SELECT * FROM products WHERE id = ? LIMIT 1', [id])
  return row ? mapProductRow(row) : null
}

async function insertProduct(product) {
  await execute(
    `
      INSERT INTO products (
        id, brand_id, name, category, origin, price_label, description, image, badge, highlights_json, detail_sections_json,
        is_featured, is_published, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      product.id,
      product.brandId,
      product.name,
      product.category,
      product.origin,
      product.priceLabel,
      product.description,
      product.image,
      product.badge,
      JSON.stringify(product.highlights),
      JSON.stringify(product.detailSections),
      product.isFeatured ? 1 : 0,
      product.isPublished ? 1 : 0,
      product.sortOrder,
      product.createdAt,
      product.updatedAt
    ]
  )
}

async function updateProductRow(product) {
  await execute(
    `
      UPDATE products
      SET brand_id = ?, name = ?, category = ?, origin = ?, price_label = ?, description = ?, image = ?, badge = ?,
          highlights_json = ?, detail_sections_json = ?, is_featured = ?, is_published = ?, sort_order = ?, updated_at = ?
      WHERE id = ?
    `,
    [
      product.brandId,
      product.name,
      product.category,
      product.origin,
      product.priceLabel,
      product.description,
      product.image,
      product.badge,
      JSON.stringify(product.highlights),
      JSON.stringify(product.detailSections),
      product.isFeatured ? 1 : 0,
      product.isPublished ? 1 : 0,
      product.sortOrder,
      product.updatedAt,
      product.id
    ]
  )
}

async function deleteProductRow(id) {
  const result = await execute('DELETE FROM products WHERE id = ?', [id])
  return result.affectedRows
}

app.get('/api/health', async (_request, response) => {
  await queryOne('SELECT 1 AS ok')
  response.json({ ok: true })
})

app.get('/api/brands', async (_request, response) => {
  const brands = await fetchBrands()
  response.json(hydrateBrands(brands.filter((brand) => brand.isVisible)))
})

app.get('/api/products', async (_request, response) => {
  const [products, brands] = await Promise.all([fetchProducts(), fetchBrands()])
  response.json(hydrateProducts(products.filter((product) => product.isPublished), brands))
})

app.get('/api/products/:id', async (request, response) => {
  const [product, brands] = await Promise.all([fetchProductById(request.params.id), fetchBrands()])

  if (!product || !product.isPublished) {
    response.status(404).json({ message: '商品不存在或未上架' })
    return
  }

  response.json(hydrateProducts([product], brands)[0])
})

app.post('/api/admin/auth/login', async (request, response) => {
  const phone = String(request.body.phone ?? '').trim()
  const password = String(request.body.password ?? '').trim()

  if (!MOBILE_PHONE_REGEX.test(phone)) {
    response.status(400).json({ message: '请输入 11 位手机号' })
    return
  }

  if (!password) {
    response.status(400).json({ message: '请输入密码' })
    return
  }

  const now = new Date().toISOString()
  let admin = await fetchAdminByPhone(phone)

  if (!admin) {
    response.status(401).json({ message: '账号不存在，请联系系统管理员创建后台用户' })
    return
  }

  const valid = verifyPassword(password, admin.passwordHash, admin.passwordSalt)

  if (!valid) {
    response.status(401).json({ message: '手机号或密码错误' })
    return
  }

  admin = {
    ...admin,
    updatedAt: now,
    lastLoginAt: now
  }
  await updateAdminLogin(admin.id, now)

  const token = randomBytes(24).toString('hex')
  sessions.set(token, {
    adminId: admin.id,
    phone: admin.phone,
    createdAt: now
  })

  response.json({
    token,
    admin: sanitizeAdmin(admin)
  })
})

app.get('/api/admin/auth/me', requireAdmin, async (request, response) => {
  response.json({
    admin: sanitizeAdmin(request.auth.admin)
  })
})

app.post('/api/admin/auth/change-password', requireAdmin, async (request, response) => {
  const currentPassword = String(request.body.currentPassword ?? '').trim()
  const nextPassword = String(request.body.nextPassword ?? '').trim()

  if (!currentPassword || !nextPassword) {
    response.status(400).json({ message: '请完整填写当前密码和新密码' })
    return
  }

  if (nextPassword.length < 6) {
    response.status(400).json({ message: '新密码至少需要 6 位' })
    return
  }

  const targetAdmin = await fetchAdminById(request.auth.admin.id)

  if (!targetAdmin) {
    response.status(404).json({ message: '管理员不存在' })
    return
  }

  const validCurrentPassword = verifyPassword(
    currentPassword,
    targetAdmin.passwordHash,
    targetAdmin.passwordSalt
  )

  if (!validCurrentPassword) {
    response.status(400).json({ message: '当前密码不正确' })
    return
  }

  const { hash, salt } = createPasswordHash(nextPassword)
  const now = new Date().toISOString()
  const nextAdmin = {
    ...targetAdmin,
    passwordHash: hash,
    passwordSalt: salt,
    mustChangePassword: false,
    updatedAt: now
  }

  await updateAdminPassword(nextAdmin)
  response.json({
    message: '密码修改成功',
    admin: sanitizeAdmin(nextAdmin)
  })
})

app.post('/api/admin/auth/logout', requireAdmin, async (request, response) => {
  sessions.delete(request.auth.token)
  response.status(204).end()
})

app.get('/api/admin/users', requireAdmin, requireSystemAdmin, async (_request, response) => {
  const admins = await fetchAdmins()
  response.json(admins.map(sanitizeAdmin))
})

app.post('/api/admin/users', requireAdmin, requireSystemAdmin, async (request, response) => {
  const phone = String(request.body.phone ?? '').trim()
  const password = String(request.body.password ?? '').trim() || DEFAULT_PASSWORD
  const isSystemAdmin = Boolean(request.body.isSystemAdmin)
  const mustChangePassword = Boolean(request.body.mustChangePassword ?? true)

  if (!MOBILE_PHONE_REGEX.test(phone)) {
    response.status(400).json({ message: '请输入有效的 11 位手机号' })
    return
  }

  if (password.length < 6) {
    response.status(400).json({ message: '初始密码至少需要 6 位' })
    return
  }

  const existingAdmin = await fetchAdminByPhone(phone)

  if (existingAdmin) {
    response.status(400).json({ message: '该手机号已经存在后台账号' })
    return
  }

  const now = new Date().toISOString()
  const { hash, salt } = createPasswordHash(password)
  const admin = {
    id: randomUUID(),
    phone,
    isSystemAdmin,
    passwordHash: hash,
    passwordSalt: salt,
    mustChangePassword,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  }

  await insertAdmin(admin)
  response.status(201).json(sanitizeAdmin(admin))
})

app.post('/api/admin/uploads/images', requireAdmin, (request, response, next) => {
  uploadImages.array('files', 12)(request, response, (error) => {
    if (error) {
      next(error)
      return
    }

    next()
  })
}, async (request, response) => {
  const files = Array.isArray(request.files) ? request.files : []

  if (!files.length) {
    response.status(400).json({ message: '请先选择要上传的图片' })
    return
  }

  const urls = files.map((file) => {
    const relativePath = path.relative(uploadsRoot, file.path).split(path.sep).join('/')
    return `/api/uploads/${relativePath}`
  })

  response.status(201).json({ urls })
})

app.get('/api/admin/brands', requireAdmin, async (_request, response) => {
  const brands = await fetchBrands()
  response.json(hydrateBrands(brands))
})

app.post('/api/admin/brands', requireAdmin, async (request, response) => {
  const brands = await fetchBrands()
  const nextBrand = normalizeBrand(request.body, {
    sortOrder: brands.length + 1
  })
  const validationError = validateBrand(nextBrand)

  if (validationError) {
    response.status(400).json({ message: validationError })
    return
  }

  const existingBrand = await fetchBrandById(nextBrand.id)

  if (existingBrand) {
    response.status(400).json({ message: '品牌 ID 已存在，请修改品牌名称或英文名' })
    return
  }

  await insertBrand(nextBrand)
  response.status(201).json(nextBrand)
})

app.put('/api/admin/brands/:id', requireAdmin, async (request, response) => {
  const currentBrand = await fetchBrandById(request.params.id)

  if (!currentBrand) {
    response.status(404).json({ message: '品牌不存在' })
    return
  }

  const nextBrand = normalizeBrand(request.body, currentBrand)
  const validationError = validateBrand(nextBrand)

  if (validationError) {
    response.status(400).json({ message: validationError })
    return
  }

  await updateBrandRow(nextBrand)
  response.json(nextBrand)
})

app.delete('/api/admin/brands/:id', requireAdmin, async (request, response) => {
  const hasLinkedProducts = (await countProductsByBrandId(request.params.id)) > 0

  if (hasLinkedProducts) {
    response.status(400).json({ message: '该品牌下仍有关联商品，请先调整商品品牌归属' })
    return
  }

  const affectedRows = await deleteBrandRow(request.params.id)

  if (!affectedRows) {
    response.status(404).json({ message: '品牌不存在' })
    return
  }

  response.status(204).end()
})

app.get('/api/admin/products', requireAdmin, async (_request, response) => {
  const [products, brands] = await Promise.all([fetchProducts(), fetchBrands()])
  response.json(hydrateProducts(products, brands))
})

app.post('/api/admin/products', requireAdmin, async (request, response) => {
  const [products, brands] = await Promise.all([fetchProducts(), fetchBrands()])
  const nextProduct = normalizeProduct(request.body, {
    sortOrder: products.length + 1
  })
  const validationError = validateProduct(nextProduct, brands)

  if (validationError) {
    response.status(400).json({ message: validationError })
    return
  }

  await insertProduct(nextProduct)
  response.status(201).json(hydrateProducts([nextProduct], brands)[0])
})

app.put('/api/admin/products/:id', requireAdmin, async (request, response) => {
  const [currentProduct, brands] = await Promise.all([fetchProductById(request.params.id), fetchBrands()])

  if (!currentProduct) {
    response.status(404).json({ message: '商品不存在' })
    return
  }

  const nextProduct = normalizeProduct(request.body, currentProduct)
  const validationError = validateProduct(nextProduct, brands)

  if (validationError) {
    response.status(400).json({ message: validationError })
    return
  }

  await updateProductRow(nextProduct)
  response.json(hydrateProducts([nextProduct], brands)[0])
})

app.delete('/api/admin/products/:id', requireAdmin, async (request, response) => {
  const affectedRows = await deleteProductRow(request.params.id)

  if (!affectedRows) {
    response.status(404).json({ message: '商品不存在' })
    return
  }

  response.status(204).end()
})

app.use((error, _request, response, _next) => {
  console.error('API error:', error)

  if (error?.message === '仅支持上传图片文件') {
    response.status(400).json({
      message: error.message
    })
    return
  }

  if (error?.code === 'LIMIT_FILE_SIZE') {
    response.status(400).json({
      message: '单张图片不能超过 8MB'
    })
    return
  }

  response.status(500).json({
    message: '服务器处理请求时出错，请稍后重试'
  })
})

app.listen(PORT, () => {
  console.log(`绿优源 API 已连接数据库 ${databaseName}：http://localhost:${PORT}/api`)
})
