// src/components/Section.jsx
export default function Section({ title, sub, children }) {
    return (
        <div className="card card--elev center fade-in">
            <h2 className="section-title">{title}</h2>
            {sub && <p className="section-sub">{sub}</p>}
            <div style={{ marginTop: 10 }}>{children}</div>
        </div>
    );
}
