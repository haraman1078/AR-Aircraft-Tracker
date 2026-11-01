import { startCamera } from "./camera.js";
import { setupCanvas } from "./canvas.js";
import { startRenderLoop } from "./render.js";
import { requestOrientationPermission } from "./orientation.js";import { fetchAircraft } from "./aircraft.js";
import { getUserLocation } from "./location.js";

const video = document.getElementById("camera");
const canvas = document.getElementById("overlay");

let aircraftList = [];

// This function fetches aircraft AFTER permission
async function initAircraft() {
  try {
    console.log("Requesting location...");

    const user = await getUserLocation();

    console.log("User location:", user);

    // set location BEFORE fetch
    window.userLocation = user;

    const rawAircraft = await fetchAircraft();

    const aircraftList = rawAircraft
      .filter(a => a[5] && a[6])
      .slice(0, 20);

    window.aircraftList = aircraftList;

    console.log("Aircraft loaded:", aircraftList.length);

  } catch (err) {
    console.error("Init aircraft error:", err);
  }
}
// MAIN INIT (no aircraft here)
async function init() {
  await startCamera(video);

  await requestOrientationPermission(); // requests permission and starts orientation listener

  const ctx = setupCanvas(canvas);

  startRenderLoop(ctx, canvas);
}

init();

//  USER ACTION (CRITICAL)
document.getElementById("startBtn").addEventListener("click", async () => {
  console.log("Starting AR...");

  await initAircraft();  // Now triggered by user
});