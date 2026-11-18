"""
FILE: e2e/night.e2e.py
PURPOSE: Night theme (phone in dark mode) on every screen + chat + legal pages, at phone and desktop size.
Checks: axe WCAG 2.1 AA (contrast is where dark themes break), no sideways scroll, no console errors, screenshots.
"""
import json, sys
from datetime import date
from playwright.sync_api import sync_playwright

BASE = "http://localhost:4173"
AXE = open("node_modules/axe-core/axe.min.js").read()
fails = []
def check(ok, msg):
    print(("  PASS " if ok else "  FAIL ") + msg)
    if not ok: fails.append(msg)
today = date.today().isoformat()
SEED = {"u": {"profile": {"name": "Varad", "prefs": {"minutes": 10, "diet": "vegetarian", "wake": "06:30"}, "prakriti": {"vata": 50, "pitta": 33, "kapha": 17, "dominant": "vata", "label": "Vata · Pitta"}},
              "checkins": [{"date": today, "mood": "overthinking"}], "completions": [{"date": today, "module": "dinacharya", "practiceId": "din-early-bed"}],
              "sessions": [{"date": today, "practiceId": "man-om-6", "kind": "om", "rounds": 6, "avgHum": 8, "avgInhale": 4, "steadyRounds": 5, "before": 2, "after": 4}] * 3}}

def audit(page, tag, errors):
    page.wait_for_timeout(1300)
    sw = page.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
    check(sw[0] <= sw[1], f"{tag}: no sideways scroll {sw}")
    page.add_script_tag(content=AXE)
    res = page.evaluate("async () => (await axe.run(document, {runOnly: ['wcag2a','wcag2aa','wcag21aa']})).violations.map(v => v.id + ' ' + v.nodes.slice(0,2).map(n => n.target).join(' | '))")
    check(not res, f"{tag}: axe {res}")
    check(not errors, f"{tag}: no console errors {errors[:2]}")
    page.screenshot(path=f"e2e/shots/{tag}.png", full_page=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for w, h in [(390, 844), (1280, 860)]:
        for scheme in ["dark", "light"]:
            print(f"\n== {w}px · {scheme} ==")
            ctx = browser.new_context(viewport={"width": w, "height": h}, color_scheme=scheme); page = ctx.new_page(); errors = []
            page.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errors.append(m.text))
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.route("**/fonts.g*/**", lambda r: r.abort())
            page.goto(BASE + "/")
            theme = page.evaluate("document.documentElement.dataset.theme")
            if scheme == "dark": check(theme == "night", f"{w}: phone dark mode → night theme ({theme})")
            if scheme == "light" and w == 390:
                for path, text in [("/privacy", "Gemini"), ("/terms", "14416")]:
                    page.goto(BASE + path); check(page.get_by_text(text).first.is_visible(), f"{path} shows its key disclosure")
                    audit(page, f"legal-{path[1:]}", errors)
                continue
            if scheme == "light": continue
            page.goto(BASE + "/"); audit(page, f"night-{w}-landing", errors)
            # chat on the landing page (signed out → FAQ answers in the browser)
            page.get_by_role("button", name="Chat with Prana").click()
            page.get_by_role("button", name="Is my data private?").click()
            check(page.get_by_role("dialog", name="Chat with Prana").get_by_text("Never audio").is_visible(), f"{w}: chat answers an FAQ instantly")
            page.get_by_role("textbox", name="Your message").fill("I want to end my life"); page.keyboard.press("Enter")
            check(page.get_by_role("link", name="Call Tele-MANAS 14416").is_visible(), f"{w}: crisis message shows the call button")
            audit(page, f"night-{w}-chat", errors)
            page.keyboard.press("Escape")
            page.evaluate(f"() => {{ localStorage.setItem('sh.user', JSON.stringify({{id:'u'}})); localStorage.setItem('sh.db.v1', JSON.stringify({json.dumps(SEED)})); }}")
            for path, name, wait in [("/app/onboarding?retake=1", "quiz", ".options"), ("/app/checkin", "checkin", ".moods"), ("/app/today", "today", ".pcard"),
                                     ("/app/progress", "progress", ".garden"), ("/app/profile", "profile", ".field"), ("/app/hum/man-om-6", "hum", ".scale")]:
                page.goto(BASE + path); page.locator(wait).first.wait_for()
                audit(page, f"night-{w}-{name}", errors)
            check(page.evaluate("getComputedStyle(document.body).backgroundColor") != "rgb(251, 247, 239)", f"{w}: night background is dark, not cream")
            ctx.close()
    browser.close()
print(f"\n{len(fails)} failure(s)"); sys.exit(1 if fails else 0)
