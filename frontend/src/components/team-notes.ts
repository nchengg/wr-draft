/**
 * Team Notes — a board of categorized note cards for team info
 * (lane synergies, first picks, must-ban, etc.).
 */
import type { NoteCategory, TeamBoard } from "../api";
import { getTeamNotes, saveTeamNotes } from "../api";

let board: TeamBoard = { categories: [] };
let container: HTMLElement;

export function setChampions() {
  /* not needed here, but keeps the tab interface consistent */
}

export async function render(el: HTMLElement) {
  container = el;
  container.innerHTML = `<section class="panel note-board"><h2>Team Notes</h2><p class="text-dim">Loading…</p></section>`;
  try {
    board = await getTeamNotes();
  } catch {
    board = { categories: [] };
  }
  draw();
}

/* ── render ─────────────────────────────────────────────────────────────── */

function draw() {
  container.innerHTML = `
    <section class="panel note-board">
      <div class="nb-header">
        <h2>Team Notes</h2>
        <button class="btn btn-sm" id="nb-add-cat">+ Add Category</button>
      </div>
      <div class="nb-grid">
        ${board.categories.map(catHtml).join("")}
      </div>
    </section>
  `;
  bind();
}

function catHtml(cat: NoteCategory): string {
  const accent = cat.color ?? "var(--accent)";
  return `
    <div class="nb-cat" data-cat="${cat.id}">
      <div class="nb-cat-head" style="border-color: ${accent}">
        <span class="nb-cat-title" contenteditable="true" data-field="title" data-cat="${cat.id}">${cat.title}</span>
        <button class="nb-cat-del" title="Delete category" data-cat="${cat.id}">&times;</button>
      </div>
      <div class="nb-cards">
        ${cat.cards.map((c) => cardHtml(cat.id, c.id, c.text)).join("")}
      </div>
      <button class="nb-add-card" data-cat="${cat.id}">+ Add note</button>
    </div>`;
}

function cardHtml(catId: string, cardId: string, text: string): string {
  return `
    <div class="nb-card" data-cat="${catId}" data-card="${cardId}">
      <textarea class="nb-card-text" rows="2" data-cat="${catId}" data-card="${cardId}">${text}</textarea>
      <button class="nb-card-del" data-cat="${catId}" data-card="${cardId}">&times;</button>
    </div>`;
}

/* ── bindings ──────────────────────────────────────────────────────────── */

function bind() {
  // Add category
  container.querySelector("#nb-add-cat")?.addEventListener("click", () => {
    const title = prompt("Category name:");
    if (!title?.trim()) return;
    const id = crypto.randomUUID().slice(0, 8);
    board.categories.push({ id, title: title.trim(), cards: [] });
    persist();
  });

  // Delete category
  container.querySelectorAll<HTMLButtonElement>(".nb-cat-del").forEach((btn) => {
    btn.addEventListener("click", () => {
      const catId = btn.dataset.cat!;
      if (!confirm("Delete this category and all its notes?")) return;
      board.categories = board.categories.filter((c) => c.id !== catId);
      persist();
    });
  });

  // Rename category (blur)
  container.querySelectorAll<HTMLElement>(".nb-cat-title").forEach((el) => {
    el.addEventListener("blur", () => {
      const cat = board.categories.find((c) => c.id === el.dataset.cat);
      if (cat && el.textContent?.trim()) {
        cat.title = el.textContent.trim();
        save();
      }
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); el.blur(); }
    });
  });

  // Add card
  container.querySelectorAll<HTMLButtonElement>(".nb-add-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = board.categories.find((c) => c.id === btn.dataset.cat);
      if (!cat) return;
      const id = crypto.randomUUID().slice(0, 8);
      cat.cards.push({ id, text: "" });
      persist();
    });
  });

  // Delete card
  container.querySelectorAll<HTMLButtonElement>(".nb-card-del").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = board.categories.find((c) => c.id === btn.dataset.cat);
      if (!cat) return;
      cat.cards = cat.cards.filter((c) => c.id !== btn.dataset.card);
      persist();
    });
  });

  // Edit card text (auto-save on blur)
  container.querySelectorAll<HTMLTextAreaElement>(".nb-card-text").forEach((ta) => {
    ta.addEventListener("blur", () => {
      const cat = board.categories.find((c) => c.id === ta.dataset.cat);
      const card = cat?.cards.find((c) => c.id === ta.dataset.card);
      if (card) {
        card.text = ta.value;
        save();
      }
    });
  });
}

/* ── persistence ───────────────────────────────────────────────────────── */

async function save() {
  try {
    await saveTeamNotes(board);
  } catch (err) {
    console.error("Failed to save team notes", err);
  }
}

async function persist() {
  await save();
  draw();
}
