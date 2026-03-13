/**
 * Tactic Map — interactive Wild Rift minimap with draggable champion & ward icons,
 * arrow drawing for rotations, and save/load.
 */
import type { Champion } from "../models/types";
import {
  getTacticMaps,
  createTacticMap,
  deleteTacticMap,
  type TacticMap,
  type MapIcon,
  type MapArrow,
} from "../api";

/* ── Data Dragon ──────────────────────────────────────────────────────── */

const DD_VERSION = "15.5.1";
const DD_CDN = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion`;

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
  const key =
    DD_OVERRIDES[champ.id] ?? champ.name.replace(/[^a-zA-Z0-9]/g, "");
  return `${DD_CDN}/${key}.png`;
}

/* ── State ────────────────────────────────────────────────────────────── */

let icons: MapIcon[] = [];
let arrows: MapArrow[] = [];
let mapTitle = "Untitled";
let mapNotes = "";
let loadedId: string | null = null;

let tool: "move" | "champion" | "ward" | "arrow" | "erase" = "move";
let selectedChampId: string | null = null;

// Arrow drawing temp state
let arrowStart: { x: number; y: number } | null = null;
let arrowColor = "#f59e0b";

// Drag state
let dragging: { iconId: string; offsetX: number; offsetY: number } | null =
  null;

/* ── Helpers ──────────────────────────────────────────────────────────── */

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function pct(
  e: MouseEvent,
  mapEl: HTMLElement
): { x: number; y: number } {
  const r = mapEl.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * 100,
    y: ((e.clientY - r.top) / r.height) * 100,
  };
}

/* ── Map background image ─────────────────────────────────────────────── */

const MAP_IMG = `/assets/map.webp`;

/* ── Ward icon SVG ────────────────────────────────────────────────────── */

const WARD_SVG = `<svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="12" cy="18" rx="5" ry="2" fill="#b8860b" opacity="0.6"/>
  <path d="M12 3 C7 3 4 8 4 13 C4 16 7 18 12 18 C17 18 20 16 20 13 C20 8 17 3 12 3Z" fill="#f5c518" stroke="#d4a017" stroke-width="0.8"/>
  <ellipse cx="12" cy="10" rx="3" ry="4" fill="#ffe066" opacity="0.7"/>
  <circle cx="12" cy="9" r="1.5" fill="#fff" opacity="0.9"/>
</svg>`;

/* ── Norra icon (white circle with "N") ───────────────────────────────── */

const NORRA_SVG = `<svg viewBox="0 0 28 28" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
  <circle cx="14" cy="14" r="12" fill="#fff" stroke="#ccc" stroke-width="1.5"/>
  <text x="14" y="19" text-anchor="middle" fill="#333" font-size="14" font-weight="700" font-family="sans-serif">N</text>
</svg>`;

/* ── Render ────────────────────────────────────────────────────────────── */

export function render(container: HTMLElement) {
  container.innerHTML = `
    <section class="panel tm-wrap">
      <h2>Tactic Map</h2>

      <details class="saved-drafts-panel" open>
        <summary>Saved Maps</summary>
        <div id="tm-saved-list"><p class="text-dim">Loading...</p></div>
      </details>

      <div class="tm-top-bar">
        <input type="text" id="tm-title" class="tm-title-input" value="Untitled" placeholder="Map title...">
        <div class="tm-tools">
          <button class="btn btn-sm tm-tool active" data-tool="move" title="Move icons">🖐️ Move</button>
          <button class="btn btn-sm tm-tool" data-tool="champion" title="Place champion">👤 Champ</button>
          <button class="btn btn-sm tm-tool" data-tool="ward" title="Place ward">🔆 Ward</button>
          <button class="btn btn-sm tm-tool" data-tool="arrow" title="Draw arrow">➡️ Arrow</button>
          <button class="btn btn-sm tm-tool" data-tool="erase" title="Click icon/arrow to remove">🗑️ Erase</button>
        </div>
      </div>

      <!-- Champion picker (shown when champion tool active) -->
      <div class="tm-champ-picker" id="tm-champ-picker" style="display:none;">
        <input type="text" id="tm-champ-search" class="champ-search" placeholder="Search champion to place..." autocomplete="off">
        <div class="champ-dropdown" id="tm-champ-dd"></div>
        <div class="tm-norra-btn-wrap">
          <button type="button" class="btn btn-sm tm-norra-btn" id="tm-norra-btn" title="Place Norra trap (white icon)">
            Norra ◎
          </button>
        </div>
      </div>

      <!-- Arrow color picker (shown when arrow tool active) -->
      <div class="tm-arrow-opts" id="tm-arrow-opts" style="display:none;">
        <label>Arrow color:
          <input type="color" id="tm-arrow-color" value="#f59e0b">
        </label>
      </div>

      <div class="tm-canvas-wrap">
        <div class="tm-canvas" id="tm-canvas">
          <img class="tm-bg" src="${MAP_IMG}" alt="Wild Rift Map" draggable="false">
          <svg class="tm-arrows-layer" id="tm-arrows-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="context-stroke"/>
            </marker></defs>
          </svg>
          <div class="tm-icons-layer" id="tm-icons-layer"></div>
        </div>
      </div>

      <div class="form-row" style="margin-top:12px;">
        <label>Notes <textarea id="tm-notes" rows="2" placeholder="Tactical notes..."></textarea></label>
      </div>

      <div class="tm-actions">
        <button type="button" class="btn btn-primary" id="tm-save">Save Map</button>
        <button type="button" class="btn btn-sm" id="tm-clear">Clear</button>
        <span id="tm-status"></span>
      </div>
    </section>
  `;

  bindTools();
  bindChampPicker();
  bindCanvas();
  bindActions();
  refreshSavedMaps();
  redrawIcons();
  redrawArrows();
}

/* ── Tool switching ───────────────────────────────────────────────────── */

function bindTools() {
  document.querySelectorAll<HTMLButtonElement>(".tm-tool").forEach((btn) => {
    btn.addEventListener("click", () => {
      tool = btn.dataset.tool as typeof tool;
      document
        .querySelectorAll(".tm-tool")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const picker = document.getElementById("tm-champ-picker")!;
      const arrowOpts = document.getElementById("tm-arrow-opts")!;
      picker.style.display = tool === "champion" ? "" : "none";
      arrowOpts.style.display = tool === "arrow" ? "" : "none";
    });
  });

  document.getElementById("tm-arrow-color")?.addEventListener("input", (e) => {
    arrowColor = (e.target as HTMLInputElement).value;
  });
}

/* ── Champion picker ──────────────────────────────────────────────────── */

function bindChampPicker() {
  const input = document.getElementById("tm-champ-search") as HTMLInputElement;
  const dd = document.getElementById("tm-champ-dd") as HTMLDivElement;

  function showDd(q: string) {
    const filter = q.toLowerCase();
    const matches = filter
      ? champions.filter((c) => c.name.toLowerCase().includes(filter))
      : champions;
    if (matches.length === 0) {
      dd.innerHTML = `<div class="champ-dd-empty">No match</div>`;
    } else {
      dd.innerHTML = matches
        .slice(0, 20)
        .map(
          (c) => `<div class="champ-dd-item" data-id="${c.id}">${c.name}</div>`
        )
        .join("");
    }
    dd.classList.add("open");
  }

  input.addEventListener("focus", () => showDd(input.value));
  input.addEventListener("input", () => showDd(input.value));

  dd.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const item = (e.target as HTMLElement).closest(
      ".champ-dd-item"
    ) as HTMLElement | null;
    if (item) {
      selectedChampId = item.dataset.id!;
      input.value = item.textContent!;
      dd.classList.remove("open");
    }
  });

  input.addEventListener("blur", () => dd.classList.remove("open"));

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dd.classList.remove("open");
      input.blur();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const q = input.value.toLowerCase();
      if (!q) return;
      const exact = champions.find((c) => c.name.toLowerCase() === q);
      if (exact) {
        selectedChampId = exact.id;
        input.value = exact.name;
      } else {
        const first = champions.find((c) =>
          c.name.toLowerCase().includes(q)
        );
        if (first) {
          selectedChampId = first.id;
          input.value = first.name;
        }
      }
      dd.classList.remove("open");
    }
  });

  // Norra button — select special "norra" champion
  document.getElementById("tm-norra-btn")?.addEventListener("click", () => {
    selectedChampId = "__norra__";
    input.value = "Norra (trap)";
    const dd2 = document.getElementById("tm-champ-dd")!;
    dd2.classList.remove("open");
  });
}

/* ── Canvas interactions ──────────────────────────────────────────────── */

function bindCanvas() {
  const canvas = document.getElementById("tm-canvas")!;

  canvas.addEventListener("mousedown", (e) => {
    const target = e.target as HTMLElement;
    const p = pct(e, canvas);

    // Erase tool
    if (tool === "erase") {
      const iconEl = target.closest(".tm-icon") as HTMLElement | null;
      if (iconEl) {
        icons = icons.filter((i) => i.id !== iconEl.dataset.iconId);
        redrawIcons();
        return;
      }
      // Check arrows — find closest
      const closest = arrows.find((a) => {
        const dist = distToSegment(
          p.x,
          p.y,
          a.x1,
          a.y1,
          a.x2,
          a.y2
        );
        return dist < 3;
      });
      if (closest) {
        arrows = arrows.filter((a) => a.id !== closest.id);
        redrawArrows();
      }
      return;
    }

    // Move tool — start drag
    if (tool === "move") {
      const iconEl = target.closest(".tm-icon") as HTMLElement | null;
      if (iconEl) {
        dragging = {
          iconId: iconEl.dataset.iconId!,
          offsetX: 0,
          offsetY: 0,
        };
        e.preventDefault();
      }
      return;
    }

    // Champion tool — place champion
    if (tool === "champion") {
      if (!selectedChampId) return;
      icons.push({
        id: uid(),
        kind: selectedChampId === "__norra__" ? "champion" : "champion",
        champion_id: selectedChampId,
        x: p.x,
        y: p.y,
      });
      redrawIcons();
      return;
    }

    // Ward tool — place ward
    if (tool === "ward") {
      icons.push({
        id: uid(),
        kind: "ward",
        x: p.x,
        y: p.y,
      });
      redrawIcons();
      return;
    }

    // Arrow tool — start/end
    if (tool === "arrow") {
      if (!arrowStart) {
        arrowStart = { x: p.x, y: p.y };
      } else {
        arrows.push({
          id: uid(),
          x1: arrowStart.x,
          y1: arrowStart.y,
          x2: p.x,
          y2: p.y,
          color: arrowColor,
        });
        arrowStart = null;
        redrawArrows();
      }
      return;
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const p = pct(e, canvas);
    const icon = icons.find((i) => i.id === dragging!.iconId);
    if (icon) {
      icon.x = Math.max(0, Math.min(100, p.x));
      icon.y = Math.max(0, Math.min(100, p.y));
      positionIcon(icon);
    }
  });

  canvas.addEventListener("mouseup", () => {
    dragging = null;
  });

  canvas.addEventListener("mouseleave", () => {
    dragging = null;
  });

  // Right-click to cancel arrow start
  canvas.addEventListener("contextmenu", (e) => {
    if (arrowStart) {
      e.preventDefault();
      arrowStart = null;
    }
  });
}

/* ── Drawing helpers ──────────────────────────────────────────────────── */

function redrawIcons() {
  const layer = document.getElementById("tm-icons-layer");
  if (!layer) return;
  layer.innerHTML = "";
  for (const icon of icons) {
    const el = document.createElement("div");
    el.className = "tm-icon";
    el.dataset.iconId = icon.id;
    el.style.left = `${icon.x}%`;
    el.style.top = `${icon.y}%`;

    if (icon.kind === "ward") {
      el.innerHTML = WARD_SVG;
      el.classList.add("tm-icon-ward");
    } else if (icon.champion_id === "__norra__") {
      el.innerHTML = NORRA_SVG;
      el.classList.add("tm-icon-norra");
    } else if (icon.champion_id) {
      const img = document.createElement("img");
      img.src = champImgUrl(icon.champion_id);
      img.alt = champById.get(icon.champion_id)?.name ?? "";
      img.title = champById.get(icon.champion_id)?.name ?? "";
      img.draggable = false;
      el.appendChild(img);
    }

    layer.appendChild(el);
  }
}

function positionIcon(icon: MapIcon) {
  const el = document.querySelector(
    `.tm-icon[data-icon-id="${icon.id}"]`
  ) as HTMLElement | null;
  if (el) {
    el.style.left = `${icon.x}%`;
    el.style.top = `${icon.y}%`;
  }
}

function redrawArrows() {
  const layer = document.getElementById("tm-arrows-layer") as unknown as SVGElement | null;
  if (!layer) return;
  // Keep defs
  const defs = layer.querySelector("defs")!.outerHTML;
  layer.innerHTML = defs;
  for (const a of arrows) {
    const line = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    line.setAttribute("x1", String(a.x1));
    line.setAttribute("y1", String(a.y1));
    line.setAttribute("x2", String(a.x2));
    line.setAttribute("y2", String(a.y2));
    line.setAttribute("stroke", a.color);
    line.setAttribute("stroke-width", "1.2");
    line.setAttribute("marker-end", "url(#arrowhead)");
    line.dataset.arrowId = a.id;
    layer.appendChild(line);
  }
}

/* ── Point-to-segment distance (for erasing arrows) ───────────────── */

function distToSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/* ── Save / Load / Clear ──────────────────────────────────────────────── */

function bindActions() {
  document.getElementById("tm-save")?.addEventListener("click", saveMap);
  document.getElementById("tm-clear")?.addEventListener("click", clearMap);
}

async function saveMap() {
  const status = document.getElementById("tm-status")!;
  const title =
    (document.getElementById("tm-title") as HTMLInputElement).value || "Untitled";
  const notes =
    (document.getElementById("tm-notes") as HTMLTextAreaElement).value || "";

  const plan: TacticMap = {
    id: loadedId || Math.random().toString(36).slice(2, 10),
    title,
    icons: [...icons],
    arrows: [...arrows],
    notes: notes || undefined,
  };

  try {
    await createTacticMap(plan);
    status.textContent = "Map saved!";
    status.className = "status-ok";
    loadedId = plan.id;
    refreshSavedMaps();
  } catch (err) {
    status.textContent = `Error: ${err}`;
    status.className = "status-err";
  }
}

function clearMap() {
  icons = [];
  arrows = [];
  loadedId = null;
  arrowStart = null;
  mapTitle = "Untitled";
  mapNotes = "";
  const titleEl = document.getElementById("tm-title") as HTMLInputElement;
  const notesEl = document.getElementById("tm-notes") as HTMLTextAreaElement;
  if (titleEl) titleEl.value = "Untitled";
  if (notesEl) notesEl.value = "";
  redrawIcons();
  redrawArrows();
  const status = document.getElementById("tm-status")!;
  status.textContent = "Cleared.";
  status.className = "status-ok";
}

function loadMap(m: TacticMap) {
  icons = [...m.icons];
  arrows = [...m.arrows];
  loadedId = m.id;
  const titleEl = document.getElementById("tm-title") as HTMLInputElement;
  const notesEl = document.getElementById("tm-notes") as HTMLTextAreaElement;
  if (titleEl) titleEl.value = m.title;
  if (notesEl) notesEl.value = m.notes || "";
  redrawIcons();
  redrawArrows();
  const status = document.getElementById("tm-status")!;
  status.textContent = `Loaded "${m.title}"`;
  status.className = "status-ok";
}

async function refreshSavedMaps() {
  const list = document.getElementById("tm-saved-list");
  if (!list) return;
  try {
    const maps = await getTacticMaps();
    if (maps.length === 0) {
      list.innerHTML = `<p class="text-dim">No saved maps yet.</p>`;
      return;
    }
    list.innerHTML = maps
      .map(
        (m) => `
      <div class="saved-draft-row" data-id="${m.id}">
        <div class="saved-draft-info">
          <strong>${m.title}</strong>
          <span class="saved-draft-id">#${m.id}</span>
          <span class="text-dim">${m.icons.length} icons, ${m.arrows.length} arrows</span>
        </div>
        <div class="saved-draft-actions">
          <button class="btn btn-sm btn-load" data-id="${m.id}">Load</button>
          <button class="btn btn-sm btn-del" data-id="${m.id}">Delete</button>
        </div>
      </div>`
      )
      .join("");

    list.querySelectorAll(".btn-load").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = (btn as HTMLElement).dataset.id!;
        const maps2 = await getTacticMaps();
        const found = maps2.find((m) => m.id === id);
        if (found) loadMap(found);
      })
    );

    list.querySelectorAll(".btn-del").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = (btn as HTMLElement).dataset.id!;
        if (!confirm(`Delete map #${id}?`)) return;
        await deleteTacticMap(id);
        refreshSavedMaps();
      })
    );
  } catch {
    list.innerHTML = `<p class="status-err">Failed to load maps.</p>`;
  }
}
