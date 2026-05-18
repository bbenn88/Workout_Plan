import { useState, useEffect } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SCHEDULE = {
  Monday: { label: "Core Strength + Climbing", type: "strength", color: "#e86b3a" },
  Tuesday: { label: "Run + Active Recovery Core", type: "run", color: "#4a9eca" },
  Wednesday: { label: "Climbing + Antagonist Work", type: "climb", color: "#7bc67a" },
  Thursday: { label: "Run + Core Strength", type: "strength", color: "#e86b3a" },
  Friday: { label: "Climbing + Core Finisher", type: "climb", color: "#7bc67a" },
  Saturday: { label: "Long Run + Full Core Session", type: "run", color: "#4a9eca" },
  Sunday: { label: "Rest / Mobility", type: "rest", color: "#9b8ec4" },
};

const WORKOUTS = {
  strength: {
    title: "Core Strength",
    icon: "💪",
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
    title: "Run Session",
    icon: "🏃",
    exercises: [
      { name: "Easy Run", sets: 1, reps: "20–30 min", note: "Conversational pace" },
      { name: "Bird Dog", sets: 3, reps: "10 each side", note: "Recovery core" },
      { name: "Glute Bridge", sets: 2, reps: "15", note: "" },
      { name: "Supine Leg Lowering", sets: 2, reps: "10", note: "" },
      { name: "Cat-Cow + Breathing", sets: 1, reps: "2 min", note: "Deep breathing focus" },
    ],
  },
  climb: {
    title: "Climbing + Finisher",
    icon: "🧗",
    exercises: [
      { name: "Climbing Session", sets: 1, reps: "60–90 min", note: "Focus on quiet feet & hip position" },
      { name: "Hollow Body Rock", sets: 3, reps: "20 sec", note: "" },
      { name: "L-Sit Hold", sets: 3, reps: "15 sec", note: "Between chairs or on floor" },
      { name: "Plank with Shoulder Tap", sets: 3, reps: "12 each side", note: "" },
      { name: "Arch Body Hold", sets: 3, reps: "20 sec", note: "Balances hollow body" },
    ],
  },
  rest: {
    title: "Rest & Mobility",
    icon: "🧘",
    exercises: [
      { name: "Hip Flexor Stretch", sets: 2, reps: "60 sec each", note: "" },
      { name: "Thoracic Rotation", sets: 2, reps: "10 each side", note: "" },
      { name: "Foam Roll Quads/IT Band", sets: 1, reps: "2 min each", note: "Gentle pressure" },
      { name: "Deep Breathing / Box Breath", sets: 1, reps: "5 min", note: "Recovery focus" },
    ],
  },
};

const HOLLOW_BODY_MILESTONES = [15, 30, 45, 60];

const getWeekKey = (weekOffset = 0) => {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + weekOffset * 7);
  return monday.toISOString().split("T")[0];
};

const getTodayName = () => {
  return DAYS[((new Date().getDay() + 6) % 7)];
};

export default function App() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [completedSets, setCompletedSets] = useState({});
  const [hollowBodyTime, setHollowBodyTime] = useState("");
  const [hollowBodyLog, setHollowBodyLog] = useState([]);
  const [selectedDay, setSelectedDay] = useState(getTodayName());
  const [kneeNotes, setKneeNotes] = useState({});
  const [kneeInput, setKneeInput] = useState("");
  const [activeTab, setActiveTab] = useState("week");
  const [climbGrade, setClimbGrade] = useState("");
  const [climbNotes, setClimbNotes] = useState("");
  const [climbLog, setClimbLog] = useState([]);

  const weekKey = getWeekKey(weekOffset);
  const storageKey = `climbing-tracker-${weekKey}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        setCompletedSets(data.completedSets || {});
        setKneeNotes(data.kneeNotes || {});
      }
      const globalData = localStorage.getItem("climbing-tracker-global");
      if (globalData) {
        const g = JSON.parse(globalData);
        setHollowBodyLog(g.hollowBodyLog || []);
        setClimbLog(g.climbLog || []);
      }
    } catch {}
  }, [weekKey]);

  const save = (cs, kn) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ completedSets: cs, kneeNotes: kn }));
    } catch {}
  };

  const saveGlobal = (hbl, cl) => {
    try {
      localStorage.setItem("climbing-tracker-global", JSON.stringify({ hollowBodyLog: hbl, climbLog: cl }));
    } catch {}
  };

  const toggleSet = (day, exercise, setIdx) => {
    const key = `${day}-${exercise}-${setIdx}`;
    const updated = { ...completedSets, [key]: !completedSets[key] };
    setCompletedSets(updated);
    save(updated, kneeNotes);
  };

  const isSetDone = (day, exercise, setIdx) => !!completedSets[`${day}-${exercise}-${setIdx}`];

  const getDayProgress = (day) => {
    const info = SCHEDULE[day];
    const workout = WORKOUTS[info.type];
    let total = 0, done = 0;
    workout.exercises.forEach((ex) => {
      for (let i = 0; i < ex.sets; i++) {
        total++;
        if (isSetDone(day, ex.name, i)) done++;
      }
    });
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  const logHollowBody = () => {
    const secs = parseInt(hollowBodyTime);
    if (!secs || secs < 1) return;
    const entry = { date: new Date().toLocaleDateString(), seconds: secs };
    const updated = [...hollowBodyLog, entry];
    setHollowBodyLog(updated);
    saveGlobal(updated, climbLog);
    setHollowBodyTime("");
  };

  const logKnee = () => {
    if (!kneeInput.trim()) return;
    const updated = { ...kneeNotes, [selectedDay]: kneeInput };
    setKneeNotes(updated);
    save(completedSets, updated);
    setKneeInput("");
  };

  const logClimb = () => {
    if (!climbGrade.trim()) return;
    const entry = { date: new Date().toLocaleDateString(), grade: climbGrade, notes: climbNotes };
    const updated = [...climbLog, entry];
    setClimbLog(updated);
    saveGlobal(hollowBodyLog, updated);
    setClimbGrade("");
    setClimbNotes("");
  };

  const bestHollow = hollowBodyLog.length > 0 ? Math.max(...hollowBodyLog.map((h) => h.seconds)) : 0;
  const currentMilestone = HOLLOW_BODY_MILESTONES.filter((m) => m <= bestHollow).pop() || 0;
  const nextMilestone = HOLLOW_BODY_MILESTONES.find((m) => m > bestHollow) || 60;

  const workout = WORKOUTS[SCHEDULE[selectedDay].type];
  const dayInfo = SCHEDULE[selectedDay];

  const weekDates = DAYS.map((_, i) => {
    const base = new Date(weekKey);
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d.getDate();
  });

  const todayName = getTodayName();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1117",
      color: "#e8e4dc",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      padding: "0 0 80px 0",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #1a1f2e 0%, #0f1117 100%)",
        borderBottom: "1px solid #2a2f3e",
        padding: "28px 20px 20px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 13, letterSpacing: 6, color: "#7bc67a", fontFamily: "monospace", marginBottom: 8, textTransform: "uppercase" }}>
          Recovery Tracker
        </div>
        <h1 style={{
          fontSize: 28,
          fontWeight: 400,
          margin: 0,
          color: "#e8e4dc",
          letterSpacing: 1,
        }}>
          Climb Strong Again
        </h1>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 8 }}>
          {["week", "progress", "log"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: activeTab === tab ? "#e86b3a" : "transparent",
              border: `1px solid ${activeTab === tab ? "#e86b3a" : "#3a3f4e"}`,
              color: activeTab === tab ? "#fff" : "#888",
              padding: "6px 16px",
              borderRadius: 20,
              cursor: "pointer",
              fontSize: 12,
              letterSpacing: 2,
              textTransform: "uppercase",
              fontFamily: "monospace",
              transition: "all 0.2s",
            }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* WEEK TAB */}
      {activeTab === "week" && (
        <div style={{ padding: "20px 16px" }}>
          {/* Week nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={navBtnStyle}>← Prev</button>
            <span style={{ fontSize: 13, color: "#888", letterSpacing: 2, fontFamily: "monospace" }}>
              {weekOffset === 0 ? "THIS WEEK" : weekOffset === -1 ? "LAST WEEK" : `WEEK ${weekOffset > 0 ? "+" : ""}${weekOffset}`}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} style={navBtnStyle}>Next →</button>
          </div>

          {/* Day pills */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 20 }}>
            {DAYS.map((day, i) => {
              const prog = getDayProgress(day);
              const isToday = day === todayName && weekOffset === 0;
              const isSelected = day === selectedDay;
              return (
                <button key={day} onClick={() => setSelectedDay(day)} style={{
                  flex: "0 0 auto",
                  background: isSelected ? SCHEDULE[day].color : "#1a1f2e",
                  border: `2px solid ${isSelected ? SCHEDULE[day].color : isToday ? "#e8e4dc44" : "#2a2f3e"}`,
                  borderRadius: 12,
                  padding: "10px 10px 8px",
                  cursor: "pointer",
                  textAlign: "center",
                  minWidth: 52,
                  transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: 10, color: isSelected ? "#fff" : "#666", letterSpacing: 1, fontFamily: "monospace" }}>
                    {day.slice(0, 3).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 16, color: isSelected ? "#fff" : "#ccc", margin: "4px 0 2px" }}>
                    {weekDates[i]}
                  </div>
                  {prog.done > 0 && (
                    <div style={{
                      width: "100%", height: 3, background: "#0f1117", borderRadius: 2, overflow: "hidden"
                    }}>
                      <div style={{ width: `${prog.pct}%`, height: "100%", background: isSelected ? "#fff" : SCHEDULE[day].color, transition: "width 0.4s" }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day card */}
          <div style={{
            background: "#1a1f2e",
            borderRadius: 16,
            border: `1px solid ${dayInfo.color}44`,
            overflow: "hidden",
            marginBottom: 16,
          }}>
            <div style={{
              background: `linear-gradient(90deg, ${dayInfo.color}22, transparent)`,
              padding: "16px 20px",
              borderBottom: `1px solid ${dayInfo.color}33`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, color: dayInfo.color, fontFamily: "monospace", textTransform: "uppercase" }}>
                  {selectedDay}
                </div>
                <div style={{ fontSize: 18, marginTop: 2 }}>{workout.icon} {workout.title}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{dayInfo.label}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: "bold", color: dayInfo.color }}>
                  {getDayProgress(selectedDay).pct}%
                </div>
                <div style={{ fontSize: 11, color: "#666", fontFamily: "monospace" }}>COMPLETE</div>
              </div>
            </div>

            <div style={{ padding: "12px 0" }}>
              {workout.exercises.map((ex) => (
                <div key={ex.name} style={{
                  padding: "10px 20px",
                  borderBottom: "1px solid #2a2f3e22",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, color: "#e8e4dc" }}>{ex.name}</div>
                      <div style={{ fontSize: 11, color: "#666", fontFamily: "monospace", marginTop: 2 }}>
                        {ex.sets} × {ex.reps}
                        {ex.note && <span style={{ color: "#555", marginLeft: 8 }}>— {ex.note}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {Array.from({ length: ex.sets }).map((_, i) => {
                      const done = isSetDone(selectedDay, ex.name, i);
                      return (
                        <button key={i} onClick={() => toggleSet(selectedDay, ex.name, i)} style={{
                          width: 36, height: 36,
                          borderRadius: 8,
                          border: `2px solid ${done ? dayInfo.color : "#3a3f4e"}`,
                          background: done ? dayInfo.color : "transparent",
                          color: done ? "#fff" : "#555",
                          cursor: "pointer",
                          fontSize: 14,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s",
                          flexShrink: 0,
                        }}>
                          {done ? "✓" : i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Knee check-in */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#4a9eca", fontFamily: "monospace", marginBottom: 10 }}>KNEE CHECK-IN</div>
            {kneeNotes[selectedDay] && (
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10, padding: "8px 12px", background: "#0f1117", borderRadius: 8, fontStyle: "italic" }}>
                {kneeNotes[selectedDay]}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={kneeInput}
                onChange={e => setKneeInput(e.target.value)}
                placeholder="Any swelling or achiness today?"
                style={inputStyle}
              />
              <button onClick={logKnee} style={pillBtnStyle("#4a9eca")}>Log</button>
            </div>
          </div>
        </div>
      )}

      {/* PROGRESS TAB */}
      {activeTab === "progress" && (
        <div style={{ padding: "20px 16px" }}>
          {/* Hollow Body Goal */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#7bc67a", fontFamily: "monospace", marginBottom: 4 }}>NORTH STAR METRIC</div>
            <div style={{ fontSize: 20, marginBottom: 4 }}>Hollow Body Hold</div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Goal: 60 seconds. Climb-ready.</div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {HOLLOW_BODY_MILESTONES.map((m) => (
                <div key={m} style={{
                  flex: 1, textAlign: "center",
                  padding: "10px 4px",
                  borderRadius: 10,
                  background: bestHollow >= m ? "#7bc67a22" : "#1a1f2e",
                  border: `1px solid ${bestHollow >= m ? "#7bc67a" : "#2a2f3e"}`,
                }}>
                  <div style={{ fontSize: 18, color: bestHollow >= m ? "#7bc67a" : "#444" }}>
                    {bestHollow >= m ? "✓" : "○"}
                  </div>
                  <div style={{ fontSize: 12, color: bestHollow >= m ? "#7bc67a" : "#555", fontFamily: "monospace" }}>
                    {m}s
                  </div>
                </div>
              ))}
            </div>

            {bestHollow > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 4 }}>
                  <span>Best: {bestHollow}s</span><span>Goal: 60s</span>
                </div>
                <div style={{ height: 8, background: "#0f1117", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min((bestHollow / 60) * 100, 100)}%`, height: "100%", background: "linear-gradient(90deg, #4a9eca, #7bc67a)", borderRadius: 4, transition: "width 0.6s" }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={hollowBodyTime}
                onChange={e => setHollowBodyTime(e.target.value)}
                placeholder="Seconds held today"
                type="number"
                style={inputStyle}
              />
              <button onClick={logHollowBody} style={pillBtnStyle("#7bc67a")}>Log</button>
            </div>

            {hollowBodyLog.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {hollowBodyLog.slice(-5).reverse().map((entry, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #2a2f3e22", fontSize: 13 }}>
                    <span style={{ color: "#888", fontFamily: "monospace" }}>{entry.date}</span>
                    <span style={{ color: "#7bc67a", fontFamily: "monospace" }}>{entry.seconds}s</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly completion */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#e86b3a", fontFamily: "monospace", marginBottom: 12 }}>WEEKLY COMPLETION</div>
            {DAYS.map((day) => {
              const prog = getDayProgress(day);
              return (
                <div key={day} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 3 }}>
                    <span>{day}</span>
                    <span style={{ fontFamily: "monospace" }}>{prog.done}/{prog.total} sets</span>
                  </div>
                  <div style={{ height: 6, background: "#0f1117", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${prog.pct}%`, height: "100%", background: SCHEDULE[day].color, borderRadius: 3, transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Climb log */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#9b8ec4", fontFamily: "monospace", marginBottom: 10 }}>LOG A CLIMB</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={climbGrade} onChange={e => setClimbGrade(e.target.value)} placeholder="Grade (e.g. V3, 5.11a)" style={{ ...inputStyle, flex: "0 0 140px" }} />
              <button onClick={logClimb} style={pillBtnStyle("#9b8ec4")}>Log</button>
            </div>
            <input value={climbNotes} onChange={e => setClimbNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...inputStyle, marginBottom: 12 }} />

            {climbLog.length > 0 && (
              <div>
                {climbLog.slice(-8).reverse().map((entry, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #2a2f3e22" }}>
                    <div>
                      <span style={{ fontSize: 15, color: "#9b8ec4", fontFamily: "monospace", marginRight: 10 }}>{entry.grade}</span>
                      {entry.notes && <span style={{ fontSize: 12, color: "#666" }}>{entry.notes}</span>}
                    </div>
                    <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>{entry.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOG TAB */}
      {activeTab === "log" && (
        <div style={{ padding: "20px 16px" }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#e8e4dc", fontFamily: "monospace", marginBottom: 16 }}>CLIMBING PROGRESSION</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#7bc67a", marginBottom: 6 }}>Month 1 — Rebuild Confidence</div>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>Stay on routes well within ability. Focus on quiet feet, hip position, and core tension. Avoid dynamic moves or big feet cuts.</div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#4a9eca", marginBottom: 6 }}>Month 2 — Reintroduce Load</div>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>Project 1–2 grades harder. Practice flag moves and drop knees. Add campus rungs or lock-off holds.</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#e86b3a", marginBottom: 6 }}>Month 3 — Perform</div>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>Return to previous project grades. Incorporate tension board or system board work if available.</div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#e8e4dc", fontFamily: "monospace", marginBottom: 16 }}>RECOVERY NOTES</div>
            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.8 }}>
              <div style={{ marginBottom: 8 }}>🥩 <span style={{ color: "#e8e4dc" }}>Protein:</span> 0.7–1g per lb of bodyweight</div>
              <div style={{ marginBottom: 8 }}>😴 <span style={{ color: "#e8e4dc" }}>Sleep:</span> 8 hrs — tissue remodeling still active 18–24 months post-surgery</div>
              <div style={{ marginBottom: 8 }}>💊 <span style={{ color: "#e8e4dc" }}>Collagen:</span> 10–15g + Vitamin C, 30–60 min before training</div>
              <div>🦵 <span style={{ color: "#e8e4dc" }}>Knee check:</span> Minor achiness OK. Swelling = back off.</div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#e8e4dc", fontFamily: "monospace", marginBottom: 16 }}>RUNNING PROGRESSION</div>
            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7 }}>
              <div style={{ marginBottom: 6 }}><span style={{ color: "#4a9eca" }}>Tue/Thu:</span> 20–30 min easy, conversational pace</div>
              <div style={{ marginBottom: 6 }}><span style={{ color: "#4a9eca" }}>Saturday:</span> Long run, build 30 → 60 min over 8 weeks</div>
              <div><span style={{ color: "#4a9eca" }}>Rule:</span> Add 5 min/week, back off every 4th week</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  background: "#1a1f2e",
  borderRadius: 16,
  border: "1px solid #2a2f3e",
  padding: "20px",
  marginBottom: 16,
};

const inputStyle = {
  flex: 1,
  background: "#0f1117",
  border: "1px solid #3a3f4e",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#e8e4dc",
  fontSize: 13,
  fontFamily: "Georgia, serif",
  outline: "none",
  width: "100%",
};

const navBtnStyle = {
  background: "transparent",
  border: "1px solid #2a2f3e",
  color: "#888",
  padding: "6px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "monospace",
};

const pillBtnStyle = (color) => ({
  background: color,
  border: "none",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "Georgia, serif",
  flexShrink: 0,
  whiteSpace: "nowrap",
});
