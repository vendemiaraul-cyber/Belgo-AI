/* Belgo's doorman. Looks at the address someone asked for and, when it looks like a break-in attempt,
   sends them to caught.html with the reason. This is a deterrent with a sense of humour, not real security:
   the site has no admin panel, database or secrets in its pages to begin with. */
(function () {
  function classify(path, extra) {
    var raw = String(path || '') + String(extra || ''), text = raw;
    for (var i = 0; i < 2; i++) { try { text = decodeURIComponent(text); } catch (e) { break; } }
    var t = text.toLowerCase(), p = String(path || '').toLowerCase(), m;
    if ((m = /<\s*script|javascript:|on(error|load|click|mouseover)\s*=|<\s*(img|svg|iframe)\b[^>]*=|document\.cookie/.exec(t))) return { why: 'xss', what: m[0] };
    if ((m = /\bunion\b[\s\S]{0,40}\bselect\b|\bor\b\s+['"]?1['"]?\s*=\s*['"]?1|'\s*or\s*'|\bsleep\s*\(\s*\d|\bdrop\s+table\b|information_schema|;\s*--/.exec(t))) return { why: 'sql', what: m[0] };
    if ((m = /\.\.[\/\\]|\/etc\/passwd|\/proc\/self|c:\\windows/.exec(t))) return { why: 'climb', what: m[0] };
    if ((m = /\/\.(env|git|svn|htaccess|htpasswd|aws|ssh|ds_store)\b|wp-config|id_rsa|\.(sql|bak|old|backup|pem|key)$|\/(backup|dump|database)s?(\.|\/|$)/.exec(p))) return { why: 'secret', what: path };
    if ((m = /^\/(wp-admin|wp-login|admin|administrator|phpmyadmin|pma|cpanel|manager|console|dashboard\/login|user\/login)(\/|\.|$)|\/login\.(php|asp|aspx|jsp)$/.exec(p))) return { why: 'admin', what: path };
    if ((m = /\.(php\d?|asp|aspx|jsp|cgi|pl|sh|exe)$|\/cgi-bin\/|\/(shell|cmd|eval|xmlrpc)(\.|\/|$)/.exec(p))) return { why: 'script', what: path };
    return null;
  }
  window.BelgoGuard = { classify: classify };
  if (/\/caught(\.html)?$/.test(location.pathname)) return;
  var hit = classify(location.pathname, location.search + location.hash);
  if (hit) location.replace('/caught.html?why=' + hit.why + '&what=' + encodeURIComponent(String(hit.what).slice(0, 120)));
})();
