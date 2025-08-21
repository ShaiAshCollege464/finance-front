import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./finance-agent.css";

function App() {
    const [step, setStep] = useState(0);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [name, setName] = useState("");
    const [userId, setUserId] = useState(null);

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

    // המרת סכום
    const parseAmount = (v) => {
        if (v === null || v === undefined) return NaN;
        const cleaned = String(v).replace(/[^\d.\-]/g, "");
        return Number.parseFloat(cleaned);
    };

    // קבועים
    const THRESH_GMI = 76450;
    const THRESH_POLICY = 100000;

    // קביעת מסלול לפי סכום/פריסה
    const route = useMemo(() => {
        const amount = parseAmount(answers.amount);
        if (!Number.isFinite(amount)) return null;
        if (amount > THRESH_POLICY) return "POLICY";
        if (amount < THRESH_GMI) return "GMI";
        if (answers.splitNextYear === "YES") return "GMI";
        if (answers.splitNextYear === "NO") return "POLICY";
        return "MIDDLE";
    }, [answers.amount, answers.splitNextYear]);

    // ניקוד סיכון (פנימי)
    const riskScore = useMemo(() => {
        const exp = answers.hasExperience;
        const reaction = answers.lossReaction;
        if (!exp || !reaction) return null;
        const expBool = exp === "YES";
        const mood = reaction === "PANIC" ? "לחוץ" : reaction === "UNDERSTAND" ? "רגוע" : "ניטרלי";
        if (expBool && mood === "רגוע") return 5;
        if (expBool && mood === "ניטרלי") return 4;
        if (!expBool && mood === "רגוע") return 4;
        if (!expBool && mood === "ניטרלי") return 3;
        if (expBool && mood === "לחוץ") return 2;
        if (!expBool && mood === "לחוץ") return 1;
        return null;
    }, [answers.hasExperience, answers.lossReaction]);

    // הקצאות לפוליסה
    const allocationsPolicyMid = (s) => {
        switch (s) {
            case 5: return { מניות: 20, כללי: 80 };
            case 4: return { כללי: 100 };
            case 3: return { כללי: 80, סולידי: 20 };
            case 2: return { כללי: 50, סולידי: 50 };
            case 1: return { כללי: 20, סולידי: 80 };
            default: return null;
        }
    };
    const allocationsPolicyLong = (s) => {
        switch (s) {
            case 5: return { מניות: 60, "S&P 500": 40 };
            case 4: return { מניות: 80, כללי: 20 };
            case 3: return { מניות: 50, כללי: 50 };
            case 2: return { כללי: 80, סולידי: 20 };
            case 1: return { כללי: 50, סולידי: 50 };
            default: return null;
        }
    };

    // חישוב המלצה
    const computeRecommendation = () => {
        const amount = parseAmount(answers.amount);
        if (!Number.isFinite(amount)) return { error: "אנא הזן סכום תקין" };

        let primaryProduct = null;
        let adjustedAmount = amount;
        const notes = [];

        if (amount > THRESH_POLICY) primaryProduct = "POLICY";
        else if (amount < THRESH_GMI) primaryProduct = "GMI";
        else {
            if (answers.splitNextYear === "YES") { adjustedAmount = THRESH_GMI; primaryProduct = "GMI"; notes.push("הפקדה מחולקת לשתי שנות מס."); }
            else if (answers.splitNextYear === "NO") primaryProduct = "POLICY";
            else return { error: "נא לבחור האם לפרוס חלק מההפקדה לשנה הבאה" };
        }

        const horizon = Number(answers.horizonYears);
        const goal = answers.goal;
        const productHeb = (c) => c === "GMI" ? "קופת גמל להשקעה" : c === "POLICY" ? "פוליסת חיסכון" : "השארת הכסף בבנק";

        const result = { product: productHeb(primaryProduct), reason: "", horizon, allocations: null, track: null, notes, adjustedAmount };

        if (primaryProduct === "GMI") {
            if (!Number.isFinite(horizon)) return { error: "אנא הזן אופק השקעה (שנים)" };
            if (horizon < 3) { result.product = "השארת הכסף בבנק"; result.reason = "אופק קצר."; return result; }
            if (!goal) return { error: "נא לבחור מטרה להשקעה" };
            if (goal === "SELF_CAPITAL") {
                if (!answers.hasEmergencyFund) return { error: "נא לציין האם יש לך קרן חירום" };
                result.track = "מסלול מנייתי"; result.reason = "התאמה למטרה.";
                if (answers.hasEmergencyFund === "NO" && answers.willingAdjustForEmergency === "YES") notes.push("שקול להפריש חלק לקרן חירום.");
                return result;
            }
            if (goal === "GOAL_EVENT" || goal === "PROPERTY") {
                if (horizon < 3) { result.product = "השארת הכסף בבנק"; result.reason = "אופק קצר."; return result; }
                else if (horizon <= 5) { result.track = "מסלול כללי"; result.reason = "אופק בינוני."; return result; }
                else { result.track = "מסלול מנייתי"; result.reason = "אופק ארוך."; return result; }
            }
        }

        if (primaryProduct === "POLICY") {
            if (!answers.hasExperience) return { error: "נא לציין האם יש לך ניסיון בהשקעות" };
            if (!answers.lossReaction) return { error: "נא לבחור תגובה צפויה להפסד" };
            if (!riskScore) return { error: "לא ניתן לגזור פרופיל – בדוק את הבחירות" };
            if (!goal) return { error: "נא לבחור מטרה להשקעה" };

            if (goal === "SELF_CAPITAL") {
                if (!answers.hasEmergencyFund) return { error: "נא לציין האם יש לך קרן חירום" };
                result.reason = "התאמה למטרה.";
                result.allocations = allocationsPolicyLong(riskScore) || allocationsPolicyMid(riskScore);
                if (answers.hasEmergencyFund === "NO" && answers.willingAdjustForEmergency === "YES") notes.push("שקול להפריש חלק לקרן חירום.");
                return result;
            }

            if (!Number.isFinite(horizon)) return { error: "אנא הזן אופק השקעה (שנים)" };
            if (horizon < 3) { result.product = "השארת הכסף בבנק"; result.reason = "אופק קצר."; return result; }
            else if (horizon <= 5) { result.reason = "אופק בינוני."; result.allocations = allocationsPolicyMid(riskScore); return result; }
            else { result.reason = "אופק ארוך."; result.allocations = allocationsPolicyLong(riskScore); return result; }
        }

        return { error: "לא ניתן לגזור המלצה – בדוק את הנתונים" };
    };

    // רצף שאלות
    const flow = useMemo(() => {
        const f = ["amount"];
        const amount = parseAmount(answers.amount);
        if (Number.isFinite(amount) && amount >= THRESH_GMI && amount <= THRESH_POLICY) f.push("splitNextYear");
        f.push("goal");
        if (answers.goal === "SELF_CAPITAL") { f.push("hasEmergencyFund"); if (answers.hasEmergencyFund === "NO") f.push("willingAdjustForEmergency"); }
        if (route === "GMI") f.push("horizonYears");
        if (route === "POLICY") { f.push("hasExperience","lossReaction"); if (answers.goal && answers.goal !== "SELF_CAPITAL") f.push("horizonYears"); }
        return f;
    }, [answers.amount, answers.goal, answers.hasEmergencyFund, answers.willingAdjustForEmergency, route]);

    const currentKey = flow[qIndex];
    const nextQuestion = () => setQIndex((i) => Math.min(i + 1, flow.length - 1));
    const prevQuestion = () => setQIndex((i) => Math.max(i - 1, 0));

    const isCurrentAnswered = () => {
        switch (currentKey) {
            case "amount": return Number.isFinite(parseAmount(answers.amount)) && parseAmount(answers.amount) > 0;
            case "splitNextYear": return !!answers.splitNextYear;
            case "goal": return !!answers.goal;
            case "hasEmergencyFund": return !!answers.hasEmergencyFund;
            case "willingAdjustForEmergency": return !!answers.willingAdjustForEmergency;
            case "horizonYears": return !!answers.horizonYears && Number(answers.horizonYears) >= 0;
            case "hasExperience": return !!answers.hasExperience;
            case "lossReaction": return !!answers.lossReaction;
            default: return true;
        }
    };

    // קיצורי מקלדת
    useEffect(() => {
        if (step !== 1) return;
        const handler = (e) => {
            if (e.key === "Enter" && isCurrentAnswered()) { if (qIndex < flow.length - 1) nextQuestion(); else submitAnswers(); }
            if (["1","2","3"].includes(e.key)) {
                const i = Number(e.key) - 1;
                if (currentKey === "splitNextYear") { if (i===0){setA("splitNextYear","YES");nextQuestion();} if(i===1){setA("splitNextYear","NO");nextQuestion();} }
                if (currentKey === "goal") { if(i===0){setA("goal","SELF_CAPITAL");nextQuestion();} if(i===1){setA("goal","GOAL_EVENT");nextQuestion();} if(i===2){setA("goal","PROPERTY");nextQuestion();} }
                if (currentKey === "hasEmergencyFund") { if(i===0){setA("hasEmergencyFund","YES");nextQuestion();} if(i===1){setA("hasEmergencyFund","NO");nextQuestion();} }
                if (currentKey === "willingAdjustForEmergency") { if(i===0){setA("willingAdjustForEmergency","YES");nextQuestion();} if(i===1){setA("willingAdjustForEmergency","NO");nextQuestion();} }
                if (currentKey === "hasExperience") { if(i===0){setA("hasExperience","YES");nextQuestion();} if(i===1){setA("hasExperience","NO");nextQuestion();} }
                if (currentKey === "lossReaction") { if(i===0){setA("lossReaction","PANIC");nextQuestion();} if(i===1){setA("lossReaction","UNDERSTAND");nextQuestion();} if(i===2){setA("lossReaction","UNKNOWN");nextQuestion();} }
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
        const recommendation = computeRecommendation();
        try {
            await axios.get("/fm1/submit", { params: { userId, data: JSON.stringify({ answers, recommendation }) } });
        } catch {}
        setStep(2);
    };

    // UI
    const amountRef = useRef(null);
    useEffect(() => { if (currentKey === "amount") amountRef.current?.focus(); }, [currentKey]);

    const Section = ({ title, sub, children }) => (
        <div className="card card--elev center fade-in">
            <h2 className="section-title">{title}</h2>
            {sub && <p className="section-sub">{sub}</p>}
            <div style={{marginTop:10}}>{children}</div>
        </div>
    );

    const Stepper = () => (
        <div className="stepper" aria-label="התקדמות שאלון">
            {flow.map((_, i) => <div key={i} className={`stepper__dot ${i <= qIndex ? "is-active" : ""}`} />)}
        </div>
    );

    const QuestionScreen = () => {
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
                        onKeyDown={(e) => { if (e.key === "Enter" && isCurrentAnswered()) nextQuestion(); }}
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
                        <button className={`btn choice__btn ${answers.splitNextYear === "YES" ? "is-selected" : ""}`} aria-pressed={answers.splitNextYear === "YES"} onClick={() => { setA("splitNextYear", "YES"); nextQuestion(); }}>1. כן</button>
                        <button className={`btn choice__btn ${answers.splitNextYear === "NO" ? "is-selected" : ""}`} aria-pressed={answers.splitNextYear === "NO"} onClick={() => { setA("splitNextYear", "NO"); nextQuestion(); }}>2. לא</button>
                    </div>
                    <div className="hint">אפשר ללחוץ 1/2 לבחירה</div>
                </Section>
            );
        }
        if (currentKey === "goal") {
            return (
                <Section title="מה מטרת ההשקעה?">
                    <div className="choice" role="radiogroup" aria-label="מטרת ההשקעה">
                        <button className={`btn choice__btn ${answers.goal === "SELF_CAPITAL" ? "is-selected" : ""}`} aria-pressed={answers.goal === "SELF_CAPITAL"} onClick={() => { setA("goal", "SELF_CAPITAL"); nextQuestion(); }}>1. הגדלת הון עצמי</button>
                        <button className={`btn choice__btn ${answers.goal === "GOAL_EVENT" ? "is-selected" : ""}`} aria-pressed={answers.goal === "GOAL_EVENT"} onClick={() => { setA("goal", "GOAL_EVENT"); nextQuestion(); }}>2. מטרה מוגדרת (למשל: אירוע / רכישת רכב)</button>
                        <button className={`btn choice__btn ${answers.goal === "PROPERTY" ? "is-selected" : ""}`} aria-pressed={answers.goal === "PROPERTY"} onClick={() => { setA("goal", "PROPERTY"); nextQuestion(); }}>3. רכישת נכס</button>
                    </div>
                    <div className="hint">אפשר ללחוץ 1/2/3 לבחירה</div>
                </Section>
            );
        }
        if (currentKey === "hasEmergencyFund") {
            return (
                <Section title="האם יש לך קרן חירום?">
                    <div className="choice" role="radiogroup" aria-label="קרן חירום">
                        <button className={`btn choice__btn ${answers.hasEmergencyFund === "YES" ? "is-selected" : ""}`} aria-pressed={answers.hasEmergencyFund === "YES"} onClick={() => { setA("hasEmergencyFund", "YES"); nextQuestion(); }}>1. כן</button>
                        <button className={`btn choice__btn ${answers.hasEmergencyFund === "NO" ? "is-selected" : ""}`} aria-pressed={answers.hasEmergencyFund === "NO"} onClick={() => { setA("hasEmergencyFund", "NO"); nextQuestion(); }}>2. לא</button>
                    </div>
                    <div className="hint">אפשר ללחוץ 1/2 לבחירה</div>
                </Section>
            );
        }
        if (currentKey === "willingAdjustForEmergency") {
            return (
                <Section title="לשנות סכום לצורך קרן חירום?">
                    <div className="choice" role="radiogroup" aria-label="התאמת סכום לקרן חירום">
                        <button className={`btn choice__btn ${answers.willingAdjustForEmergency === "YES" ? "is-selected" : ""}`} aria-pressed={answers.willingAdjustForEmergency === "YES"} onClick={() => { setA("willingAdjustForEmergency", "YES"); nextQuestion(); }}>1. כן</button>
                        <button className={`btn choice__btn ${answers.willingAdjustForEmergency === "NO" ? "is-selected" : ""}`} aria-pressed={answers.willingAdjustForEmergency === "NO"} onClick={() => { setA("willingAdjustForEmergency", "NO"); nextQuestion(); }}>2. לא</button>
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
                        onKeyDown={(e) => { if (e.key === "Enter" && isCurrentAnswered()) nextQuestion(); }}
                    />
                    <div className="hint">אפשר ללחוץ Enter להמשך</div>
                </Section>
            );
        }
        if (currentKey === "hasExperience") {
            return (
                <Section title="האם יש לך ניסיון בהשקעות?">
                    <div className="choice" role="radiogroup" aria-label="ניסיון בהשקעות">
                        <button className={`btn choice__btn ${answers.hasExperience === "YES" ? "is-selected" : ""}`} aria-pressed={answers.hasExperience === "YES"} onClick={() => { setA("hasExperience", "YES"); nextQuestion(); }}>1. כן</button>
                        <button className={`btn choice__btn ${answers.hasExperience === "NO" ? "is-selected" : ""}`} aria-pressed={answers.hasExperience === "NO"} onClick={() => { setA("hasExperience", "NO"); nextQuestion(); }}>2. לא</button>
                    </div>
                    <div className="hint">אפשר ללחוץ 1/2 לבחירה</div>
                </Section>
            );
        }
        if (currentKey === "lossReaction") {
            return (
                <Section title="כיצד תגיב אם תראה הפסד בהשקעה?">
                    <div className="choice" role="radiogroup" aria-label="תגובה להפסד">
                        <button className={`btn choice__btn ${answers.lossReaction === "PANIC" ? "is-selected" : ""}`} aria-pressed={answers.lossReaction === "PANIC"} onClick={() => { setA("lossReaction", "PANIC"); nextQuestion(); }}>1. אלחץ ואמכור</button>
                        <button className={`btn choice__btn ${answers.lossReaction === "UNDERSTAND" ? "is-selected" : ""}`} aria-pressed={answers.lossReaction === "UNDERSTAND"} onClick={() => { setA("lossReaction", "UNDERSTAND"); nextQuestion(); }}>2. אבין ואשאיר</button>
                        <button className={`btn choice__btn ${answers.lossReaction === "UNKNOWN" ? "is-selected" : ""}`} aria-pressed={answers.lossReaction === "UNKNOWN"} onClick={() => { setA("lossReaction", "UNKNOWN"); nextQuestion(); }}>3. לא יודע</button>
                    </div>
                    <div className="hint">אפשר ללחוץ 1/2/3 לבחירה</div>
                </Section>
            );
        }
        return null;
    };

    const PersonalizedDetails = ({ rec }) => {
        const gmiCeilingFmt = new Intl.NumberFormat("he-IL").format(THRESH_GMI);
        const trackExplain = (t) => t?.includes("מנייתי")
            ? "מסלול מנייתי משקיע בעיקר במניות — פוטנציאל תשואה גבוה יותר לאורך זמן, אך גם תנודתיות גבוהה בדרך."
            : t?.includes("כללי")
                ? "מסלול כללי מפזר בין מניות, אג״ח ומזומן כדי לאזן בין סיכון ליציבות."
                : null;
        const allocationExplain = (a) => {
            if (!a) return null;
            const parts=[];
            if ("מניות" in a) parts.push("רכיב המניות יכול לנוע למעלה ולמטה, אך נוטה לתשואה גבוהה יותר בטווח הארוך.");
            if ("כללי" in a) parts.push("הרכיב הכללי יוצר איזון בין סיכון ליציבות.");
            if ("סולידי" in a) parts.push("הרכיב הסולידי שומר על יציבות ונזילות, עם תשואה צפויה נמוכה יותר.");
            if ("S&P 500" in a) parts.push("חשיפה רחבה לחברות אמריקאיות גדולות באמצעות מדד S&P 500.");
            return parts.join(" ");
        };

        if (rec.product === "קופת גמל להשקעה") {
            return (
                <div className="card card--elev center fade-in mt16">
                    <div className="kpi-title" style={{textAlign:"center"}}>פירוט אישי</div>
                    <p className="muted mt8" style={{textAlign:"center"}}>
                        קופת גמל להשקעה היא מעטפת השקעה נזילה. אפשר להפקיד עד {gmiCeilingFmt} ₪ בכל שנת מס, למשוך בכל שלב או להמשיך לחיסכון לטווח ארוך; המיסוי חל רק על הרווח בעת משיכה.
                    </p>
                    {rec.track && <p className="muted mt8" style={{textAlign:"center"}}><b>למה המסלול:</b> {trackExplain(rec.track) || rec.track}.</p>}
                    {allocationExplain(rec.allocations) && <p className="muted mt8" style={{textAlign:"center"}}><b>איך זה בנוי:</b> {allocationExplain(rec.allocations)}</p>}
                    {Number.isFinite(rec.horizon) && <p className="muted mt8" style={{textAlign:"center"}}><b>התאמה אליך:</b> אופק של {rec.horizon} שנים מתאים למטרה של {answers.goal==="SELF_CAPITAL"?"הגדלת הון עצמי":answers.goal==="GOAL_EVENT"?"מטרה מוגדרת":"רכישת נכס"} ומאפשר להתמודד עם תנודות.</p>}
                    <div className="disclaimer" style={{textAlign:"center"}}>המידע הוא כללי ואינו מהווה ייעוץ השקעות או המלצה אישית.</div>
                </div>
            );
        }
        if (rec.product === "פוליסת חיסכון") {
            return (
                <div className="card card--elev center fade-in mt16">
                    <div className="kpi-title" style={{textAlign:"center"}}>פירוט אישי</div>
                    <p className="muted mt8" style={{textAlign:"center"}}>
                        פוליסת חיסכון היא מוצר השקעה דרך חברת ביטוח, ללא תקרת הפקדה שנתית — נוח כאשר הסכום גבוה מתקרת הגמל להשקעה. דמי הניהול תלויים בחברה ובמסלול.
                    </p>
                    {rec.allocations && <p className="muted mt8" style={{textAlign:"center"}}><b>איך התמהיל שהומלץ עובד:</b> {allocationExplain(rec.allocations)}</p>}
                    {Number.isFinite(rec.horizon) && rec.horizon>0 && <p className="muted mt8" style={{textAlign:"center"}}><b>התאמה אליך:</b> אופק של {rec.horizon} שנים מתאים לשילוב בין צמיחה ליציבות לפי הנוחות שלך מתנודתיות.</p>}
                    <div className="disclaimer" style={{textAlign:"center"}}>המידע הוא כללי ואינו מהווה ייעוץ השקעות או המלצה אישית.</div>
                </div>
            );
        }
        if (rec.product === "השארת הכסף בבנק") {
            return (
                <div className="card card--elev center fade-in mt16">
                    <div className="kpi-title" style={{textAlign:"center"}}>פירוט אישי</div>
                    <p className="muted mt8" style={{textAlign:"center"}}>
                        כשאופק ההשקעה קצר, עדיף לשמור על נזילות ויציבות — פיקדון/חשבון חיסכון — כדי למזער סיכון לתנודות עד למועד השימוש בכסף.
                    </p>
                    <div className="disclaimer" style={{textAlign:"center"}}>המידע הוא כללי ואינו מהווה ייעוץ השקעות או המלצה אישית.</div>
                </div>
            );
        }
        return null;
    };

    const ResultCard = () => {
        const rec = computeRecommendation();
        if (rec.error) {
            return (
                <div className="card card--elev center fade-in">
                    <div className="kpi-title" style={{textAlign:"center"}}>שגיאה בחישוב</div>
                    <p className="muted" style={{textAlign:"center"}}>{rec.error}</p>
                    <div className="actions mt12">
                        <button className="btn" onClick={() => setStep(1)}>חזרה לשאלון</button>
                    </div>
                </div>
            );
        }
        return (
            <div className="card card--elev center fade-in">
                <h2 className="section-title">תוצאה מסכמת</h2>
                {/* ברירת מחדל עמודה אחת; נפתח לשתיים רק במסכים ממש רחבים */}
                <div className="grid grid--1 lg-2" style={{textAlign:"right"}}>
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
                                    {Object.entries(rec.allocations).map(([k,v]) => <li key={k}>{k}: {v}%</li>)}
                                </ul>
                            </div>
                        )}
                        {rec.notes?.length>0 && (
                            <div className="mt12">
                                <div className="kpi-title">הערות</div>
                                <ul className="muted mt8">{rec.notes.map((n,i)=><li key={i}>{n}</li>)}</ul>
                            </div>
                        )}
                    </div>
                </div>
                <PersonalizedDetails rec={rec}/>
                <div className="actions mt16">
                    <button className="btn" onClick={() => { setStep(1); setQIndex(0); }}>חזרה לשאלון</button>
                    <button className="btn" onClick={() => { setStep(0); setQIndex(0); }}>התחלה מחדש</button>
                </div>
            </div>
        );
    };

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
                                    <input className="input input--lg" placeholder="הקלד מספר טלפון" value={phoneNumber} onChange={(e)=>setPhoneNumber(e.target.value)} />
                                </div>
                                <div>
                                    <label className="kpi-title">שם מלא</label>
                                    <input className="input input--lg" placeholder="הקלד שם" value={name} onChange={(e)=>setName(e.target.value)} />
                                </div>
                            </div>
                            <div className="actions mt16">
                                <button
                                    className="btn btn--primary"
                                    disabled={!phoneNumber || !name}
                                    onClick={async () => {
                                        try { const res = await axios.get("/fm1/add-user", { params: { phone: phoneNumber, name } }); setUserId(res.data?.value ?? null); } catch {}
                                        setStep(1); setQIndex(0);
                                    }}
                                >
                                    התחל שאלון
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="wizard fade-in">
                            <Stepper />
                            <div className="mt12" />
                            <div className="wizard__panel">
                                <QuestionScreen />
                                <div className="muted mt6" style={{textAlign:"center"}}>שאלה {qIndex + 1} מתוך {flow.length}</div>
                                <div className="actions mt8">
                                    <button className="btn" onClick={() => setQIndex((i)=>Math.max(i-1,0))} disabled={qIndex===0}>הקודם</button>
                                    {qIndex < flow.length - 1 ? (
                                        <button className="btn btn--primary" onClick={() => setQIndex((i)=>i+1)} disabled={!isCurrentAnswered()}>הבא</button>
                                    ) : (
                                        <button className="btn btn--primary" onClick={submitAnswers} disabled={!isCurrentAnswered()}>סיום וניתוח</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && <ResultCard />}
                </div>
            </main>
        </div>
    );
}

export default App;
