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

  const ICONS = {
    archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8z"/><path d="M5 8l1.6-3.2A2 2 0 0 1 8.4 3.6h7.2a2 2 0 0 1 1.8 1.2L19 8"/><path d="M12 11v6"/><rect x="10.8" y="16" width="2.4" height="2.4" rx=".4"/></svg>',
    app: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18"/><circle cx="6" cy="6.5" r=".6" fill="currentColor" stroke="none"/><circle cx="8.6" cy="6.5" r=".6" fill="currentColor" stroke="none"/></svg>',
    disk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="6.2" r=".8" fill="currentColor" stroke="none"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M8 13h7M8 16h5"/></svg>',
    sheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M10 3v18M4 15h6M14 15h6"/></svg>',
    text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M8 13h7M8 16h5"/></svg>',
    audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6.5l8-2v10"/><circle cx="6.5" cy="18" r="2.2"/><circle cx="14.5" cy="16.5" r="2.2"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10.5 9.2v5.6l5-2.8z" fill="currentColor" stroke="none"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8" cy="10" r="1.6"/><path d="M4 17l4.5-3.5L13 17l3.5-3.5L20 17"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/></svg>',
  };
  const CAT = {
    zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
    exe: 'app', msi: 'app', appx: 'app', apk: 'app', ipa: 'app',
    iso: 'disk', img: 'disk', dmg: 'disk',
    pdf: 'doc', doc: 'doc', docx: 'doc',
    xls: 'sheet', xlsx: 'sheet', ppt: 'sheet', pptx: 'sheet', csv: 'sheet',
    txt: 'text', md: 'text', log: 'text',
    mp3: 'audio', wav: 'audio', flac: 'audio', aac: 'audio',
    mp4: 'video', mkv: 'video', avi: 'video', mov: 'video', webm: 'video',
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image',
    js: 'code', ts: 'code', py: 'code', json: 'code', html: 'code', css: 'code', sh: 'code',
  };
  const TINT = {
    archive: '#f59e0b', app: '#64748b', disk: '#a78bfa', doc: '#60a5fa', sheet: '#34d399',
    text: '#94a3b8', audio: '#f472b6', video: '#f43f5e', image: '#22d3ee', code: '#facc15', box: '#6366f1',
  };

  function iconFor(name) {
    const ext = extOf(name);
    const cat = CAT[ext] || 'box';
    return [ICONS[cat], TINT[cat]];
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
      const [icon, tint] = iconFor(it.name);
      const abs = it.url;
      const canView = viewable.has(extOf(it.name));
      return `
        <article class="card">
          <div class="card-top">
            <div class="file-icon" style="--tint:${tint}">${icon}</div>
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