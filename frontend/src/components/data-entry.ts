/**
 * Data Entry — manual match data entry with per-player stats.
 * Each player submits their own post-game stats.
 */
import type { Champion, Match, PickBan, PlayerStats } from "../models/types";
import { createMatch } from "../api";

let champions: Champion[] = [];
let pendingPlayers: PlayerStats[] = [];

export function setChampions(champs: Champion[]) {
  champions = champs;
}

function champOption(c: Champion): string {
  return `<option value="${c.id}">${c.name}</option>`;
}

function banRow(label: string, prefix: string): string {
  const slots = [1, 2, 3, 4, 5]
    .map(
      (i) => `<div class="pb-slot">
        <select name="${prefix}_ban_${i}" class="champ-select">
          <option value="">—</option>
          ${champions.map(champOption).join("")}
        </select>
      </div>`
    )
    .join("");
  return `<div class="pb-row"><span class="pb-label">${label}</span>${slots}</div>`;
}

function playerSubForm(): string {
  const champOpts = champions.map(champOption).join("");
  return `
    <div class="player-form" id="player-form">
      <h4>Add Player</h4>
      <div class="player-form-grid">
        <div class="form-group">
          <span class="group-label">Identity</span>
          <label>Name
            <input type="text" name="ps_name" placeholder="Player name" autocomplete="off">
          </label>
          <label>Role
            <select name="ps_role">
              <option value="">—</option>
              <option value="baron">Baron Lane</option>
              <option value="jungle">Jungle</option>
              <option value="mid">Mid Lane</option>
              <option value="dragon">Dragon Lane</option>
              <option value="support">Support</option>
            </select>
          </label>
          <label>Side
            <select name="ps_side">
              <option value="">—</option>
              <option value="blue">Blue</option>
              <option value="red">Red</option>
            </select>
          </label>
          <label>Result
            <select name="ps_result">
              <option value="">—</option>
              <option value="W">W — Win</option>
              <option value="L">L — Loss</option>
            </select>
          </label>
          <label>Champion
            <select name="ps_champion">
              <option value="">— pick —</option>${champOpts}
            </select>
          </label>
        </div>
        <div class="form-group">
          <span class="group-label">Combat</span>
          <label>Kills <input type="number" name="ps_kills" min="0" value="0"></label>
          <label>Deaths <input type="number" name="ps_deaths" min="0" value="0"></label>
          <label>Assists <input type="number" name="ps_assists" min="0" value="0"></label>
          <label>Damage Dealt <input type="number" name="ps_damage_dealt" min="0" value="0"></label>
          <label>Damage Conv. %
            <input type="number" name="ps_damage_conversion_ratio" min="0" step="0.01" value="0">
          </label>
          <label>Damage Taken <input type="number" name="ps_damage_taken" min="0" value="0"></label>
          <label>Dmg Taken / Death
            <input type="number" name="ps_damage_taken_per_defeat" min="0" step="0.01" value="0">
          </label>
          <label>Dmg Mitigation %
            <input type="number" name="ps_damage_mitigation_ratio" min="0" step="0.01" value="0">
          </label>
        </div>
        <div class="form-group">
          <span class="group-label">Support &amp; Objectives</span>
          <label>Heal / Shield <input type="number" name="ps_heal_shield" min="0" value="0"></label>
          <label>CC Duration (s)
            <input type="number" name="ps_cc_duration" min="0" step="0.1" value="0">
          </label>
          <label>Epic Monsters <input type="number" name="ps_epic_monsters" min="0" value="0"></label>
          <label>Wards <input type="number" name="ps_wards" min="0" value="0"></label>
          <label>Turrets Pushed
            <input type="number" name="ps_turrets_pushed" min="0" value="0">
          </label>
        </div>
        <div class="form-group">
          <span class="group-label">Economy</span>
          <label>Gold <input type="number" name="ps_gold" min="0" value="0"></label>
          <label>Monster Farm <input type="number" name="ps_monster_farm" min="0" value="0"></label>
          <label>Minion Score <input type="number" name="ps_minion_score" min="0" value="0"></label>
        </div>
      </div>
      <button type="button" id="add-player-btn" class="btn btn-secondary">+ Add Player</button>
      <span id="player-form-error" class="status-err"></span>
    </div>`;
}

function playerTableHtml(players: PlayerStats[]): string {
  if (players.length === 0) {
    return `<p class="hint" style="margin-top:8px">No players added yet.</p>`;
  }
  const rows = players
    .map(
      (p, i) => `
    <tr class="${p.side}-row">
      <td>${p.name}</td>
      <td>${p.side}</td>
      <td>${p.role}</td>
      <td>${champions.find((c) => c.id === p.champion_id)?.name ?? p.champion_id}</td>
      <td class="${p.result === "W" ? "result-w" : "result-l"}">${p.result}</td>
      <td>${p.kills}/${p.deaths}/${p.assists}</td>
      <td>${p.damage_dealt.toLocaleString()}</td>
      <td>${p.damage_conversion_ratio}%</td>
      <td>${p.damage_taken.toLocaleString()}</td>
      <td>${p.damage_mitigation_ratio}%</td>
      <td>${p.heal_shield.toLocaleString()}</td>
      <td>${p.cc_duration}</td>
      <td>${p.gold.toLocaleString()}</td>
      <td>${p.minion_score} / ${p.monster_farm}</td>
      <td>${p.wards}</td>
      <td>${p.epic_monsters}</td>
      <td>${p.turrets_pushed}</td>
      <td><button type="button" class="btn-remove" data-idx="${i}">✕</button></td>
    </tr>`
    )
    .join("");
  return `
    <div class="player-table-wrap">
      <table class="player-table">
        <thead>
          <tr>
            <th>Name</th><th>Side</th><th>Role</th><th>Champion</th><th>R</th>
            <th>K/D/A</th><th>Dmg Dealt</th><th>Dmg Conv%</th><th>Dmg Taken</th>
            <th>Mitig%</th><th>Heal/Shld</th><th>CC (s)</th>
            <th>Gold</th><th>CS / Farm</th><th>Wards +/-</th><th>Epic</th><th>Turrets</th><th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export function render(container: HTMLElement) {
  pendingPlayers = [];
  container.innerHTML = `
    <section class="panel data-entry">
      <h2>Enter Match Data</h2>
      <form id="match-form">
        <h3>Match Info</h3>
        <div class="form-row">
          <label>Date <input type="date" name="date" required></label>
          <label>Tournament
            <input type="text" name="tournament" placeholder="e.g. WCS 2026">
          </label>
          <label>Patch <input type="text" name="patch" placeholder="e.g. 5.2"></label>
        </div>
        <div class="form-row">
          <label>Blue Team
            <input type="text" name="blue_team" required placeholder="Team A">
          </label>
          <label>Red Team
            <input type="text" name="red_team" required placeholder="Team B">
          </label>
          <label>Winner
            <select name="winner">
              <option value="">—</option>
              <option value="blue">Blue</option>
              <option value="red">Red</option>
            </select>
          </label>
          <label>Duration (min)
            <input type="number" name="duration" step="0.1" min="0">
          </label>
        </div>
        <h3>Bans</h3>
        <div class="draft-phase">
          ${banRow("Blue Bans", "blue")}
          ${banRow("Red Bans", "red")}
        </div>
        <h3>Player Stats</h3>
        ${playerSubForm()}
        <div id="player-list"></div>
        <div class="form-row" style="margin-top:16px">
          <label>Match Notes
            <textarea name="notes" rows="2" placeholder="Key observations..."></textarea>
          </label>
        </div>
        <button type="submit" class="btn btn-primary">Save Match</button>
        <span id="match-status"></span>
      </form>
    </section>`;

  const form = container.querySelector("#match-form") as HTMLFormElement;
  updatePlayerList(container);

  document.getElementById("add-player-btn")!.addEventListener("click", () => {
    addPlayer(form, container);
  });

  container.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".btn-remove");
    if (btn) {
      pendingPlayers.splice(parseInt(btn.dataset.idx!), 1);
      updatePlayerList(container);
    }
  });

  form.addEventListener("submit", (e) => handleSubmit(e, container));
}

function num(form: HTMLFormElement, name: string): number {
  return parseFloat((form.elements.namedItem(name) as HTMLInputElement)?.value || "0") || 0;
}

function str(form: HTMLFormElement, name: string): string {
  return ((form.elements.namedItem(name) as HTMLInputElement)?.value ?? "").trim();
}

function addPlayer(form: HTMLFormElement, container: HTMLElement) {
  const errEl = document.getElementById("player-form-error")!;
  const name = str(form, "ps_name");
  const role = str(form, "ps_role");
  const side = str(form, "ps_side");
  const result = str(form, "ps_result");
  const champion_id = str(form, "ps_champion");

  if (!name || !role || !side || !result || !champion_id) {
    errEl.textContent = "Name, role, side, result and champion are required.";
    return;
  }
  errEl.textContent = "";

  pendingPlayers.push({
    name,
    role: role as PlayerStats["role"],
    side: side as "blue" | "red",
    result: result as "W" | "L",
    champion_id,
    kills: num(form, "ps_kills"),
    deaths: num(form, "ps_deaths"),
    assists: num(form, "ps_assists"),
    heal_shield: num(form, "ps_heal_shield"),
    cc_duration: num(form, "ps_cc_duration"),
    epic_monsters: num(form, "ps_epic_monsters"),
    wards: num(form, "ps_wards"),
    damage_dealt: num(form, "ps_damage_dealt"),
    damage_conversion_ratio: num(form, "ps_damage_conversion_ratio"),
    damage_taken: num(form, "ps_damage_taken"),
    damage_taken_per_defeat: num(form, "ps_damage_taken_per_defeat"),
    damage_mitigation_ratio: num(form, "ps_damage_mitigation_ratio"),
    gold: num(form, "ps_gold"),
    monster_farm: num(form, "ps_monster_farm"),
    minion_score: num(form, "ps_minion_score"),
    turrets_pushed: num(form, "ps_turrets_pushed"),
  });

  updatePlayerList(container);

  // Reset player sub-form fields
  container
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>("#player-form input, #player-form select")
    .forEach((el) => {
      if (el instanceof HTMLSelectElement) el.value = "";
      else el.value = el.type === "number" ? "0" : "";
    });
  (form.elements.namedItem("ps_name") as HTMLInputElement).focus();
}

function updatePlayerList(container: HTMLElement) {
  const el = container.querySelector("#player-list");
  if (el) el.innerHTML = playerTableHtml(pendingPlayers);
}

function collectBans(form: HTMLFormElement, prefix: string): PickBan[] {
  return [1, 2, 3, 4, 5].flatMap((i) => {
    const el = form.elements.namedItem(`${prefix}_ban_${i}`) as HTMLSelectElement;
    return el?.value
      ? [{ champion_id: el.value, team: prefix as "blue" | "red", order: i }]
      : [];
  });
}

async function handleSubmit(e: Event, container: HTMLElement) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const status = document.getElementById("match-status")!;
  const fd = new FormData(form);

  // Auto-derive picks from player stats
  const picks: PickBan[] = pendingPlayers.map((p, i) => ({
    champion_id: p.champion_id,
    team: p.side,
    role: p.role,
    order: i + 1,
  }));

  const match: Match = {
    id: crypto.randomUUID().slice(0, 8),
    date: fd.get("date") as string,
    tournament: (fd.get("tournament") as string) || undefined,
    patch: (fd.get("patch") as string) || undefined,
    blue_team: fd.get("blue_team") as string,
    red_team: fd.get("red_team") as string,
    draft: {
      bans: [...collectBans(form, "blue"), ...collectBans(form, "red")],
      picks,
    },
    player_stats: pendingPlayers,
    notes: (fd.get("notes") as string) || undefined,
  };

  const winner = fd.get("winner") as string;
  if (winner) {
    match.result = {
      winner: winner as "blue" | "red",
      duration_minutes: fd.get("duration") ? Number(fd.get("duration")) : undefined,
    };
  }

  try {
    await createMatch(match);
    status.textContent = "Match saved!";
    status.className = "status-ok";
    form.reset();
    pendingPlayers = [];
    updatePlayerList(container);
  } catch (err) {
    status.textContent = `Error: ${err}`;
    status.className = "status-err";
  }
}
