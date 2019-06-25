function getRootDomain() {
  // Check iframe level

  var iframe_level = 0;
  var curWindow = window;

  while (curWindow != curWindow.parent) {
    iframe_level++;
    curWindow = curWindow.parent;
  }
  curWindow = window;

  // Initial root domain
  var root =
    curWindow.location.origin ||
    curWindow.location.protocol + "//" + curWindow.location.host;

  if (curWindow.location.ancestorOrigins && curWindow.URL) {
    if (curWindow.location.ancestorOrigins.length > 0) {
      root =
        curWindow.location.ancestorOrigins[
          curWindow.location.ancestorOrigins.length - 1
        ];
    }
  } else {
    try {
      do {
        root =
          curWindow.parent.location.origin ||
          curWindow.parent.location.protocol +
            "//" +
            curWindow.parent.location.host;

        curWindow = curWindow.parent;
      } while (curWindow != curWindow.parent);
    } catch (exc) {
      if (document.referrer && document.referrer !== "") {
        if (iframe_level === 1) root = curWindow.document.referrer;
        else if (iframe_level > 1) {
          // The worst case
        }
      }
    }
  }

  return root.split("/")[2];
}

function load() {
  var root = getRootDomain();
  var rootEl = document.getElementById("root");
  var hostEl = document.getElementById("host");
  //if (url) url.innerHTML = JSON.stringify(window.location.ancestorOrigins);
  if (rootEl) rootEl.innerHTML = root;
  if (hostEl)
    hostEl.innerHTML = (
      window.location.origin ||
      window.location.protocol + "//" + window.location.host
    ).split("/")[2];
  //console.log(root);
}

document.addEventListener("DOMContentLoaded", function(event) {
  //do work
  load();
});

(function() {
  function r(r) {
    try {
      if (!window.location.ancestorOrigins) return;
      for (var n = 0, t = window.location.ancestorOrigins.length; n < t; n++) {
        r.call(null, window.location.ancestorOrigins[n], n);
      }
    } catch (o) {}
    return [];
  }
  function n(r) {
    var n = [],
      t;
    do {
      t = t ? t.parent : window;
      try {
        r.call(null, t, n);
      } catch (o) {
        n.push({});
      }
    } while (t != window.top);
    return n;
  }
  var t = n(function(r, n) {
    n.push({
      referrer: r.document.referrer || null,
      location: r.location.href || null
    });
  });
  r(function(r, n) {
    t[n].ancestor = r;
  });
  var o = "";
  for (var e = t.length - 1; e >= 0; e--) {
    o = t[e].location;
    if (!o && e > 0) {
      o = t[e - 1].referrer;
      if (!o) {
        o = t[e - 1].ancestor;
      }
    }
    if (o) {
      break;
    }
  }
  // o = encodeURIComponent(o);
  console.log(o);
  // var i =
  //   "http://g.adnxs.com/ttj?ttjb=1&bdref=" +
  //   o +
  //   "&id=2010320&size=728x90&artist=15735&title=countingstars&instr=guitar";
  // document.write('<script src="' + i + '"></' + "script>");
})();
