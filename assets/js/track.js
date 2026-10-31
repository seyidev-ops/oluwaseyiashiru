/* Meta Pixel events. The base code (PageView) is inline in each page's <head>; this file adds the actions.
   oaTrack(name, params) is safe to call anywhere: it does nothing if the Pixel is blocked or not loaded. */
(function () {
  var STANDARD = /^(Lead|Contact|Schedule|SubmitApplication|InitiateCheckout|Purchase|Subscribe|CompleteRegistration|ViewContent)$/;
  window.oaTrack = function (name, params) {
    try { if (window.fbq) window.fbq(STANDARD.test(name) ? 'track' : 'trackCustom', name, params || {}); } catch (e) {}
  };
  /* Paystack checkouts, priced as the pages show them: $1 unlock, $5/month Deeper Systems, ₦15,000 a roast. */
  var CHECKOUT = {
    '1dollarc': { content_name: 'USE Pack unlock', value: 1, currency: 'USD' },
    'deepersystems': { content_name: 'Deeper Systems', value: 5, currency: 'USD' },
    'roastmyidea': { content_name: 'Roast Room', value: 15000, currency: 'NGN' }
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.href || '';
    var m = h.match(/paystack\.(?:shop|com)\/pay\/([^/?#]+)/);
    if (m) return window.oaTrack('InitiateCheckout', CHECKOUT[m[1]] || { content_name: m[1] });
    if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(h)) return window.oaTrack('Contact', { content_name: 'WhatsApp', page: location.pathname });
    if (/^mailto:/.test(h)) return window.oaTrack('Contact', { content_name: 'Email', page: location.pathname });
  }, true);
})();
