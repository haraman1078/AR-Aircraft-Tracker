export async function fetchAircraft() {
  try {
    const user = window.userLocation;

    // Ensure location is available
    if (!user || !user.lat || !user.lon) {
      console.log("User location not ready");
      return [];
    }

    const url = `/aircraft?lat=${user.lat}&lon=${user.lon}`;

    console.log("Fetching from:", url);

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error("Network response not ok");
    }

    const data = await res.json();

    const aircraft = data.states || [];

    console.log("Aircraft received:", aircraft.length);

    return aircraft;

  } catch (err) {
    console.error("Aircraft fetch error:", err);
    return [];
  }
}