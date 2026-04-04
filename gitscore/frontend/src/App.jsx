import { useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const GRADE_CONFIG = {
  S: { color: "#c084fc", label: "Legend" },
  A: { color: "#34d399", label: "Elite" },
  B: { color: "#60a5fa", label: "Rising" },
  C: { color: "#fbbf24", label: "Average" },
  D: { color: "#f87171", label: "Needs Work" },
};

const LANG_COLORS = ["#c084fc","#60a5fa","#34d399","#f59e0b","#f87171","#a78bfa","#38bdf8","#4ade80"];

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card" style={{ "--accent": accent }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function InsightBadge({ type }) {
  const map = { positive: ["✦", "#34d399"], warning: ["▲", "#fbbf24"], neutral: ["◆", "#60a5fa"] };
  const [icon, color] = map[type] || map.neutral;
  return <span style={{ color, marginRight: 8, fontSize: 11 }}>{icon}</span>;
}

function RepoCard({ repo }) {
  return (
    <a href={repo.url} target="_blank" rel="noopener noreferrer" className="post-card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontWeight: 700, color: "#c084fc", fontSize: 15 }}>{repo.name}</span>
        {repo.language && (
          <span style={{ fontSize: 11, background: "rgba(192,132,252,0.1)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 6, padding: "2px 8px", color: "#c084fc", fontFamily: "JetBrains Mono" }}>
            {repo.language}
          </span>
        )}
      </div>
      {repo.description && <div className="post-text">{repo.description}</div>}
      <div className="post-meta">
        <span>★ {fmtNum(repo.stars)}</span>
        <span>⑂ {fmtNum(repo.forks)}</span>
        <span className="post-date">{timeAgo(repo.updated_at)}</span>
      </div>
    </a>
  );
}

function CustomTooltip({ active, payload }) {
  if (active && payload?.length) {
    return (
      <div className="chart-tooltip">
        <div>{payload[0].payload.month}</div>
        <div style={{ color: "#c084fc" }}>{payload[0].value} pushes</div>
      </div>
    );
  }
  return null;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const username = query.trim().replace(/^@/, "");
      const res = await fetch(`${API_BASE}/analyze/${username}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to analyze");
      }
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const grade = data ? GRADE_CONFIG[data.grade] || GRADE_CONFIG.D : null;

  const radarData = data ? [
    { axis: "Reach", val: Math.min(Math.log10(Math.max(data.followers, 1)) / Math.log10(100000) * 100, 100) },
    { axis: "Stars", val: Math.min(Math.log10(Math.max(data.total_stars, 1)) / Math.log10(10000) * 100, 100) },
    { axis: "Forks", val: Math.min(Math.log10(Math.max(data.total_forks, 1)) / Math.log10(5000) * 100, 100) },
    { axis: "Repos", val: Math.min(data.public_repos / 100 * 100, 100) },
    { axis: "Diversity", val: Math.min((data.language_breakdown?.length || 0) / 8 * 100, 100) },
  ] : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Syne', sans-serif; background: #080810; color: #e2e0f0; min-height: 100vh; }
        .grain { position: fixed; inset: 0; pointer-events: none; z-index: 999; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); opacity: 0.4; }
        .glow { position: fixed; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(192,132,252,0.08) 0%, transparent 70%); pointer-events: none; top: -200px; left: 50%; transform: translateX(-50%); }
        .container { max-width: 900px; margin: 0 auto; padding: 48px 16px 80px; position: relative; }
        header { text-align: center; margin-bottom: 40px; }
        .logo-mark { display: inline-flex; align-items: center; gap: 10px; font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #c084fc; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 20px; }
        .logo-dot { width: 6px; height: 6px; border-radius: 50%; background: #c084fc; }
        h1 { font-size: clamp(32px, 9vw, 80px); font-weight: 800; line-height: 0.95; letter-spacing: -0.03em; color: #fff; margin-bottom: 14px; }
        h1 span { color: #c084fc; }
        .tagline { font-size: 13px; color: #6b6980; font-family: 'JetBrains Mono', monospace; }
        .search-wrap { display: flex; gap: 10px; margin-bottom: 40px; max-width: 560px; margin-left: auto; margin-right: auto; }
        .search-input { flex: 1; min-width: 0; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 16px; font-size: 15px; font-family: 'JetBrains Mono', monospace; color: #e2e0f0; outline: none; transition: border-color 0.2s, background 0.2s; }
        .search-input::placeholder { color: #3d3b50; }
        .search-input:focus { border-color: #c084fc; background: rgba(192,132,252,0.05); }
        .btn { background: #c084fc; border: none; border-radius: 12px; padding: 14px 20px; font-size: 14px; font-family: 'Syne', sans-serif; font-weight: 700; color: #1a0030; cursor: pointer; transition: opacity 0.2s, transform 0.1s; white-space: nowrap; flex-shrink: 0; }
        .btn:hover { opacity: 0.9; }
        .btn:active { transform: scale(0.97); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .error { text-align: center; color: #f87171; font-family: 'JetBrains Mono', monospace; font-size: 13px; margin-bottom: 24px; }
        .loading-wrap { text-align: center; padding: 60px 0; font-family: 'JetBrains Mono', monospace; color: #6b6980; font-size: 13px; }
        .spinner { width: 36px; height: 36px; border: 2px solid rgba(192,132,252,0.2); border-top-color: #c084fc; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .profile-row { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
        .profile-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
        .avatar { width: 56px; height: 56px; border-radius: 50%; border: 2px solid rgba(192,132,252,0.3); flex-shrink: 0; }
        .profile-info { min-width: 0; }
        .profile-name { font-size: 20px; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .profile-handle { font-size: 12px; color: #6b6980; font-family: 'JetBrains Mono', monospace; }
        .profile-bio { font-size: 13px; color: #8b8aa0; margin-top: 4px; line-height: 1.4; }
        .grade-badge { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
        .grade-letter { width: 60px; height: 60px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 800; border: 2px solid; }
        .grade-label { font-size: 10px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.1em; color: #6b6980; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 28px; }
        .stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 16px 14px; position: relative; overflow: hidden; }
        .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--accent, #c084fc); opacity: 0.6; }
        .stat-label { font-size: 10px; font-family: 'JetBrains Mono', monospace; color: #4d4b60; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
        .stat-value { font-size: 26px; font-weight: 800; color: #fff; line-height: 1; }
        .stat-sub { font-size: 11px; color: #4d4b60; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
        .section { margin-bottom: 28px; }
        .section-title { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #4d4b60; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
        .section-title::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.05); }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; }
        .post-card { display: block; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 14px; margin-bottom: 10px; text-decoration: none; color: inherit; transition: border-color 0.2s, background 0.2s; }
        .post-card:hover { border-color: rgba(192,132,252,0.3); background: rgba(192,132,252,0.04); }
        .post-card:active { background: rgba(192,132,252,0.06); }
        .post-text { font-size: 13px; line-height: 1.6; color: #c4c2d4; margin-bottom: 10px; }
        .post-meta { display: flex; gap: 12px; align-items: center; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #4d4b60; flex-wrap: wrap; }
        .post-date { margin-left: auto; }
        .insight-item { display: flex; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; color: #8b8aa0; line-height: 1.5; }
        .insight-item:last-child { border-bottom: none; }
        .chart-tooltip { background: #1a1828; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #c4c2d4; }
        .lang-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .lang-name { width: 80px; font-family: 'JetBrains Mono', monospace; color: #8b8aa0; font-size: 11px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lang-track { flex: 1; background: rgba(255,255,255,0.05); border-radius: 4px; height: 6px; overflow: hidden; }
        .lang-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
        .lang-count { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #4d4b60; width: 36px; text-align: right; flex-shrink: 0; }
        @media (max-width: 480px) {
          .container { padding: 32px 14px 60px; }
          header { margin-bottom: 28px; }
          h1 { font-size: clamp(28px, 10vw, 48px); margin-bottom: 10px; }
          .search-wrap { flex-direction: column; gap: 8px; }
          .btn { width: 100%; padding: 14px; font-size: 15px; }
          .two-col { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .profile-row { gap: 12px; }
          .grade-letter { width: 52px; height: 52px; font-size: 26px; }
          .stat-value { font-size: 22px; }
          .panel { padding: 14px; }
        }
        @media (min-width: 640px) {
          .stats-grid { grid-template-columns: repeat(4, 1fr); }
          .container { padding: 60px 24px 100px; }
        }
      `}</style>

      <div className="grain" />
      <div className="glow" />

      <div className="container">
        <header>
          <div className="logo-mark">
            <div className="logo-dot" />
            XScore
            <div className="logo-dot" />
          </div>
          <h1>Analyze your<br /><span>GitHub influence</span></h1>
          <p className="tagline">// reputation scoring for developers</p>
        </header>

        <div className="search-wrap">
          <input
            className="search-input"
            placeholder="github username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
          />
          <button className="btn" onClick={analyze} disabled={loading}>
            {loading ? "Analyzing…" : "Analyze →"}
          </button>
        </div>

        {error && <div className="error">⚠ {error}</div>}

        {loading && (
          <div className="loading-wrap">
            <div className="spinner" />
            Fetching repos & computing score…
          </div>
        )}

        {data && (
          <div>
            <div className="profile-row">
              <div className="profile-left">
                {data.profile_image_url && (
                  <img className="avatar" src={data.profile_image_url} alt={data.name} />
                )}
                <div className="profile-info">
                  <div className="profile-name">{data.name}</div>
                  <div className="profile-handle">@{data.username}{data.location ? ` · ${data.location}` : ""}</div>
                  {data.description && (
                    <div className="profile-bio">
                      {data.description.length > 100 ? data.description.slice(0, 100) + "…" : data.description}
                    </div>
                  )}
                </div>
              </div>
              {grade && (
                <div className="grade-badge">
                  <div className="grade-letter" style={{ color: grade.color, borderColor: grade.color, background: grade.color + "15" }}>
                    {data.grade}
                  </div>
                  <div className="grade-label">{grade.label}</div>
                </div>
              )}
            </div>

            <div className="stats-grid">
              <StatCard label="Dev Score" value={data.social_score} sub="out of 1000" accent="#c084fc" />
              <StatCard label="Total Stars" value={fmtNum(data.total_stars)} sub={`${fmtNum(data.total_forks)} forks`} accent="#f59e0b" />
              <StatCard label="Followers" value={fmtNum(data.followers)} sub={`${fmtNum(data.following)} following`} accent="#60a5fa" />
              <StatCard label="Repos" value={data.public_repos} sub="public repos" accent="#34d399" />
            </div>

            <div className="two-col section">
              <div className="panel">
                <div className="section-title">Developer Radar</div>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.07)" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: "#4d4b60", fontSize: 11, fontFamily: "JetBrains Mono" }} />
                    <Radar dataKey="val" stroke="#c084fc" fill="#c084fc" fillOpacity={0.15} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="panel">
                <div className="section-title">Languages</div>
                {data.language_breakdown?.map((lang, i) => {
                  const max = data.language_breakdown[0]?.score || 1;
                  return (
                    <div key={lang.language} className="lang-bar">
                      <div className="lang-name">{lang.language}</div>
                      <div className="lang-track">
                        <div className="lang-fill" style={{ width: `${(lang.score / max) * 100}%`, background: LANG_COLORS[i % LANG_COLORS.length] }} />
                      </div>
                      <div className="lang-count">{fmtNum(lang.score)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {data.activity_timeline?.length > 0 && (
              <div className="section panel">
                <div className="section-title">Activity Timeline</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data.activity_timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fill: "#4d4b60", fontSize: 9, fontFamily: "JetBrains Mono" }} />
                    <YAxis tick={{ fill: "#4d4b60", fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="pushes" radius={[3, 3, 0, 0]} fill="#c084fc" fillOpacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.insights.length > 0 && (
              <div className="section panel">
                <div className="section-title">Insights</div>
                {data.insights.map((ins, i) => (
                  <div key={i} className="insight-item">
                    <InsightBadge type={ins.type} />
                    {ins.text}
                  </div>
                ))}
              </div>
            )}

            {data.top_repos.length > 0 && (
              <div className="section">
                <div className="section-title">Top Repositories</div>
                {data.top_repos.map((repo) => (
                  <RepoCard key={repo.id} repo={repo} />
                ))}
              </div>
            )}

            <div style={{ textAlign: "center", fontSize: 12, color: "#2d2b3d", fontFamily: "JetBrains Mono", marginTop: 40 }}>
              Based on {data.public_repos} public repos — XScore v2.0
            </div>
          </div>
        )}
      </div>
    </>
  );
}
