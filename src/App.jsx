import {useEffect, useMemo, useRef, useState} from "react";
import axios from "axios";
import "./finance-agent.css";
import Stepper from "./components/Stepper";
import QuestionScreen from "./components/QuestionScreen";
import ResultCard from "./components/ResultCard";
import {
    THRESH_GMI,
    THRESH_POLICY,
    parseAmount,
    computeRoute,
    computeRiskScore,
    computeRecommendation,
} from "./lib/recommendation";


function App() {
    const [step, setStep] = useState(0);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [name, setName] = useState("");
    const [userId, setUserId] = useState(null);
    const [aiResponse, setAiResponse] = useState("");

    // touched לשדות מסך פתיחה (להצגת שגיאות רק כשצריך)
    const [touchedPhone, setTouchedPhone] = useState(false);
    const [touchedName, setTouchedName] = useState(false);

    // ולידציה: טלפון 10 ספרות בדיוק
    const isPhoneValid = useMemo(() => /^\d{10}$/.test(phoneNumber), [phoneNumber]);

    // ולידציה: שם = רק אותיות (עברית/אנגלית), לפחות שתי מילים, ולכל מילה ≥ 2 אותיות
    const isNameValid = useMemo(() => {
        const words = name.trim().split(/\s+/).filter(Boolean);
        if (words.length < 2) return false;
        return words.every(w => /^[A-Za-z\u0590-\u05FF]{2,}$/.test(w));
    }, [name]);

    // הודעות שגיאה (קצרות; מוצגות רק אחרי blur או אם יש כבר תוכן לא תקין)
    const phoneError = (touchedPhone || phoneNumber.length > 0) && !isPhoneValid ? "מספר טלפון לא תקין" : "";
    const nameError  = (touchedName  || name.length > 0)         && !isNameValid  ? "שם מלא לא תקין"       : "";

    const [answers, setAnswers] = useState({
        amount: "",
        splitNextYear: "",
        goal: "",
        horizonYears: "",
        hasEmergencyFund: "",
        willingAdjustForEmergency: "",
        hasExperience: "",
        lossReaction: "",
    });
    const setA = (k, v) => setAnswers((p) => ({ ...p, [k]: v }));
    const [qIndex, setQIndex] = useState(0);

    // מצב כהה/בהיר
    useEffect(() => {
        const root = document.documentElement;
        const saved = localStorage.getItem("theme");
        if (saved) root.setAttribute("data-theme", saved);
        else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) root.setAttribute("data-theme", "dark");
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

    const route = useMemo(
        () => computeRoute(answers.amount, answers.splitNextYear),
        [answers.amount, answers.splitNextYear]
    );

    const riskScore = useMemo(
        () => computeRiskScore(answers.hasExperience, answers.lossReaction),
        [answers.hasExperience, answers.lossReaction]
    );

    const flow = useMemo(() => {
        const f = ["amount"];
        const amount = parseAmount(answers.amount);
        if (Number.isFinite(amount) && amount >= THRESH_GMI && amount <= THRESH_POLICY) f.push("splitNextYear");
        f.push("goal");
        if (answers.goal === "SELF_CAPITAL") {
            f.push("hasEmergencyFund");
            if (answers.hasEmergencyFund === "NO") f.push("willingAdjustForEmergency");
        }
        if (route === "GMI") f.push("horizonYears");
        if (route === "POLICY") {
            f.push("hasExperience", "lossReaction");
            if (answers.goal && answers.goal !== "SELF_CAPITAL") f.push("horizonYears");
        }
        return f;
    }, [answers.amount, answers.goal, answers.hasEmergencyFund, answers.willingAdjustForEmergency, route]);


    const currentKey = flow[qIndex];
    const nextQuestion = () => setQIndex((i) => Math.min(i + 1, flow.length - 1));
    const prevQuestion = () => setQIndex((i) => Math.max(i - 1, 0));

    const isCurrentAnswered = () => {
        switch (currentKey) {
            case "amount":
                return Number.isFinite(parseAmount(answers.amount)) && parseAmount(answers.amount) > 0;
            case "splitNextYear":
                return !!answers.splitNextYear;
            case "goal":
                return !!answers.goal;
            case "hasEmergencyFund":
                return !!answers.hasEmergencyFund;
            case "willingAdjustForEmergency":
                return !!answers.willingAdjustForEmergency;
            case "horizonYears":
                return !!answers.horizonYears && Number(answers.horizonYears) >= 0;
            case "hasExperience":
                return !!answers.hasExperience;
            case "lossReaction":
                return !!answers.lossReaction;
            default:
                return true;
        }
    };

    // קיצורי מקלדת
    useEffect(() => {
        if (step !== 1) return;
        const handler = (e) => {
            if (e.key === "Enter" && isCurrentAnswered()) {
                if (qIndex < flow.length - 1) nextQuestion(); else submitAnswers();
            }
            if (["1", "2", "3"].includes(e.key)) {
                const i = Number(e.key) - 1;
                if (currentKey === "splitNextYear") {
                    if (i === 0) { setA("splitNextYear", "YES"); nextQuestion(); }
                    if (i === 1) { setA("splitNextYear", "NO");  nextQuestion(); }
                }
                if (currentKey === "goal") {
                    if (i === 0) { setA("goal", "SELF_CAPITAL"); nextQuestion(); }
                    if (i === 1) { setA("goal", "GOAL_EVENT");   nextQuestion(); }
                    if (i === 2) { setA("goal", "PROPERTY");     nextQuestion(); }
                }
                if (currentKey === "hasEmergencyFund") {
                    if (i === 0) { setA("hasEmergencyFund", "YES"); nextQuestion(); }
                    if (i === 1) { setA("hasEmergencyFund", "NO");  nextQuestion(); }
                }
                if (currentKey === "willingAdjustForEmergency") {
                    if (i === 0) { setA("willingAdjustForEmergency", "YES"); nextQuestion(); }
                    if (i === 1) { setA("willingAdjustForEmergency", "NO");  nextQuestion(); }
                }
                if (currentKey === "hasExperience") {
                    if (i === 0) { setA("hasExperience", "YES"); nextQuestion(); }
                    if (i === 1) { setA("hasExperience", "NO");  nextQuestion(); }
                }
                if (currentKey === "lossReaction") {
                    if (i === 0) { setA("lossReaction", "PANIC");      nextQuestion(); }
                    if (i === 1) { setA("lossReaction", "UNDERSTAND"); nextQuestion(); }
                    if (i === 2) { setA("lossReaction", "UNKNOWN");    nextQuestion(); }
                }
            }
            if (e.key === "Backspace" && !String(getCurrentValue()).length) prevQuestion();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [step, qIndex, flow, currentKey, answers]);

    const getCurrentValue = () => {
        switch (currentKey) {
            case "amount": return answers.amount;
            case "splitNextYear": return answers.splitNextYear;
            case "goal": return answers.goal;
            case "hasEmergencyFund": return answers.hasEmergencyFund;
            case "willingAdjustForEmergency": return answers.willingAdjustForEmergency;
            case "horizonYears": return answers.horizonYears;
            case "hasExperience": return answers.hasExperience;
            case "lossReaction": return answers.lossReaction;
            default: return "";
        }
    };

    const submitAnswers = async () => {
        const recommendation = computeRecommendation(answers, riskScore);
        try {
            await axios.post(
                `http://localhost:9030/fm1/submit?userId=${encodeURIComponent(userId)}`,
                { answers, recommendation },
                { headers: { "Content-Type": "application/json" } }
            );
        } catch (err) {
            console.error(err);
        }
        setStep(2);
    };


    // UI
    const amountRef = useRef(null);
    useEffect(() => {
        if (currentKey === "amount") amountRef.current?.focus();
    }, [currentKey]);

    return (
        <div className="app app--hero" dir="rtl">
            {/* טופ־בר */}
            <div className="topbar">
                <div className="container topbar__inner">
                    <div className="brand">
                        <div className="brand__mark" aria-hidden="true"></div>
                        יועץ השקעות דיגיטלי
                    </div>
                    <button className="theme-toggle" id="themeToggle" aria-label="החלפת מצב תצוגה">
                        <span className="theme-toggle__dot" aria-hidden="true"></span>
                        <span className="muted" id="themeLabel">בהיר</span>
                    </button>
                </div>
            </div>

            {/* תוכן — מסך מלא, ממורכז */}
            <main className="main main--centered">
                <div className="container center-stack">
                    {step === 0 && (
                        <div className="card card--elev center fade-in">
                            <h2 className="section-title">ברוך הבא</h2>
                            <p className="section-sub">הזן פרטים להתחלת התאמת פרופיל ההשקעות.</p>
                            <div className="grid grid--1 md-2 mt12">
                                <div>
                                    <label className="kpi-title">מספר טלפון</label>
                                    <input
                                        className="input input--lg"
                                        placeholder="הקלד מספר טלפון"
                                        value={phoneNumber}
                                        inputMode="numeric"
                                        maxLength={10}
                                        aria-invalid={!!phoneError}
                                        onChange={(e) => {
                                            const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 10);
                                            setPhoneNumber(onlyDigits);
                                        }}
                                        onBlur={() => setTouchedPhone(true)}
                                    />
                                    {phoneError && (
                                        <div className="muted" style={{ color: "#c62828", marginTop: 4 }}>
                                            {phoneError}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="kpi-title">שם מלא</label>
                                    <input
                                        className="input input--lg"
                                        placeholder="הקלד שם"
                                        value={name}
                                        aria-invalid={!!nameError}
                                        onChange={(e) => {
                                            // שומר אותיות (עברית/אנגלית) ורווחים בלבד
                                            const cleaned = e.target.value.replace(/[^A-Za-z\u0590-\u05FF\s]/g, "");
                                            setName(cleaned);
                                        }}
                                        onBlur={() => setTouchedName(true)}
                                    />
                                    {nameError && (
                                        <div className="muted" style={{ color: "#c62828", marginTop: 4 }}>
                                            {nameError}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="actions mt16">
                                <button
                                    className="btn btn--primary"
                                    disabled={!isPhoneValid || !isNameValid}
                                    onClick={async () => {
                                        if (!isPhoneValid || !isNameValid) return;

                                        // נרמול לפני שליחה
                                        const normalizedPhone = phoneNumber.replace(/\D/g, "").slice(0, 10);
                                        const normalizedName  = name.trim().replace(/\s+/g, " ");

                                        try {
                                            const res = await axios.get("/fm1/add-user", {
                                                params: { phone: normalizedPhone, name: normalizedName }
                                            });
                                            setUserId(res.data?.value ?? null);
                                        } catch {}
                                        setStep(1);
                                        setQIndex(0);
                                    }}
                                >
                                    התחל שאלון
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="wizard fade-in">
                            <Stepper total={flow.length} active={qIndex} />
                            <div className="mt12" />
                            <div className="wizard__panel">
                                <QuestionScreen
                                    currentKey={currentKey}
                                    answers={answers}
                                    setA={setA}
                                    nextQuestion={nextQuestion}
                                    isCurrentAnswered={isCurrentAnswered}
                                    THRESH_GMI={THRESH_GMI}
                                    amountRef={amountRef}
                                />
                                <div className="muted mt6" style={{ textAlign: "center" }}>
                                    שאלה {qIndex + 1} מתוך {flow.length}
                                </div>
                                <div className="actions mt8">
                                    <button
                                        className="btn"
                                        onClick={() => setQIndex((i) => Math.max(i - 1, 0))}
                                        disabled={qIndex === 0}
                                    >
                                        הקודם
                                    </button>

                                    {qIndex < flow.length - 1 ? (
                                        <button
                                            className="btn btn--primary"
                                            onClick={() => setQIndex((i) => i + 1)}
                                            disabled={!isCurrentAnswered()}
                                        >
                                            הבא
                                        </button>
                                    ) : (
                                        <button
                                            className="btn btn--primary"
                                            onClick={submitAnswers}
                                            disabled={!isCurrentAnswered()}
                                        >
                                            סיום וניתוח
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <ResultCard
                            rec={computeRecommendation(answers, riskScore)}
                            answers={answers}
                            flow={flow}
                            THRESH_GMI={THRESH_GMI}
                            setStep={setStep}
                            setQIndex={setQIndex}
                            userId={userId}
                            phoneNumber={phoneNumber}
                            name={name}
                            aiResponse={aiResponse}
                            setAiResponse={setAiResponse}
                        />
                    )}

                </div>
            </main>
        </div>
    );
}

export default App;
