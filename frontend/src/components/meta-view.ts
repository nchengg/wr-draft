/**
 * Meta View — display aggregated meta statistics from match data.
 */
import type { Champion } from "../models/types";
import type { ExternalMeta, PlayerPerformance, PlayerProfile } from "../api";
import {
  getPresence,
  getBanRates,
  getPickRates,
  getWinRates,
  getFirstPhase,
  getExternalMeta,
  getPlayerPerformance,
  getPlayerProfile,
} from "../api";

let champions: Champion[] = [];

export function setChampions(champs: Champion[]) {
  champions = champs;
}

function champName(id: string): string {
  return champions.find((c) => c.id === id)?.name ?? id;
}

function pct(val: number): string {
  return `${(val * 100).toFixed(1)}%`;
}

function wrClass(w: number): string {
  return w >= 52 ? "wr-high" : w <= 48 ? "wr-low" : "";
}

function banClass(b: number): string {
  return b >= 30 ? "ban-high" : b >= 10 ? "ban-mid" : "";
}

const ROLE_TABS = [
  { label: "All",     pos: "all" },
  { label: "Baron",   pos: "2" },
  { label: "Jungle",  pos: "5" },
  { label: "Mid",     pos: "1" },
  { label: "Dragon",  pos: "3" },
  { label: "Support", pos: "4" },
];

async function renderServerMeta(el: HTMLElement, dan: string, position: string): Promise<void> {
  el.innerHTML = `<p class="hint">Loading…</p>`;
  try {
    const data: ExternalMeta = await getExternalMeta(dan, position);
    if (data.error) {
      el.innerHTML = `<p class="status-err">Server meta error: ${data.error}</p>`;
      return;
    }
    const updated = data.champions[0]?.updated ?? "";
    const showRoleCol = position === "all";
    el.innerHTML = `
      ${updated ? `<p class="hint">Last updated: ${updated}</p>` : ""}
      <div class="server-table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Champion</th>
              ${showRoleCol ? "<th>Role</th>" : ""}
              <th>Win%</th><th>Pick%</th><th>Ban%</th>
            </tr>
          </thead>
          <tbody>
            ${data.champions
              .map(
                (c, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>
                  <span class="champ-name-en">${c.name_en || c.champion_id}</span>
                  <span class="champ-name-cn">${c.name_cn}</span>
                </td>
                ${showRoleCol ? `<td><span class="role-badge role-${c.role.toLowerCase()}">${c.role}</span></td>` : ""}
                <td class="${wrClass(c.win_rate)}">${c.win_rate.toFixed(1)}%</td>
                <td>${c.pick_rate.toFixed(1)}%</td>
                <td class="${banClass(c.ban_rate)}">${c.ban_rate.toFixed(1)}%</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    el.innerHTML = `<p class="status-err">Error: ${err}</p>`;
  }
}

function playerPerfHtml(players: PlayerPerformance[]): string {
  if (players.length === 0)
    return `<div class="player-perf-section"><h3>Player Performance</h3><p class="hint">No player data yet. Enter matches with player stats in the Data Entry tab.</p></div>`;
  return `
    <div class="player-perf-section">
      <h3>Player Performance <span class="hint-inline">— click a row for full profile</span></h3>
      <div class="server-table-wrap">
        <table class="player-table">
          <thead><tr>
            <th>Player</th><th>Games</th>
            <th>Avg K</th><th>Avg D</th><th>Avg A</th><th>KDA</th>
            <th>Avg Damage</th><th>Avg Gold</th><th>Avg Wards</th>
          </tr></thead>
          <tbody>
            ${players
              .map((p) => {
                const kda =
                  p.avg_deaths === 0
                    ? "Perfect"
                    : ((p.avg_kills + p.avg_assists) / p.avg_deaths).toFixed(2);
                return `<tr class="player-row" data-name="${p.name}">
                  <td class="player-name-link">${p.name}</td>
                  <td>${p.games}</td>
                  <td>${p.avg_kills}</td>
                  <td>${p.avg_deaths}</td>
                  <td>${p.avg_assists}</td>
                  <td>${kda}</td>
                  <td>${p.avg_damage.toLocaleString()}</td>
                  <td>${p.avg_gold.toLocaleString()}</td>
                  <td>${p.avg_wards}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      <div id="player-detail" class="player-detail-panel"></div>
    </div>`;
}

async function renderPlayerDetail(el: HTMLElement, name: string): Promise<void> {
  el.style.display = "block";
  el.innerHTML = `<p class="hint">Loading ${name}’s profile…</p>`;
  document.querySelectorAll<HTMLElement>(".player-row").forEach((r) => {
    r.classList.toggle("active-player", r.dataset.name === name);
  });
  try {
    const p: PlayerProfile = await getPlayerProfile(name);
    const wrPct = (p.win_rate * 100).toFixed(1);
    const wrCls = p.win_rate >= 0.55 ? "wr-high" : p.win_rate <= 0.45 ? "wr-low" : "";
    el.innerHTML = `
      <div class="profile-header">
        <div class="profile-title">
          <span class="profile-name">${name}</span>
          ${p.roles.map((r) => `<span class="role-badge role-${r.role.toLowerCase()}">${r.role} ×${r.games}</span>`).join("")}
        </div>
        <button class="btn-close-detail" title="Close">✕</button>
      </div>
      <div class="profile-stats-bar">
        <div class="pstat"><div class="pstat-val">${p.total_games}</div><div class="pstat-lbl">Games</div></div>
        <div class="pstat"><div class="pstat-val ${wrCls}">${p.wins}W ${p.losses}L</div><div class="pstat-lbl">${wrPct}% Win</div></div>
        <div class="pstat"><div class="pstat-val">${p.kda.toFixed(2)}</div><div class="pstat-lbl">KDA</div></div>
        <div class="pstat"><div class="pstat-val">${p.avg_kills} / ${p.avg_deaths} / ${p.avg_assists}</div><div class="pstat-lbl">K / D / A</div></div>
        <div class="pstat"><div class="pstat-val">${p.avg_damage.toLocaleString()}</div><div class="pstat-lbl">Avg Damage</div></div>
        <div class="pstat"><div class="pstat-val">${p.avg_gold.toLocaleString()}</div><div class="pstat-lbl">Avg Gold</div></div>
        <div class="pstat"><div class="pstat-val">${p.avg_wards}</div><div class="pstat-lbl">Avg Wards</div></div>
        <div class="pstat"><div class="pstat-val">${p.avg_damage_taken.toLocaleString()}</div><div class="pstat-lbl">Avg Dmg Taken</div></div>
        ${p.avg_heal_shield > 0 ? `<div class="pstat"><div class="pstat-val">${Math.round(p.avg_heal_shield).toLocaleString()}</div><div class="pstat-lbl">Avg Heal/Shield</div></div>` : ""}
        ${p.avg_cc > 0 ? `<div class="pstat"><div class="pstat-val">${p.avg_cc}s</div><div class="pstat-lbl">Avg CC Time</div></div>` : ""}
      </div>
      <h4>Champion Pool</h4>
      <div class="server-table-wrap">
        <table>
          <thead><tr>
            <th>Champion</th><th>Games</th><th>W – L</th><th>Win%</th>
            <th>KDA</th><th>K / D / A</th><th>Avg DMG</th><th>Avg Gold</th>
          </tr></thead>
          <tbody>
            ${p.champions
              .map((c) => {
                const cwr = (c.win_rate * 100).toFixed(1);
                const cwrCls = c.win_rate >= 0.55 ? "wr-high" : c.win_rate <= 0.45 ? "wr-low" : "";
                return `<tr>
                  <td>${champName(c.champion_id)}</td>
                  <td>${c.games}</td>
                  <td>${c.wins} – ${c.losses}</td>
                  <td class="${cwrCls}">${cwr}%</td>
                  <td>${c.kda.toFixed(2)}</td>
                  <td>${c.avg_kills} / ${c.avg_deaths} / ${c.avg_assists}</td>
                  <td>${c.avg_damage.toLocaleString()}</td>
                  <td>${c.avg_gold.toLocaleString()}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      ${p.recent.length > 0 ? `
      <h4 class="profile-section-title">Recent Matches</h4>
      <div class="server-table-wrap">
        <table>
          <thead><tr>
            <th>Date</th><th>Match</th><th>Champion</th><th>Role</th>
            <th>K / D / A</th><th>Damage</th><th>Gold</th><th>Result</th>
          </tr></thead>
          <tbody>
            ${p.recent
              .map(
                (r) => `<tr>
                <td>${r.date}</td>
                <td class="hint">${r.tournament ?? `${r.blue_team} vs ${r.red_team}`}</td>
                <td>${champName(r.champion_id)}</td>
                <td><span class="role-badge role-${r.role.toLowerCase()}">${r.role}</span></td>
                <td>${r.kills} / ${r.deaths} / ${r.assists}</td>
                <td>${r.damage_dealt.toLocaleString()}</td>
                <td>${r.gold.toLocaleString()}</td>
                <td class="${r.result === "W" ? "result-w" : "result-l"}">${r.result === "W" ? "WIN" : "LOSS"}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>` : ""}
    `;
    el.querySelector(".btn-close-detail")?.addEventListener("click", () => {
      el.innerHTML = "";
      el.style.display = "none";
      document.querySelectorAll<HTMLElement>(".player-row").forEach((r) => r.classList.remove("active-player"));
    });
  } catch (err) {
    el.innerHTML = `<p class="status-err">Error loading profile: ${err}</p>`;
  }
}

export async function render(container: HTMLElement) {
  container.innerHTML = `
    <section class="panel meta-view">
      <h2>Meta Overview</h2>
      <p class="hint">Statistics are aggregated from all entered match data.</p>
      <div id="meta-content"><p>Loading…</p></div>
    </section>
  `;

  const content = document.getElementById("meta-content")!;

  try {
    const [presence, picks, bans, winrates, firstPhase, playerPerf] = await Promise.all([
      getPresence(),
      getPickRates(),
      getBanRates(),
      getWinRates(),
      getFirstPhase(),
      getPlayerPerformance(),
    ]);

    const presEntries = Object.entries(presence).slice(0, 15);
    const fpEntries = Object.entries(firstPhase).slice(0, 10);

    const teamMetaHtml =
      presEntries.length === 0
        ? `<p class="hint">No match data yet. Enter matches in the Data Entry tab.</p>`
        : `
        <div class="meta-grid">
          <div class="meta-table">
            <h3>Top Presence (Pick+Ban Rate)</h3>
            <table>
              <thead><tr><th>Champion</th><th>Presence</th><th>Pick%</th><th>Ban%</th><th>Win%</th></tr></thead>
              <tbody>
                ${presEntries
                  .map(([id, rate]) => {
                    const wr = winrates[id];
                    return `<tr>
                    <td>${champName(id)}</td>
                    <td>${pct(rate)}</td>
                    <td>${picks[id] ? pct(picks[id]) : "—"}</td>
                    <td>${bans[id] ? pct(bans[id]) : "—"}</td>
                    <td>${wr ? pct(wr.rate) + ` (${wr.games}g)` : "—"}</td>
                  </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>

          <div class="meta-table">
            <h3>First Phase Trends (Bans/Picks 1-3)</h3>
            <table>
              <thead><tr><th>Champion</th><th>1st Phase Bans</th><th>1st Phase Picks</th></tr></thead>
              <tbody>
                ${fpEntries
                  .map(
                    ([id, data]) => `
                  <tr>
                    <td>${champName(id)}</td>
                    <td>${data.first_phase_bans}</td>
                    <td>${data.first_phase_picks}</td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>`;

    content.innerHTML = `
      ${teamMetaHtml}
      ${playerPerfHtml(playerPerf)}
      <div class="server-meta-section">
        <h3>CN Server Meta (lolm.qq.com)</h3>
        <div class="server-meta-controls">
          <label>Rank Tier:
            <select id="dan-select">
              <option value="1">Diamond+</option>
              <option value="2">Master+</option>
              <option value="3">Challenger</option>
              <option value="4">Top</option>
            </select>
          </label>
          <button class="btn btn-secondary" id="btn-refresh-meta">Refresh</button>
        </div>
        <div class="role-tabs">
          ${ROLE_TABS.map(
            (t) =>
              `<button class="role-tab${t.pos === "all" ? " active" : ""}" data-pos="${t.pos}">${t.label}</button>`
          ).join("")}
        </div>
        <div id="server-meta-data"></div>
      </div>`;

    const serverEl = document.getElementById("server-meta-data") as HTMLElement;
    const danSel = document.getElementById("dan-select") as HTMLSelectElement;
    const refreshBtn = document.getElementById("btn-refresh-meta") as HTMLButtonElement;

    const activePos = () =>
      (document.querySelector(".role-tab.active") as HTMLElement | null)?.dataset.pos ?? "all";

    const load = () => renderServerMeta(serverEl, danSel.value, activePos());

    danSel.addEventListener("change", load);
    refreshBtn.addEventListener("click", load);

    document.querySelectorAll(".role-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".role-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        load();
      });
    });

    load();

    // Player row click handlers
    document.querySelectorAll<HTMLElement>(".player-row").forEach((row) => {
      row.addEventListener("click", () => {
        const detailEl = document.getElementById("player-detail")!;
        renderPlayerDetail(detailEl, row.dataset.name!);
      });
    });
  } catch (err) {
    content.innerHTML = `<p class="status-err">Error loading meta data: ${err}</p>`;
  }
}

