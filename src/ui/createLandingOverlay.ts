import heroImage from "../assets/scary.png";

export function createLandingOverlay(args: { onStart: () => void }) {
  const landingOverlay = document.createElement("div");
  landingOverlay.style.position = "fixed";
  landingOverlay.style.inset = "0";
  landingOverlay.style.zIndex = "40";
  landingOverlay.style.display = "grid";
  landingOverlay.style.placeItems = "center";
  landingOverlay.style.padding = "24px";
  landingOverlay.style.background =
    "radial-gradient(circle at top, #2a1a5e 0%, #120b2c 45%, #07050f 100%)";
  landingOverlay.style.color = "#fff";
  landingOverlay.style.fontFamily =
    "'Press Start 2P', 'Courier New', monospace";
  landingOverlay.style.imageRendering = "pixelated";
  landingOverlay.style.overflow = "hidden";
  landingOverlay.style.transition = "opacity 300ms ease, transform 300ms ease";

  const scanlines = document.createElement("div");
  scanlines.style.position = "absolute";
  scanlines.style.inset = "0";
  scanlines.style.pointerEvents = "none";
  scanlines.style.backgroundImage =
    "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)";
  scanlines.style.backgroundSize = "100% 4px";
  scanlines.style.opacity = "0.2";
  landingOverlay.appendChild(scanlines);

  landingOverlay.innerHTML = `
    <div style="position:relative; width:min(1180px, 100%); display:grid; grid-template-columns: 1.05fr 0.95fr; gap:28px; align-items:center; z-index:1;">
      <div style="display:flex; flex-direction:column; gap:18px; text-shadow: 0 4px 0 rgba(0,0,0,0.45);">
        <div style="font-size:12px; letter-spacing:0.24em; color:#7cf7ff; text-transform:uppercase;">insert coin</div>
        <h1 style="margin:0; font-size:clamp(38px, 6.2vw, 78px); line-height:0.98; color:#ffe66d; text-transform:uppercase;">
          Welcome to<br/>Geometry Slicer
        </h1>
        <p style="margin:0; max-width:560px; font-family: 'Courier New', monospace; font-size:16px; line-height:1.7; color:#f4f4f4;">
          A silly little retro arena where cubes run for their lives and knives do not negotiate.
        </p>
        <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; font-family:'Courier New', monospace; font-size:13px; color:#b6b6ff;">
          <span>• real-time slicing</span>
          <span>• GLTF loading</span>
          <span>• panic-powered geometry</span>
        </div>
        <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:center; margin-top:8px;">
          <button id="startBtn" style="padding:16px 22px; border:4px solid #fff; background:#ff3cac; color:#fff; font-family:'Press Start 2P', 'Courier New', monospace; font-size:12px; cursor:pointer; box-shadow:8px 8px 0 #000; text-transform:uppercase;">
            Start Game
          </button>
          <div style="font-family:'Courier New', monospace; font-size:12px; color:#7cf7ff;">press start to begin the chaos</div>
        </div>
      </div>
  
      <div style="display:flex; justify-content:center;">
        <img
          src="${heroImage}"
          alt="Scared cube chased by knife"   
          style="
            width:100%;
            height:100%;
            object-fit:contain;
            image-rendering:pixelated;
            filter: drop-shadow(0 10px 18px rgba(0,0,0,0.45));
            transform: rotate(-2deg);
          "
        />
      </div>
    </div>
  `;

  const startBtn = landingOverlay.querySelector(
    "#startBtn",
  ) as HTMLButtonElement;
  startBtn.addEventListener("click", () => {
    landingOverlay.style.opacity = "0";
    landingOverlay.style.transform = "scale(0.99)";
    window.setTimeout(() => {
      landingOverlay.remove();
      args.onStart();
    }, 300);
  });

  document.body.appendChild(landingOverlay);
  return landingOverlay;
}
