// Fallback loader in case relative path or upload location differs
    (function () {
      if (window.cloudbase) return;
      const tryUrls = [
        new URL('cloudbase.full.js', window.location.href).toString(),
        new URL('lib/cloudbase.full.js', window.location.href).toString()
      ];
      const loadNext = (idx) => {
        if (idx >= tryUrls.length) return;
        const sdkUrl = tryUrls[idx];
        const s = document.createElement('script');
        s.src = sdkUrl;
        s.async = true;
        s.onload = () => { window.__cloudbaseReady = true; };
        s.onerror = () => { window.__cloudbaseLoadError = sdkUrl; loadNext(idx + 1); };
        document.head.appendChild(s);
      };
      loadNext(0);
    })();