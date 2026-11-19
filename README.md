# Site · Grupo Hidraufit

Site estático (HTML, CSS e JS puros, sem build). A pasta `site/` é a raiz que vai para a hospedagem.

## Como ver

Abra `site/manutencao/index.html` direto no navegador. Para testar como no servidor:

```
python -m http.server 8000 -d site
```

e acesse http://localhost:8000/manutencao/

## Publicar (GitHub Pages)

Cada `git push` na branch `main` publica a pasta `site/` sozinho, pelo
[workflow](.github/workflows/publicar-site.yml). No GitHub: Settings → Pages → Source: **GitHub Actions**.
`site/index.html` é provisório e leva para `/manutencao/` até a Home existir.
A pasta `MARCA/` fica fora do repositório (`.gitignore`).

## Estrutura

```
site/
├── manutencao/index.html     landing da HidrauFit Manutenção  ✅ fase 1
├── assets/
│   ├── css/base.css          tokens da marca + cabeçalho, rodapé, botões (todas as páginas)
│   ├── css/manutencao.css    seções da landing
│   ├── js/site.js            menu do celular, cabeçalho, entrada suave, carrossel de clientes, ano
│   ├── js/hero-hidraulico.js máquinas animadas do topo: Munck, Linha Viva, Guindaste,
│   │                         Retroescavadeira, Empilhadeira e Caminhão de lixo (SVG puro).
│   │                         Conferência: ?maq=guindaste&fase=0.4 congela um quadro.
│   ├── fonts/                Inter 400/600/900 recortada (gerada)
│   └── img/                  logos, parceiros e fotos (gerados)
tools/preparar_assets.py      gera fonts/ e img/ a partir do acervo de postagens
MARCA/                        resumo da marca
```

Fonte, logos e fotos vêm de `E:\app-antigravity\Criador de postagens\posts-project\`.
Trocou ou acrescentou foto? Edite o dicionário `FOTOS` em `tools/preparar_assets.py` e rode:

```
python tools/preparar_assets.py
```

## Regras de marca que o código já segue

- Verde secundário `#61AD1A` nunca é texto sobre fundo claro; sobre ele o texto é preto.
- Cabeçalho usa o **símbolo** (o lockup horizontal exige 600 px). No rodapé o lockup horizontal
  entra a 600 px e, no celular, troca pelo vertical.
- Só fotos reais da oficina. As imagens geradas por IA do acervo ficam de fora.
- Sem prazo, preço, garantia ou "24h" que o cliente não tenha confirmado. Sem travessão no texto.
- Parceiros: TKA, Masal, PHD Guindastes e NEXT Implementos. Sem "autorizada" ou "chancela"
  para PHD e NEXT enquanto o tipo de vínculo não for confirmado.
- Clientes: os 15 logos do post "Quem já confia no nosso trabalho", na mesma ordem.

## Mapa do site

Fase 1: Home · Quem somos · **Manutenção (feito)** · Mangueiras e Conexões · Unidades · Contato.
Fase 2: uma página por serviço em `/manutencao/<servico>/`.

Os links para `../mangueiras-e-conexoes/` já estão na página e vão funcionar quando ela existir.
