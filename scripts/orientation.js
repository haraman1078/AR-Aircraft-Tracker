let yaw   = null;   // compass heading (0–360)
let pitch = null;   // tilt relative to upright camera position
                    // positive = looking UP, negative = looking DOWN, 0 = horizon

let initialized = false;

// ---------------------------------------------------------------------------
// NORMALIZE YAW to 0–360
// ---------------------------------------------------------------------------
function normalizeAngle(angle) {
    return (angle + 360) % 360;
}

// ---------------------------------------------------------------------------
// iOS PERMISSION REQUEST
// Android doesn't require this, but it's a no-op there so safe to always call.
// ---------------------------------------------------------------------------
export async function requestOrientationPermission() {
    if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
        try {
            const response = await DeviceOrientationEvent.requestPermission();
            if (response !== "granted") {
                alert("Orientation permission denied");
                return;
            }
        } catch (err) {
            console.error("Permission error:", err);
            return;
        }
    }

    startOrientation();
}

// ---------------------------------------------------------------------------
// CORE ORIENTATION LISTENER
//
// event.beta explanation:
//   Phone lying flat face-up       →  beta =   0°
//   Phone held upright (portrait)  →  beta =  90°   ← normal camera use
//   Phone tilted past vertical     →  beta = 180° (or snaps to -180°)
//   Phone tilted back from upright →  beta = -90° (landscape tilt back)
//
// WRONG (original):
//   pitch = -event.beta
//   → when held upright: pitch = -90 (wrong baseline, everything offset)
//   → tilting camera DOWN decreases beta (90→0), making pitch LESS negative
//   → this caused the downward-look guard (pitch < -10) to DISABLE when
//     you actually pointed the camera down — the exact opposite of correct.
//
// CORRECT:
//   pitch = event.beta - 90
//   → when held upright: pitch = 0        horizon baseline
//   → tilt camera UP:    pitch > 0        positive above horizon
//   → tilt camera DOWN:  pitch < 0        negative below horizon
//   → the guard (smoothPitch < -10) now correctly fires when pointing down
// ---------------------------------------------------------------------------
function startOrientation() {
    if (initialized) return;
    initialized = true;

    window.addEventListener("deviceorientation", (event) => {
        if (event.alpha === null || event.beta === null) return;

        // YAW: compass heading, normalized to 0–360
        yaw = normalizeAngle(event.alpha);

        // PITCH: degrees from horizon
        // 0 = level, positive = looking up, negative = looking down
        pitch = event.beta - 90;
    });
}

// ---------------------------------------------------------------------------
// GETTER — called every frame by render loop
// ---------------------------------------------------------------------------
export function getOrientation() {
    return { yaw, pitch };
}