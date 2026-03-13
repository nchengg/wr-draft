/**
 * Draft Board — interactive ban/pick planning with notes & ratings.
 * Focus: first 3 bans and picks phase.
 */
import type { Champion, DraftPlan, DraftSlot } from "../models/types";
import { createDraft, getDrafts, deleteDraft } from "../api";

const DD_VERSION = "15.5.1";
const DD_CDN = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion`;

/** Overrides for champions whose Data Dragon key differs from name.replace(/[^a-zA-Z]/g, "") */
const DD_OVERRIDES: Record<string, string> = {
  kaisa: "Kaisa",
  khazix: "Khazix",
  kogmaw: "KogMaw",
  velkoz: "Velkoz",
  wukong: "MonkeyKing",
  nunu: "Nunu",
};

let champions: Champion[] = [];
const champById = new Map<string, Champion>();

export function setChampions(champs: Champion[]) {
  champions = champs;
  champById.clear();
  for (const c of champs) champById.set(c.id, c);
}

function champImgUrl(id: string): string {
  const champ = champById.get(id);
  if (!champ) return "";
  const key = DD_OVERRIDES[champ.id] ?? champ.name.replace(/[^a-zA-Z0-9]/g, "");
  return `${DD_CDN}/${key}.png`;
}

function slotHtml(prefix: string, index: number, phase: string): string {
  const phaseClass = index <= 3 ? "first-phase" : "second-phase";
  return `
    <div class="draft-slot ${phaseClass}" data-index="${index}">
      <span class="slot-label">${phase} ${index}</span>
      <img class="champ-icon" id="${prefix}_icon_${index}" src="" alt="">
      <div class="champ-search-wrap">
        <input type="text" class="champ-search" data-prefix="${prefix}" data-index="${index}"
               placeholder="Search champion..." autocomplete="off">
        <input type="hidden" name="${prefix}_champ_${index}" class="champ-value">
        <div class="champ-dropdown"></div>
      </div>
      <input name="${prefix}_note_${index}" type="text" placeholder="Note..." class="slot-note">
      <select name="${prefix}_rating_${index}" class="slot-rating">
        <option value="">★</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
    </div>`;
}

let _container: HTMLElement | null = null;

async function refreshSavedDrafts() {
  const list = document.getElementById("saved-drafts-list");
  if (!list) return;
  try {
    const drafts = await getDrafts();
    if (drafts.length === 0) {
      list.innerHTML = `<p class="text-dim">No saved drafts yet.</p>`;
      return;
    }
    list.innerHTML = drafts.map((d) => {
      const blue = d.blue_team || "Blue";
      const red = d.red_team || "Red";
      const rating = d.overall_rating ? ` — Rating: ${d.overall_rating}/10` : "";
      return `
        <div class="saved-draft-row" data-id="${d.id}">
          <div class="saved-draft-info">
            <strong>${blue} vs ${red}</strong>${rating}
            <span class="saved-draft-id">#${d.id}</span>
          </div>
          <div class="saved-draft-actions">
            <button class="btn btn-sm btn-load" data-id="${d.id}">Load</button>
            <button class="btn btn-sm btn-del" data-id="${d.id}">Delete</button>
          </div>
        </div>`;
    }).join("");

    list.querySelectorAll(".btn-load").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = (btn as HTMLElement).dataset.id!;
        const drafts = await getDrafts();
        const draft = drafts.find((d) => d.id === id);
        if (draft) loadDraftIntoForm(draft);
      })
    );

    list.querySelectorAll(".btn-del").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = (btn as HTMLElement).dataset.id!;
        if (!confirm(`Delete draft #${id}?`)) return;
        await deleteDraft(id);
        refreshSavedDrafts();
      })
    );
  } catch {
    list.innerHTML = `<p class="status-err">Failed to load drafts.</p>`;
  }
}

function loadDraftIntoForm(d: DraftPlan) {
  const form = document.getElementById("draft-form") as HTMLFormElement | null;
  if (!form) return;

  const set = (name: string, val: string) => {
    const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
    if (el) el.value = val;
  };

  set("blue_team", d.blue_team || "");
  set("red_team", d.red_team || "");
  set("overall_rating", d.overall_rating?.toString() || "");
  set("draft_notes", d.notes || "");

  const loadSlots = (slots: DraftSlot[], prefix: string) => {
    slots.forEach((s, i) => {
      const idx = i + 1;
      const hidden = form.querySelector(`input[name="${prefix}_champ_${idx}"]`) as HTMLInputElement | null;
      const search = form.querySelector(`.champ-search[data-prefix="${prefix}"][data-index="${idx}"]`) as HTMLInputElement | null;
      const img = document.getElementById(`${prefix}_icon_${idx}`) as HTMLImageElement | null;

      if (hidden) hidden.value = s.champion_id || "";
      if (search) {
        const champ = s.champion_id ? champById.get(s.champion_id) : null;
        search.value = champ ? champ.name : "";
      }
      if (img && s.champion_id) {
        img.src = champImgUrl(s.champion_id);
        img.classList.add("visible");
        img.onerror = () => img.classList.remove("visible");
      } else if (img) {
        img.src = "";
        img.classList.remove("visible");
      }

      set(`${prefix}_note_${idx}`, s.note || "");
      set(`${prefix}_rating_${idx}`, s.rating?.toString() || "");
    });
  };

  loadSlots(d.blue_bans, "bb");
  loadSlots(d.red_bans, "rb");
  loadSlots(d.blue_picks, "bp");
  loadSlots(d.red_picks, "rp");

  // Store loaded id so re-saving overwrites
  form.dataset.loadedId = d.id;
  const status = document.getElementById("draft-status")!;
  status.textContent = `Loaded draft #${d.id}`;
  status.className = "status-ok";
}

export function render(container: HTMLElement) {
  _container = container;
  container.innerHTML = `
    <section class="panel draft-board">
      <h2>Draft Board</h2>

      <details class="saved-drafts-panel" open>
        <summary>Saved Drafts</summary>
        <div id="saved-drafts-list"><p class="text-dim">Loading...</p></div>
      </details>

      <form id="draft-form">

        <div class="draft-columns">
          <div class="draft-col blue-side">
            <div class="side-header">
              <h3>Blue Side</h3>
              <input type="text" name="blue_team" placeholder="Team name" class="team-name-input">
            </div>
            <h4>Bans</h4>
            <div class="draft-slots bans">
              ${[1, 2, 3, 4, 5].map((i) => slotHtml("bb", i, "Ban")).join("")}
            </div>
            <h4>Picks</h4>
            <div class="draft-slots picks">
              ${[1, 2, 3, 4, 5].map((i) => slotHtml("bp", i, "Pick")).join("")}
            </div>
          </div>

          <div class="draft-col red-side">
            <div class="side-header">
              <h3>Red Side</h3>
              <input type="text" name="red_team" placeholder="Team name" class="team-name-input">
            </div>
            <h4>Bans</h4>
            <div class="draft-slots bans">
              ${[1, 2, 3, 4, 5].map((i) => slotHtml("rb", i, "Ban")).join("")}
            </div>
            <h4>Picks</h4>
            <div class="draft-slots picks">
              ${[1, 2, 3, 4, 5].map((i) => slotHtml("rp", i, "Pick")).join("")}
            </div>
          </div>
        </div>

        <div class="form-row">
          <label>Overall Draft Rating (1-10)
            <input type="number" name="overall_rating" min="1" max="10">
          </label>
        </div>
        <div class="form-row">
          <label>Draft Notes <textarea name="draft_notes" rows="2" placeholder="Draft strategy notes..."></textarea></label>
        </div>

        <button type="submit" class="btn btn-primary">Save Draft Plan</button>
        <span id="draft-status"></span>
      </form>
    </section>
  `;

  const form = container.querySelector("#draft-form") as HTMLFormElement;
  form.addEventListener("submit", handleSubmit);

  // Load saved drafts list
  refreshSavedDrafts();

  // Wire up searchable champion inputs
  container.querySelectorAll<HTMLInputElement>(".champ-search").forEach((input) => {
    const wrap = input.closest(".champ-search-wrap")!;
    const dropdown = wrap.querySelector(".champ-dropdown") as HTMLDivElement;
    const hidden = wrap.querySelector(".champ-value") as HTMLInputElement;
    const prefix = input.dataset.prefix!;
    const idx = input.dataset.index!;

    function updateIcon(id: string) {
      const img = document.getElementById(`${prefix}_icon_${idx}`) as HTMLImageElement | null;
      if (!img) return;
      if (id) {
        img.src = champImgUrl(id);
        img.classList.add("visible");
        img.onerror = () => img.classList.remove("visible");
      } else {
        img.src = "";
        img.classList.remove("visible");
      }
    }

    function showDropdown(filter: string) {
      const q = filter.toLowerCase();
      const matches = q
        ? champions.filter((c) => c.name.toLowerCase().includes(q))
        : champions;
      if (matches.length === 0) {
        dropdown.innerHTML = `<div class="champ-dd-empty">No match</div>`;
      } else {
        dropdown.innerHTML = matches
          .slice(0, 20)
          .map((c) => `<div class="champ-dd-item" data-id="${c.id}">${c.name}</div>`)
          .join("");
      }
      dropdown.classList.add("open");
    }

    function selectChamp(id: string, name: string) {
      hidden.value = id;
      input.value = name;
      dropdown.classList.remove("open");
      updateIcon(id);
    }

    function clearChamp() {
      hidden.value = "";
      updateIcon("");
    }

    input.addEventListener("focus", () => showDropdown(input.value));
    input.addEventListener("input", () => {
      clearChamp();
      showDropdown(input.value);
    });

    dropdown.addEventListener("mousedown", (e) => {
      e.preventDefault(); // prevent blur
      const item = (e.target as HTMLElement).closest(".champ-dd-item") as HTMLElement | null;
      if (item) selectChamp(item.dataset.id!, item.textContent!);
    });

    input.addEventListener("blur", () => {
      dropdown.classList.remove("open");
      // If text doesn't match a champion, try exact match or clear
      if (!hidden.value) {
        const exact = champions.find(
          (c) => c.name.toLowerCase() === input.value.toLowerCase()
        );
        if (exact) {
          selectChamp(exact.id, exact.name);
        } else {
          input.value = "";
          clearChamp();
        }
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        dropdown.classList.remove("open");
        input.blur();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const q = input.value.toLowerCase();
        if (!q) return;
        // Exact match first, then first partial match
        const exact = champions.find((c) => c.name.toLowerCase() === q);
        if (exact) {
          selectChamp(exact.id, exact.name);
          input.blur();
          return;
        }
        const first = champions.find((c) => c.name.toLowerCase().includes(q));
        if (first) {
          selectChamp(first.id, first.name);
          input.blur();
        }
      }
    });
  });
}

function collectSlots(form: HTMLFormElement, prefix: string, count: number): DraftSlot[] {
  const slots: DraftSlot[] = [];
  for (let i = 1; i <= count; i++) {
    const champ = (form.querySelector(`input[name="${prefix}_champ_${i}"]`) as HTMLInputElement)?.value;
    const note = (form.elements.namedItem(`${prefix}_note_${i}`) as HTMLInputElement)?.value;
    const rating = (form.elements.namedItem(`${prefix}_rating_${i}`) as HTMLSelectElement)?.value;
    slots.push({
      champion_id: champ || undefined,
      note: note || undefined,
      rating: rating ? Number(rating) : undefined,
    });
  }
  return slots;
}

async function handleSubmit(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const status = document.getElementById("draft-status")!;
  const fd = new FormData(form);

  const loadedId = form.dataset.loadedId;
  const plan = {
    id: loadedId || crypto.randomUUID().slice(0, 8),
    blue_team: (fd.get("blue_team") as string) || undefined,
    red_team: (fd.get("red_team") as string) || undefined,
    blue_bans: collectSlots(form, "bb", 5),
    red_bans: collectSlots(form, "rb", 5),
    blue_picks: collectSlots(form, "bp", 5),
    red_picks: collectSlots(form, "rp", 5),
    overall_rating: fd.get("overall_rating") ? Number(fd.get("overall_rating")) : undefined,
    notes: (fd.get("draft_notes") as string) || undefined,
  };

  try {
    await createDraft(plan);
    status.textContent = "Draft plan saved!";
    status.className = "status-ok";
    form.reset();
    delete form.dataset.loadedId;
    refreshSavedDrafts();
  } catch (err) {
    status.textContent = `Error: ${err}`;
    status.className = "status-err";
  }
}
