from playwright.sync_api import Page, expect, sync_playwright
import time
import os

def verify_matron_module(page: Page):
    # 1. Verify Login Page Matron Option (without pre-set state)
    page.goto("http://localhost:5173/#/login")
    page.wait_for_load_state("networkidle")

    matron_button = page.get_by_role("button", name="Matron CARE & MEDICATION")
    matron_button.click()

    expect(page.get_by_text("Search for your name to log in.")).to_be_visible()
    page.screenshot(path="/home/jules/verification/matron_login_ui.png")

    # 2. Verify Matron Dashboard (using init script to bypass login)
    page.close() # Close and open new page to apply init script
    context = page.context
    new_page = context.new_page()
    new_page.add_init_script("""
        localStorage.setItem('coha_role', 'MATRON');
        localStorage.setItem('coha_user', JSON.stringify({
            id: 'matron1',
            name: 'Test Matron',
            role: 'MATRON'
        }));
    """)
    new_page.goto("http://localhost:5173/#/matron/dashboard")
    new_page.wait_for_load_state("networkidle")
    expect(new_page.get_by_text("Good morning, Test Matron")).to_be_visible()
    new_page.screenshot(path="/home/jules/verification/matron_dashboard.png")

    # 3. Verify Admin Matron Records
    new_page.add_init_script("""
        localStorage.setItem('coha_role', 'ADMIN');
        localStorage.setItem('coha_user', JSON.stringify({
            id: 'admin',
            name: 'Victoria Joel',
            adminRole: 'super_admin'
        }));
    """)
    new_page.goto("http://localhost:5173/#/admin/matron-records")
    new_page.wait_for_load_state("networkidle")
    expect(new_page.get_by_role("heading", name="Matron Records")).to_be_visible()
    new_page.screenshot(path="/home/jules/verification/admin_matron_records.png")

if __name__ == "__main__":
    os.makedirs("/home/jules/verification", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        try:
            verify_matron_module(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
