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
    import os
    browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox",
        "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", f"--use-file-for-fake-audio-capture={os.path.abspath('e2e/hum.wav')}"])
    for w, h in [(390, 844), (1280, 860)]:
        print(f"\n== {w}px ==")
        ctx = browser.new_context(viewport={"width": w, "height": h}, permissions=["microphone"]); page = ctx.new_page(); errors = []
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
        # found by eye: with overflow:hidden the decorative corner blob made cards sideways-scrollable, so focus/clicks shifted the text
        shifted = page.evaluate("[...document.querySelectorAll('.pcard')].map(c => (c.scrollLeft = 36, c.scrollLeft)).filter(x => x !== 0)")
        check(not shifted, f"{w}: cards can't be scrolled sideways (text never shifts) {shifted}")
        audit(page, w, "6-today", errors)
        check(page.get_by_text("one done").count() == 1, f"{w}: ticking a card updates Prana")
        page.get_by_role("button", name="Need more support").click()
        check(page.get_by_role("dialog").is_visible(), f"{w}: support sheet opens")
        audit(page, w, "7-support", errors)
        page.keyboard.press("Escape")
        # hum coach with the fake mic playing e2e/hum.wav (phone only — 45 s of audio)
        if w < 500:
            check(page.get_by_role("link", name="Hum with Prana").count() == 1, f"{w}: mantra card links to the hum coach")
            page.goto(BASE + "/app/hum/man-bhramari-3")  # 3 rounds — matches the 3 hums in e2e/hum.wav
            page.get_by_role("button", name="2", exact=True).click()
            audit(page, w, "11-hum-setup", errors)
            page.get_by_role("button", name="Start with the mic").click()
            page.locator(".hum--dark").wait_for(timeout=10000)
            page.locator(".prana__face--humming").wait_for(timeout=15000)
            audit(page, w, "12-hum-live", errors)
            page.get_by_role("heading", name="well done").wait_for(timeout=60000)
            steady = page.locator(".stats div").nth(2).inner_text()
            check(steady.startswith("3/3") or steady.startswith("2/") , f"{w}: real mic path detected steady hums ({steady!r})")
            avg = float(page.locator(".stats b").first.inner_text().split()[0])
            check(7.5 <= avg <= 10, f"{w}: average hum length close to the 9 s recording ({avg} s)")
            page.get_by_role("button", name="4", exact=True).click()
            check(page.get_by_text("more settled than before").count() == 1, f"{w}: before/after result shown")
            audit(page, w, "13-hum-summary", errors)
            page.get_by_role("button", name="Save and finish").click()
            page.get_by_text("done").first.wait_for()
            check(page.locator(".pcard--mantra.is-done").count() == 1, f"{w}: saving marks the mantra card done")
        page.get_by_role("link", name="Progress").click(); page.get_by_text("Your").first.wait_for()
        audit(page, w, "8-progress", errors)
        page.get_by_role("link", name="Profile").click(); page.get_by_text("Retake").wait_for()
        if w < 500:  # found in review: last items could sit under the bottom nav / chat bubble
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)"); page.wait_for_timeout(300)
            gap = page.evaluate("document.querySelector('.nav').getBoundingClientRect().top - document.querySelector('.link--danger').getBoundingClientRect().bottom")
            check(gap >= 72, f"{w}: last item clears the nav and chat bubble ({gap:.0f}px)")
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
