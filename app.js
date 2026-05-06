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
    initials: "CL",
    frame: "National's official material is mostly current government record and plan-based."
  },
  {
    partyId: "labour",
    name: "Chris Hipkins",
    role: "Leader of the Opposition",
    initials: "CH",
    frame: "Labour's official material includes recent 2026 campaign-style announcements."
  }
];

const TOPIC_NOTES = {
  "Tax & Economy": "Cost of living, tax settings, investment and economic management.",
  "Health": "GP access, screening, medicines, workforce and public health delivery.",
  "Education": "Schools, curriculum, tertiary education, skills and training.",
  "Climate & Environment": "Climate policy, farming, biodiversity, freshwater and adaptation.",
  "Law & Justice": "Crime, policing, sentencing, prisons, courts and rehabilitation.",
  "Housing & Infrastructure": "Housing supply, transport, infrastructure funding and planning.",
  "Te Tiriti & Constitution": "Te Tiriti, constitutional settings, rangatiratanga and governance."
};

const TOPIC_QUESTIONS = {
  "Tax & Economy": "Who would change tax, public spending, investment settings or the cost-of-living response?",
  "Health": "What would change for GP access, screening, medicines and frontline services?",
  "Education": "What would change in classrooms, curriculum, tertiary education or skills training?",
  "Climate & Environment": "How would parties handle emissions, farming, freshwater and conservation?",
  "Law & Justice": "What would change for policing, courts, sentencing, prisons and rehabilitation?",
  "Housing & Infrastructure": "What would change in housing supply, transport, planning and infrastructure funding?",
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
    "party-count",
    "topic-count",
    "review-count",
    "topic-nav",
    "active-topic-title",
    "active-topic-note",
    "active-topic-count",
    "active-party-count",
    "active-status-count",
    "issue-brief",
    "lead-compare",
    "other-parties",
    "search-input",
    "party-filter",
    "topic-filter",
    "status-filter",
    "reset-button",
    "policy-list",
    "result-summary",
    "review-list",
    "source-watch-body"
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
    renderDatabase();
  });

  els.partyFilter.addEventListener("change", (event) => {
    state.party = event.target.value;
    renderDatabase();
  });

  els.topicFilter.addEventListener("change", (event) => {
    state.topic = event.target.value;
    if (state.topic !== "all") setActiveTopic(state.topic, false);
    renderDatabase();
  });

  els.statusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    renderDatabase();
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
    renderDatabase();
  });
}

async function loadData() {
  try {
    const [policiesResponse, watchResponse] = await Promise.all([
      fetch("data/policies.json", { cache: "no-store" }),
      fetch("data/source-watch.json", { cache: "no-store" })
    ]);

    if (!policiesResponse.ok) throw new Error(`Could not load policies.json (${policiesResponse.status})`);

    state.data = await policiesResponse.json();
    state.watch = watchResponse.ok ? await watchResponse.json() : { sources: [] };
    state.activeTopic = state.data.topics[0] || "";

    populateFilters();
    renderAll();
  } catch (error) {
    els.policyList.innerHTML = `<div class="empty">Unable to load dashboard data. ${escapeHtml(error.message)}</div>`;
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
  const reviewCount = state.data.policies.filter((policy) => policy.status === "Needs review").length;
  els.datasetDate.textContent = state.data.metadata.lastUpdated;
  els.policyTotal.textContent = state.data.policies.length;
  els.partyCount.textContent = state.data.parties.length;
  els.topicCount.textContent = state.data.topics.length;
  els.reviewCount.textContent = reviewCount;

  renderTopicNav();
  renderActiveTopic();
  renderDatabase();
  renderReviewQueue();
  renderWatch();
}

function setActiveTopic(topic, scrollToChapter) {
  state.activeTopic = topic;
  if (els.topicFilter.value !== "all") els.topicFilter.value = topic;
  renderTopicNav();
  renderActiveTopic();
  if (scrollToChapter) {
    document.querySelector(".issue-chapter").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderTopicNav() {
  els.topicNav.innerHTML = state.data.topics.map((topic) => {
    const policies = policiesFor({ topic });
    const parties = new Set(policies.map((policy) => policy.partyId));
    const active = topic === state.activeTopic;

    return `
      <button class="topic-card ${active ? "is-active" : ""}" type="button" data-topic="${escapeAttr(topic)}">
        <span>
          <strong>${escapeHtml(topic)}</strong>
          <em>${escapeHtml(TOPIC_NOTES[topic] || "Official policy entries grouped by topic.")}</em>
        </span>
        <b>${policies.length}</b>
        <small>${parties.size} parties</small>
      </button>
    `;
  }).join("");
}

function renderActiveTopic() {
  const topicPolicies = policiesFor({ topic: state.activeTopic });
  const parties = new Set(topicPolicies.map((policy) => policy.partyId));
  const statuses = new Set(topicPolicies.map((policy) => policy.status));

  els.activeTopicTitle.textContent = state.activeTopic;
  els.activeTopicNote.textContent = TOPIC_NOTES[state.activeTopic] || "Official policy entries grouped by topic.";
  els.activeTopicCount.textContent = topicPolicies.length;
  els.activePartyCount.textContent = parties.size;
  els.activeStatusCount.textContent = statuses.size;

  renderLeadCompare();
  renderOtherParties();
  renderIssueBrief(topicPolicies, parties, statuses);
}

function renderIssueBrief(topicPolicies, parties, statuses) {
  const partyNames = [...parties].map((partyId) => getParty(partyId)?.name).filter(Boolean);
  const statusList = [...statuses].join(", ");
  const checkedDates = topicPolicies
    .map((policy) => policy.lastChecked)
    .sort();
  const newestDate = checkedDates[checkedDates.length - 1];

  els.issueBrief.innerHTML = `
    <article>
      <span>Policy question</span>
      <strong>${escapeHtml(TOPIC_QUESTIONS[state.activeTopic] || "What are the official policy positions in this area?")}</strong>
    </article>
    <article>
      <span>Loaded here</span>
      <strong>${escapeHtml(topicPolicies.length)} entries from ${escapeHtml(partyNames.length ? partyNames.join(", ") : "no parties yet")}</strong>
    </article>
    <article>
      <span>Evidence status</span>
      <strong>${escapeHtml(statusList || "No status yet")}</strong>
      <em>Latest check in this issue: ${escapeHtml(newestDate || "Not checked")}</em>
    </article>
  `;
}

function renderLeadCompare() {
  els.leadCompare.innerHTML = LEADERS.map((leader) => {
    const party = getParty(leader.partyId);
    const policies = policiesFor({ partyId: leader.partyId, topic: state.activeTopic });
    const items = policies.length
      ? policies.map((policy, index) => policyDetail(policy, index === 0)).join("")
      : '<p class="empty-inline">No official entry for this topic yet.</p>';

    return `
      <article class="leader-policy leader-policy-${escapeAttr(leader.partyId)}">
        <div class="leader-policy-head">
          <div>
            <p class="kicker">${escapeHtml(party.name)}</p>
            <h3>${escapeHtml(leader.name)}</h3>
            <p class="muted">${escapeHtml(leader.role)}</p>
          </div>
          <span class="leader-badge" style="border-color:${escapeAttr(party.color)}">${escapeHtml(leader.initials)}</span>
        </div>
        <p class="leader-frame">${escapeHtml(leader.frame)}</p>
        <div class="policy-stack">${items}</div>
      </article>
    `;
  }).join("");
}

function renderOtherParties() {
  const secondaryParties = state.data.parties.filter((party) => !["national", "labour"].includes(party.id));
  els.otherParties.innerHTML = secondaryParties.map((party) => {
    const policies = policiesFor({ partyId: party.id, topic: state.activeTopic });
    const body = policies.length
      ? policies.map((policy, index) => policyDetail(policy, index === 0)).join("")
      : '<p class="empty-inline">No official entry for this topic yet.</p>';

    return `
      <article class="party-card">
        <div class="party-line">
          <span class="party-dot" style="background:${escapeAttr(party.color)}"></span>
          <strong>${escapeHtml(party.name)}</strong>
        </div>
        <div class="policy-stack compact">${body}</div>
      </article>
    `;
  }).join("");
}

function renderDatabase() {
  const filtered = getFilteredPolicies();
  els.resultSummary.textContent = `${filtered.length} of ${state.data.policies.length} official-source entries shown`;

  if (!filtered.length) {
    els.policyList.innerHTML = '<div class="empty">No matching policy entries.</div>';
    return;
  }

  els.policyList.innerHTML = filtered.map((policy) => {
    const party = getParty(policy.partyId);
    return `
      <article class="policy-card">
        <div class="party-line">
          <span class="party-dot" style="background:${escapeAttr(party.color)}"></span>
          <strong>${escapeHtml(party.name)}</strong>
        </div>
        <p class="subtopic">${escapeHtml(policy.topic)} · ${escapeHtml(policy.subtopic)}</p>
        <h3>${escapeHtml(policy.title)}</h3>
        <div class="policy-meta">
          ${statusPill(policy.status)}
          <span class="checked">Last checked ${escapeHtml(policy.lastChecked)}</span>
        </div>
        <p class="summary">${escapeHtml(policy.summary)}</p>
        <div class="tags">${(policy.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="source-row">
          <a href="${escapeAttr(policy.officialSource.url)}" target="_blank" rel="noopener">${escapeHtml(policy.officialSource.label)}</a>
          <span class="checked">${escapeHtml(policy.sourceType)}</span>
        </div>
      </article>
    `;
  }).join("");
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

function renderWatch() {
  const rows = state.watch?.sources || [];
  if (!rows.length) {
    els.sourceWatchBody.innerHTML = '<tr><td colspan="5">No source watch data yet.</td></tr>';
    return;
  }

  els.sourceWatchBody.innerHTML = rows.map((row) => `
    <tr>
      <td data-label="Party">${escapeHtml(row.party)}</td>
      <td data-label="Source"><a href="${escapeAttr(row.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(shortUrl(row.sourceUrl))}</a></td>
      <td data-label="Title">${escapeHtml(row.pageTitle || "Untitled")}</td>
      <td data-label="Checked">${escapeHtml(row.lastChecked || "Not checked")}</td>
      <td data-label="Changed">${changePill(row.contentChanged)}</td>
    </tr>
  `).join("");
}

function renderReviewQueue() {
  const rows = state.watch?.sources || [];
  const changed = rows.filter((row) => row.contentChanged === true);

  if (!changed.length) {
    els.reviewList.innerHTML = `
      <article class="review-empty">
        <strong>No changed official sources waiting for review.</strong>
        <p>The daily checker will add items here when an official party page changes.</p>
      </article>
    `;
    return;
  }

  els.reviewList.innerHTML = changed.map((row) => {
    return `
      <article class="review-card review-card-change">
        <div>
          <span>Changed source</span>
          <h3>${escapeHtml(row.party)}</h3>
          <p>${escapeHtml(row.pageTitle || "Untitled source")}</p>
        </div>
        <div class="review-actions">
          <a href="${escapeAttr(row.sourceUrl)}" target="_blank" rel="noopener">Open official source</a>
          <small>Checked ${escapeHtml(row.lastChecked || "not checked")}</small>
        </div>
      </article>
    `;
  }).join("");
}

function policyDetail(policy, open) {
  return `
    <details class="policy-detail" ${open ? "open" : ""}>
      <summary>
        <span>
          <strong>${escapeHtml(policy.title)}</strong>
          <em>${escapeHtml(policy.subtopic)}</em>
        </span>
        ${statusPill(policy.status)}
      </summary>
      <p>${escapeHtml(policy.summary)}</p>
      <div class="detail-footer">
        <a href="${escapeAttr(policy.officialSource.url)}" target="_blank" rel="noopener">Official source</a>
        <span>Checked ${escapeHtml(policy.lastChecked)}</span>
      </div>
    </details>
  `;
}

function policiesFor({ partyId, topic }) {
  return state.data.policies.filter((policy) => {
    return (!partyId || policy.partyId === partyId) && (!topic || policy.topic === topic);
  });
}

function statusPill(status) {
  return `<span class="status-pill status-${slug(status)}">${escapeHtml(status)}</span>`;
}

function changePill(changed) {
  if (changed === true) return '<span class="change-pill change-yes">Changed</span>';
  if (changed === false) return '<span class="change-pill change-no">No change</span>';
  return '<span class="change-pill">Unknown</span>';
}

function setOptions(select, options) {
  select.innerHTML = options
    .map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");
}

function getParty(id) {
  return state.data.parties.find((party) => party.id === id);
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
