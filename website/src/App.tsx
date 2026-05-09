import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { fetchBrands, fetchProducts, fetchSiteContent } from './lib/api'
import type { Brand, HomePageContent, Product, ProductDetailSection } from './types'

const advantageItems = [
  {
    title: '自有品牌分层清晰',
    description: '华篮彩面向节令礼赠，蔬雀服务社区餐桌，星月优农承接粮油杂粮，让不同渠道能快速找到合适的产品线。'
  },
  {
    title: '产地与商品资料完整',
    description: '从产区、规格、包装、食用场景到采购建议，每个单品都尽量把渠道决策需要的信息讲清楚。'
  },
  {
    title: '适配零售、团购与礼赠',
    description: '围绕企业福利、社区团购、商超零售、电商组合和商务伴手礼，提供更容易落地的农产品组合方案。'
  }
]

const processSteps = [
  '产区与供应资源筛选',
  '商品规格、包装和价格带梳理',
  '按渠道场景组织组合方案',
  '持续交付、复购和节令上新'
]

const SITE_URL = 'https://lvyouyuan.com'
const SITE_NAME = '绿优源'
const DEFAULT_SITE_TITLE = '绿优源｜优质农产品供应与品牌展示官网'
const DEFAULT_SITE_DESCRIPTION =
  '绿优源聚焦优质农产品供应、企业福利礼盒、社区零售、粮油食材和特色风味产品，整合自有品牌与合作产区资源。'
const DEFAULT_SHARE_IMAGE = `${SITE_URL}/qingyuan-maji-hero-ai.png`
const WECOM_QR_IMAGE = '/wecom-qr.png'
const LVYOUYUAN_LOGO_IMAGE = '/lvyouyuan-logo.jpg'
const HUALANCAI_LOGO_IMAGE = '/hualancai-logo-web.png'

function toAbsoluteUrl(value?: string) {
  if (!value) {
    return DEFAULT_SHARE_IMAGE
  }

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null

  if (!element) {
    element = selector.startsWith('link')
      ? document.createElement('link')
      : document.createElement('meta')
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value)
  })
}

function upsertJsonLd(id: string, value: object) {
  let element = document.getElementById(id) as HTMLScriptElement | null

  if (!element) {
    element = document.createElement('script')
    element.id = id
    element.type = 'application/ld+json'
    document.head.appendChild(element)
  }

  element.textContent = JSON.stringify(value)
}

function updateSeoMetadata({
  title,
  description,
  path,
  image,
  type = 'website',
  jsonLd
}: {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'product'
  jsonLd: object | object[]
}) {
  const canonicalUrl = `${SITE_URL}${path}`
  const shareImage = toAbsoluteUrl(image)

  document.title = title
  upsertMeta('meta[name="description"]', { name: 'description', content: description })
  upsertMeta('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl })
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type })
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description })
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl })
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: shareImage })
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: shareImage })
  upsertJsonLd('site-structured-data', jsonLd)
}

function getBrandLogo(brand: Brand) {
  if (brand.id === 'hualancai') {
    return HUALANCAI_LOGO_IMAGE
  }

  if (brand.isOwned) {
    return LVYOUYUAN_LOGO_IMAGE
  }

  return ''
}

function createDefaultHomePageContent(): HomePageContent {
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

function createPublicHomePageContent(content: HomePageContent): HomePageContent {
  const defaultContent = createDefaultHomePageContent()
  const hasSetupCopy =
    content.heroTitle.includes('图文详情页') ||
    content.heroTitle.includes('官网') ||
    content.heroDescription.includes('招商') ||
    content.cards.some((card) => card.title.includes('卡片') || card.eyebrow.includes('样张'))

  if (!hasSetupCopy) {
    return content
  }

  return {
    ...content,
    heroEyebrow: defaultContent.heroEyebrow,
    heroTitle: defaultContent.heroTitle,
    heroDescription: defaultContent.heroDescription,
    primaryActionLabel: defaultContent.primaryActionLabel,
    secondaryActionLabel: defaultContent.secondaryActionLabel,
    cards: content.cards.map((card, index) => ({
      ...card,
      eyebrow: defaultContent.cards[index]?.eyebrow ?? card.eyebrow,
      title: defaultContent.cards[index]?.title ?? card.title
    }))
  }
}

function getPathname() {
  return window.location.pathname
}

function getProductIdFromPath(pathname: string) {
  const match = pathname.match(/^\/products\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

function scrollToSection(sectionId: string) {
  window.setTimeout(() => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 20)
}

function renderRichTextBlocks(content: string) {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, blockIndex) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)

      if (lines.every((line) => line.startsWith('- '))) {
        return (
          <ul className="detail-richtext-list" key={`list-${blockIndex}`}>
            {lines.map((line) => (
              <li key={line}>{line.replace(/^- /, '')}</li>
            ))}
          </ul>
        )
      }

      return (
        <p key={`paragraph-${blockIndex}`}>
          {lines.join(' ')}
        </p>
      )
    })
}

function isDirectVideoSource(url?: string) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url ?? '')
}

function getSpecValue(section: ProductDetailSection | undefined, label: string) {
  return section?.specs?.find((spec) => spec.label === label)?.value ?? ''
}

function renderDetailSection(section: ProductDetailSection) {
  if (section.type === 'text') {
    return (
      <section className="detail-section detail-section--text" key={section.id}>
        {section.title ? <h2>{section.title}</h2> : null}
        <p>{section.content}</p>
      </section>
    )
  }

  if (section.type === 'richtext') {
    return (
      <section className="detail-section detail-section--richtext" key={section.id}>
        {section.title ? <h2>{section.title}</h2> : null}
        <div className="detail-richtext">
          {section.content ? renderRichTextBlocks(section.content) : null}
        </div>
      </section>
    )
  }

  if (section.type === 'image') {
    return (
      <section className="detail-section detail-section--image" key={section.id}>
        {section.title ? <h2>{section.title}</h2> : null}
        <img src={section.image} alt={section.title || '商品详情图片'} />
        {section.caption ? <p className="detail-caption">{section.caption}</p> : null}
      </section>
    )
  }

  if (section.type === 'video') {
    return (
      <section className="detail-section detail-section--video" key={section.id}>
        {section.title ? <h2>{section.title}</h2> : null}
        <div className="detail-video-frame">
          {section.videoUrl ? (
            isDirectVideoSource(section.videoUrl) ? (
              <video controls poster={section.posterImage || undefined} src={section.videoUrl} />
            ) : (
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                src={section.videoUrl}
                title={section.title || '商品视频'}
              />
            )
          ) : null}
        </div>
        {section.caption ? <p className="detail-caption">{section.caption}</p> : null}
      </section>
    )
  }

  if (section.type === 'gallery') {
    return (
      <section className="detail-section" key={section.id}>
        {section.title ? <h2>{section.title}</h2> : null}
        <div className="detail-gallery">
          {section.images?.map((image) => (
            <img alt={section.title || '商品图集'} key={image} src={image} />
          ))}
        </div>
        {section.caption ? <p className="detail-caption">{section.caption}</p> : null}
      </section>
    )
  }

  if (section.type === 'features') {
    return (
      <section className="detail-section" key={section.id}>
        {section.title ? <h2>{section.title}</h2> : null}
        <ul className="detail-feature-list">
          {section.items?.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    )
  }

  if (section.type === 'specs') {
    return (
      <section className="detail-section" key={section.id}>
        {section.title ? <h2>{section.title}</h2> : null}
        <div className="detail-spec-grid">
          {section.specs?.map((spec) => (
            <article className="detail-spec-item" key={`${spec.label}-${spec.value}`}>
              <span>{spec.label}</span>
              <strong>{spec.value}</strong>
            </article>
          ))}
        </div>
      </section>
    )
  }

  if (section.type === 'downloads') {
    return (
      <section className="detail-section detail-section--downloads" key={section.id}>
        {section.title ? <h2>{section.title}</h2> : null}
        <div className="detail-download-grid">
          {section.files?.map((file) => (
            <a className="detail-download-card" href={file.url} key={`${file.name}-${file.url}`} rel="noreferrer" target="_blank">
              <span>资料下载</span>
              <strong>{file.name}</strong>
              <p>{file.description || '点击查看或下载资料'}</p>
            </a>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="detail-section detail-section--quote" key={section.id}>
      <blockquote>{section.quote}</blockquote>
      {section.author ? <cite>{section.author}</cite> : null}
    </section>
  )
}

type SiteHeaderProps = {
  onSectionNavigate: (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => void
  onContactOpen: () => void
}

function SiteHeader({ onSectionNavigate, onContactOpen }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <a className="brand-mark" href="/" onClick={(event) => onSectionNavigate(event, 'top')}>
        <span className="brand-mark__badge brand-mark__badge--image">
          <img src={LVYOUYUAN_LOGO_IMAGE} alt="绿优源 Logo" />
        </span>
        <span>
          <strong>绿优源</strong>
          <small>优质农产品供应与品牌展示</small>
        </span>
      </a>

      <nav className="site-nav">
        <a href="/#about" onClick={(event) => onSectionNavigate(event, 'about')}>
          公司介绍
        </a>
        <a href="/#brands" onClick={(event) => onSectionNavigate(event, 'brands')}>
          品牌矩阵
        </a>
        <a href="/#products" onClick={(event) => onSectionNavigate(event, 'products')}>
          商品展示
        </a>
        <a href="/#service" onClick={(event) => onSectionNavigate(event, 'service')}>
          服务优势
        </a>
        <a href="/#contact" onClick={(event) => onSectionNavigate(event, 'contact')}>
          联系合作
        </a>
        <button className="nav-contact-button" type="button" onClick={onContactOpen}>
          企业微信
        </button>
      </nav>
    </header>
  )
}

type HomePageProps = {
  brands: Brand[]
  content: HomePageContent
  products: Product[]
  loading: boolean
  error: string
  onContactOpen: () => void
  onSectionNavigate: (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => void
  onProductNavigate: (event: MouseEvent<HTMLAnchorElement>, productId: string) => void
}

function HomePage({
  brands,
  content,
  products,
  loading,
  error,
  onContactOpen,
  onSectionNavigate,
  onProductNavigate
}: HomePageProps) {
  const featuredProducts = useMemo(
    () => products.filter((product) => product.isFeatured).slice(0, 3),
    [products]
  )

  const ownedBrands = useMemo(
    () => brands.filter((brand) => brand.isOwned),
    [brands]
  )

  const heroCards = useMemo(() => {
    return Array.from({ length: 3 }, (_, index) => {
      const contentCard = content.cards[index]
      const featuredProduct = featuredProducts[index]

      return {
        id: contentCard?.id ?? featuredProduct?.id ?? `hero-card-${index + 1}`,
        image: contentCard?.image || featuredProduct?.image || '',
        eyebrow: contentCard?.eyebrow || featuredProduct?.brandName || '绿优源选品',
        title: contentCard?.title || featuredProduct?.name || '优质农产品组合'
      }
    })
  }, [content.cards, featuredProducts])

  return (
    <main id="top">
      <section
        className="hero-section"
        style={{ '--hero-background-image': `url("${content.backgroundImage}")` } as CSSProperties}
      >
        <div className="hero-copy">
          <p className="eyebrow">{content.heroEyebrow}</p>
          <h1>{content.heroTitle}</h1>
          <p className="hero-description">
            {content.heroDescription}
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="/#brands" onClick={(event) => onSectionNavigate(event, 'brands')}>
              {content.primaryActionLabel}
            </a>
          <a className="ghost-link" href="/#products" onClick={(event) => onSectionNavigate(event, 'products')}>
            {content.secondaryActionLabel}
          </a>
          <button className="ghost-link contact-link" type="button" onClick={onContactOpen}>
            企业微信咨询
          </button>
        </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          {heroCards.some((card) => card.image || card.title) ? (
            heroCards.map((card, index) => (
              <article className={`floating-product floating-product--${index + 1}`} key={card.id}>
                {card.image ? <img src={card.image} alt={card.title} /> : null}
                <div>
                  <span>{card.eyebrow}</span>
                  <strong>{card.title}</strong>
                </div>
              </article>
            ))
          ) : (
            <div className="hero-placeholder">
              <strong>优质农产品组合</strong>
              <span>企业福利、社区零售、家庭餐桌与特色风味选品</span>
            </div>
          )}
        </div>
      </section>

      <section className="intro-strip" id="about">
        <p>
          绿优源围绕“好产地、好产品、好交付”组织农产品供应，服务企业福利、社区团购、商超零售、礼盒定制和日常家庭消费等场景。
        </p>
        <div className="intro-metrics">
          <span>
            <strong>{brands.length}</strong>
            展示品牌
          </span>
          <span>
            <strong>{ownedBrands.length}</strong>
            自有品牌
          </span>
          <span>
            <strong>{products.length}</strong>
            在售商品
          </span>
        </div>
      </section>

      <section className="content-section" id="brands">
        <div className="section-heading section-heading--spread">
          <div>
            <p className="eyebrow">品牌矩阵</p>
            <h2>用不同品牌承接不同消费场景，让采购方更快理解产品定位。</h2>
          </div>
          <p className="section-note">华篮彩偏礼赠，蔬雀偏日常生鲜，星月优农偏粮油健康食材，合作品牌则补充地方风味与特色单品。</p>
        </div>

        {loading ? <p className="status-panel">正在加载品牌内容...</p> : null}
        {error ? <p className="status-panel status-panel--error">{error}</p> : null}

        {!loading && !error ? (
          <div className="brand-grid">
            {brands.map((brand) => {
              const brandLogo = getBrandLogo(brand)

              return (
                <article className="brand-card" key={brand.id} style={{ '--brand-color': brand.color } as CSSProperties}>
                  <div className="brand-card__media">
                    <img src={brand.coverImage} alt={brand.name} />
                    <span>{brand.isOwned ? '绿优源旗下品牌' : '合作展示品牌'}</span>
                  </div>
                  <div className="brand-card__content">
                    <div className="brand-card__identity">
                      {brandLogo ? (
                        <span className={`brand-card__logo ${brand.id === 'hualancai' ? 'brand-card__logo--wide' : ''}`}>
                          <img src={brandLogo} alt={`${brand.name} Logo`} />
                        </span>
                      ) : null}
                      <div>
                        <p>{brand.englishName || 'Brand'}</p>
                        <h3>{brand.name}</h3>
                      </div>
                    </div>
                    <strong>{brand.slogan}</strong>
                    <p>{brand.description}</p>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </section>

      <section className="content-section section-grid" id="service">
        <div className="section-heading">
          <p className="eyebrow">选品优势</p>
          <h2>我们不只罗列商品，更关注它适合进入哪个渠道、以什么组合被采购。</h2>
        </div>

        <div className="advantage-list">
          {advantageItems.map((item) => (
            <article className="advantage-item" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section" id="products">
        <div className="section-heading section-heading--spread">
          <div>
            <p className="eyebrow">产品选品</p>
            <h2>从富硒大米、时令蔬果礼盒，到清远麻鸡和红油笋尖，覆盖主粮、生鲜、礼盒与地方风味。</h2>
          </div>
          <p className="section-note">每个商品都尽量呈现产地、规格、卖点与适用场景，方便采购、分销和礼赠方案评估。</p>
        </div>

        {loading ? <p className="status-panel">正在加载商品内容...</p> : null}
        {error ? <p className="status-panel status-panel--error">{error}</p> : null}

        {!loading && !error ? (
          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-card__media">
                  <img src={product.image} alt={product.name} />
                  <span>{product.badge || product.category}</span>
                </div>
                <div className="product-card__content">
                  <div className="product-meta">
                    <p>{product.category}</p>
                    <strong>{product.priceLabel}</strong>
                  </div>
                  <div className="product-brand">
                    <span>{product.brandOwned ? '自有品牌' : '合作品牌'}</span>
                    <strong>{product.brandName}</strong>
                  </div>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <ul>
                    {product.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                  <footer>
                    <span>{product.origin}</span>
                    <span>{product.isFeatured ? '主推中' : '常规展示'}</span>
                  </footer>
                  <a
                    className="product-card__action"
                    href={`/products/${product.id}`}
                    onClick={(event) => onProductNavigate(event, product.id)}
                  >
                    查看详情
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="content-section process-layout">
        <div className="section-heading">
          <p className="eyebrow">合作方式</p>
          <h2>从单品采购到节令组合，我们按渠道需求组织供应，而不是只给一份静态报价。</h2>
        </div>

        <div className="process-track">
          {processSteps.map((step, index) => (
            <article className="process-step" key={step}>
              <span>0{index + 1}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section cta-block" id="contact">
        <p className="eyebrow">联系绿优源</p>
        <h2>正在寻找企业福利礼盒、社区团购单品、粮油食材或地方风味产品？可以把需求发给绿优源。</h2>
        <p>我们会根据预算、季节、配送范围和渠道类型，协助匹配更合适的产品组合与合作方式。</p>
        <div className="hero-actions">
          <a className="primary-link" href="mailto:contact@lvyouyuan.com">
            contact@lvyouyuan.com
          </a>
          <a className="ghost-link" href="tel:400-800-2026">
            400-800-2026
          </a>
          <button className="ghost-link contact-link" type="button" onClick={onContactOpen}>
            扫码联系企业微信
          </button>
        </div>
      </section>
    </main>
  )
}

type ContactModalProps = {
  open: boolean
  onClose: () => void
}

function ContactModal({ open, onClose }: ContactModalProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div className="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
      <button className="contact-modal__backdrop" type="button" aria-label="关闭企业微信二维码弹窗" onClick={onClose} />
      <section className="contact-modal__card">
        <button className="contact-modal__close" type="button" aria-label="关闭" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">企业微信咨询</p>
        <h2 id="contact-modal-title">扫码添加绿优源企业微信</h2>
        <p>欢迎咨询企业福利礼盒、社区团购、粮油食材、特色风味产品和渠道合作方案。</p>
        <div className="wecom-qr-frame">
          <img src={WECOM_QR_IMAGE} alt="绿优源企业微信二维码" />
        </div>
        <span className="contact-modal__hint">如二维码更新，替换网站 public 目录中的 wecom-qr.png 即可。</span>
      </section>
    </div>
  )
}

type ProductDetailPageProps = {
  product: Product | null
  products: Product[]
  loading: boolean
  onHomeNavigate: (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => void
  onProductNavigate: (event: MouseEvent<HTMLAnchorElement>, productId: string) => void
}

function ProductDetailPage({
  product,
  products,
  loading,
  onHomeNavigate,
  onProductNavigate
}: ProductDetailPageProps) {
  const relatedProducts = useMemo(() => {
    if (!product) {
      return []
    }

    return products
      .filter((item) => item.id !== product.id && item.brandId === product.brandId)
      .slice(0, 3)
  }, [product, products])

  if (loading) {
    return (
      <main className="detail-shell">
        <section className="detail-empty">
          <h1>正在加载商品详情...</h1>
        </section>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="detail-shell">
        <section className="detail-empty">
          <h1>这个商品暂时没有找到</h1>
          <p>可能该商品还未上架，或者详情页地址已经变更。</p>
          <a className="primary-link" href="/" onClick={(event) => onHomeNavigate(event, 'products')}>
            返回商品列表
          </a>
        </section>
      </main>
    )
  }

  const heroSection = product.detailSections.find((section) => section.type === 'image')
  const featuresSection = product.detailSections.find((section) => section.type === 'features')
  const specsSection = product.detailSections.find((section) => section.type === 'specs')
  const quoteSection = product.detailSections.find((section) => section.type === 'quote')
  const gallerySection = product.detailSections.find((section) => section.type === 'gallery')
  const sellingPoints = (featuresSection?.items?.length ? featuresSection.items : product.highlights).slice(0, 4)
  const highlightCards = product.highlights.slice(0, 3)
  const keySpecs = [
    { label: '净含量', value: getSpecValue(specsSection, '净含量') },
    { label: '包装方式', value: getSpecValue(specsSection, '包装方式') },
    { label: '保质期', value: getSpecValue(specsSection, '保质期') },
    { label: '食用方法', value: getSpecValue(specsSection, '食用方法') }
  ].filter((spec) => spec.value)
  const evidenceImages = Array.from(new Set(gallerySection?.images ?? [])).slice(0, 3)
  const detailSections = product.detailSections.filter((section) => {
    return ![heroSection?.id, featuresSection?.id, specsSection?.id, quoteSection?.id].includes(section.id)
  })
  const hasRailContent = Boolean(featuresSection || specsSection || quoteSection)

  return (
    <main className="detail-shell">
      <section className="detail-hero detail-hero--product">
        <div className="detail-hero__copy">
          <a className="detail-back" href="/" onClick={(event) => onHomeNavigate(event, 'products')}>
            返回商品列表
          </a>
          <p className="eyebrow">{product.brandName}</p>
          <h1>{product.name}</h1>
          <p className="detail-summary">{product.description}</p>
          <div className="detail-meta">
            <span>{product.category}</span>
            <span>{product.origin}</span>
            <strong>{product.priceLabel}</strong>
          </div>
          <div className="detail-chip-row">
            <span className="detail-chip">{product.brandOwned ? '自有品牌' : '合作品牌'}</span>
            {product.badge ? <span className="detail-chip">{product.badge}</span> : null}
            {product.isFeatured ? <span className="detail-chip">官网主推</span> : null}
          </div>
          {sellingPoints.length > 0 ? (
            <ul className="detail-selling-points">
              {sellingPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <div className="detail-purchase-card">
            <span className="detail-purchase-card__label">渠道参考信息</span>
            <strong>{product.priceLabel}</strong>
            <p>官网图像已重制，价格、规格与评价信息仍以当前抓取到的商品页内容为基础整理。</p>
            {keySpecs.length > 0 ? (
              <div className="detail-purchase-grid">
                {keySpecs.map((spec) => (
                  <div className="detail-purchase-grid__item" key={spec.label}>
                    <span>{spec.label}</span>
                    <strong>{spec.value}</strong>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="detail-hero__media detail-hero__media--poster">
          <img src={heroSection?.image || product.image} alt={product.name} />
          {evidenceImages.length > 0 ? (
            <div className="detail-proof-strip">
              {evidenceImages.map((image) => (
                <img alt={`${product.name} 页面取材`} key={image} src={image} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="detail-intro">
        <div className="detail-intro__main">
          <p className="eyebrow">产品亮点</p>
          <h2>把风味、规格和食用场景收束成一页更像商品详情的展示。</h2>
          <div className="detail-highlight-grid">
            {highlightCards.map((item) => (
              <article className="detail-highlight-card" key={item}>
                <span>0{highlightCards.indexOf(item) + 1}</span>
                <strong>{item}</strong>
              </article>
            ))}
          </div>
        </div>
        <aside className="detail-intro__side">
          <h3>所属品牌</h3>
          <strong>{product.brandName}</strong>
          <p>{product.brandEnglishName || 'Brand Introduction'}</p>
          <div className="detail-intro__facts">
            <div className="detail-fact">
              <span>商品分类</span>
              <strong>{product.category}</strong>
            </div>
            <div className="detail-fact">
              <span>商品产地</span>
              <strong>{product.origin}</strong>
            </div>
            <div className="detail-fact">
              <span>展示方式</span>
              <strong>生成图主导 + 产品资料整理</strong>
            </div>
          </div>
          <a className="ghost-link" href="/" onClick={(event) => onHomeNavigate(event, 'brands')}>
            查看品牌矩阵
          </a>
        </aside>
      </section>

      <div className={`detail-content ${hasRailContent ? 'detail-content--split' : ''}`}>
        <div className="detail-content__main">
          {detailSections.length > 0 ? (
            detailSections.map((section) => renderDetailSection(section))
          ) : (
            <section className="detail-section detail-section--text">
              <h2>更多介绍</h2>
              <p>这个商品的更多产地、规格和采购信息正在补充中，欢迎联系绿优源获取最新资料。</p>
            </section>
          )}
        </div>

        {hasRailContent ? (
          <aside className="detail-content__rail">
            {featuresSection?.items?.length ? (
              <section className="detail-side-card">
                <p className="eyebrow">风味感知</p>
                <h2>{featuresSection.title || '核心卖点'}</h2>
                <ul className="detail-side-card__list">
                  {featuresSection.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {specsSection?.specs?.length ? (
              <section className="detail-side-card">
                <p className="eyebrow">规格信息</p>
                <h2>{specsSection.title || '参数信息'}</h2>
                <div className="detail-side-specs">
                  {specsSection.specs.map((spec) => (
                    <div className="detail-side-spec-row" key={`${spec.label}-${spec.value}`}>
                      <span>{spec.label}</span>
                      <strong>{spec.value}</strong>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {quoteSection?.quote ? (
              <section className="detail-side-quote">
                <p className="eyebrow">评价摘录</p>
                <blockquote>{quoteSection.quote}</blockquote>
                {quoteSection.author ? <cite>{quoteSection.author}</cite> : null}
              </section>
            ) : null}
          </aside>
        ) : null}
      </div>

      {relatedProducts.length > 0 ? (
        <section className="detail-related">
          <div className="section-heading section-heading--spread">
            <div>
              <p className="eyebrow">同品牌商品</p>
              <h2>继续了解 {product.brandName} 旗下其他商品。</h2>
            </div>
          </div>
          <div className="detail-related__grid">
            {relatedProducts.map((item) => (
              <article className="detail-related__item" key={item.id}>
                <img src={item.image} alt={item.name} />
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.priceLabel}</span>
                </div>
                <a href={`/products/${item.id}`} onClick={(event) => onProductNavigate(event, item.id)}>
                  查看详情
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}

function App() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [siteContent, setSiteContent] = useState<HomePageContent>(createDefaultHomePageContent())
  const [pathname, setPathname] = useState(getPathname)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const handlePopState = () => {
      setPathname(getPathname())
      window.scrollTo({ top: 0, behavior: 'auto' })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    let active = true

    async function loadWebsiteData() {
      try {
        const [nextProducts, nextBrands, nextSiteContent] = await Promise.all([
          fetchProducts(),
          fetchBrands(),
          fetchSiteContent()
        ])

        if (active) {
          setProducts(nextProducts)
          setBrands(nextBrands)
          setSiteContent(createPublicHomePageContent(nextSiteContent))
          setError('')
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : '官网数据加载失败')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadWebsiteData()

    return () => {
      active = false
    }
  }, [])

  const detailProductId = getProductIdFromPath(pathname)
  const detailProduct = useMemo(
    () => products.find((product) => product.id === detailProductId) ?? null,
    [detailProductId, products]
  )

  useEffect(() => {
    if (detailProductId && !detailProduct) {
      updateSeoMetadata({
        title: `商品详情｜${SITE_NAME}`,
        description: '这个商品暂时没有找到，可能还未上架，或者详情页地址已经变更。',
        path: `/products/${detailProductId}`,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `商品详情｜${SITE_NAME}`,
          description: '商品详情页',
          url: `${SITE_URL}/products/${detailProductId}`,
          isPartOf: {
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL
          }
        }
      })
      return
    }

    if (detailProduct) {
      const productTitle = `${detailProduct.name}｜${detailProduct.brandName}｜${SITE_NAME}`
      const productDescription = `${detailProduct.description} 产地：${detailProduct.origin}，分类：${detailProduct.category}，参考信息：${detailProduct.priceLabel}。`
      const productPath = `/products/${detailProduct.id}`

      updateSeoMetadata({
        title: productTitle,
        description: productDescription,
        path: productPath,
        image: detailProduct.image,
        type: 'product',
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: detailProduct.name,
            description: detailProduct.description,
            image: [toAbsoluteUrl(detailProduct.image)],
            brand: {
              '@type': 'Brand',
              name: detailProduct.brandName
            },
            category: detailProduct.category,
            sku: detailProduct.id,
            areaServed: '中国',
            offers: {
              '@type': 'Offer',
              availability: detailProduct.isPublished ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              priceCurrency: 'CNY',
              url: `${SITE_URL}${productPath}`
            }
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: '首页',
                item: SITE_URL
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: '商品展示',
                item: `${SITE_URL}/#products`
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: detailProduct.name,
                item: `${SITE_URL}${productPath}`
              }
            ]
          }
        ]
      })
      return
    }

    updateSeoMetadata({
      title: DEFAULT_SITE_TITLE,
      description: DEFAULT_SITE_DESCRIPTION,
      path: '/',
      image: siteContent.backgroundImage,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/favicon.svg`,
          description: DEFAULT_SITE_DESCRIPTION,
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '400-800-2026',
            contactType: 'customer service',
            availableLanguage: ['zh-CN']
          },
          sameAs: []
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE_URL,
          inLanguage: 'zh-CN',
          description: DEFAULT_SITE_DESCRIPTION,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE_URL}/#products?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
          }
        },
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: '绿优源官网商品展示',
          itemListElement: products.slice(0, 12).map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/products/${product.id}`,
            name: product.name
          }))
        }
      ]
    })
  }, [detailProduct, detailProductId, products, siteContent.backgroundImage])

  function navigate(path: string) {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path)
      setPathname(path)
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  function handleSectionNavigate(event: MouseEvent<HTMLAnchorElement>, sectionId: string) {
    event.preventDefault()
    navigate('/')

    if (sectionId !== 'top') {
      scrollToSection(sectionId)
    }
  }

  function handleProductNavigate(event: MouseEvent<HTMLAnchorElement>, productId: string) {
    event.preventDefault()
    navigate(`/products/${productId}`)
  }

  return (
    <div className="site-shell">
      <SiteHeader onContactOpen={() => setContactModalOpen(true)} onSectionNavigate={handleSectionNavigate} />
      {detailProductId ? (
        <ProductDetailPage
          loading={loading}
          onHomeNavigate={handleSectionNavigate}
          onProductNavigate={handleProductNavigate}
          product={detailProduct}
          products={products}
        />
      ) : (
        <HomePage
          brands={brands}
          content={siteContent}
          error={error}
          loading={loading}
          onContactOpen={() => setContactModalOpen(true)}
          onProductNavigate={handleProductNavigate}
          onSectionNavigate={handleSectionNavigate}
          products={products}
        />
      )}
      <ContactModal open={contactModalOpen} onClose={() => setContactModalOpen(false)} />
    </div>
  )
}

export default App
