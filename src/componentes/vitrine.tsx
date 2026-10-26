/** Composição editorial e elementos gráficos conferidos nos frames originais do desafio. */
import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Dialogo } from './comuns';

/** Renderiza o vetor exportado da referência sem substituir seus traços por outro conjunto. */
export function IconeOriginal({
  nome,
  tamanho = 24,
}: {
  nome:
    | 'busca'
    | 'carrinho'
    | 'entrar'
    | 'fechar'
    | 'busca-mobile'
    | 'filtros'
    | 'inicio'
    | 'favoritos'
    | 'sacola'
    | 'perfil'
    | 'digitalizar';
  tamanho?: number;
}) {
  return (
    <img
      className="icone-original"
      src={`/icones/${nome}.svg`}
      width={tamanho}
      height={tamanho}
      alt=""
      aria-hidden="true"
    />
  );
}

/** Ações editoriais explicam seu contexto sem simular integrações ausentes. */
export function AcaoEditorial({ texto, descricao }: { texto: string; descricao?: string }) {
  return (
    <Dialogo
      titulo={texto}
      descricao="Kurio — arte e cultura digital"
      gatilho={<button type="button">{texto}</button>}
    >
      <p>
        {descricao ??
          'Esta seção editorial não faz parte dos fluxos da demonstração. Explore as coleções, gerencie sua conta e acompanhe suas compras pelo menu.'}
      </p>
    </Dialogo>
  );
}

/** O destaque compartilha tipografia, recorte e versões de texto do desktop e do mobile. */
export function DestaquePrincipal() {
  const [indice, definirIndice] = useState(0);
  const [automatico, definirAutomatico] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [interagindo, definirInteragindo] = useState(false);
  useEffect(() => {
    if (!automatico || interagindo) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) definirIndice((atual) => (atual + 1) % 3);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [automatico, interagindo, indice]);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const destaques = [
    { id: '1', imagem: 0, nome: 'Emerald Ape #042' },
    { id: '2', imagem: 1, nome: 'Sage Nomad #009' },
    { id: '6', imagem: 2, nome: 'Ivory Baron #088' },
  ];
  const destaque = destaques[indice];
  function navegar(passo: number) {
    definirIndice((atual) => (atual + passo + destaques.length) % destaques.length);
  }
  return (
    <section
      className="hero"
      aria-label="Destaques da coleção"
      aria-roledescription="carrossel"
      onFocusCapture={() => definirInteragindo(true)}
      onBlurCapture={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget)) definirInteragindo(false);
      }}
      onKeyDown={(evento) => {
        if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
          evento.preventDefault();
          navegar(evento.key === 'ArrowRight' ? 1 : -1);
        }
      }}
      onTouchStart={(evento) => {
        const primeiro = evento.touches[0];
        toque.current = { x: primeiro.clientX, y: primeiro.clientY };
      }}
      onTouchEnd={(evento) => {
        const ultimo = evento.changedTouches[0];
        const inicio = toque.current;
        toque.current = null;
        if (!inicio) return;
        const dx = ultimo.clientX - inicio.x;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(ultimo.clientY - inicio.y))
          navegar(dx < 0 ? 1 : -1);
      }}
    >
      <div>
        <p className="sobretitulo">Bem-vindo à Kurio</p>
        <h1>
          <span className="texto-desktop">
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL
          </span>
          <span className="texto-mobile">
            SEJA DONO DA
            <br />
            CULTURA DIGITAL
          </span>
        </h1>
        <p className="descricao">
          <span className="texto-desktop">
            Descubra NFTs selecionados de criadores emergentes e consagrados. <br />
            Colecione arte digital rara, apoie artistas e tenha uma parte da <br />
            cultura da internet.
          </span>
          <span className="texto-mobile">
            Descubra NFTs selecionados de criadores do mundo todo.
          </span>
        </p>
        <a className="botao-explorar" href="#catalogo">
          EXPLORAR <ArrowRight className="texto-mobile" size={17} aria-hidden="true" />
        </a>
        <div className="indicadores-hero" aria-label="Navegação dos destaques">
          <button type="button" aria-label="Destaque anterior" onClick={() => navegar(-1)}>
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          {destaques.map((item, posicao) => (
            <button
              type="button"
              key={item.id}
              className="indicador-hero"
              aria-label={`Mostrar destaque ${posicao + 1}`}
              aria-pressed={posicao === indice}
              onClick={() => definirIndice(posicao)}
            >
              <i />
            </button>
          ))}
          <button type="button" aria-label="Próximo destaque" onClick={() => navegar(1)}>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={automatico ? 'Pausar carrossel' : 'Reproduzir carrossel'}
            onClick={() => {
              definirAutomatico(!automatico);
              definirInteragindo(false);
            }}
          >
            {automatico ? (
              <Pause size={14} aria-hidden="true" />
            ) : (
              <Play size={14} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <Link
        className="hero-arte"
        to="/nft/$nftId"
        params={{ nftId: destaque.id }}
        aria-label={`Conhecer ${destaque.nome}`}
      >
        <img
          src={`/imagens/colecao-${destaque.imagem}.webp`}
          alt={destaque.nome}
          width="450"
          height="450"
          fetchPriority="high"
        />
        <img
          className="arte-secundaria"
          src={`/imagens/colecao-${destaques[(indice + 1) % destaques.length].imagem}.webp`}
          alt=""
          width="72"
          height="72"
        />
      </Link>
    </section>
  );
}

/** Blocos da página inicial preservam as seções e o conteúdo editorial do arquivo de referência. */
export function ConteudoEditorial() {
  const artigos = [
    [
      '2',
      '12 de setembro',
      '6 min',
      'Como funciona a propriedade de NFTs',
      'Aprenda a colecionar, negociar e verificar ativos digitais.',
    ],
    [
      '0',
      '13 de setembro',
      '2 min',
      '10 artistas digitais para acompanhar',
      'Conheça criadores que moldam a cultura digital.',
    ],
    [
      '1',
      '15 de setembro',
      '3 min',
      'Raridade, atributos e procedência',
      'Entenda raridade, procedência, direitos autorais e utilidade.',
    ],
    [
      '3',
      '15 de setembro',
      '2 min',
      'Como proteger sua carteira',
      'Proteja sua carteira, seus ativos e sua identidade.',
    ],
  ];
  return (
    <div className="conteudo-editorial">
      <section className="promocoes" aria-label="Coleções em destaque">
        <article>
          <img src="/imagens/colecao-0.webp" alt="Emerald Ape" width="286" height="250" />
          <div>
            <h2>
              Lançamentos gênesis
              <br />
              de edição limitada
            </h2>
            <p>
              Colecione edições escassas
              <br />
              diretamente dos criadores antes
              <br />
              da revelação pública.
            </p>
            <Link to="/nft/$nftId" params={{ nftId: '1' }}>
              Explorar <ArrowRight size={14} />
            </Link>
          </div>
        </article>
        <article>
          <img src="/imagens/colecao-2.webp" alt="Ivory Baron" width="286" height="250" />
          <div>
            <h2>
              Arte digital selecionada
              <br />e muito mais
            </h2>
            <p>
              Explore novos artistas,
              <br />
              coleções verificadas e obras
              <br />
              digitais que definem a<br />
              cultura.
            </p>
            <Link to="/nft/$nftId" params={{ nftId: '6' }}>
              Explorar <ArrowRight size={14} />
            </Link>
          </div>
        </article>
      </section>
      <section className="diario">
        <h2>Diário da Cunhagem</h2>
        <p>
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
        <div className="grade-artigos">
          {artigos.map(([imagem, data, tempo, titulo, resumo]) => (
            <article key={titulo}>
              <img
                src={`/imagens/colecao-${imagem}.webp`}
                alt=""
                width="268"
                height="270"
                loading="lazy"
              />
              <div>
                <small>
                  {data} | Leitura de {tempo}
                </small>
                <h3>{titulo}</h3>
                <p>{resumo}</p>
                <AcaoEditorial texto="Ler mais →" descricao={resumo} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Rodapé fiel à hierarquia original, com destinos funcionais e ações auxiliares explícitas. */
export function RodapeOriginal() {
  const beneficios = [
    [
      'W',
      'Segurança da carteira',
      'Proteja sua carteira e colecione arte digital verificada com confiança.',
    ],
    [
      'C',
      'Criadores em destaque',
      'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
    ],
    [
      'D',
      'Alertas de lançamentos',
      'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
    ],
  ];
  return (
    <>
      <div className="beneficios">
        {beneficios.map(([letra, titulo, texto]) => (
          <div key={letra}>
            <span className="emblema-beneficio" aria-hidden="true">
              {letra}
            </span>
            <h2>{titulo}</h2>
            <p>{texto}</p>
          </div>
        ))}
        <div className="novidades">
          <h2>
            Antecipe-se ao próximo
            <br />
            lançamento
          </h2>
          <form onSubmit={(evento) => evento.preventDefault()}>
            <label className="sr-only" htmlFor="email-novidades">
              E-mail para novidades
            </label>
            <input id="email-novidades" type="email" placeholder="digite seu e-mail..." />
            <Dialogo
              titulo="Novidades Kurio"
              descricao="Assinatura indisponível nesta demonstração"
              gatilho={<button type="button">Enviar</button>}
            >
              <p>
                O envio de newsletters não está ativo. Nenhum endereço é enviado ou cadastrado por
                esta demonstração.
              </p>
            </Dialogo>
          </form>
          <p>Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
        </div>
      </div>
      <div className="rodape-final">
        <Link className="marca" to="/">
          KURIO
        </Link>
        <p>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <span>contato@email.com</span>
        <span>+55 11 4002 8922</span>
      </div>
      <div className="links-rodape">
        <div>
          <h2>Meu perfil</h2>
          <Link to="/perfil">Meu perfil</Link>
          <Link to="/pedidos">Minha coleção</Link>
          <Link to="/pedidos">Atividade</Link>
          <AcaoEditorial texto="Estúdio do criador" />
          <AcaoEditorial texto="Lista de interesse" />
        </div>
        <div>
          <h2>Central de ajuda</h2>
          {[
            'Central de ajuda',
            'Como comprar NFTs',
            'Carteira e segurança',
            'Política do mercado',
            'Denunciar item',
          ].map((texto) => (
            <AcaoEditorial key={texto} texto={texto} />
          ))}
        </div>
        <div>
          <h2>Coleções</h2>
          {['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'].map((categoria) => (
            <a key={categoria} href={`/?categoria=${encodeURIComponent(categoria)}#catalogo`}>
              {categoria}
            </a>
          ))}
        </div>
        <div>
          <h2>Redes sociais</h2>
          <div className="redes-sociais">
            {[
              { nome: 'Facebook', icone: 'facebook' },
              { nome: 'Instagram', icone: 'instagram' },
              { nome: 'Twitter', icone: 'twitter' },
              { nome: 'LinkedIn', icone: 'linkedin' },
              { nome: 'YouTube', icone: 'youtube' },
            ].map(({ nome, icone: icone }) => (
              <Dialogo
                key={nome}
                titulo={nome}
                descricao="Canal externo da referência visual"
                gatilho={
                  <button type="button" aria-label={nome}>
                    <img src={`/icones/rede-${icone}.svg`} alt="" width="24" height="24" />
                  </button>
                }
              >
                <p>Esta demonstração não possui um canal oficial nesta rede social.</p>
              </Dialogo>
            ))}
          </div>
          <h2>Carteiras compatíveis</h2>
          <span className="marcas-carteiras">METAMASK · WALLETCONNECT · COINBASE</span>
        </div>
      </div>
      <p className="direitos">© 2026 Kurio. Propriedade digital para todos.</p>
    </>
  );
}
