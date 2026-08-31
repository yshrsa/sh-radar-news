/**
 * SH-Radar News — Client App
 * Fetches articles from static JSON (GitHub Pages) or Cloudflare Worker /news endpoint.
 * Static JSON is preferred to avoid corporate firewall blocks on workers.dev.
 */

const API_BASE = 'https://notion-chatbot-api.sh-radar.workers.dev';
const STATIC_DATA_URL = './data/news-7d.json';
let currentHours = 24;

// ============ THEME TOGGLE ============

(function() {
  const toggle = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);
  updateToggleIcon(toggle, theme);

  toggle && toggle.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', theme);
    toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
    updateToggleIcon(toggle, theme);
  });
})();

function updateToggleIcon(toggle, theme) {
  if (!toggle) return;
  toggle.innerHTML = theme === 'dark'
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
}

// ============ TIME FILTER ============

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentHours = parseInt(btn.dataset.hours);
    fetchNews();
  });
});

// ============ CATEGORY ICONS ============

const CATEGORY_ICONS = {
  'TAVR / THV': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  'Mitral': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  'Tricuspid': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  'LAAC / LAA': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  'Regulatory': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  'M&A / Business': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  'Digital Health / AI': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
  'Imaging / Diagnostics': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  'Heart Failure': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  'Other Structural': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  'Structural Heart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  'Regulatory / FDA': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  'Clinical Trial': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>',
  'Interventional Cardiology': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  'General MedTech': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
};

function getCategoryIcon(cat) {
  return CATEGORY_ICONS[cat] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
}

// ============ DATA SOURCE ============

/**
 * Filter the full 7-day dataset to only include articles within the requested hours.
 */
function filterByHours(fullData, hours) {
  const since = new Date();
  since.setHours(since.getHours() - hours);
  const sinceStr = since.toISOString().split('T')[0];

  const grouped = {};
  let total = 0;

  for (const cat of fullData.categories) {
    const articles = (fullData.articles[cat] || []).filter(a => {
      if (!a.published) return false;
      return a.published >= sinceStr;
    });
    if (articles.length > 0) {
      grouped[cat] = articles;
      total += articles.length;
    }
  }

  const categories = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length);

  return { since: sinceStr, hours, total, categories, articles: grouped };
}

/**
 * Try live API first (real-time data), fall back to static JSON if blocked.
 * This ensures personal devices get fresh data while corporate PCs still work.
 */
async function fetchNewsData(hours) {
  // Strategy 1: Live API (real-time, preferred)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(`${API_BASE}/news?hours=${hours}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`API error ${resp.status}`);
    const data = await resp.json();
    console.log('Data loaded from live API');
    return data;
  } catch (e) {
    console.warn('Live API unavailable:', e.message);
  }

  // Strategy 2: Static JSON from GitHub Pages (fallback for corporate firewalls)
  try {
    const cacheBust = `?t=${Math.floor(Date.now() / 60000)}`;
    const resp = await fetch(`${STATIC_DATA_URL}${cacheBust}`);
    if (resp.ok) {
      const fullData = await resp.json();
      if (fullData && fullData.total > 0) {
        console.log('Data loaded from static JSON (API was blocked)');
        return filterByHours(fullData, hours);
      }
    }
  } catch (e) {
    console.warn('Static JSON also unavailable:', e.message);
  }

  throw new Error('All data sources failed. Live API may be blocked by a corporate firewall, and static data is unavailable.');
}

// ============ FETCH & RENDER ============

async function fetchNews() {
  const loadingEl = document.getElementById('loading-state');
  const emptyEl = document.getElementById('empty-state');
  const errorEl = document.getElementById('error-state');
  const container = document.getElementById('categories-container');

  // Show loading
  loadingEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  container.innerHTML = '';

  try {
    const data = await fetchNewsData(currentHours);

    loadingEl.classList.add('hidden');

    if (data.total === 0) {
      emptyEl.classList.remove('hidden');
      updateStats(0, 0, 0);
      return;
    }

    // Count high-relevance articles (Notion values may include traffic-light emoji).
    let highCount = 0;
    for (const cat of data.categories) {
      for (const a of data.articles[cat]) {
        if (normalizeRelevance(a.relevance) === 'High') highCount++;
      }
    }

    updateStats(data.total, data.categories.length, highCount);

    // Render categories
    for (const cat of data.categories) {
      const articles = data.articles[cat];
      const section = createCategorySection(cat, articles);
      container.appendChild(section);
    }

    // Scroll reveal
    observeReveal();

  } catch (err) {
    console.error('Fetch error:', err);
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    // Show detailed error info for debugging
    const errorDetail = errorEl.querySelector('.error-detail') || document.createElement('p');
    errorDetail.className = 'error-detail';
    errorDetail.style.cssText = 'font-size:0.75rem;color:var(--color-text-muted,#888);margin-top:0.5rem;word-break:break-all;max-width:600px;';
    errorDetail.textContent = err.message;
    if (!errorEl.querySelector('.error-detail')) errorEl.appendChild(errorDetail);
    updateStats(0, 0, 0);
  }
}

function updateStats(total, cats, high) {
  document.querySelector('#stat-total .stat-value').textContent = total;
  document.querySelector('#stat-categories .stat-value').textContent = cats;
  document.querySelector('#stat-high .stat-value').textContent = high;
  document.getElementById('stat-time').textContent = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function normalizeRelevance(value) {
  const text = String(value || '').trim();
  if (text.endsWith('High')) return 'High';
  if (text.endsWith('Medium')) return 'Medium';
  if (text.endsWith('Low')) return 'Low';
  return '';
}

function createCategorySection(categoryName, articles) {
  const section = document.createElement('section');
  section.className = 'category-section reveal';

  section.innerHTML = `
    <div class="category-header">
      <div class="category-icon">${getCategoryIcon(categoryName)}</div>
      <h2 class="category-name">${escapeHtml(categoryName)}</h2>
      <span class="category-count">${articles.length}</span>
    </div>
    <div class="articles-grid">
      ${articles.map(a => createArticleCard(a)).join('')}
    </div>
  `;

  return section;
}

function createArticleCard(article) {
  const relevance = normalizeRelevance(article.relevance);
  const relevanceClass = relevance === 'High' ? 'high-relevance'
    : relevance === 'Medium' ? 'medium-relevance' : '';

  const relevanceBadge = relevance === 'High'
    ? '<span class="badge badge-high">High</span>'
    : relevance === 'Medium'
    ? '<span class="badge badge-medium">Medium</span>'
    : relevance === 'Low'
    ? '<span class="badge badge-low">Low</span>'
    : '';

  const sourceBadge = article.source
    ? `<span class="badge badge-source">${escapeHtml(article.source)}</span>`
    : '';

  const typeBadge = article.study_type
    ? `<span class="badge badge-type">${escapeHtml(article.study_type)}</span>`
    : '';

  const dateStr = article.published
    ? formatDate(article.published)
    : '';

  const titleLink = article.url
    ? `<a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a>`
    : escapeHtml(article.title);

  const summary = article.summary_jp || article.summary_en || '';

  const outcomesHtml = article.outcomes
    ? `<div class="card-outcomes">${escapeHtml(article.outcomes)}</div>`
    : '';

  const journalHtml = article.journal
    ? `<span class="card-journal">${escapeHtml(article.journal)}</span>`
    : '';

  const authorsHtml = article.authors
    ? `<span class="card-authors">${escapeHtml(truncateAuthors(article.authors))}</span>`
    : '';

  return `
    <article class="article-card ${relevanceClass}">
      <div class="card-top">
        <div class="card-meta">${relevanceBadge}${sourceBadge}${typeBadge}</div>
        <span class="card-date">${dateStr}</span>
      </div>
      <h3 class="card-title">${titleLink}</h3>
      ${summary ? `<p class="card-summary">${escapeHtml(summary)}</p>` : ''}
      ${outcomesHtml}
      <div class="card-bottom">
        ${journalHtml}
        ${authorsHtml}
      </div>
    </article>
  `;
}

// ============ HELPERS ============

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    if (diffH < 48) return 'Yesterday';
    return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function truncateAuthors(authors) {
  if (!authors) return '';
  const parts = authors.split(',');
  if (parts.length <= 2) return authors;
  return parts[0].trim() + ' et al.';
}

// ============ SCROLL REVEAL ============

function observeReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ============ INIT ============
fetchNews();
