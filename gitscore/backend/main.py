from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from datetime import datetime, timezone
from collections import defaultdict
import math

app = FastAPI(title="XScore API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
BASE_URL = "https://api.github.com"


def get_headers():
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


async def gh_get(client, url, params=None):
    r = await client.get(url, headers=get_headers(), params=params)
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="User not found")
    if r.status_code == 403:
        raise HTTPException(status_code=429, detail="GitHub rate limit hit. Try again later.")
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail="GitHub API error")
    return r.json()


def compute_score(user: dict, repos: list) -> float:
    followers = user.get("followers", 0)
    total_stars = sum(r.get("stargazers_count", 0) for r in repos)
    total_forks = sum(r.get("forks_count", 0) for r in repos)
    languages = set(r.get("language") for r in repos if r.get("language"))

    follower_score = math.log10(max(followers, 1)) / math.log10(100000) * 100
    star_score = math.log10(max(total_stars, 1)) / math.log10(10000) * 100
    fork_score = math.log10(max(total_forks, 1)) / math.log10(5000) * 100
    diversity_score = min(len(languages) / 10 * 100, 100)

    now = datetime.now(timezone.utc)
    recent_count = sum(
        1 for r in repos
        if r.get("pushed_at") and (now - datetime.fromisoformat(r["pushed_at"].replace("Z", "+00:00"))).days < 180
    )
    activity_score = min(recent_count / 10 * 100, 100)

    score = (
        follower_score * 25 +
        star_score * 35 +
        fork_score * 15 +
        diversity_score * 10 +
        activity_score * 15
    )
    return round(min(score, 1000), 1)


def compute_grade(score: float) -> str:
    if score >= 800: return "S"
    elif score >= 600: return "A"
    elif score >= 400: return "B"
    elif score >= 200: return "C"
    else: return "D"


def get_insights(user: dict, repos: list, score: float) -> list:
    insights = []
    followers = user.get("followers", 0)
    total_stars = sum(r.get("stargazers_count", 0) for r in repos)
    languages = set(r.get("language") for r in repos if r.get("language"))

    if total_stars > 1000:
        insights.append({"type": "positive", "text": f"Impressive! Your repos have earned {total_stars:,} total stars."})
    elif total_stars > 100:
        insights.append({"type": "neutral", "text": f"Growing star count at {total_stars}. Keep building useful projects."})
    else:
        insights.append({"type": "warning", "text": "Low star count. Focus on solving real problems and sharing your work."})

    if followers > 1000:
        insights.append({"type": "positive", "text": f"Strong following of {followers:,} — you have real reach in the dev community."})
    elif followers > 100:
        insights.append({"type": "neutral", "text": "Decent following. Engage more with the community to grow faster."})
    else:
        insights.append({"type": "warning", "text": "Build your audience by contributing to popular open source projects."})

    if len(languages) >= 5:
        insights.append({"type": "positive", "text": f"Versatile developer — you work across {len(languages)} languages."})
    elif len(languages) >= 3:
        insights.append({"type": "neutral", "text": f"Good range with {len(languages)} languages. Consider going deeper in one area."})
    else:
        insights.append({"type": "warning", "text": "Limited language diversity. Exploring new technologies can boost your profile."})

    return insights


def get_language_breakdown(repos: list) -> list:
    lang_stars = defaultdict(int)
    for r in repos:
        lang = r.get("language")
        if lang:
            lang_stars[lang] += r.get("stargazers_count", 0) + 1
    sorted_langs = sorted(lang_stars.items(), key=lambda x: x[1], reverse=True)[:8]
    return [{"language": k, "score": v} for k, v in sorted_langs]


def get_activity_timeline(repos: list) -> list:
    month_counts = defaultdict(int)
    for r in repos:
        pushed = r.get("pushed_at")
        if pushed:
            try:
                dt = datetime.fromisoformat(pushed.replace("Z", "+00:00"))
                key = dt.strftime("%Y-%m")
                month_counts[key] += 1
            except Exception:
                pass
    sorted_months = sorted(month_counts.items())[-12:]
    return [{"month": k, "pushes": v} for k, v in sorted_months]


@app.get("/")
def root():
    return {"status": "XScore API is running", "version": "2.0.0", "source": "GitHub"}


@app.get("/analyze/{username}")
async def analyze(username: str):
    username = username.lstrip("@")
    async with httpx.AsyncClient(timeout=15) as client:
        user = await gh_get(client, f"{BASE_URL}/users/{username}")
        repos_data = await gh_get(client, f"{BASE_URL}/users/{username}/repos", params={"per_page": 100, "sort": "updated"})

    repos = [r for r in repos_data if not r.get("fork", False)]
    total_stars = sum(r.get("stargazers_count", 0) for r in repos)
    total_forks = sum(r.get("forks_count", 0) for r in repos)

    top_repos = sorted(repos, key=lambda r: r.get("stargazers_count", 0), reverse=True)[:5]
    top_repos_out = [
        {
            "id": r["id"],
            "name": r["name"],
            "description": r.get("description") or "",
            "stars": r.get("stargazers_count", 0),
            "forks": r.get("forks_count", 0),
            "language": r.get("language") or "Unknown",
            "url": r.get("html_url", ""),
            "updated_at": r.get("pushed_at", ""),
        }
        for r in top_repos
    ]

    score = compute_score(user, repos)
    grade = compute_grade(score)
    insights = get_insights(user, repos, score)

    return {
        "username": user.get("login"),
        "name": user.get("name") or user.get("login"),
        "profile_image_url": user.get("avatar_url"),
        "description": user.get("bio") or "",
        "followers": user.get("followers", 0),
        "following": user.get("following", 0),
        "public_repos": user.get("public_repos", 0),
        "location": user.get("location") or "",
        "total_stars": total_stars,
        "total_forks": total_forks,
        "social_score": score,
        "grade": grade,
        "top_repos": top_repos_out,
        "language_breakdown": get_language_breakdown(repos),
        "activity_timeline": get_activity_timeline(repos),
        "insights": insights,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
