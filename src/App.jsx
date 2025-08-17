import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import "./finance-agent.css";

function App() {
    const [step, setStep] = useState(0);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [questions, setQuestions] = useState([]);
    const [name, setName] = useState("");
    const [id, setId] = useState(0);
    const [answers, setAnswers] = useState({});

    // טעינת שאלות בתחילת האפליקציה
    useEffect(() => {
        axios
            .get("http://localhost:9030/fm1/questions", {
                params: { phone: phoneNumber, name: name },
            })
            .then((response) => setQuestions(response.data?.questions || []))
            .catch(() => setQuestions([]));
    }, []);

    // מתג כהה/בהיר + תווית בעברית
    useEffect(() => {
        const root = document.documentElement;
        const saved = localStorage.getItem("theme");
        if (saved) root.setAttribute("data-theme", saved);
        else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
            root.setAttribute("data-theme", "dark");
        }

        const labelEl = document.getElementById("themeLabel");
        const toggleEl = document.getElementById("themeToggle");

        const setLabel = () => {
            const isDark = root.getAttribute("data-theme") === "dark";
            if (labelEl) labelEl.textContent = isDark ? "כהה" : "בהיר";
        };
        setLabel();

        const handler = () => {
            const isDark = root.getAttribute("data-theme") === "dark";
            const next = isDark ? "light" : "dark";
            root.setAttribute("data-theme", next);
            localStorage.setItem("theme", next);
            setLabel();
        };

        toggleEl?.addEventListener("click", handler);
        return () => toggleEl?.removeEventListener("click", handler);
    }, []);

    return (
        <div className="app">
            {/* כותרת עליונה */}
            <div className="topbar">
                <div className="brand">
                    <div className="brand__mark" aria-hidden="true"></div>
                    יועץ השקעות דיגיטלי
                </div>

                <button className="theme-toggle" id="themeToggle" aria-label="החלפת מצב תצוגה">
                    <span className="theme-toggle__dot" aria-hidden="true"></span>
                    <span className="muted" id="themeLabel">בהיר</span>
                </button>
            </div>

            {/* תוכן ראשי */}
            <main className="main">
                {/* שלב 0 – פרטי משתמש */}
                {step === 0 && (
                    <div className="card">
                        <h2 className="section-title">ברוכים הבאים</h2>
                        <p className="section-sub">הזינו פרטים להתחלה בהתאמת פרופיל ההשקעות.</p>

                        <div className="grid grid--2">
                            <div>
                                <label className="kpi-title">מספר טלפון</label>
                                <input
                                    className="input"
                                    placeholder="הקלד/י מספר טלפון"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="kpi-title">שם מלא</label>
                                <input
                                    className="input"
                                    placeholder="הקלד/י שם"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: "1rem" }}>
                            <button
                                className="btn btn--primary"
                                onClick={() => {
                                    axios
                                        .get("http://localhost:9030/fm1/add-user", {
                                            params: { phone: phoneNumber, name: name },
                                        })
                                        .then((response) => {
                                            setId(response.data?.value);
                                            setStep(1);
                                        });
                                }}
                            >
                                הבא
                            </button>
                        </div>
                    </div>
                )}

                {/* שלב 1 – שאלון */}
                {step === 1 && (
                    <div className="card">
                        <h2 className="section-title">שאלון התאמה</h2>
                        <p className="section-sub">ענו כדי לדייק את פרופיל ההשקעות שלכם.</p>

                        <div className="grid">
                            {questions.map((item) => (
                                <div key={item.id} className="card">
                                    <div className="kpi-title" style={{ marginBottom: ".5rem" }}>
                                        {item.question}
                                    </div>
                                    <input
                                        className="input"
                                        value={answers[item.id] || ""}
                                        onChange={(event) => {
                                            setAnswers((prev) => ({ ...prev, [item.id]: event.target.value }));
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: "1rem" }}>
                            <button
                                className="btn btn--primary"
                                onClick={() => {
                                    axios
                                        .get("http://localhost:9030/fm1/submit", {
                                            params: { userId: id, data: JSON.stringify(answers) },
                                        })
                                        .then(() => setStep(2));
                                }}
                            >
                                שליחת תשובות
                            </button>
                        </div>
                    </div>
                )}

                {/* שלב 2 – ניתוח */}
                {step === 2 && (
                    <div className="card">
                        <h2 className="section-title">ניתוח תשובות</h2>
                        <p className="section-sub">
                            אנו מעבדים את תשובותיך כדי לבנות פרופיל השקעות מותאם עבורך.
                        </p>
                        {/* בהמשך נוסיף כרטיסי KPI/גרפים */}
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
