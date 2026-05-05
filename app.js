const state = {
  data: null,
  watch: null,
  search: "",
  party: "all",
  topic: "all",
  status: "all",
  compareTopic: "",
  compareSubtopic: "all"
};

const LEADERS = [
  {
    partyId: "national",
    name: "Christopher Luxon",
    role: "Prime Minister | MP for Botany",
    frame: "Current government record and National's plan.",
    source: "https://www.national.org.nz/team/christopherluxon"
  },
  {
    partyId: "labour",
    name: "Chris Hipkins",
    role: "Leader of the Labour Party | MP for Remutaka",
    frame: "Opposition announcements and Labour policy releases.",
    source: "https://www.labour.org.nz/our-team/rt-hon-chris-hipkins/"
  }
];

const TOPIC_NOTES = {
  "Tax & Economy": "Cost of living, tax settings, investment and economic management are central to the campaign.",
  "Health": "Health policy is where access, workforce, medicines and funding promises become concrete for families.",
  "Education": "Education entries cover schools, curriculum, tertiary, training and the pathway into work.",
  "Climate & Environment": "Climate, farming, biodiversity and adaptation policies sit together here.",
  "Law & Justice": "Crime, policing, courts, prisons and sentencing commitments are grouped for comparison.",
  "Housing & Infrastructure": "Housing supply, transport, infrastructure funding and planning reform live here.",
  "Te Tiriti & Constitution": "Entries here track Te Tiriti, constitutional settings and rangatiratanga commitments."
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
    "dataset-note",
    "search-input",
    "party-filter",
    "topic-filter",
    "status-filter",
    "reset-button",
    "visible-count",
    "party-count",
    "topic-count",
    "review-count",
    "leader-grid",
    "topic-panels",
    "compare-topic",
    "compare-subtopic",
    "compare-grid",
    "policy-list",
    "result-summary",
    "source-watch-body"
  ].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });
}

function bindEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });

  els.partyFilter.addEventListener("change", (event) => {
    state.party = event.target.value;
    render();
  });

  els.topicFilter.addEventListener("change", (event) => {
    state.topic = event.target.value;
    if (state.topic !== "all") {
      state.compareTopic = state.topic;
      state.compareSubtopic = "all";
      els.compareTopic.value = state.compareTopic;
    }
    render();
  });

  els.statusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    render();
  });

  els.compareTopic.addEventListener("change", (event) => {
    state.compareTopic = event.target.value;
    state.compareSubtopic = "all";
    render();
  });

  els.compareSubtopic.addEventListener("change", (event) => {
    state.compareSubtopic = event.target.value;
    renderCompare();
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
    render();
  });

  els.topicPanels.addEventListener("click", (event) => {
    const button = event.target.closest("[data-topic-select]");
    if (!button) return;
    const topic = button.dataset.topicSelect;
    state.topic = topic;
    state.compareTopic = topic;
    state.compareSubtopic = "all";
    els.topicFilter.value = topic;
    els.compareTopic.value = topic;
    render();
    document.getElementById("compare-title").scrollIntoView({ behavior: "smooth", block: "start" });
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

    state.compareTopic = state.data.topics[0] || "all";
    populateFilters();
    render();
    renderWatch();
  } catch (error) {
    els.policyList.innerHTML = `<div class="empty">Unable to load dashboard data. ${escapeHtml(error.message)}</div>`;
    els.compareGrid.innerHTML = "";
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
  setOptions(els.compareTopic, state.data.topics.map((topic) => ({ value: topic, label: topic })));
  renderCompareControls();
}

function render() {
  if (!state.data) return;

  const filtered = getFilteredPolicies();
  const reviewCount = state.data.policies.filter((policy) => policy.status === "Needs review").length;

  els.datasetDate.textContent = state.data.metadata.lastUpdated;
  els.datasetNote.textContent = state.data.metadata.note;
  els.visibleCount.textContent = filtered.length;
  els.partyCount.textContent = state.data.parties.length;
  els.topicCount.textContent = state.data.topics.length;
  els.reviewCount.textContent = reviewCount;
  els.resultSummary.textContent = `${filtered.length} of ${state.data.policies.length} official-source entries shown`;

  renderLeaderMatchup();
  renderTopicPanels();
  renderPolicies(filtered);
  renderCompareControls();
  renderCompare();
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
    ]
      .join(" ")
      .toLowerCase();

    return (
      (state.search === "" || searchable.includes(state.search)) &&
      (state.party === "all" || policy.partyId === state.party) &&
      (state.topic === "all" || policy.topic === state.topic) &&
      (state.status === "all" || policy.status === state.status)
    );
  });
}

function renderPolicies(policies) {
  if (!policies.length) {
    els.policyList.innerHTML = '<div class="empty">No matching policy entries.</div>';
    return;
  }

  els.policyList.innerHTML = policies
    .map((policy) => {
      const party = getParty(policy.partyId);
      return `
        <article class="policy-card">
          <div class="party-line">
            <span class="party-dot" style="background:${escapeAttr(party.color)}"></span>
            <strong>${escapeHtml(party.name)}</strong>
          </div>
          <div>
            <p class="subtopic">${escapeHtml(policy.topic)} · ${escapeHtml(policy.subtopic)}</p>
            <h3>${escapeHtml(policy.title)}</h3>
          </div>
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
    })
    .join("");
}

function renderLeaderMatchup() {
  const cards = LEADERS.map((leader) => {
    const party = getParty(leader.partyId);
    const policies = state.data.policies.filter((policy) => {
      return policy.partyId === leader.partyId && policy.topic === state.compareTopic;
    });
    const totalCount = state.data.policies.filter((policy) => policy.partyId === leader.partyId).length;
    const leadItems = policies.length
      ? policies.slice(0, 3).map((policy) => `
          <li>
            <strong>${escapeHtml(policy.title)}</strong>
            <span>${escapeHtml(policy.summary)}</span>
            <a href="${escapeAttr(policy.officialSource.url)}" target="_blank" rel="noopener">Source</a>
          </li>
        `).join("")
      : '<li><span>No official entry in this topic yet.</span></li>';

    return `
      <article class="leader-card leader-card-${escapeAttr(leader.partyId)}">
        <div class="leader-card-top">
          <div>
            <p class="eyebrow">${escapeHtml(party.name)}</p>
            <h3>${escapeHtml(leader.name)}</h3>
            <p class="muted">${escapeHtml(leader.role)}</p>
          </div>
          <div class="leader-mark" style="border-color:${escapeAttr(party.color)}">
            ${leader.name.split(" ").map((part) => part[0]).join("")}
          </div>
        </div>
        <p class="leader-frame">${escapeHtml(leader.frame)}</p>
        <div class="leader-stats">
          <span><strong>${policies.length}</strong> in ${escapeHtml(state.compareTopic)}</span>
          <span><strong>${totalCount}</strong> total entries</span>
        </div>
        <ul class="leader-policy-list">${leadItems}</ul>
        <a class="source-link" href="${escapeAttr(leader.source)}" target="_blank" rel="noopener">Official leader profile</a>
      </article>
    `;
  });

  els.leaderGrid.innerHTML = cards.join("");
}

function renderTopicPanels() {
  els.topicPanels.innerHTML = state.data.topics.map((topic) => {
    const policies = state.data.policies.filter((policy) => policy.topic === topic);
    const parties = new Set(policies.map((policy) => policy.partyId));
    const isActive = state.compareTopic === topic;

    return `
      <button class="topic-tile ${isActive ? "is-active" : ""}" type="button" data-topic-select="${escapeAttr(topic)}">
        <span>
          <strong>${escapeHtml(topic)}</strong>
          <em>${escapeHtml(TOPIC_NOTES[topic] || "Official party positions grouped for easier comparison.")}</em>
        </span>
        <b>${policies.length}</b>
        <small>${parties.size} parties</small>
      </button>
    `;
  }).join("");
}

function renderCompareControls() {
  if (!state.data) return;

  const subtopics = [...new Set(
    state.data.policies
      .filter((policy) => policy.topic === state.compareTopic)
      .map((policy) => policy.subtopic)
  )].sort();

  setOptions(
    els.compareSubtopic,
    [{ value: "all", label: "All subtopics" }, ...subtopics.map((subtopic) => ({ value: subtopic, label: subtopic }))]
  );
  els.compareSubtopic.value = state.compareSubtopic;
}

function renderCompare() {
  if (!state.data) return;

  const cards = state.data.parties.map((party) => {
    const matches = state.data.policies.filter((policy) => {
      return (
        policy.partyId === party.id &&
        policy.topic === state.compareTopic &&
        (state.compareSubtopic === "all" || policy.subtopic === state.compareSubtopic)
      );
    });

    const body = matches.length
      ? matches
          .map((policy) => `
            <div>
              <h3>${escapeHtml(policy.title)}</h3>
              <p class="subtopic">${escapeHtml(policy.subtopic)}</p>
              <div class="policy-meta">${statusPill(policy.status)}</div>
              <p class="summary">${escapeHtml(policy.summary)}</p>
              <a href="${escapeAttr(policy.officialSource.url)}" target="_blank" rel="noopener">Official source</a>
            </div>
          `)
          .join("")
      : '<p class="muted">No sample entry yet.</p>';

    return `
      <article class="compare-card">
        <div class="party-line">
          <span class="party-dot" style="background:${escapeAttr(party.color)}"></span>
          <strong>${escapeHtml(party.name)}</strong>
        </div>
        ${body}
      </article>
    `;
  });

  els.compareGrid.innerHTML = cards.join("");
}

function renderWatch() {
  const rows = state.watch?.sources || [];
  if (!rows.length) {
    els.sourceWatchBody.innerHTML = '<tr><td colspan="5">No source watch data yet.</td></tr>';
    return;
  }

  els.sourceWatchBody.innerHTML = rows
    .map((row) => `
      <tr>
        <td data-label="Party">${escapeHtml(row.party)}</td>
        <td data-label="Source"><a href="${escapeAttr(row.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(shortUrl(row.sourceUrl))}</a></td>
        <td data-label="Title">${escapeHtml(row.pageTitle || "Untitled")}</td>
        <td data-label="Checked">${escapeHtml(row.lastChecked || "Not checked")}</td>
        <td data-label="Changed">${changePill(row.contentChanged)}</td>
      </tr>
    `)
    .join("");
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
