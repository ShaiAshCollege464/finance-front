// src/components/Stepper.jsx
export default function Stepper({ total, active, ariaLabel = "התקדמות שאלון" }) {
    const dots = Array.from({ length: total });
    return (
        <div className="stepper" aria-label={ariaLabel}>
            {dots.map((_, i) => (
                <div
                    key={i}
                    className={`stepper__dot ${i <= active ? "is-active" : ""}`}
                />
            ))}
        </div>
    );
}
