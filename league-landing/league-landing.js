/*!
 * In the Stands — league landing page: List view + Map view.
 *
 * Data comes from the page's existing Webflow CMS list. The Collection List
 * Wrapper carries data-its-league="MLS|MLB|NWSL" and each Collection Item
 * carries CMS-bound attributes: data-its-team, data-its-slug, data-its-stadium,
 * data-its-city, data-its-opened, data-its-division, data-its-lat, data-its-lng.
 * Stadium photos come from photos.json next to this file (keyed by slug).
 *
 * The original CMS list stays in the HTML (SEO + no-JS fallback) and is hidden
 * once this script renders.
 */
(function () {
  'use strict';
  const BASE = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
  const D3 = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
  const TOPO = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
  const US = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
  const WORLD = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';
  const RED = '#c8102e', NAVY = '#13274f';

  const ABBR = { 'new-york-yankees': 'NYY', 'new-york-mets': 'NYM', 'chicago-cubs': 'CHC', 'chicago-white-sox': 'CWS', 'los-angeles-dodgers': 'LAD', 'los-angeles-angels': 'LAA', 'la-galaxy': 'LA', 'los-angeles-football-club': 'LAFC', 'new-york-city-fc': 'NYC', 'new-york-red-bulls': 'RBNY', 'kansas-city-royals': 'KC', 'sporting-kansas-city': 'SKC', 'kansas-city-current': 'KC', 'san-diego-fc': 'SD', 'san-diego-padres': 'SD', 'san-diego-wave-fc': 'SD', 'san-francisco-giants': 'SF', 'san-jose-earthquakes': 'SJ', 'bay-fc': 'BAY', 'st-louis-cardinals': 'STL', 'st-louis-city-sc': 'STL', 'tampa-bay-rays': 'TB', 'nj-ny-gotham-fc': 'NJNY', 'angel-city-fc': 'ACFC', 'north-carolina-courage': 'NC', 'racing-louisville-fc': 'LOU', 'utah-royals-fc': 'UTA', 'real-salt-lake': 'RSL', 'd-c-united': 'DC', 'washington-spirit': 'WAS', 'washington-nationals': 'WSH', 'cf-montreal': 'MTL', 'new-england-revolution': 'NE', 'fc-cincinnati': 'CIN', 'fc-dallas': 'DAL', 'athletics': 'ATH', 'columbus-crew': 'CLB', 'charlotte-fc': 'CLT', 'nashville-sc': 'NSH', 'inter-miami-cf': 'MIA', 'atlanta-united': 'ATL', 'austin-fc': 'ATX', 'minnesota-united-fc': 'MIN', 'minnesota-twins': 'MIN', 'colorado-rapids': 'COL', 'colorado-rockies': 'COL', 'arizona-diamondbacks': 'ARI', 'cleveland-indians': 'CLE', 'houston-dash': 'HOU', 'chicago-red-stars': 'CHI', 'chicago-fire-fc': 'CHI', 'pittsburgh-pirates': 'PIT', 'philadelphia-phillies': 'PHI', 'philadelphia-union': 'PHI', 'portland-thorns': 'POR', 'portland-timbers': 'POR', 'seattle-reign': 'SEA', 'seattle-sounders-fc': 'SEA', 'seattle-mariners': 'SEA', 'vancouver-whitecaps-fc': 'VAN', 'toronto-fc': 'TOR', 'toronto-blue-jays': 'TOR', 'houston-dynamo-fc': 'HOU', 'houston-astros': 'HOU', 'orlando-city-sc': 'ORL', 'orlando-pride': 'ORL', 'atlanta-braves': 'ATL', 'baltimore-orioles': 'BAL', 'boston-red-sox': 'BOS', 'cincinnati-reds': 'CIN', 'detroit-tigers': 'DET', 'miami-marlins': 'MIA', 'milwaukee-brewers': 'MIL', 'texas-rangers': 'TEX' };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const loadScript = src => new Promise((ok, err) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = err; document.head.appendChild(s); });
  const svgIcon = d => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">${d}</svg>`;

  function readTeams(wrapper) {
    return [...wrapper.querySelectorAll('[data-its-team]')].map(el => {
      const a = el.querySelector('a[href]');
      const slug = el.dataset.itsSlug;
      const y = (el.dataset.itsOpened || '').match(/\d{4}/);
      return {
        s: slug, t: (el.dataset.itsTeam || '').trim(), st: el.dataset.itsStadium || '', c: el.dataset.itsCity || '',
        y: y ? y[0] : '', d: el.dataset.itsDivision || '',
        lat: parseFloat(el.dataset.itsLat), lng: parseFloat(el.dataset.itsLng),
        href: a ? a.getAttribute('href') : '/overview/' + slug, p: []
      };
    }).filter(t => t.t).sort((a, b) => a.t.localeCompare(b.t));
  }

  function init(wrapper) {
    const league = wrapper.dataset.itsLeague || '';
    const teams = readTeams(wrapper);
    if (!teams.length) return;

    const groupOf = t => league === 'MLS' ? (/^east/i.test(t.d) ? 'East' : /^west/i.test(t.d) ? 'West' : '')
      : league === 'MLB' ? (t.d.split(' ')[0] || '') : '';
    const colorOf = t => { const g = groupOf(t); return (g === 'West' || g === 'NL') ? NAVY : RED; };
    const groupLabel = g => ({ East: 'Eastern Conference', West: 'Western Conference', AL: 'American League', NL: 'National League' }[g] || g);

    const root = document.createElement('section');
    root.className = 'its-ll';
    root.innerHTML = `
      <div class="its-ll-bar">
        <span class="its-ll-count">${teams.length} ${league === 'MLB' ? 'ballparks' : 'stadiums'}</span>
        <div class="its-ll-toggle" role="tablist" aria-label="View">
          <button role="tab" data-v="list">${svgIcon('<path d="M2 4h12M2 8h12M2 12h12"/>')}List</button>
          <button role="tab" data-v="map">${svgIcon('<path d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15z"/><circle cx="8" cy="6.5" r="1.8"/>')}Map</button>
        </div>
      </div>
      <ol class="its-ll-list"></ol>
      <div class="its-ll-map" hidden><div class="its-ll-loading">Loading map…</div></div>`;
    wrapper.parentNode.insertBefore(root, wrapper);
    wrapper.style.display = 'none';

    const listEl = root.querySelector('.its-ll-list');
    const mapEl = root.querySelector('.its-ll-map');
    const preview = document.createElement('div');
    preview.className = 'its-ll-preview'; preview.setAttribute('aria-hidden', 'true');
    document.body.appendChild(preview);

    let mapDrawn = false;
    function setView(v, push) {
      root.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === v)));
      listEl.hidden = v !== 'list'; mapEl.hidden = v !== 'map';
      if (push) history.replaceState(null, '', v === 'map' ? '#map' : location.pathname + location.search);
      if (v === 'map' && !mapDrawn) { mapDrawn = true; drawMap().catch(e => { mapEl.innerHTML = '<div class="its-ll-loading">The map could not load.</div>'; console.error(e); }); }
    }
    root.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => setView(b.dataset.v, true)));

    /* ---------------- LIST ---------------- */
    function drawList() {
      listEl.innerHTML = teams.map((t, i) => `
        <li class="its-ll-row" data-i="${i}">
          <a href="${esc(t.href)}">
            <span class="its-ll-num">[${String(i + 1).padStart(2, '0')}]</span>
            <span class="its-ll-team">${esc(t.t)}</span>
            <span class="its-ll-meta">[${esc(t.st)}${t.y ? ' · ' + t.y : ''}]</span>
          </a>
          <div class="its-ll-strip">${t.p.map(u => `<img loading="lazy" src="${esc(u)}" alt="${esc(t.st)}">`).join('')}</div>
        </li>`).join('');

      const rows = [...listEl.children];
      const activate = r => rows.forEach(x => x.classList.toggle('is-active', x === r));

      if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
        rows.forEach(r => {
          const t = teams[r.dataset.i];
          // Images sit flush with the right edge of the browser, centred on the hovered row.
          const move = () => {
            const box = r.getBoundingClientRect(), edge = root.getBoundingClientRect().right - parseFloat(getComputedStyle(root).paddingRight);
            preview.style.transform = `translate(${edge - preview.offsetWidth}px, ${box.top + box.height / 2 - preview.offsetHeight / 2}px)`;
          };
          r.addEventListener('mouseenter', e => {
            const wasOn = preview.classList.contains('is-on');
            activate(r); listEl.classList.add('is-hovering');
            const room = root.getBoundingClientRect().right - parseFloat(getComputedStyle(root).paddingRight) - r.querySelector('.its-ll-meta').getBoundingClientRect().right - 32;
            const fit = Math.max(1, Math.min(3, Math.floor((room + 8) / 208)));
            preview.innerHTML = t.p.slice(0, fit).map(u => `<img src="${esc(u)}" alt="">`).join('');
            if (!wasOn) { preview.style.transition = 'none'; move(e); preview.offsetWidth; preview.style.transition = ''; }
            preview.classList.toggle('is-on', t.p.length > 0);
          });
          r.addEventListener('mousemove', move);
        });
        listEl.addEventListener('mouseleave', () => { activate(null); listEl.classList.remove('is-hovering'); preview.classList.remove('is-on'); });
        addEventListener('scroll', () => preview.classList.remove('is-on'), { passive: true });
        // Warm the image cache so the first hover is instant.
        const warm = () => teams.forEach(t => t.p.slice(0, 3).forEach(u => { const i = new Image(); i.src = u; }));
        'requestIdleCallback' in window ? requestIdleCallback(warm) : setTimeout(warm, 1500);
      } else {
        const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && activate(e.target)), { rootMargin: '-45% 0px -45% 0px' });
        rows.forEach(r => io.observe(r));
      }
    }

    /* ---------------- MAP ---------------- */
    async function drawMap() {
      if (!window.d3) await loadScript(D3);
      if (!window.topojson) await loadScript(TOPO);
      const d3 = window.d3;
      const [us, world] = await Promise.all([d3.json(US), d3.json(WORLD)]);
      const states = topojson.feature(us, us.objects.states).features.filter(f => !['02', '15', '72', '60', '66', '69', '78'].includes(f.id));
      const canada = topojson.feature(world, world.objects.countries).features.find(f => f.properties.name === 'Canada');
      const placed = teams.filter(t => isFinite(t.lat) && isFinite(t.lng));

      mapEl.innerHTML = `<svg role="img" aria-label="Map of ${esc(league)} stadiums"></svg>
        <div class="its-ll-zoom"><button data-z="in" aria-label="Zoom in">+</button><button data-z="out" aria-label="Zoom out">−</button><button data-z="reset" aria-label="Reset map">⟲</button></div>
        <div class="its-ll-legend"></div><div class="its-ll-card"></div>`;
      const W = 1200, H = 720;
      const svg = d3.select(mapEl.querySelector('svg')).attr('viewBox', `0 0 ${W} ${H}`);
      const proj = d3.geoConicEqualArea().parallels([29.5, 45.5]).rotate([96, 0])
        .fitExtent([[30, 30], [W - 30, H - 30]], { type: 'FeatureCollection', features: [...states, { type: 'Feature', geometry: { type: 'MultiPoint', coordinates: placed.map(t => [t.lng, t.lat]) } }] });
      const path = d3.geoPath(proj);

      svg.append('clipPath').attr('id', 'its-ll-clip').append('rect').attr('width', W).attr('height', H);
      const land = svg.append('g').attr('clip-path', 'url(#its-ll-clip)');
      if (canada) land.append('path').datum(canada).attr('class', 'ca').attr('d', path);
      land.append('g').selectAll('path').data(states).join('path').attr('class', 'st').attr('d', path);

      // Pins sit at the true location; labels are nudged apart where they collide.
      const R = 15;
      const nodes = placed.map(t => { const [x, y] = proj([t.lng, t.lat]); return { t, x0: x, y0: y, x, y }; });
      const sim = d3.forceSimulation(nodes).force('x', d3.forceX(d => d.x0).strength(0.3)).force('y', d3.forceY(d => d.y0).strength(0.3)).force('c', d3.forceCollide(R + 2)).stop();
      for (let i = 0; i < 200; i++) sim.tick();

      const card = mapEl.querySelector('.its-ll-card');
      const hideCard = () => card.classList.remove('is-on');
      function showCard(d, el) {
        el.parentNode.appendChild(el);
        const t = d.t, r = el.querySelector('.ring').getBoundingClientRect(), wrap = mapEl.getBoundingClientRect();
        card.innerHTML = `${t.p[0] ? `<img src="${esc(t.p[0])}" alt="">` : ''}<div><strong>${esc(t.t)}</strong><span>${esc(t.st)}</span><span class="sub">${esc(t.c)}${t.y ? ' · Opened ' + t.y : ''}</span></div>`;
        const x = r.left - wrap.left + r.width / 2, y = r.top - wrap.top, below = y < 240;
        card.style.left = Math.max(0, Math.min(x - 130, wrap.width - 260)) + 'px';
        card.style.top = (below ? y + r.height + 10 : y - 10) + 'px';
        card.classList.toggle('below', below); card.classList.add('is-on');
      }

      const pin = svg.append('g').selectAll('g').data(nodes).join('g').attr('class', 'pin')
        .attr('tabindex', 0).attr('role', 'link').attr('aria-label', d => `${d.t.t}, ${d.t.st}`)
        .style('--c', d => colorOf(d.t))
        .on('mouseenter focus', function (e, d) { showCard(d, this); })
        .on('mouseleave blur', hideCard)
        .on('click', (e, d) => { location.href = d.t.href; })
        .on('keydown', (e, d) => { if (e.key === 'Enter') location.href = d.t.href; });
      pin.append('line'); pin.append('circle').attr('class', 'dot').attr('r', 2.5);
      pin.append('circle').attr('class', 'ring').attr('r', R);
      pin.append('text').attr('dy', '0.35em').text(d => ABBR[d.t.s] || d.t.t.split(' ').pop().slice(0, 3).toUpperCase());

      function place(tf) {
        pin.each(function (d) {
          const g = d3.select(this), ax = tf.applyX(d.x0), ay = tf.applyY(d.y0);
          const lx = ax + (d.x - d.x0), ly = ay + (d.y - d.y0); // keep label offset constant on screen
          g.select('line').attr('x1', ax).attr('y1', ay).attr('x2', lx).attr('y2', ly);
          g.select('.dot').attr('cx', ax).attr('cy', ay);
          g.select('.ring').attr('cx', lx).attr('cy', ly);
          g.select('text').attr('x', lx).attr('y', ly);
        });
      }
      place(d3.zoomIdentity);

      const zoom = d3.zoom().scaleExtent([1, 8]).translateExtent([[0, 0], [W, H]])
        .filter(e => (e.type !== 'wheel') && (!e.touches || e.touches.length > 1) && !e.button)
        .on('zoom', e => { land.attr('transform', e.transform); land.selectAll('path').attr('stroke-width', 1 / e.transform.k); place(e.transform); hideCard(); });
      svg.call(zoom);
      mapEl.querySelector('[data-z=in]').onclick = () => svg.transition().call(zoom.scaleBy, 1.6);
      mapEl.querySelector('[data-z=out]').onclick = () => svg.transition().call(zoom.scaleBy, 1 / 1.6);
      mapEl.querySelector('[data-z=reset]').onclick = () => svg.transition().call(zoom.transform, d3.zoomIdentity);

      const groups = [...new Set(placed.map(groupOf))].filter(Boolean).sort();
      mapEl.querySelector('.its-ll-legend').innerHTML = groups.map(g =>
        `<span><i style="background:${g === 'West' || g === 'NL' ? NAVY : RED}"></i>${groupLabel(g)}</span>`).join('');
    }

    // Photos are optional: draw the list right away, then again once photos arrive.
    drawList();
    setView(location.hash === '#map' ? 'map' : 'list', false);
    fetch(BASE + 'photos.json').then(r => r.ok ? r.json() : {}).then(photos => {
      teams.forEach(t => { t.p = photos[t.s] || []; });
      drawList();
    }).catch(() => {});
  }

  const run = () => document.querySelectorAll('[data-its-league]').forEach(init);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', run) : run();
})();
