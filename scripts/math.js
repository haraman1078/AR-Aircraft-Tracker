export function toRadians(deg) {
  return deg * (Math.PI / 180);
}

export function toDegrees(rad) {
  return rad * (180 / Math.PI);
}

export function calculateAngles(user, aircraft) {
  const lat1 = toRadians(user.lat);
  const lon1 = toRadians(user.lon);

  const lat2 = toRadians(aircraft.latitude);
  const lon2 = toRadians(aircraft.longitude);

  const dLon = lon2 - lon1;

  // Azimuth
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let azimuth = toDegrees(Math.atan2(y, x));
  if (azimuth < 0) azimuth += 360;

  // Distance (approx)
  const R = 6371000;
  const dLat = lat2 - lat1;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Elevation
  const heightDiff = (aircraft.baro_altitude || 0) - user.alt;

  const elevation = toDegrees(
    Math.atan2(heightDiff, distance)
  );

  return { azimuth, elevation,distance };
}