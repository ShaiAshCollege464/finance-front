import { useState, useEffect, useRef } from "react";
import axios from "axios";

// Helper component for the rule-based explanation. No changes here.
function RecommendationLogic({ rec }) {
    if (!rec) return null;

    const bullets = [];
    if (rec.track) {
        bullets.push(
            rec.track.includes("מנייתי")
                ? "מסלול מנייתי: פוטנציאל תשואה גבוה יותר לאורך זמן, עם תנודתיות בדרך."
                : rec.track.includes("כללי")
                    ? "מסלול כללי: איזון בין מניות, אג״ח ומזומן ליציבות יחסית."
                    : `מסלול ${rec.track}`
        );
    }
    if (rec.allocations) {
        const parts = Object.entries(rec.allocations).map(([k, v]) => `${k} ~ ${v}%`);
        bullets.push(`תמהיל נכסים מוצע: ${parts.join(" · ")}`);
    }
    if (Number.isFinite(rec.horizon)) {
        bullets.push(`אופק השקעה מוערך: ${rec.horizon} שנים`);
    }
    if (rec.reason) bullets.push(rec.reason);

    if (!bullets.length) return null;

    return (
        <div className="mt12">
            <div className="kpi-title">נימוקי ההמלצה</div>
            <ul className="muted mt6">
                {bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
        </div>
    );
}

// AI Panel with new timer and state management logic.
function AiAdvicePanel({ userId, phoneNumber, name, answers, rec, aiResponse, setAiResponse, setAiMode }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (loading) {
            intervalRef.current = setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        } else {
            clearInterval(intervalRef.current);
            setElapsedSeconds(0);
        }

        return () => clearInterval(intervalRef.current);
    }, [loading]);

    const callSummary = async () => {
        setAiMode(true); // Trigger parent to hide regular advice
        setError("");
        setLoading(true);
        try {
            const res = await axios.post(
                "http://localhost:9030/fm1/summary",
                { userId, phoneNumber, name, answers, recommendation: rec },
                { headers: { "Content-Type": "application/json" } }
            );
            setAiResponse(res.data?.value ?? "");
        } catch (e) {
            setError("שגיאה בשליפת הסבר אישי.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <h2 className="section-title">העמקה וניתוח אישי (AI) 🤖</h2>
            {!loading && !aiResponse && (
                <p className="muted">
                    כדי לקבל הסבר מותאם אישית על התוכנית, או לשאול שאלות נוספות, ניתן להשתמש
                    ביכולות הבינה המלאכותית.
                </p>
            )}

            {!aiResponse && (
                <div className="actions mt8">
                    <button className="btn btn--primary" onClick={callSummary} disabled={loading}>
                        {loading ? "מנתח נתונים..." : "הפק הסבר אישי"}
                    </button>
                </div>
            )}

            {loading && (
                <div className="mt12" style={{textAlign: 'center'}}>
                    <p className="kpi-title">מנתח את הפרופיל שלך...</p>
                    <p className="muted">התהליך עשוי לארוך כדקה.</p>
                    <div className="kpi-value" style={{fontSize: '1.5rem', marginTop: '8px'}}>
                        {elapsedSeconds} שניות
                    </div>
                </div>
            )}

            {error && <div className="muted" style={{ color: "#c62828", marginTop: 8 }}>{error}</div>}

            {aiResponse && (
                <div className="mt12">
                    <div className="kpi-title">פירוט אישי (AI)</div>
                    <p className="muted mt6" style={{ whiteSpace: "pre-wrap" }}>{aiResponse}</p>
                </div>
            )}

            <div className="disclaimer mt12">
                המידע הוא כללי ואינו מהווה ייעוץ השקעות או המלצה אישית.
            </div>
        </>
    );
}


export default function ResultCard({
                                       rec,
                                       answers,
                                       flow,
                                       setStep,
                                       setQIndex,
                                       userId,
                                       phoneNumber,
                                       name,
                                       aiResponse,
                                       setAiResponse,
                                   }) {
    // New state to control visibility of the regular advice
    const [isAiMode, setAiMode] = useState(false);

    const parseAmount = (v) => {
        if (v === null || v === undefined) return NaN;
        const cleaned = String(v).replace(/[^\d.\-]/g, "");
        return Number.parseFloat(cleaned);
    };

    const getAnswerLabel = (key) => ({
        amount: "סכום להשקעה",
        splitNextYear: "פריסה לשנה הבאה",
        goal: "מטרת ההשקעה",
        horizonYears: "אופק זמן",
        hasEmergencyFund: "קרן חירום",
        willingAdjustForEmergency: "נכונות להפריש לקרן חירום",
        hasExperience: "ניסיון בהשקעות",
        lossReaction: "תגובה להפסד",
    }[key] || key);

    const getAnswerValue = (key, value) => {
        if (!value) return "—";
        const valueLabels = {
            splitNextYear: { YES: "כן", NO: "לא" },
            goal: { SELF_CAPITAL: "הגדלת הון עצמי", GOAL_EVENT: "מטרה מוגדרת", PROPERTY: "רכישת נכס" },
            hasEmergencyFund: { YES: "כן", NO: "לא" },
            willingAdjustForEmergency: { YES: "כן", NO: "לא" },
            hasExperience: { YES: "כן", NO: "לא" },
            lossReaction: { PANIC: "אלחץ ואמכור", UNDERSTAND: "אבין ואשאיר", UNKNOWN: "לא יודע" },
        };
        if (key === "amount") {
            const num = parseAmount(value);
            return Number.isFinite(num) ? `₪${new Intl.NumberFormat("he-IL").format(num)}` : value;
        }
        if (key === "horizonYears") return `${value} שנים`;
        return valueLabels[key]?.[value] || value;
    };

    const gotoQuestion = (key) => {
        const idx = flow.indexOf(key);
        if (idx >= 0) {
            setStep(1);
            setQIndex(idx);
        }
    };

    if (rec?.error) {
        return (
            <div className="card card--elev center fade-in">
                <div className="kpi-title" style={{ textAlign: "center" }}>שגיאה בחישוב</div>
                <p className="muted" style={{ textAlign: "center" }}>{rec.error}</p>
                <div className="actions mt12">
                    <button className="btn" onClick={() => setStep(1)}>חזרה לשאלון</button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Card 1: Summary of answers (remains the same) */}
            <div className="card card--elev center fade-in mb16">
                <h2 className="section-title">סיכום התשובות שלך</h2>
                <div className="grid grid--1 md-2 mt12" style={{ textAlign: "right", gap: 16 }}>
                    {Object.entries(answers)
                        .filter(([key, value]) => value && flow.includes(key))
                        .map(([key, value]) => (
                            <div key={key} style={{ padding: "8px 0" }}>
                                <div className="kpi-title" style={{ fontSize: "0.9rem", marginBottom: 4 }}>
                                    {getAnswerLabel(key)}
                                </div>
                                <div className="muted" style={{ fontSize: "1rem" }}>
                                    {getAnswerValue(key, value)}{" "}
                                    <button className="link" onClick={() => gotoQuestion(key)} style={{ marginInlineStart: 8 }}>
                                        עריכה
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Card 2: Unified Recommendation and AI Panel */}
            <div className="card card--elev center fade-in">

                {/* Part 1: The Rule-Based Recommendation - WILL DISAPPEAR ONCE AI MODE IS ACTIVATED */}
                {!isAiMode && (
                    <>
                        <h2 className="section-title">תוכנית ההשקעה המומלצת עבורך 📈</h2>
                        <p className="section-sub">
                            זוהי ההמלצה שגובשה על בסיס התשובות שלך, באמצעות אלגוריתם מבוסס כללים.
                        </p>
                        <div className="kpi-title">מוצר מומלץ</div>
                        <div className="kpi-value">{rec.product}</div>
                        {rec.track && <div className="muted mt4">מסלול: {rec.track}</div>}
                        {Number.isFinite(rec.horizon) && <div className="muted mt4">אופק: {rec.horizon} שנים</div>}
                        {rec.allocations && (
                            <div className="mt12">
                                <div className="kpi-title">הקצאת נכסים מוצעת</div>
                                <ul className="muted mt6">
                                    {Object.entries(rec.allocations).map(([k, v]) => (
                                        <li key={k}>{k}: {v}%</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {rec.notes?.length > 0 && (
                            <div className="mt12">
                                <div className="kpi-title">הערות</div>
                                <ul className="muted mt6">{rec.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                            </div>
                        )}

                        <RecommendationLogic rec={rec} />

                        <div className="actions mt16">
                            <button className="btn" onClick={() => { setStep(1); setQIndex(0); }}>
                                חזרה לשאלון
                            </button>
                            <button className="btn" onClick={() => { setStep(0); setQIndex(0); }}>
                                התחלה מחדש
                            </button>
                        </div>

                        <hr style={{width: '100%', margin: '24px 0', border: 'none', borderBottom: '1px solid var(--border-color)'}} />
                    </>
                )}

                {/* Part 2: The AI Deep-Dive */}
                <AiAdvicePanel
                    userId={userId}
                    phoneNumber={phoneNumber}
                    name={name}
                    answers={answers}
                    rec={rec}
                    aiResponse={aiResponse}
                    setAiResponse={setAiResponse}
                    setAiMode={setAiMode} // Pass the setter to the child
                />
            </div>
        </>
    );
}