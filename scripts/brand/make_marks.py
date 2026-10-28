"""Extrai o símbolo do dente do logotipo original (fundo azul-escuro) e gera versões recoloridas com transparência.

Uso: python -I scripts/brand/make_marks.py
Saída: scripts/brand/out/mark_*.png (insumos da página variants.html), o símbolo usado no sistema
(src/asset/brand/dental_flow_symbol.png) e os favicons em public/.
"""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2]
source = root / 'src' / 'asset' / 'brand' / 'dental_flow_logo.png'
out = Path(__file__).resolve().parent / 'out'
out.mkdir(exist_ok=True)

logo = Image.open(source).convert('RGB')
background = (1, 16, 31)
turquoise = (30, 216, 207)
reference = sum(abs(turquoise[i] - background[i]) for i in range(3))
noise = 24

# Recorte do dente: linhas acima do texto "DENTAL Flow" (o vão começa na linha 231).
tooth = logo.crop((0, 0, logo.width, 236))
pixels = tooth.load()
alpha = Image.new('L', tooth.size)
color = Image.new('RGB', tooth.size)
for y in range(tooth.height):
    for x in range(tooth.width):
        r, g, b = pixels[x, y]
        distance = abs(r - background[0]) + abs(g - background[1]) + abs(b - background[2])
        # Ignora o ruído de compressão do fundo (diferenças pequenas) antes de calcular a transparência.
        a = max(0.0, min(1.0, (distance - noise) / (reference - noise)))
        alpha.putpixel((x, y), round(a * 255))
        # Remove o fundo escuro misturado nas bordas para a cor original não ficar suja.
        if a > 0.02:
            color.putpixel((x, y), tuple(max(0, min(255, round((pixels[x, y][i] - background[i] * (1 - a)) / a))) for i in range(3)))
bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
alpha = alpha.crop(bbox)
color = color.crop(bbox)
pad = 12
size = (alpha.width + pad * 2, alpha.height + pad * 2)


def save(name, rgb_for):
    # O fundo transparente leva a própria cor para a reamostragem não escurecer as bordas.
    image = Image.new('RGBA', size, (*rgb_for(turquoise), 0))
    for y in range(alpha.height):
        for x in range(alpha.width):
            a = alpha.getpixel((x, y))
            if a:
                image.putpixel((x + pad, y + pad), (*rgb_for(color.getpixel((x, y))), a))
    # Versão 4x para ícones grandes, com reamostragem suave.
    image.resize((size[0] * 4, size[1] * 4), Image.LANCZOS).save(out / f'{name}.png')


save('mark_turquoise', lambda original: original)
save('mark_teal', lambda _: (13, 110, 102))
save('mark_white', lambda _: (255, 255, 255))
save('mark_ink', lambda _: (27, 37, 41))
save('mark_coral', lambda _: (232, 97, 60))

# Peças usadas no sistema (escolha de 28/10/2026): símbolo verde na barra e na tela Entrar (versão 1 da prancha)
# e ícone com o dente branco sobre verde como favicon (versão 3).
teal = (13, 110, 102)


def trimmed(name):
    image = Image.open(out / f'{name}.png')
    return image.crop(image.getbbox())


symbol = trimmed('mark_teal')
symbol.resize((round(symbol.width * 192 / symbol.height), 192), Image.LANCZOS).save(root / 'src' / 'asset' / 'brand' / 'dental_flow_symbol.png')


def icon(size, radius, mark_width=.6, supersample=4):
    big = size * supersample
    tile = Image.new('RGBA', (big, big), (*teal, 0))
    ImageDraw.Draw(tile).rounded_rectangle((0, 0, big - 1, big - 1), radius=radius * supersample, fill=(*teal, 255))
    mark = trimmed('mark_white')
    width = round(big * mark_width)
    mark = mark.resize((width, round(mark.height * width / mark.width)), Image.LANCZOS)
    tile.alpha_composite(mark, ((big - mark.width) // 2, (big - mark.height) // 2))
    return tile.resize((size, size), Image.LANCZOS)


icon(32, 7).save(root / 'public' / 'favicon-32.png')
icon(180, 0).save(root / 'public' / 'apple-touch-icon.png')
icon(512, 112).save(root / 'public' / 'favicon-512.png')
print('ok', size, '->', out)
