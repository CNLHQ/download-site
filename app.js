/* CNLHQ's Server - 前台逻辑 */
(function () {
  'use strict';

  const CONFIG = window.SITE_CONFIG || {};
  const state = {
    items: [],
    query: '',
    cat: '全部',
    sort: 'newest',
    cats: [],
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ---------- 工具 ---------- */
  function fmtSize(bytes) {
    if (bytes == null) return '–';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0, n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return (i === 0 ? n : (n >= 100 ? n.toFixed(0) : n.toFixed(1))) + ' ' + units[i];
  }

  function fmtDate(d) {
    if (!d) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(String(d))) return String(d).slice(0, 10);
    const dt = new Date(d);
    if (isNaN(dt)) return String(d).slice(0, 10);
    const p = (x) => String(x).padStart(2, '0');
    return dt.getFullYear() + '-' + p(dt.getMonth() + 1) + '-' + p(dt.getDate());
  }

  function extOf(name) {
    const m = /\.([a-zA-Z0-9]{1,8})$/.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  }

  function iconFor(name) {
    const ext = extOf(name);
    const map = {
      zip: ['🗜️', '#f59e0b'], rar: ['🗜️', '#f59e0b'], '7z': ['🗜️', '#f59e0b'], tar: ['🗜️', '#f59e0b'], gz: ['🗜️', '#f59e0b'],
      exe: ['⚙️', '#94a3b8'], msi: ['⚙️', '#94a3b8'], appx: ['⚙️', '#94a3b8'],
      apk: ['📱', '#34d399'], ipa: ['📱', '#34d399'],
      iso: ['💿', '#a78bfa'], img: ['💿', '#a78bfa'], dmg: ['💿', '#a78bfa'],
      pdf: ['📄', '#f87171'], doc: ['📄', '#60a5fa'], docx: ['📄', '#60a5fa'], xls: ['📊', '#34d399'], xlsx: ['📊', '#34d399'], ppt: ['📊', '#fb923c'], pptx: ['📊', '#fb923c'],
      txt: ['📝', '#e2e8f0'], md: ['📝', '#e2e8f0'], log: ['📝', '#e2e8f0'],
      mp3: ['🎵', '#f472b6'], wav: ['🎵', '#f472b6'], flac: ['🎵', '#f472b6'], aac: ['🎵', '#f472b6'],
      mp4: ['🎬', '#f43f5e'], mkv: ['🎬', '#f43f5e'], avi: ['🎬', '#f43f5e'], mov: ['🎬', '#f43f5e'], webm: ['🎬', '#f43f5e'],
      jpg: ['🖼️', '#22d3ee'], jpeg: ['🖼️', '#22d3ee'], png: ['🖼️', '#22d3ee'], gif: ['🖼️', '#22d3ee'], webp: ['🖼️', '#22d3ee'], svg: ['🖼️', '#22d3ee'], bmp: ['🖼️', '#22d3ee'],
      js: ['🧑‍💻', '#facc15'], ts: ['🧑‍💻', '#facc15'], py: ['🧑‍💻', '#facc15'], json: ['🧑‍💻', '#facc15'], html: ['🧑‍💻', '#facc15'], css: ['🧑‍💻', '#facc15'], sh: ['🧑‍💻', '#facc15'],
      csv: ['📊', '#34d399'],
    };
    return map[ext] || ['📦', '#6366f1'];
  }

  const viewable = new Set(['txt', 'md', 'log', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp4', 'webm', 'mp3', 'wav', 'json', 'csv', 'html', 'js', 'css', 'py', 'ts']);

  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), ms || 2200);
  }

  /* ---------- 渲染 ---------- */
  function renderCats() {
    const box = $('#cats');
    const cats = ['全部'].concat(state.cats);
    box.innerHTML = cats.map((c) =>
      `<button class="cat-chip${c === state.cat ? ' active' : ''}" data-cat="${c.replace(/"/g, '&quot;')}">${c}</button>`
    ).join('');
    box.hidden = false;
  }

  function filtered() {
    const q = state.query.trim().toLowerCase();
    let list = state.items.filter((it) => {
      if (state.cat !== '全部' && it.category !== state.cat) return false;
      if (q) {
        const hay = (it.name + ' ' + (it.description || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (state.sort === 'largest') list = list.slice().sort((a, b) => b.size - a.size);
    else if (state.sort === 'az') list = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    else list = list.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    return list;
  }

  function render() {
    const grid = $('#grid');
    const empty = $('#empty');
    const list = filtered();

    if (!list.length) {
      grid.hidden = true;
      empty.hidden = false;
      empty.querySelector('p').textContent = state.items.length ? '没有匹配的资源' : '暂无资源';
      return;
    }
    empty.hidden = true;
    grid.hidden = false;

    grid.innerHTML = list.map((it) => {
      const [emoji, tint] = iconFor(it.name);
      const abs = it.url;
      const canView = viewable.has(extOf(it.name));
      return `
        <article class="card">
          <div class="card-top">
            <div class="file-icon" style="--tint:${tint}">${emoji}</div>
            <div class="file-meta">
              <h3 title="${it.name.replace(/"/g, '&quot;')}">${it.name}</h3>
              <div class="meta-line">${fmtSize(it.size)} · ${fmtDate(it.date)}</div>
            </div>
            <span class="chip" title="${it.category.replace(/"/g, '&quot;')}">${it.category}</span>
          </div>
          ${it.description ? `<p class="card-desc">${it.description}</p>` : ''}
          <div class="card-actions">
            <a class="btn primary" href="${abs}" target="_blank" rel="noopener">下载</a>
            <button class="btn ghost" data-copy="${abs}">复制链接</button>
            ${canView ? `<a class="btn ghost" href="${abs}" target="_blank" rel="noopener">预览</a>` : ''}
          </div>
        </article>`;
    }).join('');

    const total = list.reduce((s, it) => s + (it.size || 0), 0);
    $('#stat-count').textContent = state.items.length;
    $('#stat-size').textContent = fmtSize(total);
    $('#stat-cats').textContent = state.cats.length || 0;
    $('#stats').hidden = false;
  }

  /* ---------- 数据 ---------- */
  async function load() {
    $('#loading').hidden = false;
    $('#error').hidden = true;
    try {
      const res = await fetch('files.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      state.items = (data.files || []).map((f) => ({
        name: f.name || '',
        size: Number(f.size) || 0,
        category: f.category || '未分类',
        description: f.description || '',
        url: f.url || '#',
        date: f.date || '',
      })).filter((f) => f.name && f.url !== '#');
      state.cats = Array.from(new Set(state.items.map((i) => i.category))).sort((a, b) => a.localeCompare(b, 'zh'));
      renderCats();
      render();
    } catch (e) {
      console.error(e);
      $('#loading').hidden = true;
      $('#error').hidden = false;
    } finally {
      $('#loading').hidden = true;
    }
  }

  /* ---------- 事件 ---------- */
  function bind() {
    $('#theme-toggle').addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('rs_theme', next); } catch (e) {}
    });

    $('#search').addEventListener('input', (e) => { state.query = e.target.value; render(); });

    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });

    $('#cats').addEventListener('click', (e) => {
      const chip = e.target.closest('.cat-chip');
      if (!chip) return;
      state.cat = chip.dataset.cat;
      $$('.cat-chip').forEach((c) => c.classList.toggle('active', c === chip));
      render();
    });

    $('#grid').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-copy]');
      if (!btn) return;
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        toast('✅ 链接已复制');
      } catch (err) {
        toast('复制失败，请手动复制：' + btn.dataset.copy, 3200);
      }
    });
  }

  /* ---------- 启动 ---------- */
  function init() {
    const c = CONFIG;
    if (c.name) { $('#site-name').textContent = c.name; document.title = c.name; }
    if (c.subtitle) $('#site-subtitle').textContent = c.subtitle;
    if (c.footer) $('#footer-text').textContent = c.footer;
    if (c.uploadGuide) $('#guide-link').href = c.uploadGuide;
    if (c.name) { const t = document.querySelector('#hero-title span'); if (t) t.textContent = c.name; }

    let theme = 'light';
    try { theme = localStorage.getItem('rs_theme') || 'light'; } catch (e) {}
    document.documentElement.dataset.theme = theme;

    const q = new URLSearchParams(location.search).get('q');
    if (q) { state.query = q; $('#search').value = q; }

    bind();
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();