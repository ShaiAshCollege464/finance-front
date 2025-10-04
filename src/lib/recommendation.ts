// src/lib/recommendation.js

export const THRESH_GMI = 76450;
export const THRESH_POLICY = 100000;

export function parseAmount(v) {
    if (v === null || v === undefined) return NaN;
    const cleaned = String(v).replace(/[^\d.\-]/g, "");
    return Number.parseFloat(cleaned);
}

export function computeRoute(amountRaw, splitNextYear) {
    const amount = parseAmount(amountRaw);
    if (!Number.isFinite(amount)) return null;
    if (amount > THRESH_POLICY) return "POLICY";
    if (amount < THRESH_GMI) return "GMI";
    if (splitNextYear === "YES") return "GMI";
    if (splitNextYear === "NO") return "POLICY";
    return "MIDDLE";
}

export function computeRiskScore(hasExperience, lossReaction) {
    if (!hasExperience || !lossReaction) return null;
    const expBool = hasExperience === "YES";
    const mood =
        lossReaction === "PANIC" ? "לחוץ" :
            lossReaction === "UNDERSTAND" ? "רגוע" : "ניטרלי";

    if (expBool && mood === "רגוע") return 5;
    if (expBool && mood === "ניטרלי") return 4;
    if (!expBool && mood === "רגוע") return 4;
    if (!expBool && mood === "ניטרלי") return 3;
    if (expBool && mood === "לחוץ") return 2;
    if (!expBool && mood === "לחוץ") return 1;
    return null;
}

export function allocationsPolicyMid(s) {
    switch (s) {
        case 5: return { מניות: 20, כללי: 80 };
        case 4: return { כללי: 100 };
        case 3: return { כללי: 80, סולידי: 20 };
        case 2: return { כללי: 50, סולידי: 50 };
        case 1: return { כללי: 20, סולידי: 80 };
        default: return null;
    }
}

export function allocationsPolicyLong(s) {
    switch (s) {
        case 5: return { מניות: 60, "S&P 500": 40 };
        case 4: return { מניות: 80, כללי: 20 };
        case 3: return { מניות: 50, כללי: 50 };
        case 2: return { כללי: 80, סולידי: 20 };
        case 1: return { כללי: 50, סולידי: 50 };
        default: return null;
    }
}

export function computeRecommendation(answers, riskScoreOverride = null) {
    const amount = parseAmount(answers.amount);
    if (!Number.isFinite(amount)) return { error: "אנא הזן סכום תקין" };

    let primaryProduct = null;
    let adjustedAmount = amount;
    const notes = [];

    if (amount > THRESH_POLICY) primaryProduct = "POLICY";
    else if (amount < THRESH_GMI) primaryProduct = "GMI";
    else {
        if (answers.splitNextYear === "YES") {
            adjustedAmount = THRESH_GMI;
            primaryProduct = "GMI";
            notes.push("הפקדה מחולקת לשתי שנות מס.");
        } else if (answers.splitNextYear === "NO") {
            primaryProduct = "POLICY";
        } else {
            return { error: "נא לבחור האם לפרוס חלק מההפקדה לשנה הבאה" };
        }
    }

    const horizon = Number(answers.horizonYears);
    const goal = answers.goal;
    const productHeb = (c) =>
        c === "GMI" ? "קופת גמל להשקעה" :
            c === "POLICY" ? "פוליסת חיסכון" : "השארת הכסף בבנק";

    const result = {
        product: productHeb(primaryProduct),
        reason: "",
        horizon,
        allocations: null,
        track: null,
        notes,
        adjustedAmount,
    };

    if (primaryProduct === "GMI") {
        if (!Number.isFinite(horizon)) return { error: "אנא הזן אופק השקעה (שנים)" };
        if (horizon < 3) {
            result.product = "השארת הכסף בבנק";
            result.reason = "אופק קצר.";
            return result;
        }
        if (!goal) return { error: "נא לבחור מטרה להשקעה" };

        if (goal === "SELF_CAPITAL") {
            if (!answers.hasEmergencyFund) return { error: "נא לציין האם יש לך קרן חירום" };
            result.track = "מסלול מנייתי";
            result.reason = "התאמה למטרה.";
            if (answers.hasEmergencyFund === "NO" && answers.willingAdjustForEmergency === "YES") {
                notes.push("שקול להפריש חלק לקרן חירום.");
            }
            return result;
        }

        if (goal === "GOAL_EVENT" || goal === "PROPERTY") {
            if (horizon < 3) {
                result.product = "השארת הכסף בבנק";
                result.reason = "אופק קצר.";
                return result;
            } else if (horizon <= 5) {
                result.track = "מסלול כללי";
                result.reason = "אופק בינוני.";
                return result;
            } else {
                result.track = "מסלול מנייתי";
                result.reason = "אופק ארוך.";
                return result;
            }
        }
    }

    if (primaryProduct === "POLICY") {
        const riskScore = riskScoreOverride ?? computeRiskScore(answers.hasExperience, answers.lossReaction);

        if (!answers.hasExperience) return { error: "נא לציין האם יש לך ניסיון בהשקעות" };
        if (!answers.lossReaction) return { error: "נא לבחור תגובה צפויה להפסד" };
        if (!riskScore) return { error: "לא ניתן לגזור פרופיל – בדוק את הבחירות" };
        if (!goal) return { error: "נא לבחור מטרה להשקעה" };

        if (goal === "SELF_CAPITAL") {
            if (!answers.hasEmergencyFund) return { error: "נא לציין האם יש לך קרן חירום" };
            result.reason = "התאמה למטרה.";
            result.allocations = allocationsPolicyLong(riskScore) || allocationsPolicyMid(riskScore);
            if (answers.hasEmergencyFund === "NO" && answers.willingAdjustForEmergency === "YES") {
                notes.push("שקול להפריש חלק לקרן חירום.");
            }
            return result;
        }

        if (!Number.isFinite(horizon)) return { error: "אנא הזן אופק השקעה (שנים)" };
        if (horizon < 3) {
            result.product = "השארת הכסף בבנק";
            result.reason = "אופק קצר.";
            return result;
        } else if (horizon <= 5) {
            result.reason = "אופק בינוני.";
            result.allocations = allocationsPolicyMid(riskScore);
            return result;
        } else {
            result.reason = "אופק ארוך.";
            result.allocations = allocationsPolicyLong(riskScore);
            return result;
        }
    }

    return { error: "לא ניתן לגזור המלצה – בדוק את הנתונים" };
}
