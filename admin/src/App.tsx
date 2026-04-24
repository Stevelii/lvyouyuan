import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import {
  AuthError,
  changePassword,
  createAdminUser,
  createBrand,
  createProduct,
  deleteBrand,
  deleteProduct,
  fetchAdminBrands,
  fetchAdminProducts,
  fetchAdminUsers,
  fetchCurrentAdmin,
  loginAdmin,
  logoutAdmin,
  updateBrand,
  updateProduct
} from './lib/api'
import type {
  AdminUserForm,
  AdminProfile,
  Brand,
  BrandForm,
  LoginForm,
  PasswordForm,
  Product,
  ProductDetailSection,
  ProductDetailSectionType,
  ProductForm
} from './types'

const AUTH_STORAGE_KEY = 'lvyouyuan_admin_token'
const DEFAULT_PASSWORD = '111111'

const DETAIL_SECTION_TYPES: { type: ProductDetailSectionType; label: string }[] = [
  { type: 'text', label: '文本' },
  { type: 'richtext', label: '富文本' },
  { type: 'image', label: '图片' },
  { type: 'video', label: '视频' },
  { type: 'gallery', label: '图集' },
  { type: 'features', label: '卖点' },
  { type: 'specs', label: '参数' },
  { type: 'downloads', label: '资料下载' },
  { type: 'quote', label: '引用' }
]

function createUniqueId(prefix: string) {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createEmptyDetailSection(type: ProductDetailSectionType): ProductDetailSection {
  const id = createUniqueId('section')

  if (type === 'text') {
    return { id, type, title: '模块标题', content: '' }
  }

  if (type === 'richtext') {
    return {
      id,
      type,
      title: '图文说明',
      content: '请输入正文内容。\n\n- 可以用短横线整理要点\n- 用空行分段'
    }
  }

  if (type === 'image') {
    return { id, type, title: '图片模块', image: '', caption: '' }
  }

  if (type === 'video') {
    return { id, type, title: '视频模块', videoUrl: '', posterImage: '', caption: '' }
  }

  if (type === 'gallery') {
    return { id, type, title: '图集模块', images: [], caption: '' }
  }

  if (type === 'features') {
    return { id, type, title: '卖点模块', items: [] }
  }

  if (type === 'specs') {
    return { id, type, title: '参数模块', specs: [] }
  }

  if (type === 'downloads') {
    return { id, type, title: '资料下载', files: [] }
  }

  return { id, type, quote: '', author: '' }
}

function createEmptyProductForm(brands: Brand[], sortOrder = 1): ProductForm {
  return {
    id: '',
    brandId: brands[0]?.id ?? '',
    name: '',
    category: '',
    origin: '',
    priceLabel: '',
    description: '',
    image: '',
    badge: '',
    highlights: '',
    detailSections: [],
    isFeatured: false,
    isPublished: true,
    sortOrder
  }
}

function createEmptyBrandForm(sortOrder = 1): BrandForm {
  return {
    id: '',
    name: '',
    englishName: '',
    slogan: '',
    description: '',
    coverImage: '',
    color: '#57703c',
    isOwned: true,
    isVisible: true,
    sortOrder
  }
}

function toProductForm(product: Product): ProductForm {
  return {
    id: product.id,
    brandId: product.brandId,
    name: product.name,
    category: product.category,
    origin: product.origin,
    priceLabel: product.priceLabel,
    description: product.description,
    image: product.image,
    badge: product.badge,
    highlights: product.highlights.join(', '),
    detailSections: product.detailSections,
    isFeatured: product.isFeatured,
    isPublished: product.isPublished,
    sortOrder: product.sortOrder
  }
}

function toBrandForm(brand: Brand): BrandForm {
  return {
    id: brand.id,
    name: brand.name,
    englishName: brand.englishName,
    slogan: brand.slogan,
    description: brand.description,
    coverImage: brand.coverImage,
    color: brand.color,
    isOwned: brand.isOwned,
    isVisible: brand.isVisible,
    sortOrder: brand.sortOrder
  }
}

function createEmptyPasswordForm(): PasswordForm {
  return {
    currentPassword: '',
    nextPassword: '',
    confirmPassword: ''
  }
}

function createEmptyAdminUserForm(): AdminUserForm {
  return {
    phone: '',
    password: DEFAULT_PASSWORD,
    mustChangePassword: true,
    isSystemAdmin: false
  }
}

function linesToList(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function listToLines(value?: string[]) {
  return (value ?? []).join('\n')
}

function specsToText(specs?: ProductDetailSection['specs']) {
  return (specs ?? []).map((item) => `${item.label}: ${item.value}`).join('\n')
}

function textToSpecs(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [label, ...rest] = item.split(':')
      return {
        label: label?.trim() ?? '',
        value: rest.join(':').trim()
      }
    })
    .filter((item) => item.label && item.value)
}

function filesToText(files?: ProductDetailSection['files']) {
  return (files ?? [])
    .map((item) => [item.name, item.url, item.description ?? ''].filter((part) => part !== '').join(' | '))
    .join('\n')
}

function textToFiles(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [name = '', url = '', description = ''] = item.split('|').map((part) => part.trim())
      return {
        name,
        url,
        description
      }
    })
    .filter((item) => item.name && item.url)
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
          <ul className="detail-preview-richtext-list" key={`list-${blockIndex}`}>
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

function renderDetailPreview(section: ProductDetailSection) {
  if (section.type === 'text') {
    return (
      <article className="detail-preview-block" key={section.id}>
        {section.title ? <strong>{section.title}</strong> : null}
        <p>{section.content || '文本内容待填写'}</p>
      </article>
    )
  }

  if (section.type === 'richtext') {
    return (
      <article className="detail-preview-block" key={section.id}>
        {section.title ? <strong>{section.title}</strong> : null}
        <div className="detail-preview-richtext">
          {section.content ? renderRichTextBlocks(section.content) : <p>富文本内容待填写</p>}
        </div>
      </article>
    )
  }

  if (section.type === 'image') {
    return (
      <article className="detail-preview-block" key={section.id}>
        {section.title ? <strong>{section.title}</strong> : null}
        {section.image ? <img alt={section.title || '详情图片'} src={section.image} /> : null}
        <p>{section.caption || '图片说明待填写'}</p>
      </article>
    )
  }

  if (section.type === 'video') {
    return (
      <article className="detail-preview-block" key={section.id}>
        {section.title ? <strong>{section.title}</strong> : null}
        <div className="detail-preview-video">
          {section.videoUrl ? (
            isDirectVideoSource(section.videoUrl) ? (
              <video controls poster={section.posterImage || undefined} src={section.videoUrl} />
            ) : (
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                src={section.videoUrl}
                title={section.title || '视频模块'}
              />
            )
          ) : (
            <div className="preview-placeholder preview-placeholder--compact">视频预览区</div>
          )}
        </div>
        <p>{section.caption || '视频说明待填写'}</p>
      </article>
    )
  }

  if (section.type === 'gallery') {
    return (
      <article className="detail-preview-block" key={section.id}>
        {section.title ? <strong>{section.title}</strong> : null}
        <div className="detail-preview-gallery">
          {section.images?.slice(0, 3).map((image) => (
            <img alt={section.title || '详情图集'} key={image} src={image} />
          ))}
        </div>
        <p>{section.caption || '图集说明待填写'}</p>
      </article>
    )
  }

  if (section.type === 'features') {
    return (
      <article className="detail-preview-block" key={section.id}>
        {section.title ? <strong>{section.title}</strong> : null}
        <ul>
          {(section.items ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    )
  }

  if (section.type === 'specs') {
    return (
      <article className="detail-preview-block" key={section.id}>
        {section.title ? <strong>{section.title}</strong> : null}
        <ul>
          {(section.specs ?? []).map((item) => (
            <li key={`${item.label}-${item.value}`}>
              {item.label}：{item.value}
            </li>
          ))}
        </ul>
      </article>
    )
  }

  if (section.type === 'downloads') {
    return (
      <article className="detail-preview-block" key={section.id}>
        {section.title ? <strong>{section.title}</strong> : null}
        <div className="detail-preview-downloads">
          {(section.files ?? []).map((file) => (
            <div className="detail-preview-download-item" key={`${file.name}-${file.url}`}>
              <strong>{file.name}</strong>
              <span>{file.description || '下载资料'}</span>
            </div>
          ))}
        </div>
      </article>
    )
  }

  return (
    <article className="detail-preview-block detail-preview-block--quote" key={section.id}>
      <p>{section.quote || '引用内容待填写'}</p>
      {section.author ? <span>{section.author}</span> : null}
    </article>
  )
}

function App() {
  const [token, setToken] = useState(() => window.localStorage.getItem(AUTH_STORAGE_KEY) ?? '')
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [users, setUsers] = useState<AdminProfile[]>([])
  const [activeSection, setActiveSection] = useState<'products' | 'brands' | 'users'>('products')
  const [productForm, setProductForm] = useState<ProductForm>(createEmptyProductForm([], 1))
  const [brandForm, setBrandForm] = useState<BrandForm>(createEmptyBrandForm())
  const [userForm, setUserForm] = useState<AdminUserForm>(createEmptyAdminUserForm())
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(createEmptyPasswordForm())
  const [loginForm, setLoginForm] = useState<LoginForm>({ phone: '', password: DEFAULT_PASSWORD })
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [authLoading, setAuthLoading] = useState(Boolean(token))
  const [status, setStatus] = useState('请先登录后台')
  const [loginError, setLoginError] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const deferredSearchTerm = useDeferredValue(searchTerm)

  useEffect(() => {
    if (!token) {
      setAuthLoading(false)
      setLoading(false)
      return
    }

    let active = true

    async function bootstrap() {
      try {
        const profile = await fetchCurrentAdmin(token)
        const [nextProducts, nextBrands, nextUsers] = await Promise.all([
          fetchAdminProducts(token),
          fetchAdminBrands(token),
          profile.isSystemAdmin ? fetchAdminUsers(token) : Promise.resolve([])
        ])

        if (!active) {
          return
        }

        startTransition(() => {
          setAdmin(profile)
          setProducts(nextProducts)
          setBrands(nextBrands)
          setUsers(nextUsers)
          setLoading(false)
          setAuthLoading(false)
        })

        setProductForm(createEmptyProductForm(nextBrands, nextProducts.length + 1))
        setBrandForm(createEmptyBrandForm(nextBrands.length + 1))
        setUserForm(createEmptyAdminUserForm())
        setStatus(
          profile.mustChangePassword
            ? '首次登录建议先修改默认密码 111111'
            : `欢迎回来，${profile.isSystemAdmin ? '系统管理员' : '管理员'} ${profile.phone}`
        )
      } catch (error) {
        if (!active) {
          return
        }

        clearSession()
        setLoginError(error instanceof Error ? error.message : '登录状态失效，请重新登录')
        setAuthLoading(false)
        setLoading(false)
      }
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [token])

  const filteredProducts = useMemo(() => {
    const keyword = deferredSearchTerm.trim().toLowerCase()

    if (!keyword) {
      return products
    }

    return products.filter((product) =>
      [product.name, product.category, product.origin, product.badge, product.brandName]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }, [deferredSearchTerm, products])

  const filteredBrands = useMemo(() => {
    const keyword = deferredSearchTerm.trim().toLowerCase()

    if (!keyword) {
      return brands
    }

    return brands.filter((brand) =>
      [brand.name, brand.englishName, brand.slogan, brand.description]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }, [deferredSearchTerm, brands])

  const filteredUsers = useMemo(() => {
    const keyword = deferredSearchTerm.trim().toLowerCase()

    if (!keyword) {
      return users
    }

    return users.filter((item) =>
      [item.phone, item.isSystemAdmin ? '系统管理员' : '管理员']
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }, [deferredSearchTerm, users])

  function persistSession(nextToken: string, nextAdmin: AdminProfile) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, nextToken)
    setToken(nextToken)
    setAdmin(nextAdmin)
  }

  function clearSession() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    setToken('')
    setAdmin(null)
    setProducts([])
    setBrands([])
    setUsers([])
    setSelectedProductId('')
    setSelectedBrandId('')
    setSelectedUserId('')
    setProductForm(createEmptyProductForm([], 1))
    setBrandForm(createEmptyBrandForm())
    setUserForm(createEmptyAdminUserForm())
  }

  async function refreshDashboard(options?: {
    productId?: string
    brandId?: string
    userId?: string
    preferSection?: 'products' | 'brands' | 'users'
  }) {
    if (!token) {
      return
    }

    try {
      const [profile, nextProducts, nextBrands] = await Promise.all([
        fetchCurrentAdmin(token),
        fetchAdminProducts(token),
        fetchAdminBrands(token)
      ])
      const nextUsers = profile.isSystemAdmin ? await fetchAdminUsers(token) : []

      startTransition(() => {
        setAdmin(profile)
        setProducts(nextProducts)
        setBrands(nextBrands)
        setUsers(nextUsers)
        setLoading(false)
      })

      const targetProduct = nextProducts.find((product) => product.id === (options?.productId ?? selectedProductId))
      const targetBrand = nextBrands.find((brand) => brand.id === (options?.brandId ?? selectedBrandId))

      if (targetProduct) {
        setSelectedProductId(targetProduct.id)
        setProductForm(toProductForm(targetProduct))
      } else {
        setSelectedProductId('')
        setProductForm(createEmptyProductForm(nextBrands, nextProducts.length + 1))
      }

      if (targetBrand) {
        setSelectedBrandId(targetBrand.id)
        setBrandForm(toBrandForm(targetBrand))
      } else {
        setSelectedBrandId('')
        setBrandForm(createEmptyBrandForm(nextBrands.length + 1))
      }

      const targetUser = nextUsers.find((item) => item.id === (options?.userId ?? selectedUserId))

      if (targetUser) {
        setSelectedUserId(targetUser.id)
      } else {
        setSelectedUserId('')
      }

      setUserForm(createEmptyAdminUserForm())

      if (options?.preferSection) {
        setActiveSection(options.preferSection)
      }

      setStatus(
        `已同步 ${nextProducts.length} 个商品、${nextBrands.length} 个品牌${profile.isSystemAdmin ? `、${nextUsers.length} 个后台账号` : ''}；当前官网展示 ${nextProducts.filter((product) => product.isPublished).length} 个商品。`
      )
    } catch (error) {
      handleApiError(error, '读取数据失败')
    }
  }

  function handleApiError(error: unknown, fallbackMessage: string) {
    if (error instanceof AuthError) {
      clearSession()
      setLoginError(error.message)
      setStatus('登录已失效，请重新登录')
      return
    }

    setStatus(error instanceof Error ? error.message : fallbackMessage)
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setLoginError('')

    try {
      const result = await loginAdmin(loginForm)
      persistSession(result.token, result.admin)
      setAuthLoading(true)
      setLoading(true)
      setPasswordForm(createEmptyPasswordForm())
      setStatus(
        result.admin.mustChangePassword
          ? '首次登录成功，请先修改默认密码 111111'
          : `登录成功，欢迎${result.admin.isSystemAdmin ? '系统管理员' : '管理员'} ${result.admin.phone}`
      )
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '登录失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    if (token) {
      try {
        await logoutAdmin(token)
      } catch {
        // Ignore logout failures and clear local session anyway.
      }
    }

    clearSession()
    setStatus('你已退出登录')
    setLoginForm((current) => ({ ...current, password: DEFAULT_PASSWORD }))
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      return
    }

    if (passwordForm.nextPassword.length < 6) {
      setStatus('新密码至少需要 6 位')
      return
    }

    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      setStatus('两次输入的新密码不一致')
      return
    }

    setSaving(true)

    try {
      const result = await changePassword(token, passwordForm)
      setAdmin(result.admin)
      setPasswordForm(createEmptyPasswordForm())
      setStatus(result.message)
    } catch (error) {
      handleApiError(error, '修改密码失败')
    } finally {
      setSaving(false)
    }
  }

  function updateProductForm<K extends keyof ProductForm>(field: K, value: ProductForm[K]) {
    setProductForm((current) => ({ ...current, [field]: value }))
  }

  function updateBrandForm<K extends keyof BrandForm>(field: K, value: BrandForm[K]) {
    setBrandForm((current) => ({ ...current, [field]: value }))
  }

  function updatePasswordForm<K extends keyof PasswordForm>(field: K, value: PasswordForm[K]) {
    setPasswordForm((current) => ({ ...current, [field]: value }))
  }

  function updateUserForm<K extends keyof AdminUserForm>(field: K, value: AdminUserForm[K]) {
    setUserForm((current) => ({ ...current, [field]: value }))
  }

  function handleSelectProduct(product: Product) {
    setSelectedProductId(product.id)
    setProductForm(toProductForm(product))
    setActiveSection('products')
    setStatus(`正在编辑商品：${product.name}`)
  }

  function handleSelectBrand(brand: Brand) {
    setSelectedBrandId(brand.id)
    setBrandForm(toBrandForm(brand))
    setActiveSection('brands')
    setStatus(`正在编辑品牌：${brand.name}`)
  }

  function handleCreateNewProduct() {
    setSelectedProductId('')
    setProductForm(createEmptyProductForm(brands, products.length + 1))
    setActiveSection('products')
    setStatus('已切换到新建商品表单')
  }

  function handleCreateNewBrand() {
    setSelectedBrandId('')
    setBrandForm(createEmptyBrandForm(brands.length + 1))
    setActiveSection('brands')
    setStatus('已切换到新建品牌表单')
  }

  function handleCreateNewUser() {
    setSelectedUserId('')
    setUserForm(createEmptyAdminUserForm())
    setActiveSection('users')
    setStatus('已切换到新建后台用户表单')
  }

  function handleAddDetailSection(type: ProductDetailSectionType) {
    setProductForm((current) => ({
      ...current,
      detailSections: [...current.detailSections, createEmptyDetailSection(type)]
    }))
  }

  function handleUpdateDetailSection(sectionId: string, updater: (section: ProductDetailSection) => ProductDetailSection) {
    setProductForm((current) => ({
      ...current,
      detailSections: current.detailSections.map((section) =>
        section.id === sectionId ? updater(section) : section
      )
    }))
  }

  function handleMoveDetailSection(sectionId: string, direction: -1 | 1) {
    setProductForm((current) => {
      const index = current.detailSections.findIndex((section) => section.id === sectionId)

      if (index === -1) {
        return current
      }

      const nextIndex = index + direction

      if (nextIndex < 0 || nextIndex >= current.detailSections.length) {
        return current
      }

      const nextSections = [...current.detailSections]
      const [moved] = nextSections.splice(index, 1)
      nextSections.splice(nextIndex, 0, moved)

      return {
        ...current,
        detailSections: nextSections
      }
    })
  }

  function handleDeleteDetailSection(sectionId: string) {
    setProductForm((current) => ({
      ...current,
      detailSections: current.detailSections.filter((section) => section.id !== sectionId)
    }))
  }

  async function handleSubmitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      return
    }

    if (!brands.length) {
      setStatus('请先创建品牌，再录入商品')
      return
    }

    setSaving(true)

    try {
      const saved = productForm.id
        ? await updateProduct(token, productForm)
        : await createProduct(token, productForm)
      await refreshDashboard({ productId: saved.id, preferSection: 'products' })
      setStatus(productForm.id ? '商品已更新' : '商品已新增')
    } catch (error) {
      handleApiError(error, '保存商品失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      return
    }

    setSaving(true)

    try {
      const saved = brandForm.id ? await updateBrand(token, brandForm) : await createBrand(token, brandForm)
      await refreshDashboard({ brandId: saved.id, preferSection: 'brands' })
      setStatus(brandForm.id ? '品牌已更新' : '品牌已新增')
    } catch (error) {
      handleApiError(error, '保存品牌失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      return
    }

    setSaving(true)

    try {
      const saved = await createAdminUser(token, userForm)
      await refreshDashboard({ userId: saved.id, preferSection: 'users' })
      setStatus(`后台账号 ${saved.phone} 已创建`)
    } catch (error) {
      handleApiError(error, '新增后台账号失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteProduct() {
    if (!token || !selectedProductId) {
      return
    }

    if (!window.confirm('确定要删除当前商品吗？这个操作会影响官网展示。')) {
      return
    }

    setSaving(true)

    try {
      await deleteProduct(token, selectedProductId)
      await refreshDashboard({ preferSection: 'products' })
      setStatus('商品已删除')
    } catch (error) {
      handleApiError(error, '删除商品失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteBrand() {
    if (!token || !selectedBrandId) {
      return
    }

    if (!window.confirm('确定要删除当前品牌吗？如果已有商品关联该品牌，系统会阻止删除。')) {
      return
    }

    setSaving(true)

    try {
      await deleteBrand(token, selectedBrandId)
      await refreshDashboard({ preferSection: 'brands' })
      setStatus('品牌已删除')
    } catch (error) {
      handleApiError(error, '删除品牌失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleProductToggle(product: Product, field: 'isPublished' | 'isFeatured') {
    if (!token) {
      return
    }

    setSaving(true)

    try {
      await updateProduct(token, {
        ...toProductForm(product),
        [field]: !product[field]
      })
      await refreshDashboard({ productId: product.id, preferSection: 'products' })
      setStatus(field === 'isPublished' ? '商品展示状态已更新' : '商品主推状态已更新')
    } catch (error) {
      handleApiError(error, '更新商品失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleBrandToggle(brand: Brand, field: 'isVisible' | 'isOwned') {
    if (!token) {
      return
    }

    setSaving(true)

    try {
      await updateBrand(token, {
        ...toBrandForm(brand),
        [field]: !brand[field]
      })
      await refreshDashboard({ brandId: brand.id, preferSection: 'brands' })
      setStatus(field === 'isVisible' ? '品牌官网展示状态已更新' : '品牌归属状态已更新')
    } catch (error) {
      handleApiError(error, '更新品牌失败')
    } finally {
      setSaving(false)
    }
  }

  const currentBrandForPreview =
    brands.find((brand) => brand.id === productForm.brandId) ??
    brands.find((brand) => brand.id === selectedBrandId) ??
    brands[0] ??
    null
  const selectedUser = users.find((item) => item.id === selectedUserId) ?? null

  if (authLoading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p className="sidebar-label">绿优源 Admin</p>
          <h1>正在校验登录状态...</h1>
        </div>
      </div>
    )
  }

  if (!token || !admin) {
    return (
      <div className="auth-shell">
        <section className="auth-panel auth-panel--brand">
          <p className="sidebar-label">绿优源 Admin</p>
          <h1>品牌、商品与详情页管理后台</h1>
          <p>
            后台现在支持手机号 + 密码登录，并可同时管理品牌、商品以及商品详情模块。后台账号必须由系统管理员预先创建，不再支持自行注册。
          </p>
          <div className="auth-tips">
            <span>系统管理员账号：15915310173</span>
            <span>新建账号可使用默认密码 111111</span>
            <span>商品详情支持富文本、视频、下载资料等模块</span>
            <span>每个商品都需绑定品牌</span>
          </div>
        </section>

        <form className="auth-panel auth-panel--form" onSubmit={handleLogin}>
          <label>
            手机号
            <input
              autoComplete="username"
              inputMode="numeric"
              maxLength={11}
              placeholder="请输入 11 位手机号"
              required
              value={loginForm.phone}
              onChange={(event) => setLoginForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>
          <label>
            密码
            <input
              autoComplete="current-password"
              placeholder="请输入密码"
              required
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
            />
          </label>
          {loginError ? <p className="status-text status-text--error">{loginError}</p> : null}
          <button className="button-primary auth-submit" disabled={saving} type="submit">
            {saving ? '登录中...' : '登录后台'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-block">
          <p className="sidebar-label">绿优源 Admin</p>
          <h1>品牌、商品与详情页管理台</h1>
          <p className="sidebar-copy">当前登录账号：{admin.phone}</p>
          <p className="sidebar-copy">{admin.isSystemAdmin ? '当前身份：系统管理员' : '当前身份：管理员'}</p>
          <p className="sidebar-copy">
            {admin.mustChangePassword ? '你还在使用默认密码，建议立即修改。' : '你已经启用自定义密码。'}
          </p>
        </div>

        <div className="sidebar-stats">
          <article>
            <strong>{products.length}</strong>
            <span>商品总数</span>
          </article>
          <article>
            <strong>{products.filter((product) => product.isPublished).length}</strong>
            <span>展示商品</span>
          </article>
          <article>
            <strong>{brands.length}</strong>
            <span>品牌总数</span>
          </article>
          <article>
            <strong>{brands.filter((brand) => brand.isVisible).length}</strong>
            <span>官网品牌</span>
          </article>
          {admin.isSystemAdmin ? (
            <article>
              <strong>{users.length}</strong>
              <span>后台账号</span>
            </article>
          ) : null}
        </div>

        <form className="password-panel" onSubmit={handleChangePassword}>
          <p className="sidebar-label">修改密码</p>
          <label>
            当前密码
            <input
              autoComplete="current-password"
              required
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => updatePasswordForm('currentPassword', event.target.value)}
            />
          </label>
          <label>
            新密码
            <input
              autoComplete="new-password"
              required
              type="password"
              value={passwordForm.nextPassword}
              onChange={(event) => updatePasswordForm('nextPassword', event.target.value)}
            />
          </label>
          <label>
            确认新密码
            <input
              autoComplete="new-password"
              required
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => updatePasswordForm('confirmPassword', event.target.value)}
            />
          </label>
          <div className="sidebar-toolbar">
            <button className="button-primary" disabled={saving} type="submit">
              保存新密码
            </button>
            <button className="button-secondary" onClick={() => void handleLogout()} type="button">
              退出登录
            </button>
          </div>
        </form>

        <div className="section-switcher">
          <button
            className={`switcher-button ${activeSection === 'products' ? 'switcher-button--active' : ''}`}
            onClick={() => setActiveSection('products')}
            type="button"
          >
            商品管理
          </button>
          <button
            className={`switcher-button ${activeSection === 'brands' ? 'switcher-button--active' : ''}`}
            onClick={() => setActiveSection('brands')}
            type="button"
          >
            品牌管理
          </button>
          {admin.isSystemAdmin ? (
            <button
              className={`switcher-button ${activeSection === 'users' ? 'switcher-button--active' : ''}`}
              onClick={() => setActiveSection('users')}
              type="button"
            >
              用户管理
            </button>
          ) : null}
        </div>

        <div className="sidebar-toolbar">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={
              activeSection === 'products'
                ? '搜索商品、品牌、分类'
                : activeSection === 'brands'
                  ? '搜索品牌名称或品牌口号'
                  : '搜索手机号或管理员类型'
            }
            type="search"
          />
          {activeSection === 'products' ? (
            <button className="button-primary" onClick={handleCreateNewProduct} type="button">
              新建商品
            </button>
          ) : null}
          {activeSection === 'brands' ? (
            <button className="button-primary" onClick={handleCreateNewBrand} type="button">
              新建品牌
            </button>
          ) : null}
          {activeSection === 'users' && admin.isSystemAdmin ? (
            <button className="button-primary" onClick={handleCreateNewUser} type="button">
              新建用户
            </button>
          ) : null}
        </div>

        <div className="product-list" role="list">
          {loading ? <p className="empty-note">正在读取数据...</p> : null}

          {!loading && activeSection === 'products' && filteredProducts.length === 0 ? (
            <p className="empty-note">没有匹配到商品</p>
          ) : null}

          {!loading && activeSection === 'brands' && filteredBrands.length === 0 ? (
            <p className="empty-note">没有匹配到品牌</p>
          ) : null}

          {!loading && activeSection === 'users' && filteredUsers.length === 0 ? (
            <p className="empty-note">没有匹配到后台用户</p>
          ) : null}

          {activeSection === 'products'
            ? filteredProducts.map((product) => (
                <article
                  className={`product-row ${selectedProductId === product.id ? 'product-row--active' : ''}`}
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      handleSelectProduct(product)
                    }
                  }}
                >
                  <img src={product.image} alt={product.name} />
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.brandName}</span>
                    <small>{product.isPublished ? '官网展示中' : '未展示'}</small>
                    <div className="row-actions">
                      <button
                        className="button-quiet"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleProductToggle(product, 'isPublished')
                        }}
                        type="button"
                      >
                        {product.isPublished ? '下架' : '上架'}
                      </button>
                      <button
                        className="button-quiet"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleProductToggle(product, 'isFeatured')
                        }}
                        type="button"
                      >
                        {product.isFeatured ? '取消主推' : '设为主推'}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            : activeSection === 'brands'
              ? filteredBrands.map((brand) => (
                <article
                  className={`product-row ${selectedBrandId === brand.id ? 'product-row--active' : ''}`}
                  key={brand.id}
                  onClick={() => handleSelectBrand(brand)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      handleSelectBrand(brand)
                    }
                  }}
                >
                  <img src={brand.coverImage} alt={brand.name} />
                  <div>
                    <strong>{brand.name}</strong>
                    <span>{brand.isOwned ? '绿优源旗下品牌' : '合作品牌'}</span>
                    <small>{brand.isVisible ? '官网展示中' : '官网隐藏中'}</small>
                    <div className="row-actions">
                      <button
                        className="button-quiet"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleBrandToggle(brand, 'isVisible')
                        }}
                        type="button"
                      >
                        {brand.isVisible ? '隐藏官网' : '展示官网'}
                      </button>
                      <button
                        className="button-quiet"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleBrandToggle(brand, 'isOwned')
                        }}
                        type="button"
                      >
                        {brand.isOwned ? '设为合作' : '设为自有'}
                      </button>
                    </div>
                  </div>
                </article>
                ))
              : filteredUsers.map((item) => (
                  <article
                    className={`product-row ${selectedUserId === item.id ? 'product-row--active' : ''}`}
                    key={item.id}
                    onClick={() => setSelectedUserId(item.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        setSelectedUserId(item.id)
                      }
                    }}
                  >
                    <div className="user-avatar">{item.phone.slice(-2)}</div>
                    <div>
                      <strong>{item.phone}</strong>
                      <span>{item.isSystemAdmin ? '系统管理员' : '普通管理员'}</span>
                      <small>{item.mustChangePassword ? '首次登录需改密' : '已设置正式密码'}</small>
                    </div>
                  </article>
                ))}
        </div>
      </aside>

      <main className="admin-main">
        <header className="main-header">
          <div>
            <p className="sidebar-label">
              {activeSection === 'products' ? '商品编辑区' : activeSection === 'brands' ? '品牌编辑区' : '用户管理区'}
            </p>
            <h2>
              {activeSection === 'products'
                ? productForm.id
                  ? '编辑商品'
                  : '新建商品'
                : activeSection === 'brands'
                  ? brandForm.id
                    ? '编辑品牌'
                    : '新建品牌'
                  : '新增后台用户'}
            </h2>
          </div>
          <p className={`status-text ${status.includes('失败') || status.includes('错误') ? 'status-text--error' : ''}`}>
            {status}
          </p>
        </header>

        <div className="main-grid">
          {activeSection === 'products' ? (
            <>
              <form className="editor-panel" onSubmit={handleSubmitProduct}>
                <div className="field-grid">
                  <label>
                    所属品牌
                    <select
                      required
                      value={productForm.brandId}
                      onChange={(event) => updateProductForm('brandId', event.target.value)}
                    >
                      {brands.length === 0 ? <option value="">请先创建品牌</option> : null}
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name} {brand.isOwned ? '(自有)' : '(合作)'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    商品名称
                    <input
                      required
                      value={productForm.name}
                      onChange={(event) => updateProductForm('name', event.target.value)}
                    />
                  </label>
                  <label>
                    分类
                    <input
                      required
                      value={productForm.category}
                      onChange={(event) => updateProductForm('category', event.target.value)}
                    />
                  </label>
                  <label>
                    产地
                    <input
                      required
                      value={productForm.origin}
                      onChange={(event) => updateProductForm('origin', event.target.value)}
                    />
                  </label>
                  <label>
                    展示价格
                    <input
                      required
                      value={productForm.priceLabel}
                      onChange={(event) => updateProductForm('priceLabel', event.target.value)}
                    />
                  </label>
                  <label>
                    标签
                    <input
                      value={productForm.badge}
                      onChange={(event) => updateProductForm('badge', event.target.value)}
                    />
                  </label>
                  <label>
                    排序
                    <input
                      min={1}
                      type="number"
                      value={productForm.sortOrder}
                      onChange={(event) => updateProductForm('sortOrder', Number(event.target.value))}
                    />
                  </label>
                </div>

                <label>
                  商品图片 URL
                  <input
                    required
                    value={productForm.image}
                    onChange={(event) => updateProductForm('image', event.target.value)}
                  />
                </label>

                <label>
                  商品描述
                  <textarea
                    required
                    rows={4}
                    value={productForm.description}
                    onChange={(event) => updateProductForm('description', event.target.value)}
                  />
                </label>

                <label>
                  产品亮点（用英文逗号分隔）
                  <textarea
                    required
                    rows={3}
                    value={productForm.highlights}
                    onChange={(event) => updateProductForm('highlights', event.target.value)}
                  />
                </label>

                <div className="switch-row">
                  <label className="switch-item">
                    <input
                      checked={productForm.isPublished}
                      onChange={(event) => updateProductForm('isPublished', event.target.checked)}
                      type="checkbox"
                    />
                    官网展示
                  </label>
                  <label className="switch-item">
                    <input
                      checked={productForm.isFeatured}
                      onChange={(event) => updateProductForm('isFeatured', event.target.checked)}
                      type="checkbox"
                    />
                    主推商品
                  </label>
                </div>

                <section className="detail-editor">
                  <div className="detail-editor__header">
                    <div>
                      <p className="sidebar-label">详情页模块</p>
                      <h3>图文详情编辑</h3>
                    </div>
                    <div className="detail-editor__toolbar">
                      {DETAIL_SECTION_TYPES.map((item) => (
                        <button
                          className="button-quiet"
                          key={item.type}
                          onClick={() => handleAddDetailSection(item.type)}
                          type="button"
                        >
                          添加{item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {productForm.detailSections.length === 0 ? (
                    <p className="empty-note">还没有详情模块。可以添加文本、富文本、图片、视频、图集、卖点、参数、资料下载或引用模块。</p>
                  ) : null}

                  <div className="detail-editor__list">
                    {productForm.detailSections.map((section, index) => (
                      <article className="detail-editor__card" key={section.id}>
                        <div className="detail-editor__card-header">
                          <strong>
                            模块 {index + 1} · {DETAIL_SECTION_TYPES.find((item) => item.type === section.type)?.label}
                          </strong>
                          <div className="row-actions">
                            <button
                              className="button-quiet"
                              onClick={() => handleMoveDetailSection(section.id, -1)}
                              type="button"
                            >
                              上移
                            </button>
                            <button
                              className="button-quiet"
                              onClick={() => handleMoveDetailSection(section.id, 1)}
                              type="button"
                            >
                              下移
                            </button>
                            <button
                              className="button-quiet"
                              onClick={() => handleDeleteDetailSection(section.id)}
                              type="button"
                            >
                              删除
                            </button>
                          </div>
                        </div>

                        {section.type !== 'quote' ? (
                          <label>
                            模块标题
                            <input
                              value={section.title ?? ''}
                              onChange={(event) =>
                                handleUpdateDetailSection(section.id, (current) => ({
                                  ...current,
                                  title: event.target.value
                                }))
                              }
                            />
                          </label>
                        ) : null}

                        {section.type === 'text' ? (
                          <label>
                            文本内容
                            <textarea
                              rows={4}
                              value={section.content ?? ''}
                              onChange={(event) =>
                                handleUpdateDetailSection(section.id, (current) => ({
                                  ...current,
                                  content: event.target.value
                                }))
                              }
                            />
                          </label>
                        ) : null}

                        {section.type === 'richtext' ? (
                          <>
                            <label>
                              富文本内容
                              <textarea
                                rows={8}
                                value={section.content ?? ''}
                                onChange={(event) =>
                                  handleUpdateDetailSection(section.id, (current) => ({
                                    ...current,
                                    content: event.target.value
                                  }))
                                }
                              />
                            </label>
                            <p className="field-tip">支持空行分段，使用 `- 内容` 可以生成项目列表。</p>
                          </>
                        ) : null}

                        {section.type === 'image' ? (
                          <>
                            <label>
                              图片 URL
                              <input
                                value={section.image ?? ''}
                                onChange={(event) =>
                                  handleUpdateDetailSection(section.id, (current) => ({
                                    ...current,
                                    image: event.target.value
                                  }))
                                }
                              />
                            </label>
                            <label>
                              图片说明
                              <textarea
                                rows={3}
                                value={section.caption ?? ''}
                                onChange={(event) =>
                                  handleUpdateDetailSection(section.id, (current) => ({
                                    ...current,
                                    caption: event.target.value
                                  }))
                                }
                              />
                            </label>
                          </>
                        ) : null}

                        {section.type === 'video' ? (
                          <>
                            <label>
                              视频链接
                              <input
                                placeholder="支持 mp4 / webm，或可嵌入 iframe 的视频地址"
                                value={section.videoUrl ?? ''}
                                onChange={(event) =>
                                  handleUpdateDetailSection(section.id, (current) => ({
                                    ...current,
                                    videoUrl: event.target.value
                                  }))
                                }
                              />
                            </label>
                            <label>
                              封面图 URL（可选）
                              <input
                                value={section.posterImage ?? ''}
                                onChange={(event) =>
                                  handleUpdateDetailSection(section.id, (current) => ({
                                    ...current,
                                    posterImage: event.target.value
                                  }))
                                }
                              />
                            </label>
                            <label>
                              视频说明
                              <textarea
                                rows={3}
                                value={section.caption ?? ''}
                                onChange={(event) =>
                                  handleUpdateDetailSection(section.id, (current) => ({
                                    ...current,
                                    caption: event.target.value
                                  }))
                                }
                              />
                            </label>
                          </>
                        ) : null}

                        {section.type === 'gallery' ? (
                          <>
                            <label>
                              图集图片 URL（每行一张）
                              <textarea
                                rows={5}
                                value={listToLines(section.images)}
                                onChange={(event) =>
                                  handleUpdateDetailSection(section.id, (current) => ({
                                    ...current,
                                    images: linesToList(event.target.value)
                                  }))
                                }
                              />
                            </label>
                            <label>
                              图集说明
                              <textarea
                                rows={3}
                                value={section.caption ?? ''}
                                onChange={(event) =>
                                  handleUpdateDetailSection(section.id, (current) => ({
                                    ...current,
                                    caption: event.target.value
                                  }))
                                }
                              />
                            </label>
                          </>
                        ) : null}

                        {section.type === 'features' ? (
                          <label>
                            卖点内容（每行一项）
                            <textarea
                              rows={5}
                              value={listToLines(section.items)}
                              onChange={(event) =>
                                handleUpdateDetailSection(section.id, (current) => ({
                                  ...current,
                                  items: linesToList(event.target.value)
                                }))
                              }
                            />
                          </label>
                        ) : null}

                        {section.type === 'specs' ? (
                          <label>
                            参数内容（每行一条，格式：参数名: 参数值）
                            <textarea
                              rows={5}
                              value={specsToText(section.specs)}
                              onChange={(event) =>
                                handleUpdateDetailSection(section.id, (current) => ({
                                  ...current,
                                  specs: textToSpecs(event.target.value)
                                }))
                              }
                            />
                          </label>
                        ) : null}

                        {section.type === 'downloads' ? (
                          <>
                            <label>
                              下载资料（每行一条，格式：文件名 | 链接 | 说明）
                              <textarea
                                rows={5}
                                value={filesToText(section.files)}
                                onChange={(event) =>
                                  handleUpdateDetailSection(section.id, (current) => ({
                                    ...current,
                                    files: textToFiles(event.target.value)
                                  }))
                                }
                              />
                            </label>
                            <p className="field-tip">说明可选，适合放产品手册、检测报告、招商资料和采购清单。</p>
                          </>
                        ) : null}

                        {section.type === 'quote' ? (
                          <>
                            <label>
                              引用内容
                              <textarea
                                rows={4}
                                value={section.quote ?? ''}
                                onChange={(event) =>
                                  handleUpdateDetailSection(section.id, (current) => ({
                                    ...current,
                                    quote: event.target.value
                                  }))
                                }
                              />
                            </label>
                            <label>
                              署名
                              <input
                                value={section.author ?? ''}
                                onChange={(event) =>
                                  handleUpdateDetailSection(section.id, (current) => ({
                                    ...current,
                                    author: event.target.value
                                  }))
                                }
                              />
                            </label>
                          </>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>

                <div className="form-actions">
                  <button className="button-primary" disabled={saving || brands.length === 0} type="submit">
                    {saving ? '保存中...' : productForm.id ? '保存修改' : '创建商品'}
                  </button>
                  <button className="button-secondary" onClick={handleCreateNewProduct} type="button">
                    重置为新建
                  </button>
                  {productForm.id ? (
                    <button className="button-danger" disabled={saving} onClick={() => void handleDeleteProduct()} type="button">
                      删除商品
                    </button>
                  ) : null}
                </div>
              </form>

              <section className="preview-panel">
                <p className="sidebar-label">商品详情预览</p>
                <div className="preview-card">
                  {productForm.image ? (
                    <img src={productForm.image} alt={productForm.name || '商品预览'} />
                  ) : (
                    <div className="preview-placeholder">图片预览区</div>
                  )}
                  <div className="preview-content">
                    <div className="preview-meta">
                      <span>{productForm.category || '商品分类'}</span>
                      <strong>{productForm.priceLabel || '价格展示'}</strong>
                    </div>
                    <div className="preview-chip-row">
                      <span className="preview-chip">{currentBrandForPreview?.name || '品牌待选择'}</span>
                      <span className="preview-chip">
                        {currentBrandForPreview?.isOwned ? '自有品牌' : currentBrandForPreview ? '合作品牌' : '品牌未设置'}
                      </span>
                    </div>
                    <h3>{productForm.name || '商品名称'}</h3>
                    <p>{productForm.description || '这里会显示商品描述，方便运营同事预览官网上的最终呈现效果。'}</p>
                    <ul>
                      {(productForm.highlights
                        ? productForm.highlights.split(',').map((item) => item.trim()).filter(Boolean)
                        : ['产品亮点一', '产品亮点二', '产品亮点三']
                      ).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <footer>
                      <span>{productForm.origin || '商品产地'}</span>
                      <span>{productForm.isPublished ? '官网展示中' : '暂不展示'}</span>
                    </footer>
                  </div>
                </div>

                <div className="detail-preview">
                  {productForm.detailSections.length === 0 ? (
                    <p className="empty-note">详情页模块预览会显示在这里。</p>
                  ) : (
                    productForm.detailSections.map((section) => renderDetailPreview(section))
                  )}
                </div>
              </section>
            </>
          ) : activeSection === 'brands' ? (
            <>
              <form className="editor-panel" onSubmit={handleSubmitBrand}>
                <div className="field-grid">
                  <label>
                    品牌名称
                    <input
                      required
                      value={brandForm.name}
                      onChange={(event) => updateBrandForm('name', event.target.value)}
                    />
                  </label>
                  <label>
                    英文名
                    <input
                      value={brandForm.englishName}
                      onChange={(event) => updateBrandForm('englishName', event.target.value)}
                    />
                  </label>
                  <label>
                    品牌口号
                    <input
                      required
                      value={brandForm.slogan}
                      onChange={(event) => updateBrandForm('slogan', event.target.value)}
                    />
                  </label>
                  <label>
                    展示色
                    <input
                      value={brandForm.color}
                      onChange={(event) => updateBrandForm('color', event.target.value)}
                    />
                  </label>
                  <label>
                    排序
                    <input
                      min={1}
                      type="number"
                      value={brandForm.sortOrder}
                      onChange={(event) => updateBrandForm('sortOrder', Number(event.target.value))}
                    />
                  </label>
                </div>

                <label>
                  品牌封面图 URL
                  <input
                    required
                    value={brandForm.coverImage}
                    onChange={(event) => updateBrandForm('coverImage', event.target.value)}
                  />
                </label>

                <label>
                  品牌介绍
                  <textarea
                    required
                    rows={5}
                    value={brandForm.description}
                    onChange={(event) => updateBrandForm('description', event.target.value)}
                  />
                </label>

                <div className="switch-row">
                  <label className="switch-item">
                    <input
                      checked={brandForm.isOwned}
                      onChange={(event) => updateBrandForm('isOwned', event.target.checked)}
                      type="checkbox"
                    />
                    公司旗下品牌
                  </label>
                  <label className="switch-item">
                    <input
                      checked={brandForm.isVisible}
                      onChange={(event) => updateBrandForm('isVisible', event.target.checked)}
                      type="checkbox"
                    />
                    官网品牌展示
                  </label>
                </div>

                <div className="form-actions">
                  <button className="button-primary" disabled={saving} type="submit">
                    {saving ? '保存中...' : brandForm.id ? '保存修改' : '创建品牌'}
                  </button>
                  <button className="button-secondary" onClick={handleCreateNewBrand} type="button">
                    重置为新建
                  </button>
                  {brandForm.id ? (
                    <button className="button-danger" disabled={saving} onClick={() => void handleDeleteBrand()} type="button">
                      删除品牌
                    </button>
                  ) : null}
                </div>
              </form>

              <section className="preview-panel">
                <p className="sidebar-label">品牌预览</p>
                <div className="preview-card">
                  {brandForm.coverImage ? (
                    <img src={brandForm.coverImage} alt={brandForm.name || '品牌预览'} />
                  ) : (
                    <div className="preview-placeholder">品牌封面预览区</div>
                  )}
                  <div className="preview-content">
                    <div className="preview-chip-row">
                      <span className="preview-chip" style={{ '--chip-color': brandForm.color } as CSSProperties}>
                        {brandForm.isOwned ? '绿优源旗下品牌' : '合作品牌'}
                      </span>
                      <span className="preview-chip">{brandForm.isVisible ? '官网展示中' : '官网隐藏中'}</span>
                    </div>
                    <span className="preview-english">{brandForm.englishName || 'Brand Name'}</span>
                    <h3>{brandForm.name || '品牌名称'}</h3>
                    <strong className="preview-slogan">{brandForm.slogan || '这里会显示品牌口号'}</strong>
                    <p>{brandForm.description || '这里会显示品牌介绍，方便运营同事预览官网品牌卡片内容。'}</p>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              <form className="editor-panel" onSubmit={handleSubmitUser}>
                <div className="field-grid">
                  <label>
                    手机号
                    <input
                      inputMode="numeric"
                      maxLength={11}
                      required
                      value={userForm.phone}
                      onChange={(event) => updateUserForm('phone', event.target.value)}
                    />
                  </label>
                  <label>
                    初始密码
                    <input
                      required
                      type="password"
                      value={userForm.password}
                      onChange={(event) => updateUserForm('password', event.target.value)}
                    />
                  </label>
                </div>

                <div className="switch-row">
                  <label className="switch-item">
                    <input
                      checked={userForm.mustChangePassword}
                      onChange={(event) => updateUserForm('mustChangePassword', event.target.checked)}
                      type="checkbox"
                    />
                    首次登录强制修改密码
                  </label>
                  <label className="switch-item">
                    <input
                      checked={userForm.isSystemAdmin}
                      onChange={(event) => updateUserForm('isSystemAdmin', event.target.checked)}
                      type="checkbox"
                    />
                    设为系统管理员
                  </label>
                </div>

                <div className="form-actions">
                  <button className="button-primary" disabled={saving} type="submit">
                    {saving ? '创建中...' : '创建后台用户'}
                  </button>
                  <button className="button-secondary" onClick={handleCreateNewUser} type="button">
                    重置表单
                  </button>
                </div>
              </form>

              <section className="preview-panel">
                <p className="sidebar-label">账号说明</p>
                <div className="detail-preview">
                  <article className="detail-preview-block">
                    <strong>创建规则</strong>
                    <p>后台账号只能由系统管理员创建，登录页不再支持首次登录自动注册。</p>
                  </article>
                  <article className="detail-preview-block">
                    <strong>当前选中账号</strong>
                    <p>{selectedUser ? selectedUser.phone : '左侧可查看当前已有的后台用户列表。'}</p>
                    <p>{selectedUser ? (selectedUser.isSystemAdmin ? '身份：系统管理员' : '身份：普通管理员') : '系统管理员可继续新增账号。'}</p>
                    <p>{selectedUser ? (selectedUser.mustChangePassword ? '状态：首次登录需改密' : '状态：已设置正式密码') : `建议默认密码：${DEFAULT_PASSWORD}`}</p>
                  </article>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
