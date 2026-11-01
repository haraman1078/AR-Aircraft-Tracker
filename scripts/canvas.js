// ---------------------------------------------------------------------------
// canvas.js
//
// Handles canvas sizing and touch/click input.
//
// CHANGES FROM ORIGINAL:
//   - Added onTap callback system
//   - Handles both touch (mobile) and click (desktop) events
//   - Normalizes coordinates to canvas space (accounts for device pixel ratio)
// ---------------------------------------------------------------------------

let tapCallback = null;

// ---------------------------------------------------------------------------
// SET TAP HANDLER
// Called by render.js to register what happens when user taps the canvas.
// Only one handler active at a time.
// ---------------------------------------------------------------------------
export function setTapHandler(callback) {
    tapCallback = callback;
}

export function clearTapHandler() {
    tapCallback = null;
}

// ---------------------------------------------------------------------------
// SETUP CANVAS
// Sizes canvas to fill the screen and wires up input events.
// ---------------------------------------------------------------------------
export function setupCanvas(canvas) {
    const ctx = canvas.getContext("2d");

    // -----------------------------------------------------------------------
    // RESIZE — keep canvas filling the full screen
    // -----------------------------------------------------------------------
    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener("resize", resize);
    resize();

    // -----------------------------------------------------------------------
    // TOUCH HANDLER (mobile)
    //
    // We use touchend instead of touchstart because:
    //   - touchstart fires as soon as finger lands, before intent is clear
    //   - touchend fires when finger lifts, which is what users expect as "tap"
    //   - prevents accidental triggers during scroll/pan gestures
    // -----------------------------------------------------------------------
    canvas.addEventListener("touchend", (e) => {
        e.preventDefault(); // prevents double-firing as click on some browsers

        if (!tapCallback) return;

        const touch = e.changedTouches[0];
        if (!touch) return;

        // getBoundingClientRect accounts for any CSS transforms or scrolling
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        tapCallback(x, y);
    }, { passive: false });

    // -----------------------------------------------------------------------
    // CLICK HANDLER (desktop / testing)
    // Same logic, different event source.
    // -----------------------------------------------------------------------
    canvas.addEventListener("click", (e) => {
        if (!tapCallback) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        tapCallback(x, y);
    });

    return ctx;
}