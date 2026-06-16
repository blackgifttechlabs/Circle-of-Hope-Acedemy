from playwright.sync_api import sync_playwright, expect
import time
import re

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # 1. Admin - Homeworks & Matron Records
        page.goto("http://localhost:5173/#/login")
        page.get_by_role("button", name="Admin").click()
        page.get_by_placeholder("••••").fill("1111")
        page.get_by_role("button", name="Login").click()

        expect(page).to_have_url(re.compile(r"admin/dashboard"), timeout=10000)

        # Homework Bulk Selection
        page.goto("http://localhost:5173/#/admin/homeworks")
        time.sleep(2)
        page.screenshot(path="verification/admin_homeworks_bulk.png")

        # Matron Records Alerts
        page.goto("http://localhost:5173/#/admin/matron-records")
        time.sleep(2)
        page.screenshot(path="verification/admin_matron_records.png")

        # 2. Parent Dashboard Timeline
        # Assuming student with ID 'C-0001' or similar might exist if seeded, but likely need a real search
        # We can try to login as a parent if we know a name
        page.goto("http://localhost:5173/#/login")
        page.get_by_role("button", name="Parent").click()
        # Just search and see if results appear
        page.get_by_placeholder("Start typing...").fill("Student")
        time.sleep(1)
        results = page.locator("button:has-text('Student')")
        if results.count() > 0:
            results.first.click()
            # PINs for students are often 1234 or random 4 digits, but let's try 1234
            for i in range(4):
                page.locator(f"#pin-{i}").fill("1234"[i])
            page.get_by_role("button", name="Authenticate").click()
            time.sleep(2)
            page.screenshot(path="verification/parent_dashboard_timeline.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
