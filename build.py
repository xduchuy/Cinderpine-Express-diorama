from pathlib import Path
import base64
p=Path(__file__).parent
html=(p/'src/page.html').read_text()
fontcss=''
for name,file in [('Bevan',p/'assets/bevan.ttf'),('Hanken Grotesk',p/'assets/hanken.ttf')]:
    data=Path(file).read_bytes()
    fontcss+="@font-face{font-family:'"+name+"';src:url(data:font/ttf;base64,"+base64.b64encode(data).decode()+") format('truetype');font-weight:"+('400' if name=='Bevan' else '100 900')+";font-display:swap;}"
html=html.replace('/*__FONTS__*/',fontcss)
for key,file in [('CORE','core.js'),('PARK','park.js'),('RAIL','rail.js'),('AUDIO','audio.js'),('APP','app.js')]:
    html=html.replace('/*__'+key+'__*/',(p/'src'/file).read_text())
(p/'index.html').write_text(html)
(p/'dist/index.html').write_text(html)
(p/'dist/cinderpine-express.html').write_text(html)
print(f'Built {len(html):,} bytes; all scripts, fonts, and generated art inline, except three.js r128 CDN.')
