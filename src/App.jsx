import React, { useState, useEffect, useRef, useMemo } from "react";

/* ============================================================
   NOVATRACK  -  A school project star finder
   Built simple, for Class 10. The maths is real, the words are easy.
   Phone points at sky  ->  maths finds the direction  ->  app names the star
   ============================================================ */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap360 = (d) => ((d % 360) + 360) % 360;

// Turn the date and your longitude into "star clock time" (sidereal time, in degrees).
function starClock(date, lonEast) {
  const JD = date.getTime() / 86400000 + 2440587.5;
  const D = JD - 2451545.0;
  const T = D / 36525.0;
  const GMST = 280.46061837 + 360.98564736629 * D + 0.000387933 * T * T - (T * T * T) / 38710000.0;
  return wrap360(GMST + lonEast);
}

// MATHS STEP: turn "how high + which way" into the sky's fixed address (RA, Dec).
function findSkyAddress(altDeg, azDeg, latDeg, lstDeg) {
  const a = altDeg * D2R, A = azDeg * D2R, phi = latDeg * D2R;
  const sinDec = Math.sin(a) * Math.sin(phi) + Math.cos(a) * Math.cos(phi) * Math.cos(A);
  const dec = Math.asin(clamp(sinDec, -1, 1));
  const sinH = -Math.sin(A) * Math.cos(a) / Math.cos(dec);
  const cosH = (Math.sin(a) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  const H = Math.atan2(sinH, cosH) * R2D;
  return { ra: wrap360(lstDeg - H), dec: dec * R2D };
}

// Reverse: where in the sky is a star right now (so we can draw it)?
function whereInSky(raDeg, decDeg, latDeg, lstDeg) {
  const ha = wrap360(lstDeg - raDeg) * D2R, dec = decDeg * D2R, lat = latDeg * D2R;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  let cosA = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat));
  let A = Math.acos(clamp(cosA, -1, 1));
  if (Math.sin(ha) > 0) A = 2 * Math.PI - A;
  return { alt: alt * R2D, az: A * R2D };
}

// How far apart are two points in the sky (in degrees)?
function gap(ra1, dec1, ra2, dec2) {
  const d1 = dec1 * D2R, d2 = dec2 * D2R, dRa = (ra1 - ra2) * D2R;
  const c = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(dRa);
  return Math.acos(clamp(c, -1, 1)) * R2D;
}

const raText = (deg) => {
  const h = deg / 15, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return `${hh}h ${String(mm).padStart(2, "0")}m`;
};
const decText = (deg) => {
  const s = deg < 0 ? "-" : "+", a = Math.abs(deg);
  const dd = Math.floor(a), mm = Math.floor((a - dd) * 60);
  return `${s}${dd}° ${String(mm).padStart(2, "0")}'`;
};

/* Bright stars and planets you can spot from India. RA stored in degrees. */
const STARS = [
  { id: "sirius",     name: "Sirius",     type: "star",   ra: 101.29, dec: -16.72, group: "Canis Major", fun: "The brightest star in our night sky." },
  { id: "arcturus",   name: "Arcturus",   type: "star",   ra: 213.92, dec: 19.18,  group: "Bootes",       fun: "An orange giant star." },
  { id: "vega",       name: "Vega",       type: "star",   ra: 279.23, dec: 38.78,  group: "Lyra",         fun: "Part of the Summer Triangle." },
  { id: "capella",    name: "Capella",    type: "star",   ra: 79.17,  dec: 45.99,  group: "Auriga",       fun: "Looks like one star but is actually four." },
  { id: "rigel",      name: "Rigel",      type: "star",   ra: 78.63,  dec: -8.20,  group: "Orion",        fun: "The bright blue foot of Orion." },
  { id: "betelgeuse", name: "Betelgeuse", type: "star",   ra: 88.79,  dec: 7.41,   group: "Orion",        fun: "A huge red star, the shoulder of Orion." },
  { id: "aldebaran",  name: "Aldebaran",  type: "star",   ra: 68.98,  dec: 16.51,  group: "Taurus",       fun: "The red eye of the bull." },
  { id: "spica",      name: "Spica",      type: "star",   ra: 201.30, dec: -11.16, group: "Virgo",        fun: "A hot blue-white star." },
  { id: "antares",    name: "Antares",    type: "star",   ra: 247.35, dec: -26.43, group: "Scorpius",     fun: "A red supergiant, heart of the scorpion." },
  { id: "deneb",      name: "Deneb",      type: "star",   ra: 310.36, dec: 45.28,  group: "Cygnus",       fun: "One of the most distant bright stars." },
  { id: "polaris",    name: "Polaris",    type: "star",   ra: 37.95,  dec: 89.26,  group: "Ursa Minor",   fun: "The Pole Star. It shows you north." },
  { id: "jupiter",    name: "Jupiter",    type: "planet", ra: 150.0,  dec: 15.5,   group: "Planet",       fun: "The biggest planet in our Solar System." },
  { id: "saturn",     name: "Saturn",     type: "planet", ra: 330.0,  dec: -12.0,  group: "Planet",       fun: "The planet with beautiful rings." },
  { id: "mars",       name: "Mars",       type: "planet", ra: 60.0,   dec: 22.0,   group: "Planet",       fun: "The red planet." },
];

/* ---- Friendly look ---- */
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Quicksand:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');`;
const C = {
  bg: "#0b1026", card: "#141a38", card2: "#1b2247", line: "rgba(255,255,255,0.12)",
  gold: "#ffcf6b", blue: "#7fd4ff", text: "#eef2ff", soft: "#9aa4cf",
  pink: "#ff9bb3", green: "#8be0a4",
};
const head = "'Fraunces', serif";
const ui = "'Quicksand', sans-serif";
const num = "'IBM Plex Mono', monospace";

function Card({ title, children, style }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, ...style }}>
      {title && (
        <div style={{ padding: "13px 18px", borderBottom: `1px solid ${C.line}`, font: `600 14px ${ui}`, color: C.gold, letterSpacing: "0.02em" }}>
          {title}
        </div>
      )}
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

function Big({ label, value, unit, color = C.blue }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ font: `600 12px ${ui}`, color: C.soft }}>{label}</div>
      <div style={{ font: `500 22px ${num}`, color }}>
        {value}<span style={{ fontSize: 12, color: C.soft, marginLeft: 5 }}>{unit}</span>
      </div>
    </div>
  );
}

function Bar({ label, value, min, max, color }) {
  const pct = clamp(((value - min) / (max - min)) * 100, 0, 100);
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", font: `600 12px ${ui}`, color: C.soft, marginBottom: 4 }}>
        <span>{label}</span><span style={{ color: C.text, fontFamily: num }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ height: 9, background: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 6, transition: "width .15s" }} />
      </div>
    </div>
  );
}

function Slide({ label, value, set, min, max, step, unit }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ font: `600 13px ${ui}`, color: C.text }}>{label}</span>
        <span style={{ font: `500 15px ${num}`, color: C.gold }}>{value.toFixed(0)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: C.gold, height: 6 }} />
    </div>
  );
}

/* ============================================================
   TAB 1  -  Point and Find
   ============================================================ */
function FindStar({ lat, lst, lookAlt, setLookAlt, lookAz, setLookAz, wobble }) {
  const canvasRef = useRef(null);

  const addr = useMemo(() => findSkyAddress(lookAlt, lookAz, lat, lst), [lookAlt, lookAz, lat, lst]);

  const match = useMemo(() => {
    let best = null, bestGap = 999;
    for (const s of STARS) {
      const g = gap(addr.ra, addr.dec, s.ra, s.dec);
      if (g < bestGap) { bestGap = g; best = s; }
    }
    return { found: bestGap <= 8 ? best : null, gap: bestGap, nearest: best };
  }, [addr]);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    let raf;
    const draw = () => {
      const ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
      const FA = 80, FH = 56;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0a1030"); g.addColorStop(1, "#160e2a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) {
        const sx = (Math.sin(i * 91.7) * 0.5 + 0.5) * W;
        const sy = (Math.cos(i * 53.3) * 0.5 + 0.5) * H;
        ctx.fillStyle = `rgba(220,230,255,${0.25 + 0.25 * Math.sin(Date.now() / 600 + i)})`;
        ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, 7); ctx.fill();
      }
      for (const s of STARS) {
        const hz = whereInSky(s.ra, s.dec, lat, lst);
        if (hz.alt < -5) continue;
        let dAz = hz.az - lookAz; if (dAz > 180) dAz -= 360; if (dAz < -180) dAz += 360;
        const dAlt = hz.alt - lookAlt;
        if (Math.abs(dAz) > FA / 2 || Math.abs(dAlt) > FH / 2) continue;
        const x = W / 2 + (dAz / FA) * W, y = H / 2 - (dAlt / FH) * H;
        const isHit = match.found && match.found.id === s.id;
        const col = s.type === "planet" ? C.gold : "#dbe6ff";
        ctx.shadowBlur = isHit ? 20 : 9; ctx.shadowColor = isHit ? C.blue : col;
        ctx.fillStyle = isHit ? C.blue : col;
        ctx.beginPath(); ctx.arc(x, y, isHit ? 7 : 4.5, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = `600 12px ${ui}`; ctx.fillStyle = isHit ? C.blue : "rgba(210,220,255,0.7)";
        ctx.fillText(s.name, x + 9, y + 4);
      }
      ctx.strokeStyle = C.gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 24, 0, 7); ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [lookAlt, lookAz, lat, lst, match.found]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }} className="nt-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card title="The Sky View (move the sliders to look around)">
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.line}` }}>
            <canvas ref={canvasRef} width={720} height={400} style={{ width: "100%", display: "block" }} />
            <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, textAlign: "center",
              font: `700 16px ${ui}`, color: match.found ? C.blue : C.soft,
              textShadow: match.found ? `0 0 12px ${C.blue}` : "none" }}>
              {match.found ? `You are looking at ${match.found.name}!` : `Keep moving... nearest is ${match.nearest.name}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 16 }} className="nt-sliders">
            <div style={{ flex: 1 }}>
              <Slide label="How high you point" value={lookAlt} set={setLookAlt} min={0} max={90} step={1} unit="°" />
            </div>
            <div style={{ flex: 1 }}>
              <Slide label="Which way you turn" value={lookAz} set={setLookAz} min={0} max={359} step={1} unit="°" />
            </div>
          </div>
        </Card>

        <Card title="How the app figures it out (3 easy steps)">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }} className="nt-steps">
            <div style={{ background: C.card2, borderRadius: 12, padding: 14 }}>
              <div style={{ font: `700 13px ${ui}`, color: C.gold, marginBottom: 8 }}>1. Phone senses</div>
              <p style={{ font: `400 13px ${ui}`, color: C.soft, lineHeight: 1.5, margin: "0 0 10px" }}>
                Tiny sensors inside the phone measure how high you point it and which way you face.
              </p>
              <Big label="Pointing up" value={lookAlt.toFixed(0)} unit="°" color={C.gold} />
              <Big label="Facing" value={lookAz.toFixed(0)} unit="°" color={C.gold} />
            </div>
            <div style={{ background: C.card2, borderRadius: 12, padding: 14 }}>
              <div style={{ font: `700 13px ${ui}`, color: C.blue, marginBottom: 8 }}>2. Maths converts</div>
              <p style={{ font: `400 13px ${ui}`, color: C.soft, lineHeight: 1.5, margin: "0 0 10px" }}>
                Using your location and the time, trigonometry turns that direction into the sky's own address.
              </p>
              <div style={{ font: `500 12px ${num}`, color: C.text, lineHeight: 1.6, background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 8 }}>
                sin(Dec) = sin(h){'·'}sin(lat)<br />+ cos(h){'·'}cos(lat){'·'}cos(dir)
              </div>
            </div>
            <div style={{ background: C.card2, borderRadius: 12, padding: 14 }}>
              <div style={{ font: `700 13px ${ui}`, color: C.green, marginBottom: 8 }}>3. App finds star</div>
              <p style={{ font: `400 13px ${ui}`, color: C.soft, lineHeight: 1.5, margin: "0 0 10px" }}>
                It checks this address against its star list and names the closest one.
              </p>
              <Big label="Sky address RA" value={raText(addr.ra)} unit="" color={C.green} />
              <Big label="Sky address Dec" value={decText(addr.dec)} unit="" color={C.green} />
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card title="The star you found">
          {match.found ? (
            <div>
              <div style={{ font: `400 30px ${head}`, color: C.text }}>{match.found.name}</div>
              <div style={{ font: `600 12px ${ui}`, color: C.gold, margin: "4px 0 12px" }}>
                {match.found.type === "planet" ? "Planet" : "Star"} in {match.found.group}
              </div>
              <p style={{ font: `400 14px ${ui}`, color: C.soft, lineHeight: 1.6, marginTop: 0 }}>{match.found.fun}</p>
              <Big label="Its address (RA)" value={raText(match.found.ra)} unit="" />
              <Big label="Its address (Dec)" value={decText(match.found.dec)} unit="" />
            </div>
          ) : (
            <p style={{ font: `400 14px ${ui}`, color: C.soft, lineHeight: 1.6 }}>
              No star in the circle yet. Slide the two controls until a star lights up blue inside the gold ring.
            </p>
          )}
        </Card>

        <Card title="Checking the compass">
          <Bar label="Magnetic strength" value={wobble ? 61 : 49} min={40} max={70} color={wobble ? C.pink : C.blue} />
          <p style={{ font: `400 13px ${ui}`, color: C.soft, lineHeight: 1.6, marginTop: 6 }}>
            {wobble
              ? "Something metal is nearby, so the compass reading is off. Real apps fix this with a quick calibration (the figure-8 wave you do with your phone)."
              : "Compass reading looks healthy. The app can trust the direction."}
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 2  -  Why GPS clocks are special (relativity, made simple)
   ============================================================ */
function ClockHub() {
  const [altKm, setAltKm] = useState(20200);
  const c = 299792458, GM = 3.986004418e14, R = 6.371e6, SEC = 86400;
  const r = R + altKm * 1000;
  const v = Math.sqrt(GM / r);
  const slowMs = (-(v * v) / (2 * c * c)) * SEC * 1e6;
  const fastMs = ((GM / (c * c)) * (1 / R - 1 / r)) * SEC * 1e6;
  const net = slowMs + fastMs;
  const errKm = Math.abs(net * 1e-6) * c / 1000;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="nt-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card title="Why does a star app need GPS?">
          <p style={{ font: `400 15px ${ui}`, color: C.text, lineHeight: 1.7, marginTop: 0 }}>
            The maths in Step 2 needs to know exactly where you are standing and the exact time. GPS gives both. But GPS only works because the clocks on its satellites are incredibly accurate. And those clocks have a surprising problem: because of Einstein's ideas, they do not tick at the same speed as clocks on Earth.
          </p>
        </Card>
        <Card title="Try it yourself">
          <Slide label="How high the satellite orbits" value={altKm} set={setAltKm} min={400} max={36000} step={100} unit=" km" />
          <Big label="Real GPS satellites orbit at" value="20,200" unit="km" color={C.gold} />
          <p style={{ font: `400 13px ${ui}`, color: C.soft, lineHeight: 1.6 }}>
            Slide it higher or lower and watch the two clock effects below change.
          </p>
        </Card>
      </div>

      <Card title="What happens to the satellite clock each day">
        <div style={{ background: C.card2, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ font: `700 13px ${ui}`, color: C.pink }}>Effect 1: it moves very fast</div>
          <p style={{ font: `400 13px ${ui}`, color: C.soft, lineHeight: 1.5, margin: "5px 0 8px" }}>
            Fast movement makes a clock tick a little slower.
          </p>
          <div style={{ font: `500 20px ${num}`, color: C.pink }}>{slowMs.toFixed(1)} microseconds slower</div>
        </div>
        <div style={{ background: C.card2, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ font: `700 13px ${ui}`, color: C.blue }}>Effect 2: gravity is weaker up high</div>
          <p style={{ font: `400 13px ${ui}`, color: C.soft, lineHeight: 1.5, margin: "5px 0 8px" }}>
            Weaker gravity makes a clock tick a little faster. This effect is the bigger one.
          </p>
          <div style={{ font: `500 20px ${num}`, color: C.blue }}>+{fastMs.toFixed(1)} microseconds faster</div>
        </div>
        <div style={{ background: "rgba(255,207,107,0.12)", border: `1px solid ${C.gold}`, borderRadius: 12, padding: 14 }}>
          <div style={{ font: `700 13px ${ui}`, color: C.gold }}>Adding them up</div>
          <div style={{ font: `500 26px ${num}`, color: C.gold, margin: "4px 0" }}>+{net.toFixed(1)} microseconds / day</div>
          <p style={{ font: `400 13px ${ui}`, color: C.soft, lineHeight: 1.6, margin: 0 }}>
            If engineers did not correct this, your position (and every star on the map) would be wrong by about <b style={{ color: C.text }}>{errKm.toFixed(0)} km</b> after just one day. A microsecond is one millionth of a second, yet it matters this much because light travels so fast.
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   TAB 3  -  Quiz
   ============================================================ */
const QUIZ = [
  { q: "What does Step 1 (the phone sensing) measure?", a: ["The colour of the sky", "How high and which way you point the phone", "Your phone battery"], correct: 1,
    why: "Tiny sensors measure the tilt (how high) and the compass direction (which way)." },
  { q: "Step 2 uses maths to find the star's position. Which subject is this?", a: ["Trigonometry", "Algebra only", "Chemistry"], correct: 0,
    why: "It uses trigonometry (sin and cos) on a sphere, since the sky is shaped like a dome around us." },
  { q: "A satellite clock high up in orbit, compared to a clock on Earth, mostly...", a: ["Ticks slower", "Ticks faster", "Stops completely"], correct: 1,
    why: "Weaker gravity up high speeds the clock up, and this effect is bigger than the slowing from its speed." },
  { q: "Why does the app need to know your location and time?", a: ["To show ads", "To do the maths that finds the right star", "It does not need them"], correct: 1,
    why: "The same star sits in a different spot in your sky depending on where you are and what time it is." },
  { q: "Which of these is the Pole Star that points north?", a: ["Sirius", "Polaris", "Mars"], correct: 1,
    why: "Polaris sits almost exactly above the North Pole, so it always shows north." },
];

function Quiz() {
  const [i, setI] = useState(0), [pick, setPick] = useState(null), [score, setScore] = useState(0), [done, setDone] = useState(false);
  const item = QUIZ[i];
  const choose = (idx) => { if (pick !== null) return; setPick(idx); if (idx === item.correct) setScore(score + 1); };
  const next = () => { if (i + 1 >= QUIZ.length) setDone(true); else { setI(i + 1); setPick(null); } };
  const again = () => { setI(0); setPick(null); setScore(0); setDone(false); };

  if (done) {
    return (
      <Card title="Your score">
        <div style={{ textAlign: "center", padding: "26px 0" }}>
          <div style={{ font: `400 60px ${head}`, color: C.gold }}>{score}/{QUIZ.length}</div>
          <p style={{ font: `400 15px ${ui}`, color: C.soft, maxWidth: 360, margin: "12px auto 22px", lineHeight: 1.6 }}>
            {score >= 4 ? "Brilliant! You really understand how the app works." : score >= 2 ? "Good try! Read the other two tabs once more and play again." : "No worries, explore the first two tabs and come back to try again."}
          </p>
          <button onClick={again} style={{ background: C.gold, color: "#1a1205", border: "none", borderRadius: 10, padding: "12px 28px", font: `700 14px ${ui}`, cursor: "pointer" }}>Play again</button>
        </div>
      </Card>
    );
  }
  return (
    <Card title={`Quiz  -  question ${i + 1} of ${QUIZ.length}`}>
      <div style={{ height: 7, background: "rgba(255,255,255,0.08)", borderRadius: 5, marginBottom: 18, overflow: "hidden" }}>
        <div style={{ width: `${(i / QUIZ.length) * 100}%`, height: "100%", background: C.blue, transition: "width .3s" }} />
      </div>
      <div style={{ font: `400 20px ${head}`, color: C.text, lineHeight: 1.4, marginBottom: 16 }}>{item.q}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {item.a.map((opt, idx) => {
          const show = pick !== null, right = idx === item.correct;
          const bg = show && right ? "rgba(139,224,164,0.18)" : show && idx === pick ? "rgba(255,155,179,0.18)" : C.card2;
          const bd = show && right ? C.green : show && idx === pick ? C.pink : C.line;
          return (
            <button key={idx} onClick={() => choose(idx)} disabled={show}
              style={{ textAlign: "left", background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: "13px 16px", font: `500 15px ${ui}`, color: C.text, cursor: show ? "default" : "pointer" }}>
              {opt}
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: C.card2, borderLeft: `3px solid ${pick === item.correct ? C.green : C.gold}`, borderRadius: 8, padding: 13, font: `400 14px ${ui}`, color: C.soft, lineHeight: 1.6 }}>
            {item.why}
          </div>
          <button onClick={next} style={{ marginTop: 14, background: C.gold, color: "#1a1205", border: "none", borderRadius: 10, padding: "12px 26px", font: `700 14px ${ui}`, cursor: "pointer" }}>
            {i + 1 >= QUIZ.length ? "See my score" : "Next question"}
          </button>
        </div>
      )}
    </Card>
  );
}

/* ============================================================
   APP
   ============================================================ */
const TABS = [
  { id: "find", label: "Point & Find" },
  { id: "clock", label: "GPS & Clocks" },
  { id: "quiz", label: "Quiz" },
];

export default function NovaTrack() {
  const [tab, setTab] = useState("find");
  const [lat] = useState(28.61);   // New Delhi
  const [lon] = useState(77.21);
  const [lookAlt, setLookAlt] = useState(45);
  const [lookAz, setLookAz] = useState(120);
  const [now, setNow] = useState(new Date());
  const [wobble, setWobble] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const lst = useMemo(() => starClock(now, lon), [now, lon]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: ui, padding: "20px 22px",
      backgroundImage: "radial-gradient(circle at 20% 10%, rgba(127,212,255,0.08), transparent 40%), radial-gradient(circle at 85% 90%, rgba(255,207,107,0.08), transparent 40%)" }}>
      <style>{FONTS}{`
        * { box-sizing: border-box; }
        input[type=range]{ -webkit-appearance:none; appearance:none; background:rgba(255,255,255,0.12); border-radius:6px; }
        @media (max-width: 800px){ .nt-grid{ grid-template-columns:1fr !important; } .nt-steps{ grid-template-columns:1fr !important; } .nt-sliders{ flex-direction:column !important; } }
      `}</style>

      <header style={{ textAlign: "center", marginBottom: 22 }}>
        <h1 style={{ font: `400 42px ${head}`, margin: 0, color: C.text }}>
          Nova<span style={{ color: C.gold }}>Track</span> <span style={{ fontSize: 22 }}>{'✨'}</span>
        </h1>
        <p style={{ font: `500 14px ${ui}`, color: C.soft, margin: "6px 0 0" }}>
          A star-finder that shows you how a phone knows which star you are pointing at. Made for a Class 10 science project.
        </p>
        <p style={{ font: `500 12px ${num}`, color: C.blue, margin: "8px 0 0" }}>
          Location set to New Delhi {'·'} Star clock time {raText(lst)}
        </p>
      </header>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 22, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: tab === t.id ? C.gold : "transparent", color: tab === t.id ? "#1a1205" : C.soft, border: `1px solid ${tab === t.id ? C.gold : C.line}`, borderRadius: 10, padding: "10px 20px", font: `700 13px ${ui}`, cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
        {tab === "find" && (
          <button onClick={() => setWobble(!wobble)}
            style={{ background: wobble ? C.pink : "transparent", color: wobble ? "#2a0a12" : C.soft, border: `1px solid ${wobble ? C.pink : C.line}`, borderRadius: 10, padding: "10px 16px", font: `700 12px ${ui}`, cursor: "pointer" }}>
            Compass problem: {wobble ? "ON" : "OFF"}
          </button>
        )}
      </div>

      {tab === "find" && <FindStar lat={lat} lst={lst} lookAlt={lookAlt} setLookAlt={setLookAlt} lookAz={lookAz} setLookAz={setLookAz} wobble={wobble} />}
      {tab === "clock" && <ClockHub />}
      {tab === "quiz" && <div style={{ maxWidth: 620, margin: "0 auto" }}><Quiz /></div>}

      <footer style={{ marginTop: 26, textAlign: "center", font: `500 12px ${ui}`, color: C.soft }}>
        Tip for your project: the maths here is the real thing astronomy apps use. The phone sensors are shown as sliders so you can play with them on a computer.
      </footer>
    </div>
  );
}
