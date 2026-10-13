(() => {
  const stage = document.getElementById('stage');
  const slides = [...stage.querySelectorAll('.slide')];
  const total = slides.length;
  const foot = document.getElementById('foot');
  const footN = document.getElementById('foot-n');
  const count = document.getElementById('count');
  const progress = document.getElementById('progress');
  const notes = document.getElementById('notes');
  const nTitle = document.getElementById('n-title');
  const nBody = document.getElementById('n-body');
  let i = 0;
  let presenter = null;
  let startTime = null;

  /* ---------- Escala do palco ---------- */
  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.setProperty('--s', s);
  }
  window.addEventListener('resize', fit);
  fit();

  /* ---------- Imagens: substituem o marcador se o arquivo existir ---------- */
  stage.querySelectorAll('.ph[data-img]').forEach((ph) => {
    const img = new Image();
    img.onload = () => {
      const bg = document.createElement('div');
      bg.className = 'ph-bg';
      bg.style.backgroundImage = `url("${ph.dataset.img}")`;
      if (ph.dataset.pos) bg.style.backgroundPosition = ph.dataset.pos;
      ph.prepend(bg);
      ph.classList.add('has-img');
    };
    img.src = ph.dataset.img;
  });

  /* ---------- Vídeos: sem som, em repetição, tocando só no slide ativo ---------- */
  stage.querySelectorAll('.ph[data-video]').forEach((ph) => {
    const v = document.createElement('video');
    v.className = 'ph-bg';
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.addEventListener('loadeddata', () => ph.classList.add('has-img'), { once: true });
    v.src = ph.dataset.video;
    ph.prepend(v);
  });

  function syncVideos() {
    slides.forEach((s, k) => s.querySelectorAll('video').forEach((v) => {
      if (k === i) v.play().catch(() => {});
      else { v.pause(); v.currentTime = 0; }
    }));
  }

  /* ---------- Navegação ---------- */
  const stepsOf = (s) => [...s.querySelectorAll('.step')];
  const notesOf = (s) => (s.querySelector('.aside-notes')?.textContent || '').trim();

  function go(n, showAllSteps = false) {
    n = Math.max(0, Math.min(total - 1, n));
    slides.forEach((s, k) => {
      s.classList.toggle('active', k === n);
      s.classList.toggle('past', k < n);
    });
    stepsOf(slides[n]).forEach((st) => st.classList.toggle('shown', showAllSteps));
    i = n;
    syncVideos();
    update();
  }

  function next() {
    const hidden = stepsOf(slides[i]).filter((st) => !st.classList.contains('shown'));
    if (hidden.length) { hidden[0].classList.add('shown'); update(); }
    else if (i < total - 1) go(i + 1);
  }

  function prev() {
    const shown = stepsOf(slides[i]).filter((st) => st.classList.contains('shown'));
    if (shown.length) { shown[shown.length - 1].classList.remove('shown'); update(); }
    else if (i > 0) go(i - 1, true);
  }

  function update() {
    const s = slides[i];
    const num = String(i + 1).padStart(2, '0');
    footN.textContent = num;
    foot.classList.toggle('hidden', i === 0);
    foot.classList.toggle('on-dark', s.classList.contains('dark'));
    count.textContent = `${i + 1} / ${total}`;
    progress.style.width = `${(i / (total - 1)) * 100}%`;
    nTitle.textContent = `${i + 1}. ${s.dataset.title || ''}`;
    nBody.textContent = notesOf(s);
    history.replaceState(null, '', `#${i + 1}`);
    updatePresenter();
  }

  /* ---------- Teclado, clique e toque ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(total - 1, true);
    else if (k === 'n' || k === 'N') notes.classList.toggle('open');
    else if (k === 'f' || k === 'F') toggleFull();
    else if (k === 'p' || k === 'P') openPresenter();
  });

  stage.addEventListener('click', (e) => {
    if (window.getSelection().toString()) return;
    const r = stage.getBoundingClientRect();
    (e.clientX < r.left + r.width * 0.25) ? prev() : next();
  });

  let tx = null;
  document.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    tx = null;
  });

  /* ---------- Controles ---------- */
  document.getElementById('btn-prev').onclick = prev;
  document.getElementById('btn-next').onclick = next;
  document.getElementById('btn-full').onclick = toggleFull;

  function toggleFull() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  let hudTimer;
  document.addEventListener('mousemove', () => {
    document.body.classList.add('show-hud');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => document.body.classList.remove('show-hud'), 2500);
  });

  /* ---------- Modo apresentador (janela separada) ---------- */
  function openPresenter() {
    if (presenter && !presenter.closed) { presenter.focus(); return; }
    presenter = window.open('', 'apresentador', 'width=960,height=680');
    if (!presenter) { alert('Permita pop-ups para abrir o modo apresentador.'); return; }
    startTime = Date.now();
    const d = presenter.document;
    d.open();
    d.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Apresentador</title>
<style>
body{margin:0;font-family:'Public Sans',Arial,sans-serif;background:#1F2A2E;color:#F5F1EA;display:flex;flex-direction:column;height:100vh}
header{display:flex;justify-content:space-between;align-items:center;padding:18px 28px;background:#2A383D}
#t{font:700 22px Georgia,serif}#clock{font:700 28px Consolas,monospace;color:#E8956B}
main{flex:1;overflow:auto;padding:24px 28px;font-size:22px;line-height:1.6;color:#E3E8E6}
#step{color:#E8956B;font-size:15px;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px}
footer{display:flex;gap:12px;align-items:center;padding:16px 28px;background:#2A383D;font-size:16px;color:#C9D3D1}
button{font:600 18px Arial;padding:12px 26px;border:0;border-radius:10px;background:#9C3F1F;color:#F5F1EA;cursor:pointer}
button.g{background:#3E4D52}#nx{margin-left:auto}
</style></head><body>
<header><div id="t"></div><div id="clock">00:00</div></header>
<main><div id="step"></div><div id="nb"></div></main>
<footer><button class="g" id="bp">← Voltar</button><button id="bn">Avançar →</button><span id="nx"></span></footer>
</body></html>`);
    d.close();
    d.getElementById('bp').onclick = prev;
    d.getElementById('bn').onclick = next;
    d.addEventListener('keydown', (e) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); next(); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); prev(); }
    });
    presenter.setInterval(() => {
      const sec = Math.floor((Date.now() - startTime) / 1000);
      const c = d.getElementById('clock');
      if (c) c.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    }, 1000);
    updatePresenter();
  }

  function updatePresenter() {
    if (!presenter || presenter.closed) return;
    const d = presenter.document;
    const s = slides[i];
    const st = stepsOf(s);
    const shown = st.filter((x) => x.classList.contains('shown')).length;
    const set = (id, v) => { const el = d.getElementById(id); if (el) el.textContent = v; };
    set('t', `${i + 1}/${total} · ${s.dataset.title || ''}`);
    set('step', st.length ? `Revelações: ${shown} de ${st.length}` : '');
    set('nb', notesOf(s));
    set('nx', i < total - 1 ? `Próximo: ${slides[i + 1].dataset.title}` : 'Último slide');
  }

  /* ---------- Início ---------- */
  // index.html?todos#5 abre o slide 5 já com todas as revelações visíveis
  const fromHash = parseInt(location.hash.slice(1), 10);
  go(Number.isFinite(fromHash) ? fromHash - 1 : 0, location.search.includes('todos'));
})();
