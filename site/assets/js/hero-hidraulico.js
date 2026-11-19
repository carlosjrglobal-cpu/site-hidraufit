/* ============================================================
   HERO · sistemas hidráulicos animados (SVG + JS puro, sem biblioteca)

   Seis máquinas: Munck, Linha Viva, Guindaste, Retroescavadeira,
   Empilhadeira e Caminhão de lixo. Cada uma é uma "receita":
     corpos      peças rígidas presas por pinos (ou deslizando, na telescópica)
     atuadores   cilindros entre dois pontos, ou motor hidráulico (guincho)
     unidade     reservatório, bomba e comando
     K           poses do ciclo de trabalho, interpoladas suavemente
   O motor calcula a cinemática, redimensiona cada cilindro (camisa, pistão,
   haste) e faz o óleo correr no sentido real: pressão do comando para a
   câmara que empurra, retorno da outra câmara para o reservatório.

   URL de conferência: ?maq=munck&fase=0.4 congela uma máquina num quadro.
   prefers-reduced-motion: quadros parados; os botões trocam a máquina.
   ============================================================ */
(function () {
  'use strict';
  const host = document.querySelector('[data-hidraulico]');
  if (!host) return;

  const NS = 'http://www.w3.org/2000/svg';
  const reduz = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const busca = new URLSearchParams(location.search);
  const faseFixa = busca.has('fase') ? parseFloat(busca.get('fase')) : null;
  const maqUrl = busca.get('maq');

  /* ---------- cores (tokens da marca) ---------- */
  const OLEO = '#61AD1A';
  const BRILHO = '#dff0c6';
  const ACO = 'rgba(255,255,255,.075)';
  const LINHA = 'rgba(255,255,255,.72)';
  const LINHA2 = 'rgba(255,255,255,.28)';
  const ESCURO = '#02290b';
  const CHAO = 470;
  const ATR_ACO = { fill: ACO, stroke: LINHA, 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };

  /* ---------- utilitários ---------- */
  const el = (tag, attrs, pai) => {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (pai) pai.appendChild(e);
    return e;
  };
  const rad = (d) => d * Math.PI / 180;
  const dirv = (a) => [Math.cos(rad(a)), -Math.sin(rad(a))];
  const cimav = (a) => [-Math.sin(rad(a)), -Math.cos(rad(a))];
  const em = (p, a, d, o) => {
    const u = dirv(a), n = cimav(a);
    return [p[0] + u[0] * d + n[0] * o, p[1] + u[1] * d + n[1] * o];
  };
  const dist = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
  const angTela = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const f1 = (n) => (Math.round(n * 10) / 10).toString();
  const curva = (p) => {
    let d = `M${f1(p[0][0])},${f1(p[0][1])}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], a = p[i], b = p[i + 1], p3 = p[i + 2] || b;
      d += ` C${f1(a[0] + (b[0] - p0[0]) / 6)},${f1(a[1] + (b[1] - p0[1]) / 6)}`
         + ` ${f1(b[0] - (p3[0] - a[0]) / 6)},${f1(b[1] - (p3[1] - a[1]) / 6)}`
         + ` ${f1(b[0])},${f1(b[1])}`;
    }
    return d;
  };
  const suave = (f) => { f = clamp((f - 0.12) / 0.76, 0, 1); return f * f * (3 - 2 * f); };
  const caminho = (g, d, extra) => el('path', Object.assign({ d }, extra || {}), g);

  /* ---------- peças de desenho reaproveitadas ---------- */
  const roda = (g, x, r, cy) => {
    cy = cy || CHAO - r;
    el('circle', { cx: x, cy, r }, g);
    el('circle', { cx: x, cy, r: r - 6, fill: 'none', stroke: LINHA2, 'stroke-dasharray': '3 3' }, g);
    el('circle', { cx: x, cy, r: r * 0.36, fill: 'rgba(0,0,0,.25)' }, g);
  };
  // caminhão virado para a esquerda: cabine em x0..x0+112, chassi até x1
  const caminhao = (g, x0, x1, rodas) => {
    el('rect', { x: x0, y: 404, width: x1 - x0, height: 14, rx: 3 }, g);
    caminho(g, `M${x0 + 4},404 V332 Q${x0 + 4},314 ${x0 + 22},308 L${x0 + 70},300 H${x0 + 110} V404 Z`);
    caminho(g, `M${x0 + 22},320 L${x0 + 66},313 H${x0 + 98} V350 H${x0 + 22} Z`, { fill: 'rgba(255,255,255,.04)', stroke: LINHA2 });
    el('rect', { x: x0 - 6, y: 384, width: 16, height: 26, rx: 3 }, g);
    caminho(g, `M${x0 + 60},356 H${x0 + 96}`, { stroke: LINHA2 });
    rodas.forEach((x) => roda(g, x, 28));
  };

  /* ============================================================
     MÁQUINAS
     coordenadas de corpo: d ao longo da peça, o para "cima" dela;
     no desenho local o eixo y aponta para baixo (y = -o).
     ============================================================ */
  const MAQUINAS = [];

  /* ---------- 1 · MUNCK ---------- */
  MAQUINAS.push({
    id: 'munck', nome: 'Munck', titulo: 'Sistema hidráulico de um Munck (guindaste articulado)', ciclo: 12,
    K: [[20, -39, 81], [24, -32, 76], [50, -66, 39], [50, -70, 43], [50, -66, 39], [24, -32, 76]],
    fundo(g) {
      caminhao(g, 40, 650, [100, 520, 586]);
      el('rect', { x: 250, y: 378, width: 400, height: 26, rx: 2 }, g);
      caminho(g, 'M250,386 H650 M330,378 V404 M410,378 V404 M490,378 V404 M570,378 V404', { stroke: LINHA2 });
      caminho(g, 'M187,404 V300 Q187,286 205,286 Q223,286 223,300 V404 Z');          // coluna
      el('rect', { x: 176, y: 396, width: 60, height: 10, rx: 2 }, g);
      el('rect', { x: 232, y: 404, width: 12, height: 54 }, g);                     // patola
      el('rect', { x: 224, y: 458, width: 28, height: 8, rx: 2 }, g);
      caminho(g, 'M226,374 H240 V398 H226', {});                                    // suporte do cilindro
    },
    corpos: [
      { id: 'ext', pai: 'l2', em: (p) => [20 + p[2], 0], ang: () => 0, z: 24, pino: false,
        d: 'M0,-7 H150 V7 H0Z M142,-9 H156 V9 H142Z' },
      { id: 'l1', pai: null, em: [205, 292], ang: (p) => p[0], z: 20,
        d: 'M-16,-12 Q-22,0 -16,12 L198,10 Q214,8 214,0 Q214,-8 198,-10Z M70,10 L74,24 L88,24 L92,10 M62,-10 L66,-28 L78,-28 L82,-10' },
      { id: 'l2', pai: 'l1', em: [210, 0], ang: (p) => p[1], z: 30,
        d: 'M-44,-6 Q-46,-15 -36,-15 L170,-11 V11 L-30,12 Q-46,10 -44,-6Z' },
    ],
    atuadores: [
      { base: [230, 388], haste: ['l1', 80, -18], w: 24, rw: 10, z: 12, via: [[268, 326]] },
      { base: ['l1', 70, 24], haste: ['l2', -34, 14], w: 20, rw: 8, z: 36, via: [[274, 318], ['l1', 6, 20], ['l1', 46, 24]] },
      { base: ['l2', 12, 0], haste: ['ext', 112, 0], w: 12, rw: 5, z: 34, via: [[280, 314], ['l1', 6, 12], ['l1', 120, 14], ['l1', 204, 16], ['l2', -4, 16]] },
    ],
    unidade: { tanque: [300, 420], bomba: [172, 442], valvula: [250, 336] },
    extra: {
      criar(g) {
        return {
          cabo: el('path', { stroke: 'rgba(255,255,255,.75)', 'stroke-width': 1.6, fill: 'none' }, g),
          carga: (() => {
            const c = el('g', {}, g);
            caminho(c, 'M0,0 V8 M-3,8 Q-6,16 0,18 Q6,16 4,12', { fill: 'none', stroke: LINHA, 'stroke-width': 2 });
            caminho(c, 'M0,18 L-26,32 M0,18 L26,32', { stroke: LINHA2, 'stroke-width': 1.4 });
            el('rect', { x: -32, y: 32, width: 64, height: 6, fill: ACO, stroke: LINHA, 'stroke-width': 1.4 }, c);
            el('rect', { x: -28, y: 38, width: 26, height: 20, fill: 'url(#hx-hach)', stroke: LINHA, 'stroke-width': 1.2 }, c);
            el('rect', { x: 2, y: 38, width: 26, height: 20, fill: 'url(#hx-hach)', stroke: LINHA, 'stroke-width': 1.2 }, c);
            return c;
          })(),
        };
      },
      atualizar(s, api) {
        const ponta = api.ponto(['ext', 153, 0]), y = ponta[1] + 110;
        s.cabo.setAttribute('d', `M${f1(ponta[0])},${f1(ponta[1])} V${f1(y)}`);
        s.carga.setAttribute('transform', `translate(${f1(ponta[0])},${f1(y)})`);
      },
    },
    rotulos: [
      { t: 'Cilindros hidráulicos', x: 748, y: 36, a: 'end', alvo: (api) => api.meio(1) },
      { t: 'Mangueiras de alta pressão', x: 12, y: 36, alvo: (api) => api.ponto(['l1', 46, 24]) },
      { t: 'Bomba e comando', x: 186, y: 524, alvo: (api) => api.bomba() },
    ],
  });

  /* ---------- 2 · LINHA VIVA ---------- */
  MAQUINAS.push({
    id: 'linha-viva', nome: 'Linha Viva', titulo: 'Sistema hidráulico de um caminhão de Linha Viva com cesto isolado', ciclo: 11,
    K: [[10, 155], [30, 40], [40, -5], [40, -5], [30, 40]],
    fundo(g) {
      // poste e rede
      el('rect', { x: 712, y: 46, width: 14, height: 424 }, g);
      el('rect', { x: 672, y: 76, width: 88, height: 8 }, g);
      caminho(g, 'M686,76 V66 M748,76 V66', { 'stroke-width': 5 });
      caminho(g, 'M540,64 Q610,74 686,66 M686,66 Q724,70 760,64', { fill: 'none', stroke: LINHA2, 'stroke-width': 1.4 });
      caminho(g, 'M520,48 Q620,60 760,50', { fill: 'none', stroke: LINHA2, 'stroke-width': 1.4 });
      caminhao(g, 40, 600, [100, 480, 546]);
      el('rect', { x: 200, y: 336, width: 400, height: 68, rx: 4 }, g);             // carroceria de ferramentas
      caminho(g, 'M300,336 V404 M500,336 V404 M220,370 H280 M520,370 H580', { stroke: LINHA2 });
      el('rect', { x: 376, y: 318, width: 48, height: 18, rx: 3 }, g);              // pedestal giratório
      caminho(g, 'M362,336 H438', { 'stroke-width': 3 });
    },
    corpos: [
      { id: 'b1', pai: null, em: [400, 318], ang: (p) => p[0], z: 20,
        d: 'M-14,-11 Q-20,0 -14,11 L172,9 Q184,0 172,-9Z M52,9 L56,22 L68,22 L72,9 M102,-9 L106,-24 L118,-24 L122,-9' },
      { id: 'b2', pai: 'b1', em: [180, 0], ang: (p) => p[1], z: 30,
        d(g) {
          caminho(g, 'M-36,-8 Q-40,0 -36,8 L166,7 Q172,0 166,-7Z M-34,-8 L-32,-18 L-22,-18 L-20,-8');
          el('rect', { x: 62, y: -6, width: 86, height: 12, fill: 'url(#hx-hach)', stroke: 'none' }, g);   // trecho isolado
        } },
      { id: 'cesto', pai: 'b2', em: [170, 0], ang: () => 0, abs: true, z: 34, pino: true,
        d: 'M0,0 V12 M-30,12 H30 L27,62 H-27Z M-30,24 H30' },
    ],
    atuadores: [
      { base: [392, 372], haste: ['b1', 60, -14], w: 22, rw: 9, z: 12, via: [[330, 340]] },
      { base: ['b1', 110, 18], haste: ['b2', -28, 12], w: 18, rw: 8, z: 36, via: [[340, 330], ['b1', 4, 18], ['b1', 60, 20]] },
    ],
    unidade: { tanque: [212, 420], bomba: [172, 442], valvula: [306, 352] },
    rotulos: [
      { t: 'Cilindros hidráulicos', x: 12, y: 36, alvo: (api) => api.meio(1) },
      { t: 'Bomba e comando', x: 186, y: 524, alvo: (api) => api.bomba() },
    ],
  });

  /* ---------- 3 · GUINDASTE ---------- */
  MAQUINAS.push({
    id: 'guindaste', nome: 'Guindaste', titulo: 'Sistema hidráulico de um guindaste telescópico', ciclo: 13,
    K: [[40, 60, 404], [40, 60, 300], [58, 80, 300], [58, 80, 404], [58, 80, 300], [40, 60, 300]],
    fundo(g) {
      caminhao(g, 40, 520, [100, 380, 446]);
      caminho(g, 'M300,404 V352 L320,336 H440 L516,372 V404Z');                   // superestrutura
      caminho(g, 'M312,336 V296 Q312,288 320,288 H354 L362,336Z');                 // cabine do operador
      caminho(g, 'M318,300 H350 L354,326 H318Z', { fill: 'rgba(255,255,255,.04)', stroke: LINHA2 });
      [176, 480].forEach((x) => {                                                  // patolas
        el('rect', { x: x - 14, y: 404, width: 28, height: 10 }, g);
        el('rect', { x: x - 6, y: 414, width: 12, height: 44 }, g);
        el('rect', { x: x - 16, y: 458, width: 32, height: 8, rx: 2 }, g);
      });
    },
    corpos: [
      { id: 'l2', pai: 'lb', em: (p) => [20 + p[1], 0], ang: () => 0, z: 18, pino: false,
        d: 'M0,-9 H214 V9 H0Z M222,0 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0' },
      { id: 'lb', pai: null, em: [430, 318], ang: (p) => p[0], z: 20,
        d: 'M-24,-14 Q-30,0 -24,14 L232,12 V-12Z M132,12 L136,26 L148,26 L152,12' },
    ],
    atuadores: [
      { base: [506, 398], haste: ['lb', 140, -18], w: 26, rw: 11, z: 14, via: [[420, 338], [470, 352]] },
      { base: ['lb', 10, 0], haste: ['l2', 150, 0], w: 14, rw: 6, z: 22, via: [[404, 334], ['lb', -6, 18], ['lb', 6, 14]] },
      { tipo: 'motor', pos: [330, 322], r: 13, val: (p) => p[2], escala: 70, z: 16, via: [[352, 340]] },
    ],
    unidade: { tanque: [196, 420], bomba: [172, 442], valvula: [366, 352] },
    extra: {
      criar(g) {
        const s = { cabo: el('path', { stroke: 'rgba(255,255,255,.75)', 'stroke-width': 1.6, fill: 'none' }, g) };
        s.carga = el('g', {}, g);
        caminho(s.carga, 'M0,0 V8 M-3,8 Q-6,16 0,18 Q6,16 4,12', { fill: 'none', stroke: LINHA, 'stroke-width': 2 });
        caminho(s.carga, 'M0,18 L-34,20 M0,18 L34,20', { stroke: LINHA2, 'stroke-width': 1.4 });
        el('rect', { x: -40, y: 20, width: 80, height: 46, rx: 2, fill: ACO, stroke: LINHA, 'stroke-width': 1.5 }, s.carga);
        caminho(s.carga, 'M-28,24 V62 M-16,24 V62 M-4,24 V62 M8,24 V62 M20,24 V62 M32,24 V62', { stroke: LINHA2 });
        return s;
      },
      atualizar(s, api, p) {
        const tambor = [330, 309], pe = api.ponto(['lb', -8, 20]), ponta = api.ponto(['l2', 222, 8]), y = p[2];
        s.cabo.setAttribute('d', `M${f1(tambor[0])},${f1(tambor[1])} L${f1(pe[0])},${f1(pe[1])} L${f1(ponta[0])},${f1(ponta[1])} V${f1(y)}`);
        s.carga.setAttribute('transform', `translate(${f1(ponta[0] + 8)},${f1(y)})`);
      },
    },
    rotulos: [
      { t: 'Cilindros e motor do guincho', x: 12, y: 36, alvo: (api) => api.meio(0) },
      { t: 'Bomba e comando', x: 186, y: 524, alvo: (api) => api.bomba() },
    ],
  });

  /* ---------- 4 · RETROESCAVADEIRA ---------- */
  const retro = {
    id: 'retroescavadeira', nome: 'Retroescavadeira', titulo: 'Sistema hidráulico de uma retroescavadeira', ciclo: 10,
    K: [[40, -110, -40, 196, 0], [12, -100, -46, 200, 0], [16, -112, -95, 194, 1], [48, -118, -115, 184, 1], [42, -98, -18, 188, 0]],
    fundo(g) {
      caminho(g, 'M560,470 C600,456 640,458 690,464 C720,468 740,460 760,462 V470Z', { fill: 'url(#hx-hach)', stroke: LINHA2, 'stroke-width': 1.2 });
      caminho(g, 'M120,404 V350 Q120,338 132,338 H300 V404Z');                    // capô
      caminho(g, 'M262,338 V312', { 'stroke-width': 4 });
      caminho(g, 'M300,404 V252 Q300,240 312,240 H402 Q414,240 414,252 V404Z');    // cabine
      caminho(g, 'M312,256 H402 V326 H312Z', { fill: 'rgba(255,255,255,.04)', stroke: LINHA2 });
      caminho(g, 'M414,404 V352 H480 V404Z');                                      // chassi traseiro
      caminho(g, 'M466,404 V334 H500 V404', {});                                   // suporte da retro
      el('rect', { x: 474, y: 404, width: 10, height: 52 }, g);                    // estabilizador
      el('rect', { x: 464, y: 456, width: 30, height: 8, rx: 2 }, g);
      roda(g, 192, 32);
      roda(g, 382, 46);
    },
    corpos: [
      { id: 'la', pai: null, em: [292, 348], ang: (p) => p[3], z: 18,
        d: 'M-10,-9 Q-16,0 -10,9 L156,8 Q164,0 156,-8Z M52,8 L56,20 L68,20 L72,8' },
      { id: 'pa', pai: 'la', em: [160, 0], ang: () => 0, abs: true, z: 19,
        d: 'M6,-14 V30 H-58 L-52,20 Q-38,-8 6,-14Z' },
      { id: 'bh1', pai: null, em: [486, 344], ang: (p) => p[0], z: 20,
        d: 'M-14,-8 Q-16,-16 -4,-17 L80,-24 L130,-30 L200,-12 Q212,0 200,12 L130,6 L80,10 L-4,15 Q-16,14 -14,6Z M70,10 L74,24 L86,24 L90,10 M100,-27 L104,-40 L116,-40 L120,-28' },
      { id: 'bh2', pai: 'bh1', em: [200, 0], ang: (p) => p[1], z: 30,
        d: 'M-48,-4 Q-48,-12 -38,-12 L-14,-16 L50,-13 L150,-8 Q160,0 150,8 L50,12 L-14,13 L-40,8 Q-48,6 -48,-4Z M36,-14 L40,-26 L52,-26 L56,-14' },
      { id: 'bh3', pai: 'bh2', em: [150, 0], ang: (p) => p[2], z: 32,
        d(g) {
          caminho(g, 'M-3,-6 L-16,-29 L-3,-35 L11,-16');
          caminho(g, 'M-6,5 C-10,-18 8,-38 35,-38 C61,-38 75,-21 77,0 L90,3 L78,7 L86,12 L74,13 L10,10 Q-5,10 -6,5Z');
          retro._terra = caminho(g, 'M12,9 C18,-12 52,-18 72,8Z', { fill: 'url(#hx-hach)', stroke: LINHA2, 'stroke-width': 1, opacity: 0 });
        } },
    ],
    atuadores: [
      { base: [500, 398], haste: ['bh1', 80, -20], w: 20, rw: 8, z: 12, via: [[430, 330]] },
      { base: ['bh1', 110, 28], haste: ['bh2', -38, 6], w: 18, rw: 7, z: 36, via: [[436, 326], ['bh1', 4, 24], ['bh1', 60, 28]] },
      { base: ['bh2', 44, 22], haste: ['bh3', -10, 28], w: 16, rw: 6, z: 34, via: [[442, 322], ['bh1', 4, 16], ['bh1', 120, 20], ['bh1', 196, 22], ['bh2', 8, 24]] },
      { base: [250, 394], haste: ['la', 60, 12], w: 18, rw: 7, z: 16, via: [[300, 332]] },
    ],
    unidade: { tanque: [134, 350], bomba: [228, 382], valvula: [318, 340] },
    extra: { criar() { return {}; }, atualizar(s, api, p) { if (retro._terra) retro._terra.setAttribute('opacity', f1(p[4])); } },
    rotulos: [
      { t: 'Cilindros hidráulicos', x: 748, y: 36, a: 'end', alvo: (api) => api.meio(1) },
      { t: 'Mangueiras de alta pressão', x: 12, y: 36, alvo: (api) => api.ponto(['bh1', 60, 28]) },
      { t: 'Bomba e comando', x: 240, y: 524, alvo: (api) => api.bomba() },
    ],
  };
  MAQUINAS.push(retro);

  /* ---------- 5 · EMPILHADEIRA ---------- */
  MAQUINAS.push({
    id: 'empilhadeira', nome: 'Empilhadeira', titulo: 'Sistema hidráulico de uma empilhadeira', ciclo: 12,
    K: [[88, 0], [93, 12], [93, 118], [88, 110], [93, 118], [93, 12]],
    fundo(g) {
      // porta-palete ao fundo
      caminho(g, 'M566,150 V470 M748,150 V470', { stroke: LINHA2, 'stroke-width': 3 });
      el('rect', { x: 540, y: 340, width: 220, height: 8 }, g);
      el('rect', { x: 540, y: 196, width: 220, height: 8 }, g);
      el('rect', { x: 640, y: 144, width: 96, height: 52, fill: 'url(#hx-hach)' }, g);
      // corpo, contrapeso, proteção
      caminho(g, 'M196,450 V374 Q196,350 220,348 H452 V450Z');
      caminho(g, 'M300,348 V210 M436,348 V210 M292,202 H444 V212 H292Z', { 'stroke-width': 2.4 });
      caminho(g, 'M330,348 V322 Q330,312 342,312 H372 V348', {});                 // banco
      caminho(g, 'M412,348 L398,304 M386,300 L410,308', { 'stroke-width': 2.4 });
      roda(g, 250, 26);
      roda(g, 410, 32);
    },
    corpos: [
      { id: 'm2', pai: 'm1', em: (p) => [6 + p[1], 0], ang: () => 0, z: 18, pino: false, d: 'M0,-5 H236 V5 H0Z M40,-5 V5 M140,-5 V5' },
      { id: 'm1', pai: null, em: [468, 450], ang: (p) => p[0], z: 20, d: 'M0,-8 H250 V8 H0Z M60,-8 V8 M180,-8 V8' },
      { id: 'garfo', pai: 'm2', em: [0, 0], ang: () => 0, z: 40, pino: false,
        d(g) {
          caminho(g, 'M-4,6 H70 V16 H-4Z');                                        // carro
          caminho(g, 'M-6,14 H2 V126 H-6Z');                                       // garfo
          el('rect', { x: 2, y: 18, width: 8, height: 104 }, g);                   // palete
          el('rect', { x: 10, y: 24, width: 52, height: 44, fill: 'url(#hx-hach)' }, g);
          el('rect', { x: 10, y: 72, width: 52, height: 44, fill: 'url(#hx-hach)' }, g);
        } },
    ],
    atuadores: [
      { base: ['m1', 4, 18], haste: ['m2', 140, 18], w: 16, rw: 7, z: 22, via: [[440, 360], [454, 420]] },
      { base: [432, 364], haste: ['m1', 120, 12], w: 16, rw: 6, z: 24, via: [[420, 358]] },
    ],
    unidade: { tanque: [212, 380], bomba: [300, 420], valvula: [344, 368] },
    rotulos: [
      { t: 'Cilindros hidráulicos', x: 12, y: 36, alvo: (api) => api.meio(0) },
      { t: 'Bomba e comando', x: 312, y: 524, alvo: (api) => api.bomba() },
    ],
  });

  /* ---------- 6 · CAMINHÃO DE LIXO ---------- */
  MAQUINAS.push({
    id: 'caminhao-de-lixo', nome: 'Caminhão de lixo', titulo: 'Sistema hidráulico de um caminhão de lixo compactador', ciclo: 12,
    K: [[-62, -70, 1], [20, -70, 1], [96, -70, 0], [96, -70, 0], [-62, -70, 0], [-62, -118, 0]],
    fundo(g) {
      caminhao(g, 40, 560, [100, 440, 506]);
      caminho(g, 'M176,404 V244 Q176,232 188,232 H560 V404Z');                   // caixa compactadora
      caminho(g, 'M240,232 V404 M300,232 V404 M360,232 V404 M420,232 V404 M480,232 V404', { stroke: LINHA2 });
      caminho(g, 'M560,404 V226 Q560,214 572,214 H640 L684,300 V378 L664,404Z');  // tampa traseira
      caminho(g, 'M566,300 H676', { stroke: LINHA2, 'stroke-dasharray': '4 4' });
    },
    corpos: [
      { id: 'placa', pai: null, em: [600, 238], ang: (p) => p[1], z: 10,
        d: 'M-6,-7 Q-10,0 -6,7 L104,10 Q114,12 112,-2 L104,-8Z' },
      { id: 'braco', pai: null, em: [664, 392], ang: (p) => p[0], z: 26, d: 'M-8,-7 Q-12,0 -8,7 L40,6 Q46,0 40,-6Z' },
      { id: 'conteiner', pai: 'braco', em: [40, 0], ang: () => 0, z: 28, pino: false,
        d(g) {
          const c = el('g', { transform: 'rotate(-62)' }, g);
          caminho(c, 'M4,-27 H64 L60,43 H8Z M2,-27 H66');
          lixo._conteudo = el('rect', { x: 10, y: -16, width: 48, height: 54, fill: 'url(#hx-hach)', stroke: 'none' }, c);
          el('circle', { cx: 16, cy: 46, r: 4 }, c);
          el('circle', { cx: 52, cy: 46, r: 4 }, c);
        } },
    ],
    atuadores: [
      { base: [646, 446], haste: ['braco', 22, 10], w: 16, rw: 7, z: 22, via: [[630, 352]] },
      { base: [668, 230], haste: ['placa', 60, 10], w: 18, rw: 8, z: 14, via: [[640, 286]] },
    ],
    unidade: { tanque: [196, 420], bomba: [172, 442], valvula: [584, 312] },
    extra: { criar() { return {}; }, atualizar(s, api, p) { if (lixo._conteudo) lixo._conteudo.setAttribute('opacity', f1(p[2])); } },
    rotulos: [
      { t: 'Cilindros hidráulicos', x: 748, y: 36, a: 'end', alvo: (api) => api.meio(1) },
      { t: 'Bomba e comando', x: 186, y: 524, alvo: (api) => api.bomba() },
    ],
  });
  const lixo = MAQUINAS[MAQUINAS.length - 1];

  /* ============================================================
     MOTOR
     ============================================================ */
  const pose = (spec, t) => {
    const K = spec.K, u = ((t % 1) + 1) % 1 * K.length, i = Math.floor(u), f = suave(u - i);
    const A = K[i], B = K[(i + 1) % K.length];
    return A.map((v, j) => v + (B[j] - v) * f);
  };
  const quadro = (spec, p) => {
    const Wd = {};
    spec.corpos.forEach(function resolver(c) {
      if (Wd[c.id]) return;
      if (c.pai && !Wd[c.pai]) resolver(spec.corpos.find((x) => x.id === c.pai));
      const e0 = typeof c.em === 'function' ? c.em(p) : c.em;
      const ang = c.ang ? c.ang(p) : 0;
      if (!c.pai) Wd[c.id] = { P: e0, a: ang };
      else { const pf = Wd[c.pai]; Wd[c.id] = { P: em(pf.P, pf.a, e0[0], e0[1]), a: c.abs ? ang : pf.a + ang }; }
    });
    return Wd;
  };
  const resolvePonto = (Wd, s) => (typeof s[0] === 'string' ? em(Wd[s[0]].P, Wd[s[0]].a, s[1], s[2]) : s);

  /* SVG raiz + definições compartilhadas */
  const svg = el('svg', { viewBox: '0 0 760 540', role: 'img', 'aria-labelledby': 'hx-t', class: 'hx-svg' });
  const titulo = el('title', { id: 'hx-t' }, svg);
  const defs = el('defs', {}, svg);
  const grade = el('pattern', { id: 'hx-grade', width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, defs);
  el('path', { d: 'M24 0H0V24', fill: 'none', stroke: 'rgba(255,255,255,.05)', 'stroke-width': 1 }, grade);
  const hach = el('pattern', { id: 'hx-hach', width: 9, height: 9, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  el('path', { d: 'M0 0V9', stroke: 'rgba(255,255,255,.14)', 'stroke-width': 2 }, hach);
  const cromo = el('linearGradient', { id: 'hx-cromo', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el('stop', { offset: '0', 'stop-color': '#ffffff' }, cromo);
  el('stop', { offset: '.5', 'stop-color': '#b9c7bd' }, cromo);
  el('stop', { offset: '1', 'stop-color': '#eef3ef' }, cromo);
  const glow = el('filter', { id: 'hx-glow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
  el('feGaussianBlur', { stdDeviation: 2.2, result: 'b' }, glow);
  const fm = el('feMerge', {}, glow);
  el('feMergeNode', { in: 'b' }, fm); el('feMergeNode', { in: 'SourceGraphic' }, fm);
  el('rect', { width: 760, height: 540, fill: 'url(#hx-grade)' }, svg);
  el('path', { d: `M0,${CHAO} H760`, stroke: LINHA2, 'stroke-width': 1.5 }, svg);
  el('path', { d: `M0,${CHAO} H760 V540 H0Z`, fill: 'url(#hx-hach)' }, svg);

  /* mangueira genérica */
  const novaMangueira = (lista, pai, pontos, cfg) => {
    const g = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, pai);
    const w = cfg.w || 5;
    const m = {
      pontos, cfg, off: Math.random() * 20, estado: 0, sp: 0,
      parede: el('path', { stroke: 'rgba(255,255,255,.24)', 'stroke-width': w + 2.6 }, g),
      nucleo: el('path', { stroke: ESCURO, 'stroke-width': w }, g),
      oleo: el('path', { stroke: OLEO, 'stroke-width': w * 0.48 }, g),
      fluxo: el('path', { stroke: BRILHO, 'stroke-width': w * 0.55, 'stroke-dasharray': '0.6 10', filter: 'url(#hx-glow)' }, g),
    };
    lista.push(m);
    return m;
  };

  /* constrói uma máquina */
  const construir = (spec) => {
    const g = el('g', { class: 'hx-maq' }, svg);
    const M = { spec, g, t: 0, giro: 0, pressao: 0.3, mangueiras: [] };
    const camadas = [];
    const por = (z, n) => { camadas.push({ z, n }); return n; };

    const fundo = por(0, el('g', ATR_ACO));
    spec.fundo(fundo);

    // peças móveis
    M.corpos = spec.corpos.map((c, i) => {
      const cg = por(c.z != null ? c.z : 20 + i, el('g', ATR_ACO));
      if (typeof c.d === 'function') c.d(cg); else caminho(cg, c.d);
      return { c, g: cg };
    });

    // cilindros e motor: curso medido no próprio ciclo
    M.atu = spec.atuadores.map((a) => {
      const A = Object.assign({ vs: 0, prev: null, sinal: 0 }, a);
      if (a.tipo === 'motor') {
        const mg = por(a.z, el('g', {}));
        el('circle', { cx: a.pos[0], cy: a.pos[1], r: a.r, fill: 'rgba(0,0,0,.3)', stroke: LINHA, 'stroke-width': 1.5 }, mg);
        A.rolo = el('circle', { cx: a.pos[0], cy: a.pos[1], r: a.r - 4, fill: 'none', stroke: BRILHO, 'stroke-width': 3, 'stroke-dasharray': '2 3' }, mg);
        el('rect', { x: a.pos[0] - 9, y: a.pos[1] + a.r - 2, width: 18, height: 10, rx: 2, fill: ESCURO, stroke: LINHA, 'stroke-width': 1.2 }, mg);
        A.portaF = [a.pos[0] - 5, a.pos[1] + a.r + 8];
        A.portaH = [a.pos[0] + 5, a.pos[1] + a.r + 8];
        A.giro = 0;
        return A;
      }
      let mn = 1e9, mx = 0;
      for (let t = 0; t < 1; t += 0.005) {
        const Wd = quadro(spec, pose(spec, t));
        const L = dist(resolvePonto(Wd, a.base), resolvePonto(Wd, a.haste));
        mn = Math.min(mn, L); mx = Math.max(mx, L);
      }
      A.Lr = mn - 16;
      A.Lb = Math.max(30, Math.min(mx - A.Lr + 10, mn - 6));
      const cg = por(a.z, el('g', {}));
      const h = a.w / 2;
      A.g = cg;
      el('rect', { x: 0, y: -h, width: A.Lb, height: a.w, rx: 3, fill: 'rgba(0,0,0,.28)' }, cg);
      A.camF = el('rect', { x: 3, y: -h + 2.6, height: a.w - 5.2, rx: 1.5, fill: OLEO }, cg);
      A.camH = el('rect', { y: -h + 2.6, height: a.w - 5.2, rx: 1.5, fill: OLEO }, cg);
      A.hasteRect = el('rect', { y: -a.rw / 2, height: a.rw, rx: a.rw / 2, fill: 'url(#hx-cromo)' }, cg);
      A.pistao = el('rect', { y: -h + 1.4, width: 6, height: a.w - 2.8, rx: 1.5, fill: '#e9f1eb' }, cg);
      el('rect', { x: 0, y: -h, width: A.Lb, height: a.w, rx: 3, fill: 'none', stroke: LINHA, 'stroke-width': 1.5 }, cg);
      el('rect', { x: A.Lb - 4, y: -h - 2, width: 7, height: a.w + 4, rx: 2, fill: 'rgba(255,255,255,.85)' }, cg);
      el('rect', { x: -5, y: -h + 1, width: 6, height: a.w - 2, rx: 2, fill: 'rgba(255,255,255,.85)' }, cg);
      el('circle', { cx: 12, cy: -h, r: 2.4, fill: BRILHO }, cg);
      el('circle', { cx: A.Lb - 12, cy: -h, r: 2.4, fill: BRILHO }, cg);
      return A;
    });

    // reservatório, bomba, comando
    const u = spec.unidade, n = M.atu.length;
    const [tx, ty] = u.tanque, [px, py] = u.bomba, [vx, vy] = u.valvula;
    const vw = 12 + n * 15, vh = 42;
    const ug = por(5, el('g', {}));
    const linhasU = el('g', {}, ug);
    el('rect', { x: tx, y: ty, width: 64, height: 42, rx: 5, fill: 'rgba(0,0,0,.22)' }, ug);
    M.oleoTanque = el('path', { fill: OLEO, opacity: 0.85 }, ug);
    el('rect', { x: tx, y: ty, width: 64, height: 42, rx: 5, fill: 'none', stroke: LINHA, 'stroke-width': 1.4 }, ug);
    el('circle', { cx: px, cy: py, r: 15, fill: 'rgba(0,0,0,.3)', stroke: LINHA, 'stroke-width': 1.4 }, ug);
    M.eng1 = el('circle', { cx: px - 5.5, cy: py, r: 5.5, fill: 'none', stroke: BRILHO, 'stroke-width': 3.4, 'stroke-dasharray': '1.8 1.8' }, ug);
    M.eng2 = el('circle', { cx: px + 5.5, cy: py, r: 5.5, fill: 'none', stroke: BRILHO, 'stroke-width': 3.4, 'stroke-dasharray': '1.8 1.8' }, ug);
    el('rect', { x: vx, y: vy, width: vw, height: vh, rx: 5, fill: 'rgba(0,0,0,.24)', stroke: LINHA, 'stroke-width': 1.4 }, ug);
    M.carreteis = M.atu.map((a, i) => {
      const sx = vx + 7 + i * 15;
      el('rect', { x: sx - 1, y: vy + 6, width: 11, height: 30, rx: 3, fill: 'rgba(255,255,255,.05)', stroke: LINHA2 }, ug);
      a.portaVF = [sx + 2, vy]; a.portaVH = [sx + 8, vy];
      return el('rect', { x: sx + 1, y: vy + 12, width: 7, height: 18, rx: 2, fill: BRILHO, opacity: 0.8 }, ug);
    });
    const gx = vx - 14, gy = vy + 4;
    el('circle', { cx: gx, cy: gy, r: 9.5, fill: ESCURO, stroke: LINHA, 'stroke-width': 1.3 }, ug);
    M.ponteiro = el('path', { d: `M${gx},${gy} L${gx},${gy - 7}`, stroke: OLEO, 'stroke-width': 2, 'stroke-linecap': 'round' }, ug);
    M.gauge = [gx, gy];
    M.tanque = [tx, ty];
    M.bomba = [px, py];
    const tSai = [tx + 54, ty + 42], tEnt = [tx + 18, ty], bEnt = [px - 15, py], bSai = [px, py - 15];
    const vEnt = [vx, vy + 28], vSai = [vx + vw / 2, vy + vh];
    M.suc = novaMangueira(M.mangueiras, linhasU, () => [tSai, [(tSai[0] + bEnt[0]) / 2, Math.max(tSai[1], bEnt[1]) + 10], bEnt], { w: 5, vel: 0.6 });
    M.pre = novaMangueira(M.mangueiras, linhasU, () => [bSai, [bSai[0], Math.min(bSai[1], vEnt[1]) - 6], [vEnt[0] - 12, vEnt[1]], vEnt], { w: 5, vel: 1 });
    M.ret = novaMangueira(M.mangueiras, linhasU, () => [vSai, [vSai[0], vSai[1] + 10], [tEnt[0], Math.min(tEnt[1], vSai[1]) - 10], tEnt], { w: 5, vel: 0.7 });

    // mangueiras dos atuadores (fundo F e haste H)
    const deslocar = (s, k) => (typeof s[0] === 'string' ? [s[0], s[1], s[2] + k] : [s[0] + k, s[1]]);
    M.atu.forEach((a) => {
      const mg = por(a.zm != null ? a.zm : a.z - 1, el('g', {}));
      const via = a.via || [];
      const portaAtu = (qual) => {
        if (a.tipo === 'motor') return qual === 'F' ? a.portaF : a.portaH;
        const b = a.mb, ang = rad(a.ma), x = qual === 'F' ? 12 : a.Lb - 12, y = -a.w / 2 - 1;
        return [b[0] + x * Math.cos(ang) - y * Math.sin(ang), b[1] + x * Math.sin(ang) + y * Math.cos(ang)];
      };
      a.mF = novaMangueira(M.mangueiras, mg, (Wd) => [a.portaVF, [a.portaVF[0], a.portaVF[1] - 12]].concat(via.map((s) => resolvePonto(Wd, s)), [portaAtu('F')]), { w: 4.8 });
      a.mH = novaMangueira(M.mangueiras, mg, (Wd) => [a.portaVH, [a.portaVH[0], a.portaVH[1] - 18]].concat(via.map((s) => resolvePonto(Wd, deslocar(s, 6))), [portaAtu('H')]), { w: 4.8 });
    });

    // extras (cabo, carga) e pinos
    if (spec.extra) M.extraEstado = spec.extra.criar(por(spec.extra.z || 50, el('g', {})));
    const pinos = por(100, el('g', { fill: ESCURO, stroke: 'rgba(255,255,255,.9)', 'stroke-width': 1.6 }));
    M.pinosCorpo = M.corpos.filter((k) => k.c.pino !== false).map((k) => ({ id: k.c.id, e: el('circle', { r: 6.5 }, pinos) }));
    M.atu.forEach((a) => { if (!a.tipo) { a.pinoB = el('circle', { r: 4.6 }, pinos); a.pinoH = el('circle', { r: 4.2 }, pinos); } });

    // legendas com linha técnica
    const rg = por(200, el('g', { class: 'hx-lbl' }));
    M.rotulos = (spec.rotulos || []).map((r) => {
      const t = el('text', { x: r.x, y: r.y, 'text-anchor': r.a || 'start' }, rg);
      t.textContent = r.t;
      return Object.assign({
        linha: el('path', { fill: 'none', stroke: 'rgba(255,255,255,.45)', 'stroke-width': 1 }, rg),
        ponto: el('circle', { r: 3, fill: BRILHO }, rg),
      }, r);
    });

    camadas.sort((a, b) => a.z - b.z).forEach((k) => g.appendChild(k.n));
    return M;
  };

  /* desenha um quadro */
  const desenhar = (M, dt) => {
    const spec = M.spec, p = pose(spec, M.t), Wd = quadro(spec, p);
    M.corpos.forEach((k) => {
      const w = Wd[k.c.id];
      k.g.setAttribute('transform', `translate(${f1(w.P[0])},${f1(w.P[1])}) rotate(${f1(-w.a)})`);
    });
    M.pinosCorpo.forEach((k) => { const w = Wd[k.id]; k.e.setAttribute('cx', f1(w.P[0])); k.e.setAttribute('cy', f1(w.P[1])); });

    let demanda = 0, extensao = 0, nCil = 0;
    M.atu.forEach((a, i) => {
      let v = 0, L;
      if (a.tipo === 'motor') {
        L = a.val(p);
        v = a.prev == null || !dt ? 0 : (L - a.prev) / dt;
        a.prev = L;
        a.vs = a.vs * 0.82 + v * 0.18;
        a.giro += dt * a.vs * 4;
        a.rolo.setAttribute('transform', `rotate(${f1(a.giro)} ${a.pos[0]} ${a.pos[1]})`);
        a.sp = Math.min(1, Math.abs(a.vs) / (a.escala || 60));
        a.sinal = a.vs < -2.5 ? 1 : a.vs > 2.5 ? -1 : 0;     // enrolar o cabo = pressão no lado F
      } else {
        const b = resolvePonto(Wd, a.base), h = resolvePonto(Wd, a.haste);
        L = dist(b, h);
        a.mb = b; a.mh = h; a.ma = angTela(b, h);
        v = a.prev == null || !dt ? 0 : (L - a.prev) / dt;
        a.prev = L;
        a.vs = a.vs * 0.82 + v * 0.18;
        a.sp = Math.min(1, Math.abs(a.vs) / 38);
        a.sinal = a.vs > 2.5 ? 1 : a.vs < -2.5 ? -1 : 0;
        const pos = clamp(L - a.Lr, 8, a.Lb - 12);
        extensao += (pos - 8) / Math.max(1, a.Lb - 20); nCil++;
        a.g.setAttribute('transform', `translate(${f1(b[0])},${f1(b[1])}) rotate(${f1(a.ma)})`);
        a.camF.setAttribute('width', f1(Math.max(0, pos - 3)));
        a.camH.setAttribute('x', f1(pos + 6));
        a.camH.setAttribute('width', f1(Math.max(0, a.Lb - 7 - (pos + 6))));
        a.hasteRect.setAttribute('x', f1(pos)); a.hasteRect.setAttribute('width', f1(Math.max(0, L - pos)));
        a.pistao.setAttribute('x', f1(pos));
        a.camF.setAttribute('opacity', a.sinal === 0 ? 0.6 : a.sinal > 0 ? 0.95 : 0.35);
        a.camH.setAttribute('opacity', a.sinal === 0 ? 0.6 : a.sinal < 0 ? 0.95 : 0.35);
        a.pinoB.setAttribute('cx', f1(b[0])); a.pinoB.setAttribute('cy', f1(b[1]));
        a.pinoH.setAttribute('cx', f1(h[0])); a.pinoH.setAttribute('cy', f1(h[1]));
      }
      demanda = Math.max(demanda, a.sp);
      a.mF.estado = a.sinal; a.mH.estado = -a.sinal;
      a.mF.sp = a.mH.sp = a.sp;
      M.carreteis[i].setAttribute('transform', `translate(0 ${a.sinal * 5})`);
    });

    M.suc.estado = 1; M.suc.sp = 0.35 + demanda * 0.6;
    M.pre.estado = 1; M.pre.sp = 0.35 + demanda * 0.65;
    M.ret.estado = -1; M.ret.sp = 0.25 + demanda * 0.6;

    M.mangueiras.forEach((m) => {
      const d = curva(m.pontos(Wd));
      m.parede.setAttribute('d', d); m.nucleo.setAttribute('d', d); m.oleo.setAttribute('d', d); m.fluxo.setAttribute('d', d);
      const ativo = m.estado === 1, volta = m.estado === -1;
      const linhaBomba = m === M.suc || m === M.pre || m === M.ret;
      m.oleo.setAttribute('opacity', ativo ? 0.95 : volta ? (linhaBomba ? 0.7 : 0.45) : 0.55);
      m.fluxo.setAttribute('opacity', ativo ? 1 : volta ? 0.6 : 0.3);
      if (dt) {
        const vel = (m.cfg.vel || 1) * (10 + 85 * (m.sp || 0));
        // a linha de retorno da unidade está desenhada do comando para o tanque: anda para a frente
        const sentido = linhaBomba ? -1 : volta ? 1 : -1;
        m.off += dt * vel * sentido;
        m.fluxo.setAttribute('stroke-dashoffset', f1(m.off));
      }
    });

    if (dt) M.giro += dt * (220 + 420 * demanda);
    M.eng1.setAttribute('transform', `rotate(${f1(M.giro)} ${M.bomba[0] - 5.5} ${M.bomba[1]})`);
    M.eng2.setAttribute('transform', `rotate(${f1(-M.giro)} ${M.bomba[0] + 5.5} ${M.bomba[1]})`);
    M.pressao += ((0.25 + 0.65 * demanda) - M.pressao) * (dt ? Math.min(1, dt * 3) : 1);
    M.ponteiro.setAttribute('transform', `rotate(${f1(-125 + 250 * clamp(M.pressao, 0, 1))} ${M.gauge[0]} ${M.gauge[1]})`);
    const [tx, ty] = M.tanque;
    const nivel = ty + 12 + (nCil ? extensao / nCil : 0.5) * 10, onda = Math.sin(M.t * Math.PI * 2 * 6) * 1.4;
    M.oleoTanque.setAttribute('d', `M${tx + 2},${f1(nivel)} Q${tx + 17},${f1(nivel - onda)} ${tx + 32},${f1(nivel)} T${tx + 62},${f1(nivel)} V${ty + 38} Q${tx + 62},${ty + 40} ${tx + 58},${ty + 40} H${tx + 6} Q${tx + 2},${ty + 40} ${tx + 2},${ty + 38}Z`);

    const api = {
      ponto: (s) => resolvePonto(Wd, s),
      meio: (i) => { const a = M.atu[i]; return a.tipo === 'motor' ? a.pos : [(a.mb[0] + a.mh[0]) / 2, (a.mb[1] + a.mh[1]) / 2]; },
      bomba: () => [M.bomba[0], M.bomba[1] + 15],
    };
    if (spec.extra) spec.extra.atualizar(M.extraEstado, api, p);
    M.rotulos.forEach((r) => {
      const de = [r.x, r.y + 8], para = r.alvo(api);
      r.linha.setAttribute('d', `M${f1(de[0])},${f1(de[1])} L${f1(para[0])},${f1(de[1])} L${f1(para[0])},${f1(para[1])}`);
      r.ponto.setAttribute('cx', f1(para[0])); r.ponto.setAttribute('cy', f1(para[1]));
    });
  };

  /* ---------- montagem ---------- */
  const maquinas = MAQUINAS.map(construir);
  host.prepend(svg);

  // botões de escolha da máquina + pausa
  const barra = document.createElement('div');
  barra.className = 'hx__maqs';
  barra.setAttribute('role', 'group');
  barra.setAttribute('aria-label', 'Escolha a máquina');
  const botoes = maquinas.map((M, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hx__maq';
    b.textContent = M.spec.nome;
    b.addEventListener('click', () => { ativar(i); });
    barra.appendChild(b);
    return b;
  });
  const bPausa = document.createElement('button');
  bPausa.type = 'button';
  bPausa.className = 'hx__pausa';
  bPausa.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" class="i-pausa"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg><svg viewBox="0 0 24 24" aria-hidden="true" class="i-play"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>';
  barra.appendChild(bPausa);
  const legenda = host.querySelector('.hx__legenda');
  host.insertBefore(barra, legenda);

  let atual = 0, pausado = reduz || faseFixa != null, raf = 0, ultimo = null, visivel = true;
  const marcarPausa = () => {
    bPausa.setAttribute('aria-pressed', String(pausado));
    bPausa.setAttribute('aria-label', pausado ? 'Retomar a animação' : 'Pausar a animação');
  };
  const ativar = (i) => {
    atual = i;
    maquinas.forEach((M, j) => M.g.classList.toggle('is-on', j === i));
    botoes.forEach((b, j) => { b.setAttribute('aria-pressed', String(j === i)); b.style.setProperty('--p', 0); });
    const M = maquinas[i];
    M.t = faseFixa != null ? faseFixa : reduz ? 0.3 : 0;
    M.atu.forEach((a) => { a.prev = null; a.vs = 0; });
    titulo.textContent = M.spec.titulo;
    desenhar(M, 0); desenhar(M, 1 / 60);
  };
  bPausa.addEventListener('click', () => {
    if (reduz) return;
    pausado = !pausado; marcarPausa();
    if (!pausado && !raf) { ultimo = null; raf = requestAnimationFrame(passo); }
  });

  const passo = (ts) => {
    raf = 0;
    const dt = ultimo == null ? 0 : Math.min(0.05, (ts - ultimo) / 1000);
    ultimo = ts;
    const M = maquinas[atual];
    M.t += dt / M.spec.ciclo;
    if (M.t >= 1) { ativar((atual + 1) % maquinas.length); }
    else {
      desenhar(M, dt);
      botoes[atual].style.setProperty('--p', M.t.toFixed(3));
    }
    if (!pausado && visivel) raf = requestAnimationFrame(passo);
  };

  const inicial = Math.max(0, MAQUINAS.findIndex((m) => m.id === maqUrl));
  ativar(inicial);
  marcarPausa();
  if (reduz) bPausa.hidden = true;
  if (pausado) return;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => {
      visivel = en[0].isIntersecting;
      if (visivel && !pausado && !raf) { ultimo = null; raf = requestAnimationFrame(passo); }
    }).observe(host);
  }
  raf = requestAnimationFrame(passo);
})();
