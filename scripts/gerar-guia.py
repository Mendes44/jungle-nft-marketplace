"""Gera o guia técnico em PDF a partir do texto revisado e dos resultados reais da validação."""
from pathlib import Path
import json
import re
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image

raiz = Path(__file__).resolve().parent.parent
saida = raiz / 'output/pdf/guia-tecnico-kurio.pdf'
saida.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('TextoKurio', 'C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('TextoKurioNegrito', 'C:/Windows/Fonts/segoeuib.ttf'))
pdfmetrics.registerFontFamily('TextoKurio', normal='TextoKurio', bold='TextoKurioNegrito')
cobre = colors.HexColor('#a55c26')
tinta = colors.HexColor('#241811')
cinza = colors.HexColor('#63564c')
estilos = {
    'titulo': ParagraphStyle('titulo', fontName='TextoKurioNegrito', fontSize=34, leading=40, textColor=tinta, spaceAfter=20),
    'secao': ParagraphStyle('secao', fontName='TextoKurioNegrito', fontSize=18, leading=23, textColor=cobre, spaceBefore=18, spaceAfter=13, keepWithNext=True),
    'corpo': ParagraphStyle('corpo', fontName='TextoKurio', fontSize=10.3, leading=15.2, textColor=tinta, spaceAfter=10, alignment=TA_LEFT),
    'pequeno': ParagraphStyle('pequeno', fontName='TextoKurio', fontSize=8.5, leading=12, textColor=cinza, spaceAfter=8),
    'chamada': ParagraphStyle('chamada', fontName='TextoKurioNegrito', fontSize=12, leading=17, textColor=cobre, spaceAfter=15),
}

def paragrafo(texto, estilo='corpo'):
    """Escapa conteúdo externo aos comandos de formatação para preservar texto e acentuação."""
    return Paragraph(escape(texto), estilos[estilo])

def decorarPagina(tela, documento):
    """Mantém identidade, margens e paginação constantes sem interferir no conteúdo fluido."""
    tela.saveState()
    tela.setStrokeColor(colors.HexColor('#ddc8b4'))
    tela.line(48, A4[1] - 42, A4[0] - 48, A4[1] - 42)
    tela.setFont('TextoKurioNegrito', 8)
    tela.setFillColor(cobre)
    tela.drawString(48, A4[1] - 31, 'KURIO / GUIA TÉCNICO')
    tela.setFont('TextoKurio', 8)
    tela.setFillColor(cinza)
    tela.drawString(48, 29, 'Marketplace de NFTs | Demonstração com API simulada')
    tela.drawRightString(A4[0] - 48, 29, str(documento.page))
    tela.restoreState()

def tabela(dados, larguras):
    """Aplica contraste e espaçamento consistentes às tabelas de evidências."""
    celulas = [[paragrafo(str(celula), 'pequeno') for celula in linha] for linha in dados]
    resultado = Table(celulas, colWidths=larguras, repeatRows=1, hAlign='LEFT')
    resultado.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#eadbc9')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEBELOW', (0, 0), (-1, 0), .8, cobre),
        ('LINEBELOW', (0, 1), (-1, -1), .3, colors.HexColor('#ded5cd')),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return resultado

conteudo = [Spacer(1, 48), paragrafo('ARTE DIGITAL. CONSISTÊNCIA TÉCNICA.', 'chamada'), paragrafo('Por dentro da\nsolução Kurio'.replace('\n', ' '), 'titulo')]
conteudo += [paragrafo('Arquitetura, regras de negócio e roteiro para a entrevista.'), Spacer(1, 20)]
imagem = raiz / 'assets/originais/colecao-0.png'
if imagem.exists():
    arte = Image(str(imagem), width=230, height=178)
    arte.hAlign = 'LEFT'
    conteudo += [arte, Spacer(1, 24)]
conteudo += [paragrafo('Este guia acompanha o código e suas evidências. Use-o para explicar decisões e demonstrar comportamentos observáveis, incluindo falhas e limites reais.'), paragrafo('Stack: React, TypeScript, TanStack Router, TanStack Query, Axios, Socket.IO, Tailwind CSS, shadcn/ui, MSW, Playwright e Lighthouse.', 'pequeno'), PageBreak()]

texto = (raiz / 'docs/guia-entrevista.md').read_text(encoding='utf-8-sig')
secoes = re.split(r'^## ', texto, flags=re.MULTILINE)[1:]
for indice, secao in enumerate(secoes):
    if indice and indice % 2 == 0:
        conteudo.append(PageBreak())
    titulo, corpo = secao.split('\n', 1)
    conteudo.append(paragrafo(titulo.strip(), 'secao'))
    for trecho in re.split(r'\n\s*\n', corpo.strip()):
        conteudo.append(paragrafo(' '.join(trecho.split())))

conteudo += [PageBreak(), paragrafo('11. Evidências da entrega', 'secao')]
conteudo.append(paragrafo('Aplicação: https://kurio-jungle.vercel.app', 'pequeno'))
conteudo.append(paragrafo('Repositório: https://github.com/Mendes44/jungle-nft-marketplace', 'pequeno'))
arquivoTestes = raiz / 'relatorios/playwright/resultados.json'
if arquivoTestes.exists():
    execucao = json.loads(arquivoTestes.read_text(encoding='utf-8-sig'))
    estatisticas = execucao.get('stats', {})
    conteudo.append(paragrafo(f"Última execução Playwright: {estatisticas.get('expected', 0)} testes aprovados, {estatisticas.get('unexpected', 0)} falhas inesperadas, {estatisticas.get('flaky', 0)} instáveis e {estatisticas.get('skipped', 0)} ignorados."))
    conteudo.append(paragrafo('Consulte o relatório HTML para o nome de cada cenário, duração e projeto desktop/mobile. As baselines são da aplicação; não provam comparação integral com o Figma.', 'pequeno'))
arquivoTestesPublicos = raiz / 'relatorios/publicacao/resultados.json'
if arquivoTestesPublicos.exists():
    execucaoPublica = json.loads(arquivoTestesPublicos.read_text(encoding='utf-8-sig'))
    estatisticasPublicas = execucaoPublica.get('stats', {})
    conteudo.append(paragrafo(f"Na URL pública: {estatisticasPublicas.get('expected', 0)} testes aprovados, {estatisticasPublicas.get('unexpected', 0)} falhas inesperadas. Relatório em relatorios/publicacao/playwright-html/."))
arquivoAuditoria = raiz / 'relatorios/lighthouse/resumo.json'
if arquivoAuditoria.exists():
    auditoria = json.loads(arquivoAuditoria.read_text(encoding='utf-8-sig'))
    dados = [['Página / perfil', 'Perf.', 'Acess.', 'Boas prát.', 'SEO']]
    metricas = [['Página / perfil', 'LCP (ms)', 'CLS', 'TBT (ms)']]
    for resultado in auditoria['resultados']:
        medidas = resultado['medianas']
        nome = f"{resultado['pagina']} / {resultado['perfil']}"
        dados.append([nome, medidas['performance'], medidas['accessibility'], medidas['best-practices'], medidas['seo']])
        metricas.append([nome, round(medidas['lcp']), f"{medidas['cls']:.4f}", round(medidas['tbt'])])
    conteudo += [paragrafo('Lighthouse: medianas de três medições por página e perfil.', 'chamada'), tabela(dados, [170, 65, 65, 100, 65]), Spacer(1, 18), tabela(metricas, [190, 100, 85, 90]), Spacer(1, 15)]
    ambiente = auditoria['ambiente']
    conteudo.append(paragrafo(f"Ambiente: {ambiente['plataforma']} {ambiente['versao']}; {ambiente['processador']}; {ambiente['memoriaGB']} GB; Node {ambiente['node']}. Lighthouse {auditoria['resultados'][0]['medicoes'][0]['versao']}.", 'pequeno'))
    conteudo.append(paragrafo(ambiente['condicoes'], 'pequeno'))

conteudo += [paragrafo('O que consultar durante a avaliação', 'secao')]
conteudo.append(tabela([
    ['Material', 'Finalidade'],
    ['README.md', 'Instalar, executar e reproduzir cenários e falhas.'],
    ['ARCHITECTURE.md', 'Sessão, precisão, concorrência, cache, eventos e limites.'],
    ['docs/contratos.md', 'Campos, endpoints, status e eventos versionados.'],
    ['docs/matriz-requisitos.md', 'Rastrear cada requisito e sua evidência.'],
    ['docs/validacao.md', 'Resultados, URLs verificadas e pendências.'],
    ['playwright-report/index.html', 'Relatório da suíte e evidências associadas.'],
    ['relatorios/lighthouse/', 'Relatórios individuais e medianas reproduzíveis.'],
], [180, 285]))
conteudo += [Spacer(1, 12), paragrafo('Referência visual: os 15 frames foram renderizados e revisados, e os quatro retratos originais estão incluídos. A fonte exata permanece sem confirmação: o Figma expõe a variável font/family. IBM Plex Mono é a substituição local; diferenças de composição estão documentadas em ARCHITECTURE.md.', 'pequeno')]
documento = SimpleDocTemplate(str(saida), pagesize=A4, rightMargin=48, leftMargin=48, topMargin=60, bottomMargin=52, title='Kurio - Guia técnico e entrevista', author='', subject='Arquitetura e validação do marketplace de NFTs')
documento.build(conteudo, onFirstPage=decorarPagina, onLaterPages=decorarPagina)
print(saida)
