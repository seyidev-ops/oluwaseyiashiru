/* Site settings. Edit these, then republish.

   OA_ENDPOINT: the Web app URL of the USE Pack engine (Google Apps Script, see backend/SETUP.md).
   Leave it empty and the Start page still gives every visitor their instant first step.

   OA_LINKS: where each icon goes. An empty link hides that icon. */
window.OA_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzFBWFXGKR27ndKr7xjz_OK-RUAFV6mOK5dOxF_wC3uDlIkkU4yAfodIWp8KcHeox0o/exec';
window.OA_LINKS = {
  whatsapp: 'https://wa.me/2347033134979',
  email: 'mailto:info@oluwaseyiashiru.com',
  facebook: '',
  instagram: '',
  linkedin: '',
  x: '',
  youtube: '',
  tiktok: ''
};

/* OA_PAY.link: your Paystack payment page for the $1 unlock (set its "redirect after payment" to .../start.html).
   While empty, the unlock button opens WhatsApp with the visitor's pack number instead. */
window.OA_PAY = { link: 'https://paystack.shop/pay/1dollarc', monthly: 'https://paystack.shop/pay/deepersystems' };

/* The Roast Room: pay = the Paystack page for one roast (redirects to the room). Empty: booking goes to WhatsApp. */
window.OA_ROAST = { pay: 'https://paystack.shop/pay/roastmyidea', engine: 'https://engine.oluwaseyiashiru.com' };
