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

  var yearNode = document.querySelector("[data-current-year]");
  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }
})();
