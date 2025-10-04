// src/components/ResultCard.jsx
import axios from "axios";

function PersonalizedDetails({ rec, THRESH_GMI, aiResponse, answers }) {
    const gmiCeilingFmt = new Intl.NumberFormat("he-IL").format(THRESH_GMI);

    const trackExplain = (t) =>
        t?.includes("מנייתי")
            ? "מסלול מנייתי משקיע בעיקר במניות — פוטנציאל תשואה גבוה יותר לאורך זמן, אך גם תנודתיות גבוהה בדרך."
            : t?.includes("כללי")
                ? "מסלול כללי מפזר בין מניות, אג״ח ומזומן כדי לאזן בין סיכון ליציבות."
                : null;

    const allocationExplain = (a) => {
        if (!a) return null;
        const parts = [];
        if ("מניות" in a) parts.push("רכיב המניות יכול לנוע למעלה ולמטה, אך נוטה לתשואה גבוהה יותר בטווח הארוך.");
        if ("כללי" in a) parts.push("הרכיב הכללי יוצר איזון בין סיכון ליציבות.");
        if ("סולידי" in a) parts.push("הרכיב הסולידי שומר על יציבות ונזילות, עם תשואה צפויה נמוכה יותר.");
        if ("S&P 500" in a) parts.push("חשיפה רחבה לחברות אמריקאיות גדולות באמצעות מדד S&P 500.");
        return parts.join(" ");
    };

    if (aiResponse && aiResponse.length > 0) {
        return (
            <div className="card card--elev center fade-in mt16">
                <div className="kpi-title" style={{ textAlign: "center" }}>פירוט אישי</div>
                <p className="muted mt8" style={{ textAlign: "center" }}>{aiResponse}</p>
                <div className="disclaimer" style={{ textAlign: "center" }}>
                    המידע הוא כללי ואינו מהווה ייעוץ השקעות או המלצה אישית.
                </div>
            </div>
        );
    }

    if (rec.product === "קופת גמל להשקעה") {
        return (
            <div className="card card--elev center fade-in mt16">
                <div className="kpi-title" style={{ textAlign: "center" }}>פירוט אישי</div>
                <p className="muted mt8" style={{ textAlign: "center" }}>
                    קופת גמל להשקעה היא מעטפת השקעה נזילה. אפשר להפקיד עד {gmiCeilingFmt} ₪ בכל שנת מס, למשוך בכל שלב או להמשיך
                    לחיסכון לטווח ארוך; המיסוי חל רק על הרווח בעת משיכה.
                </p>
                {rec.track && (
                    <p className="muted mt8" style={{ textAlign: "center" }}>
                        <b>למה המסלול:</b> {trackExplain(rec.track) || rec.track}.
                    </p>
                )}
                {allocationExplain(rec.allocations) && (
                    <p className="muted mt8" style={{ textAlign: "center" }}>
                        <b>איך זה בנוי:</b> {allocationExplain(rec.allocations)}
                    </p>
                )}
                {Number.isFinite(rec.horizon) && (
                    <p className="muted mt8" style={{ textAlign: "center" }}>
                        <b>התאמה אליך:</b> אופק של {rec.horizon} שנים מתאים למטרה של{" "}
                        {answers.goal === "SELF_CAPITAL"
                            ? "הגדלת הון עצמי"
                            : answers.goal === "GOAL_EVENT"
                                ? "מטרה מוגדרת"
                                : "רכישת נכס"}{" "}
                        ומאפשר להתמודד עם תנודות.
                    </p>
                )}
                <div className="disclaimer" style={{ textAlign: "center" }}>
                    המידע הוא כללי ואינו מהווה ייעוץ השקעות או המלצה אישית.
                </div>
            </div>
        );
    }

    if (rec.product === "פוליסת חיסכון") {
        return (
            <div className="card card--elev center fade-in mt16">
                <div className="kpi-title" style={{ textAlign: "center" }}>פירוט אישי</div>
                <p className="muted mt8" style={{ textAlign: "center" }}>
                    פוליסת חיסכון היא מוצר השקעה דרך חברת ביטוח, ללא תקרת הפקדה שנתית — נוח כאשר הסכום גבוה מתקרת הגמל להשקעה.
                    דמי הניהול תלויים בחברה ובמסלול.
                </p>
                {rec.allocations && (
                    <p className="muted mt8" style={{ textAlign: "center" }}>
                        <b>איך התמהיל שהומלץ עובד:</b> {allocationExplain(rec.allocations)}
                    </p>
                )}
                {Number.isFinite(rec.horizon) && rec.horizon > 0 && (
                    <p className="muted mt8" style={{ textAlign: "center" }}>
                        <b>התאמה אליך:</b> אופק של {rec.horizon} שנים מתאים לשילוב בין צמיחה ליציבות לפי הנוחות שלך מתנודתיות.
                    </p>
                )}
                <div className="disclaimer" style={{ textAlign: "center" }}>
                    המידע הוא כללי ואינו מהווה ייעוץ השקעות או המלצה אישית.
                </div>
            </div>
        );
    }

    if (rec.product === "השארת הכסף בבנק") {
        return (
            <div className="card card--elev center fade-in mt16">
                <div className="kpi-title" style={{ textAlign: "center" }}>פירוט אישי</div>
                <p className="muted mt8" style={{ textAlign: "center" }}>
                    כשאופק ההשקעה קצר, עדיף לשמור על נזילות ויציבות — פיקדון/חשבון חיסכון — כדי למזער סיכון לתנודות עד למועד
                    השימוש בכסף.
                </p>
                <div className="disclaimer" style={{ textAlign: "center" }}>
                    המידע הוא כללי ואינו מהווה ייעוץ השקעות או המלצה אישית.
                </div>
            </div>
        );
    }

    return null;
}

export default function ResultCard({
                                       rec,
                                       answers,
                                       flow,
                                       THRESH_GMI,
                                       setStep,
                                       setQIndex,
                                       userId,
                                       phoneNumber,
                                       name,
                                       aiResponse,
                                       setAiResponse,
                                   }) {
    // local helper for display
    const parseAmount = (v) => {
        if (v === null || v === undefined) return NaN;
        const cleaned = String(v).replace(/[^\d.\-]/g, "");
        return Number.parseFloat(cleaned);
    };

    const getAnswerLabel = (key) => {
        const labels = {
            amount: "סכום להשקעה",
            splitNextYear: "פריסה לשנה הבאה",
            goal: "מטרת ההשקעה",
            horizonYears: "אופק זמן",
            hasEmergencyFund: "קרן חירום",
            willingAdjustForEmergency: "נכונות להפריש לקרן חירום",
            hasExperience: "ניסיון בהשקעות",
            lossReaction: "תגובה להפסד",
        };
        return labels[key] || key;
    };

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
            {/* User Answers Summary */}
            <div className="card card--elev center fade-in mb16">
                <h2 className="section-title">סיכום התשובות שלך</h2>
                <div className="grid grid--1 md-2 mt12" style={{ textAlign: "right", gap: "16px" }}>
                    {Object.entries(answers)
                        .filter(([key, value]) => value && flow.includes(key))
                        .map(([key, value]) => (
                            <div key={key} style={{ padding: "8px 0" }}>
                                <div className="kpi-title" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                                    {getAnswerLabel(key)}
                                </div>
                                <div className="muted" style={{ fontSize: "1rem" }}>
                                    {getAnswerValue(key, value)}
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Recommendation Summary */}
            <div className="card card--elev center fade-in">
                <h2 className="section-title">תוצאה מסכמת</h2>
                <div className="grid grid--1 lg-2" style={{ textAlign: "right" }}>
                    <div>
                        <div className="kpi-title">מוצר מומלץ</div>
                        <div className="kpi-value">{rec.product}</div>
                        {rec.track && <div className="muted mt4">מסלול: {rec.track}</div>}
                        {Number.isFinite(rec.horizon) && <div className="muted mt4">אופק: {rec.horizon} שנים</div>}
                        {rec.reason && <div className="muted mt8">{rec.reason}</div>}
                    </div>
                    <div>
                        {rec.allocations && (
                            <div>
                                <div className="kpi-title">הקצאת נכסים מוצעת</div>
                                <ul className="muted mt8">
                                    {Object.entries(rec.allocations).map(([k, v]) => (
                                        <li key={k}>
                                            {k}: {v}%
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {rec.notes?.length > 0 && (
                            <div className="mt12">
                                <div className="kpi-title">הערות</div>
                                <ul className="muted mt8">{rec.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                            </div>
                        )}
                    </div>
                </div>

                <PersonalizedDetails
                    rec={rec}
                    THRESH_GMI={THRESH_GMI}
                    aiResponse={aiResponse}
                    answers={answers}
                />

                <div className="actions mt16">
                    <button
                        className="btn"
                        onClick={() => {
                            setStep(1);
                            setQIndex(0);
                        }}
                    >
                        חזרה לשאלון
                    </button>

                    <button
                        className="btn"
                        onClick={() => {
                            setStep(0);
                            setQIndex(0);
                        }}
                    >
                        התחלה מחדש
                    </button>

                    <button
                        className="btn btn--primary"
                        onClick={async () => {
                            try {
                                const response = await axios.post(
                                    "http://localhost:9030/fm1/summary",
                                    { userId, phoneNumber, name, answers, recommendation: rec },
                                    { headers: { "Content-Type": "application/json" } }
                                );
                                setAiResponse(response.data.value);
                                alert("הסיכום נשלח בהצלחה!");
                            } catch (err) {
                                console.error(err);
                                alert("שגיאה בשליחת הסיכום");
                            }
                        }}
                    >
                        קבלת פירוט אישי (AI)
                    </button>
                </div>
            </div>
        </>
    );
}
