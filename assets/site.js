/* Gramin Seva Centre: site behaviour for the home, call-back and feedback pages.
   Content comes from data.json. Live notices come from Firestore when the live service is available.
   Every value taken from data is escaped before it reaches the page. */
(function () {
  'use strict';

  var PAGE = (document.body && document.body.getAttribute('data-page')) || 'home';
  var COOLDOWN_MS = 30000;
  var POLL_MS = 15000;
  var FORMSPREE_RE = /^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i;
  var LOADED = Date.now();
  var X = {
    en: {
      nav_feedback: 'Feedback', nav_callback: 'Call back', learn: 'Learn more', until: 'Until',
      cb_open: 'Open the call-back form', fb_open: 'Write your feedback', cb_back: 'Back to home', fb_back: 'Back to home',
      fb_empty2: 'Please write a few words.', cb_fab: 'Call back', page_cb: 'Ask for a call back', page_fb: 'Share your feedback'
    },
    bn: {
      nav_feedback: 'মতামত', nav_callback: 'ফোন করতে বলুন', learn: 'আরও জানুন', until: 'পর্যন্ত',
      cb_open: 'ফোন করতে বলার ফর্ম খুলুন', fb_open: 'আপনার মতামত লিখুন', cb_back: 'হোমে ফিরে যান', fb_back: 'হোমে ফিরে যান',
      fb_empty2: 'কয়েকটি কথা লিখুন।', cb_fab: 'ফোন করতে বলুন', page_cb: 'ফোন করতে বলুন', page_fb: 'মতামত জানান'
    }
  };

  var T = {
    en: {
      trust_e: 'Why trust us', trust_h: 'Our promise to you',
      tr1_t: 'Prices shown openly', tr1_p: 'Every service charge is listed here before you come. No surprises at the counter.',
      tr2_t: 'Government fees at cost', tr2_p: 'Official fees are paid as they are charged. We never add them to our price.',
      tr3_t: 'Your papers stay safe', tr3_p: 'We use your documents only for the work you asked for, and we do not keep copies.',
      tr4_t: 'We explain before we act', tr4_p: 'You will know the steps and the cost before any work starts.',
      fb_e: 'Your opinion', fb_h: 'Share your feedback', fb_p: 'Tell us how we did, or what we can do better. Every comment is read.',
      fb_rate: 'How was your visit?', fb_msg: 'Your comments', fb_name: 'Your name (optional)', fb_send: 'Send feedback',
      fb_thanks: 'Thank you. Your feedback has reached us.', fb_empty: 'Please write a few words.',
      rates_tip: 'Tap a category above to filter. Government fees are extra.',
      nav_services: 'Services', nav_rates: 'Rates', nav_notices: 'Notices', nav_contact: 'Visit us', nav_trust: 'Why trust us', ft_tag: 'A trusted village service centre for forms, certificates and online work.', ft_quick: 'Quick links', ft_contact: 'Contact & visit', ft_hours: 'Opening hours', ft_wa: 'Message us on WhatsApp', ft_top: 'Back to top ↑',
      eyebrow: 'Common Service Centre · Murshidabad',
      h1: 'Every government and online work, right here in your village.',
      lead: 'Aadhaar, PAN, job forms, scholarships, certificates, banking and printing. One counter, clear prices.',
      cta_rates: 'See the rates', cta_wa: 'WhatsApp us', cta_cb: 'Get a call back',
      proprietor: 'Proprietor', address: 'Address', hours: 'Hours', phone: 'Phone', d_call: 'Call now',
      open_now: 'Open now', closed_now: 'Closed now',
      st_services: 'Services we do', st_cats: 'Kinds of work', st_from: 'Prices start from',
      svc_e: 'What we do', svc_h: 'Work we do for you', svc_p: 'Tap a card to see its rates.', n_svc: function (n) { return n + (n === 1 ? ' service' : ' services'); }, see_rates: 'See rates',
      how_e: 'Simple steps', how_h: 'How it works',
      how1_t: 'Call or message', how1_p: 'Tell us the work by call or WhatsApp. We tell you which papers are needed.',
      how2_t: 'Come with papers', how2_p: 'Bring the originals and the mobile linked to your Aadhaar.',
      how3_t: 'We do the online work', how3_p: 'We fill in and submit the form on the official portal for you.',
      how4_t: 'Take your copy', how4_p: 'Collect your acknowledgement or printout and know the next step.',
      rates_e: 'Rate list', rates_h: 'Services and rates', rates_p: 'Government fees are extra and paid at actual cost. Prices below are our service charge.',
      search_ph: 'Search a service, like Aadhaar or scholarship', all: 'All', none: 'Nothing found. Try another word.',
      ask: 'Ask at counter', free: 'Free', print: 'Print rate list', custom: 'New', wa_ask: 'Hello, I want to know about', ask_wa: 'Ask on WhatsApp',
      bring_e: 'Before you come', bring_h: 'What to bring', b1: 'Original Aadhaar card', b2: 'Mobile number linked to Aadhaar (the OTP comes to it)', b3: 'Passport-size photos', b4: 'Bank passbook and the documents your work needs',
      why_e: 'Why come to us', why_h: 'Simple, honest service',
      why1_t: 'Clear prices', why1_p: 'The rate list is open for everyone. Ask about anything you do not understand.',
      why2_t: 'In your own language', why2_p: 'We explain every step in simple Bengali or English.',
      why3_t: 'One counter', why3_p: 'Aadhaar, PAN, forms, bills and printing in one place.',
      notices_e: 'From the counter', notices_h: 'Notice board', notice_label: 'Notice', notice_urgent: 'Urgent', tk_pause: 'Pause or play notices',
      visit_e: 'Find us', visit_h: 'Visit our centre', visit_p: 'See us on the map, call, message on WhatsApp, or ask for a call back.',
      map_wait: 'The map is loading. If it does not appear, use the buttons below.', map_dir: 'Get directions', map_open: 'Open in Google Maps', wa_btn: 'Message on WhatsApp',
      cb_h: 'Ask for a call back', cb_p: 'Leave your number and the work you need. We will call you.',
      f_name: 'Your name', f_phone: 'Mobile number', f_svc: 'Which work', f_time: 'Best time to call', f_msg: 'Message (optional)',
      f_send: 'Send request', f_send_wa: 'Send on WhatsApp', other: 'Other work',
      t_any: 'Any time', t_morning: 'Morning', t_noon: 'Afternoon', t_eve: 'Evening',
      e_name: 'Please enter your name.', e_phone: 'Enter a valid 10-digit mobile number.', sending: 'Sending...', e_wait: 'Please wait a few seconds before sending again.',
      e_fail: 'Could not send. Please call us instead.',
      done_h: 'Request ready', done_ep: 'Your request has reached us. We will call you soon.',
      done_wa: 'WhatsApp opened with your message. Press Send there and we will call you.', done_again: 'Send another request', open_wa: 'Open WhatsApp again',
      cb_off: 'Online requests are not switched on yet. Please call us or visit the centre.',
      wm_title: 'Call back request', wm_name: 'Name', wm_phone: 'Mobile', wm_svc: 'Work', wm_time: 'Best time', wm_msg: 'Message',
      disclaimer: 'Government fees and portal rules can change. Please confirm at the counter before you come.',
      owner: 'Proprietor', other_lang: 'বাংলা', wa_text: 'Hello, I would like to ask about a service.',
      to_dark: 'Switch to dark mode', to_light: 'Switch to light mode', to_top: 'Back to top'
    },
    bn: {
      trust_e: 'আমাদের উপর কেন ভরসা', trust_h: 'আপনার জন্য আমাদের প্রতিশ্রুতি',
      tr1_t: 'দাম খোলাখুলি দেখানো', tr1_p: 'আসার আগে আমাদের সেবার চার্জ এখানেই দেখে নিন। কাউন্টারে কোনো অপ্রত্যাশিত খরচ নেই।',
      tr2_t: 'সরকারি ফি আসল খরচে', tr2_p: 'সরকারি ফি যা লাগে তাই দিতে হয়। আমরা তার সঙ্গে নিজের দাম যোগ করি না।',
      tr3_t: 'আপনার নথি নিরাপদ', tr3_p: 'আপনার চাওয়া কাজের বাইরে নথি ব্যবহার করি না, কোনো কপিও রাখি না।',
      tr4_t: 'কাজের আগে বুঝিয়ে বলি', tr4_p: 'কাজ শুরুর আগেই ধাপ আর খরচ জেনে নেবেন।',
      fb_e: 'আপনার মতামত', fb_h: 'মতামত জানান', fb_p: 'আমরা কেমন সেবা দিলাম, বা কী ভালো হতে পারে জানান। প্রতিটি মন্তব্য পড়া হয়।',
      fb_rate: 'আপনার আসা কেমন ছিল?', fb_msg: 'আপনার মন্তব্য', fb_name: 'আপনার নাম (ঐচ্ছিক)', fb_send: 'মতামত পাঠান',
      fb_thanks: 'ধন্যবাদ। আপনার মতামত আমাদের কাছে পৌঁছেছে।', fb_empty: 'কয়েকটি কথা লিখুন।',
      rates_tip: 'উপরের বিভাগে চাপ দিয়ে ফিল্টার করুন। সরকারি ফি আলাদা।',
      nav_services: 'কাজ', nav_rates: 'সেবার দাম', nav_notices: 'নোটিশ', nav_contact: 'আমাদের ঠিকানা', nav_trust: 'আমাদের উপর ভরসা', ft_tag: 'ফর্ম, সার্টিফিকেট ও অনলাইন কাজের জন্য একটি বিশ্বস্ত গ্রামীণ সেবা কেন্দ্র।', ft_quick: 'দ্রুত লিংক', ft_contact: 'যোগাযোগ ও ঠিকানা', ft_hours: 'খোলার সময়', ft_wa: 'হোয়াটসঅ্যাপে বার্তা দিন', ft_top: 'উপরে যান ↑',
      eyebrow: 'কমন সার্ভিস সেন্টার · মুর্শিদাবাদ',
      h1: 'সরকারি ও অনলাইনের সব কাজ, আপনার গ্রামেই।',
      lead: 'আধার, প্যান, চাকরির ফর্ম, স্কলারশিপ, সার্টিফিকেট, ব্যাঙ্কিং আর প্রিন্ট। সব কাজ এক জায়গায়, স্পষ্ট দামে।',
      cta_rates: 'সেবার দাম দেখুন', cta_wa: 'হোয়াটসঅ্যাপ করুন', cta_cb: 'ফোন করতে বলুন',
      proprietor: 'স্বত্বাধিকারী', address: 'ঠিকানা', hours: 'সময়', phone: 'ফোন', d_call: 'এখনই ফোন করুন',
      open_now: 'এখন খোলা', closed_now: 'এখন বন্ধ',
      st_services: 'কাজ করি', st_cats: 'ধরনের কাজ', st_from: 'দাম শুরু',
      svc_e: 'আমরা কী করি', svc_h: 'আপনার জন্য যে কাজ করি', svc_p: 'কার্ডে চাপ দিয়ে দাম দেখুন।', n_svc: function (n) { return n + 'টি কাজ'; }, see_rates: 'দাম দেখুন',
      how_e: 'সহজ কয়েক ধাপ', how_h: 'কাজ কীভাবে হয়',
      how1_t: 'ফোন বা মেসেজ করুন', how1_p: 'ফোন বা হোয়াটসঅ্যাপে কাজের কথা বলুন। কোন কাগজ লাগবে আমরা জানিয়ে দেব।',
      how2_t: 'কাগজপত্র নিয়ে আসুন', how2_p: 'আসল নথি আর আধারের সঙ্গে যুক্ত মোবাইল সঙ্গে আনুন।',
      how3_t: 'অনলাইনের কাজ আমরা করি', how3_p: 'সরকারি পোর্টালে ফর্ম পূরণ ও জমা আমরা করে দিই।',
      how4_t: 'আপনার কপি নিয়ে যান', how4_p: 'প্রাপ্তিস্বীকার বা প্রিন্ট হাতে নিন, পরের ধাপও জেনে নিন।',
      rates_e: 'দামের তালিকা', rates_h: 'সেবা ও দাম', rates_p: 'সরকারি ফি আলাদা, আসল খরচে দিতে হবে। নিচের দাম আমাদের সার্ভিস চার্জ।',
      search_ph: 'কাজের নাম লিখুন, যেমন আধার বা স্কলারশিপ', all: 'সব', none: 'কিছু পাওয়া যায়নি। অন্য নামে খুঁজুন।',
      ask: 'কাউন্টারে জানুন', free: 'বিনামূল্যে', print: 'দামের তালিকা প্রিন্ট করুন', custom: 'নতুন', wa_ask: 'হ্যালো, এই কাজের বিষয়ে জানতে চাই', ask_wa: 'হোয়াটসঅ্যাপে জিজ্ঞাসা করুন',
      bring_e: 'আসার আগে', bring_h: 'আসার সময় সঙ্গে আনুন', b1: 'আসল আধার কার্ড', b2: 'আধারের সঙ্গে যুক্ত মোবাইল (OTP সেই নম্বরে আসবে)', b3: 'পাসপোর্ট সাইজ ছবি', b4: 'ব্যাঙ্ক পাসবুক ও কাজের জন্য দরকারি অন্য নথি',
      why_e: 'কেন আমাদের কাছে', why_h: 'সহজ ও সৎ পরিষেবা',
      why1_t: 'স্পষ্ট দাম', why1_p: 'দামের তালিকা সবার জন্য খোলা। যা বুঝতে পারছেন না, জিজ্ঞাসা করুন।',
      why2_t: 'নিজের ভাষায়', why2_p: 'প্রতিটি ধাপ সহজ বাংলা বা ইংরেজিতে বুঝিয়ে দিই।',
      why3_t: 'এক ছাদের নিচে', why3_p: 'আধার, প্যান, ফর্ম, বিল আর প্রিন্ট এক জায়গায়।',
      notices_e: 'কাউন্টার থেকে', notices_h: 'নোটিশ বোর্ড', notice_label: 'নোটিশ', notice_urgent: 'জরুরি', tk_pause: 'নোটিশ থামান বা চালান',
      visit_e: 'আমাদের খুঁজে নিন', visit_h: 'আমাদের কেন্দ্রে আসুন', visit_p: 'ম্যাপে দেখুন, ফোন করুন, হোয়াটসঅ্যাপে মেসেজ করুন, বা ফোন করতে বলুন।',
      map_wait: 'ম্যাপ লোড হচ্ছে। না এলে নিচের বোতাম ব্যবহার করুন।', map_dir: 'রাস্তা দেখুন', map_open: 'গুগল ম্যাপে খুলুন', wa_btn: 'হোয়াটসঅ্যাপে মেসেজ করুন',
      cb_h: 'ফোন করতে বলুন', cb_p: 'আপনার নম্বর আর কী কাজ লাগবে লিখে দিন। আমরা ফোন করব।',
      f_name: 'আপনার নাম', f_phone: 'মোবাইল নম্বর', f_svc: 'কোন কাজ', f_time: 'ফোনের ভালো সময়', f_msg: 'বার্তা (না লিখলেও চলবে)',
      f_send: 'অনুরোধ পাঠান', f_send_wa: 'হোয়াটসঅ্যাপে পাঠান', other: 'অন্য কাজ',
      t_any: 'যেকোনো সময়', t_morning: 'সকাল', t_noon: 'দুপুর', t_eve: 'সন্ধ্যা',
      e_name: 'আপনার নাম লিখুন।', e_phone: '১০ সংখ্যার সঠিক মোবাইল নম্বর দিন।', sending: 'পাঠানো হচ্ছে...', e_wait: 'আবার পাঠানোর আগে কয়েক সেকেন্ড অপেক্ষা করুন।',
      e_fail: 'পাঠানো যায়নি। দয়া করে ফোন করুন।',
      done_h: 'অনুরোধ তৈরি', done_ep: 'আপনার অনুরোধ পৌঁছে গেছে। আমরা শীঘ্রই ফোন করব।',
      done_wa: 'আপনার বার্তা সহ হোয়াটসঅ্যাপ খুলেছে। সেখানে Send চাপুন, আমরা ফোন করব।', done_again: 'আরেকটি অনুরোধ পাঠান', open_wa: 'আবার হোয়াটসঅ্যাপ খুলুন',
      cb_off: 'অনলাইন অনুরোধ এখনো চালু হয়নি। দয়া করে ফোন করুন বা কেন্দ্রে আসুন।',
      wm_title: 'ফোন করার অনুরোধ', wm_name: 'নাম', wm_phone: 'মোবাইল', wm_svc: 'কাজ', wm_time: 'ভালো সময়', wm_msg: 'বার্তা',
      disclaimer: 'সরকারি ফি ও পোর্টালের নিয়ম বদলাতে পারে। আসার আগে কাউন্টারে নিশ্চিত হয়ে নিন।',
      owner: 'স্বত্বাধিকারী', other_lang: 'English', wa_text: 'হ্যালো, একটি কাজের বিষয়ে জানতে চাই।',
      to_dark: 'রাতের মোডে যান', to_light: 'দিনের মোডে যান', to_top: 'উপরে যান'
    }
  };

  /* ---------- helpers ---------- */
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  var small = !!(window.matchMedia && window.matchMedia('(max-width: 640px)').matches);
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var D = null, LIVE = null, lang = 'en', cat = 'all', q = '', lastJson = '', cardsShown = false, counted = false, statsSeen = false, lastWaLink = '', fbRating = 0;
  var ICONS = { identity: 1, schemes: 1, certs: 1, jobs: 1, edu: 1, bank: 1, bills: 1, land: 1, print: 1, health: 1, farm: 1, home: 1, shop: 1 };
  var FALLBACK_TICK = { en: ['Aadhaar', 'PAN card', 'Voter card', 'Scholarship', 'Job forms', 'Certificates', 'Banking', 'Bill payment', 'Land records', 'Printing'], bn: ['আধার', 'প্যান কার্ড', 'ভোটার কার্ড', 'স্কলারশিপ', 'চাকরির ফর্ম', 'সার্টিফিকেট', 'ব্যাঙ্কিং', 'বিল জমা', 'জমির নথি', 'প্রিন্ট'] };

  function $(s) { return document.querySelector(s); }
  function $all(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); }
  function setText(id, v) { var el = $(id); if (el) el.textContent = v; }
  function setAttr(id, name, v) { var el = $(id); if (el) el.setAttribute(name, v); }
  function show(id, yes) { var el = $(id); if (el) el.hidden = !yes; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function t(k) {
    var sources = [T[lang], T.en, X[lang], X.en];
    for (var i = 0; i < sources.length; i++) { var v = sources[i] && sources[i][k]; if (v != null) return v; }
    return k;
  }
  function pick(en, bn) { return lang === 'bn' && bn ? bn : (en || bn || ''); }
  function alt(en, bn) { return lang === 'bn' ? en : bn; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } return v; }
  function inr(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
  function digitsOf(p) { return String(p || '').replace(/\D/g, ''); }
  function tel(p) { var d = digitsOf(p); return d.length === 10 ? '+91' + d : (d ? '+' + d : ''); }
  function wa(p) { var d = digitsOf(p); return d.length === 10 ? '91' + d : d; }
  function waLink(text) { var n = wa(D && D.settings.whatsapp); return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(text || t('wa_text')) : ''; }
  function icoFor(id) { return ICONS[id] ? 'c-' + id : 'c-star'; }
  function safeLink(v) { v = String(v || '').trim(); return /^https:\/\/[^\s"'<>]+$/i.test(v) ? v : ''; }
  function todayIST() { return new Date(Date.now() + 19800000).toISOString().slice(0, 10); }
  function cleanPhone(v) {
    var d = digitsOf(v);
    if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
    if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : '';
  }
  function fieldErr(el, text, field) { if (!el) return; el.className = 'msg err'; el.textContent = text; if (field && field.focus) field.focus(); }
  function formMode() {
    var s = D && D.settings; if (!s) return 'wa';
    if (FORMSPREE_RE.test(s.formEndpoint || '')) return 'ep';
    return wa(s.whatsapp) ? 'wa' : 'off';
  }

  /* ---------- theme and language ---------- */
  function themeNow() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function themeLabel() { var b = $('#theme'); if (!b) return; var txt = t(themeNow() === 'dark' ? 'to_light' : 'to_dark'); b.setAttribute('aria-label', txt); b.title = txt; }
  function setTheme(th) {
    document.documentElement.setAttribute('data-theme', th); store('gsc_theme', th);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = th === 'dark' ? '#0B2A1B' : '#1F7A4D';
    themeLabel();
  }
  function buildH1() {
    var h = $('#h1'); if (!h) return;
    var words = t('h1').split(/\s+/).filter(Boolean), n = words.length;
    h.innerHTML = words.map(function (w, i) { return '<span class="w' + (i === n - 1 ? ' hl' : '') + '" style="--i:' + i + '">' + esc(w) + '</span>'; }).join(' ');
  }
  function applyStatic(refreshOnly) {
    document.documentElement.lang = lang;
    $all('[data-i]').forEach(function (el) { var v = t(el.getAttribute('data-i')); if (typeof v === 'string') el.textContent = v; });
    $all('[data-ph]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-ph'))); });
    var lb = $('#lang'); if (lb) { lb.textContent = t('other_lang'); lb.setAttribute('aria-label', lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'); }
    var tu = $('#to-top'); if (tu) tu.setAttribute('aria-label', t('to_top'));
    if (!refreshOnly && PAGE === 'home') buildH1();
    themeLabel(); renderTicker(); fillTime(); updateCbButton(); updateNumbers();
  }
  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function numText(n) { return lang === 'bn' ? String(n).replace(/\d/g, function (d) { return BN_DIGITS[Number(d)]; }) : String(n); }
  function updateNumbers() { $all('[data-n]').forEach(function (el) { el.textContent = numText(el.getAttribute('data-n')); }); }
  function updateCbButton() { var b = $('#cb-btn-t'); if (b) b.textContent = formMode() === 'ep' ? t('f_send') : t('f_send_wa'); }

  /* ---------- data helpers ---------- */
  function normalize(d) {
    if (!d || typeof d !== 'object' || !d.settings || typeof d.settings !== 'object' || !Array.isArray(d.services)) throw new Error('bad data');
    d.categories = Array.isArray(d.categories) ? d.categories : [];
    d.notices = Array.isArray(d.notices) ? d.notices : [];
    d.sections = Array.isArray(d.sections) ? d.sections : [];
    return d;
  }
  function parseData(txt) { return normalize(JSON.parse(txt)); }
  function liveRepo() {
    var h = location.hostname;
    if (!/\.github\.io$/i.test(h)) return '';
    var seg = location.pathname.split('/').filter(Boolean)[0];
    return seg ? h.split('.')[0] + '/' + seg : '';
  }
  function fromPages(first) {
    // The first load may use the browser cache; later checks always ask for a fresh copy.
    var req = first ? fetch('data.json', { credentials: 'omit' }) : fetch('data.json?t=' + Date.now(), { cache: 'no-store', credentials: 'omit' });
    return req.then(function (r) { if (!r.ok) throw new Error('http'); return r.text(); });
  }
  /* After the first load, read the copy in the GitHub repository, so a new publish shows within seconds
     rather than waiting for GitHub Pages to rebuild. If that fails, use the normal file. */
  function fromLive(s) {
    var repo = liveRepo(); if (!repo) return fromPages();
    var url = 'https://raw.githubusercontent.com/' + repo + '/' + encodeURIComponent(s.liveBranch || 'main') + '/data.json?t=' + Date.now();
    return fetch(url, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.text(); })
      .then(function (txt) { parseData(txt); return txt; })
      .catch(function () { return fromPages(); });
  }
  function visibleServices() { return D.services.filter(function (s) { return s.available !== false; }); }
  function visibleNotices() {
    var src = LIVE !== null ? LIVE : (D && D.notices) || [], today = todayIST();
    return src.filter(function (n) { return n && n.active !== false && (!n.until || n.until >= today); })
      .sort(function (a, b) { return (b.createdAt || '') > (a.createdAt || '') ? 1 : -1; });
  }
  function mapQuery(s) { return (s.mapQuery && String(s.mapQuery).trim()) || [s.name, s.addressLine, s.district, s.pin].filter(Boolean).join(', '); }
  function openState(hours) {
    var m = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*(?:to|-|–|—|till|until)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i.exec(String(hours || ''));
    if (!m) return null;
    function mins(h, mi, ap) { h = Number(h) % 12; if (/pm/i.test(ap)) h += 12; return h * 60 + Number(mi || 0); }
    var a = mins(m[1], m[2], m[3]), b = mins(m[4], m[5], m[6]);
    var n = new Date(Date.now() + 19800000), now = n.getUTCHours() * 60 + n.getUTCMinutes();
    return a < b ? (now >= a && now < b) : (now >= a || now < b);
  }

  /* ---------- shop details (every page) ---------- */
  function renderShop() {
    if (!D) return;
    var s = D.settings, name = pick(s.name, s.nameBn), other = alt(s.name, s.nameBn), sub = other && other !== name ? other : '';
    setText('#b-name', name); setText('#b-sub', sub); setText('#bd-name', name); setText('#bd-sub', sub); setText('#ft-brand', name);
    if (PAGE === 'home') document.title = (s.name || 'Gramin Seva Centre') + (s.nameBn ? ' · ' + s.nameBn : '');
    var addr = [pick(s.addressLine, s.addressLineBn), pick(s.district, s.districtBn), s.pin ? 'PIN ' + s.pin : ''].filter(Boolean).join(', ');
    var hours = pick(s.hours, s.hoursBn);
    setText('#bd-prop', pick(s.proprietor, s.proprietorBn)); setText('#bd-addr', addr); setText('#bd-hours', hours);
    setText('#v-addr', addr); setText('#v-hours', hours);
    setText('#ft-name', '© ' + new Date().getFullYear() + ' ' + name + ' · ' + t('owner') + ': ' + pick(s.proprietor, s.proprietorBn));
    setText('#ft-addr', addr); setText('#ft-hours', hours || '—'); show('#ft-addr-li', !!addr);
    setText('#ft-phone', s.phone || ''); setAttr('#ft-phone', 'href', tel(s.phone) ? 'tel:' + tel(s.phone) : '#'); show('#ft-phone-li', !!tel(s.phone));
    var fwn = wa(s.whatsapp);
    setAttr('#ft-wa-btn', 'href', fwn ? 'https://wa.me/' + fwn : '#'); show('#ft-wa-btn', !!fwn);
    var os = openState(s.hours), ob = $('#openbadge');
    if (ob) { if (os == null) ob.hidden = true; else { ob.hidden = false; ob.className = 'openbadge' + (os ? '' : ' closed'); ob.textContent = t(os ? 'open_now' : 'closed_now'); } }
    var qq = mapQuery(s), enc = encodeURIComponent(qq);
    setAttr('#v-map', 'href', 'https://www.google.com/maps/search/?api=1&query=' + enc);
    setAttr('#v-dir', 'href', 'https://www.google.com/maps/dir/?api=1&destination=' + enc);
    setMap(qq);
    var hasPhone = !!tel(s.phone), hasWa = !!wa(s.whatsapp);
    show('#bd-phone-row', hasPhone); show('#v-phone-box', hasPhone); show('#top-call-wrap', hasPhone);
    if (hasPhone) {
      setText('#bd-phone', s.phone); setText('#v-phone', s.phone);
      ['#v-phone', '#d-call', '#top-call'].forEach(function (id) { setAttr(id, 'href', 'tel:' + tel(s.phone)); });
    }
    var link = hasWa ? waLink(t('wa_text')) : '';
    ['#cta-wa', '#v-wa', '#d-wa'].forEach(function (id) { show(id, hasWa); if (hasWa) setAttr(id, 'href', link); });
    show('#dock', hasPhone || hasWa); show('#d-call-wrap', hasPhone); show('#d-wa', hasWa);
    updateCbButton(); refreshCbState();
  }
  function refreshCbState() {
    var off = formMode() === 'off', done = !!($('#cb-done') && !$('#cb-done').hidden);
    show('#cb-off', off); show('#cb-form-wrap', !off && !done);
  }

  /* ---------- Google Map (no API key needed; loads only when near the screen) ---------- */
  var mapSrc = '', mapVisible = false;
  function setMap(qq) {
    if (!$('#mapframe')) return;
    var src = 'https://www.google.com/maps?q=' + encodeURIComponent(qq) + '&hl=' + (lang === 'bn' ? 'bn' : 'en') + '&z=15&output=embed';
    if (src === mapSrc) return;
    mapSrc = src;
    if (mapVisible) mountMap();
  }
  function mountMap() {
    var box = $('#mapframe'); if (!box) return;
    var old = box.querySelector('iframe');
    if (old && old.getAttribute('src') === mapSrc) return;
    if (old) old.remove();
    var f = document.createElement('iframe');
    f.title = 'Google Map'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; f.allowFullscreen = true; f.src = mapSrc;
    box.appendChild(f);
  }

  /* ---------- notices: live ticker and notice board ---------- */
  var tkItems = [];
  function layoutTicker() {
    var track = $('#tk-track'), view = $('#tk-view');
    if (!track || !view || !tkItems.length || $('#notice').hidden) return;
    var one = tkItems.map(function (x) { return '<span class="n">' + x + '</span>'; }).join('');
    track.style.animation = 'none'; track.innerHTML = one;
    var w = track.scrollWidth || 1, n = Math.max(1, Math.ceil((view.clientWidth || 600) / w)), half = '';
    for (var i = 0; i < n; i++) half += one;
    track.innerHTML = half + half;
    track.style.setProperty('--tk-dur', Math.max(14, (w * n) / 62).toFixed(1) + 's');
    void track.offsetWidth; track.style.animation = '';
  }
  /* small notice board in the hero: shown only when there are live notices */
  /* Notice board (hero): one notice at a time. Each notice rises from below, holds, moves up and out,
     then the next one comes in, and the list repeats. Holding or touching the board pauses it. */
  var mbTimer = null, mbBound = false, mbHold = false;
  function renderMini(list) {
    var box = $('#mini-board'), track = $('#mini-track'), cnt = $('#mini-count'); if (!box || !track) return;
    if (mbTimer) { clearInterval(mbTimer); mbTimer = null; }
    box.hidden = !list.length;
    if (!list.length) { track.innerHTML = ''; if (cnt) cnt.textContent = '0'; return; }
    track.innerHTML = list.map(function (n) {
      var urg = n.level === 'urgent';
      return '<li class="mb-item' + (urg ? ' urg' : '') + '">' + (urg ? '<span class="mb-tag">' + esc(t('notice_urgent')) + '</span>' : '') +
        '<span class="mb-text">' + esc(pick(n.text, n.textBn)) + '</span></li>';
    }).join('');
    var items = $all('#mini-track .mb-item'), cur = 0;
    function show(i) { if (cnt) cnt.textContent = (i + 1) + ' / ' + items.length; }
    items[0].classList.add('on');
    show(0);
    if (!mbBound) {
      mbBound = true;
      on(box, 'pointerenter', function () { mbHold = true; });
      on(box, 'pointerleave', function () { mbHold = false; });
      on(box, 'pointerdown', function () { mbHold = true; });
      on(box, 'pointerup', function () { setTimeout(function () { mbHold = false; }, 1500); });
    }
    if (items.length < 2 || reduce) return;
    mbTimer = setInterval(function () {
      if (document.hidden || mbHold) return;
      var prev = items[cur];
      prev.classList.remove('on'); prev.classList.add('out');
      cur = (cur + 1) % items.length;
      var nx = items[cur];
      nx.style.transition = 'none'; nx.classList.remove('out');
      void nx.offsetWidth;
      nx.style.transition = '';
      nx.classList.add('on');
      show(cur);
    }, 4500);
  }
  function renderNotices() {
    var list = D ? visibleNotices() : [], el = $('#notice'); renderMini(list);
    if (el) {
      if (!list.length) { el.hidden = true; tkItems = []; }
      else {
        var urgent = list.some(function (n) { return n.level === 'urgent'; });
        var paused = !!($('#tk-pause') && $('#tk-pause').getAttribute('aria-pressed') === 'true');
        el.hidden = false; el.className = 'ticker' + (urgent ? ' urgent' : '') + (paused ? ' paused' : '');
        setText('#tk-label', t(urgent ? 'notice_urgent' : 'notice_label'));
        tkItems = list.map(function (n) { return esc(pick(n.text, n.textBn)); });
        layoutTicker();
      }
    }
  }
  function startLive() {
    if (!window.GSCFB || !window.GSCFB.subscribeNotices) return;
    window.GSCFB.subscribeNotices(function (list) {
      if (list === null) return; // keep the last good list, or the notices from data.json
      LIVE = list;
      if (D) renderNotices();
    });
  }

  /* ---------- sections added from the staff console ---------- */
  function renderSections() {
    var box = $('#sections'); if (!box || !D) return;
    var list = D.sections.filter(function (x) { return x && x.active !== false && (pick(x.title, x.titleBn) || pick(x.body, x.bodyBn)); })
      .sort(function (a, b) { return (Number(a.order) || 0) - (Number(b.order) || 0); });
    box.hidden = !list.length;
    box.innerHTML = list.map(function (x) {
      var title = pick(x.title, x.titleBn), body = pick(x.body, x.bodyBn), link = safeLink(x.link);
      var paras = String(body || '').split(/\n+/).filter(Boolean).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
      return '<section class="sec-block rv"><div class="wrap"><div class="sec-card"><h2>' + esc(title) + '</h2>' + paras +
        (link ? '<a class="btn" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + esc(pick(x.linkText, x.linkTextBn) || t('learn')) + '</a>' : '') +
        '</div></div></section>';
    }).join('');
    $all('#sections .rv').forEach(watch);
  }

  /* ---------- stats, cards, rate list ---------- */
  function countTo(el, target, prefix, ms) {
    if (reduce || !ms) { el.textContent = prefix + target.toLocaleString('en-IN'); return; }
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * e).toLocaleString('en-IN');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function renderStats() {
    if (!D || !$('#st-1')) return;
    var priced = D.services.filter(function (s) { return s.price != null && Number(s.price) > 0; }).map(function (s) { return Number(s.price); });
    var vals = [D.services.length, D.categories.length, priced.length ? Math.min.apply(null, priced) : 0], pre = ['', '', '₹'];
    var c3 = $('#st-3'); if (c3 && c3.parentNode) c3.parentNode.hidden = !priced.length;
    [1, 2, 3].forEach(function (n, i) {
      var el = $('#st-' + n); if (!el) return;
      if (statsSeen) countTo(el, vals[i], pre[i], counted ? 0 : 1400); else el.textContent = pre[i] + vals[i].toLocaleString('en-IN');
    });
    if (statsSeen) counted = true;
  }
  function renderCards() {
    var box = $('#cards'); if (!box || !D) return;
    box.innerHTML = D.categories.map(function (c) {
      var n = D.services.filter(function (s) { return s.catId === c.id; }).length;
      var other = alt(c.name, c.nameBn), main = pick(c.name, c.nameBn);
      return '<button type="button" class="cat" data-card="' + esc(c.id) + '">' +
        '<span class="ico"><svg aria-hidden="true"><use href="#' + icoFor(c.id) + '"/></svg></span>' +
        '<h3>' + esc(main) + '</h3>' + (other && other !== main ? '<small>' + esc(other) + '</small>' : '') +
        '<small>' + esc(t('n_svc')(n)) + '</small>' +
        '<span class="go">' + esc(t('see_rates')) + '<svg aria-hidden="true"><use href="#i-arrow"/></svg></span></button>';
    }).join('');
    if (!cardsShown) { $all('#cards .cat').forEach(watch); cardsShown = true; }
  }
  function priceHtml(s) {
    var unit = pick(s.unit, s.unitBn);
    if (s.price == null || s.price === '') return '<div class="pr soft">' + esc(t('ask')) + '</div>';
    if (Number(s.price) === 0) return '<div class="pr">' + esc(t('free')) + '</div>';
    return '<div class="pr">' + inr(s.price) + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</div>';
  }
  function renderList() {
    var list = $('#list'), chips = $('#chips'); if (!list || !D) return;
    if (chips) chips.innerHTML = [{ id: 'all', label: t('all') }].concat(D.categories.map(function (c) { return { id: c.id, label: pick(c.name, c.nameBn) }; }))
      .map(function (c) { return '<button type="button" class="chip" data-cat="' + esc(c.id) + '" aria-pressed="' + (cat === c.id) + '">' + esc(c.label) + '</button>'; }).join('');
    var needle = q.trim().toLowerCase(), hasWa = !!wa(D.settings.whatsapp), html = '';
    D.categories.forEach(function (c) {
      if (cat !== 'all' && cat !== c.id) return;
      var items = visibleServices().filter(function (s) {
        if (s.catId !== c.id) return false;
        if (!needle) return true;
        return (s.name + ' ' + (s.nameBn || '') + ' ' + (s.note || '') + ' ' + (s.noteBn || '') + ' ' + c.name + ' ' + (c.nameBn || '')).toLowerCase().indexOf(needle) >= 0;
      });
      if (!items.length) return;
      var cm = pick(c.name, c.nameBn), ca = alt(c.name, c.nameBn);
      html += '<div class="group"><h3>' + esc(cm) + (ca && ca !== cm ? '<small>' + esc(ca) + '</small>' : '') + '</h3>' +
        items.map(function (s) {
          var main = pick(s.name, s.nameBn), second = alt(s.name, s.nameBn), note = pick(s.note, s.noteBn);
          var ask = hasWa ? '<a class="ask" target="_blank" rel="noopener noreferrer" aria-label="' + esc(t('ask_wa')) + '" title="' + esc(t('ask_wa')) + '" href="' + esc(waLink(t('wa_ask') + ': ' + main)) + '"><svg aria-hidden="true"><use href="#i-wa"/></svg></a>' : '';
          return '<div class="item"><div class="nm"><b>' + esc(main) + (s.custom ? '<span class="tag">' + esc(t('custom')) + '</span>' : '') + '</b>' +
            (second && second !== main ? '<small>' + esc(second) + '</small>' : '') + (note ? '<small>' + esc(note) + '</small>' : '') +
            '</div><span class="dots" aria-hidden="true"></span>' + priceHtml(s) + ask + '</div>';
        }).join('') + '</div>';
    });
    list.innerHTML = html || '<p class="empty">' + esc(t('none')) + '</p>';
  }
  function renderTicker() {
    var el = $('#ticker'); if (!el) return;
    var items = D && D.categories.length ? D.categories.map(function (c) { return pick(c.name, c.nameBn); }) : (FALLBACK_TICK[lang] || FALLBACK_TICK.en);
    var half = '';
    for (var i = 0; i < 3; i++) half += items.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('');
    el.innerHTML = half + half;
  }
  function fillTime() {
    var sel = $('#f-time'); if (!sel) return;
    var cur = sel.value || '0';
    sel.innerHTML = ['t_any', 't_morning', 't_noon', 't_eve'].map(function (k, i) { return '<option value="' + i + '">' + esc(t(k)) + '</option>'; }).join('');
    sel.value = cur;
  }
  function fillServices() {
    var sel = $('#f-svc'); if (!sel || !D) return;
    var cur = sel.value, html = '<option value="">' + esc(t('other')) + '</option>';
    D.categories.forEach(function (c) {
      var items = visibleServices().filter(function (s) { return s.catId === c.id; });
      if (!items.length) return;
      html += '<optgroup label="' + esc(pick(c.name, c.nameBn)) + '">' + items.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(pick(s.name, s.nameBn)) + '</option>'; }).join('') + '</optgroup>';
    });
    sel.innerHTML = html; sel.value = cur;
  }

  /* ---------- requests: call-back and feedback ---------- */
  function sendRequest(endpointPayload, waText, onDone) {
    var mode = formMode(), s = D && D.settings;
    function viaWa() {
      var link = waLink(waText);
      if (!link) return onDone(null, 'off');
      lastWaLink = link; store('gsc_last', String(Date.now()));
      window.open(link, '_blank', 'noopener,noreferrer');
      onDone('wa', link);
    }
    if (mode === 'ep') {
      fetch(s.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(endpointPayload), credentials: 'omit', referrerPolicy: 'no-referrer' })
        .then(function (r) { if (!r.ok) throw new Error('form'); store('gsc_last', String(Date.now())); onDone('form'); })
        .catch(viaWa);
    } else if (mode === 'wa') {
      viaWa();
    } else {
      onDone(null, 'off');
    }
  }
  function cooldownLeft() { return COOLDOWN_MS - (Date.now() - Number(store('gsc_last') || 0)); }
  function showCbDone(kind, link) {
    var p = $('#done-p');
    if (p) {
      if (kind === 'wa' && link) p.innerHTML = esc(t('done_wa')) + '<br><br><a class="btn wa" target="_blank" rel="noopener noreferrer" href="' + esc(link) + '"><svg aria-hidden="true"><use href="#i-wa"/></svg>' + esc(t('open_wa')) + '</a>';
      else p.textContent = t('done_ep');
    }
    show('#cb-form-wrap', false); show('#cb-done', true);
    var f = $('#cb'); if (f) f.reset(); fillTime();
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }
  function submitCb(e) {
    e.preventDefault();
    var msg = $('#cb-msg'), nameEl = $('#f-name'), phoneEl = $('#f-phone'), svcEl = $('#f-svc'), timeEl = $('#f-time'), msgEl = $('#f-msg'), hp = $('#f-web'), btn = $('#cb-btn');
    if (!msg || !nameEl || !phoneEl) return;
    msg.className = 'msg'; msg.textContent = '';
    if (hp && hp.value) return showCbDone('ep'); // honeypot: pretend success
    if (Date.now() - LOADED < 2500) return showCbDone('ep'); // filled in too fast to be a person
    var name = nameEl.value.trim().slice(0, 60), phone = cleanPhone(phoneEl.value);
    if (!name) return fieldErr(msg, t('e_name'), nameEl);
    if (!phone) return fieldErr(msg, t('e_phone'), phoneEl);
    if (cooldownLeft() > 0) return fieldErr(msg, t('e_wait'));
    var sv = D ? D.services.filter(function (s) { return s.id === (svcEl ? svcEl.value : ''); })[0] : null;
    var svcName = sv ? pick(sv.name, sv.nameBn) : t('other');
    var opt = timeEl && timeEl.options[timeEl.selectedIndex];
    var timeTxt = opt ? opt.textContent : '', note = msgEl ? msgEl.value.trim().slice(0, 300) : '';
    var text = t('wm_title') + '\n' + t('wm_name') + ': ' + name + '\n' + t('wm_phone') + ': ' + phone + '\n' + t('wm_svc') + ': ' + svcName + '\n' + t('wm_time') + ': ' + timeTxt + (note ? '\n' + t('wm_msg') + ': ' + note : '');
    var payload = { _subject: 'Call back request: ' + name + ' ' + phone, name: name, phone: phone, service: svcName, bestTime: timeTxt, message: note || '-', summary: text, site: location.hostname, _gotcha: '' };
    if (formMode() === 'ep' && btn) btn.disabled = true;
    if (formMode() === 'ep') msg.textContent = t('sending');
    sendRequest(payload, text, function (kind, info) {
      if (btn) btn.disabled = false;
      msg.textContent = '';
      if (kind) showCbDone(kind, info);
      else fieldErr(msg, t(info === 'off' ? 'cb_off' : 'e_fail'));
    });
  }
  function showFbDone() { show('#fb-wrap', false); show('#fb-done', true); var f = $('#fb'); if (f) f.reset(); fbRating = 0; $all('#stars [data-star]').forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); }); }
  function submitFb(e) {
    e.preventDefault();
    var out = $('#fb-msg-out'), txtEl = $('#fb-msg'), nameEl = $('#fb-name'), hp = $('#fb-web'), btn = $('#fb-btn');
    if (!out || !txtEl) return;
    out.className = 'msg'; out.textContent = '';
    if (hp && hp.value) return showFbDone();
    if (Date.now() - LOADED < 2500) return showFbDone();
    var text = txtEl.value.trim().slice(0, 500), name = nameEl ? nameEl.value.trim().slice(0, 60) : '';
    if (text.length < 3) return fieldErr(out, t('fb_empty2'), txtEl);
    if (cooldownLeft() > 0) return fieldErr(out, t('e_wait'));
    var msgText = 'Feedback' + (fbRating ? ' (' + fbRating + '/5)' : '') + ': ' + text + (name ? ' - ' + name : '');
    var payload = { _subject: 'Website feedback' + (fbRating ? ' (' + fbRating + '/5)' : ''), rating: fbRating || null, name: name, message: text, _gotcha: '' };
    if (formMode() === 'ep') { if (btn) btn.disabled = true; out.textContent = t('sending'); }
    sendRequest(payload, msgText, function (kind) {
      if (btn) btn.disabled = false;
      out.textContent = '';
      if (kind) showFbDone();
      else fieldErr(out, t('e_fail'));
    });
  }

  /* ---------- load ---------- */
  function renderAll(refreshOnly) {
    applyStatic(refreshOnly); renderShop(); renderNotices(); renderSections(); renderStats(); renderCards(); renderList(); fillServices(); fillTime(); refreshCbState();
  }
  function load(first) {
    var s = D && D.settings;
    var src = (!first && !isLocal && s) ? fromLive(s) : fromPages(first);
    return src.then(function (txt) {
      if (txt === lastJson) return;
      var nd = parseData(txt);
      lastJson = txt; D = nd;
      if (first) { var saved = store('gsc_lang'); lang = (saved === 'bn' || saved === 'en') ? saved : (D.settings.defaultLang === 'bn' ? 'bn' : 'en'); }
      renderAll(!first);
    }).catch(function () {
      if (first) { var l = $('#list'); if (l) l.innerHTML = '<p class="empty">' + esc(t('none')) + '</p>'; }
    });
  }

  /* The live-notice library is large, so it loads only after the page has finished loading. */
  function loadFb() {
    var go = function () { setTimeout(function () { import('./fb.js').catch(function () { }); }, 1200); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }

  /* ---------- motion (guarded: every element is optional) ---------- */
  var io = null;
  if ('IntersectionObserver' in window && !reduce) {
    io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  }
  function watch(el) { if (io) io.observe(el); else el.classList.add('in'); }
  function makeMotes() {
    var host = $('#motes'); if (!host) return;
    var n = small ? 6 : 16, h = '';
    for (var i = 0; i < n; i++) h += '<i class="mote" style="left:' + (Math.random() * 96 + 2).toFixed(1) + '%;top:' + (35 + Math.random() * 55).toFixed(1) + '%;animation-delay:-' + (Math.random() * 9).toFixed(1) + 's;animation-duration:' + (7 + Math.random() * 6).toFixed(1) + 's"></i>';
    host.innerHTML = h;
  }
  var live = null, pend = null, queued = false;
  function release(el) { if (!el) return; el.classList.remove('live'); el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); }
  function onMove(e) {
    pend = e; if (queued) return; queued = true;
    requestAnimationFrame(function () {
      queued = false; var ev = pend; pend = null; if (!ev) return;
      var scene = $('#scene'), hero = $('#hero');
      if (scene && hero && hero.getBoundingClientRect().bottom > 0) {
        scene.style.setProperty('--px', ((ev.clientX / window.innerWidth - 0.5) * 2).toFixed(3));
        scene.style.setProperty('--py', ((ev.clientY / window.innerHeight - 0.5) * 2).toFixed(3));
      }
      var el = ev.target && ev.target.closest ? ev.target.closest('.cat') : null;
      if (live && live !== el) { release(live); live = null; }
      if (!el) return;
      live = el;
      var r = el.getBoundingClientRect(); if (!r.width) return;
      var x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height));
      el.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      el.classList.add('live');
    });
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var h = document.documentElement, max = h.scrollHeight - window.innerHeight, p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      var prog = $('#prog'), tu = $('#to-top'), top = $('#topbar'), scene = $('#scene');
      if (prog) prog.style.setProperty('--p', p.toFixed(4));
      if (tu) { tu.style.setProperty('--p', p.toFixed(4)); tu.classList.toggle('on', window.scrollY > 520); }
      if (top) top.classList.toggle('stuck', window.scrollY > 8);
      if (scene && !reduce && !window.matchMedia('(max-width: 900px)').matches && window.scrollY < 900) scene.style.setProperty('--sy', window.scrollY);
    });
  }

  /* Phone header menu (hamburger). Runs on its own, so an error elsewhere on the page cannot stop it. */
  function initMenu() {
    var burger = $('#burger'), topnav = $('#top-nav');
    if (!burger || !topnav) return;
    function setMenu(open) {
      topnav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    on(burger, 'click', function (e) { e.stopPropagation(); setMenu(!topnav.classList.contains('open')); });
    $all('#top-nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    on(document, 'click', function (e) { if (!e.target.closest || !e.target.closest('#top-nav, #burger')) setMenu(false); });
    on(document, 'keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- start ---------- */
  function init() {
    applyStatic();
    /* tapping a "Work we do for you" card shows that category's rates */
    on($('#cards'), 'click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-card]') : null;
      if (!b) return;
      cat = b.getAttribute('data-card'); q = ''; if ($('#q')) $('#q').value = '';
      renderList();
      var target = $('#rates') || $('#list');
      if (target) target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
    /* call menus: the header button and the bottom bar button each open Call now / Call back */
    var CALL_MENUS = [['#top-call-btn', '#call-menu'], ['#d-call-btn', '#dock-menu']];
    function closeCallMenus(except) {
      CALL_MENUS.forEach(function (x) {
        if (x[1] === except) return;
        var m = $(x[1]), b = $(x[0]); if (m) m.hidden = true; if (b) b.setAttribute('aria-expanded', 'false');
      });
    }
    CALL_MENUS.forEach(function (x) {
      on($(x[0]), 'click', function (e) {
        e.stopPropagation();
        var m = $(x[1]); if (!m) return;
        var open = m.hidden; closeCallMenus(x[1]); m.hidden = !open; this.setAttribute('aria-expanded', String(open));
        if (open) { var first = m.querySelector('a'); if (first) first.focus(); }
      });
    });
    on(document, 'click', function (e) { if (!e.target.closest || !e.target.closest('.callwrap')) closeCallMenus(); });
    on(document, 'keydown', function (e) { if (e.key === 'Escape') closeCallMenus(); });
    on($('#lang'), 'click', function () { lang = lang === 'bn' ? 'en' : 'bn'; store('gsc_lang', lang); if (D) renderAll(); else applyStatic(); });
    on($('#theme'), 'click', function () { setTheme(themeNow() === 'dark' ? 'light' : 'dark'); });
    on($('#q'), 'input', function (e) { q = e.target.value; if (D) renderList(); });
    on($('#print'), 'click', function () { cat = 'all'; q = ''; if ($('#q')) $('#q').value = ''; renderList(); window.print(); });
    on($('#to-top'), 'click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
    on($('#cb'), 'submit', submitCb);
    on($('#fb'), 'submit', submitFb);
    on($('#cb-again'), 'click', function () { show('#cb-done', false); show('#cb-form-wrap', true); var m = $('#cb-msg'); if (m) m.textContent = ''; });
    on($('#tk-pause'), 'click', function () {
      var on2 = this.getAttribute('aria-pressed') !== 'true';
      this.setAttribute('aria-pressed', on2); var n = $('#notice'); if (n) n.classList.toggle('paused', on2);
    });
    var rz = null;
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (window.innerWidth === lastW) return; lastW = window.innerWidth; layoutTicker(); onScroll(); }, 250); });
    window.addEventListener('scroll', onScroll, { passive: true });
    if (fine && !reduce) {
      document.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('mouseleave', function () { release(live); live = null; });
    }

    if ('IntersectionObserver' in window) {
      var hero = $('#hero'), stats = $('#stats'), mf = $('#mapframe');
      if (hero) new IntersectionObserver(function (es) { es.forEach(function (e) { hero.classList.toggle('paused', !e.isIntersecting); }); }).observe(hero);
      if (stats) new IntersectionObserver(function (es, ob) { es.forEach(function (e) { if (e.isIntersecting) { statsSeen = true; ob.disconnect(); if (D) renderStats(); } }); }, { threshold: 0.4 }).observe(stats);
      if (mf) new IntersectionObserver(function (es, ob) { es.forEach(function (e) { if (e.isIntersecting) { mapVisible = true; ob.disconnect(); if (mapSrc) mountMap(); } }); }, { rootMargin: '300px' }).observe(mf);
      else mapVisible = true;
    } else { statsSeen = true; mapVisible = true; }

    $all('.rv').forEach(watch);
    if ('IntersectionObserver' in window) {
      $all('.band, #notice').forEach(function (el) {
        new IntersectionObserver(function (es) { es.forEach(function (e) { el.classList.toggle('off', !e.isIntersecting); }); }).observe(el);
      });
    }
    makeMotes();
    onScroll();
    if (window.GSCFB) startLive(); else { window.addEventListener('gsc:fb-ready', startLive, { once: true }); loadFb(); }
    load(true);
    var phone = !!(window.matchMedia && window.matchMedia('(max-width: 640px)').matches);
    setInterval(function () { if (!document.hidden) load(false); }, phone ? POLL_MS * 3 : POLL_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && D) load(false); });
    // Safety net: anything still hidden after 3 seconds is shown, so no section can stay blank.
    setTimeout(function () { $all('.rv').forEach(function (el) { el.classList.add('in'); }); }, 3000);
  }
  initMenu();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
