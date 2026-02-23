const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(el => obs.observe(el));

    const I18N = window.TRUELOCK_I18N;
    const langs = I18N?.supported || ["ru", "en"];
    const locales = I18N?.locales || {};
    const defaultLang = "en";
    let currentLang = defaultLang;
    let activeTab = "all";

    const howSlides = Array.from(document.querySelectorAll(".how-slide"));
    const howDots = Array.from(document.querySelectorAll(".how-dot"));
    const howPrev = document.getElementById("howPrev");
    const howNext = document.getElementById("howNext");
    const menuToggle = document.getElementById("menuToggle");
    const mobileMenu = document.getElementById("mobileMenu");
    let howIndex = 0;

    function setMobileMenuOpen(open) {
      if (!menuToggle || !mobileMenu) return;
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      mobileMenu.hidden = !open;
      mobileMenu.style.display = open ? "flex" : "none";
      const icon = menuToggle.querySelector(".menu-toggle-icon");
      if (icon) icon.textContent = open ? "✕" : "☰";
    }

    function safeLocale(lang) {
      if (locales[lang]) return locales[lang];
      return locales[defaultLang] || locales.ru || locales.en;
    }

    function updateSeo(t, lang) {
      const title = t.seo?.title || "TrueLock";
      const desc = t.seo?.description || "";
      document.title = title;
      const mDesc = document.getElementById("seoDescription");
      const ogTitle = document.getElementById("ogTitle");
      const ogDesc = document.getElementById("ogDescription");
      const twTitle = document.getElementById("twitterTitle");
      const twDesc = document.getElementById("twitterDescription");
      const canonical = document.getElementById("seoCanonical");
      const ogUrl = document.getElementById("ogUrl");
      if (mDesc) mDesc.setAttribute("content", desc);
      if (ogTitle) ogTitle.setAttribute("content", title);
      if (ogDesc) ogDesc.setAttribute("content", desc);
      if (twTitle) twTitle.setAttribute("content", title);
      if (twDesc) twDesc.setAttribute("content", desc);
      if (ogUrl) ogUrl.setAttribute("content", "https://truelock.pro/");
      if (canonical) canonical.setAttribute("href", "https://truelock.pro/");
    }

    function updateHeader(t) {
      const navLinks = document.querySelectorAll(".main-nav a, .mobile-nav a");
      if (navLinks[0]) navLinks[0].textContent = t.nav.who;
      if (navLinks[1]) navLinks[1].textContent = t.nav.how;
      if (navLinks[2]) navLinks[2].textContent = t.nav.templates;
      if (navLinks[3]) navLinks[3].textContent = t.nav.security;
      if (navLinks[4]) navLinks[4].textContent = t.nav.pricing;
      if (navLinks[5]) navLinks[5].textContent = t.nav.who;
      if (navLinks[6]) navLinks[6].textContent = t.nav.how;
      if (navLinks[7]) navLinks[7].textContent = t.nav.templates;
      if (navLinks[8]) navLinks[8].textContent = t.nav.security;
      if (navLinks[9]) navLinks[9].textContent = t.nav.pricing;
      if (navLinks[10]) navLinks[10].textContent = t.nav.download;
      const topBtn = document.querySelector(".header-inner .btn-primary");
      if (topBtn) topBtn.textContent = t.nav.download;
      const select = document.getElementById("langSwitch");
      if (select) select.value = currentLang;
    }

    function updateHero(t) {
      const root = document.getElementById("top");
      if (!root) return;
      const leads = root.querySelectorAll(".hero-lead");
      root.querySelector(".eyebrow").textContent = t.hero.eyebrow;
      root.querySelector("h1").textContent = t.hero.title;
      if (leads[0]) leads[0].textContent = t.hero.lead;
      if (leads[1]) leads[1].textContent = t.hero.sub;
      const ctas = root.querySelectorAll(".cta-row .btn");
      if (ctas[0]) ctas[0].textContent = t.hero.ctaPrimary;
      if (ctas[1]) ctas[1].textContent = t.hero.ctaSecondary;
      const badges = root.querySelectorAll(".hero-badges .badge");
      (t.hero.badges || []).forEach((txt, idx) => { if (badges[idx]) badges[idx].textContent = txt; });
      const vLabel = root.querySelector(".hero-video-label");
      if (vLabel) vLabel.textContent = t.hero.videoLabel;
    }

    function setListItems(listEl, items) {
      if (!listEl) return;
      const lis = listEl.querySelectorAll("li");
      (items || []).forEach((text, idx) => { if (lis[idx]) lis[idx].textContent = text; });
    }

    function updatePain(t) {
      const root = document.getElementById("pain");
      if (!root) return;
      root.querySelector(".section-title").textContent = t.pain.title;
      const cards = root.querySelectorAll(".pain-card");
      if (cards[0]) {
        cards[0].querySelector("h3").textContent = t.pain.problemTitle;
        cards[0].querySelector(".pain-intro").textContent = t.pain.problemIntro;
        setListItems(cards[0].querySelector(".pain-list"), t.pain.problemItems);
      }
      if (cards[1]) {
        cards[1].querySelector("h3").textContent = t.pain.solutionTitle;
        cards[1].querySelector(".pain-intro").textContent = t.pain.solutionIntro;
        setListItems(cards[1].querySelector(".pain-list"), t.pain.solutionItems);
      }
    }

    function updatePersonas(t) {
      const root = document.getElementById("personas");
      if (!root) return;
      root.querySelector(".eyebrow").textContent = t.personas.eyebrow;
      root.querySelector(".section-title").textContent = t.personas.title;
      const sub = root.querySelector(".section-title + p");
      if (sub) sub.textContent = t.personas.subtitle;
      const cards = root.querySelectorAll(".persona-card");
      (t.personas.cards || []).forEach((c, idx) => {
        const card = cards[idx];
        if (!card) return;
        const rows = card.querySelectorAll("div");
        if (rows[0]) rows[0].textContent = c.tag;
        if (rows[1]) rows[1].textContent = c.pain;
        if (rows[2]) rows[2].textContent = c.solution;
        if (rows[3]) rows[3].textContent = c.mechanic;
      });
    }

    function updateChainBlock(chainId, cfg) {
      const root = document.getElementById("chain-" + chainId);
      if (!root || !cfg) return;
      const label = root.querySelector(".chain-label");
      const title = root.querySelector(".chain-title");
      if (label) label.textContent = cfg.label;
      if (title) title.textContent = cfg.title;
      const steps = root.querySelectorAll(".cstep");
      (cfg.steps || []).forEach((step, idx) => {
        const block = steps[idx];
        if (!block) return;
        const st = block.querySelector(".cstep-title");
        const sd = block.querySelector(".cstep-desc");
        if (st) st.textContent = step[0];
        if (sd) sd.textContent = step[1];
      });
      const pills = root.querySelectorAll(".chain-pill");
      if (pills[0]) pills[0].textContent = cfg.logicLeft;
      if (pills[1]) pills[1].textContent = cfg.logicRight;
      const mid = root.querySelector(".chain-or, .chain-and");
      if (mid) mid.textContent = cfg.logicMid;
    }

    function updateChains(t) {
      const root = document.getElementById("chains");
      if (!root) return;
      root.querySelector(".eyebrow").textContent = t.chains.eyebrow;
      root.querySelector(".section-title").textContent = t.chains.title;
      const sub = root.querySelector(".section-title + p");
      if (sub) sub.textContent = t.chains.subtitle;
      const tabs = root.querySelectorAll(".chain-tab");
      (t.chains.tabs || []).forEach((txt, idx) => { if (tabs[idx]) tabs[idx].textContent = txt; });
      updateChainBlock("caper", t.chains.caper);
      updateChainBlock("shop", t.chains.shop);
      updateChainBlock("flash", t.chains.flash);
    }

    function updateHow(t) {
      const root = document.getElementById("how");
      if (!root) return;
      root.querySelector(".eyebrow").textContent = t.how.eyebrow;
      root.querySelector(".section-title").textContent = t.how.title;
      howSlides.forEach((slide, idx) => {
        const cfg = (t.how.steps || [])[idx];
        if (!cfg) return;
        const ph = slide.querySelector(".how-media-placeholder");
        const st = slide.querySelector(".how-step-title");
        const sd = slide.querySelector(".how-step-desc");
        if (ph) ph.textContent = cfg[0];
        if (st) st.textContent = cfg[1];
        if (sd) sd.textContent = cfg[2];
      });
      if (howPrev) howPrev.textContent = t.how.prev;
      if (howNext) howNext.textContent = t.how.next;
      const dots = document.getElementById("howDots");
      if (dots) dots.setAttribute("aria-label", t.how.dotsLabel);
      howDots.forEach((dot, idx) => dot.setAttribute("aria-label", `${t.how.dotsLabel} ${idx + 1}`));
      const caseRoot = root.querySelector(".how-case");
      if (!caseRoot) return;
      const label = caseRoot.querySelector(".how-case-label");
      const title = caseRoot.querySelector(".how-case-title");
      const desc = caseRoot.querySelector(".how-case-desc");
      if (label) label.textContent = t.how.caseLabel;
      if (title) title.textContent = t.how.caseTitle;
      if (desc) desc.textContent = t.how.caseDesc;
      const rows = caseRoot.querySelectorAll(".how-case-row");
      if (rows[0]) {
        rows[0].querySelector(".how-case-row-title").textContent = t.how.badTitle;
        rows[0].querySelector(".how-case-flow").textContent = t.how.badFlow;
        rows[0].querySelector(".how-case-note").textContent = t.how.badNote;
      }
      if (rows[1]) {
        rows[1].querySelector(".how-case-row-title").textContent = t.how.goodTitle;
        rows[1].querySelector(".how-case-flow").textContent = t.how.goodFlow;
        rows[1].querySelector(".how-case-note").textContent = t.how.goodNote;
      }
    }

    function currentTemplates() {
      const texts = I18N.templateText[currentLang] || I18N.templateText.en || {};
      return I18N.templateBase.map(item => ({ ...item, ...(texts[item.id] || {}) }));
    }

    function renderTemplates(t) {
      const tabsRoot = document.getElementById("tabs");
      const listRoot = document.getElementById("tplList");
      const top = document.getElementById("templates");
      if (!tabsRoot || !listRoot || !top) return;
      top.querySelector(".eyebrow").textContent = t.templates.eyebrow;
      top.querySelector(".section-title").textContent = t.templates.title;
      const sub = top.querySelector(".section-title + p");
      if (sub) sub.textContent = t.templates.subtitle;

      const labels = t.templates.tabs;
      tabsRoot.innerHTML = Object.entries(labels).map(([k, v]) =>
        `<button class="tab${activeTab === k ? " active" : ""}" onclick="setTab('${k}')">${v}</button>`
      ).join("");

      const allTpl = currentTemplates();
      const items = activeTab === "all" ? allTpl : allTpl.filter(x => x.cat === activeTab);
      listRoot.innerHTML = items.map(x =>
        `<div class="tpl"><span class="tpl-emoji">${x.emoji}</span><div><div class="tpl-name">${x.name || ""}</div><div class="tpl-desc">${x.desc || ""}</div></div></div>`
      ).join("");

      const count = top.querySelector(".template-count");
      if (count) count.innerHTML = `${allTpl.length}<small>${t.templates.countSuffix}</small>`;
    }

    function updateSecurity(t) {
      const root = document.getElementById("security");
      if (!root) return;
      root.querySelector(".eyebrow").textContent = t.security.eyebrow;
      root.querySelector(".section-title").textContent = t.security.title;
      const points = root.querySelectorAll(".sec-point");
      (t.security.points || []).forEach((item, idx) => {
        const node = points[idx];
        if (!node) return;
        const strong = node.querySelector(".sec-text strong");
        const p = node.querySelector(".sec-text p");
        if (strong) strong.textContent = item[0];
        if (p) p.textContent = item[1];
      });
      const docs = root.querySelector(".sec-docs");
      if (docs) {
        const h3 = docs.querySelector("h3");
        const note = docs.querySelector(".sec-note");
        const links = docs.querySelectorAll(".doc-link");
        const docsData = Array.isArray(t.security.docs) ? t.security.docs : [];
        if (h3) h3.textContent = t.security.docsTitle;
        links.forEach((link, idx) => {
          if (idx === 0 && docsData[0]) {
            link.textContent = docsData[0];
            link.style.display = "";
          } else {
            link.style.display = "none";
          }
        });
        if (note) note.textContent = `💡 ${t.security.docsNote}`;
      }
    }

    function updatePricing(t) {
      const root = document.getElementById("pricing");
      if (!root) return;
      root.querySelector(".eyebrow").textContent = t.pricing.eyebrow;
      root.querySelector(".section-title").textContent = t.pricing.title;
      const cards = root.querySelectorAll(".price-card");
      if (cards[0]) {
        cards[0].querySelector(".price-name").textContent = t.pricing.freeName;
        cards[0].querySelector(".price-note").textContent = t.pricing.freeNote;
        setListItems(cards[0].querySelector(".price-features"), t.pricing.freeFeatures);
      }
      if (cards[1]) {
        cards[1].querySelector(".price-name").textContent = t.pricing.proName;
        cards[1].querySelector(".price-note").textContent = t.pricing.proNote;
        setListItems(cards[1].querySelector(".price-features"), t.pricing.proFeatures);
        const btn = cards[1].querySelector(".btn");
        if (btn) btn.textContent = t.pricing.buyButton;
      }
    }

    function updateDownload(t) {
      const root = document.getElementById("download");
      if (!root) return;
      const h2 = root.querySelector("h2");
      const p = root.querySelector("p");
      if (h2) h2.innerHTML = t.download.titleHtml;
      if (p) p.textContent = t.download.subtitle;
      const buttons = root.querySelectorAll(".download-btns .btn");
      if (buttons[0]) buttons[0].textContent = t.download.android;
      if (buttons[1]) buttons[1].textContent = t.download.windows;
      if (buttons[2]) buttons[2].textContent = t.download.linux;
      if (buttons[3]) buttons[3].textContent = t.download.iosSoon;
      if (buttons[4]) buttons[4].textContent = t.download.macSoon;
    }

    function updateFooter(t) {
      const txt = document.querySelector("footer .footer-text");
      const stat = document.querySelector("footer .footer-inner > div:last-child");
      if (txt) txt.innerHTML = t.footer.textHtml;
      if (stat) stat.innerHTML = t.footer.statsHtml;
    }

    function applyLang(lang) {
      currentLang = langs.includes(lang) ? lang : defaultLang;
      const t = safeLocale(currentLang);
      document.documentElement.lang = currentLang;
      updateSeo(t, currentLang);
      updateHeader(t);
      updateHero(t);
      updatePain(t);
      updatePersonas(t);
      updateChains(t);
      updateHow(t);
      renderTemplates(t);
      updateSecurity(t);
      updatePricing(t);
      updateDownload(t);
      updateFooter(t);
      localStorage.setItem("truelock_landing_lang", currentLang);
    }

    function renderHowCarousel() {
      if (!howSlides.length) return;
      howSlides.forEach((slide, idx) => slide.classList.toggle("active", idx === howIndex));
      howDots.forEach((dot, idx) => dot.classList.toggle("active", idx === howIndex));
      if (howPrev) howPrev.disabled = (howIndex === 0);
      if (howNext) howNext.disabled = (howIndex === howSlides.length - 1);
    }

    function goHowStep(nextIndex) {
      const max = howSlides.length - 1;
      howIndex = Math.max(0, Math.min(nextIndex, max));
      renderHowCarousel();
    }

    howPrev?.addEventListener("click", () => goHowStep(howIndex - 1));
    howNext?.addEventListener("click", () => goHowStep(howIndex + 1));
    howDots.forEach((dot, idx) => dot.addEventListener("click", () => goHowStep(idx)));
    renderHowCarousel();

    window.setTab = function(cat) {
      activeTab = cat;
      applyLang(currentLang);
    };

    window.showChain = function(id, btn) {
      document.querySelectorAll(".chain-wrap").forEach(el => { el.style.display = "none"; });
      document.querySelectorAll(".chain-tab").forEach(el => el.classList.remove("active"));
      document.getElementById("chain-" + id).style.display = "block";
      btn.classList.add("active");
    };

    menuToggle?.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      setMobileMenuOpen(!isOpen);
    });

    mobileMenu?.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMobileMenuOpen(false));
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1020) setMobileMenuOpen(false);
    });

    const storedLang = localStorage.getItem("truelock_landing_lang");
    const initialLang = langs.includes(storedLang) ? storedLang : defaultLang;
    applyLang(initialLang);
    setMobileMenuOpen(false);
    document.getElementById("langSwitch")?.addEventListener("change", (e) => applyLang(e.target.value));
