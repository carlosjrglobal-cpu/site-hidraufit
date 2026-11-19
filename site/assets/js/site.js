/* Grupo Hidraufit · comportamento compartilhado (menu, cabeçalho, entrada suave, ano) */
(function () {
  var header = document.querySelector('.header');
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('menu');

  // menu do celular
  function fecharMenu() {
    header.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var aberto = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(aberto));
      toggle.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) fecharMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharMenu(); });
  }

  // sombra do cabeçalho ao rolar
  if (header) {
    var marcar = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    marcar();
    window.addEventListener('scroll', marcar, { passive: true });
  }

  // entrada suave dos blocos (desligada com prefers-reduced-motion via CSS)
  var itens = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    itens.forEach(function (el) { io.observe(el); });
  } else {
    itens.forEach(function (el) { el.classList.add('is-in'); });
  }

  // carrossel de logos: N visíveis (CSS --vis), avança um por vez, em laço
  document.querySelectorAll('[data-carrossel]').forEach(function (car) {
    var trilho = car.querySelector('.carrossel__trilho');
    var itens = Array.prototype.slice.call(trilho.children);
    var n = itens.length;
    if (n < 2) return;
    var bloco = car.parentElement;
    var ctrl = bloco.querySelector('.clientes__ctrl');
    var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    // cópias dos primeiros no fim: o laço volta ao início sem buraco
    itens.slice(0, 5).forEach(function (li) {
      var c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      var img = c.querySelector('img');
      if (img) img.alt = '';
      trilho.appendChild(c);
    });
    // logo fora da área visível não pode ficar esperando o lazy load
    trilho.querySelectorAll('img').forEach(function (img) { img.loading = 'eager'; });
    car.classList.add('is-ativo');
    car.scrollLeft = 0;
    if (ctrl) ctrl.hidden = false;

    var i = 0, pausado = reduz, sobre = false, timer = 0;
    function passo() {
      var a = trilho.children[0].getBoundingClientRect(), b = trilho.children[1].getBoundingClientRect();
      return b.left - a.left;
    }
    function aplicar(animar) {
      if (!animar) trilho.style.transition = 'none';
      trilho.style.transform = 'translateX(' + (-i * passo()) + 'px)';
      if (!animar) { void trilho.offsetWidth; trilho.style.transition = ''; }
    }
    function ir(delta) {
      if (delta > 0 && i >= n) { i -= n; aplicar(false); }
      if (delta < 0 && i <= 0) { i = n; aplicar(false); }
      i += delta;
      aplicar(true);
    }
    trilho.addEventListener('transitionend', function (e) {
      if (e.target === trilho && i >= n) { i -= n; aplicar(false); }
    });
    function agendar() {
      clearInterval(timer);
      timer = setInterval(function () { if (!pausado && !sobre && !document.hidden) ir(1); }, 2600);
    }
    car.addEventListener('mouseenter', function () { sobre = true; });
    car.addEventListener('mouseleave', function () { sobre = false; });
    if (ctrl) {
      var bPausa = ctrl.querySelector('[data-acao="pausa"]');
      var marcarPausa = function () {
        bPausa.setAttribute('aria-pressed', String(pausado));
        bPausa.setAttribute('aria-label', pausado ? 'Retomar o carrossel' : 'Pausar o carrossel');
      };
      marcarPausa();
      ctrl.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        var acao = b.getAttribute('data-acao');
        if (acao === 'prox') { ir(1); agendar(); }
        else if (acao === 'ant') { ir(-1); agendar(); }
        else if (acao === 'pausa') { pausado = !pausado; marcarPausa(); }
      });
    }
    window.addEventListener('resize', function () { aplicar(false); });
    agendar();
  });

  // ano do rodapé
  document.querySelectorAll('[data-ano]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
