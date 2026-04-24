export type ProductDetailSectionType =
  | 'text'
  | 'richtext'
  | 'image'
  | 'video'
  | 'gallery'
  | 'features'
  | 'specs'
  | 'downloads'
  | 'quote'

export type ProductDetailSpec = {
  label: string
  value: string
}

export type ProductDownloadItem = {
  name: string
  url: string
  description?: string
}

export type ProductDetailSection = {
  id: string
  type: ProductDetailSectionType
  title?: string
  content?: string
  image?: string
  videoUrl?: string
  posterImage?: string
  caption?: string
  images?: string[]
  items?: string[]
  specs?: ProductDetailSpec[]
  files?: ProductDownloadItem[]
  quote?: string
  author?: string
}

export type Brand = {
  id: string
  name: string
  englishName: string
  slogan: string
  description: string
  coverImage: string
  color: string
  isOwned: boolean
  isVisible: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type Product = {
  id: string
  brandId: string
  brandName: string
  brandEnglishName: string
  brandOwned: boolean
  brandVisible: boolean
  name: string
  category: string
  origin: string
  priceLabel: string
  description: string
  image: string
  badge: string
  highlights: string[]
  detailSections: ProductDetailSection[]
  isFeatured: boolean
  isPublished: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}
