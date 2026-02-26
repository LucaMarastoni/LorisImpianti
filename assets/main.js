(function () {
  "use strict";

  var PHONE_NUMBER = "3517943571";
  var WHATSAPP_NUMBER = "393517943571";
  var GA4_MEASUREMENT_ID = "G-XXXXXXXXXX"; // TODO: inserire ID reale GA4
  var GOOGLE_ADS_ID = "AW-XXXXXXXXX"; // TODO: inserire ID reale Google Ads

  var CONSENT_KEY = "loris_cookie_consent";
  var CONSENT_VERSION = "2026-02-26";
  var CONSENT_MAX_AGE_DAYS = 180;

  var googleTagLoaded = false;
  var gaConfigured = false;
  var adsConfigured = false;
  var activeConsent = null;

  var consentUi = {
    root: null,
    panel: null,
    acceptBtn: null,
    rejectBtn: null,
    customizeBtn: null,
    saveBtn: null,
    cancelBtn: null,
    analyticsInput: null,
    marketingInput: null
  };

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
  }

  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500
  });

  GA4_MEASUREMENT_ID = readMetaContent("ga4-measurement-id") || GA4_MEASUREMENT_ID;
  GOOGLE_ADS_ID = readMetaContent("google-ads-id") || GOOGLE_ADS_ID;

  function readMetaContent(name) {
    var node = document.querySelector('meta[name="' + name + '"]');
    if (!node) {
      return "";
    }
    return String(node.getAttribute("content") || "").trim();
  }

  function buildConsent(analytics, marketing, mode) {
    return {
      necessary: true,
      analytics: Boolean(analytics),
      marketing: Boolean(marketing),
      mode: mode || "custom",
      version: CONSENT_VERSION,
      savedAt: Date.now()
    };
  }

  function parseStoredConsent(rawValue) {
    if (!rawValue) {
      return null;
    }

    if (rawValue === "accepted") {
      return buildConsent(true, true, "accept_all_legacy");
    }

    if (rawValue === "rejected") {
      return buildConsent(false, false, "reject_all_legacy");
    }

    try {
      var parsed = JSON.parse(rawValue);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }

      if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") {
        return null;
      }

      return {
        necessary: true,
        analytics: parsed.analytics,
        marketing: parsed.marketing,
        mode: parsed.mode || "custom",
        version: parsed.version || "legacy",
        savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now()
      };
    } catch (error) {
      return null;
    }
  }

  function isConsentExpired(consent) {
    if (!consent || typeof consent.savedAt !== "number") {
      return true;
    }

    var maxAgeMs = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - consent.savedAt > maxAgeMs) {
      return true;
    }

    return consent.version !== CONSENT_VERSION;
  }

  function getStoredConsent() {
    try {
      return parseStoredConsent(localStorage.getItem(CONSENT_KEY));
    } catch (error) {
      return null;
    }
  }

  function setStoredConsent(consent) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    } catch (error) {
      // ignore storage failures (private mode or restricted storage)
    }
  }

  function clearStoredConsent() {
    try {
      localStorage.removeItem(CONSENT_KEY);
    } catch (error) {
      // ignore storage failures (private mode or restricted storage)
    }
  }

  function hasValidId(id, prefix) {
    return Boolean(id && id.indexOf(prefix) === 0 && id.indexOf("XXXX") === -1);
  }

  function ensureGoogleTagLibrary() {
    if (googleTagLoaded) {
      return;
    }

    var bootstrapId = "";
    if (hasValidId(GA4_MEASUREMENT_ID, "G-")) {
      bootstrapId = GA4_MEASUREMENT_ID;
    } else if (hasValidId(GOOGLE_ADS_ID, "AW-")) {
      bootstrapId = GOOGLE_ADS_ID;
    }

    if (!bootstrapId) {
      return;
    }

    var tagScript = document.createElement("script");
    tagScript.async = true;
    tagScript.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(bootstrapId);
    document.head.appendChild(tagScript);

    window.gtag("js", new Date());
    googleTagLoaded = true;
  }

  function enableAnalytics() {
    if (!hasValidId(GA4_MEASUREMENT_ID, "G-")) {
      return;
    }

    ensureGoogleTagLibrary();
    if (gaConfigured) {
      return;
    }

    window.gtag("config", GA4_MEASUREMENT_ID, {
      anonymize_ip: true,
      allow_google_signals: false
    });
    gaConfigured = true;
  }

  function enableMarketing() {
    if (!hasValidId(GOOGLE_ADS_ID, "AW-")) {
      return;
    }

    ensureGoogleTagLibrary();
    if (adsConfigured) {
      return;
    }

    window.gtag("config", GOOGLE_ADS_ID);
    adsConfigured = true;
  }

  function isNonEssentialCookie(cookieName) {
    if (!cookieName) {
      return false;
    }

    return (
      cookieName === "_ga" ||
      cookieName === "_gid" ||
      cookieName === "_gat" ||
      cookieName.indexOf("_ga_") === 0 ||
      cookieName.indexOf("_gcl_") === 0 ||
      cookieName === "_gac_gb_" ||
      cookieName === "__gads"
    );
  }

  function expireCookie(cookieName, domain) {
    var serialized = cookieName + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
    if (domain) {
      serialized += "; domain=" + domain;
    }
    document.cookie = serialized;
  }

  function clearNonEssentialCookies() {
    var serializedCookies = document.cookie ? document.cookie.split(";") : [];
    var host = window.location.hostname;
    var domains = host.indexOf(".") > -1 ? [host, "." + host] : [host];

    for (var i = 0; i < serializedCookies.length; i += 1) {
      var pair = serializedCookies[i].split("=");
      var cookieName = pair[0] ? pair[0].trim() : "";
      if (!isNonEssentialCookie(cookieName)) {
        continue;
      }

      expireCookie(cookieName);
      for (var d = 0; d < domains.length; d += 1) {
        expireCookie(cookieName, domains[d]);
      }
    }
  }

  function parseConsentCategories(rawCategories) {
    var value = String(rawCategories || "").toLowerCase();
    return value.split(/[\s,]+/).filter(Boolean);
  }

  function activateDeferredScripts(consent) {
    var deferredScripts = document.querySelectorAll('script[type="text/plain"][data-consent]');

    for (var i = 0; i < deferredScripts.length; i += 1) {
      var originalScript = deferredScripts[i];
      if (originalScript.getAttribute("data-activated") === "true") {
        continue;
      }

      var categories = parseConsentCategories(originalScript.getAttribute("data-consent"));
      var shouldActivate =
        (consent.analytics && categories.indexOf("analytics") !== -1) ||
        (consent.marketing && categories.indexOf("marketing") !== -1);

      if (!shouldActivate) {
        continue;
      }

      var clonedScript = document.createElement("script");
      var attrs = originalScript.attributes;
      for (var j = 0; j < attrs.length; j += 1) {
        var attr = attrs[j];
        if (attr.name === "type" || attr.name === "data-consent" || attr.name === "data-src" || attr.name === "data-activated") {
          continue;
        }
        clonedScript.setAttribute(attr.name, attr.value);
      }

      var src = originalScript.getAttribute("data-src") || originalScript.getAttribute("src");
      if (src) {
        clonedScript.src = src;
      } else {
        clonedScript.text = originalScript.textContent || "";
      }

      originalScript.setAttribute("data-activated", "true");
      originalScript.parentNode.insertBefore(clonedScript, originalScript.nextSibling);
    }
  }

  function applyConsent(consent) {
    var analyticsGranted = Boolean(consent && consent.analytics);
    var marketingGranted = Boolean(consent && consent.marketing);

    window.gtag("consent", "update", {
      analytics_storage: analyticsGranted ? "granted" : "denied",
      ad_storage: marketingGranted ? "granted" : "denied",
      ad_user_data: marketingGranted ? "granted" : "denied",
      ad_personalization: marketingGranted ? "granted" : "denied"
    });

    if (analyticsGranted) {
      enableAnalytics();
    }

    if (marketingGranted) {
      enableMarketing();
    }

    activateDeferredScripts({
      analytics: analyticsGranted,
      marketing: marketingGranted
    });

    if (!analyticsGranted || !marketingGranted) {
      clearNonEssentialCookies();
    }
  }

  function isTrackingAllowed() {
    return Boolean(activeConsent && (activeConsent.analytics || activeConsent.marketing));
  }

  function track(eventName, params) {
    if (!isTrackingAllowed()) {
      return;
    }

    var payload = {
      event: eventName,
      page: window.location.pathname
    };

    if (params && typeof params === "object") {
      for (var key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
          payload[key] = params[key];
        }
      }
    }

    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(payload);
    }
  }

  function inferRelativeRoot() {
    var segments = window.location.pathname.split("/").filter(Boolean);
    if (!segments.length) {
      return "";
    }

    var lastSegment = segments[segments.length - 1];
    if (lastSegment.indexOf(".html") === -1) {
      return "../";
    }

    return segments.length > 2 ? "../" : "";
  }

  function getLegalHref(fileName) {
    var selector = '.legal-links a[href*="' + fileName + '"]';
    var link = document.querySelector(selector);
    if (link) {
      return link.getAttribute("href");
    }
    return inferRelativeRoot() + fileName;
  }

  function createCookieBanner() {
    var cookiePolicyHref = getLegalHref("cookie.html");
    var privacyPolicyHref = getLegalHref("privacy.html");

    var banner = document.createElement("aside");
    banner.id = "cookie-consent";
    banner.className = "cookie-consent";
    banner.hidden = true;
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", "Preferenze cookie");

    banner.innerHTML = [
      '<div class="cookie-consent-inner">',
      '<p class="cookie-consent-text">Cookie tecnici sempre attivi. Analytics/marketing solo con consenso. <a class="text-link" href="' + cookiePolicyHref + '">Cookie Policy</a> · <a class="text-link" href="' + privacyPolicyHref + '">Privacy Policy</a></p>',
      '<div class="cookie-consent-actions">',
      '<button type="button" class="cookie-consent-btn cookie-consent-btn-primary" id="cookie-accept-all">Accetta tutto</button>',
      '<button type="button" class="cookie-consent-btn cookie-consent-btn-secondary" id="cookie-reject-all">Rifiuta</button>',
      '<button type="button" class="cookie-consent-btn cookie-consent-btn-outline" id="cookie-customize">Personalizza</button>',
      "</div>",
      '<div class="cookie-consent-panel" id="cookie-customize-panel" hidden>',
      '<p class="cookie-consent-text cookie-consent-text-small">I cookie tecnici sono sempre attivi. Seleziona solo le categorie opzionali che vuoi abilitare.</p>',
      '<label class="cookie-consent-option"><input id="cookie-opt-analytics" type="checkbox"> Cookie analytics (misurazione traffico e prestazioni)</label>',
      '<label class="cookie-consent-option"><input id="cookie-opt-marketing" type="checkbox"> Cookie marketing (Google Ads e conversioni)</label>',
      '<div class="cookie-consent-actions">',
      '<button type="button" class="cookie-consent-btn cookie-consent-btn-primary" id="cookie-save-preferences">Salva preferenze</button>',
      '<button type="button" class="cookie-consent-btn cookie-consent-btn-outline" id="cookie-cancel-preferences">Annulla</button>',
      "</div>",
      "</div>",
      "</div>"
    ].join("");

    document.body.appendChild(banner);

    consentUi.root = banner;
    consentUi.panel = document.getElementById("cookie-customize-panel");
    consentUi.acceptBtn = document.getElementById("cookie-accept-all");
    consentUi.rejectBtn = document.getElementById("cookie-reject-all");
    consentUi.customizeBtn = document.getElementById("cookie-customize");
    consentUi.saveBtn = document.getElementById("cookie-save-preferences");
    consentUi.cancelBtn = document.getElementById("cookie-cancel-preferences");
    consentUi.analyticsInput = document.getElementById("cookie-opt-analytics");
    consentUi.marketingInput = document.getElementById("cookie-opt-marketing");
  }

  function showCookieBanner(openPreferences) {
    if (!consentUi.root) {
      return;
    }

    consentUi.root.hidden = false;
    consentUi.root.classList.add("is-visible");

    if (openPreferences) {
      syncPreferenceInputs();
      consentUi.panel.hidden = false;
      return;
    }

    consentUi.panel.hidden = true;
  }

  function hideCookieBanner() {
    if (!consentUi.root) {
      return;
    }

    consentUi.root.hidden = true;
    consentUi.root.classList.remove("is-visible");
    consentUi.panel.hidden = true;
  }

  function syncPreferenceInputs() {
    if (!consentUi.analyticsInput || !consentUi.marketingInput) {
      return;
    }

    consentUi.analyticsInput.checked = Boolean(activeConsent && activeConsent.analytics);
    consentUi.marketingInput.checked = Boolean(activeConsent && activeConsent.marketing);
  }

  function saveConsentChoice(consent) {
    activeConsent = consent;
    setStoredConsent(consent);
    applyConsent(consent);
    hideCookieBanner();
  }

  function bindCookieBannerEvents() {
    if (!consentUi.root) {
      return;
    }

    consentUi.acceptBtn.addEventListener("click", function () {
      saveConsentChoice(buildConsent(true, true, "accept_all"));
    });

    consentUi.rejectBtn.addEventListener("click", function () {
      saveConsentChoice(buildConsent(false, false, "reject_all"));
    });

    consentUi.customizeBtn.addEventListener("click", function () {
      showCookieBanner(true);
    });

    consentUi.saveBtn.addEventListener("click", function () {
      saveConsentChoice(
        buildConsent(
          Boolean(consentUi.analyticsInput && consentUi.analyticsInput.checked),
          Boolean(consentUi.marketingInput && consentUi.marketingInput.checked),
          "custom"
        )
      );
    });

    consentUi.cancelBtn.addEventListener("click", function () {
      if (activeConsent) {
        hideCookieBanner();
        return;
      }
      consentUi.panel.hidden = true;
    });
  }

  function ensureManageCookieLinks() {
    var legalLists = document.querySelectorAll(".legal-links");
    for (var i = 0; i < legalLists.length; i += 1) {
      var list = legalLists[i];
      if (list.querySelector("[data-cookie-manage]")) {
        continue;
      }

      var item = document.createElement("li");
      var trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "legal-cookie-manage";
      trigger.setAttribute("data-cookie-manage", "true");
      trigger.textContent = "Gestisci cookie";
      item.appendChild(trigger);
      list.appendChild(item);
    }

    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-cookie-manage]");
      if (!trigger) {
        return;
      }

      event.preventDefault();
      showCookieBanner(true);
    });
  }

  function initCookieConsent() {
    ensureManageCookieLinks();
    createCookieBanner();
    bindCookieBannerEvents();

    var storedConsent = getStoredConsent();
    if (storedConsent && !isConsentExpired(storedConsent)) {
      activeConsent = storedConsent;
      applyConsent(storedConsent);
      hideCookieBanner();
      return;
    }

    if (storedConsent && isConsentExpired(storedConsent)) {
      clearStoredConsent();
    }

    activeConsent = null;
    applyConsent(buildConsent(false, false, "default_denied"));
    showCookieBanner(false);
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a");
    if (!link) {
      return;
    }

    var href = link.getAttribute("href") || "";
    if (href.indexOf("tel:") === 0) {
      track("click_phone", {
        number: PHONE_NUMBER,
        target: href,
        track: link.dataset.track || "phone"
      });
      return;
    }

    if (href.indexOf("https://wa.me") === 0 || href.indexOf("http://wa.me") === 0 || href.indexOf("wa.me") === 0) {
      track("click_whatsapp", {
        number: WHATSAPP_NUMBER,
        target: href,
        track: link.dataset.track || "whatsapp"
      });
    }
  });

  var forms = document.querySelectorAll("form");
  for (var f = 0; f < forms.length; f += 1) {
    forms[f].addEventListener("submit", function () {
      track("submit_form", {
        form_id: this.id || "contact_form"
      });
    });
  }

  function initStickyCta() {
    var stickyBar = document.querySelector(".mobile-sticky-cta");
    if (!stickyBar) {
      return;
    }

    var heroCtas = document.getElementById("hero-ctas");
    var mobileQuery = window.matchMedia("(max-width: 820px)");

    function setStickyVisible(isVisible) {
      stickyBar.classList.toggle("is-visible", Boolean(isVisible));
    }

    function onMediaChange() {
      if (!mobileQuery.matches) {
        setStickyVisible(false);
      }
    }

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", onMediaChange);
    } else if (typeof mobileQuery.addListener === "function") {
      mobileQuery.addListener(onMediaChange);
    }

    if (!heroCtas) {
      setStickyVisible(mobileQuery.matches);
      return;
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        var entry = entries[0];
        var heroVisible = Boolean(entry && entry.isIntersecting);
        setStickyVisible(mobileQuery.matches && !heroVisible);
      }, { threshold: 0.05 });

      observer.observe(heroCtas);
      return;
    }

    function onScrollFallback() {
      if (!mobileQuery.matches) {
        setStickyVisible(false);
        return;
      }
      setStickyVisible(window.scrollY > 250);
    }

    window.addEventListener("scroll", onScrollFallback, { passive: true });
    onScrollFallback();
  }

  initCookieConsent();
  initStickyCta();

  var yearNode = document.querySelector("[data-current-year]");
  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }
})();
