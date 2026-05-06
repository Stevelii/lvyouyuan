import type {
  AdminUserForm,
  AdminProfile,
  Brand,
  BrandForm,
  HomePageContent,
  LoginForm,
  PasswordForm,
  Product,
  ProductForm
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class AuthError extends Error {}

function toProductPayload(form: ProductForm) {
  return {
    ...form,
    highlights: form.highlights
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
}

function createHeaders(token?: string) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

async function parseJson<T>(response: Response) {
  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

async function ensureResponse(response: Response, fallbackMessage: string) {
  if (response.ok) {
    return
  }

  const data = await parseJson<{ message?: string }>(response).catch(() => ({ message: fallbackMessage }))
  const message = data?.message ?? fallbackMessage

  if (response.status === 401) {
    throw new AuthError(message)
  }

  throw new Error(message)
}

export async function loginAdmin(form: LoginForm) {
  const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(form)
  })

  await ensureResponse(response, '登录失败')
  return parseJson<{ token: string; admin: AdminProfile }>(response)
}

export async function fetchCurrentAdmin(token: string) {
  const response = await fetch(`${API_BASE_URL}/admin/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  await ensureResponse(response, '获取管理员信息失败')
  const data = await parseJson<{ admin: AdminProfile }>(response)
  return data.admin
}

export async function logoutAdmin(token: string) {
  const response = await fetch(`${API_BASE_URL}/admin/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  await ensureResponse(response, '退出登录失败')
}

export async function changePassword(token: string, form: PasswordForm) {
  const response = await fetch(`${API_BASE_URL}/admin/auth/change-password`, {
    method: 'POST',
    headers: createHeaders(token),
    body: JSON.stringify({
      currentPassword: form.currentPassword,
      nextPassword: form.nextPassword
    })
  })

  await ensureResponse(response, '修改密码失败')
  return parseJson<{ message: string; admin: AdminProfile }>(response)
}

export async function fetchAdminProducts(token: string) {
  const response = await fetch(`${API_BASE_URL}/admin/products`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  await ensureResponse(response, '加载后台商品失败')
  return parseJson<Product[]>(response)
}

export async function createProduct(token: string, form: ProductForm) {
  const response = await fetch(`${API_BASE_URL}/admin/products`, {
    method: 'POST',
    headers: createHeaders(token),
    body: JSON.stringify(toProductPayload(form))
  })

  await ensureResponse(response, '新增商品失败')
  return parseJson<Product>(response)
}

export async function updateProduct(token: string, form: ProductForm) {
  const response = await fetch(`${API_BASE_URL}/admin/products/${form.id}`, {
    method: 'PUT',
    headers: createHeaders(token),
    body: JSON.stringify(toProductPayload(form))
  })

  await ensureResponse(response, '更新商品失败')
  return parseJson<Product>(response)
}

export async function deleteProduct(token: string, id: string) {
  const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  await ensureResponse(response, '删除商品失败')
}

export async function fetchAdminBrands(token: string) {
  const response = await fetch(`${API_BASE_URL}/admin/brands`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  await ensureResponse(response, '加载品牌失败')
  return parseJson<Brand[]>(response)
}

export async function createBrand(token: string, form: BrandForm) {
  const response = await fetch(`${API_BASE_URL}/admin/brands`, {
    method: 'POST',
    headers: createHeaders(token),
    body: JSON.stringify(form)
  })

  await ensureResponse(response, '新增品牌失败')
  return parseJson<Brand>(response)
}

export async function updateBrand(token: string, form: BrandForm) {
  const response = await fetch(`${API_BASE_URL}/admin/brands/${form.id}`, {
    method: 'PUT',
    headers: createHeaders(token),
    body: JSON.stringify(form)
  })

  await ensureResponse(response, '更新品牌失败')
  return parseJson<Brand>(response)
}

export async function deleteBrand(token: string, id: string) {
  const response = await fetch(`${API_BASE_URL}/admin/brands/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  await ensureResponse(response, '删除品牌失败')
}

export async function fetchAdminUsers(token: string) {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  await ensureResponse(response, '加载管理员列表失败')
  return parseJson<AdminProfile[]>(response)
}

export async function createAdminUser(token: string, form: AdminUserForm) {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'POST',
    headers: createHeaders(token),
    body: JSON.stringify(form)
  })

  await ensureResponse(response, '新增管理员失败')
  return parseJson<AdminProfile>(response)
}

export async function uploadAdminImages(token: string, files: File[] | FileList, subdir = 'products') {
  const payload = new FormData()

  for (const file of Array.from(files)) {
    payload.append('files', file)
  }

  payload.append('subdir', subdir)

  const response = await fetch(`${API_BASE_URL}/admin/uploads/images`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: payload
  })

  await ensureResponse(response, '上传图片失败')
  return parseJson<{ urls: string[] }>(response)
}

export async function fetchAdminSiteContent(token: string) {
  const response = await fetch(`${API_BASE_URL}/admin/site-content`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  await ensureResponse(response, '加载官网首页配置失败')
  return parseJson<HomePageContent>(response)
}

export async function updateAdminSiteContent(token: string, form: HomePageContent) {
  const response = await fetch(`${API_BASE_URL}/admin/site-content`, {
    method: 'PUT',
    headers: createHeaders(token),
    body: JSON.stringify(form)
  })

  await ensureResponse(response, '保存官网首页配置失败')
  return parseJson<HomePageContent>(response)
}
