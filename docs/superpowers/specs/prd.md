# Sistema de Gestão de Cobrança — Design Spec

**Data:** 2026-03-31
**Status:** Em revisão

---

## 1. Objetivo

Construir uma plataforma web de gestão de cobrança para uso interno de uma assessoria que presta serviços para múltiplos credores. O sistema deve resolver dois problemas centrais da operação atual:

1. **Falta de visibilidade** — não há controle consolidado de status, histórico de contatos e resultado por dívida
2. **Falta de controle sobre credores** — difícil reportar resultados, calcular comissões e executar repasses de forma confiável

---

## 2. Contexto

- **Modelo de negócio:** Assessoria de cobrança B2B — a empresa presta serviço para múltiplos credores e recebe comissão sobre o valor recuperado
- **Canais de cobrança:** WhatsApp, ligação telefônica e e-mail
- **Automação:** WhatsApp começa semi-automático (templates + disparo manual) e evolui para automação total (régua + chatbot)
- **Entrada de dados:** Mista — planilhas CSV/Excel, integração via API com sistemas dos credores, e entrada manual
- **Equipe:** Operadores de cobrança + gestores que acompanham por credor

---

## 3. Abordagem Técnica

**Aplicação web customizada** — escolhida por permitir total controle do fluxo, escalar sem limitações de plataformas terceiras e suportar automação completa de WhatsApp.

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Backend API | Python + FastAPI | Performático, ecossistema rico para automações e integrações |
| Banco de dados | PostgreSQL | Relacional, confiável, suporta consultas complexas de carteira |
| Frontend | Next.js (React) | SSR para dashboard rápido, fácil de separar portal do credor |
| WhatsApp | Evolution API (self-hosted) | Open-source, sem custo por mensagem, suporta automação total |
| E-mail | SMTP / SendGrid | Envio de cobranças e relatórios para credores |
| Enriquecimento | Serasa / SPC (API) | Score de crédito e dados para priorização da carteira |
| Pagamentos | PIX (banco via API) | Confirmação de pagamentos e execução de repasses |

---

## 4. Módulos do Sistema

### 4.1 Carteira de Devedores

Repositório central de todas as dívidas. Cada dívida está vinculada a um devedor e a um credor.

**Entidade Devedor:**
- Nome completo / Razão social
- CPF / CNPJ + Tipo de pessoa (PF / PJ)
- Telefones (principal e secundários)
- E-mail
- Endereço completo (com CEP)
- Score de crédito (enriquecimento via Serasa/SPC)
- Perfil (B2B, varejo, recorrente)
- Histórico de pagamento

**Entidade Dívida:**
- ID único
- Valor original e valor atualizado
- Data de vencimento e data de emissão
- Tipo (boleto, contrato, cartão, serviço)
- Status: `em_aberto` | `em_negociacao` | `ptp_ativa` | `pago` | `judicial` | `encerrado`
- Número do contrato / fatura
- Documento comprobatório (PDF/imagem)
- Termos (juros, multa, encargos)
- Credor vinculado + comissão aplicável

**Importação de carteiras:**
- Upload de CSV/Excel com mapeamento de colunas
- Webhook para integração com sistemas dos credores via API
- Entrada manual pelo operador

---

### 4.2 Régua de Cobrança

Define o fluxo automático de tentativas de contato para cada dívida. Cada credor pode ter sua própria régua.

**Fluxo padrão:**

| Dia | Ação | Canal |
|---|---|---|
| D+0 | Dívida importada | — |
| D+1 | Primeiro contato | WhatsApp (template amigável) |
| D+3 | Segundo contato | WhatsApp + E-mail (com boleto/link) |
| D+7 | Terceiro contato | Ligação — entra na fila do operador |
| D+30+ | Escalonamento | Notificação extrajudicial / encaminhamento judicial |

**Adaptação por resposta do devedor:**

| Resposta | Comportamento do sistema |
|---|---|
| Promessa de pagamento (PTP) | Fluxo pausado → lembrete no dia combinado → confirma pagamento |
| Quer negociar | Encaminha para operador → abre módulo de negociação |
| Sem contato / recusa | Tenta telefones alternativos → escalonamento automático |
| Pagamento confirmado | Dívida encerrada → calcula comissão → agenda repasse |

**Configuração por credor:**
- Cada credor define seu próprio fluxo (dias, canais, tom da mensagem)
- Configuração via painel administrativo — sem alteração de código

---

### 4.3 Multicanal

**WhatsApp (Evolution API):**
- Fase 1: Templates pré-aprovados, operador aciona manualmente
- Fase 2: Disparo automático por régua, com fluxo de resposta (chatbot básico para capturar intenção)

**E-mail:**
- Templates HTML por tipo de dívida e momento da régua
- Anexo de boleto ou link de pagamento
- Rastreamento de abertura (opcional)

**Ligação:**
- Sem discagem automática na fase inicial
- Operador vê fila priorizada de quem ligar
- Registra resultado diretamente na tela: sem contato | PTP | negociação | recusa | pagamento

---

### 4.4 Negociação

Módulo acionado quando o devedor demonstra intenção de negociar.

- Registro de ofertas feitas
- Parcelamentos: número de parcelas, valor, vencimentos
- Descontos aplicados (dentro de limites definidos pelo credor)
- Promessas de pagamento (PTP): data, valor, responsável
- Histórico completo da negociação por dívida

---

### 4.5 Gestão de Credores & Repasses

**Cadastro do credor:**
- Razão social + CNPJ
- Conta bancária para repasse (PIX)
- Contato responsável
- Régua de cobrança exclusiva
- Percentual de comissão (pode variar por tipo de dívida)

**Ciclo de repasse (MVP: semi-manual / Pós-MVP: automático):**
1. Pagamento confirmado → sistema calcula: valor bruto − comissão = valor de repasse
2. Agrupa repasses do período (semanal ou mensal, configurável)
3. **MVP:** gestor revisa lote e executa repasse manualmente; sistema gera comprovante
4. **Pós-MVP:** execução automática via PIX sem intervenção manual
5. Relatório enviado ao credor por e-mail após cada repasse

**Portal do credor (acesso externo):**
- Login isolado — cada credor vê apenas sua carteira
- Dashboard: total em carteira, % recuperado, status por dívida
- Histórico de repasses e comprovantes
- Sem acesso a dados de outros credores

---

### 4.6 Dashboard Operacional

Tela principal dos operadores — resolve o problema de visibilidade.

**KPIs no topo:**
- Total em carteira (R$)
- Valor recuperado no mês (R$)
- PTPs ativas
- Devedores sem contato há 7+ dias
- Tarefas do dia

**Fila de trabalho priorizada:**
- Sistema define automaticamente a ordem de prioridade (PTP vencendo hoje > sem contato D7 > negociando > etc.)
- Cada item mostra: devedor, valor, credor, status atual, ação recomendada
- Operador registra resultado sem sair da fila

**Filtros rápidos:**
- Por status, credor, canal, faixa de valor, prazo sem contato

---

## 5. Regras de Negócio

- Um devedor pode ter múltiplas dívidas, inclusive com credores diferentes
- A régua de cobrança é pausada automaticamente quando há PTP ativa
- Descontos em negociação só podem ser aplicados dentro do limite definido pelo credor
- Repasses só são executados após confirmação de pagamento (não por promessa)
- O portal do credor é somente leitura — credores não alteram dados
- Dados de devedores seguem LGPD: acesso por perfil, sem exportação irrestrita

---

## 6. Integrações Externas

| Integração | Finalidade | Prioridade |
|---|---|---|
| Evolution API | WhatsApp automático | MVP |
| SMTP / SendGrid | Envios de e-mail | MVP |
| PIX (banco via API) | Confirmação e repasse | MVP |
| Serasa / SPC | Score e enriquecimento | Pós-MVP |
| API de credores | Importação automática de carteiras | Pós-MVP |

---

## 7. MVP vs. Pós-MVP

**MVP (lançamento):**
- Importação manual de carteiras (CSV)
- Régua de cobrança com disparo semi-automático de WhatsApp
- Dashboard operacional com fila priorizada
- Módulo de negociação e PTP
- Gestão de credores com cálculo de comissão manual
- Portal do credor (leitura)

**Pós-MVP:**
- Automação total da régua (disparo sem intervenção do operador)
- Chatbot WhatsApp para capturar intenção do devedor
- Integração via API com sistemas dos credores
- Enriquecimento automático via Serasa/SPC
- Execução automática de repasses via PIX

---

## 8. Critérios de Sucesso

- Operador sabe exatamente o que fazer ao abrir o sistema (fila priorizada)
- Zero contato duplicado no mesmo dia para o mesmo devedor
- Credor consegue ver o status da carteira sem precisar ligar para a assessoria
- Relatório de repasse gerado sem trabalho manual
