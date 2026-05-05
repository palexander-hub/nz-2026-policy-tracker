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
    render();
  });

  els.statusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    render();
  });

  els.compareTopic.addEventListener("change", (event) => {
    state.compareTopic = event.target.value;
    state.compareSubtopic = "all";
    renderCompareControls();
    renderCompare();
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
  els.resultSummary.textContent = `${filtered.length} of ${state.data.policies.length} sample entries shown`;

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
        <td>${escapeHtml(row.party)}</td>
        <td><a href="${escapeAttr(row.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(shortUrl(row.sourceUrl))}</a></td>
        <td>${escapeHtml(row.pageTitle || "Untitled")}</td>
        <td>${escapeHtml(row.lastChecked || "Not checked")}</td>
        <td>${changePill(row.contentChanged)}</td>
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
