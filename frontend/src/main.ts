import { getChampions } from "./api";
import type { Champion } from "./models/types";
import * as DataEntry from "./components/data-entry";
import * as DraftBoard from "./components/draft-board";
import * as MetaView from "./components/meta-view";
import * as TeamNotes from "./components/team-notes";
import * as TacticMap from "./components/tactic-map";
import "./styles/main.css";

type Tab = "data-entry" | "meta" | "draft" | "notes" | "tactic-map";

const TABS: { id: Tab; label: string }[] = [
  { id: "data-entry", label: "Data Entry" },
  { id: "meta", label: "Meta Overview" },
  { id: "draft", label: "Draft Board" },
  { id: "notes", label: "Team Notes" },
  { id: "tactic-map", label: "Tactic Map" },
];

let currentTab: Tab = "data-entry";
let champions: Champion[] = [];

async function init() {
  try {
    champions = await getChampions();
  } catch {
    champions = [];
    console.warn("Could not load champions from API — running without backend?");
  }

  DataEntry.setChampions(champions);
  DraftBoard.setChampions(champions);
  MetaView.setChampions(champions);
  TacticMap.setChampions(champions);

  renderShell();
  switchTab(currentTab);
}

function renderShell() {
  const app = document.getElementById("app")!;
  app.innerHTML = `
    <header>
      <h1>WR Draft</h1>
      <nav id="tab-bar">
        ${TABS.map(
          (t) =>
            `<button class="tab-btn${t.id === currentTab ? " active" : ""}" data-tab="${t.id}">${t.label}</button>`
        ).join("")}
      </nav>
    </header>
    <main id="tab-content"></main>
  `;

  document.getElementById("tab-bar")!.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".tab-btn");
    if (btn?.dataset.tab) {
      switchTab(btn.dataset.tab as Tab);
    }
  });
}

function switchTab(tab: Tab) {
  currentTab = tab;

  // Update active button
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", (btn as HTMLElement).dataset.tab === tab);
  });

  const content = document.getElementById("tab-content")!;

  switch (tab) {
    case "data-entry":
      DataEntry.render(content);
      break;
    case "meta":
      MetaView.render(content);
      break;
    case "draft":
      DraftBoard.render(content);
      break;
    case "notes":
      TeamNotes.render(content);
      break;
    case "tactic-map":
      TacticMap.render(content);
      break;
  }
}

init();
