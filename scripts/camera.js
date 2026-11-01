export async function startCamera(videoElement) {
  try {
    let stream;

    try {
      // Try back camera (mobile)
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } },
        audio: false
      });
    } catch (err) {
      console.warn("Back camera not found, switching to default camera");

      // Fallback to any available camera (desktop)
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
    }

    videoElement.srcObject = stream;
    videoElement.muted = true;

  } catch (err) {
    console.error("Camera error:", err);
  }
}