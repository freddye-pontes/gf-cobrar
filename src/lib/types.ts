export type TipoPessoa = 'PF' | 'PJ'

export type StatusDivida =
  | 'em_aberto'
  | 'em_negociacao'
  | 'ptp_ativa'
  | 'pago'
  | 'judicial'
  | 'encerrado'

export type TipoDivida = 'boleto' | 'contrato' | 'cartao' | 'servico'

export type PerfilDevedor = 'B2B' | 'varejo' | 'recorrente'

export type UrgenciaItem = 'alta' | 'media' | 'baixa'

export type StatusNegociacao = 'ativa' | 'concluida' | 'quebrada'

export type TipoNegociacao = 'desconto' | 'parcelamento' | 'ptp'

export type CanalContato = 'whatsapp' | 'email' | 'telefone' | 'sistema'

export type CadastroStatus = 'COMPLETO' | 'CADASTRO_INCOMPLETO'

export interface Endereco {
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
  cep: string
}

export interface HistoricoContato {
  id: string
  data: string
  canal: CanalContato
  resultado: string
  operadorNome?: string
}

export interface Devedor {
  id: string
  nome: string
  tipo: TipoPessoa
  cpfCnpj: string
  telefones: string[]
  email?: string
  endereco: Endereco
  scoreSpc?: number
  perfil: PerfilDevedor
  cadastroStatus: CadastroStatus
  createdAt: string
  updatedAt: string
}

export interface Divida {
  id: string
  devedorId: string
  credorId: string
  valorOriginal: number
  valorAtualizado: number
  dataVencimento: string
  dataEmissao: string
  tipo: TipoDivida
  status: StatusDivida
  numeroContrato?: string
  diasSemContato: number
  ultimoContato?: string
  acoesRecomendadas: string
  historico: HistoricoContato[]
  createdAt: string
}

export interface Credor {
  id: string
  razaoSocial: string
  cnpj: string
  pixKey: string
  contatoNome: string
  contatoEmail: string
  comissaoPercentual: number
  limiteDesconto: number
  totalCarteira: number
  totalRecuperado: number
  totalPendente: number
  ativo: boolean
  createdAt: string
}

export interface Negociacao {
  id: string
  dividaId: string
  devedorId: string
  credorId: string
  tipo: TipoNegociacao
  status: StatusNegociacao
  valorOriginal: number
  valorOferta: number
  descontoPercentual?: number
  numeroParcelas?: number
  valorParcela?: number
  dataPromessa?: string
  dataConclusao?: string
  responsavelNome: string
  notas: string
  createdAt: string
  updatedAt: string
}

export interface Repasse {
  id: string
  credorId: string
  valorBruto: number
  comissao: number
  valorLiquido: number
  periodo: string
  status: 'pendente' | 'aprovado' | 'executado'
  dividasIds: string[]
  createdAt: string
  executadoEm?: string
}

export interface WorkQueueItem {
  id: string
  divida: Divida
  devedor: Devedor
  credor: Credor
  prioridade: number
  urgencia: UrgenciaItem
  acaoRecomendada: string
  etiqueta: string
}

export interface KPIData {
  totalCarteira: number
  recuperadoMes: number
  ptpsAtivas: number
  semContatoD7: number
  tarefasHoje: number
  taxaRecuperacao: number
}

export interface ChartDataPoint {
  mes: string
  recuperado: number
  carteira: number
}
