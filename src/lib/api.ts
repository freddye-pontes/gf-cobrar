const BASE_URL = 'https://gf-cobrar-production.up.railway.app/api/v1'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`API POST ${path} → ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`API PUT ${path} → ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

// ── Types (API response shapes) ───────────────────────────────────────────────

export interface APIKPIs {
  total_carteira: number
  recuperado_mes: number
  ptps_ativas: number
  sem_contato_d7: number
  tarefas_hoje: number
  taxa_recuperacao: number
}

export interface APIChartPoint {
  mes: string
  recuperado: number
  carteira: number
}

export interface APIStatusCarteira {
  status: string
  count: number
  total: number
}

export interface APIDividaListOut {
  id: number
  devedor_id: number
  credor_id: number
  valor_original: number
  valor_atualizado: number
  data_vencimento: string
  tipo: string
  status: string
  numero_contrato: string | null
  dias_sem_contato: number
  ultimo_contato: string | null
  acoes_recomendadas: string
  devedor_nome: string | null
  credor_nome: string | null
  devedor_tipo: string | null
}

export interface APIHistoricoContato {
  id: number
  divida_id: number
  data: string
  canal: string
  resultado: string
  operador_nome: string | null
}

export interface APIDividaOut extends APIDividaListOut {
  data_emissao: string
  created_at: string
  historico: APIHistoricoContato[]
}

export interface APIDevedor {
  id: number
  nome: string
  tipo: string
  cpf_cnpj: string
  telefones: string[]
  email: string | null
  score_spc: number | null
  perfil: string | null
  endereco: {
    logradouro: string | null
    numero: string | null
    complemento: string | null
    bairro: string | null
    cidade: string | null
    estado: string | null
    cep: string | null
  }
}

export interface APICredorOut {
  id: number
  razao_social: string
  cnpj: string
  pix_key: string | null
  contato_nome: string | null
  contato_email: string | null
  comissao_percentual: number
  limite_desconto: number
  ativo: boolean
  total_carteira: number
  total_recuperado: number
}

export interface APINegociacaoOut {
  id: number
  divida_id: number
  tipo: string
  status: string
  valor_original: number
  valor_oferta: number
  desconto_percentual: number | null
  numero_parcelas: number | null
  valor_parcela: number | null
  data_promessa: string | null
  data_conclusao: string | null
  responsavel_nome: string
  notas: string
  created_at: string
  updated_at: string
  devedor_nome: string | null
  devedor_tipo: string | null
  credor_nome: string | null
  divida_status: string | null
}

export interface APIRepasseOut {
  id: number
  credor_id: number
  valor_bruto: number
  comissao: number
  valor_liquido: number
  periodo: string
  status: string
  dividas_ids: string[]
  created_at: string
  executado_em: string | null
  credor_nome: string | null
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  kpis: () => get<APIKPIs>('/dashboard/kpis'),
  chart: () => get<APIChartPoint[]>('/dashboard/chart'),
  statusCarteira: () => get<APIStatusCarteira[]>('/dashboard/status-carteira'),
}

// ── Dividas ───────────────────────────────────────────────────────────────────

export const dividasApi = {
  list: (params?: { status?: string; credor_id?: number; devedor_id?: number }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.credor_id) qs.set('credor_id', String(params.credor_id))
    if (params?.devedor_id) qs.set('devedor_id', String(params.devedor_id))
    const q = qs.toString()
    return get<APIDividaListOut[]>(`/dividas${q ? `?${q}` : ''}`)
  },
  workQueue: () => get<APIDividaListOut[]>('/dividas/work-queue'),
  get: (id: number) => get<APIDividaOut>(`/dividas/${id}`),
  create: (body: unknown) => post<APIDividaOut>('/dividas', body),
  updateStatus: (id: number, body: { status: string; nota?: string; operador_nome?: string }) =>
    put<APIDividaOut>(`/dividas/${id}/status`, body),
  addHistorico: (id: number, body: { canal: string; resultado: string; operador_nome?: string }) =>
    post<APIHistoricoContato>(`/dividas/${id}/historico`, body),
}

// ── Devedores ─────────────────────────────────────────────────────────────────

export const devedoresApi = {
  list: (params?: { search?: string; perfil?: string }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.perfil) qs.set('perfil', params.perfil)
    const q = qs.toString()
    return get<APIDevedor[]>(`/devedores${q ? `?${q}` : ''}`)
  },
  get: (id: number) => get<APIDevedor>(`/devedores/${id}`),
  create: (body: unknown) => post<APIDevedor>('/devedores', body),
  update: (id: number, body: unknown) => put<APIDevedor>(`/devedores/${id}`, body),
}

// ── Credores ──────────────────────────────────────────────────────────────────

export const credoresApi = {
  list: () => get<APICredorOut[]>('/credores'),
  get: (id: number) => get<APICredorOut>(`/credores/${id}`),
  create: (body: unknown) => post<APICredorOut>('/credores', body),
  update: (id: number, body: unknown) => put<APICredorOut>(`/credores/${id}`, body),
}

// ── Negociações ───────────────────────────────────────────────────────────────

export const negociacoesApi = {
  list: (status?: string) => {
    const qs = status ? `?status=${status}` : ''
    return get<APINegociacaoOut[]>(`/negociacoes${qs}`)
  },
  get: (id: number) => get<APINegociacaoOut>(`/negociacoes/${id}`),
  create: (body: unknown) => post<APINegociacaoOut>('/negociacoes', body),
  update: (id: number, body: unknown) => put<APINegociacaoOut>(`/negociacoes/${id}`, body),
}

// ── Repasses ──────────────────────────────────────────────────────────────────

export const repassesApi = {
  list: (credor_id?: number) => {
    const qs = credor_id ? `?credor_id=${credor_id}` : ''
    return get<APIRepasseOut[]>(`/repasses${qs}`)
  },
  get: (id: number) => get<APIRepasseOut>(`/repasses/${id}`),
  create: (body: unknown) => post<APIRepasseOut>('/repasses', body),
  aprovar: (id: number) => put<APIRepasseOut>(`/repasses/${id}/aprovar`, {}),
  executar: (id: number) => put<APIRepasseOut>(`/repasses/${id}/executar`, {}),
}
