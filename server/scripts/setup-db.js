import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { closePool, createAdminConnection, databaseName, execute, queryOne } from '../src/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '..', 'data')

async function readJsonFile(fileName) {
  const filePath = path.resolve(dataDir, fileName)
  const content = await readFile(filePath, 'utf8')
  const parsed = JSON.parse(content)
  return Array.isArray(parsed) ? parsed : []
}

function toJson(value) {
  return JSON.stringify(value ?? [])
}

function toBooleanNumber(value) {
  return value ? 1 : 0
}

function createDefaultHomePageContent() {
  return {
    heroEyebrow: '优质农产品供应与品牌化选品',
    heroTitle: '绿优源，为企业福利、社区零售和家庭餐桌提供稳定的农产品组合。',
    heroDescription:
      '围绕节令蔬果礼盒、粮油杂粮、生鲜禽蛋、茶饮特产和地方风味食品，我们把产地资源、品牌表达和渠道需求整理成更容易采购与复购的产品方案。',
    primaryActionLabel: '了解品牌体系',
    secondaryActionLabel: '查看产品选品',
    backgroundImage:
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1600&q=80',
    cards: [
      {
        id: 'hero-card-1',
        image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=900&q=80',
        eyebrow: '华篮彩',
        title: '节令蔬果与企业福利礼盒'
      },
      {
        id: 'hero-card-2',
        image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=900&q=80',
        eyebrow: '蔬雀',
        title: '社区餐桌与高频生鲜零售'
      },
      {
        id: 'hero-card-3',
        image: 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=900&q=80',
        eyebrow: '星月优农',
        title: '生态粮油与健康食材组合'
      }
    ]
  }
}

async function createDatabase() {
  const connection = await createAdminConnection()

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  } finally {
    await connection.end()
  }
}

async function createTables() {
  await execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id VARCHAR(64) PRIMARY KEY,
      phone VARCHAR(20) NOT NULL UNIQUE,
      is_system_admin TINYINT(1) NOT NULL DEFAULT 0,
      password_hash VARCHAR(255) NOT NULL,
      password_salt VARCHAR(255) NOT NULL,
      must_change_password TINYINT(1) NOT NULL DEFAULT 1,
      created_at VARCHAR(40) NOT NULL,
      updated_at VARCHAR(40) NOT NULL,
      last_login_at VARCHAR(40) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await execute(`
    CREATE TABLE IF NOT EXISTS brands (
      id VARCHAR(128) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      english_name VARCHAR(160) NOT NULL DEFAULT '',
      slogan VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      cover_image TEXT NOT NULL,
      color VARCHAR(32) NOT NULL DEFAULT '#57703c',
      is_owned TINYINT(1) NOT NULL DEFAULT 0,
      is_visible TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at VARCHAR(40) NOT NULL,
      updated_at VARCHAR(40) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await execute(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(128) PRIMARY KEY,
      brand_id VARCHAR(128) NOT NULL,
      name VARCHAR(160) NOT NULL,
      category VARCHAR(120) NOT NULL,
      origin VARCHAR(255) NOT NULL,
      price_label VARCHAR(120) NOT NULL,
      description TEXT NOT NULL,
      image TEXT NOT NULL,
      badge VARCHAR(120) NOT NULL DEFAULT '',
      highlights_json LONGTEXT NOT NULL,
      detail_sections_json LONGTEXT NOT NULL,
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at VARCHAR(40) NOT NULL,
      updated_at VARCHAR(40) NOT NULL,
      CONSTRAINT fk_products_brand
        FOREIGN KEY (brand_id) REFERENCES brands (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await execute(`
    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(128) PRIMARY KEY,
      value_json LONGTEXT NOT NULL,
      created_at VARCHAR(40) NOT NULL,
      updated_at VARCHAR(40) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

async function ensureAdminColumns() {
  const systemAdminColumn = await queryOne("SHOW COLUMNS FROM admins LIKE 'is_system_admin'")

  if (!systemAdminColumn) {
    await execute('ALTER TABLE admins ADD COLUMN is_system_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER phone')
  }
}

async function seedAdmins(admins) {
  for (const admin of admins) {
    await execute(
      `
        INSERT INTO admins (
          id, phone, is_system_admin, password_hash, password_salt, must_change_password, created_at, updated_at, last_login_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          phone = VALUES(phone),
          is_system_admin = VALUES(is_system_admin),
          password_hash = VALUES(password_hash),
          password_salt = VALUES(password_salt),
          must_change_password = VALUES(must_change_password),
          created_at = VALUES(created_at),
          updated_at = VALUES(updated_at),
          last_login_at = VALUES(last_login_at)
      `,
      [
        admin.id,
        admin.phone,
        toBooleanNumber(admin.isSystemAdmin),
        admin.passwordHash,
        admin.passwordSalt,
        toBooleanNumber(admin.mustChangePassword),
        admin.createdAt,
        admin.updatedAt,
        admin.lastLoginAt ?? null
      ]
    )
  }
}

async function seedBrands(brands) {
  for (const brand of brands) {
    await execute(
      `
        INSERT INTO brands (
          id, name, english_name, slogan, description, cover_image, color, is_owned, is_visible, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          english_name = VALUES(english_name),
          slogan = VALUES(slogan),
          description = VALUES(description),
          cover_image = VALUES(cover_image),
          color = VALUES(color),
          is_owned = VALUES(is_owned),
          is_visible = VALUES(is_visible),
          sort_order = VALUES(sort_order),
          created_at = VALUES(created_at),
          updated_at = VALUES(updated_at)
      `,
      [
        brand.id,
        brand.name,
        brand.englishName ?? '',
        brand.slogan,
        brand.description,
        brand.coverImage,
        brand.color ?? '#57703c',
        toBooleanNumber(brand.isOwned),
        toBooleanNumber(brand.isVisible),
        Number(brand.sortOrder ?? 0),
        brand.createdAt,
        brand.updatedAt
      ]
    )
  }
}

async function seedProducts(products) {
  for (const product of products) {
    await execute(
      `
        INSERT INTO products (
          id, brand_id, name, category, origin, price_label, description, image, badge, highlights_json, detail_sections_json,
          is_featured, is_published, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          brand_id = VALUES(brand_id),
          name = VALUES(name),
          category = VALUES(category),
          origin = VALUES(origin),
          price_label = VALUES(price_label),
          description = VALUES(description),
          image = VALUES(image),
          badge = VALUES(badge),
          highlights_json = VALUES(highlights_json),
          detail_sections_json = VALUES(detail_sections_json),
          is_featured = VALUES(is_featured),
          is_published = VALUES(is_published),
          sort_order = VALUES(sort_order),
          created_at = VALUES(created_at),
          updated_at = VALUES(updated_at)
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
        product.badge ?? '',
        toJson(product.highlights),
        toJson(product.detailSections),
        toBooleanNumber(product.isFeatured),
        toBooleanNumber(product.isPublished),
        Number(product.sortOrder ?? 0),
        product.createdAt,
        product.updatedAt
      ]
    )
  }
}

async function seedSiteSettings() {
  const now = new Date().toISOString()
  await execute(
    `
      INSERT INTO site_settings (setting_key, value_json, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        value_json = VALUES(value_json),
        updated_at = VALUES(updated_at)
    `,
    ['home_page_content', JSON.stringify(createDefaultHomePageContent()), now, now]
  )
}

async function main() {
  const [admins, brands, products] = await Promise.all([
    readJsonFile('admins.json'),
    readJsonFile('brands.json'),
    readJsonFile('products.json')
  ])

  await createDatabase()
  await createTables()
  await ensureAdminColumns()
  await seedAdmins(admins)
  await seedBrands(brands)
  await seedProducts(products)
  await seedSiteSettings()

  console.log(`数据库 ${databaseName} 已完成初始化，管理员 ${admins.length} 条，品牌 ${brands.length} 条，商品 ${products.length} 条。`)
}

main()
  .catch((error) => {
    console.error('初始化数据库失败：', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
