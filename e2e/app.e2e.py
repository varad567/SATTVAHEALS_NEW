"""
FILE: e2e/app.e2e.py
PURPOSE: Real-browser walk through the whole app at phone and desktop sizes.
Per screen: no console errors, no sideways scroll, nothing off-screen, axe WCAG 2.1 AA, tap targets >= 44px on phones,
and a screenshot to e2e/shots/app-<width>-<screen>.png for review by eye.
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:4173"
AXE = open("node_modules/axe-core/axe.min.js").read()
fails = []
def check(ok, msg):
    print(("  PASS " if ok else "  FAIL ") + msg)
    if not ok: fails.append(msg)

def audit(page, w, name, errors):
    page.wait_for_timeout(1100)  # let entrance animations finish
    sw = page.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
    check(sw[0] <= sw[1], f"{w}/{name}: no sideways scroll {sw}")
    off = page.evaluate("""() => [...document.querySelectorAll('h1,h2,p,a,button,label,select,input')].filter(e => {
        const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).map(e => e.textContent.trim().slice(0,30))""")
    check(not off, f"{w}/{name}: nothing off-screen {off[:3]}")
    if w < 500:
        small = page.evaluate("""() => [...document.querySelectorAll('a,button,select,input,label.check')].filter(e => {
            const r = e.getBoundingClientRect(); return r.width && r.height < 44 && e.type !== 'checkbox'; }).map(e => (e.textContent||e.name||e.tagName).trim().slice(0,24)+' '+Math.round(e.getBoundingClientRect().height))""")
        check(not small, f"{w}/{name}: tap targets >= 44px {small[:4]}")
    page.add_script_tag(content=AXE)
    res = page.evaluate("async () => (await axe.run(document, {runOnly: ['wcag2a','wcag2aa','wcag21aa']})).violations.map(v => v.id + ' ' + v.nodes[0].target)")
    check(not res, f"{w}/{name}: axe {res}")
    check(not errors, f"{w}/{name}: no console errors {errors[:2]}")
    page.screenshot(path=f"e2e/shots/app-{w}-{name}.png", full_page=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for w, h in [(390, 844), (1280, 860)]:
        print(f"\n== {w}px ==")
        page = browser.new_context(viewport={"width": w, "height": h}).new_page(); errors = []
        page.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errors.append(m.text))
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.route("**/fonts.g*/**", lambda r: r.abort())
        page.goto(BASE + "/app", wait_until="networkidle")
        audit(page, w, "1-welcome", errors)
        page.get_by_role("checkbox", name="18 or older").check(); page.get_by_role("button", name="Continue").click()
        page.get_by_text("Question 1 of 12").wait_for()
        for i in range(5): page.locator(".options button").nth(i % 3).click()
        audit(page, w, "2-quiz", errors)
        for i in range(7): page.locator(".options button").first.click()
        page.get_by_role("textbox").fill("Varad"); page.get_by_role("button", name="Vegetarian", exact=True).click()
        audit(page, w, "3-prefs", errors)
        page.get_by_role("button", name="Reveal my Prakriti").click()
        audit(page, w, "4-reveal", errors)
        page.get_by_role("button", name="check-in").click()
        page.get_by_role("button", name="Overthinking").click()
        audit(page, w, "5-checkin", errors)
        page.get_by_role("button", name="Show my 3 practices").click()
        page.locator(".pcard").first.wait_for()
        page.locator(".pcard__main").nth(2).click(); page.locator(".tick").first.click()
        audit(page, w, "6-today", errors)
        check(page.get_by_text("one done").count() == 1, f"{w}: ticking a card updates Prana")
        page.get_by_role("button", name="Need more support").click()
        check(page.get_by_role("dialog").is_visible(), f"{w}: support sheet opens")
        audit(page, w, "7-support", errors)
        page.keyboard.press("Escape")
        page.get_by_role("link", name="Progress").click(); page.get_by_text("Your").first.wait_for()
        audit(page, w, "8-progress", errors)
        page.get_by_role("link", name="Profile").click(); page.get_by_text("Retake").wait_for()
        audit(page, w, "9-profile", errors)
        page.get_by_role("button", name="Delete my data").click()
        audit(page, w, "10-delete", errors)
        page.get_by_role("textbox", name="Type DELETE").fill("DELETE"); page.get_by_role("button", name="Delete everything").click()
        check(page.get_by_role("checkbox", name="18 or older").is_visible(), f"{w}: delete returns to welcome")
        # keyboard-only: whole check-in with Tab/Enter
        page.get_by_role("checkbox", name="18 or older").focus(); page.keyboard.press("Space"); page.keyboard.press("Tab")
        check("Continue" in page.evaluate("document.activeElement.textContent"), f"{w}: Tab reaches Continue after the 18+ box")
    browser.close()
print(f"\n{len(fails)} failure(s)"); sys.exit(1 if fails else 0)
