import type { Brand, HomePageContent, Product } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function ensureResponse(response: Response, fallbackMessage: string) {
  if (!response.ok) {
    throw new Error(fallbackMessage)
  }
}

export async function fetchProducts() {
  const response = await fetch(`${API_BASE_URL}/products`)
  await ensureResponse(response, '商品数据加载失败')
  return (await response.json()) as Product[]
}

export async function fetchBrands() {
  const response = await fetch(`${API_BASE_URL}/brands`)
  await ensureResponse(response, '品牌数据加载失败')
  return (await response.json()) as Brand[]
}

export async function fetchSiteContent() {
  const response = await fetch(`${API_BASE_URL}/site-content`)
  await ensureResponse(response, '官网首页配置加载失败')
  return (await response.json()) as HomePageContent
}
