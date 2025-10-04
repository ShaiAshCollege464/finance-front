// src/components/QuestionScreen.jsx
import Section from "./Section";

export default function QuestionScreen({
                                           currentKey,
                                           answers,
                                           setA,
                                           nextQuestion,
                                           isCurrentAnswered,
                                           THRESH_GMI,
                                           amountRef, // passed from parent so focusing still works
                                       }) {
    if (currentKey === "amount") {
        return (
            <Section title="כמה כסף יש לך להשקעה כעת? (₪)">
                <input
                    ref={amountRef}
                    autoFocus
                    className="input input--lg"
                    inputMode="decimal"
                    placeholder="לדוגמה: 50,000"
                    value={answers.amount}
                    onChange={(e) => setA("amount", e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && isCurrentAnswered()) nextQuestion();
                    }}
                />
                <div className="hint">אפשר ללחוץ Enter להמשך</div>
            </Section>
        );
    }

    if (currentKey === "splitNextYear") {
        const gmiCeiling = new Intl.NumberFormat("he-IL").format(THRESH_GMI);
        return (
            <Section
                title="לפרוס חלק לשנה הבאה?"
                sub={`קופת גמל להשקעה מוגבלת לתקרה שנתית של ${gmiCeiling} ₪. כדי להימנע ממעבר לפוליסת חיסכון (שלרוב דמי הניהול בה גבוהים יותר), אפשר להשקיע כעת עד התקרה ואת היתרה בשנת המס הבאה.`}
            >
                <div className="choice" role="radiogroup" aria-label="פריסה לשנה הבאה">
                    <button
                        className={`btn choice__btn ${answers.splitNextYear === "YES" ? "is-selected" : ""}`}
                        aria-pressed={answers.splitNextYear === "YES"}
                        onClick={() => {
                            setA("splitNextYear", "YES");
                            nextQuestion();
                        }}
                    >
                        1. כן
                    </button>
                    <button
                        className={`btn choice__btn ${answers.splitNextYear === "NO" ? "is-selected" : ""}`}
                        aria-pressed={answers.splitNextYear === "NO"}
                        onClick={() => {
                            setA("splitNextYear", "NO");
                            nextQuestion();
                        }}
                    >
                        2. לא
                    </button>
                </div>
                <div className="hint">אפשר ללחוץ 1/2 לבחירה</div>
            </Section>
        );
    }

    if (currentKey === "goal") {
        return (
            <Section title="מה מטרת ההשקעה?">
                <div className="choice" role="radiogroup" aria-label="מטרת ההשקעה">
                    <button
                        className={`btn choice__btn ${answers.goal === "SELF_CAPITAL" ? "is-selected" : ""}`}
                        aria-pressed={answers.goal === "SELF_CAPITAL"}
                        onClick={() => {
                            setA("goal", "SELF_CAPITAL");
                            nextQuestion();
                        }}
                    >
                        1. הגדלת הון עצמי
                    </button>
                    <button
                        className={`btn choice__btn ${answers.goal === "GOAL_EVENT" ? "is-selected" : ""}`}
                        aria-pressed={answers.goal === "GOAL_EVENT"}
                        onClick={() => {
                            setA("goal", "GOAL_EVENT");
                            nextQuestion();
                        }}
                    >
                        2. מטרה מוגדרת (למשל: אירוע / רכישת רכב)
                    </button>
                    <button
                        className={`btn choice__btn ${answers.goal === "PROPERTY" ? "is-selected" : ""}`}
                        aria-pressed={answers.goal === "PROPERTY"}
                        onClick={() => {
                            setA("goal", "PROPERTY");
                            nextQuestion();
                        }}
                    >
                        3. רכישת נכס
                    </button>
                </div>
                <div className="hint">אפשר ללחוץ 1/2/3 לבחירה</div>
            </Section>
        );
    }

    if (currentKey === "hasEmergencyFund") {
        return (
            <Section title="האם יש לך קרן חירום?">
                <div className="choice" role="radiogroup" aria-label="קרן חירום">
                    <button
                        className={`btn choice__btn ${answers.hasEmergencyFund === "YES" ? "is-selected" : ""}`}
                        aria-pressed={answers.hasEmergencyFund === "YES"}
                        onClick={() => {
                            setA("hasEmergencyFund", "YES");
                            nextQuestion();
                        }}
                    >
                        1. כן
                    </button>
                    <button
                        className={`btn choice__btn ${answers.hasEmergencyFund === "NO" ? "is-selected" : ""}`}
                        aria-pressed={answers.hasEmergencyFund === "NO"}
                        onClick={() => {
                            setA("hasEmergencyFund", "NO");
                            nextQuestion();
                        }}
                    >
                        2. לא
                    </button>
                </div>
                <div className="hint">אפשר ללחוץ 1/2 לבחירה</div>
            </Section>
        );
    }

    if (currentKey === "willingAdjustForEmergency") {
        return (
            <Section title="לשנות סכום לצורך קרן חירום?">
                <div className="choice" role="radiogroup" aria-label="התאמת סכום לקרן חירום">
                    <button
                        className={`btn choice__btn ${answers.willingAdjustForEmergency === "YES" ? "is-selected" : ""}`}
                        aria-pressed={answers.willingAdjustForEmergency === "YES"}
                        onClick={() => {
                            setA("willingAdjustForEmergency", "YES");
                            nextQuestion();
                        }}
                    >
                        1. כן
                    </button>
                    <button
                        className={`btn choice__btn ${answers.willingAdjustForEmergency === "NO" ? "is-selected" : ""}`}
                        aria-pressed={answers.willingAdjustForEmergency === "NO"}
                        onClick={() => {
                            setA("willingAdjustForEmergency", "NO");
                            nextQuestion();
                        }}
                    >
                        2. לא
                    </button>
                </div>
                <div className="hint">אפשר ללחוץ 1/2 לבחירה</div>
            </Section>
        );
    }

    if (currentKey === "horizonYears") {
        return (
            <Section title="בעוד כמה שנים תצטרך את הכסף?">
                <input
                    autoFocus
                    className="input input--lg"
                    inputMode="numeric"
                    placeholder="לדוגמה: 4"
                    value={answers.horizonYears}
                    onChange={(e) => setA("horizonYears", e.target.value.replace(/[^\d]/g, ""))}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && isCurrentAnswered()) nextQuestion();
                    }}
                />
                <div className="hint">אפשר ללחוץ Enter להמשך</div>
            </Section>
        );
    }

    if (currentKey === "hasExperience") {
        return (
            <Section title="האם יש לך ניסיון בהשקעות?">
                <div className="choice" role="radiogroup" aria-label="ניסיון בהשקעות">
                    <button
                        className={`btn choice__btn ${answers.hasExperience === "YES" ? "is-selected" : ""}`}
                        aria-pressed={answers.hasExperience === "YES"}
                        onClick={() => {
                            setA("hasExperience", "YES");
                            nextQuestion();
                        }}
                    >
                        1. כן
                    </button>
                    <button
                        className={`btn choice__btn ${answers.hasExperience === "NO" ? "is-selected" : ""}`}
                        aria-pressed={answers.hasExperience === "NO"}
                        onClick={() => {
                            setA("hasExperience", "NO");
                            nextQuestion();
                        }}
                    >
                        2. לא
                    </button>
                </div>
                <div className="hint">אפשר ללחוץ 1/2 לבחירה</div>
            </Section>
        );
    }

    if (currentKey === "lossReaction") {
        return (
            <Section title="כיצד תגיב אם תראה הפסד בהשקעה?">
                <div className="choice" role="radiogroup" aria-label="תגובה להפסד">
                    <button
                        className={`btn choice__btn ${answers.lossReaction === "PANIC" ? "is-selected" : ""}`}
                        aria-pressed={answers.lossReaction === "PANIC"}
                        onClick={() => {
                            setA("lossReaction", "PANIC");
                            nextQuestion();
                        }}
                    >
                        1. אלחץ ואמכור
                    </button>
                    <button
                        className={`btn choice__btn ${answers.lossReaction === "UNDERSTAND" ? "is-selected" : ""}`}
                        aria-pressed={answers.lossReaction === "UNDERSTAND"}
                        onClick={() => {
                            setA("lossReaction", "UNDERSTAND");
                            nextQuestion();
                        }}
                    >
                        2. אבין ואשאיר
                    </button>
                    <button
                        className={`btn choice__btn ${answers.lossReaction === "UNKNOWN" ? "is-selected" : ""}`}
                        aria-pressed={answers.lossReaction === "UNKNOWN"}
                        onClick={() => {
                            setA("lossReaction", "UNKNOWN");
                            nextQuestion();
                        }}
                    >
                        3. לא יודע
                    </button>
                </div>
                <div className="hint">אפשר ללחוץ 1/2/3 לבחירה</div>
            </Section>
        );
    }

    return null;
}
