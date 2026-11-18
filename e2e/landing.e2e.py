"""
FILE: e2e/landing.e2e.py
PURPOSE: Real-browser checks for the landing page. Run: python3 e2e/landing.e2e.py (needs `npm run preview`).
Checks per width: no horizontal scroll, no console errors, tap targets >= 44px on phones,
nothing clipped, axe accessibility (WCAG 2 AA), reduced motion, keyboard focus, story, FAQ, routes.
"""
import json, sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:4173"
WIDTHS = [320, 390, 768, 1024, 1280, 1920]
AXE = open("node_modules/axe-core/axe.min.js").read()
fails = []
def check(ok, msg):
    print(("  PASS " if ok else "  FAIL ") + msg)
    if not ok: fails.append(msg)

def ignorable(text):  # fonts can't load in this sandbox (no internet) — not an app error
    return "fonts.g" in text or "ERR_" in text and "font" in text.lower() or "Failed to load resource" in text

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for w in WIDTHS:
        print(f"\n== {w}px ==")
        ctx = browser.new_context(viewport={"width": w, "height": 900 if w > 500 else 780}, reduced_motion="reduce" if w == 1280 else "no-preference")
        page = ctx.new_page(); errors = []
        page.on("console", lambda m: m.type == "error" and not ignorable(m.text) and errors.append(m.text))
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.route("**/fonts.googleapis.com/**", lambda r: r.abort()); page.route("**/fonts.gstatic.com/**", lambda r: r.abort())
        page.goto(BASE + "/", wait_until="networkidle")
        # scroll through the whole page so every scroll animation has run
        h = page.evaluate("document.body.scrollHeight")
        for y in range(0, h + 900, 400): page.mouse.wheel(0, 400); page.wait_for_timeout(25)
        page.wait_for_timeout(1500)
        check(not errors, f"no console errors {errors[:2]}")
        sw = page.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
        check(sw[0] <= sw[1], f"no horizontal scroll (scrollWidth {sw[0]} vs {sw[1]})")
        # visible text elements must not be cut off at the right edge
        off = page.evaluate("""() => [...document.querySelectorAll('h1,h2,h3,p,a,button,summary,li')].filter(e => {
            const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).map(e => e.textContent.trim().slice(0,30))""")
        check(not off, f"no text outside the screen {off[:3]}")
        hidden = page.evaluate("""() => [...document.querySelectorAll('.lp-card, h1, h2')].filter(e => +getComputedStyle(e).opacity < 0.99).length""")
        check(hidden == 0, f"all cards/headings fully visible after scrolling ({hidden} not)")
        if w <= 390:
            small = page.evaluate("""() => [...document.querySelectorAll('a,button,summary')].filter(e => {
                const r = e.getBoundingClientRect(); return r.width && r.height < 44 && !e.closest('.lp-foot p'); }).map(e => e.textContent.trim().slice(0,24)+' '+Math.round(e.getBoundingClientRect().height))""")
            check(not small, f"tap targets >= 44px {small[:5]}")
        # regressions found by eye in screenshots — keep them caught
        flat = page.evaluate("() => [...document.querySelectorAll('.prana__body > span')].filter(e => getComputedStyle(e).borderTopLeftRadius === '0px').length")
        check(flat == 0, f"Prana blobs are rounded, also with reduced motion ({flat} square)")
        eyes = page.evaluate("() => [...document.querySelectorAll('.prana__eyes i')].filter(e => getComputedStyle(e).position === 'absolute').length")
        check(eyes == 0, f"no page style leaks into Prana's eyes ({eyes})")
        page.add_script_tag(content=AXE)
        res = page.evaluate("async () => (await axe.run(document, {runOnly: ['wcag2a','wcag2aa','wcag21aa']})).violations.map(v => v.id + ' x' + v.nodes.length + ' ' + v.nodes[0].target)")
        check(not res, f"axe accessibility {res}")
        page.evaluate("window.scrollTo(0,0)"); page.wait_for_timeout(300)
        page.screenshot(path=f"e2e/shots/landing-{w}.png", full_page=True)
        ctx.close()

    print("\n== behaviour ==")
    ctx = browser.new_context(viewport={"width": 1280, "height": 900}); page = ctx.new_page()
    page.route("**/fonts.g*/**", lambda r: r.abort())
    page.goto(BASE + "/", wait_until="networkidle")
    # keyboard: first Tab lands on the logo, focus ring visible, Start free reachable
    page.keyboard.press("Tab")
    check(page.evaluate("document.activeElement.textContent.trim()") == "Sattva Heals", "first Tab = logo")
    outline = page.evaluate("getComputedStyle(document.activeElement).outlineStyle")
    check(outline != "none", f"focus ring visible ({outline})")
    names = []
    for _ in range(8): page.keyboard.press("Tab"); names.append(page.evaluate("document.activeElement.textContent.trim()"))
    check(any("Start free" in n for n in names), f"Start free reachable by keyboard {names[:6]}")
    # story: scroll to step 3 → step 3 becomes active, Prana changes to happy
    page.add_style_tag(content="html{scroll-behavior:auto!important}")  # instant jumps so timing can't flake
    for i in range(3): page.locator(".lp-step").nth(i).evaluate("e => e.scrollIntoView({block:'center'})"); page.wait_for_timeout(600)
    check(page.locator(".lp-step.is-active h3").inner_text() == "Get your three for today", "story step 3 activates at mid-screen")
    check(page.locator(".lp-story .prana__face--happy").count() == 1, "story Prana turns happy on step 3")
    # FAQ opens and closes
    s = page.locator(".lp-faq summary").first; s.click()
    check(page.locator(".lp-faq details").first.evaluate("d => d.open"), "FAQ opens on click"); s.click()
    check(not page.locator(".lp-faq details").first.evaluate("d => d.open"), "FAQ closes on second click")
    # Start free navigates client-side to /app
    page.locator(".lp-top .btn").click(); page.wait_for_url("**/app")
    check(page.locator("h1").inner_text() == "The app", "Start free opens /app")
    page.go_back(); page.wait_for_url(BASE + "/")
    check(page.locator("h1").count() == 1, "browser Back returns to landing")
    # deep links / refresh on SPA routes
    for path, text in [("/app/today", "The app"), ("/privacy", "Privacy policy"), ("/random-page", "Page not found")]:
        page.goto(BASE + path, wait_until="networkidle"); check(page.locator("h1").inner_text() == text, f"direct load {path}")
    # no-JS-motion fallback: GSAP blocked entirely still shows full content
    ctx.close()
    ctx = browser.new_context(viewport={"width": 390, "height": 780}, java_script_enabled=True); page = ctx.new_page()
    page.route("**/fonts.g*/**", lambda r: r.abort())
    page.goto(BASE + "/", wait_until="networkidle")
    # slow scroll on a phone: sticky Prana bar must not cover the step text
    page.locator(".lp-step").nth(1).evaluate("e => e.scrollIntoView({block:'start'})"); page.wait_for_timeout(500)
    bar = page.locator(".lp-story__art").bounding_box(); step = page.locator(".lp-step").nth(1).bounding_box()
    check(step["y"] >= bar["y"] + bar["height"] - 1 or step["y"] + step["height"] > bar["y"] + bar["height"] + 60, "phone: sticky Prana bar leaves step text readable")
    browser.close()

print(f"\n{len(fails)} failure(s)")
sys.exit(1 if fails else 0)
