/* Staff console for Gramin Seva Centre.
   Runs only in the browser. Saves data.json to your GitHub repository through the GitHub API.
   The GitHub token is stored encrypted (AES-GCM, key derived from your password with PBKDF2).
   Every value shown on screen is escaped. No inline scripts (CSP-safe). */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clean(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max || 200); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(p) { return (p || 'w') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function today() { return new Date(Date.now() + 19800000).toISOString().slice(0, 10); }
  function inr(n) { return n == null ? 'Ask' : '₹' + Number(n).toLocaleString('en-IN'); }
  function digits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function arr(a) { return Array.isArray(a) ? a : []; }
  function fmtTime(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }
  var ICON_LABELS = [['identity', 'ID cards'], ['schemes', 'Government schemes'], ['certs', 'Certificates'], ['jobs', 'Jobs and exams'], ['edu', 'Education'], ['bank', 'Banking'], ['bills', 'Bills and travel'], ['land', 'Land'], ['print', 'Print'], ['health', 'Health'], ['farm', 'Farming'], ['home', 'Home'], ['shop', 'Shop'], ['star', 'General']];
  var FORM_RE = /^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i;

  /* ---------- state ---------- */
  var S = { repo: '', branch: 'main', token: null, remote: null, sha: null, draft: null, view: 'dash', loaded: false, err: '', busy: false, q: '', cat: 'all', st: 'all', lastAct: Date.now() };
  var VIEWS = {
    dash: ['Dashboard', 'Everything at a glance. Changes wait here until you press Publish.'],
    works: ['Prices and works', 'Set prices, hide works, add new ones.'],
    cats: ['Cards and categories', 'The cards on the homepage. Add more cards here.'],
    notices: ['Notices and ticker', 'Shown in the moving ticker on the website.'],
    sections: ['Homepage sections', 'Custom boxes shown on the homepage, like the proprietor card.'],
    shop: ['Shop details', 'Name, address, phone, hours and map.'],
    forms: ['Call-backs and feedback', 'Where the request forms send their messages.'],
    account: ['Account and connection', 'Password, GitHub connection and this browser.']
  };
  function guessRepo() {
    var h = location.hostname, p = location.pathname.split('/').filter(Boolean);
    if (/\.github\.io$/i.test(h) && p.length && p[0] !== 'admin') return h.split('.')[0] + '/' + p[0];
    return '';
  }
  S.repo = guessRepo();

  /* ---------- theme ---------- */
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('gsa.theme', t); } catch (e) { } themeLabel(); }
  function themeLabel() { var dark = document.documentElement.getAttribute('data-theme') === 'dark'; var b = $('#s-theme'); if (b) b.textContent = dark ? 'Light mode' : 'Dark mode'; }

  /* ---------- toast ---------- */
  var toastT = null;
  function toast(msg, bad) { var el = $('#toast'); el.textContent = msg; el.className = 'on' + (bad ? ' bad' : ''); clearTimeout(toastT); toastT = setTimeout(function () { el.className = ''; }, bad ? 6500 : 3000); }

  /* ---------- encrypted vault ---------- */
  var enc = new TextEncoder(), dec = new TextDecoder();
  function vaultKey() { return 'gsa.vault.' + S.repo; }
  function sessKey() { return 'gsa.sess.' + S.repo; }
  function draftKey() { return 'gsa.draft.' + S.repo; }
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); }
  function unb64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function deriveKey(pw, salt) {
    return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function sealToken(token, pw) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(pw, salt).then(function (k) { return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, enc.encode(token)); })
      .then(function (ct) { localStorage.setItem(vaultKey(), JSON.stringify({ v: 1, s: b64(salt), i: b64(iv), c: b64(new Uint8Array(ct)) })); });
  }
  function openToken(pw) {
    var v = null; try { v = JSON.parse(localStorage.getItem(vaultKey()) || 'null'); } catch (e) { }
    if (!v) return Promise.reject(new Error('none'));
    return deriveKey(pw, unb64(v.s)).then(function (k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(v.i) }, k, unb64(v.c)); })
      .then(function (pt) { return dec.decode(pt); }, function () { throw new Error('wrong'); });
  }

  /* ---------- GitHub ---------- */
  function friendly(st, m) {
    if (st === 401) return 'GitHub did not accept this token. Create a new token and connect again.';
    if (st === 403 || st === 429) return 'GitHub refused the request (' + (m || 'limit or permission') + '). The token needs Contents: Read and write for this repository.';
    if (st === 404) return 'Repository or file not found. Check the repository name and the token access.';
    if (st === 409) return 'The website data changed somewhere else.';
    if (st === 422) return 'GitHub rejected the update' + (m ? ': ' + m : '.');
    return m || ('GitHub error ' + st);
  }
  function gh(method, path, body, token) {
    return fetch('https://api.github.com' + path, {
      method: method,
      headers: { 'Authorization': 'Bearer ' + (token || S.token), 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store'
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(friendly(r.status, j && j.message)); e.status = r.status; throw e; }
        return j;
      });
    }, function () { throw new Error('Could not reach GitHub. Check the internet connection.'); });
  }
  function verifyToken(token) {
    return gh('GET', '/repos/' + S.repo, null, token).then(function (r) {
      if (!r.permissions || !r.permissions.push) throw new Error('This token can read but not save. Create a new token with Contents: Read and write.');
      return r;
    });
  }
  function normalize(o) {
    o = o && typeof o === 'object' ? o : {};
    var st = Object.assign({ name: '', nameBn: '', proprietor: '', proprietorBn: '', phone: '', whatsapp: '', addressLine: '', addressLineBn: '', district: '', districtBn: '', pin: '', hours: '', hoursBn: '', mapQuery: '', formEndpoint: '', defaultLang: 'en', siteUrl: '', liveBranch: 'main' }, o.settings || {});
    return {
      settings: st,
      categories: arr(o.categories).map(function (c) { return { id: String(c.id), name: String(c.name || ''), nameBn: String(c.nameBn || ''), icon: String(c.icon || 'star') }; }),
      services: arr(o.services).map(function (s) {
        return Object.assign({ note: '', noteBn: '', unit: '', unitBn: '', available: true, custom: false }, s, { price: s.price == null || s.price === '' ? null : Number(s.price) });
      }),
      notices: arr(o.notices).map(function (n) { return Object.assign({ level: 'info', until: '', active: true, text: '', textBn: '' }, n); }),
      sections: arr(o.sections).map(function (x) { return Object.assign({ title: '', titleBn: '', body: '', bodyBn: '', link: '', linkText: '', linkTextBn: '', active: true, order: 0 }, x); }),
      updatedAt: o.updatedAt || ''
    };
  }
  function fetchRemote() {
    return gh('GET', '/repos/' + S.repo + '/contents/data.json?ref=' + encodeURIComponent(S.branch)).then(function (j) {
      var txt = dec.decode(unb64(String(j.content || '').replace(/\s/g, '')));
      return { obj: normalize(JSON.parse(txt)), sha: j.sha };
    });
  }
  function putData(payload, sha) {
    return gh('PUT', '/repos/' + S.repo + '/contents/data.json', {
      message: 'Update website (' + today() + ')',
      content: b64(enc.encode(JSON.stringify(payload, null, 2))),
      sha: sha, branch: S.branch
    });
  }

  /* ---------- draft, changes, backup ---------- */
  function snapshot(o) { return JSON.stringify({ settings: o.settings, categories: o.categories, services: o.services, sections: o.sections }); }
  function dirty() { return !!(S.remote && S.draft) && snapshot(S.remote) !== snapshot(S.draft); }
  function readBackup() { try { return JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch (e) { return null; } }
  function saveBackup() { try { if (dirty()) localStorage.setItem(draftKey(), JSON.stringify({ sha: S.sha, draft: S.draft })); else localStorage.removeItem(draftKey()); } catch (e) { } }
  function touch(rerender) { saveBackup(); chrome(); if (rerender) render(); }
  function validate() {
    var d = S.draft, st = d.settings;
    if (!st.name.trim()) return 'Centre name (English) is required. See Shop details.';
    if (!st.district.trim()) return 'District is required. See Shop details.';
    if (st.phone && digits(st.phone).length !== 10) return 'Phone number must have 10 digits.';
    if (st.whatsapp && digits(st.whatsapp).length !== 10) return 'WhatsApp number must have 10 digits.';
    if (st.pin && !/^\d{6}$/.test(st.pin)) return 'PIN code must have 6 digits.';
    if (st.formEndpoint && !FORM_RE.test(st.formEndpoint)) return 'Call-back address must look like https://formspree.io/f/xxxxxxxx';
    if (d.categories.some(function (c) { return !c.name.trim(); })) return 'Every category needs an English name.';
    var ids = d.categories.map(function (c) { return c.id; });
    if (d.services.some(function (s) { return !String(s.name || '').trim() || ids.indexOf(s.catId) < 0; })) return 'Every work needs a name and a category.';
    if (d.services.some(function (s) { return s.price != null && (!isFinite(s.price) || s.price < 0); })) return 'Prices must be 0 or more.';
    if (d.sections.some(function (x) { return x.active !== false && !String(x.title || '').trim() && !String(x.titleBn || '').trim(); })) return 'A homepage section needs a title.';
    return '';
  }

  /* ---------- load and publish ---------- */
  function loadAll() {
    S.loaded = false; S.err = ''; render();
    return fetchRemote().then(function (r) {
      S.remote = r.obj; S.sha = r.sha; S.loaded = true;
      var b = readBackup();
      if (b && b.sha === r.sha && b.draft) { S.draft = normalize(b.draft); toast('Your unpublished changes were restored.'); }
      else { S.draft = clone(r.obj); try { localStorage.removeItem(draftKey()); } catch (e) { } }
      render();
    }).catch(function (e) {
      S.err = e.message;
      if (e.status === 401) { forgetSession(); showAuth('setup'); toast(e.message, true); }
      else render();
    });
  }
  function publish() {
    if (S.busy || !S.loaded) return;
    if (!dirty()) { toast('Nothing new to publish.'); return; }
    var v = validate(); if (v) { toast(v, true); return; }
    var payload = clone(S.draft); payload.updatedAt = new Date().toISOString(); payload.notices = [];
    setBusy(true);
    putData(payload, S.sha).then(function (res) {
      S.sha = res.content.sha; S.remote = clone(payload); S.draft = clone(payload);
      try { localStorage.removeItem(draftKey()); } catch (e) { }
      toast('Published. Visitors see the change within about 15 seconds.');
    }).catch(function (e) {
      if (e.status === 409 || e.status === 422) conflict(payload);
      else toast(e.message, true);
    }).then(function () { setBusy(false); render(); });
  }
  function conflict(payload) {
    return fetchRemote().then(function (latest) {
      openSheet('<h2>The website data changed somewhere else</h2><p class="sub">Someone else published a change, or you saved from another browser. Choose what to keep.</p>' +
        '<div class="foot" style="flex-direction:column;align-items:stretch">' +
        '<button type="button" class="btn pri" data-act="conf-mine">Publish my version over it</button>' +
        '<button type="button" class="btn" data-act="conf-theirs">Use the website version and drop my edits</button></div>');
      S.pending = { payload: payload, latest: latest };
    }).catch(function (e) { toast(e.message, true); });
  }
  function discard() {
    if (!dirty()) return;
    openSheet('<h2>Discard unpublished changes?</h2><p class="sub">Changes that are not published yet will be removed from this browser.</p>' +
      '<div class="foot"><button type="button" class="btn danger" data-act="discard-yes">Discard changes</button><button type="button" class="btn" data-act="sheet-close">Keep editing</button></div>');
  }
  function setBusy(on) { S.busy = on; render(); }

  /* ---------- sign in ---------- */
  var authMode = 'setup';
  function showAuth(mode) {
    authMode = mode;
    $('#app').hidden = true; $('#auth').hidden = false;
    var f = $('#au-fields'), links = $('#au-links'), btn = $('#au-btn');
    $('#au-err').textContent = '';
    if (mode === 'fb') {
      $('#au-title').textContent = 'Staff sign-in';
      $('#au-sub').textContent = 'Sign in with your staff email and password to manage notices. Notices go live within about a second.';
      f.innerHTML =
        '<div class="f"><label for="au-em">Staff email</label><input id="au-em" type="email" autocomplete="username" maxlength="120" value="' + esc(lsGet('gsa.fbemail')) + '" required></div>' +
        '<div class="f"><label for="au-pw">Password</label><input id="au-pw" type="password" autocomplete="current-password" required></div>';
      btn.textContent = 'Sign in';
      links.innerHTML = '<button type="button" class="linkb" data-act="show-gh">Manage website content with a GitHub token</button>';
      setTimeout(function () { if (!window.GSCFB && authMode === 'fb') $('#au-err').textContent = 'The live notice service has not loaded. Check the internet connection and reload this page.'; }, 8000);
    } else if (mode === 'setup') {
      $('#au-title').textContent = 'Connect your website';
      $('#au-sub').textContent = 'Paste a GitHub token once. It is stored encrypted in this browser and locked by the password you choose.';
      f.innerHTML =
        '<div class="f"><label for="au-repo">Repository</label><input id="au-repo" type="text" value="' + esc(S.repo) + '" placeholder="soliuddin/gramin-seva-centre" autocapitalize="none" spellcheck="false" autocomplete="off"></div>' +
        '<div class="f"><label for="au-branch">Branch</label><input id="au-branch" type="text" value="' + esc(S.branch) + '" autocapitalize="none" spellcheck="false"></div>' +
        '<div class="f"><label for="au-token">GitHub token</label><input id="au-token" type="password" autocomplete="off" placeholder="github_pat_…"><small>Use a fine-grained token that can access only this repository, with Contents: Read and write.</small></div>' +
        '<div class="f"><label for="au-pw">Choose an admin password</label><input id="au-pw" type="password" autocomplete="new-password"><small>At least 8 characters. You type it on each visit.</small></div>' +
        '<div class="f"><label for="au-pw2">Repeat the password</label><input id="au-pw2" type="password" autocomplete="new-password"></div>';
      btn.textContent = 'Connect and open console';
      links.innerHTML = '<span class="muted">Need a token? <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Create one on GitHub</a>.</span>' +
        (localStorage.getItem(vaultKey()) ? '<button type="button" class="linkb" data-act="show-unlock">Back to sign in</button>' : '');
    } else {
      $('#au-title').textContent = 'Welcome back';
      $('#au-sub').textContent = 'Enter your admin password to open the console.';
      f.innerHTML = '<div class="f"><label for="au-pw">Password</label><input id="au-pw" type="password" autocomplete="current-password"></div>';
      btn.textContent = 'Unlock';
      links.innerHTML = '<button type="button" class="linkb" data-act="show-setup">Forgot password? Connect again with a GitHub token</button>';
    }
    if (mode !== 'fb') links.innerHTML += '<br><button type="button" class="linkb" data-act="show-fb">Back to staff sign-in</button>' + (S.fbUser ? ' · <button type="button" class="linkb" data-act="back-app">Back to console</button>' : '');
    setTimeout(function () { var first = $('#au-form input'); if (first) first.focus(); }, 40);
  }
  function enterApp() {
    $('#auth').hidden = true; $('#app').hidden = false;
    $('#s-repo').textContent = S.token ? S.repo : 'Notices';
    $('#s-site').setAttribute('href', '../');
    if (S.token) loadAll(); else { S.view = 'notices'; render(); }
  }
  function forgetSession() { S.token = null; try { sessionStorage.removeItem(sessKey()); } catch (e) { } S.remote = null; S.draft = null; S.loaded = false; }
  function lock() { forgetSession(); closeSheet(); showAuth('unlock'); }
  function onAuth(e) {
    e.preventDefault();
    var err = $('#au-err'), btn = $('#au-btn'); err.textContent = ''; btn.disabled = true;
    var p;
    if (authMode === 'fb') {
      var em = clean($('#au-em').value, 120), pw = $('#au-pw').value;
      return fbSignInPlain(em, pw).then(function () { lsSet('gsa.fbemail', em); }).catch(function (x) {
        err.textContent = fbMsg(x);
      }).then(function () { btn.disabled = false; });
    }
    if (authMode === 'unlock') {
      p = openToken($('#au-pw').value).then(function (tok) { S.token = tok; });
    } else {
      var repo = clean($('#au-repo').value, 100), branch = clean($('#au-branch').value, 60) || 'main';
      var token = $('#au-token').value.trim(), p1 = $('#au-pw').value, p2 = $('#au-pw2').value;
      p = Promise.resolve().then(function () {
        if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('Repository must look like yourname/repo-name.');
        if (!/^[A-Za-z0-9_./-]+$/.test(branch)) throw new Error('Branch name is not valid.');
        if (!/^[A-Za-z0-9_]{20,255}$/.test(token)) throw new Error('That does not look like a GitHub token. Copy it again from GitHub.');
        if (p1.length < 8) throw new Error('The password needs at least 8 characters.');
        if (p1 !== p2) throw new Error('The two passwords do not match.');
        S.repo = repo; S.branch = branch;
        return verifyToken(token);
      }).then(function () { return sealToken(token, p1); }).then(function () {
        try { localStorage.setItem('gsa.branch.' + S.repo, S.branch); } catch (x) { }
        S.token = token;
      });
    }
    p.then(function () {
      try { sessionStorage.setItem(sessKey(), S.token); } catch (x) { }
      S.lastAct = Date.now();
      enterApp();
    }).catch(function (x) {
      if (x.message === 'wrong') err.textContent = 'That password is not correct.';
      else if (x.message === 'none') { err.textContent = 'No saved connection in this browser. Connect again.'; showAuth('setup'); }
      else err.textContent = x.message;
    }).then(function () { btn.disabled = false; });
  }

  /* ---------- rendering shell ---------- */
  function catName(id) { var c = S.draft.categories.filter(function (x) { return x.id === id; })[0]; return c ? c.name : '—'; }
  function chrome() {
    if (!S.draft) return;
    var n = S.loaded ? dirty() : false, st = $('#state');
    if (!S.loaded) { st.className = 'state'; st.textContent = S.err ? 'Could not load' : 'Loading…'; }
    else if (n) { st.className = 'state dirty'; st.textContent = 'Unpublished changes'; }
    else { st.className = 'state'; st.textContent = S.remote && S.remote.updatedAt ? 'Live · saved ' + fmtTime(S.remote.updatedAt) : 'Live'; }
    $('#btn-publish').disabled = !S.loaded || !n || S.busy;
    $('#btn-discard').disabled = !n || S.busy;
    $('#btn-publish').textContent = S.busy ? 'Publishing…' : 'Publish';
    var counts = { works: S.draft.services.length, cats: S.draft.categories.length, notices: (S.fsNotices || []).filter(function (x) { return x.active !== false; }).length, sections: S.draft.sections.filter(function (x) { return x.active !== false; }).length };
    $$('[data-cnt]').forEach(function (el) { el.textContent = counts[el.getAttribute('data-cnt')]; });
    $$('.nav [data-view]').forEach(function (b) { if (b.getAttribute('data-view') === S.view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    var v = VIEWS[S.view]; $('#p-title').textContent = v[0]; $('#p-sub').textContent = v[1];
    themeLabel();
  }
  function render() {
    if (!S.token) {
      if (!S.fbUser || $('#app').hidden) return;
      $('#view').innerHTML = S.view === 'notices' ? vNotices() : vNoGithub();
      return;
    }
    chrome();
    var view = $('#view');
    if (!S.loaded) {
      view.innerHTML = S.err ? '<div class="card empty"><p>' + esc(S.err) + '</p><div style="margin-top:12px"><button type="button" class="btn pri" data-act="reload">Try again</button></div></div>'
        : '<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
      return;
    }
    var focusId = document.activeElement && document.activeElement.id, caret = null;
    if (focusId === 'q') caret = document.activeElement.selectionStart;
    var map = { dash: vDash, works: vWorks, cats: vCats, notices: vNotices, sections: vSections, shop: vShop, forms: vForms, account: vAccount };
    view.innerHTML = map[S.view]();
    if (focusId && focusId !== 'au-pw') { var el = document.getElementById(focusId); if (el && typeof el.focus === 'function') { el.focus(); if (caret != null) try { el.setSelectionRange(caret, caret); } catch (x) { } } }
  }
  function go(v) { if (!VIEWS[v]) return; S.view = v; try { sessionStorage.setItem('gsa.view', v); } catch (e) { } closeSheet(); render(); window.scrollTo(0, 0); }

  /* ---------- views ---------- */
  function vDash() {
    var d = S.draft, st = d.settings, total = d.services.length, live = d.services.filter(function (s) { return s.available; }).length;
    var pct = total ? Math.round(live / total * 100) : 0, h = new Date(Date.now() + 19800000).getUTCHours();
    var greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    var tasks = [
      [!!digits(st.phone), 'Phone number', 'Shop details'],
      [!!digits(st.whatsapp), 'WhatsApp number', 'Shop details'],
      [!!st.addressLine, 'Village and address', 'Shop details'],
      [!!st.formEndpoint, 'Call-back and feedback emails (optional)', 'Call-backs and feedback'],
      [d.services.some(function (s) { return s.price != null; }), 'Prices entered', 'Prices and works']
    ];
    return '<div class="hero"><div style="flex:1 1 240px;min-width:0"><h2>' + esc(greet) + ', ' + esc(st.proprietor || 'there') + '</h2><p>' + esc(st.name) + ' · ' + (dirty() ? 'You have unpublished changes.' : 'Everything is published.') + '</p></div>' +
      '<div class="actions">' + (dirty() ? '<button type="button" class="btn" data-act="publish">Publish now</button>' : '') + '<a class="btn" href="../" target="_blank" rel="noopener noreferrer">View website</a></div></div>' +
      '<div class="kpis">' +
      '<button type="button" class="kpi" data-go="works"><span class="k">Works on website</span><b>' + live + ' <span class="muted" style="font-size:15px">of ' + total + '</span></b><span class="muted" style="font-size:13px">' + pct + '% visible</span></button>' +
      '<button type="button" class="kpi" data-go="notices"><span class="k">Active notices</span><b>' + (S.fsNotices || []).filter(function (x) { return x.active !== false; }).length + '</b><span class="muted" style="font-size:13px">Ticker and board</span></button>' +
      '<button type="button" class="kpi" data-go="cats"><span class="k">Cards</span><b>' + d.categories.length + '</b><span class="muted" style="font-size:13px">Homepage cards</span></button>' +
      '<button type="button" class="kpi" data-go="sections"><span class="k">Custom sections</span><b>' + d.sections.filter(function (x) { return x.active !== false; }).length + '</b><span class="muted" style="font-size:13px">Homepage boxes</span></button>' +
      '</div>' +
      '<div class="two"><div class="card"><h2>Finish setting up</h2><p class="sub">These make the website more useful to visitors.</p><ul class="checks">' +
      tasks.map(function (t) { return '<li><span class="dot' + (t[0] ? ' ok' : '') + '">' + (t[0] ? '✓' : '!') + '</span><div>' + esc(t[1]) + '<small>' + esc(t[2]) + '</small></div></li>'; }).join('') +
      '</ul></div>' +
      '<div class="card"><h2>Quick actions</h2><p class="sub">Most common tasks.</p><div class="actions" style="flex-direction:column;align-items:stretch">' +
      '<button type="button" class="btn" data-go="notices">Write a notice</button>' +
      '<button type="button" class="btn" data-act="add-work">Add a work</button>' +
      '<button type="button" class="btn" data-go="cats">Add a card</button>' +
      '<button type="button" class="btn" data-go="sections">Add a homepage section</button></div></div></div>';
  }

  function vWorks() {
    var d = S.draft, q = S.q.trim().toLowerCase();
    var list = d.services.filter(function (s) {
      if (S.cat !== 'all' && s.catId !== S.cat) return false;
      if (S.st === 'on' && !s.available) return false;
      if (S.st === 'off' && s.available) return false;
      if (S.st === 'ask' && s.price != null) return false;
      return !q || (String(s.name) + ' ' + String(s.nameBn || '')).toLowerCase().indexOf(q) >= 0;
    });
    var rows = list.map(function (s) {
      return '<tr><td><div class="nm"><b>' + esc(s.name) + (s.custom ? ' <span class="pill">New</span>' : '') + '</b><small>' + esc(s.nameBn) + '</small></div></td>' +
        '<td><span class="catp">' + esc(catName(s.catId)) + '</span></td>' +
        '<td><div class="pw"><span>₹</span><input type="number" min="0" step="1" inputmode="decimal" aria-label="Price of ' + esc(s.name) + '" data-price="' + esc(s.id) + '" value="' + (s.price == null ? '' : esc(s.price)) + '" placeholder="Ask"></div></td>' +
        '<td class="unit">' + esc(s.unit || '—') + '</td>' +
        '<td><label class="sw"><input type="checkbox" aria-label="Show on website: ' + esc(s.name) + '" data-avail="' + esc(s.id) + '"' + (s.available ? ' checked' : '') + '><i></i></label></td>' +
        '<td class="r"><button type="button" class="btn sm" data-edit="' + esc(s.id) + '">Edit</button></td></tr>';
    }).join('');
    return '<div class="toolbar">' +
      '<input class="grow" type="search" id="q" placeholder="Search works" value="' + esc(S.q) + '" aria-label="Search works">' +
      '<select data-filter="cat" aria-label="Category"><option value="all">All categories</option>' + d.categories.map(function (c) { return '<option value="' + esc(c.id) + '"' + (S.cat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<div class="seg" role="group" aria-label="Status">' + [['all', 'All'], ['on', 'On site'], ['off', 'Hidden'], ['ask', 'Ask at counter']].map(function (x) { return '<button type="button" data-st="' + x[0] + '" aria-pressed="' + (S.st === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="btn" data-act="bulk">Change prices</button>' +
      '<button type="button" class="btn pri" data-act="add-work">Add work</button></div>' +
      '<div class="tbl"><table><thead><tr><th>Work</th><th>Category</th><th>Price</th><th>Unit</th><th>On site</th><th></th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="6"><div class="empty">No works match. Try another search or filter.</div></td></tr>') + '</tbody></table></div>' +
      '<p class="muted" style="margin-top:10px;font-size:13px">Prices take effect when you press Publish. Leave a price empty to show “Ask at counter”.</p>';
  }

  function vCats() {
    var d = S.draft;
    var rows = d.categories.map(function (c, i) {
      var n = d.services.filter(function (s) { return s.catId === c.id; }).length;
      return '<div class="cat-row">' +
        '<input type="text" aria-label="Name (English)" data-cname="' + esc(c.id) + '" value="' + esc(c.name) + '" maxlength="80">' +
        '<input type="text" aria-label="Name (Bengali)" data-cnamebn="' + esc(c.id) + '" value="' + esc(c.nameBn) + '" maxlength="80">' +
        '<select aria-label="Icon" data-cicon="' + esc(c.id) + '">' + ICON_LABELS.map(function (p) { return '<option value="' + p[0] + '"' + (c.icon === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select>' +
        '<div class="ops"><span class="n">' + n + ' works</span>' +
        '<button type="button" class="icon" data-move="' + esc(c.id) + ':-1" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
        '<button type="button" class="icon" data-move="' + esc(c.id) + ':1" aria-label="Move down"' + (i === d.categories.length - 1 ? ' disabled' : '') + '>▼</button>' +
        '<button type="button" class="icon danger" data-cdel="' + esc(c.id) + '" aria-label="Delete card"' + (n ? ' disabled title="Move or delete its works first"' : '') + '>✕</button></div></div>';
    }).join('');
    return '<div class="two">' +
      '<div class="card"><h2>Cards on the homepage</h2><p class="sub">Each card is a group of works. Type to rename, choose an icon, and use the arrows to change the order. A card with no visible works is hidden from visitors.</p>' +
      '<div class="cat-row colhead"><span>English</span><span>Bengali</span><span>Icon</span><span></span></div>' +
      (rows || '<div class="empty">No cards yet.</div>') + '</div>' +
      '<div class="card"><h2>Add a card</h2><p class="sub">New cards appear at the end of the list. Then add works to it in Prices and works.</p>' +
      '<form data-form="cat" autocomplete="off">' +
      '<div class="f"><label for="c-en">Name (English)</label><input type="text" id="c-en" maxlength="80" required></div>' +
      '<div class="f"><label for="c-bn">Name (Bengali)</label><input type="text" id="c-bn" maxlength="80"></div>' +
      '<div class="f"><label for="c-icon">Icon</label><select id="c-icon">' + ICON_LABELS.map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="err" id="c-err" role="alert"></div><button type="submit" class="btn pri">Add card</button></form></div></div>';
  }

  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function fbErr(e) {
    var c = (e && e.code) || '';
    if (/permission-denied/.test(c)) return 'Your account is not on the staff list. Ask the owner to add you.';
    if (/unavailable|network/.test(c)) return 'No connection to the notice service. Try again in a moment.';
    return 'Could not save. Please try again.';
  }
  function fbMsg(x) {
    var c = (x && x.code) || '';
    var tail = c ? ' (' + c + ')' : '';
    if (c === 'not-loaded') return 'The live notice service has not loaded. Reload this page.';
    if (/unauthorized-domain/.test(c)) return 'This website address is not allowed to sign in yet. In Firebase: Authentication, Settings, Authorized domains, add soliuddin.github.io.' + tail;
    if (/operation-not-allowed/.test(c)) return 'Email and password sign-in is turned off. In Firebase: Authentication, Sign-in method, turn on Email/Password.' + tail;
    if (/too-many/.test(c)) return 'Too many attempts. Wait a few minutes and try again.';
    if (/network/.test(c)) return 'No connection. Check the internet and try again.';
    if (/invalid-api-key|app-not-authorized|configuration-not-found|api-key-not-valid/.test(c)) return 'Firebase is not set up correctly for this website.' + tail;
    if (/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(c)) return 'Email or password is not correct.' + tail;
    return 'Sign-in did not work. Please try again.' + tail;
  }
  function fbSignInPlain(em, pw) {
    if (!window.GSCFB) return Promise.reject({ code: 'not-loaded' });
    return window.GSCFB.signIn(em, pw);
  }
  function fbStart() {
    function go() {
      var F = window.GSCFB;
      if (authMode === 'fb') $('#au-err').textContent = '';
      F.onUser(function (u) {
        var was = !!S.fbUser;
        S.fbUser = u;
        if (u && $('#app').hidden) { enterApp(); return; }
        if (!u && was && !S.token) { showAuth('fb'); return; }
        chrome(); render();
      });
      F.subscribeNotices(function (list) {
        S.fsNotices = list;
        if (S.view === 'notices' || S.view === 'dash') render();
        chrome();
      });
    }
    if (window.GSCFB) go(); else window.addEventListener('gsc:fb-ready', go, { once: true });
  }
  function fbSignIn(e) {
    e.preventDefault();
    var em = clean($('#fb-em').value, 120), pw = $('#fb-pw').value, err = $('#fb-err');
    if (err) err.textContent = 'Signing in…';
    fbSignInPlain(em, pw).then(function () { lsSet('gsa.fbemail', em); }).catch(function (x) {
      var el = $('#fb-err'); if (el) el.textContent = fbMsg(x);
    });
  }
  function noticeRow(n, signed) {
    var expired = n.until && n.until < today();
    var status = expired ? '<span class="pill gray">Expired</span>' : n.active !== false ? '<span class="pill ok">Live</span>' : '<span class="pill gray">Hidden</span>';
    var acts = signed ? '<div class="acts"><label class="sw" title="Show on website"><input type="checkbox" aria-label="Show on website" data-nact="' + esc(n.id) + '"' + (n.active !== false ? ' checked' : '') + '><i></i></label>' +
      '<button type="button" class="btn sm" data-nedit="' + esc(n.id) + '">Edit</button>' +
      '<button type="button" class="btn sm danger" data-ndel="' + esc(n.id) + '">Delete</button></div>' : '';
    return '<div class="note' + (n.level === 'urgent' ? ' urg' : '') + (n.active !== false && !expired ? '' : ' off') + '">' +
      '<div><span class="pill ' + (n.level === 'urgent' ? 'bad' : 'warn') + '">' + (n.level === 'urgent' ? 'Urgent (red)' : 'Normal (yellow)') + '</span>' +
      '<p style="margin-top:6px;font-weight:700">' + esc(n.text || n.textBn) + '</p>' +
      (n.text && n.textBn ? '<p class="muted">' + esc(n.textBn) + '</p>' : '') +
      '<div class="meta">' + status + (n.until ? '<time>Until ' + esc(n.until) + '</time>' : '') + '</div></div>' + acts + '</div>';
  }
  function vNoGithub() {
    return '<div class="card"><h2>Connect GitHub for this section</h2><p class="sub">Prices, cards, sections and shop details are saved to the website through GitHub. Connect your GitHub token once to use them. Notices do not need it.</p>' +
      '<div class="actions"><button type="button" class="btn pri" data-act="connect-gh">Connect GitHub</button><button type="button" class="btn" data-act="go-notices">Go to notices</button></div></div>';
  }
  function vNotices() {
    if (!window.GSCFB) return '<div class="card"><h2>Live notices</h2><p class="sub">The live notice service could not load. Check the internet connection, then reload this page.</p></div>';
    var list = S.fsNotices, signed = !!S.fbUser;
    var head = signed
      ? '<div class="card"><div class="actions" style="justify-content:space-between"><div><h2>Signed in</h2><p class="sub" style="margin:0">' + esc(S.fbUser.email || '') + ' · Notices go live within about a second.</p></div><button type="button" class="btn sm" data-act="fb-signout">Sign out</button></div></div>'
      : '<div class="card"><h2>Sign in to manage notices</h2><p class="sub">Notices go live instantly. Sign in with your staff email and password. Only staff on the approved list can change them.</p>' +
        '<form data-form="fb-signin" autocomplete="on">' +
        '<div class="f"><label for="fb-em">Staff email</label><input type="email" id="fb-em" autocomplete="username" maxlength="120" value="' + esc(lsGet('gsa.fbemail')) + '" required></div>' +
        '<div class="f"><label for="fb-pw">Password</label><input type="password" id="fb-pw" autocomplete="current-password" required></div>' +
        '<div class="err" id="fb-err" role="alert"></div><button type="submit" class="btn pri">Sign in</button></form></div>';
    var items;
    if (list === null) items = '<div class="empty">Could not load notices. Check the internet connection and reload.</div>';
    else if (!list) items = '<div class="empty">Loading notices…</div>';
    else if (!list.length) items = '<div class="empty">No notices yet.' + (signed ? ' Write the first one on the left.' : '') + '</div>';
    else items = '<div class="nlist">' + list.map(function (n) { return noticeRow(n, signed); }).join('') + '</div>';
    var compose = signed ? '<div class="card"><h2>Write a notice</h2><p class="sub">Write in Bengali, English or both. It appears in the moving ticker on the website as soon as you save.</p>' +
      '<form data-form="notice" autocomplete="off">' +
      '<div class="f"><label for="n-bn">Bengali</label><textarea id="n-bn" maxlength="300" placeholder="যেমন: রবিবার দোকান বন্ধ থাকবে"></textarea></div>' +
      '<div class="f"><label for="n-en">English</label><textarea id="n-en" maxlength="300" placeholder="Example: Shop closed on Sunday"></textarea></div>' +
      '<div class="f"><span class="l">Type</span><div class="levels">' +
      '<label class="lvl"><input type="radio" name="lv" value="info" checked><span><i></i>Normal (yellow)</span></label>' +
      '<label class="lvl urg"><input type="radio" name="lv" value="urgent"><span><i></i>Urgent (red)</span></label></div></div>' +
      '<div class="f"><label for="n-until">Show until (optional)</label><input type="date" id="n-until" min="' + today() + '"><small>The notice hides itself after this date.</small></div>' +
      '<div class="err" id="n-err" role="alert"></div><button type="submit" class="btn pri">Add notice</button></form></div>' : '';
    var listCard = '<div class="card"><h2>All notices</h2><p class="sub">' + (list ? list.length : 0) + ' in total. Turn a notice off to hide it, or delete it.</p>' + items + '</div>';
    return head + '<div class="compose">' + compose + listCard + '</div>';
  }
  function vSections() {
    var list = S.draft.sections.slice().sort(function (a, b) { return (Number(a.order) || 0) - (Number(b.order) || 0); });
    var rows = list.map(function (x, i) {
      return '<div class="sec-row"><div><b>' + esc(x.title || x.titleBn || 'Untitled') + '</b> ' + (x.active === false ? '<span class="pill gray">Hidden</span>' : '<span class="pill ok">Shown</span>') +
        '<p>' + esc(String(x.body || x.bodyBn || '').slice(0, 140)) + '</p></div>' +
        '<div class="ops" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">' +
        '<button type="button" class="icon" data-smove="' + esc(x.id) + ':-1" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
        '<button type="button" class="icon" data-smove="' + esc(x.id) + ':1" aria-label="Move down"' + (i === list.length - 1 ? ' disabled' : '') + '>▼</button>' +
        '<label class="sw" title="Show on homepage"><input type="checkbox" aria-label="Show on homepage" data-sact="' + esc(x.id) + '"' + (x.active !== false ? ' checked' : '') + '><i></i></label>' +
        '<button type="button" class="btn sm" data-sedit="' + esc(x.id) + '">Edit</button>' +
        '<button type="button" class="btn sm danger" data-sdel="' + esc(x.id) + '">Delete</button></div></div>';
    }).join('');
    return '<div class="card"><div class="actions" style="justify-content:space-between;margin-bottom:6px"><div><h2>Homepage sections</h2><p class="sub" style="margin:0">Custom boxes like the proprietor card. They appear under the hero, in this order.</p></div>' +
      '<button type="button" class="btn pri" data-act="add-section">Add section</button></div>' +
      (rows || '<div class="empty">No sections yet. Add one, for example “Our open days” or “Special offer”.</div>') + '</div>';
  }

  function vShop() {
    var s = S.draft.settings;
    function tx(key, label, opts) {
      opts = opts || {};
      return '<div class="f"><label for="s-' + key + '">' + esc(label) + '</label><input type="text" id="s-' + key + '" data-set="' + key + '" value="' + esc(s[key]) + '" maxlength="' + (opts.max || 160) + '"' + (opts.attr || '') + '>' + (opts.hint ? '<small>' + esc(opts.hint) + '</small>' : '') + '</div>';
    }
    return '<div class="card"><h2>Identity</h2><p class="sub">How the centre appears on the website.</p><div class="grid2">' +
      tx('name', 'Centre name (English)', { max: 80 }) + tx('nameBn', 'Centre name (Bengali)', { max: 80 }) +
      tx('proprietor', 'Proprietor (English)', { max: 80 }) + tx('proprietorBn', 'Proprietor (Bengali)', { max: 80 }) + '</div>' +
      '<div class="f"><label for="s-defaultLang">Language the website opens in</label><select id="s-defaultLang" data-set="defaultLang"><option value="en"' + (s.defaultLang !== 'bn' ? ' selected' : '') + '>English</option><option value="bn"' + (s.defaultLang === 'bn' ? ' selected' : '') + '>Bengali</option></select></div></div>' +
      '<div class="card"><h2>Contact</h2><p class="sub">Shown as call and WhatsApp buttons. Enter 10 digits, no spaces.</p><div class="grid2">' +
      tx('phone', 'Phone number', { max: 14, attr: 'inputmode="numeric"' }) + tx('whatsapp', 'WhatsApp number', { max: 14, attr: 'inputmode="numeric"' }) + '</div></div>' +
      '<div class="card"><h2>Location and hours</h2><p class="sub">The map uses the place below. Check it on the website after you publish.</p><div class="grid2">' +
      tx('addressLine', 'Village and address (English)') + tx('addressLineBn', 'Village and address (Bengali)') +
      tx('district', 'District (English)') + tx('districtBn', 'District (Bengali)') + tx('pin', 'PIN code', { max: 6, attr: 'inputmode="numeric"' }) +
      tx('hours', 'Opening hours (English)', { hint: 'Example: 9:00 AM to 8:00 PM. The site shows Open now or Closed now from this.' }) + tx('hoursBn', 'Opening hours (Bengali)') + '</div>' +
      tx('mapQuery', 'Google Maps place (optional)', { hint: 'Leave empty to use the address. Type the name exactly as Google Maps shows it.' }) + '</div>' +
      '<p class="muted" style="font-size:13px;margin-top:8px">Changes here are drafts. Press Publish at the top to put them on the website.</p>';
  }

  function vForms() {
    var st = S.draft.settings, has = FORM_RE.test(st.formEndpoint || '');
    return '<div class="two"><div class="card"><div class="actions" style="justify-content:space-between;margin-bottom:6px"><h2>Email for requests</h2><span class="pill ' + (has ? 'ok' : 'warn') + '">' + (has ? 'Active' : 'Not set') + '</span></div>' +
      '<p class="sub">' + (has ? 'Call-back and feedback messages are emailed to you, with the name, mobile, work and best time.' : 'Until you add an address, the forms open WhatsApp with the message ready, so nothing is lost.') + '</p>' +
      '<div class="f"><label for="s-formEndpoint">Formspree address</label><input type="text" id="s-formEndpoint" data-set="formEndpoint" value="' + esc(st.formEndpoint) + '" placeholder="https://formspree.io/f/xxxxxxxx" maxlength="120" autocomplete="off" spellcheck="false"><small>Starts with https://formspree.io/f/. Only Formspree addresses are accepted.</small></div>' +
      '<div class="actions"><button type="button" class="btn" data-act="form-test"' + (has ? '' : ' disabled') + '>Send a test</button>' +
      '<a class="btn" href="https://formspree.io/forms" target="_blank" rel="noopener noreferrer">Open Formspree inbox</a></div>' +
      '<p id="fm-out" class="muted" style="margin-top:10px" role="status"></p></div>' +
      '<div class="card"><h2>One-time setup (free)</h2><ol style="margin:8px 0 0;padding-left:20px;display:grid;gap:8px">' +
      '<li>Go to formspree.io and create a free account, using the email where requests should arrive.</li>' +
      '<li>Click New form, name it “Call back”, and choose your email.</li>' +
      '<li>Copy the form address. It looks like https://formspree.io/f/abcdwxyz.</li>' +
      '<li>Paste it on the left, then press Publish.</li>' +
      '<li>Click the confirmation link Formspree emails you once.</li></ol></div></div>';
  }

  function vAccount() {
    return '<div class="two"><div class="card"><h2>GitHub connection</h2><p class="sub">Publishing uses a token that can change only this repository.</p>' +
      '<div class="f"><span class="l">Repository</span><input type="text" value="' + esc(S.repo) + '" readonly></div>' +
      '<div class="f"><span class="l">Branch</span><input type="text" value="' + esc(S.branch) + '" readonly></div>' +
      '<div class="actions"><button type="button" class="btn" data-act="test-conn">Test connection</button></div><p id="conn-out" class="muted" style="margin-top:10px" role="status"></p>' +
      '<hr style="border:0;border-top:1px solid var(--line);margin:18px 0">' +
      '<form data-form="token" autocomplete="off"><div class="f"><label for="a-tok">Replace the GitHub token</label><input type="password" id="a-tok" autocomplete="new-password" placeholder="Paste a new token"><small>Use this when the old token expired.</small></div>' +
      '<div class="f"><label for="a-tokpw">Your admin password</label><input type="password" id="a-tokpw" autocomplete="current-password"></div>' +
      '<div class="err" id="a-tok-err" role="alert"></div><button type="submit" class="btn">Save token</button></form></div>' +
      '<div class="card"><h2>Admin password</h2><p class="sub">Used to unlock this console in this browser.</p>' +
      '<form data-form="pw" autocomplete="off"><div class="f"><label for="a-cur">Current password</label><input type="password" id="a-cur" autocomplete="current-password"></div>' +
      '<div class="f"><label for="a-new">New password</label><input type="password" id="a-new" autocomplete="new-password"><small>At least 8 characters.</small></div>' +
      '<div class="f"><label for="a-new2">Repeat new password</label><input type="password" id="a-new2" autocomplete="new-password"></div>' +
      '<div class="err" id="a-pw-err" role="alert"></div><button type="submit" class="btn pri">Change password</button></form>' +
      '<hr style="border:0;border-top:1px solid var(--line);margin:18px 0">' +
      '<div class="actions"><button type="button" class="btn" data-act="lock">Lock now</button><button type="button" class="btn danger" data-act="forget">Forget this browser</button></div>' +
      '<p class="muted" style="margin-top:10px;font-size:13px">“Forget this browser” removes the saved token and draft here. Your website is not affected. The console also locks itself after 30 minutes without use.</p></div></div>';
  }

  /* ---------- sheets ---------- */
  function openSheet(html) {
    $('#sheetRoot').innerHTML = '<div class="scrim" data-act="sheet-close"></div><aside class="sheet" role="dialog" aria-modal="true" aria-label="Edit">' + html + '</aside>';
    setTimeout(function () { var f = $('#sheetRoot input:not([type=checkbox]),#sheetRoot select,#sheetRoot textarea'); if (f) f.focus(); }, 40);
  }
  function closeSheet() { $('#sheetRoot').innerHTML = ''; S.pending = null; }
  function optsCats(sel) { return S.draft.categories.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join(''); }

  function openWork(id) {
    var s = id ? S.draft.services.filter(function (x) { return x.id === id; })[0] : null;
    var x = s || { name: '', nameBn: '', catId: S.draft.categories[0] ? S.draft.categories[0].id : '', price: null, unit: 'per application', unitBn: '', note: '', noteBn: '', available: true };
    openSheet('<h2>' + (s ? 'Edit work' : 'Add a work') + '</h2><p class="sub">' + (s ? 'Changes are drafts. Publish to show them.' : 'A new work appears in its card on the website.') + '</p>' +
      '<form data-form="work" data-id="' + esc(s ? s.id : '') + '" autocomplete="off">' +
      '<div class="f"><label for="w-name">Name (English)</label><input type="text" id="w-name" maxlength="140" value="' + esc(x.name) + '" required></div>' +
      '<div class="f"><label for="w-bn">Name (Bengali)</label><input type="text" id="w-bn" maxlength="140" value="' + esc(x.nameBn) + '"></div>' +
      '<div class="f"><label for="w-cat">Card (category)</label><select id="w-cat">' + optsCats(x.catId) + '</select></div>' +
      '<div class="grid2"><div class="f"><label for="w-price">Price (₹)</label><input type="number" id="w-price" min="0" step="1" inputmode="decimal" value="' + (x.price == null ? '' : esc(x.price)) + '" placeholder="Empty = ask at counter"></div>' +
      '<div class="f"><label for="w-unit">Unit (English)</label><input type="text" id="w-unit" maxlength="60" value="' + esc(x.unit) + '" placeholder="per form"></div></div>' +
      '<div class="f"><label for="w-unitbn">Unit (Bengali)</label><input type="text" id="w-unitbn" maxlength="60" value="' + esc(x.unitBn) + '"></div>' +
      '<div class="grid2"><div class="f"><label for="w-note">Note (English, optional)</label><input type="text" id="w-note" maxlength="200" value="' + esc(x.note) + '"></div>' +
      '<div class="f"><label for="w-notebn">Note (Bengali, optional)</label><input type="text" id="w-notebn" maxlength="200" value="' + esc(x.noteBn) + '"></div></div>' +
      '<label class="actions" style="margin-bottom:14px"><span class="sw"><input type="checkbox" id="w-av"' + (x.available ? ' checked' : '') + '><i></i></span> Show on the website</label>' +
      '<div class="err" id="w-err" role="alert"></div>' +
      '<div class="foot"><button type="submit" class="btn pri">' + (s ? 'Save changes' : 'Add work') + '</button><button type="button" class="btn" data-act="sheet-close">Cancel</button>' +
      (s ? '<button type="button" class="btn danger" data-act="work-del" data-id="' + esc(s.id) + '" style="margin-left:auto">Delete</button>' : '') + '</div></form>');
  }
  function openNotice(id) {
    var n = (S.fsNotices || []).filter(function (x) { return x.id === id; })[0]; if (!n) return;
    openSheet('<h2>Edit notice</h2><p class="sub">Saved changes go live immediately.</p>' +
      '<form data-form="notice-edit" data-id="' + esc(n.id) + '" autocomplete="off">' +
      '<div class="f"><label for="e-bn">Bengali</label><textarea id="e-bn" maxlength="300">' + esc(n.textBn) + '</textarea></div>' +
      '<div class="f"><label for="e-en">English</label><textarea id="e-en" maxlength="300">' + esc(n.text) + '</textarea></div>' +
      '<div class="f"><span class="l">Type</span><div class="levels">' +
      '<label class="lvl"><input type="radio" name="elv" value="info"' + (n.level !== 'urgent' ? ' checked' : '') + '><span><i></i>Normal (yellow)</span></label>' +
      '<label class="lvl urg"><input type="radio" name="elv" value="urgent"' + (n.level === 'urgent' ? ' checked' : '') + '><span><i></i>Urgent (red)</span></label></div></div>' +
      '<div class="f"><label for="e-until">Show until (optional)</label><input type="date" id="e-until" value="' + esc(n.until || '') + '"></div>' +
      '<div class="err" id="e-err" role="alert"></div>' +
      '<div class="foot"><button type="submit" class="btn pri">Save changes</button><button type="button" class="btn" data-act="sheet-close">Cancel</button></div></form>');
  }
  function openSection(id) {
    var x = id ? S.draft.sections.filter(function (y) { return y.id === id; })[0] : null;
    x = x || { title: '', titleBn: '', body: '', bodyBn: '', link: '', linkText: '', linkTextBn: '', active: true, order: S.draft.sections.length + 1 };
    openSheet('<h2>' + (id ? 'Edit section' : 'Add a homepage section') + '</h2><p class="sub">Shown under the hero on the homepage. Leave a line empty to skip it. Each new line of text becomes a new paragraph.</p>' +
      '<form data-form="section" data-id="' + esc(id || '') + '" autocomplete="off">' +
      '<div class="f"><label for="x-title">Title (English)</label><input type="text" id="x-title" maxlength="80" value="' + esc(x.title) + '"></div>' +
      '<div class="f"><label for="x-titlebn">Title (Bengali)</label><input type="text" id="x-titlebn" maxlength="80" value="' + esc(x.titleBn) + '"></div>' +
      '<div class="f"><label for="x-body">Text (English)</label><textarea id="x-body" maxlength="800">' + esc(x.body) + '</textarea></div>' +
      '<div class="f"><label for="x-bodybn">Text (Bengali)</label><textarea id="x-bodybn" maxlength="800">' + esc(x.bodyBn) + '</textarea></div>' +
      '<div class="grid2"><div class="f"><label for="x-link">Button link (optional, https only)</label><input type="url" id="x-link" maxlength="300" value="' + esc(x.link) + '" placeholder="https://"></div>' +
      '<div class="f"><label for="x-linktext">Button text (English)</label><input type="text" id="x-linktext" maxlength="60" value="' + esc(x.linkText) + '"></div></div>' +
      '<label class="actions" style="margin-bottom:14px"><span class="sw"><input type="checkbox" id="x-active"' + (x.active !== false ? ' checked' : '') + '><i></i></span> Show on the homepage</label>' +
      '<div class="err" id="x-err" role="alert"></div>' +
      '<div class="foot"><button type="submit" class="btn pri">' + (id ? 'Save changes' : 'Add section') + '</button><button type="button" class="btn" data-act="sheet-close">Cancel</button>' +
      (id ? '<button type="button" class="btn danger" data-act="section-del" data-id="' + esc(id) + '" style="margin-left:auto">Delete</button>' : '') + '</div></form>');
  }
  function openBulk() {
    openSheet('<h2>Change prices in bulk</h2><p class="sub">Raises or lowers every priced work in the draft. Works set to “Ask at counter” are not changed.</p>' +
      '<form data-form="bulk" autocomplete="off">' +
      '<div class="f"><label for="b-cat">Which works</label><select id="b-cat"><option value="all">All works</option>' + optsCats('') + '</select></div>' +
      '<div class="grid2"><div class="f"><label for="b-mode">Change by</label><select id="b-mode"><option value="percent">Percent</option><option value="amount">Rupees</option></select></div>' +
      '<div class="f"><label for="b-val">Amount</label><input type="number" id="b-val" step="1" placeholder="10 or -10" required><small>Use a minus sign to lower prices.</small></div></div>' +
      '<div class="err" id="b-err" role="alert"></div>' +
      '<div class="foot"><button type="submit" class="btn pri">Apply to draft</button><button type="button" class="btn" data-act="sheet-close">Cancel</button></div></form>');
  }

  /* ---------- edits to the draft ---------- */
  function setPrice(id, raw) {
    var s = S.draft.services.filter(function (x) { return x.id === id; })[0]; if (!s) return;
    if (raw === '') { s.price = null; touch(false); return; }
    var v = Number(raw);
    if (!isFinite(v) || v < 0) { toast('Price must be 0 or more.', true); render(); return; }
    s.price = Math.round(v * 100) / 100; touch(false);
  }
  function moveItem(list, id, dir) {
    var i = list.findIndex(function (x) { return x.id === id; }), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    var t = list[i]; list[i] = list[j]; list[j] = t;
  }
  function setSectionOrder() { S.draft.sections.forEach(function (x, i) { x.order = i + 1; }); }

  /* ---------- actions ---------- */
  function act(name, el) {
    if (name === 'publish') publish();
    else if (name === 'discard') discard();
    else if (name === 'discard-yes') { S.draft = clone(S.remote); try { localStorage.removeItem(draftKey()); } catch (e) { } closeSheet(); render(); toast('Changes discarded.'); }
    else if (name === 'theme') applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    else if (name === 'lock') lock();
    else if (name === 'reload') loadAll();
    else if (name === 'sheet-close') closeSheet();
    else if (name === 'add-work') { if (!S.draft.categories.length) { toast('Add a card first.', true); go('cats'); return; } openWork(null); }
    else if (name === 'add-section') openSection(null);
    else if (name === 'bulk') openBulk();
    else if (name === 'work-del') {
      if (!confirm('Delete this work from the draft? It disappears from the website after you publish.')) return;
      S.draft.services = S.draft.services.filter(function (x) { return x.id !== el.getAttribute('data-id'); });
      closeSheet(); touch(true); toast('Work removed from the draft.');
    }
    else if (name === 'section-del') {
      if (!confirm('Delete this section?')) return;
      var sid = el.getAttribute('data-id');
      S.draft.sections = S.draft.sections.filter(function (x) { return x.id !== sid; });
      closeSheet(); touch(true); toast('Section removed from the draft.');
    }
    else if (name === 'form-test') sendFormTest();
    else if (name === 'test-conn') {
      var out = $('#conn-out'); out.textContent = 'Checking…';
      gh('GET', '/repos/' + S.repo).then(function (r) { out.textContent = 'Connected to ' + r.full_name + (r.permissions && r.permissions.push ? '. Saving is allowed.' : '. This token cannot save.'); })
        .catch(function (x) { out.textContent = x.message; });
    }
    else if (name === 'forget') {
      if (!confirm('Remove the saved token and drafts from this browser? You will need the GitHub token again to use the console here.')) return;
      try { localStorage.removeItem(vaultKey()); localStorage.removeItem(draftKey()); sessionStorage.removeItem(sessKey()); } catch (e) { }
      forgetSession(); closeSheet(); showAuth('setup');
    }
    else if (name === 'show-fb') showAuth('fb');
    else if (name === 'show-gh' || name === 'connect-gh') showAuth(localStorage.getItem(vaultKey()) ? 'unlock' : 'setup');
    else if (name === 'back-app') enterApp();
    else if (name === 'go-notices') go('notices');
    else if (name === 'show-unlock') showAuth('unlock');
    else if (name === 'show-setup') showAuth('setup');
    else if (name === 'conf-mine' || name === 'conf-theirs') {
      var p = S.pending; if (!p) return closeSheet();
      if (name === 'conf-mine') {
        setBusy(true);
        putData(p.payload, p.latest.sha).then(function (res) {
          S.sha = res.content.sha; S.remote = clone(p.payload); S.draft = clone(p.payload);
          try { localStorage.removeItem(draftKey()); } catch (e) { }
          toast('Published.');
        }).catch(function (x) { toast(x.message, true); }).then(function () { closeSheet(); setBusy(false); render(); });
      } else {
        S.remote = p.latest.obj; S.sha = p.latest.sha; S.draft = clone(p.latest.obj);
        try { localStorage.removeItem(draftKey()); } catch (e) { }
        closeSheet(); render(); toast('Loaded the website version.');
      }
    }
    else if (name === 'fb-signout') { window.GSCFB.signOut().then(function () { toast('Signed out.'); }).catch(function () { toast('Could not sign out.', true); }); }
    else if (name === 'show-recovery') { /* kept for older links */ }
  }
  function sendFormTest() {
    var ep = S.draft.settings.formEndpoint, out = $('#fm-out');
    if (!FORM_RE.test(ep || '')) { out.textContent = 'Save a valid Formspree address first.'; return; }
    out.textContent = 'Sending a test…';
    fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer',
      body: JSON.stringify({ _subject: 'TEST: call-back form', name: 'TEST from staff console', phone: '9000000000', service: 'Test', bestTime: 'Any time', message: 'This is a test.' }) })
      .then(function (r) { if (!r.ok) throw new Error('The form service answered ' + r.status + '. Check the address.'); out.textContent = 'Test sent. Check your email in a minute.'; })
      .catch(function (e) { out.textContent = e.message || 'Could not reach the form service.'; });
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target, el;
    S.lastAct = Date.now();
    if ((el = t.closest('[data-view]'))) return go(el.getAttribute('data-view'));
    if ((el = t.closest('[data-go]'))) return go(el.getAttribute('data-go'));
    if ((el = t.closest('[data-st]'))) { S.st = el.getAttribute('data-st'); return render(); }
    if ((el = t.closest('[data-edit]'))) return openWork(el.getAttribute('data-edit'));
    if ((el = t.closest('[data-nedit]'))) return openNotice(el.getAttribute('data-nedit'));
    if ((el = t.closest('[data-sedit]'))) return openSection(el.getAttribute('data-sedit'));
    if ((el = t.closest('[data-ndel]'))) {
      var nid = el.getAttribute('data-ndel');
      if (!confirm('Delete this notice? It disappears from the website immediately.')) return;
      return window.GSCFB.deleteNotice(nid).then(function () { toast('Notice deleted.'); }).catch(function (x) { toast(fbErr(x), true); });
    }
    if ((el = t.closest('[data-sdel]'))) {
      var sdid = el.getAttribute('data-sdel');
      if (!confirm('Delete this section?')) return;
      S.draft.sections = S.draft.sections.filter(function (x) { return x.id !== sdid; });
      return touch(true);
    }
    if ((el = t.closest('[data-cdel]'))) {
      if (!confirm('Delete this card?')) return;
      var cid = el.getAttribute('data-cdel');
      S.draft.categories = S.draft.categories.filter(function (c) { return c.id !== cid; });
      if (S.cat === cid) S.cat = 'all';
      return touch(true);
    }
    if ((el = t.closest('[data-move]'))) {
      var p = el.getAttribute('data-move').split(':');
      moveItem(S.draft.categories, p[0], Number(p[1]));
      return touch(true);
    }
    if ((el = t.closest('[data-smove]'))) {
      var q2 = el.getAttribute('data-smove').split(':');
      var list = S.draft.sections.slice().sort(function (a, b) { return (Number(a.order) || 0) - (Number(b.order) || 0); });
      moveItem(list, q2[0], Number(q2[1]));
      list.forEach(function (x, i) { x.order = i + 1; });
      S.draft.sections = list;
      return touch(true);
    }
    if ((el = t.closest('[data-act]'))) return act(el.getAttribute('data-act'), el);
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-price')) return setPrice(t.getAttribute('data-price'), t.value.trim());
    if (t.hasAttribute('data-avail')) { var s = S.draft.services.filter(function (x) { return x.id === t.getAttribute('data-avail'); })[0]; if (s) { s.available = t.checked; touch(true); } return; }
    if (t.hasAttribute('data-nact')) { window.GSCFB.updateNotice(t.getAttribute('data-nact'), { active: t.checked }).catch(function (x) { toast(fbErr(x), true); t.checked = !t.checked; }); return; }
    if (t.hasAttribute('data-sact')) { var x = S.draft.sections.filter(function (y) { return y.id === t.getAttribute('data-sact'); })[0]; if (x) { x.active = t.checked; touch(true); } return; }
    if (t.hasAttribute('data-filter')) { S.cat = t.value; return render(); }
    if (t.hasAttribute('data-cicon')) { var c = S.draft.categories.filter(function (y) { return y.id === t.getAttribute('data-cicon'); })[0]; if (c) { c.icon = t.value; touch(false); } return; }
    if (t.hasAttribute('data-cname')) { var c1 = S.draft.categories.filter(function (y) { return y.id === t.getAttribute('data-cname'); })[0]; if (c1) { c1.name = clean(t.value, 80); touch(false); } return; }
    if (t.hasAttribute('data-cnamebn')) { var c2 = S.draft.categories.filter(function (y) { return y.id === t.getAttribute('data-cnamebn'); })[0]; if (c2) { c2.nameBn = clean(t.value, 80); touch(false); } return; }
    if (t.hasAttribute('data-set')) { S.draft.settings[t.getAttribute('data-set')] = clean(t.value, 160); touch(false); return; }
  });

  var qT = null;
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'q') { S.q = t.value; clearTimeout(qT); qT = setTimeout(render, 150); return; }
    if (t.hasAttribute('data-set')) { S.draft.settings[t.getAttribute('data-set')] = clean(t.value, 160); saveBackup(); chrome(); return; }
    if (t.hasAttribute('data-cname')) { var c = S.draft.categories.filter(function (y) { return y.id === t.getAttribute('data-cname'); })[0]; if (c) { c.name = clean(t.value, 80); saveBackup(); chrome(); } return; }
    if (t.hasAttribute('data-cnamebn')) { var c2 = S.draft.categories.filter(function (y) { return y.id === t.getAttribute('data-cnamebn'); })[0]; if (c2) { c2.nameBn = clean(t.value, 80); saveBackup(); chrome(); } return; }
  });

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.id === 'au-form') return onAuth(e);
    if (form.getAttribute('data-form') === 'fb-signin') return fbSignIn(e);
    e.preventDefault();
    var kind = form.getAttribute('data-form'), err;
    S.lastAct = Date.now();
    if (kind === 'work') {
      var id = form.getAttribute('data-id'); err = $('#w-err');
      var o = {
        name: clean($('#w-name').value, 140), nameBn: clean($('#w-bn').value, 140), catId: $('#w-cat').value,
        price: $('#w-price').value === '' ? null : Number($('#w-price').value),
        unit: clean($('#w-unit').value, 60), unitBn: clean($('#w-unitbn').value, 60), note: clean($('#w-note').value, 200), noteBn: clean($('#w-notebn').value, 200),
        available: $('#w-av').checked
      };
      if (!o.name) { err.textContent = 'Type the work name.'; return; }
      if (o.price != null && (!isFinite(o.price) || o.price < 0)) { err.textContent = 'Price must be 0 or more.'; return; }
      if (id) Object.assign(S.draft.services.filter(function (x) { return x.id === id; })[0], o);
      else S.draft.services.push(Object.assign({ id: uid('w'), custom: true }, o));
      closeSheet(); toast(id ? 'Work updated in the draft.' : 'Work added to the draft.'); return touch(true);
    }
    if (kind === 'bulk') {
      var val = Number($('#b-val').value); err = $('#b-err');
      if (!isFinite(val) || val === 0) { err.textContent = 'Type an amount other than 0.'; return; }
      var cat = $('#b-cat').value, mode = $('#b-mode').value, n = 0;
      S.draft.services.forEach(function (s) {
        if (s.price == null || (cat !== 'all' && s.catId !== cat)) return;
        var next = mode === 'percent' ? s.price * (1 + val / 100) : s.price + val;
        s.price = Math.max(0, Math.round(next)); n++;
      });
      closeSheet(); toast(n + ' prices changed in the draft.'); return touch(true);
    }
    if (kind === 'notice') {
      var en = clean($('#n-en').value, 300), bn = clean($('#n-bn').value, 300); err = $('#n-err');
      if (!en && !bn) { err.textContent = 'Write the notice in Bengali or English.'; return; }
      if (!S.fbUser) { err.textContent = 'Sign in first.'; return; }
      var lvl = form.querySelector('input[name=lv]:checked').value;
      window.GSCFB.addNotice({ text: en, textBn: bn, level: lvl, until: $('#n-until').value, active: true })
        .then(function () { form.reset(); toast('Notice is live on the website.'); })
        .catch(function (x) { err.textContent = fbErr(x); });
      return;
    }
    if (kind === 'notice-edit') {
      var nid = form.getAttribute('data-id'), etxt = clean($('#e-en').value, 300), ebn = clean($('#e-bn').value, 300); err = $('#e-err');
      if (!etxt && !ebn) { err.textContent = 'Write the notice in Bengali or English.'; return; }
      window.GSCFB.updateNotice(nid, { text: etxt, textBn: ebn, level: form.querySelector('input[name=elv]:checked').value, until: $('#e-until').value })
        .then(function () { closeSheet(); toast('Notice updated.'); })
        .catch(function (x) { err.textContent = fbErr(x); });
      return;
    }
    if (kind === 'section') {
      var sid = form.getAttribute('data-id'); err = $('#x-err');
      var title = clean($('#x-title').value, 80), titleBn = clean($('#x-titlebn').value, 80);
      if (!title && !titleBn) { err.textContent = 'Type a title in English or Bengali.'; return; }
      var link = clean($('#x-link').value, 300);
      if (link && !/^https:\/\/[^\s"'<>]+$/i.test(link)) { err.textContent = 'The button link must start with https://'; return; }
      var data = { title: title, titleBn: titleBn, body: $('#x-body').value.slice(0, 800), bodyBn: $('#x-bodybn').value.slice(0, 800), link: link, linkText: clean($('#x-linktext').value, 60), active: $('#x-active').checked };
      if (sid) Object.assign(S.draft.sections.filter(function (x) { return x.id === sid; })[0], data);
      else { data.id = uid('x'); data.order = S.draft.sections.length + 1; S.draft.sections.push(data); }
      setSectionOrder(); closeSheet(); toast(sid ? 'Section updated in the draft.' : 'Section added to the draft.'); return touch(true);
    }
    if (kind === 'cat') {
      var en2 = clean($('#c-en').value, 80), bn2 = clean($('#c-bn').value, 80); err = $('#c-err');
      if (!en2) { err.textContent = 'Type the English name.'; return; }
      S.draft.categories.push({ id: 'c' + uid(''), name: en2, nameBn: bn2, icon: $('#c-icon').value });
      toast('Card added. Now add works to it.'); return touch(true);
    }
    if (kind === 'token') {
      var tok = $('#a-tok').value.trim(), tpw = $('#a-tokpw').value, er = $('#a-tok-err');
      if (!tok) { er.textContent = 'Paste the new token.'; return; }
      er.textContent = 'Checking…';
      openToken(tpw).then(function () { return verifyToken(tok); }).then(function () { return sealToken(tok, tpw); }).then(function () {
        S.token = tok; try { sessionStorage.setItem(sessKey(), tok); } catch (x) { }
        toast('Token saved.'); render();
      }).catch(function (x) { er.textContent = x.message === 'wrong' ? 'Your admin password is not correct.' : x.message; });
      return;
    }
    if (kind === 'pw') {
      var cur = $('#a-cur').value, n1 = $('#a-new').value, n2 = $('#a-new2').value, pe = $('#a-pw-err');
      if (n1.length < 8) { pe.textContent = 'Use at least 8 characters.'; return; }
      if (n1 !== n2) { pe.textContent = 'The two passwords do not match.'; return; }
      openToken(cur).then(function (tok) { return sealToken(tok, n1); }).then(function () { toast('Password changed.'); render(); })
        .catch(function (x) { pe.textContent = x.message === 'wrong' ? 'Current password is not correct.' : x.message; });
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    S.lastAct = Date.now();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !$('#app').hidden) { e.preventDefault(); publish(); }
    if (e.key === 'Escape') closeSheet();
  });
  document.addEventListener('pointermove', function () { S.lastAct = Date.now(); }, { passive: true });
  window.addEventListener('beforeunload', function (e) { if (S.token && dirty()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- auto lock after 30 minutes without use ---------- */
  setInterval(function () {
    if (S.token && Date.now() - S.lastAct > 30 * 60 * 1000) { lock(); toast('Locked after 30 minutes without use. Your unpublished changes are kept.'); }
  }, 30000);

  /* ---------- start ---------- */
  (function start() {
    themeLabel();
    var saved = null; try { saved = localStorage.getItem('gsa.theme'); } catch (e) { }
    if (saved) applyTheme(saved);
    fbStart();
    var savedBranch = null; try { savedBranch = localStorage.getItem('gsa.branch.' + S.repo); } catch (e) { }
    if (savedBranch) S.branch = savedBranch;
    try { var v = sessionStorage.getItem('gsa.view'); if (v && VIEWS[v]) S.view = v; } catch (e) { }
    var tok = null; try { tok = sessionStorage.getItem(sessKey()); } catch (e) { }
    if (tok) { S.token = tok; enterApp(); return; }
    showAuth('fb');
  })();
})();
