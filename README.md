# AR Aircraft Tracker

A browser-based Augmented Reality Aircraft Tracker that visualizes nearby aircraft in the real-world camera view using live aircraft data, GPS coordinates, and mobile device orientation sensors.

The application combines geographical calculations, device sensors, and Canvas rendering to estimate where aircraft should appear relative to the observer's field of view.

## Features

- **Live Aircraft Data:** Retrieves aircraft state information from the OpenSky Network API.
- **Camera Integration:** Uses the device camera through the browser's MediaDevices API.
- **GPS Positioning:** Obtains the observer's latitude, longitude, and altitude.
- **Device Orientation:** Uses device orientation sensors to determine heading and pitch.
- **Geographical Calculations:** Calculates aircraft distance, azimuth, and elevation.
- **AR Visualization:** Projects aircraft positions onto a Canvas overlay.
- **Sensor Smoothing:** Applies smoothing to reduce orientation jitter.
- **Interactive Calibration:** Allows users to tap visible aircraft markers to correct yaw and pitch offsets.
- **Aircraft Information:** Displays callsigns, approximate distances, and directional indicators.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js, Express.js |
| Aircraft Data | OpenSky Network API |
| Camera | MediaDevices API |
| Location | Geolocation API |
| Orientation | DeviceOrientation API |
| Rendering | HTML5 Canvas API |
| Calculations | JavaScript, Spherical Trigonometry |

## How It Works

### 1. Aircraft Data Retrieval

The application obtains the user's geographical coordinates and sends them to the Express backend.

The backend queries the OpenSky Network API using a geographic bounding box around the observer's location.

### 2. Geographical Calculations

Aircraft coordinates are compared with the observer's position.

The application calculates:

- **Distance:** Using the Haversine formula.
- **Azimuth:** Using spherical trigonometry to determine the horizontal direction towards an aircraft.
- **Elevation:** Estimated using aircraft altitude difference and horizontal distance.

### 3. Device Orientation

The application reads the device's yaw and pitch values to determine the direction in which the camera is pointing.

Sensor readings are smoothed to reduce unwanted movement in the rendered overlay.

### 4. Field-of-View Projection

Aircraft azimuth and elevation are compared with the device's current orientation.

Aircraft falling within the calculated camera field of view are converted into screen coordinates and rendered on the Canvas overlay.

### 5. Interactive Calibration

The calibration system allows users to tap an aircraft marker corresponding to a real aircraft visible in the sky.

The difference between the predicted marker position and the user's tap is converted into yaw and pitch correction offsets.

Calibration values are stored in browser localStorage and restored during subsequent sessions.

## Project Structure

```text
tracker/
├── assets/
├── backend/
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── scripts/
│   ├── aircraft.js
│   ├── calibration.js
│   ├── camera.js
│   ├── canvas.js
│   ├── location.js
│   ├── main.js
│   ├── math.js
│   ├── orientation.js
│   └── render.js
├── styles/
│   └── main.css
├── index.html
└── .gitignore
```

## Installation and Setup

### Prerequisites

- Node.js 18 or newer
- npm
- A modern browser
- A device with a camera, GPS and orientation sensors for the intended mobile experience
- Internet connection for aircraft data retrieval

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/AR-Aircraft-Tracker.git
cd AR-Aircraft-Tracker
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Start the Backend

```bash
node server.js
```

The application will be available at:

```text
http://localhost:3000
```

The Express server serves both the frontend files and the aircraft API.

### 4. Open the Application

Open the application in a compatible browser.

Allow camera, location and device orientation permissions when prompted.

Press **Start AR** to initialize the camera and orientation tracking.

Press **Calibrate** to correct the alignment between the displayed aircraft markers and the real-world view.

## API Reference

### Aircraft Data

**Endpoint**

```http
GET /aircraft?lat={latitude}&lon={longitude}
```

The backend constructs a geographic bounding box using approximately ±2 degrees around the supplied coordinates and requests aircraft state vectors from OpenSky Network.

The response contains aircraft state information returned by the OpenSky API.

## Current Limitations

- Aircraft positions depend on the availability and update frequency of OpenSky data.
- Compass accuracy can vary depending on the device and surrounding magnetic interference.
- Camera field-of-view estimation is approximate.
- Aircraft altitude and elevation calculations are estimates.
- Mobile browser permissions and sensor support vary between devices.
- The current implementation is designed primarily for mobile devices.

## Future Improvements

- Improve aircraft position accuracy and sensor fusion.
- Refine camera field-of-view calibration.
- Improve aircraft identification and information panels.
- Add aircraft filtering and selection.
- Improve orientation stability and drift correction.
- Add configurable aircraft search ranges.
- Improve the overall mobile interface.

## Project Goal

The goal of this project is to explore the practical application of augmented reality, geographical calculations, mobile sensors, and real-time aviation data.

It demonstrates how real-world aircraft coordinates can be transformed into visual information relative to an observer's physical surroundings.

## License

No license has been specified yet. A license can be added when the project is ready for public reuse.
