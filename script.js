(function () {
  "use strict";

  const PHONE_NUMBER = "3517943571";
  const WHATSAPP_NUMBER = "393517943571";
  const GA4_MEASUREMENT_ID = "G-XXXXXXXXXX"; // TODO: sostituire con ID reale GA4
  const CONSENT_KEY = "loris_cookie_consent";

  const cookieBanner = document.getElementById("cookie-consent");
  const acceptBtn = document.getElementById("accept-cookies");
  const rejectBtn = document.getElementById("reject-cookies");
  const yearEl = document.getElementById("current-year");

  window.dataLayer = window.dataLayer || [];

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  function pushDataLayer(eventName, payload) {
    window.dataLayer.push({
      event: eventName,
      ...payload
    });
  }

  function hasValidGaId() {
    return Boolean(GA4_MEASUREMENT_ID && !GA4_MEASUREMENT_ID.includes("XXXX"));
  }

  function loadGa4() {
    if (!hasValidGaId() || window.gtag) {
      return;
    }

    const gaScript = document.createElement("script");
    gaScript.async = true;
    gaScript.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_MEASUREMENT_ID);
    document.head.appendChild(gaScript);

    window.gtag = function () {
      window.dataLayer.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("config", GA4_MEASUREMENT_ID, {
      anonymize_ip: true
    });
  }

  function trackEvent(eventName, params) {
    pushDataLayer(eventName, params);
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    }
  }

  function bindClickTracking(selector, eventName, extra) {
    const links = document.querySelectorAll(selector);
    links.forEach(function (link) {
      link.addEventListener("click", function () {
        trackEvent(eventName, extra);
      });
    });
  }

  function hideCookieBanner() {
    if (cookieBanner) {
      cookieBanner.hidden = true;
    }
  }

  function showCookieBanner() {
    if (cookieBanner) {
      cookieBanner.hidden = false;
    }
  }

  function applyConsentState(state) {
    if (state === "accepted") {
      loadGa4();
      hideCookieBanner();
      return;
    }

    if (state === "rejected") {
      hideCookieBanner();
      return;
    }

    showCookieBanner();
  }

  bindClickTracking("a[href^=\"tel:\"]", "click_phone", {
    number: PHONE_NUMBER
  });

  bindClickTracking("a[href*=\"wa.me\"]", "click_whatsapp", {
    number: WHATSAPP_NUMBER
  });

  const forms = document.querySelectorAll("form");
  forms.forEach(function (form) {
    form.addEventListener("submit", function () {
      trackEvent("submit_form", {
        form_id: form.id || "contact_form"
      });
    });
  });

  const storedConsent = localStorage.getItem(CONSENT_KEY);
  applyConsentState(storedConsent);

  if (acceptBtn) {
    acceptBtn.addEventListener("click", function () {
      localStorage.setItem(CONSENT_KEY, "accepted");
      applyConsentState("accepted");
    });
  }

  if (rejectBtn) {
    rejectBtn.addEventListener("click", function () {
      localStorage.setItem(CONSENT_KEY, "rejected");
      applyConsentState("rejected");
    });
  }
})();
