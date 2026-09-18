(() => {
  "use strict";

  const CATEGORY_ICONS = {
    world: "icon-world",
    crypto: "icon-crypto",
    economy: "icon-economy",
    politics: "icon-politics",
    ai: "icon-ai",
    trends: "icon-trends",
    "stock-market": "icon-stock",
    marketing: "icon-marketing",
    technology: "icon-technology",
    business: "icon-business",
    "fashion-men": "icon-fashion",
    architecture: "icon-architecture"
  };

  const SAVED_KEY = "cii_saved_articles_v1";

  const els = {
    nav: document.getElementById("category-nav"),
    viewRoot: document.getElementById("view-root"),
    savedToggle: document.getElementById("saved-toggle"),
    savedCount: document.getElementById("saved-count"),
    todayDate: document.getElementById("today-date"),
    greeting: document.getElementById("greeting"),
    syncBanner: document.getElementById("sync-banner"),
    syncBannerText: document.getElementById("sync-banner-text"),
    footerSync: document.getElementById("footer-sync"),
    cardTemplate: document.getElementById("article-card-template")
  };

  let newsData = null;
  let currentView = "briefing";

  function loadSaved() {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function persistSaved(list) {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    } catch {
      /* storage unavailable */
    }
  }

  let savedArticles = loadSaved();

  function isSaved(id) {
    return savedArticles.some((a) => a.id === id);
  }

  function toggleSaved(article) {
    if (isSaved(article.id)) {
      savedArticles = savedArticles.filter((a) => a.id !== article.id);
    } else {
      savedArticles = [{ ...article, savedAt: new Date().toISOString() }, ...savedArticles];
    }
    persistSaved(savedArticles);
    updateSavedCount();
    document.querySelectorAll(`[data-id="${article.id}"] .card-bookmark`).forEach((btn) => {
      setBookmarkState(btn, isSaved(article.id));
    });
    if (currentView === "saved") renderSaved();
  }

  function setBookmarkState(button, saved) {
    button.classList.toggle("is-saved", saved);
    button.setAttribute("aria-pressed", String(saved));
    button.setAttribute("aria-label", saved ? "Remove from saved" : "Save article");
    button.innerHTML = `<svg class="icon" width="18" height="18"><use href="#${saved ? "icon-bookmark-filled" : "icon-bookmark"}"/></svg>`;
  }

  function updateSavedCount() {
    els.savedCount.textContent = String(savedArticles.length);
  }

  function timeAgo(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const diffMs = Date.now() - date.getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function initials(source) {
    return (source || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }

  function buildCard(article, categoryId, categoryLabel) {
    const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = article.id;
    node.dataset.category = categoryId;

    const bookmarkBtn = node.querySelector(".card-bookmark");
    setBookmarkState(bookmarkBtn, isSaved(article.id));
    bookmarkBtn.addEventListener("click", () =>
      toggleSaved({
        id: article.id,
        title: article.title,
        url: article.url,
        source: article.source,
        sourceUrl: article.sourceUrl,
        publishedAt: article.publishedAt,
        summary: article.summary,
        image: article.image,
        category: categoryId,
        categoryLabel
      })
    );

    const media = node.querySelector(".card-media");
    const img = media.querySelector("img");
    const fallback = media.querySelector(".card-media-fallback");
    media.href = article.url || "#";
    if (article.image) {
      img.src = article.image;
      img.alt = article.title;
      img.addEventListener("error", () => {
        img.hidden = true;
        fallback.textContent = categoryLabel;
      });
      fallback.hidden = true;
    } else {
      img.hidden = true;
      fallback.textContent = categoryLabel;
    }

    node.querySelector(".card-category").textContent = categoryLabel;
    node.querySelector(".card-time").textContent = timeAgo(article.publishedAt);

    const titleLink = node.querySelector(".card-title a");
    titleLink.textContent = article.title;
    titleLink.href = article.url || "#";

    node.querySelector(".card-summary").textContent = article.summary || "";

    const sourceEl = node.querySelector(".card-source");
    sourceEl.textContent = article.source || initials(categoryLabel);

    const readMore = node.querySelector(".card-readmore");
    readMore.href = article.url || "#";

    return node;
  }

  function sectionHeading(label, iconId, linkView) {
    const wrap = document.createElement("div");
    wrap.className = "section-heading";
    wrap.innerHTML = `
      <h2><svg class="icon" width="20" height="20"><use href="#${iconId}"/></svg>${label}</h2>
      ${linkView ? `<a class="section-link" href="#" data-goto="${linkView}">View all 5 →</a>` : ""}
    `;
    const link = wrap.querySelector(".section-link");
    if (link) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        setView(linkView);
      });
    }
    return wrap;
  }

  function renderBriefing() {
    const root = els.viewRoot;
    root.innerHTML = "";

    const intro = document.createElement("div");
    intro.innerHTML = `
      <h1 class="briefing-title">Your Morning Briefing</h1>
      <p class="briefing-subtitle">Top emerging-market and global signals, curated across ${Object.keys(newsData.categories).length} sectors.</p>
    `;
    root.appendChild(intro);

    const grid = document.createElement("div");
    grid.className = "card-grid";
    Object.entries(newsData.categories).forEach(([id, cat]) => {
      const top = cat.articles[0];
      if (!top) return;
      const card = buildCard(top, id, cat.label);
      grid.appendChild(card);
    });
    root.appendChild(grid);
  }

  function renderCategory(categoryId) {
    const cat = newsData.categories[categoryId];
    const root = els.viewRoot;
    root.innerHTML = "";
    if (!cat) {
      root.innerHTML = `<div class="empty-state">Category not found.</div>`;
      return;
    }

    root.appendChild(sectionHeading(cat.label, CATEGORY_ICONS[categoryId] || "icon-briefing", null));

    if (!cat.articles.length) {
      root.innerHTML += `<div class="empty-state">No articles available for this section yet.</div>`;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "card-grid";
    cat.articles.forEach((article) => grid.appendChild(buildCard(article, categoryId, cat.label)));
    root.appendChild(grid);
  }

  function renderSaved() {
    const root = els.viewRoot;
    root.innerHTML = "";

    const heading = document.createElement("div");
    heading.className = "saved-header";
    heading.innerHTML = `<h1 class="briefing-title">Saved Articles</h1><p class="briefing-subtitle">Stories you've bookmarked to read later, with links back to the original publisher.</p>`;
    root.appendChild(heading);

    if (!savedArticles.length) {
      root.innerHTML += `
        <div class="saved-empty">
          <svg class="icon" width="36" height="36"><use href="#icon-bookmark"/></svg>
          <p>You haven't saved any articles yet. Click the bookmark icon on any story to keep it here.</p>
        </div>`;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "card-grid";
    savedArticles.forEach((article) => {
      grid.appendChild(buildCard(article, article.category, article.categoryLabel));
    });
    root.appendChild(grid);
  }

  function render() {
    if (!newsData) return;
    if (currentView === "briefing") renderBriefing();
    else if (currentView === "saved") renderSaved();
    else renderCategory(currentView);

    document.querySelectorAll(".nav-pill").forEach((pill) => {
      pill.classList.toggle("is-active", pill.dataset.view === currentView);
    });
    els.savedToggle.classList.toggle("is-active", currentView === "saved");
    els.savedToggle.setAttribute("aria-pressed", String(currentView === "saved"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setView(view) {
    currentView = view;
    render();
  }

  function buildNav() {
    Object.entries(newsData.categories).forEach(([id, cat]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-pill";
      btn.dataset.view = id;
      btn.innerHTML = `<svg class="icon" width="16" height="16"><use href="#${CATEGORY_ICONS[id] || "icon-briefing"}"/></svg>${cat.label}`;
      btn.addEventListener("click", () => setView(id));
      els.nav.appendChild(btn);
    });
  }

  function setDate() {
    const now = new Date();
    const hour = now.getHours();
    els.greeting.textContent = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    els.todayDate.textContent = now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  function setSyncInfo() {
    const generated = newsData.generatedAt ? new Date(newsData.generatedAt) : null;
    const formatted = generated
      ? generated.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "—";
    els.footerSync.textContent = formatted;

    if (newsData.isSample) {
      els.syncBanner.hidden = false;
      els.syncBannerText.textContent =
        "Preview mode — showing placeholder stories. Run the daily sync (npm run fetch-news, or the scheduled GitHub Action) to populate today's real headlines.";
    }
  }

  els.savedToggle.addEventListener("click", () => {
    setView(currentView === "saved" ? "briefing" : "saved");
  });

  async function init() {
    updateSavedCount();
    setDate();
    try {
      const res = await fetch("data/news.json", { cache: "no-store" });
      newsData = await res.json();
    } catch (err) {
      els.viewRoot.innerHTML = `<div class="empty-state">Unable to load today's briefing. Please refresh, or check back shortly.</div>`;
      console.error(err);
      return;
    }
    buildNav();
    setSyncInfo();
    render();
  }

  init();
})();
