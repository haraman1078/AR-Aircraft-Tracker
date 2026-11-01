import { getOrientation } from "./orientation.js";
import { calculateAngles } from "./math.js";
import { setTapHandler, clearTapHandler } from "./canvas.js";
import {
    loadCalibration,
    getYawOffset,
    getPitchOffset,
    isCalibrationMode,
    startCalibration,
    handleCalibrationTap,
    cancelCalibration
} from "./calibration.js";

// ---------------------------------------------------------------------------
// FOV CALCULATION
// ---------------------------------------------------------------------------
function getFOV(canvas) {
    const aspect = canvas.width / canvas.height;
    const FOV_V  = 50 * (Math.PI / 180);
    const FOV_H  = 2 * Math.atan(aspect * Math.tan(FOV_V / 2));
    return {
        FOV_H: FOV_H * (180 / Math.PI),
        FOV_V: FOV_V * (180 / Math.PI)
    };
}

// ---------------------------------------------------------------------------
// WRAP-AWARE YAW SMOOTHER
// ---------------------------------------------------------------------------
function smoothAngle(current, target, alpha) {
    let delta = target - current;
    if (delta > 180)  delta -= 360;
    if (delta < -180) delta += 360;
    return (current + delta * alpha + 360) % 360;
}

// ---------------------------------------------------------------------------
// CALIBRATION MODE UI
// Drawn on top of the camera feed when user is calibrating.
// Shows instruction banner, pulsing rings on aircraft dots, cancel hint.
// ---------------------------------------------------------------------------
function drawCalibrationUI(ctx, canvas, renderedAircraft) {
    const centerX = canvas.width  / 2;
    const centerY = canvas.height / 2;

    // Semi-transparent background to signal mode change
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top instruction banner
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, canvas.width, 70);

    ctx.fillStyle = "#FFD700";
    ctx.font      = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("CALIBRATION MODE", centerX, 28);

    ctx.fillStyle = "white";
    ctx.font      = "14px Arial";
    ctx.fillText("Tap on an aircraft dot you can see in the sky", centerX, 52);
    ctx.textAlign = "left";

    // Bottom cancel hint
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    ctx.fillStyle = "#ff6b6b";
    ctx.font      = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Press CANCEL to exit without saving", centerX, canvas.height - 20);
    ctx.textAlign = "left";

    // Pulsing gold ring + redraw dots on top of overlay
    const pulse = 8 + Math.sin(Date.now() / 500) * 4; // 4–12px oscillation

    renderedAircraft.forEach(a => {
        // Pulsing ring
        ctx.beginPath();
        ctx.arc(a.screenX, a.screenY, pulse + a.size + 4, 0, Math.PI * 2);
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth   = 2;
        ctx.stroke();

        // Dot
        ctx.beginPath();
        ctx.arc(a.screenX, a.screenY, a.size, 0, Math.PI * 2);
        ctx.fillStyle = "#FFD700";
        ctx.fill();

        // Callsign
        ctx.fillStyle = "white";
        ctx.font      = "12px Arial";
        ctx.fillText(a.callsign, a.screenX + 10, a.screenY - 10);
    });

    // No aircraft visible warning
    if (renderedAircraft.length === 0) {
        ctx.fillStyle = "#ff6b6b";
        ctx.font      = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("No aircraft visible — point camera at the sky", centerX, centerY);
        ctx.textAlign = "left";
    }
}

// ---------------------------------------------------------------------------
// MAIN RENDER LOOP
// ---------------------------------------------------------------------------
export function startRenderLoop(ctx, canvas) {

    // Restore any saved calibration offsets immediately
    loadCalibration();

    let smoothYaw   = null;
    let smoothPitch = null;

    const { FOV_H, FOV_V } = getFOV(canvas);

    // Store FOV on canvas object so calibration.js can do px→degree conversion
    canvas._fovH = FOV_H;
    canvas._fovV = FOV_V;

    const YAW_ALPHA   = 0.12;
    const PITCH_ALPHA = 0.08;

    // Aircraft rendered this frame with screen coordinates.
    // Read by calibration tap handler to find which dot was tapped.
    let currentRenderedAircraft = [];

    // -----------------------------------------------------------------------
    // CALIBRATION BUTTON WIRING
    // Looks for these IDs in your HTML:
    //   #calibrateBtn  — enter calibration mode
    //   #cancelCalibBtn — cancel without saving
    //   #calibStatus   — text element for status messages
    // -----------------------------------------------------------------------
    const calibrateBtn = document.getElementById("calibrateBtn");
    const cancelBtn    = document.getElementById("cancelCalibBtn");
    const calibStatus  = document.getElementById("calibStatus");

    function setStatus(msg, color = "white") {
        if (calibStatus) {
            calibStatus.textContent = msg;
            calibStatus.style.color = color;
        }
    }

    if (calibrateBtn) {
        calibrateBtn.addEventListener("click", () => {
            setTapHandler((tapX, tapY) => {
                handleCalibrationTap(tapX, tapY, currentRenderedAircraft, canvas);

                if (!isCalibrationMode()) {
                    // Success — calibration completed
                    clearTapHandler();
                    setStatus("✓ Calibrated", "#00ff88");
                    setTimeout(() => setStatus(""), 3000);
                } else {
                    // Tap missed — let user try again
                    setStatus("Tap closer to a yellow dot", "#FFD700");
                    setTimeout(() => setStatus("Tap a dot you can see in sky", "white"), 2000);
                }
            });

            startCalibration();
            setStatus("Tap a dot you can see in sky", "white");
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            cancelCalibration();
            clearTapHandler();
            setStatus("");
        });
    }

    // -----------------------------------------------------------------------
    // DRAW LOOP
    // -----------------------------------------------------------------------
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const { yaw, pitch } = getOrientation();

        if (yaw === null || pitch === null) {
            requestAnimationFrame(draw);
            return;
        }

        if (smoothYaw   === null) smoothYaw   = yaw;
        if (smoothPitch === null) smoothPitch = pitch;

        // Smooth raw sensor values
        smoothYaw   = smoothAngle(smoothYaw, yaw, YAW_ALPHA);
        smoothPitch += (pitch - smoothPitch) * PITCH_ALPHA;

        // Apply calibration AFTER smoothing — correct order
        // Smooth first (reduces noise), then offset (corrects systematic error)
        const correctedYaw   = (smoothYaw   + getYawOffset()   + 360) % 360;
        const correctedPitch =  smoothPitch + getPitchOffset();

        // Blank screen when deliberately pointing at ground
        if (correctedPitch < -25) {
            requestAnimationFrame(draw);
            return;
        }

        const centerX = canvas.width  / 2;
        const centerY = canvas.height / 2;

        const user         = window.userLocation;
        const aircraftList = window.aircraftList;

        if (!user || !aircraftList || aircraftList.length === 0) {
            requestAnimationFrame(draw);
            return;
        }

        // -----------------------------------------------------------------------
        // PROCESS AIRCRAFT
        // -----------------------------------------------------------------------
        const processed = aircraftList
            .map((a) => {
                const aircraft = {
                    longitude:     a[5],
                    latitude:      a[6],
                    baro_altitude: a[7]
                };
                if (!aircraft.latitude || !aircraft.longitude) return null;

                const { azimuth, elevation, distance } = calculateAngles(user, aircraft);
                const callsign = (a[1] || "Unknown").trim();

                return { ...aircraft, azimuth, elevation, distance, callsign };
            })
            .filter(Boolean);

        const topAircraft = processed
            .filter(a => a.distance < 1000000)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 10);

        const nearest    = topAircraft[0];
        const calibrating = isCalibrationMode();

        // Reset rendered list each frame
        currentRenderedAircraft = [];

        // -----------------------------------------------------------------------
        // RENDER EACH AIRCRAFT
        // -----------------------------------------------------------------------
        topAircraft.forEach((a) => {

            let relAz = a.azimuth - correctedYaw;
            if (relAz > 180)  relAz -= 360;
            if (relAz < -180) relAz += 360;

            let relEl = a.elevation - correctedPitch;

            // Skip aircraft behind you
            if (Math.abs(relAz) > 120) return;

            const BUFFER     = 5;
            const isInsideFOV =
                Math.abs(relAz) <= (FOV_H / 2 + BUFFER) &&
                Math.abs(relEl) <= (FOV_V / 2 + BUFFER);

            if (isInsideFOV) {
                const clampedAz = Math.max(-(FOV_H / 2), Math.min(FOV_H / 2, relAz));
                const clampedEl = Math.max(-(FOV_V / 2), Math.min(FOV_V / 2, relEl));

                const screenX = centerX + (clampedAz / (FOV_H / 2)) * (canvas.width  / 2);
                const screenY = centerY - (clampedEl / (FOV_V / 2)) * (canvas.height / 2);
                const size    = Math.max(3, 12 - (a.distance / 50000));

                // Always track rendered aircraft (needed for calibration tap)
                currentRenderedAircraft.push({ ...a, screenX, screenY, size });

                // In calibration mode, drawCalibrationUI() redraws the dots
                // with pulsing rings — skip normal dot drawing here
                if (!calibrating) {
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
                    ctx.fillStyle = (a === nearest) ? "lime" : "yellow";
                    ctx.fill();

                    ctx.fillStyle = "white";
                    ctx.font      = "12px Arial";
                    ctx.fillText(a.callsign, screenX + 10, screenY - 10);
                    ctx.fillText(
                        Math.round(a.distance / 1000) + " km",
                        screenX + 10,
                        screenY + 5
                    );
                }

            } else if (!calibrating) {
                // Edge arrows hidden during calibration — less confusing
                const dx = relAz;
                const dy = -relEl;

                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx  = dx / len;
                const ny  = dy / len;

                const margin = 30;
                const arrowX = centerX + nx * (canvas.width  / 2 - margin);
                const arrowY = centerY + ny * (canvas.height / 2 - margin);
                const angle  = Math.atan2(ny, nx);

                ctx.save();
                ctx.translate(arrowX, arrowY);
                ctx.rotate(angle + Math.PI / 2);
                ctx.fillStyle = "red";
                ctx.beginPath();
                ctx.moveTo(0, -20);
                ctx.lineTo(-10, 10);
                ctx.lineTo(10, 10);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                ctx.fillStyle = "white";
                ctx.font      = "12px Arial";
                ctx.fillText(
                    Math.round(a.distance / 1000) + " km",
                    arrowX + 10,
                    arrowY
                );
            }
        });

        // -----------------------------------------------------------------------
        // CALIBRATION OVERLAY — drawn last so it's on top of everything
        // -----------------------------------------------------------------------
        if (calibrating) {
            drawCalibrationUI(ctx, canvas, currentRenderedAircraft);
        } else {
            // Normal mode center crosshair
            ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
            ctx.beginPath();
            ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }

    draw();
}