import type { ToolMode } from "../core/types";

export interface UIPanel {
  root: HTMLDivElement;
  modeLabel: HTMLDivElement;
  navigateBtn: HTMLButtonElement;
  cutBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
  shapeSelect: HTMLSelectElement;
  gltfInput: HTMLInputElement;
  setModeLabel: (mode: ToolMode) => void;
  setVisible: (visible: boolean) => void;
}

export function createUIPanel(): UIPanel {
  const ui = document.createElement("div");
  ui.style.position = "fixed";
  ui.style.left = "16px";
  ui.style.top = "16px";
  ui.style.zIndex = "20";
  ui.style.display = "flex";
  ui.style.flexDirection = "column";
  ui.style.gap = "10px";
  ui.style.padding = "12px";
  ui.style.minWidth = "260px";
  ui.style.borderRadius = "14px";
  ui.style.background = "rgba(14, 14, 16, 0.82)";
  ui.style.border = "1px solid rgba(255,255,255,0.08)";
  ui.style.backdropFilter = "blur(12px)";
  ui.style.color = "#fff";
  ui.style.fontFamily = "Inter, system-ui, sans-serif";
  document.body.appendChild(ui);
  ui.style.display = "none";

  ui.innerHTML = `
    <div style="font-size:14px;font-weight:700;letter-spacing:0.04em;">Geometry Slicer</div>
    <div id="modeLabel" style="font-size:12px;opacity:0.85;">Mode: Navigate</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button id="navigateBtn">Navigate</button>
      <button id="cutBtn">Cut</button>
      <button id="resetBtn">Reset</button>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
      <select id="shapeSelect">
        <option value="box">Box</option>
        <option value="sphere">Sphere</option>
        <option value="cylinder">Cylinder</option>
        <option value="torus">Torus</option>
      </select>
      <label style="display:inline-flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
        <input id="gltfInput" type="file" accept=".glb,.gltf" />
      </label>
    </div>
    <div style="font-size:11px;opacity:0.72;line-height:1.4;">
      Cut mode: drag across a mesh to slice it. Navigate mode: orbit, zoom, and drag pieces.
    </div>
  `;

  const modeLabel = ui.querySelector("#modeLabel") as HTMLDivElement;
  const navigateBtn = ui.querySelector("#navigateBtn") as HTMLButtonElement;
  const cutBtn = ui.querySelector("#cutBtn") as HTMLButtonElement;
  const resetBtn = ui.querySelector("#resetBtn") as HTMLButtonElement;
  const shapeSelect = ui.querySelector("#shapeSelect") as HTMLSelectElement;
  const gltfInput = ui.querySelector("#gltfInput") as HTMLInputElement;

  for (const btn of [navigateBtn, cutBtn, resetBtn]) {
    btn.style.padding = "8px 10px";
    btn.style.border = "1px solid rgba(255,255,255,0.12)";
    btn.style.borderRadius = "10px";
    btn.style.background = "rgba(255,255,255,0.06)";
    btn.style.color = "#fff";
    btn.style.cursor = "pointer";
  }
  shapeSelect.style.padding = "8px 10px";
  shapeSelect.style.borderRadius = "10px";
  shapeSelect.style.background = "rgba(255,255,255,0.06)";
  shapeSelect.style.color = "#fff";
  shapeSelect.style.border = "1px solid rgba(255,255,255,0.12)";

  // Many browsers render the opened <select> list with a light background,
  // so force <option> text/background for readability.
  for (const option of Array.from(shapeSelect.options)) {
    option.style.color = "#111";
    option.style.background = "#fff";
  }

  let currentMode: ToolMode = "navigate";

  const setModeLabel = (mode: ToolMode) => {
    currentMode = mode;
    modeLabel.textContent = `Mode: ${mode[0].toUpperCase()}${mode.slice(1)}`;
    navigateBtn.style.opacity = currentMode === "navigate" ? "1" : "0.7";
    cutBtn.style.opacity = currentMode === "cut" ? "1" : "0.7";
  };

  const setVisible = (visible: boolean) => {
    ui.style.display = visible ? "flex" : "none";
  };

  return {
    root: ui,
    modeLabel,
    navigateBtn,
    cutBtn,
    resetBtn,
    shapeSelect,
    gltfInput,
    setModeLabel,
    setVisible,
  };
}
