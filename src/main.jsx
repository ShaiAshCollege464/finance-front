import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx"; // App כבר מייבא את ./finance-agent.css

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <App />
    </StrictMode>
);
