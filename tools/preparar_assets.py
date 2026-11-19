"""
Prepara os assets do site a partir do acervo de marca (projeto de postagens).

  python tools/preparar_assets.py

Gera em site/assets/:
  fonts/  Inter 400/600/900 recortada para latim (WOFF)
  img/marca/  logos SVG oficiais (símbolo, horizontal, vertical)
  img/parceiros/  TKA, Masal, PHD Guindastes e NEXT Implementos (WebP)
  img/clientes/   15 logos do post "Quem já confia no nosso trabalho" (WebP)
  img/manutencao/  fotos reais da oficina em WebP (tamanho cheio + versão -sm)

Rodar de novo sempre que trocar uma foto: ele sobrescreve o que gerou.
"""
from pathlib import Path
import shutil

from fontTools import subset
from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parents[1]
SAIDA = RAIZ / "site" / "assets"
POSTS = Path(r"E:\app-antigravity\Criador de postagens\posts-project")
LOGO = POSTS / "hidraufitbarra" / "Logo"
FONTES = POSTS / "hidraufitmanutencao" / "gerador" / "fonts"
IMAGENS = POSTS / "hidraufitmanutencao" / "imagens"

# Latim básico + Latin-1 (acentos do português) + pontuação tipográfica
UNICODES = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,"
    "U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD"
)

FONTES_WEB = {
    "Inter-Regular.ttf": "inter-400.woff",
    "Inter-SemiBold.ttf": "inter-600.woff",
    "Inter-Black.ttf": "inter-900.woff",
}

LOGOS = {
    "simbolo/hidraufit-simbolo-verde-principal.svg": "simbolo-verde.svg",
    "simbolo/hidraufit-simbolo-branco.svg": "simbolo-branco.svg",
    "horizontal com servico/hidraufit-horizontal-branco.svg": "horizontal-branco.svg",
    "horizontal com servico/hidraufit-horizontal-padrao.svg": "horizontal-padrao.svg",
    "vertical/hidraufit-vertical-branco.svg": "vertical-branco.svg",
}

PARCEIROS = ["tka.png", "masal.png", "phd-guindastes.png", "next.png"]

# Mesma ordem do post "Quem já confia no nosso trabalho" (@hidraufitmanutencao)
CLIENTES = [
    "procelecorp.png", "brigada-militar.png", "grupo-bimbo.png", "eptc.jpg", "ellca.png",
    "equatorial-energia.png", "defesa-civil.png", "rodalog.png", "texian.png", "grupo-setup.png",
    "termolar.png", "exercito-brasileiro.png", "porto-beton.png", "planaterra.png", "g2l.png",
]

# Fotos reais enviadas pelo cliente (WhatsApp, 13/08/2026). Nada gerado por IA.
FOTOS = {
    "WhatsApp Image 2026-08-13 at 15.49.23.jpeg": "tornearia-tecnico",
    "WhatsApp Image 2026-08-13 at 15.49.21.jpeg": "tornearia",
    "WhatsApp Image 2026-08-13 at 15.49.20.jpeg": "cilindros-reforma",
    "WhatsApp Image 2026-08-13 at 15.48.56 (1).jpeg": "munck-oficina",
    "WhatsApp Image 2026-08-13 at 15.48.56.jpeg": "linha-viva",
    "WhatsApp Image 2026-08-13 at 15.49.23 (1).jpeg": "retroescavadeira-cilindros",
    "WhatsApp Image 2026-08-13 at 15.44.43 (1).jpeg": "tecnico-caminhao",
    "WhatsApp Image 2026-08-13 at 15.44.45 (2).jpeg": "fachada-oficina",
}


def fontes():
    destino = SAIDA / "fonts"
    destino.mkdir(parents=True, exist_ok=True)
    for origem, nome in FONTES_WEB.items():
        opts = subset.Options()
        opts.flavor = "woff"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        fonte = subset.load_font(str(FONTES / origem), opts)
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=subset.parse_unicodes(UNICODES))
        sub.subset(fonte)
        subset.save_font(fonte, str(destino / nome), opts)
        print(f"fonte  {nome:<18} {(destino / nome).stat().st_size // 1024} KB")


def logos():
    destino = SAIDA / "img" / "marca"
    destino.mkdir(parents=True, exist_ok=True)
    for origem, nome in LOGOS.items():
        shutil.copyfile(LOGO / origem, destino / nome)
        print(f"logo   {nome}")
    shutil.copyfile(LOGO / "simbolo/hidraufit-simbolo-verde-principal.svg", SAIDA / "favicon.svg")


def logo_web(origem, destino, caixa=(360, 180)):
    """Logo de terceiro em WebP com transparência, no máximo 360x180."""
    im = ImageOps.exif_transpose(Image.open(origem)).convert("RGBA")
    im.thumbnail(caixa, Image.LANCZOS)
    im.save(destino, "WEBP", quality=88, method=6)
    return im.size


def parceiros():
    destino = SAIDA / "img" / "parceiros"
    destino.mkdir(parents=True, exist_ok=True)
    for nome in PARCEIROS:
        arq = destino / (Path(nome).stem + ".webp")
        w, h = logo_web(IMAGENS / "Parceiros" / nome, arq)
        print(f"parc.  {arq.name:<28} {w}x{h}")


def clientes():
    destino = SAIDA / "img" / "clientes"
    destino.mkdir(parents=True, exist_ok=True)
    for nome in CLIENTES:
        arq = destino / (Path(nome).stem + ".webp")
        w, h = logo_web(IMAGENS / "Clientes" / nome, arq)
        print(f"client {arq.name:<28} {w}x{h}")


def fotos():
    destino = SAIDA / "img" / "manutencao"
    destino.mkdir(parents=True, exist_ok=True)
    for origem, nome in FOTOS.items():
        im = ImageOps.exif_transpose(Image.open(IMAGENS / "Fotos Servicos" / origem)).convert("RGB")
        for sufixo, lado in (("", 1280), ("-sm", 640)):
            copia = im.copy()
            copia.thumbnail((lado, lado), Image.LANCZOS)
            arquivo = destino / f"{nome}{sufixo}.webp"
            copia.save(arquivo, "WEBP", quality=78, method=6)
            print(f"foto   {arquivo.name:<36} {copia.width}x{copia.height}  {arquivo.stat().st_size // 1024} KB")


if __name__ == "__main__":
    fontes()
    logos()
    parceiros()
    clientes()
    fotos()
