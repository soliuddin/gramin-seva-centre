/* Runs before the page is drawn: marks the page as script-enabled and sets the light or dark theme. */
(function () {
  document.documentElement.classList.add('js');
  var t = null;
  try { t = localStorage.getItem('gsc_theme'); } catch (e) { }
  if (t !== 'light' && t !== 'dark') t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
})();
