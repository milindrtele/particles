import { useEffect, useState } from "react";

const GyroscopeReader = () => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [orientation, setOrientation] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0,
  });

  let handleOrientation;

  useEffect(() => {
    // Safe access for window and DeviceOrientationEvent
    if (
      typeof window === "undefined" ||
      typeof window.DeviceOrientationEvent === "undefined"
    ) {
      console.log("DeviceOrientationEvent not supported");
      return;
    }

    handleOrientation = (event) => {
      setOrientation({
        alpha: event.alpha ?? 0,
        beta: event.beta ?? 0,
        gamma: event.gamma ?? 0,
      });
    };

    const enableListener = async () => {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        try {
          const permission = await DeviceOrientationEvent.requestPermission();
          if (permission === "granted") {
            setPermissionGranted(true);
            window.addEventListener("deviceorientation", handleOrientation);
          } else {
            console.warn("Permission denied");
          }
        } catch (err) {
          console.error("Permission error", err);
        }
      } else {
        // Android / non-iOS
        setPermissionGranted(true);
        window.addEventListener("deviceorientation", handleOrientation);
      }
    };

    // Optional: auto-attempt permission request on load for non-iOS
    if (typeof DeviceOrientationEvent.requestPermission !== "function") {
      enableListener();
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  const askPermission = () => {
    if (
      typeof window !== "undefined" &&
      typeof window.DeviceOrientationEvent !== "undefined"
    ) {
      DeviceOrientationEvent.requestPermission?.()
        .then((response) => {
          if (response === "granted") {
            setPermissionGranted(true);
            window.addEventListener("deviceorientation", handleOrientation);
          }
        })
        .catch(console.error);
    }
  };

  useEffect(() => {
    let gyroscope = new Gyroscope({ frequency: 60 });

    gyroscope.addEventListener("reading", (e) => {
      console.log(`Angular velocity along the X-axis ${gyroscope.x}`);
      console.log(`Angular velocity along the Y-axis ${gyroscope.y}`);
      console.log(`Angular velocity along the Z-axis ${gyroscope.z}`);
    });
    gyroscope.start();
  }, []);

  return (
    <div
      style={{
        padding: "1rem",
        position: "absolute",
        top: 0,
        right: 0,
        color: "#fff",
        zIndex: 1000,
      }}
    >
      {!permissionGranted && (
        <button onClick={askPermission}>Enable Gyroscope</button>
      )}
      {
        <div>
          <h3>Gyroscope Data</h3>
          <p>
            <strong>Alpha (Z):</strong> {orientation.alpha.toFixed(2)}
          </p>
          <p>
            <strong>Beta (X):</strong> {orientation.beta.toFixed(2)}
          </p>
          <p>
            <strong>Gamma (Y):</strong> {orientation.gamma.toFixed(2)}
          </p>
        </div>
      }
    </div>
  );
};

export default GyroscopeReader;
