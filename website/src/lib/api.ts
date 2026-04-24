import type { Brand, Product } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'

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
