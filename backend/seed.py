"""
Seed script — populates the database with mock data equivalent to the frontend mock-data.ts.
Run from backend/ directory:
    python seed.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from datetime import date
from app.database import SessionLocal
from app.models import Base, Credor, Devedor, Divida, HistoricoContato, Negociacao, Repasse
from app.database import engine

# ── Create tables (alternative to alembic for dev) ───────────────────────────
Base.metadata.create_all(bind=engine)

db = SessionLocal()

def run():
    # Guard: skip if already seeded
    if db.query(Credor).count() > 0:
        print("Database already seeded. Skipping.")
        return

    print("Seeding database...")

    # ── Credores ──────────────────────────────────────────────────────────────
    credores = [
        Credor(razao_social="Banco Meridional S.A.", cnpj="12.345.678/0001-90",
               pix_key="pix@bancomeridional.com.br", contato_nome="Carlos Eduardo Mendes",
               contato_email="c.mendes@meridional.com.br", comissao_percentual=15, limite_desconto=30),
        Credor(razao_social="Financeira Apex Ltda.", cnpj="98.765.432/0001-10",
               pix_key="financas@apexltda.com.br", contato_nome="Ana Beatriz Ferreira",
               contato_email="a.ferreira@apexltda.com.br", comissao_percentual=12, limite_desconto=25),
        Credor(razao_social="TeleCom Brasil S.A.", cnpj="45.678.901/0001-23",
               pix_key="repasses@telecom.com.br", contato_nome="Ricardo Silva",
               contato_email="r.silva@telecom.com.br", comissao_percentual=18, limite_desconto=20),
        Credor(razao_social="Varejo Plus Ltda.", cnpj="32.109.876/0001-54",
               pix_key="32109876000154", contato_nome="Mariana Oliveira",
               contato_email="m.oliveira@varejoplus.com.br", comissao_percentual=20, limite_desconto=35),
        Credor(razao_social="Construtora Viva S.A.", cnpj="67.890.123/0001-78",
               pix_key="67890123000178", contato_nome="Fábio Gonçalves",
               contato_email="f.goncalves@construtoraviva.com.br", comissao_percentual=10, limite_desconto=15),
    ]
    db.add_all(credores)
    db.flush()
    c1, c2, c3, c4, c5 = credores

    # ── Devedores ─────────────────────────────────────────────────────────────
    devedores = [
        Devedor(nome="João Carlos Ferreira", tipo="PF", cpf_cnpj="123.456.789-00",
                telefones=["(11) 98765-4321", "(11) 3456-7890"], email="joao.ferreira@email.com",
                logradouro="Rua das Acácias", numero="234", bairro="Vila Madalena",
                cidade="São Paulo", estado="SP", cep="05435-000", score_spc=320, perfil="varejo"),
        Devedor(nome="Distribuidora ABC Ltda.", tipo="PJ", cpf_cnpj="12.345.678/0001-99",
                telefones=["(11) 3333-4444", "(11) 99887-6655"], email="financeiro@distribuidoraabc.com.br",
                logradouro="Av. Industrial", numero="1500", complemento="Galpão 3",
                bairro="Distrito Industrial", cidade="Santo André", estado="SP", cep="09200-000",
                score_spc=180, perfil="B2B"),
        Devedor(nome="Maria Silva Santos", tipo="PF", cpf_cnpj="987.654.321-00",
                telefones=["(21) 97654-3210"], email="maria.santos@gmail.com",
                logradouro="Rua Gustavo Sampaio", numero="87", bairro="Leme",
                cidade="Rio de Janeiro", estado="RJ", cep="22010-010", score_spc=450, perfil="varejo"),
        Devedor(nome="Auto Peças Camargo Ltda.", tipo="PJ", cpf_cnpj="45.678.901/0001-23",
                telefones=["(19) 3222-5555", "(19) 99123-4567"], email="compras@autopecascamargo.com.br",
                logradouro="Rua Barão de Campinas", numero="890", bairro="Centro",
                cidade="Campinas", estado="SP", cep="13010-150", perfil="B2B"),
        Devedor(nome="Pedro Augusto Lima", tipo="PF", cpf_cnpj="456.789.012-34",
                telefones=["(51) 98888-1234"], email="pedro.lima@hotmail.com",
                logradouro="Av. Ipiranga", numero="2345", bairro="Azenha",
                cidade="Porto Alegre", estado="RS", cep="90160-093", score_spc=220, perfil="varejo"),
        Devedor(nome="Transportes Unidos Ltda.", tipo="PJ", cpf_cnpj="78.901.234/0001-56",
                telefones=["(11) 4444-5555", "(11) 99765-4321"], email="adm@transportesunidos.com.br",
                logradouro="Rod. Anhanguera", numero="Km 23", bairro="Polo Industrial",
                cidade="Jundiaí", estado="SP", cep="13212-000", score_spc=290, perfil="B2B"),
        Devedor(nome="Fernanda Costa Ribeiro", tipo="PF", cpf_cnpj="321.654.987-12",
                telefones=["(31) 98765-1234"], email="fernanda.costa@yahoo.com.br",
                logradouro="Rua dos Otoni", numero="321", bairro="Santa Efigênia",
                cidade="Belo Horizonte", estado="MG", cep="30150-270", score_spc=510, perfil="varejo"),
        Devedor(nome="Roberto Mendes Alves", tipo="PF", cpf_cnpj="654.321.098-76",
                telefones=["(11) 97654-9876", "(11) 2234-5678"], email="roberto.alves@empresa.com.br",
                logradouro="Rua Bela Cintra", numero="1100", complemento="Ap 82",
                bairro="Consolação", cidade="São Paulo", estado="SP", cep="01415-000", perfil="varejo"),
        Devedor(nome="Comércio Santos & Filhos Ltda.", tipo="PJ", cpf_cnpj="89.012.345/0001-67",
                telefones=["(85) 3456-7890", "(85) 99345-6789"], email="contato@santosefilhos.com.br",
                logradouro="Av. Barão de Studart", numero="456", bairro="Aldeota",
                cidade="Fortaleza", estado="CE", cep="60120-000", score_spc=150, perfil="B2B"),
        Devedor(nome="Ana Paula Rodrigues", tipo="PF", cpf_cnpj="789.012.345-67",
                telefones=["(41) 98901-2345"], email="ana.rodrigues@gmail.com",
                logradouro="Rua XV de Novembro", numero="789", bairro="Centro",
                cidade="Curitiba", estado="PR", cep="80020-310", score_spc=380, perfil="varejo"),
    ]
    db.add_all(devedores)
    db.flush()
    d1, d2, d3, d4, d5, d6, d7, d8, d9, d10 = devedores

    # ── Dívidas ───────────────────────────────────────────────────────────────
    dividas = [
        Divida(devedor=d1, credor=c1, valor_original=45000, valor_atualizado=51750,
               data_vencimento=date(2025, 11, 15), data_emissao=date(2025, 10, 15),
               tipo="contrato", status="ptp_ativa", numero_contrato="CT-2025-0891",
               dias_sem_contato=3, ultimo_contato=date(2026, 3, 28),
               acoes_recomendadas="PTP vence amanhã — confirmar pagamento por WhatsApp"),
        Divida(devedor=d2, credor=c1, valor_original=250000, valor_atualizado=282500,
               data_vencimento=date(2025, 9, 30), data_emissao=date(2025, 8, 1),
               tipo="contrato", status="em_negociacao", numero_contrato="CT-2025-0445",
               dias_sem_contato=2, ultimo_contato=date(2026, 3, 29),
               acoes_recomendadas="Em negociação ativa — aguardar proposta do cliente"),
        Divida(devedor=d3, credor=c3, valor_original=8500, valor_atualizado=9180,
               data_vencimento=date(2025, 12, 1), data_emissao=date(2025, 11, 1),
               tipo="servico", status="em_aberto", dias_sem_contato=15,
               ultimo_contato=date(2026, 3, 16),
               acoes_recomendadas="Sem contato há 15 dias — ligar agora com urgência"),
        Divida(devedor=d4, credor=c4, valor_original=85000, valor_atualizado=97750,
               data_vencimento=date(2025, 10, 15), data_emissao=date(2025, 9, 1),
               tipo="boleto", status="judicial", numero_contrato="FAT-2025-3301",
               dias_sem_contato=45, ultimo_contato=date(2026, 2, 14),
               acoes_recomendadas="Encaminhado para judicial — aguardar retorno jurídico"),
        Divida(devedor=d5, credor=c2, valor_original=12300, valor_atualizado=13530,
               data_vencimento=date(2026, 1, 20), data_emissao=date(2025, 12, 20),
               tipo="boleto", status="em_aberto", dias_sem_contato=1,
               ultimo_contato=date(2026, 3, 30),
               acoes_recomendadas="Primeiro contato D+1 — enviar WhatsApp amigável"),
        Divida(devedor=d6, credor=c1, valor_original=180000, valor_atualizado=207000,
               data_vencimento=date(2025, 8, 31), data_emissao=date(2025, 7, 1),
               tipo="contrato", status="em_negociacao", numero_contrato="CT-2025-0223",
               dias_sem_contato=3, ultimo_contato=date(2026, 3, 28),
               acoes_recomendadas="Proposta de parcelamento enviada — aguardar aprovação interna"),
        Divida(devedor=d7, credor=c3, valor_original=3200, valor_atualizado=3456,
               data_vencimento=date(2026, 2, 28), data_emissao=date(2026, 1, 28),
               tipo="servico", status="pago", dias_sem_contato=0,
               ultimo_contato=date(2026, 3, 31),
               acoes_recomendadas="Pagamento confirmado — calcular repasse ao credor"),
        Divida(devedor=d8, credor=c5, valor_original=67800, valor_atualizado=74580,
               data_vencimento=date(2025, 7, 15), data_emissao=date(2025, 6, 1),
               tipo="contrato", status="em_aberto", numero_contrato="CV-2025-1102",
               dias_sem_contato=8, ultimo_contato=date(2026, 3, 23),
               acoes_recomendadas="D+7 ultrapassado — ligar com urgência alta"),
        Divida(devedor=d9, credor=c1, valor_original=42000, valor_atualizado=46200,
               data_vencimento=date(2025, 12, 31), data_emissao=date(2025, 11, 1),
               tipo="boleto", status="em_aberto", dias_sem_contato=0,
               ultimo_contato=date(2026, 3, 31),
               acoes_recomendadas="Importado hoje — agendar primeiro contato para amanhã"),
        Divida(devedor=d10, credor=c2, valor_original=5600, valor_atualizado=6160,
               data_vencimento=date(2026, 2, 10), data_emissao=date(2026, 1, 10),
               tipo="cartao", status="ptp_ativa", dias_sem_contato=1,
               ultimo_contato=date(2026, 3, 30),
               acoes_recomendadas="PTP para HOJE — confirmar pagamento imediatamente"),
    ]
    db.add_all(dividas)
    db.flush()
    dv1, dv2, dv3, dv4, dv5, dv6, dv7, dv8, dv9, dv10 = dividas

    # ── Histórico ─────────────────────────────────────────────────────────────
    historicos = [
        # div 1 — PTP ativa
        HistoricoContato(divida=dv1, data=date(2026,1,6), canal="sistema", resultado="Dívida importada via CSV"),
        HistoricoContato(divida=dv1, data=date(2026,1,7), canal="whatsapp", resultado="Mensagem inicial enviada — sem resposta", operador_nome="Sistema"),
        HistoricoContato(divida=dv1, data=date(2026,1,10), canal="whatsapp", resultado="Segundo contato — sem resposta", operador_nome="Sistema"),
        HistoricoContato(divida=dv1, data=date(2026,1,14), canal="telefone", resultado="Contato estabelecido — prometeu pagar até 01/04", operador_nome="Marcos Vinicius"),
        HistoricoContato(divida=dv1, data=date(2026,3,28), canal="whatsapp", resultado="Lembrete de PTP enviado automaticamente", operador_nome="Sistema"),
        # div 3 — sem contato há 15 dias
        HistoricoContato(divida=dv3, data=date(2026,2,1), canal="sistema", resultado="Dívida importada"),
        HistoricoContato(divida=dv3, data=date(2026,2,2), canal="whatsapp", resultado="Mensagem enviada — possível número inválido"),
        HistoricoContato(divida=dv3, data=date(2026,3,10), canal="email", resultado="E-mail enviado — sem retorno"),
        HistoricoContato(divida=dv3, data=date(2026,3,16), canal="telefone", resultado="Não atendeu — tentado 3x", operador_nome="Juliana Almeida"),
        # div 7 — pago
        HistoricoContato(divida=dv7, data=date(2026,2,20), canal="sistema", resultado="Dívida importada"),
        HistoricoContato(divida=dv7, data=date(2026,2,21), canal="whatsapp", resultado="Mensagem de cobrança enviada"),
        HistoricoContato(divida=dv7, data=date(2026,2,22), canal="whatsapp", resultado="Cliente respondeu — confirma pagamento em breve"),
        HistoricoContato(divida=dv7, data=date(2026,3,31), canal="sistema", resultado="Pagamento PIX confirmado — R$ 3.456,00 recebido"),
        # div 10 — PTP hoje
        HistoricoContato(divida=dv10, data=date(2026,2,10), canal="sistema", resultado="Dívida importada"),
        HistoricoContato(divida=dv10, data=date(2026,2,11), canal="whatsapp", resultado="Mensagem de cobrança enviada"),
        HistoricoContato(divida=dv10, data=date(2026,2,14), canal="telefone", resultado="PTP firmada para 31/03 — desconto de 9% aprovado", operador_nome="Juliana Almeida"),
        HistoricoContato(divida=dv10, data=date(2026,3,30), canal="whatsapp", resultado="Lembrete de PTP enviado — aguarda confirmação de pagamento"),
    ]
    db.add_all(historicos)

    # ── Negociações ───────────────────────────────────────────────────────────
    negociacoes = [
        Negociacao(divida=dv2, tipo="parcelamento", status="ativa",
                   valor_original=282500, valor_oferta=253000, desconto_percentual=10.4,
                   numero_parcelas=12, valor_parcela=21083.33,
                   responsavel_nome="Marcos Vinicius",
                   notas="Empresa alega fluxo de caixa comprometido. 12x com 10% de desconto. Credor aprovado. Aguardando assinatura."),
        Negociacao(divida=dv6, tipo="parcelamento", status="ativa",
                   valor_original=207000, valor_oferta=186300, desconto_percentual=10,
                   numero_parcelas=18, valor_parcela=10350,
                   responsavel_nome="Carla Souza",
                   notas="Sazonalidade impacta caixa. 18x com 10% desconto aprovado pelo credor."),
        Negociacao(divida=dv1, tipo="ptp", status="ativa",
                   valor_original=51750, valor_oferta=51750,
                   data_promessa=date(2026, 4, 1),
                   responsavel_nome="Marcos Vinicius",
                   notas="Pagamento integral prometido para 01/04. Sem desconto concedido."),
        Negociacao(divida=dv10, tipo="ptp", status="ativa",
                   valor_original=6160, valor_oferta=5600, desconto_percentual=9.1,
                   data_promessa=date(2026, 3, 31),
                   responsavel_nome="Juliana Almeida",
                   notas="Desconto 9% para pagamento à vista em 31/03. PTP firmada por telefone."),
        Negociacao(divida=dv7, tipo="desconto", status="concluida",
                   valor_original=3456, valor_oferta=3456,
                   data_conclusao=date(2026, 3, 31),
                   responsavel_nome="Juliana Almeida",
                   notas="Pagamento à vista integral. Dívida encerrada. Repasse pendente."),
    ]
    db.add_all(negociacoes)

    # ── Repasses ──────────────────────────────────────────────────────────────
    from datetime import datetime as dt
    repasses = [
        Repasse(credor=c1, valor_bruto=68000, comissao=10200, valor_liquido=57800,
                periodo="Março 2026 — Semana 1", status="executado",
                dividas_ids=[], executado_em=dt(2026, 3, 8)),
        Repasse(credor=c3, valor_bruto=3456, comissao=621.08, valor_liquido=2834.92,
                periodo="Março 2026 — Semana 4", status="pendente",
                dividas_ids=[str(dv7.id)]),
        Repasse(credor=c2, valor_bruto=42000, comissao=5040, valor_liquido=36960,
                periodo="Fevereiro 2026", status="aprovado", dividas_ids=[]),
        Repasse(credor=c5, valor_bruto=145000, comissao=14500, valor_liquido=130500,
                periodo="Janeiro 2026", status="executado",
                dividas_ids=[], executado_em=dt(2026, 2, 3)),
    ]
    db.add_all(repasses)

    db.commit()
    print(f"✓ {len(credores)} credores")
    print(f"✓ {len(devedores)} devedores")
    print(f"✓ {len(dividas)} dívidas")
    print(f"✓ {len(historicos)} registros de histórico")
    print(f"✓ {len(negociacoes)} negociações")
    print(f"✓ {len(repasses)} repasses")
    print("Seed concluído com sucesso!")


if __name__ == "__main__":
    try:
        run()
    finally:
        db.close()
