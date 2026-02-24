(function () {
  "use strict";

  var PHONE_NUMBER = "3517943571";
  var WHATSAPP_NUMBER = "393517943571";

  function track(eventName, params) {
    var payload = Object.assign({ event: eventName, page: window.location.pathname }, params || {});

    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(payload);
    } else {
      console.log("[tracking]", payload);
    }
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a");
    if (!link) {
      return;
    }

    var href = link.getAttribute("href") || "";
    if (href.indexOf("tel:") === 0) {
      track("click_phone", { number: PHONE_NUMBER, target: href, track: link.dataset.track || "phone" });
      return;
    }

    if (href.indexOf("https://wa.me") === 0 || href.indexOf("http://wa.me") === 0 || href.indexOf("wa.me") === 0) {
      track("click_whatsapp", { number: WHATSAPP_NUMBER, target: href, track: link.dataset.track || "whatsapp" });
    }
  });

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

  initStickyCta();

  var yearNode = document.querySelector("[data-current-year]");
  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }
})();
