import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { fetchBrands, fetchProducts } from './lib/api'
import type { Brand, Product, ProductDetailSection } from './types'

const advantageItems = [
  {
    title: '品牌矩阵 + 渠道整合',
    description: '既能展示绿优源旗下品牌，也能管理合作品牌，让官网表达和实际经营结构保持一致。'
  },
  {
    title: '图文详情可扩展',
    description: '每个商品都能配置不同详情模块，让单品页更适合表达卖点、参数、图片与采购场景。'
  },
  {
    title: '后台统一维护',
    description: '品牌、商品、展示状态与详情页内容都可在后台集中维护，运营改动会直接同步到页面。'
  }
]

const processSteps = [
  '品牌与产地资源整合',
  '商品筛选与品控复核',
  '详情页内容组织与网页展示',
  '面向渠道与客户持续交付'
]

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
}

function SiteHeader({ onSectionNavigate }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <a className="brand-mark" href="/" onClick={(event) => onSectionNavigate(event, 'top')}>
        <span className="brand-mark__badge">LUY</span>
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
      </nav>
    </header>
  )
}

type HomePageProps = {
  brands: Brand[]
  products: Product[]
  loading: boolean
  error: string
  onSectionNavigate: (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => void
  onProductNavigate: (event: MouseEvent<HTMLAnchorElement>, productId: string) => void
}

function HomePage({
  brands,
  products,
  loading,
  error,
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

  return (
    <main id="top">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">From Brand To Product</p>
          <h1>绿优源，把品牌表达、商品介绍和图文详情页放在同一张官网里。</h1>
          <p className="hero-description">
            我们既经营自有农产品品牌，也整合合作品牌资源。现在每个商品都能展开成图文并茂的详情页，更适合做招商、零售和采购展示。
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="/#brands" onClick={(event) => onSectionNavigate(event, 'brands')}>
              查看品牌
            </a>
            <a className="ghost-link" href="/#products" onClick={(event) => onSectionNavigate(event, 'products')}>
              查看商品
            </a>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          {featuredProducts.length > 0 ? (
            featuredProducts.map((product, index) => (
              <article className={`floating-product floating-product--${index + 1}`} key={product.id}>
                <img src={product.image} alt={product.name} />
                <div>
                  <span>{product.brandName}</span>
                  <strong>{product.name}</strong>
                </div>
              </article>
            ))
          ) : (
            <div className="hero-placeholder">
              <strong>品牌化农产品展示</strong>
              <span>自有品牌、合作品牌与详情页内容统一管理</span>
            </div>
          )}
        </div>
      </section>

      <section className="intro-strip" id="about">
        <p>
          绿优源专注于优质农产品与品牌资源整合，帮助企业同时完成品牌介绍、商品展示和合作转化，让官网更像真实业务的延伸。
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
            <h2>绿优源旗下品牌与官网展示品牌，可以根据业务结构灵活管理。</h2>
          </div>
          <p className="section-note">后台可录入合作品牌，但官网是否展示由品牌开关控制。</p>
        </div>

        {loading ? <p className="status-panel">正在加载品牌内容...</p> : null}
        {error ? <p className="status-panel status-panel--error">{error}</p> : null}

        {!loading && !error ? (
          <div className="brand-grid">
            {brands.map((brand) => (
              <article className="brand-card" key={brand.id} style={{ '--brand-color': brand.color } as CSSProperties}>
                <div className="brand-card__media">
                  <img src={brand.coverImage} alt={brand.name} />
                  <span>{brand.isOwned ? '绿优源旗下品牌' : '合作展示品牌'}</span>
                </div>
                <div className="brand-card__content">
                  <p>{brand.englishName || 'Brand'}</p>
                  <h3>{brand.name}</h3>
                  <strong>{brand.slogan}</strong>
                  <p>{brand.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="content-section section-grid" id="service">
        <div className="section-heading">
          <p className="eyebrow">公司优势</p>
          <h2>从品牌层到详情页层，我们让官网内容更接近真实经营结构。</h2>
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
            <p className="eyebrow">商品展示</p>
            <h2>每个商品都可进入独立详情页，自有品牌与合作品牌都能做成完整图文介绍。</h2>
          </div>
          <p className="section-note">商品、品牌和详情模块都来自后台，运营调整后官网刷新即可同步。</p>
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
          <p className="eyebrow">服务流程</p>
          <h2>把“品牌定位、商品组织、详情内容配置、客户转化”连接成一条更稳定的农产品服务链。</h2>
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
        <h2>如果你需要一个能同时展示品牌矩阵、商品卡片和图文详情页的官网，我们已经把核心结构准备好了。</h2>
        <p>可继续扩展为招商介绍页、询盘表单、品牌故事页和订单协同系统，让官网真正服务于日常经营。</p>
        <div className="hero-actions">
          <a className="primary-link" href="mailto:contact@lvyouyuan.com">
            contact@lvyouyuan.com
          </a>
          <a className="ghost-link" href="tel:400-800-2026">
            400-800-2026
          </a>
        </div>
      </section>
    </main>
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

  return (
    <main className="detail-shell">
      <section className="detail-hero">
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
        </div>
        <div className="detail-hero__media">
          <img src={product.image} alt={product.name} />
        </div>
      </section>

      <section className="detail-intro">
        <div className="detail-intro__main">
          <h2>产品亮点</h2>
          <ul className="detail-highlight-list">
            {product.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <aside className="detail-intro__side">
          <h3>所属品牌</h3>
          <strong>{product.brandName}</strong>
          <p>{product.brandEnglishName || 'Brand Introduction'}</p>
          <a className="ghost-link" href="/" onClick={(event) => onHomeNavigate(event, 'brands')}>
            查看品牌矩阵
          </a>
        </aside>
      </section>

      <div className="detail-content">
        {product.detailSections.length > 0 ? (
          product.detailSections.map((section) => renderDetailSection(section))
        ) : (
          <section className="detail-section detail-section--text">
            <h2>更多介绍</h2>
            <p>这个商品的图文详情还在补充中，稍后会通过后台继续完善。</p>
          </section>
        )}
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
  const [pathname, setPathname] = useState(getPathname)
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
        const [nextProducts, nextBrands] = await Promise.all([fetchProducts(), fetchBrands()])

        if (active) {
          setProducts(nextProducts)
          setBrands(nextBrands)
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
      <SiteHeader onSectionNavigate={handleSectionNavigate} />
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
          error={error}
          loading={loading}
          onProductNavigate={handleProductNavigate}
          onSectionNavigate={handleSectionNavigate}
          products={products}
        />
      )}
    </div>
  )
}

export default App
