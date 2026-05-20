const state = {
  data: null,
  watch: null,
  activeTopic: "",
  search: "",
  party: "all",
  topic: "all",
  status: "all"
};

const LEADERS = [
  {
    partyId: "national",
    name: "Christopher Luxon",
    role: "Prime Minister",
    frame: "National's entries are mostly current government record and plan pages."
  },
  {
    partyId: "labour",
    name: "Chris Hipkins",
    role: "Leader of the Opposition",
    frame: "Labour's entries include recent policy announcements and campaign-style pages."
  }
];

const TOPIC_NOTES = {
  "Tax & Economy": "Tax settings, public spending, investment, productivity and cost-of-living promises.",
  "Health": "Primary care, screening, medicines, workforce, hospitals and public health delivery.",
  "Education": "Schools, curriculum, tertiary education, apprenticeships, learning support and skills.",
  "Climate & Environment": "Emissions, farming, freshwater, biodiversity, adaptation and energy transition.",
  "Law & Justice": "Crime, policing, sentencing, courts, prisons, rehabilitation and public safety.",
  "Housing & Infrastructure": "Housing supply, planning, transport, infrastructure funding and delivery.",
  "Te Tiriti & Constitution": "Te Tiriti, constitutional settings, rangatiratanga and governance."
};

const TOPIC_QUESTIONS = {
  "Tax & Economy": "Who would change tax, investment settings, spending discipline or the cost-of-living response?",
  "Health": "What would change for doctor access, screening, medicines and frontline services?",
  "Education": "What would change in classrooms, curriculum, tertiary study and skills training?",
  "Climate & Environment": "How would parties handle emissions, farming, freshwater, conservation and adaptation?",
  "Law & Justice": "What would change for police, courts, sentencing, prisons and rehabilitation?",
  "Housing & Infrastructure": "What would change in housing supply, planning, transport and infrastructure funding?",
  "Te Tiriti & Constitution": "What would change in Te Tiriti, governance, rangatiratanga and constitutional settings?"
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  bindElements();
  bindEvents();
  await loadData();
});

function bindElements() {
  [
    "dataset-date",
    "policy-total",
    "topic-nav",
    "active-topic-count",
    "active-topic-title",
    "active-topic-note",
    "issue-snapshot",
    "lead-compare",
    "other-parties",
    "subtopic-map",
    "archive-count",
    "search-input",
    "party-filter",
    "topic-filter",
    "status-filter",
    "reset-button",
    "policy-list",
    "review-list",
    "source-watch-list"
  ].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });
}

function bindEvents() {
  els.topicNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-topic]");
    if (!button) return;
    setActiveTopic(button.dataset.topic, true);
  });

  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderArchive();
  });

  els.partyFilter.addEventListener("change", (event) => {
    state.party = event.target.value;
    renderArchive();
  });

  els.topicFilter.addEventListener("change", (event) => {
    state.topic = event.target.value;
    if (state.topic !== "all") setActiveTopic(state.topic, false);
    renderArchive();
  });

  els.statusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    renderArchive();
  });

  els.resetButton.addEventListener("click", () => {
    state.search = "";
    state.party = "all";
    state.topic = "all";
    state.status = "all";
    els.searchInput.value = "";
    els.partyFilter.value = "all";
    els.topicFilter.value = "all";
    els.statusFilter.value = "all";
    renderArchive();
  });
}

async function loadData() {
  try {
    const [policiesResponse, watchResponse] = await Promise.all([
      fetch("data/policies.json", { cache: "no-store" }),
      fetch("data/source-watch.json", { cache: "no-store" })
    ]);

    if (!policiesResponse.ok) {
      throw new Error(`Could not load policies.json (${policiesResponse.status})`);
    }

    state.data = await policiesResponse.json();
    state.watch = watchResponse.ok ? await watchResponse.json() : { sources: [] };
    state.activeTopic = state.data.topics[0] || "";

    populateFilters();
    renderAll();
  } catch (error) {
    els.issueSnapshot.innerHTML = `<article class="empty">Unable to load policy data. ${escapeHtml(error.message)}</article>`;
  }
}

function populateFilters() {
  setOptions(
    els.partyFilter,
    [{ value: "all", label: "All parties" }, ...state.data.parties.map((party) => ({ value: party.id, label: party.name }))]
  );
  setOptions(
    els.topicFilter,
    [{ value: "all", label: "All topics" }, ...state.data.topics.map((topic) => ({ value: topic, label: topic }))]
  );
  setOptions(
    els.statusFilter,
    [{ value: "all", label: "All statuses" }, ...state.data.statuses.map((status) => ({ value: status, label: status }))]
  );
}

function renderAll() {
  els.datasetDate.textContent = formatDate(state.data.metadata.lastUpdated);
  els.policyTotal.textContent = state.data.policies.length;

  renderTopicNav();
  renderActiveTopic();
  renderArchive();
  renderReviewQueue();
  renderSourceWatch();
}

function renderTopicNav() {
  els.topicNav.innerHTML = state.data.topics.map((topic, index) => {
    const policies = policiesFor({ topic });
    const partyCount = new Set(policies.map((policy) => policy.partyId)).size;
    const active = topic === state.activeTopic;

    return `
      <button class="topic-chip ${active ? "is-active" : ""}" type="button" data-topic="${escapeAttr(topic)}" aria-pressed="${active}">
        <span class="topic-index">${String(index + 1).padStart(2, "0")}</span>
        <span>
          <strong>${escapeHtml(topic)}</strong>
          <em>${escapeHtml(policies.length)} entries / ${escapeHtml(partyCount)} parties</em>
        </span>
      </button>
    `;
  }).join("");
}

function setActiveTopic(topic, shouldScroll) {
  state.activeTopic = topic;
  if (els.topicFilter.value !== "all") els.topicFilter.value = topic;
  renderTopicNav();
  renderActiveTopic();
  if (shouldScroll) {
    document.querySelector(".chapter").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderActiveTopic() {
  const policies = policiesFor({ topic: state.activeTopic });
  const parties = new Set(policies.map((policy) => policy.partyId));
  const statuses = new Set(policies.map((policy) => policy.status));
  const officialLinks = new Set(policies.map((policy) => policy.officialSource?.url).filter(Boolean));
  const latestCheck = latestDate(policies.map((policy) => policy.lastChecked));

  els.activeTopicTitle.textContent = state.activeTopic;
  els.activeTopicNote.textContent = TOPIC_NOTES[state.activeTopic] || "Official policy entries grouped by issue.";
  els.activeTopicCount.textContent = `${policies.length} ${policies.length === 1 ? "entry" : "entries"}`;

  els.issueSnapshot.innerHTML = `
    <article>
      <span>Policy question</span>
      <strong>${escapeHtml(TOPIC_QUESTIONS[state.activeTopic] || "What do official party sources say in this area?")}</strong>
    </article>
    <article>
      <span>Coverage</span>
      <strong>${escapeHtml(parties.size)} parties, ${escapeHtml(officialLinks.size)} official links</strong>
    </article>
    <article>
      <span>Status mix</span>
      <strong>${escapeHtml([...statuses].join(", ") || "No status yet")}</strong>
      <em>Latest check: ${escapeHtml(formatDate(latestCheck) || "Not checked")}</em>
    </article>
  `;

  renderLeadCompare();
  renderOtherParties();
  renderSubtopicMap();
}

function renderLeadCompare() {
  els.leadCompare.innerHTML = LEADERS.map((leader) => {
    const party = getParty(leader.partyId);
    const policies = policiesFor({ partyId: leader.partyId, topic: state.activeTopic });
    const body = policies.length
      ? policies.map((policy) => policyArticle(policy, "leader")).join("")
      : emptyPolicy(party.name, state.activeTopic);

    return `
      <article class="leader-card ${escapeAttr(leader.partyId)}">
        <div class="leader-name">
          <span class="party-rule" style="background:${escapeAttr(party.color)}"></span>
          <div>
            <p class="eyebrow">${escapeHtml(party.name)}</p>
            <h4>${escapeHtml(leader.name)}</h4>
            <p>${escapeHtml(leader.role)}</p>
          </div>
        </div>
        <p class="leader-frame">${escapeHtml(leader.frame)}</p>
        <div class="policy-thread">${body}</div>
      </article>
    `;
  }).join("");
}

function renderOtherParties() {
  const parties = state.data.parties.filter((party) => !["national", "labour"].includes(party.id));

  els.otherParties.innerHTML = parties.map((party) => {
    const policies = policiesFor({ partyId: party.id, topic: state.activeTopic });
    const summary = `${policies.length} ${policies.length === 1 ? "entry" : "entries"}`;
    const body = policies.length
      ? policies.map((policy) => policyArticle(policy, "compact")).join("")
      : emptyPolicy(party.name, state.activeTopic);

    return `
      <details class="party-drawer" ${policies.length ? "open" : ""}>
        <summary>
          <span class="party-rule" style="background:${escapeAttr(party.color)}"></span>
          <strong>${escapeHtml(party.name)}</strong>
          <em>${escapeHtml(summary)}</em>
        </summary>
        <div class="policy-thread">${body}</div>
      </details>
    `;
  }).join("");
}

function renderSubtopicMap() {
  const policies = policiesFor({ topic: state.activeTopic });
  const groups = groupBy(policies, (policy) => policy.subtopic || "General");

  if (!groups.length) {
    els.subtopicMap.innerHTML = '<article class="empty">No subtopics for this issue yet.</article>';
    return;
  }

  els.subtopicMap.innerHTML = groups.map(([subtopic, rows]) => {
    const parties = rows.map((row) => getParty(row.partyId)?.name).filter(Boolean);
    const statuses = [...new Set(rows.map((row) => row.status))];
    return `
      <article class="subtopic-row">
        <div>
          <span>${escapeHtml(rows.length)} ${rows.length === 1 ? "entry" : "entries"}</span>
          <h4>${escapeHtml(subtopic)}</h4>
          <p>${escapeHtml(parties.join(", "))}</p>
        </div>
        <div class="status-cloud">
          ${statuses.map((status) => statusPill(status)).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function renderArchive() {
  const filtered = getFilteredPolicies();
  els.archiveCount.textContent = `${filtered.length} of ${state.data.policies.length} entries`;

  if (!filtered.length) {
    els.policyList.innerHTML = '<article class="empty">No matching policy entries.</article>';
    return;
  }

  els.policyList.innerHTML = filtered.map((policy) => {
    const party = getParty(policy.partyId);
    return `
      <article class="archive-card">
        <span class="party-rule" style="background:${escapeAttr(party.color)}"></span>
        <p class="eyebrow">${escapeHtml(party.name)} / ${escapeHtml(policy.topic)}</p>
        <h3>${escapeHtml(policy.title)}</h3>
        <p>${escapeHtml(policy.summary)}</p>
        <div class="card-meta">
          ${statusPill(policy.status)}
          <span>${escapeHtml(policy.subtopic)}</span>
          <span>Checked ${escapeHtml(formatDate(policy.lastChecked))}</span>
        </div>
        <a href="${escapeAttr(policy.officialSource.url)}" target="_blank" rel="noopener">${escapeHtml(policy.officialSource.label)}</a>
      </article>
    `;
  }).join("");
}

function renderReviewQueue() {
  const rows = state.watch?.sources || [];
  const changed = rows.filter((row) => row.contentChanged === true);
  const errors = rows.filter((row) => row.status && row.status !== "ok");
  const reviewRows = [...changed, ...errors].slice(0, 8);

  if (!reviewRows.length) {
    els.reviewList.innerHTML = `
      <article class="review-card calm">
        <strong>No changed official sources waiting for review.</strong>
        <p>The daily checker will add items here and open a GitHub Issue when an official source changes.</p>
      </article>
    `;
    return;
  }

  els.reviewList.innerHTML = reviewRows.map((row) => {
    const kind = row.contentChanged === true ? "Changed source" : "Check error";
    return `
      <article class="review-card">
        <div>
          <span>${escapeHtml(kind)}</span>
          <strong>${escapeHtml(row.party)}</strong>
          <p>${escapeHtml(row.pageTitle || row.status || "Official source")}</p>
        </div>
        <a href="${escapeAttr(row.sourceUrl)}" target="_blank" rel="noopener">Open source</a>
      </article>
    `;
  }).join("");
}

function renderSourceWatch() {
  const rows = state.watch?.sources || [];
  if (!rows.length) {
    els.sourceWatchList.innerHTML = '<article class="empty">No source watch data yet.</article>';
    return;
  }

  els.sourceWatchList.innerHTML = rows.map((row) => `
    <article class="source-row">
      <div>
        <span>${escapeHtml(row.party)}</span>
        <h3>${escapeHtml(row.pageTitle || "Untitled source")}</h3>
        <a href="${escapeAttr(row.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(shortUrl(row.sourceUrl))}</a>
      </div>
      <div class="source-status">
        ${changePill(row.contentChanged)}
        <small>${escapeHtml(row.status || "unknown")}</small>
        <small>Checked ${escapeHtml(formatDateTime(row.lastChecked))}</small>
      </div>
    </article>
  `).join("");
}

function policyArticle(policy, variant) {
  const linkText = variant === "leader" ? policy.officialSource.label : "Official source";
  return `
    <article class="policy-note">
      <div class="policy-note-head">
        <div>
          <span>${escapeHtml(policy.subtopic)}</span>
          <h5>${escapeHtml(policy.title)}</h5>
        </div>
        ${statusPill(policy.status)}
      </div>
      <p>${escapeHtml(policy.summary)}</p>
      <div class="policy-source">
        <a href="${escapeAttr(policy.officialSource.url)}" target="_blank" rel="noopener">${escapeHtml(linkText)}</a>
        <span>${escapeHtml(policy.sourceType)} / checked ${escapeHtml(formatDate(policy.lastChecked))}</span>
      </div>
    </article>
  `;
}

function emptyPolicy(partyName, topic) {
  return `<article class="empty">No official ${escapeHtml(partyName)} entry for ${escapeHtml(topic)} yet.</article>`;
}

function getFilteredPolicies() {
  return state.data.policies.filter((policy) => {
    const party = getParty(policy.partyId);
    const searchable = [
      policy.title,
      policy.topic,
      policy.subtopic,
      policy.summary,
      policy.status,
      party?.name,
      ...(policy.tags || [])
    ].join(" ").toLowerCase();

    return (
      (state.search === "" || searchable.includes(state.search)) &&
      (state.party === "all" || policy.partyId === state.party) &&
      (state.topic === "all" || policy.topic === state.topic) &&
      (state.status === "all" || policy.status === state.status)
    );
  });
}

function policiesFor({ partyId, topic }) {
  return state.data.policies.filter((policy) => {
    return (!partyId || policy.partyId === partyId) && (!topic || policy.topic === topic);
  });
}

function groupBy(rows, getter) {
  const map = new Map();
  rows.forEach((row) => {
    const key = getter(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function statusPill(status) {
  return `<span class="status-pill status-${slug(status)}">${escapeHtml(status)}</span>`;
}

function changePill(changed) {
  if (changed === true) return '<span class="change-pill change-yes">Changed</span>';
  if (changed === false) return '<span class="change-pill change-no">No change</span>';
  return '<span class="change-pill change-warn">Review</span>';
}

function setOptions(select, options) {
  select.innerHTML = options
    .map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");
}

function getParty(id) {
  return state.data.parties.find((party) => party.id === id) || { name: id, color: "#444" };
}

function latestDate(values) {
  return values.filter(Boolean).sort().at(-1) || "";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "not checked";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function shortUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
