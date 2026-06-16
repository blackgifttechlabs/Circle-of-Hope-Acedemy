from playwright.sync_api import sync_playwright, expect
import time
import re

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        page.goto("http://localhost:5173/#/login")
        page.get_by_role("button", name="Admin").click()
        page.get_by_placeholder("••••").fill("1111")
        page.get_by_role("button", name="Login").click()

        time.sleep(3)
        page.goto("http://localhost:5173/#/admin/homeworks")
        time.sleep(3)
        page.screenshot(path="verification/admin_homeworks_final.png")

        page.goto("http://localhost:5173/#/admin/matron-records")
        time.sleep(3)
        page.screenshot(path="verification/admin_matron_records_final.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
