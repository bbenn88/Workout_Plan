import { useState, useEffect, useRef } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type Day = typeof DAYS[number];
type WorkoutType = "strength" | "run" | "climb" | "rest";

const SCHEDULE: Record<Day, { label: string; type: WorkoutType; color: string }> = {
  Monday: { label: "Core Strength + Climbing", type: "strength", color: "#e86b3a" },
  Tuesday: { label: "Run + Active Recovery Core", type: "run", color: "#4a9eca" },
  Wednesday: { label: "Climbing + Antagonist Work", type: "climb", color: "#7bc67a" },
  Thursday: { label: "Run + Core Strength", type: "strength", color: "#e86b3a" },
  Friday: { label: "Climbing + Core Finisher", type: "climb", color: "#7bc67a" },
  Saturday: { label: "Long Run + Full Core Session", type: "run", color: "#4a9eca" },
  Sunday: { label: "Rest / Mobility", type: "rest", color: "#9b8ec4" },
};

const CLIMBING_CUES = [
  "Quiet feet today — place each foot with intention",
  "Think about hip position on every move",
  "Keep tension through your core on holds",
  "Look at your feet before you move them",
  "Trust your feet — less grip, more balance",
  "Flag early, flag often",
  "Drop knee on traverses — feel the difference",
  "Breathe on the wall — don't hold your breath",
  "Use your legs, not your arms",
  "Stay close to the wall on overhangs",
];

interface Exercise { name: string; sets: number; reps: string; note: string; }
interface Workout { title: string; icon: string; exercises: Exercise[]; }
interface HollowEntry { date: string; seconds: number; }
interface ClimbEntry { date: string; grade: string; notes: string; photo?: string; }
interface KneeRating { rating: "good" | "neutral" | "bad"; note: string; }
interface WeeklyReflection { kneeFeeel: string; energy: string; win: string; date: string; }

const WORKOUTS: Record<WorkoutType, Workout> = {
  strength: {
    title: "Core Strength", icon: "💪",
    exercises: [
      { name: "Dead Bug", sets: 3, reps: "10 each side", note: "Keep low back pressed flat" },
      { name: "Hollow Body Hold", sets: 3, reps: "30 sec", note: "Front lever foundation" },
      { name: "Ab Wheel Rollout", sets: 3, reps: "10", note: "Start small range" },
      { name: "Pallof Press", sets: 3, reps: "12 each side", note: "Anti-rotation" },
      { name: "Hanging Knee Raises", sets: 3, reps: "12", note: "Transfers to climbing" },
      { name: "Single-Leg Glute Bridge", sets: 3, reps: "12 each side", note: "Surgical leg as tolerated" },
      { name: "Side Plank with Hip Dip", sets: 3, reps: "15 each side", note: "" },
    ],
  },
  run: {
    title: "Run Session", icon: "🏃",
    exercises: [
      { name: "Easy Run", sets: 1, reps: "20–30 min", note: "Conversational pace" },
      { name: "Bird Dog", sets: 3, reps: "10 each side", note: "Recovery core" },
      { name: "Glute Bridge", sets: 2, reps: "15", note: "" },
      { name: "Supine Leg Lowering", sets: 2, reps: "10", note: "" },
      { name: "Cat-Cow + Breathing", sets: 1, reps: "2 min", note: "Deep breathing focus" },
    ],
  },
  climb: {
    title: "Climbing + Finisher", icon: "🧗",
    exercises: [
      { name: "Climbing Session", sets: 1, reps: "60–90 min", note: "Focus on quiet feet & hip position" },
      { name: "Hollow Body Rock", sets: 3, reps: "20 sec", note: "" },
      { name: "L-Sit Hold", sets: 3, reps: "15 sec", note: "Between chairs or on floor" },
      { name: "Plank with Shoulder Tap", sets: 3, reps: "12 each side", note: "" },
      { name: "Arch Body Hold", sets: 3, reps: "20 sec", note: "Balances hollow body" },
    ],
  },
  rest: {
    title: "Rest & Mobility", icon: "🧘",
    exercises: [
      { name: "Hip Flexor Stretch", sets: 2, reps: "60 sec each", note: "" },
      { name: "Thoracic Rotation", sets: 2, reps: "10 each side", note: "" },
      { name: "Foam Roll Quads/IT Band", sets: 1, reps: "2 min each", note: "Gentle pressure" },
      { name: "Deep Breathing / Box Breath", sets: 1, reps: "5 min", note: "Recovery focus" },
    ],
  },
};

const HOLLOW_BODY_MILESTONES = [15, 30, 45, 60];

const getWeekKey = (weekOffset = 0): string => {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + weekOffset * 7);
  return monday.toISOString().split("T")[0];
};

const getTodayName = (): Day => DAYS[((new Date().getDay() + 6) % 7)];

const getPhase = (hollowBest: number, climbCount: number): { phase: number; label: string; color: string; desc: string } => {
  if (hollowBest >= 45 && climbCount >= 12) return { phase: 3, label: "Month 3 — Perform", color: "#e86b3a", desc: "Return to project grades. Tension board work." };
  if (hollowBest >= 30 && climbCount >= 6) return { phase: 2, label: "Month 2 — Reintroduce Load", color: "#4a9eca", desc: "Project 1–2 grades harder. Flag moves & drop knees." };
  return { phase: 1, label: "Month 1 — Rebuild Confidence", color: "#7bc67a", desc: "Stay within ability. Quiet feet, hip position, core tension." };
};

export default function App() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [hollowBodyTime, setHollowBodyTime] = useState("");
  const [hollowBodyLog, setHollowBodyLog] = useState<HollowEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<Day>(getTodayName());
  const [kneeRatings, setKneeRatings] = useState<Record<string, KneeRating>>({});
  const [kneeInput, setKneeInput] = useState("");
  const [kneeRating, setKneeRating] = useState<"good" | "neutral" | "bad">("neutral");
  const [activeTab, setActiveTab] = useState("week");
  const [climbGrade, setClimbGrade] = useState("");
  const [climbNotes, setClimbNotes] = useState("");
  const [climbLog, setClimbLog] = useState<ClimbEntry[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerDone, setTimerDone] = useState(false);
  const [weeklyReflection, setWeeklyReflection] = useState<WeeklyReflection | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionInput, setReflectionInput] = useState({ kneeFeeel: "", energy: "", win: "" });
  const [streak, setStreak] = useState(0);
  const [todayCue] = useState(() => CLIMBING_CUES[Math.floor(Math.random() * CLIMBING_CUES.length)]);
  const [completedWeeks, setCompletedWeeks] = useState<Record<string, boolean>>({});
  const timerRef = useRef<number | null>(null);
  const photoRef = useRef<HTMLInputElement>(const [probioticLog, setProbioticLog] = useState<Record<string, boolean>>({});
  const [probioticStreak, setProbioticStreak] = useState(0);
  const [porbioticLog, setProbioticLog] = useState<Record<string, boolean>>
  const weekKey = getWeekKey(weekOffset);
  const storageKey = `climbing-tracker-${weekKey}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        setCompletedSets(data.completedSets || {});
        setKneeRatings(data.kneeRatings || {});
      }
      const globalData = localStorage.getItem("climbing-tracker-global");
      if (globalData) {
        const g = JSON.parse(globalData);
        setHollowBodyLog(g.hollowBodyLog || []);
        setClimbLog(g.climbLog || []);
        setWeeklyReflection(g.weeklyReflection || null);
        setStreak(g.streak || 0);
        setCompletedWeeks(g.completedWeeks || {});
      }
    } catch {}
  }, [weekKey]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = window.setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const save = (cs: Record<string, boolean>, kr: Record<string, KneeRating>) => {
    try { localStorage.setItem(storageKey, JSON.stringify({ completedSets: cs, kneeRatings: kr })); } catch {}
  };

  const saveGlobal = (hbl: HollowEntry[], cl: ClimbEntry[], wr: WeeklyReflection | null, s: number, cw: Record<string, boolean>) => {
    try { localStorage.setItem("climbing-tracker-global", JSON.stringify({ hollowBodyLog: hbl, climbLog: cl, weeklyReflection: wr, streak: s, completedWeeks: cw })); } catch {}
  };

  const toggleSet = (day: string, exercise: string, setIdx: number) => {
    const key = `${day}-${exercise}-${setIdx}`;
    const updated = { ...completedSets, [key]: !completedSets[key] };
    setCompletedSets(updated);
    save(updated, kneeRatings);
    const allWeekDone = DAYS.every(d => {
      const w = WORKOUTS[SCHEDULE[d].type];
      return w.exercises.every((ex: Exercise) =>
        Array.from({ length: ex.sets }).every((_, i) => !!updated[`${d}-${ex.name}-${i}`])
      );
    });
    if (allWeekDone && !completedWeeks[weekKey]) {
      const updatedWeeks = { ...completedWeeks, [weekKey]: true };
      const keys = Object.keys(updatedWeeks).sort();
      let s = 0;
      for (let i = keys.length - 1; i >= 0; i--) { if (updatedWeeks[keys[i]]) s++; else break; }
      setCompletedWeeks(updatedWeeks);
      setStreak(s);
      saveGlobal(hollowBodyLog, climbLog, weeklyReflection, s, updatedWeeks);
    }
  };

  const isSetDone = (day: string, exercise: string, setIdx: number) =>
    !!completedSets[`${day}-${exercise}-${setIdx}`];

  const getDayProgress = (day: Day) => {
    const info = SCHEDULE[day];
    const workout = WORKOUTS[info.type];
    let total = 0, done = 0;
    workout.exercises.forEach((ex: Exercise) => {
      for (let i = 0; i < ex.sets; i++) { total++; if (isSetDone(day, ex.name, i)) done++; }
    });
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  const stopTimer = () => { setTimerRunning(false); setTimerDone(true); };

  const saveTimerResult = () => {
    if (timerSeconds < 1) return;
    const entry: HollowEntry = { date: new Date().toLocaleDateString(), seconds: timerSeconds };
    const updated = [...hollowBodyLog, entry];
    setHollowBodyLog(updated);
    saveGlobal(updated, climbLog, weeklyReflection, streak, completedWeeks);
    setTimerSeconds(0); setTimerDone(false);
  };

  const resetTimer = () => { setTimerRunning(false); setTimerSeconds(0); setTimerDone(false); };

  const logManualHollow = () => {
    const secs = parseInt(hollowBodyTime);
    if (!secs || secs < 1) return;
    const entry: HollowEntry = { date: new Date().toLocaleDateString(), seconds: secs };
    const updated = [...hollowBodyLog, entry];
    setHollowBodyLog(updated);
    saveGlobal(updated, climbLog, weeklyReflection, streak, completedWeeks);
    setHollowBodyTime("");
  };

  const logKnee = () => {
    if (!kneeInput.trim()) return;
    const updated = { ...kneeRatings, [selectedDay]: { rating: kneeRating, note: kneeInput } };
    setKneeRatings(updated);
    save(completedSets, updated);
    setKneeInput("");
  };

  const logClimb = (photo?: string) => {
    if (!climbGrade.trim()) return;
    const entry: ClimbEntry = { date: new Date().toLocaleDateString(), grade: climbGrade, notes: climbNotes, photo };
    const updated = [...climbLog, entry];
    setClimbLog(updated);
    saveGlobal(hollowBodyLog, updated, weeklyReflection, streak, completedWeeks);
    setClimbGrade(""); setClimbNotes("");
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { logClimb(ev.target?.result as string); };
    reader.readAsDataURL(file);
  };

  const saveReflection = () => {
    const wr: WeeklyReflection = { kneeFeeel: reflectionInput.kneeFeeel, energy: reflectionInput.energy, win: reflectionInput.win, date: new Date().toLocaleDateString() };
    setWeeklyReflection(wr);
    saveGlobal(hollowBodyLog, climbLog, wr, streak, completedWeeks);
    setShowReflection(false);
  };

  const bestHollow = hollowBodyLog.length > 0 ? Math.max(...hollowBodyLog.map((h) => h.seconds)) : 0;
  const workout = WORKOUTS[SCHEDULE[selectedDay].type];
  const dayInfo = SCHEDULE[selectedDay];
  const phase = getPhase(bestHollow, climbLog.length);
  const weekDates = DAYS.map((_, i) => { const base = new Date(weekKey); const d = new Date(base); d.setDate(base.getDate() + i); return d.getDate(); });
  const todayName = getTodayName();
  const isClimbDay = SCHEDULE[selectedDay].type === "climb";
  const isSunday = selectedDay === "Sunday";
  const kneeRatingColor = { good: "#7bc67a", neutral: "#f0c040", bad: "#e86b3a" };
  const kneeTrend = DAYS.map(d => { const r = kneeRatings[d]; return r ? (r.rating === "good" ? 2 : r.rating === "neutral" ? 1 : 0) : null; });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0d14", color: "#e8e4dc", fontFamily: "'Georgia', 'Times New Roman', serif", padding: "0 0 80px 0" }}>

      <div style={{ background: "linear-gradient(180deg, #141824 0%, #0a0d14 100%)", borderBottom: "1px solid #1e2535", padding: "24px 20px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: "#7bc67a", fontFamily: "monospace", marginBottom: 6, textTransform: "uppercase" }}>Recovery Tracker</div>
        <h1 style={{ fontSize: 26, fontWeight: 400, margin: 0, color: "#e8e4dc", letterSpacing: 1 }}>Climb Strong Again</h1>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}>
          {streak > 0 && <div style={{ background: "#e86b3a22", border: "1px solid #e86b3a44", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#e86b3a", fontFamily: "monospace" }}>🔥 {streak} week streak</div>}
          <div style={{ background: `${phase.color}22`, border: `1px solid ${phase.color}44`, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: phase.color, fontFamily: "monospace" }}>Phase {phase.phase}/3</div>
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 6 }}>
          {["week", "progress", "log"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? "#e86b3a" : "transparent", border: `1px solid ${activeTab === tab ? "#e86b3a" : "#2a3040"}`, color: activeTab === tab ? "#fff" : "#666", padding: "6px 16px", borderRadius: 20, cursor: "pointer", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "week" && (
        <div style={{ padding: "20px 16px" }}>
          {isClimbDay && (
            <div style={{ background: "#7bc67a11", border: "1px solid #7bc67a33", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 18 }}>🧗</span>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 3, color: "#7bc67a", fontFamily: "monospace", marginBottom: 2 }}>TODAY'S FOCUS</div>
                <div style={{ fontSize: 13, color: "#ccc", fontStyle: "italic" }}>{todayCue}</div>
              </div>
            </div>
          )}
          {isSunday && (
            <button onClick={() => setShowReflection(true)} style={{ width: "100%", background: "#9b8ec411", border: "1px solid #9b8ec433", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 18 }}>📝</span>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 3, color: "#9b8ec4", fontFamily: "monospace", marginBottom: 2 }}>WEEKLY REFLECTION</div>
                <div style={{ fontSize: 13, color: "#aaa" }}>{weeklyReflection ? `Last win: "${weeklyReflection.win}"` : "Tap to reflect on your week"}</div>
              </div>
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={navBtnStyle}>← Prev</button>
            <span style={{ fontSize: 12, color: "#666", letterSpacing: 2, fontFamily: "monospace" }}>{weekOffset === 0 ? "THIS WEEK" : weekOffset === -1 ? "LAST WEEK" : `WEEK ${weekOffset > 0 ? "+" : ""}${weekOffset}`}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} style={navBtnStyle}>Next →</button>
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 16 }}>
            {DAYS.map((day, i) => {
              const prog = getDayProgress(day);
              const isToday = day === todayName && weekOffset === 0;
              const isSelected = day === selectedDay;
              const kr = kneeRatings[day];
              return (
                <button key={day} onClick={() => setSelectedDay(day)} style={{ flex: "0 0 auto", background: isSelected ? SCHEDULE[day].color : "#141824", border: `2px solid ${isSelected ? SCHEDULE[day].color : isToday ? "#ffffff33" : "#1e2535"}`, borderRadius: 12, padding: "10px 8px 8px", cursor: "pointer", textAlign: "center", minWidth: 48, transition: "all 0.2s" }}>
                  <div style={{ fontSize: 9, color: isSelected ? "#fff" : "#555", letterSpacing: 1, fontFamily: "monospace" }}>{day.slice(0, 3).toUpperCase()}</div>
                  <div style={{ fontSize: 15, color: isSelected ? "#fff" : "#bbb", margin: "3px 0 2px" }}>{weekDates[i]}</div>
                  {kr && <div style={{ fontSize: 8, marginBottom: 2 }}>{kr.rating === "good" ? "🟢" : kr.rating === "neutral" ? "🟡" : "🔴"}</div>}
                  {prog.done > 0 && <div style={{ width: "100%", height: 3, background: "#0a0d14", borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${prog.pct}%`, height: "100%", background: isSelected ? "#fff" : SCHEDULE[day].color, transition: "width 0.4s" }} /></div>}
                </button>
              );
            })}
          </div>
          <div style={{ background: "#141824", borderRadius: 16, border: `1px solid ${dayInfo.color}33`, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ background: `linear-gradient(90deg, ${dayInfo.color}18, transparent)`, padding: "14px 18px", borderBottom: `1px solid ${dayInfo.color}22`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 3, color: dayInfo.color, fontFamily: "monospace", textTransform: "uppercase" }}>{selectedDay}</div>
                <div style={{ fontSize: 17, marginTop: 2 }}>{workout.icon} {workout.title}</div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>{dayInfo.label}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 26, fontWeight: "bold", color: dayInfo.color }}>{getDayProgress(selectedDay).pct}%</div>
                <div style={{ fontSize: 10, color: "#444", fontFamily: "monospace" }}>COMPLETE</div>
              </div>
            </div>
            <div style={{ padding: "8px 0" }}>
              {workout.exercises.map((ex: Exercise) => (
                <div key={ex.name} style={{ padding: "10px 18px", borderBottom: "1px solid #1e253518" }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 14, color: "#e8e4dc" }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: "#555", fontFamily: "monospace", marginTop: 1 }}>{ex.sets} × {ex.reps}{ex.note && <span style={{ color: "#444", marginLeft: 6 }}>— {ex.note}</span>}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {Array.from({ length: ex.sets }).map((_, i) => {
                      const done = isSetDone(selectedDay, ex.name, i);
                      return <button key={i} onClick={() => toggleSet(selectedDay, ex.name, i)} style={{ width: 34, height: 34, borderRadius: 8, border: `2px solid ${done ? dayInfo.color : "#2a3040"}`, background: done ? dayInfo.color : "transparent", color: done ? "#fff" : "#444", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>{done ? "✓" : i + 1}</button>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#4a9eca", fontFamily: "monospace", marginBottom: 10 }}>KNEE CHECK-IN</div>
            {kneeRatings[selectedDay] && (
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10, padding: "8px 12px", background: "#0a0d14", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{kneeRatings[selectedDay].rating === "good" ? "🟢" : kneeRatings[selectedDay].rating === "neutral" ? "🟡" : "🔴"}</span>
                <span style={{ fontStyle: "italic" }}>{kneeRatings[selectedDay].note}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {(["good", "neutral", "bad"] as const).map(r => (
                <button key={r} onClick={() => setKneeRating(r)} style={{ flex: 1, padding: "6px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "monospace", background: kneeRating === r ? `${kneeRatingColor[r]}22` : "transparent", border: `1px solid ${kneeRating === r ? kneeRatingColor[r] : "#2a3040"}`, color: kneeRating === r ? kneeRatingColor[r] : "#555" }}>
                  {r === "good" ? "🟢 Good" : r === "neutral" ? "🟡 OK" : "🔴 Bad"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={kneeInput} onChange={e => setKneeInput(e.target.value)} placeholder="Any swelling or achiness?" style={inputStyle} />
              <button onClick={logKnee} style={pillBtnStyle("#4a9eca")}>Log</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "progress" && (
        <div style={{ padding: "20px 16px" }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: phase.color, fontFamily: "monospace", marginBottom: 8 }}>CLIMBING PHASE</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[1, 2, 3].map(p => (
                <div key={p} style={{ flex: 1, textAlign: "center", padding: "10px 4px", borderRadius: 10, background: phase.phase >= p ? `${phase.color}18` : "#141824", border: `1px solid ${phase.phase >= p ? phase.color : "#1e2535"}` }}>
                  <div style={{ fontSize: 20, color: phase.phase >= p ? phase.color : "#333" }}>{phase.phase > p ? "✓" : phase.phase === p ? "●" : "○"}</div>
                  <div style={{ fontSize: 10, color: phase.phase >= p ? phase.color : "#444", fontFamily: "monospace" }}>M{p}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "#888" }}>{phase.label}</div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{phase.desc}</div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#7bc67a", fontFamily: "monospace", marginBottom: 4 }}>HOLLOW BODY HOLD</div>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 16 }}>Goal: 60 seconds = climb-ready</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {HOLLOW_BODY_MILESTONES.map((m) => (
                <div key={m} style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 10, background: bestHollow >= m ? "#7bc67a18" : "#0a0d14", border: `1px solid ${bestHollow >= m ? "#7bc67a" : "#1e2535"}` }}>
                  <div style={{ fontSize: 16, color: bestHollow >= m ? "#7bc67a" : "#333" }}>{bestHollow >= m ? "✓" : "○"}</div>
                  <div style={{ fontSize: 11, color: bestHollow >= m ? "#7bc67a" : "#444", fontFamily: "monospace" }}>{m}s</div>
                </div>
              ))}
            </div>
            {bestHollow > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555", marginBottom: 4 }}><span>Best: {bestHollow}s</span><span>Goal: 60s</span></div>
                <div style={{ height: 6, background: "#0a0d14", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${Math.min((bestHollow / 60) * 100, 100)}%`, height: "100%", background: "linear-gradient(90deg, #4a9eca, #7bc67a)", borderRadius: 3 }} /></div>
              </div>
            )}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 52, fontFamily: "monospace", color: timerRunning ? "#7bc67a" : timerDone ? "#e86b3a" : "#e8e4dc", marginBottom: 12 }}>{timerSeconds}s</div>
              {!timerRunning && !timerDone && <button onClick={() => { setTimerSeconds(0); setTimerRunning(true); }} style={pillBtnStyle("#7bc67a")}>▶ Start Timer</button>}
              {timerRunning && <button onClick={stopTimer} style={pillBtnStyle("#e86b3a")}>■ Stop</button>}
              {timerDone && <div style={{ display: "flex", gap: 8, justifyContent: "center" }}><button onClick={saveTimerResult} style={pillBtnStyle("#7bc67a")}>✓ Save {timerSeconds}s</button><button onClick={resetTimer} style={pillBtnStyle("#444")}>Reset</button></div>}
            </div>
            <div style={{ borderTop: "1px solid #1e2535", paddingTop: 12 }}>
              <div style={{ fontSize: 10, color: "#444", fontFamily: "monospace", marginBottom: 8 }}>OR ENTER MANUALLY</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={hollowBodyTime} onChange={e => setHollowBodyTime(e.target.value)} placeholder="Seconds" type="number" style={inputStyle} />
                <button onClick={logManualHollow} style={pillBtnStyle("#7bc67a")}>Log</button>
              </div>
            </div>
            {hollowBodyLog.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {hollowBodyLog.slice(-5).reverse().map((entry, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #1e253518", fontSize: 12 }}>
                    <span style={{ color: "#666", fontFamily: "monospace" }}>{entry.date}</span>
                    <span style={{ color: "#7bc67a", fontFamily: "monospace" }}>{entry.seconds}s</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#e86b3a", fontFamily: "monospace", marginBottom: 12 }}>WEEKLY COMPLETION {streak > 0 && <span>🔥 {streak} weeks</span>}</div>
            {DAYS.map((day) => {
              const prog = getDayProgress(day);
              return (
                <div key={day} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginBottom: 3 }}><span>{day}</span><span style={{ fontFamily: "monospace" }}>{prog.done}/{prog.total}</span></div>
                  <div style={{ height: 5, background: "#0a0d14", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${prog.pct}%`, height: "100%", background: SCHEDULE[day].color, borderRadius: 3, transition: "width 0.4s" }} /></div>
                </div>
              );
            })}
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#4a9eca", fontFamily: "monospace", marginBottom: 12 }}>KNEE TREND THIS WEEK</div>
            <div style={{ display: "flex", gap: 6 }}>
              {DAYS.map((day, i) => {
                const val = kneeTrend[i];
                const color = val === 2 ? "#7bc67a" : val === 1 ? "#f0c040" : val === 0 ? "#e86b3a" : "#1e2535";
                return (
                  <div key={day} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ height: 40, background: color, borderRadius: 4, opacity: val === null ? 0.2 : 1, marginBottom: 4 }} />
                    <div style={{ fontSize: 9, color: "#444", fontFamily: "monospace" }}>{day.slice(0, 1)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#9b8ec4", fontFamily: "monospace", marginBottom: 10 }}>LOG A CLIMB</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={climbGrade} onChange={e => setClimbGrade(e.target.value)} placeholder="Grade (e.g. V3, 5.11a)" style={{ ...inputStyle, flex: "0 0 130px" }} />
              <button onClick={() => logClimb()} style={pillBtnStyle("#9b8ec4")}>Log</button>
              <button onClick={() => photoRef.current?.click()} style={pillBtnStyle("#333")} title="Add photo">📷</button>
              <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
            </div>
            <input value={climbNotes} onChange={e => setClimbNotes(e.target.value)} placeholder="Notes (optional)" style={inputStyle} />
            {climbLog.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {climbLog.slice(-8).reverse().map((entry, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #1e253518" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div><span style={{ fontSize: 15, color: "#9b8ec4", fontFamily: "monospace", marginRight: 8 }}>{entry.grade}</span>{entry.notes && <span style={{ fontSize: 12, color: "#555" }}>{entry.notes}</span>}</div>
                      <span style={{ fontSize: 10, color: "#444", fontFamily: "monospace" }}>{entry.date}</span>
                    </div>
                    {entry.photo && <img src={entry.photo} alt="climb" style={{ width: "100%", borderRadius: 8, marginTop: 6, maxHeight: 160, objectFit: "cover" }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "log" && (
        <div style={{ padding: "20px 16px" }}>
          {weeklyReflection && (
            <div style={cardStyle}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: "#9b8ec4", fontFamily: "monospace", marginBottom: 12 }}>LAST REFLECTION — {weeklyReflection.date}</div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.8 }}>
                <div style={{ marginBottom: 6 }}>🦵 <span style={{ color: "#e8e4dc" }}>Knee:</span> {weeklyReflection.kneeFeeel}</div>
                <div style={{ marginBottom: 6 }}>⚡ <span style={{ color: "#e8e4dc" }}>Energy:</span> {weeklyReflection.energy}</div>
                <div>🏆 <span style={{ color: "#e8e4dc" }}>Win:</span> {weeklyReflection.win}</div>
              </div>
              <button onClick={() => setShowReflection(true)} style={{ ...pillBtnStyle("#9b8ec4"), marginTop: 12, fontSize: 12 }}>Update Reflection</button>
            </div>
          )}
          <div style={cardStyle}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#e8e4dc", fontFamily: "monospace", marginBottom: 16 }}>CLIMBING PROGRESSION</div>
            {[
              { phase: 1, color: "#7bc67a", title: "Month 1 — Rebuild Confidence", desc: "Stay on routes well within ability. Focus on quiet feet, hip position, and core tension. Avoid dynamic moves or big feet cuts." },
              { phase: 2, color: "#4a9eca", title: "Month 2 — Reintroduce Load", desc: "Project 1–2 grades harder. Practice flag moves and drop knees. Add campus rungs or lock-off holds." },
              { phase: 3, color: "#e86b3a", title: "Month 3 — Perform", desc: "Return to previous project grades. Incorporate tension board or system board work if available." },
            ].map(p => (
              <div key={p.phase} style={{ marginBottom: 12, padding: "12px", borderRadius: 10, background: phase.phase === p.phase ? `${p.color}11` : "transparent", border: `1px solid ${phase.phase === p.phase ? p.color + "44" : "transparent"}` }}>
                <div style={{ fontSize: 13, color: p.color, marginBottom: 4 }}>{phase.phase === p.phase ? "▶ " : ""}{p.title}</div>
                <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>{p.desc}</div>
              </div>
            ))}
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#e8e4dc", fontFamily: "monospace", marginBottom: 16 }}>RECOVERY NOTES</div>
            <div style={{ fontSize: 13, color: "#777", lineHeight: 1.9 }}>
              <div style={{ marginBottom: 8 }}>🥩 <span style={{ color: "#e8e4dc" }}>Protein:</span> 0.7–1g per lb of bodyweight</div>
              <div style={{ marginBottom: 8 }}>😴 <span style={{ color: "#e8e4dc" }}>Sleep:</span> 8 hrs — tissue remodeling active 18–24 months post-surgery</div>
              <div style={{ marginBottom: 8 }}>💊 <span style={{ color: "#e8e4dc" }}>Collagen:</span> 10–15g + Vitamin C, 30–60 min before training</div>
              <div>🦵 <span style={{ color: "#e8e4dc" }}>Knee check:</span> Minor achiness OK. Swelling = back off.</div>
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#e8e4dc", fontFamily: "monospace", marginBottom: 16 }}>RUNNING PROGRESSION</div>
            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.8 }}>
              <div style={{ marginBottom: 6 }}><span style={{ color: "#4a9eca" }}>Tue/Thu:</span> 20–30 min easy, conversational pace</div>
              <div style={{ marginBottom: 6 }}><span style={{ color: "#4a9eca" }}>Saturday:</span> Long run, build 30 → 60 min over 8 weeks</div>
              <div><span style={{ color: "#4a9eca" }}>Rule:</span> Add 5 min/week, back off every 4th week</div>
            </div>
          </div>
        </div>
      )}

      {showReflection && (
        <div style={{ position: "fixed", inset: 0, background: "#0a0d14ee", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}>
          <div style={{ background: "#141824", borderRadius: 16, border: "1px solid #9b8ec433", padding: 24, width: "100%", maxWidth: 400 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#9b8ec4", fontFamily: "monospace", marginBottom: 16 }}>WEEKLY REFLECTION</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>🦵 How did your knee feel this week?</div>
              <input value={reflectionInput.kneeFeeel} onChange={e => setReflectionInput(r => ({ ...r, kneeFeeel: e.target.value }))} placeholder="e.g. No swelling, slight achiness after runs" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>⚡ Energy levels overall?</div>
              <input value={reflectionInput.energy} onChange={e => setReflectionInput(r => ({ ...r, energy: e.target.value }))} placeholder="e.g. Strong, felt tired mid-week" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>🏆 One win from this week?</div>
              <input value={reflectionInput.win} onChange={e => setReflectionInput(r => ({ ...r, win: e.target.value }))} placeholder="e.g. Held hollow body for 35 seconds!" style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveReflection} style={pillBtnStyle("#9b8ec4")}>Save</button>
              <button onClick={() => setShowReflection(false)} style={pillBtnStyle("#333")}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "#141824", borderRadius: 16, border: "1px solid #1e2535", padding: "18px", marginBottom: 14 };
const inputStyle: React.CSSProperties = { flex: 1, background: "#0a0d14", border: "1px solid #2a3040", borderRadius: 8, padding: "10px 12px", color: "#e8e4dc", fontSize: 13, fontFamily: "Georgia, serif", outline: "none", width: "100%" };
const navBtnStyle: React.CSSProperties = { background: "transparent", border: "1px solid #1e2535", color: "#666", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "monospace" };
const pillBtnStyle = (color: string): React.CSSProperties => ({ background: color, border: "none", color: "#fff", padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif", flexShrink: 0, whiteSpace: "nowrap" });
