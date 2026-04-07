"""
Seed script — popula o banco com dados fictícios para demonstração.
Uso: python seed.py
"""
import os
import sys
from datetime import date, timedelta, datetime

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.models.credor import Credor
from app.models.devedor import Devedor
from app.models.divida import Divida, HistoricoContato
from app.models.negociacao import Negociacao
from app.models.repasse import Repasse

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)

TODAY = date.today()

def d(days_ago: int) -> date:
    return TODAY - timedelta(days=days_ago)


def run():
    with Session(engine) as db:
        # ── Limpar dados existentes ────────────────────────────────────────────
        print("Limpando dados existentes...")
        db.execute(text("TRUNCATE repasses, negociacoes, historico_contatos, dividas, devedores, credores RESTART IDENTITY CASCADE"))
        db.commit()

        # ── Credores ──────────────────────────────────────────────────────────
        print("Criando credores...")
        credores = [
            Credor(
                razao_social="Banco Meridional S.A.",
                cnpj="12.345.678/0001-90",
                pix_key="cobranca@meridional.com.br",
                contato_nome="Ana Paula Ferreira",
                contato_email="ana.ferreira@meridional.com.br",
                comissao_percentual=15.0,
                limite_desconto=30.0,
                ativo=True,
            ),
            Credor(
                razao_social="Financeira Agil Ltda.",
                cnpj="98.765.432/0001-10",
                pix_key="pagamentos@agil.com.br",
                contato_nome="Ricardo Moura",
                contato_email="r.moura@agil.com.br",
                comissao_percentual=18.0,
                limite_desconto=25.0,
                ativo=True,
            ),
            Credor(
                razao_social="Telecom Sul S.A.",
                cnpj="11.222.333/0001-44",
                pix_key="11.222.333/0001-44",
                contato_nome="Juliana Costa",
                contato_email="juliana.costa@telecomsul.com.br",
                comissao_percentual=12.0,
                limite_desconto=20.0,
                ativo=True,
            ),
            Credor(
                razao_social="Distribuidora Nordeste Ltda.",
                cnpj="55.666.777/0001-88",
                pix_key="55666777000188",
                contato_nome="Carlos Henrique Pinto",
                contato_email="carlos@distnordeste.com.br",
                comissao_percentual=20.0,
                limite_desconto=35.0,
                ativo=True,
            ),
        ]
        db.add_all(credores)
        db.flush()

        c_banco, c_agil, c_telecom, c_dist = credores

        # ── Devedores ─────────────────────────────────────────────────────────
        print("Criando devedores...")
        devedores = [
            Devedor(nome="Joao Carlos Almeida", tipo="PF", cpf_cnpj="123.456.789-00",
                    telefones=["(11) 98765-4321"], email="joao.almeida@gmail.com",
                    logradouro="Rua das Flores", numero="123", bairro="Centro",
                    cidade="Sao Paulo", estado="SP", cep="01001-000",
                    score_spc=320, perfil="varejo"),
            Devedor(nome="Maria Fernanda Silva", tipo="PF", cpf_cnpj="234.567.890-11",
                    telefones=["(21) 97654-3210"], email="mfsilva@hotmail.com",
                    logradouro="Av. Atlantica", numero="500", bairro="Copacabana",
                    cidade="Rio de Janeiro", estado="RJ", cep="22010-000",
                    score_spc=580, perfil="varejo"),
            Devedor(nome="Roberto Nascimento", tipo="PF", cpf_cnpj="345.678.901-22",
                    telefones=["(31) 96543-2109"], email=None,
                    logradouro="Rua dos Andradas", numero="88", bairro="Savassi",
                    cidade="Belo Horizonte", estado="MG", cep="30112-000",
                    score_spc=150, perfil="varejo"),
            Devedor(nome="Patricia Oliveira", tipo="PF", cpf_cnpj="456.789.012-33",
                    telefones=["(51) 95432-1098", "(51) 3333-4444"], email="patoliveira@yahoo.com.br",
                    logradouro="Av. Ipiranga", numero="1200", bairro="Floresta",
                    cidade="Porto Alegre", estado="RS", cep="90160-093",
                    score_spc=440, perfil="recorrente"),
            Devedor(nome="Andre Luis Pereira", tipo="PF", cpf_cnpj="567.890.123-44",
                    telefones=["(41) 94321-0987"], email="andre.pereira@gmail.com",
                    logradouro="Rua XV de Novembro", numero="350", bairro="Centro",
                    cidade="Curitiba", estado="PR", cep="80020-310",
                    score_spc=210, perfil="varejo"),
            Devedor(nome="TechSolve Sistemas Ltda.", tipo="PJ", cpf_cnpj="78.901.234/0001-55",
                    telefones=["(11) 3344-5566"], email="financeiro@techsolve.com.br",
                    logradouro="Av. Paulista", numero="1900", bairro="Bela Vista",
                    cidade="Sao Paulo", estado="SP", cep="01310-200",
                    score_spc=None, perfil="B2B"),
            Devedor(nome="Construtora Horizonte S.A.", tipo="PJ", cpf_cnpj="89.012.345/0001-66",
                    telefones=["(21) 2222-8888"], email="adm@horizonteconstrutora.com.br",
                    logradouro="Rua da Assembleia", numero="77", bairro="Centro",
                    cidade="Rio de Janeiro", estado="RJ", cep="20011-001",
                    score_spc=None, perfil="B2B"),
            Devedor(nome="Fernanda Melo", tipo="PF", cpf_cnpj="90.123.456-77",
                    telefones=["(85) 93210-9876"], email="fermelo@outlook.com",
                    logradouro="Rua do Sol", numero="45", bairro="Aldeota",
                    cidade="Fortaleza", estado="CE", cep="60135-112",
                    score_spc=670, perfil="varejo"),
            Devedor(nome="Lucas Tavares", tipo="PF", cpf_cnpj="01.234.567-88",
                    telefones=["(62) 92109-8765"], email=None,
                    logradouro="Av. Goias", numero="600", bairro="Setor Central",
                    cidade="Goiania", estado="GO", cep="74015-010",
                    score_spc=95, perfil="varejo"),
            Devedor(nome="Grupo Alimentos BH Ltda.", tipo="PJ", cpf_cnpj="12.345.678/0002-71",
                    telefones=["(31) 3456-7890"], email="contato@grupoalimentosbh.com.br",
                    logradouro="Av. Contorno", numero="3000", bairro="Funcionarios",
                    cidade="Belo Horizonte", estado="MG", cep="30110-130",
                    score_spc=None, perfil="B2B"),
            Devedor(nome="Camila Rocha", tipo="PF", cpf_cnpj="13.579.246-99",
                    telefones=["(11) 91234-5678"], email="camila.rocha@gmail.com",
                    logradouro="Rua Augusta", numero="2000", bairro="Consolacao",
                    cidade="Sao Paulo", estado="SP", cep="01305-100",
                    score_spc=390, perfil="recorrente"),
            Devedor(nome="Diego Santos", tipo="PF", cpf_cnpj="24.680.135-10",
                    telefones=["(71) 90987-6543"], email="dsantos@gmail.com",
                    logradouro="Av. Sete de Setembro", numero="150", bairro="Centro",
                    cidade="Salvador", estado="BA", cep="40060-001",
                    score_spc=510, perfil="varejo"),
        ]
        db.add_all(devedores)
        db.flush()

        d_joao, d_maria, d_roberto, d_patricia, d_andre, \
        d_tech, d_const, d_fernanda, d_lucas, d_grupo, \
        d_camila, d_diego = devedores

        # ── Dividas ───────────────────────────────────────────────────────────
        print("Criando dividas...")
        dividas = [
            Divida(devedor=d_joao, credor=c_banco, tipo="boleto",
                   valor_original=4500.00, valor_atualizado=5200.00,
                   data_emissao=d(365), data_vencimento=d(300),
                   status="em_aberto", dias_sem_contato=45,
                   ultimo_contato=d(45), acoes_recomendadas="Ligar - divida acima de R$5k",
                   numero_contrato="BOL-2025-0001"),
            Divida(devedor=d_maria, credor=c_agil, tipo="contrato",
                   valor_original=12000.00, valor_atualizado=13800.00,
                   data_emissao=d(180), data_vencimento=d(120),
                   status="em_negociacao", dias_sem_contato=2,
                   ultimo_contato=d(2), acoes_recomendadas="Aguardar retorno da negociacao",
                   numero_contrato="CTR-2025-0042"),
            Divida(devedor=d_roberto, credor=c_telecom, tipo="servico",
                   valor_original=890.00, valor_atualizado=1100.00,
                   data_emissao=d(540), data_vencimento=d(480),
                   status="judicial", dias_sem_contato=90,
                   ultimo_contato=d(90), acoes_recomendadas="Processo em andamento",
                   numero_contrato=None),
            Divida(devedor=d_patricia, credor=c_banco, tipo="cartao",
                   valor_original=7200.00, valor_atualizado=7200.00,
                   data_emissao=d(90), data_vencimento=d(60),
                   status="ptp_ativa", dias_sem_contato=1,
                   ultimo_contato=d(1), acoes_recomendadas="PTP - aguardar pagamento",
                   numero_contrato="CARTAO-2025-1188"),
            Divida(devedor=d_andre, credor=c_agil, tipo="boleto",
                   valor_original=2300.00, valor_atualizado=2300.00,
                   data_emissao=d(30), data_vencimento=d(15),
                   status="em_aberto", dias_sem_contato=15,
                   ultimo_contato=None, acoes_recomendadas="Primeira abordagem - WhatsApp",
                   numero_contrato="BOL-2026-0101"),
            Divida(devedor=d_tech, credor=c_dist, tipo="contrato",
                   valor_original=85000.00, valor_atualizado=92000.00,
                   data_emissao=d(200), data_vencimento=d(150),
                   status="em_aberto", dias_sem_contato=20,
                   ultimo_contato=d(20), acoes_recomendadas="Contato com financeiro - valor alto",
                   numero_contrato="CTR-B2B-2025-0007"),
            Divida(devedor=d_const, credor=c_banco, tipo="contrato",
                   valor_original=35000.00, valor_atualizado=35000.00,
                   data_emissao=d(400), data_vencimento=d(300),
                   status="pago", dias_sem_contato=0,
                   ultimo_contato=d(10), acoes_recomendadas="",
                   numero_contrato="CTR-2025-0015"),
            Divida(devedor=d_fernanda, credor=c_telecom, tipo="servico",
                   valor_original=450.00, valor_atualizado=480.00,
                   data_emissao=d(60), data_vencimento=d(45),
                   status="em_aberto", dias_sem_contato=8,
                   ultimo_contato=d(8), acoes_recomendadas="Retentar WhatsApp",
                   numero_contrato=None),
            Divida(devedor=d_lucas, credor=c_banco, tipo="boleto",
                   valor_original=1800.00, valor_atualizado=2100.00,
                   data_emissao=d(270), data_vencimento=d(240),
                   status="em_aberto", dias_sem_contato=60,
                   ultimo_contato=d(60), acoes_recomendadas="Urgente - 60 dias sem resposta",
                   numero_contrato="BOL-2025-0220"),
            Divida(devedor=d_grupo, credor=c_dist, tipo="contrato",
                   valor_original=120000.00, valor_atualizado=128000.00,
                   data_emissao=d(160), data_vencimento=d(100),
                   status="em_negociacao", dias_sem_contato=3,
                   ultimo_contato=d(3), acoes_recomendadas="Proposta de parcelamento enviada",
                   numero_contrato="CTR-B2B-2025-0012"),
            Divida(devedor=d_camila, credor=c_agil, tipo="cartao",
                   valor_original=3100.00, valor_atualizado=3400.00,
                   data_emissao=d(120), data_vencimento=d(90),
                   status="em_aberto", dias_sem_contato=12,
                   ultimo_contato=d(12), acoes_recomendadas="Perfil recorrente - oferecer desconto",
                   numero_contrato="CARTAO-2025-2299"),
            Divida(devedor=d_diego, credor=c_telecom, tipo="servico",
                   valor_original=620.00, valor_atualizado=620.00,
                   data_emissao=d(500), data_vencimento=d(460),
                   status="encerrado", dias_sem_contato=0,
                   ultimo_contato=d(30), acoes_recomendadas="",
                   numero_contrato=None),
            Divida(devedor=d_joao, credor=c_telecom, tipo="servico",
                   valor_original=320.00, valor_atualizado=350.00,
                   data_emissao=d(200), data_vencimento=d(170),
                   status="em_aberto", dias_sem_contato=25,
                   ultimo_contato=d(25), acoes_recomendadas="Agrupar contato com divida do Banco",
                   numero_contrato=None),
        ]
        # Insert one by one to get sequential ids before generating keys
        for dv in dividas:
            dv.chave_divida = "PLACEHOLDER"
            db.add(dv)
            db.flush()
            dv.chave_divida = f"GFD-{TODAY.strftime('%Y%m%d')}-{dv.id:06d}"
            db.flush()

        dv_joao_banco, dv_maria_agil, dv_roberto_tel, dv_patricia_banco, \
        dv_andre_agil, dv_tech_dist, dv_const_banco, dv_fernanda_tel, \
        dv_lucas_banco, dv_grupo_dist, dv_camila_agil, dv_diego_tel, \
        dv_joao_tel = dividas

        # ── Historico de Contatos ─────────────────────────────────────────────
        print("Criando historico de contatos...")
        historicos = [
            HistoricoContato(divida=dv_joao_banco, data=d(45), canal="whatsapp",
                             resultado="Mensagem enviada, sem resposta", operador_nome="Marcos Vinicius"),
            HistoricoContato(divida=dv_joao_banco, data=d(38), canal="telefone",
                             resultado="Telefone nao atendeu", operador_nome="Marcos Vinicius"),
            HistoricoContato(divida=dv_joao_banco, data=d(30), canal="whatsapp",
                             resultado="Mensagem lida, sem resposta", operador_nome="Fernanda Ops"),
            HistoricoContato(divida=dv_maria_agil, data=d(15), canal="whatsapp",
                             resultado="Devedor demonstrou interesse em negociar", operador_nome="Marcos Vinicius"),
            HistoricoContato(divida=dv_maria_agil, data=d(8), canal="telefone",
                             resultado="Cliente pediu proposta por e-mail", operador_nome="Marcos Vinicius"),
            HistoricoContato(divida=dv_maria_agil, data=d(2), canal="email",
                             resultado="Proposta de desconto de 20% enviada", operador_nome="Fernanda Ops"),
            HistoricoContato(divida=dv_patricia_banco, data=d(10), canal="telefone",
                             resultado="Prometeu pagar em 5 dias", operador_nome="Marcos Vinicius"),
            HistoricoContato(divida=dv_patricia_banco, data=d(1), canal="whatsapp",
                             resultado="Lembrete de vencimento enviado", operador_nome="Sistema"),
            HistoricoContato(divida=dv_const_banco, data=d(20), canal="telefone",
                             resultado="Negociacao concluida, acordo firmado", operador_nome="Fernanda Ops"),
            HistoricoContato(divida=dv_const_banco, data=d(10), canal="sistema",
                             resultado="Pagamento confirmado - R$ 35.000,00", operador_nome="Sistema"),
            HistoricoContato(divida=dv_lucas_banco, data=d(60), canal="whatsapp",
                             resultado="Mensagem enviada, sem leitura confirmada", operador_nome="Marcos Vinicius"),
            HistoricoContato(divida=dv_grupo_dist, data=d(20), canal="email",
                             resultado="Contato inicial enviado ao financeiro", operador_nome="Fernanda Ops"),
            HistoricoContato(divida=dv_grupo_dist, data=d(10), canal="telefone",
                             resultado="Gerente financeiro solicitou parcelamento em 6x", operador_nome="Fernanda Ops"),
            HistoricoContato(divida=dv_grupo_dist, data=d(3), canal="email",
                             resultado="Proposta de parcelamento em 6x enviada", operador_nome="Fernanda Ops"),
            HistoricoContato(divida=dv_roberto_tel, data=d(120), canal="telefone",
                             resultado="Sem resposta - encaminhado para juridico", operador_nome="Marcos Vinicius"),
            HistoricoContato(divida=dv_roberto_tel, data=d(90), canal="sistema",
                             resultado="Divida encaminhada para cobranca judicial", operador_nome="Sistema"),
        ]
        db.add_all(historicos)
        db.flush()

        # ── Negociacoes ───────────────────────────────────────────────────────
        print("Criando negociacoes...")
        negociacoes = [
            Negociacao(
                divida=dv_maria_agil, tipo="desconto", status="ativa",
                valor_original=13800.00, valor_oferta=11040.00,
                desconto_percentual=20.0, numero_parcelas=1, valor_parcela=11040.00,
                data_promessa=TODAY + timedelta(days=10), data_conclusao=None,
                responsavel_nome="Marcos Vinicius",
                notas="Desconto de 20% solicitado. Dentro do limite do credor (25%). Aguardando confirmacao.",
            ),
            Negociacao(
                divida=dv_patricia_banco, tipo="ptp", status="ativa",
                valor_original=7200.00, valor_oferta=7200.00,
                desconto_percentual=0.0, numero_parcelas=1, valor_parcela=7200.00,
                data_promessa=TODAY + timedelta(days=5), data_conclusao=None,
                responsavel_nome="Marcos Vinicius",
                notas="Promessa firme de pagamento integral.",
            ),
            Negociacao(
                divida=dv_const_banco, tipo="desconto", status="concluida",
                valor_original=35000.00, valor_oferta=31500.00,
                desconto_percentual=10.0, numero_parcelas=1, valor_parcela=31500.00,
                data_promessa=d(12), data_conclusao=d(10),
                responsavel_nome="Fernanda Ops",
                notas="Desconto de 10% concedido. Pagamento via PIX confirmado.",
            ),
            Negociacao(
                divida=dv_grupo_dist, tipo="parcelamento", status="ativa",
                valor_original=128000.00, valor_oferta=121600.00,
                desconto_percentual=5.0, numero_parcelas=6, valor_parcela=20266.67,
                data_promessa=TODAY + timedelta(days=15), data_conclusao=None,
                responsavel_nome="Fernanda Ops",
                notas="Parcelamento em 6x com 5% de desconto. Aguardando assinatura.",
            ),
        ]
        db.add_all(negociacoes)
        db.flush()

        # ── Repasses ──────────────────────────────────────────────────────────
        print("Criando repasses...")
        repasses = [
            Repasse(
                credor=c_banco,
                valor_bruto=31500.00,
                comissao=4725.00,
                valor_liquido=26775.00,
                periodo="Marco 2026",
                status="executado",
                dividas_ids=[str(dv_const_banco.id)],
                executado_em=datetime.now() - timedelta(days=8),
            ),
            Repasse(
                credor=c_agil,
                valor_bruto=0.00,
                comissao=0.00,
                valor_liquido=0.00,
                periodo="Abril 2026",
                status="pendente",
                dividas_ids=[],
            ),
        ]
        db.add_all(repasses)
        db.commit()

        print("\nSeed concluido!")
        print(f"  {len(credores)} credores")
        print(f"  {len(devedores)} devedores")
        print(f"  {len(dividas)} dividas")
        print(f"  {len(historicos)} registros de historico")
        print(f"  {len(negociacoes)} negociacoes")
        print(f"  {len(repasses)} repasses")


if __name__ == "__main__":
    run()
