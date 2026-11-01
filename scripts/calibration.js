// ---------------------------------------------------------------------------
// calibration.js
//
// Handles compass + pitch calibration via user tap.
//
// CONCEPT:
//   The magnetometer in a phone is never perfectly accurate.
//   It can be off by 5–20° depending on nearby metal, electronics, etc.
//   No amount of software smoothing fixes this — it's a hardware limitation.
//
//   Solution: let the user tap on a real aircraft they can see in the sky.
//   We know where we THINK that aircraft is (from our math).
//   We know where the user SAYS it is (from the tap position on screen).
//   The difference is the calibration offset.
//
// WHAT IT CORRECTS:
//   - Yaw offset  → compass is off by X degrees left/right
//   - Pitch offset → tilt baseline is off by Y degrees up/down
//
// WHAT IT DOES NOT CORRECT:
//   - Sensor noise / jitter   (smoothing handles that)
//   - Dynamic drift over time (user can re-calibrate anytime)
//
// STORAGE:
//   Offsets are saved to localStorage so they persist across sessions.
//   Key: "ar_calibration" → { yawOffset, pitchOffset }
// ---------------------------------------------------------------------------

const STORAGE_KEY = "ar_calibration";

// Internal state
let yawOffset   = 0;
let pitchOffset = 0;
let isCalibrating = false;
let onTapCallback = null; // set during calibration mode

// ---------------------------------------------------------------------------
// LOAD — called once on startup
// Restores any previously saved calibration from localStorage.
// ---------------------------------------------------------------------------
export function loadCalibration() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            yawOffset   = parsed.yawOffset   || 0;
            pitchOffset = parsed.pitchOffset || 0;
            console.log(`Calibration loaded: yaw=${yawOffset.toFixed(2)}° pitch=${pitchOffset.toFixed(2)}°`);
        } else {
            console.log("No saved calibration found. Using defaults (0, 0).");
        }
    } catch (err) {
        console.warn("Failed to load calibration:", err);
        yawOffset   = 0;
        pitchOffset = 0;
    }
}

// ---------------------------------------------------------------------------
// SAVE — called after successful calibration
// ---------------------------------------------------------------------------
function saveCalibration() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ yawOffset, pitchOffset }));
        console.log(`Calibration saved: yaw=${yawOffset.toFixed(2)}° pitch=${pitchOffset.toFixed(2)}°`);
    } catch (err) {
        console.warn("Failed to save calibration:", err);
    }
}

// ---------------------------------------------------------------------------
// RESET — clears calibration back to zero
// Useful if user moves to a new location or calibrated badly.
// ---------------------------------------------------------------------------
export function resetCalibration() {
    yawOffset   = 0;
    pitchOffset = 0;
    localStorage.removeItem(STORAGE_KEY);
    console.log("Calibration reset to zero.");
}

// ---------------------------------------------------------------------------
// GETTERS — used by render.js every frame
//
// render.js applies these after smoothing:
//   correctedYaw   = smoothYaw   + getYawOffset()
//   correctedPitch = smoothPitch + getPitchOffset()
// ---------------------------------------------------------------------------
export function getYawOffset()   { return yawOffset;   }
export function getPitchOffset() { return pitchOffset; }

// ---------------------------------------------------------------------------
// CALIBRATION MODE STATE
// render.js checks this to know whether to draw calibration UI
// ---------------------------------------------------------------------------
export function isCalibrationMode() { return isCalibrating; }

// ---------------------------------------------------------------------------
// START CALIBRATION
//
// Called when user presses the "Calibrate" button.
// Puts the system into calibration mode.
// render.js will draw a targeting UI and wait for a tap.
//
// onTap(tapX, tapY) will be called by canvas.js when user taps.
// ---------------------------------------------------------------------------
export function startCalibration(onTap) {
    isCalibrating = true;
    onTapCallback = onTap;
    console.log("Calibration mode started. Waiting for user tap...");
}

// ---------------------------------------------------------------------------
// HANDLE TAP — called by canvas.js on touch/click during calibration mode
//
// Parameters:
//   tapX, tapY     — screen coordinates of the tap
//   renderedList   — array of aircraft objects currently rendered on screen
//                    each must have: { screenX, screenY, azimuth, elevation }
//   smoothYaw      — current smoothed yaw (before calibration offset)
//   smoothPitch    — current smoothed pitch (before calibration offset)
//
// Logic:
//   1. Find the rendered aircraft closest to the tap point
//   2. That aircraft is what the user is pointing at
//   3. Compute delta between where we thought it was vs where user tapped
//   4. Convert pixel delta → degree offset
//   5. Save offsets
// ---------------------------------------------------------------------------
export function handleCalibrationTap(tapX, tapY, renderedList, canvas) {
    if (!isCalibrating) return;

    if (!renderedList || renderedList.length === 0) {
        console.warn("No rendered aircraft to calibrate against.");
        cancelCalibration();
        return;
    }

    // Step 1: find closest rendered aircraft to tap point
    let closest     = null;
    let closestDist = Infinity;

    renderedList.forEach(a => {
        const dx   = a.screenX - tapX;
        const dy   = a.screenY - tapY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < closestDist) {
            closestDist = dist;
            closest     = a;
        }
    });

    // Reject tap if too far from any aircraft (user tapped empty sky)
    // 120px tolerance — generous enough for fat fingers
    const TAP_TOLERANCE_PX = 120;

    if (closestDist > TAP_TOLERANCE_PX) {
        console.warn(`Tap too far from any aircraft (${closestDist.toFixed(0)}px). Try tapping closer to a dot.`);
        // Don't cancel — let user try again
        return;
    }

    // Step 2: compute offset in degrees
    // The aircraft was rendered at (closest.screenX, closest.screenY)
    // The user tapped at (tapX, tapY)
    // Delta in pixels → convert to degrees using FOV

    const centerX = canvas.width  / 2;
    const centerY = canvas.height / 2;

    const FOV_H = canvas._fovH; // stored by render.js on canvas object
    const FOV_V = canvas._fovV;

    // Pixels per degree
    const pxPerDegH = (canvas.width  / 2) / (FOV_H / 2);
    const pxPerDegV = (canvas.height / 2) / (FOV_V / 2);

    // How many degrees was the dot displaced from where user tapped?
    // If dot is to the RIGHT of tap → aircraft is actually MORE to the left
    // → yaw offset should shift left → negative
    const tapDeltaX = closest.screenX - tapX; // px
    const tapDeltaY = closest.screenY - tapY; // px

    const deltaYawDeg   =  tapDeltaX / pxPerDegH; // + means shift yaw right
    const deltaPitchDeg = -tapDeltaY / pxPerDegV; // - means screen Y is inverted

    // Step 3: accumulate onto existing offset (don't replace — add)
    // This allows incremental calibration refinement
    yawOffset   += deltaYawDeg;
    pitchOffset += deltaPitchDeg;

    // Clamp to reasonable range — if offset is huge, something went wrong
    yawOffset   = Math.max(-45, Math.min(45, yawOffset));
    pitchOffset = Math.max(-30, Math.min(30, pitchOffset));

    console.log(`Calibration applied: Δyaw=${deltaYawDeg.toFixed(2)}° Δpitch=${deltaPitchDeg.toFixed(2)}°`);
    console.log(`New offsets: yaw=${yawOffset.toFixed(2)}° pitch=${pitchOffset.toFixed(2)}°`);

    // Step 4: save + exit calibration mode
    saveCalibration();
    isCalibrating = false;
    onTapCallback = null;
}

// ---------------------------------------------------------------------------
// CANCEL — user pressed cancel or tapped empty sky too many times
// ---------------------------------------------------------------------------
export function cancelCalibration() {
    isCalibrating = false;
    onTapCallback = null;
    console.log("Calibration cancelled.");
}