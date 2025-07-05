import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
// import GyroscopeReader from "./components/Gyroscope.jsx";
import { string } from "three/src/nodes/TSL.js";

createRoot(document.getElementById("root")).render(
  //   <StrictMode>
  <>
    <App />
    {/* <GyroscopeReader /> */}
  </>
  //   {/* </StrictMode> */}
);
