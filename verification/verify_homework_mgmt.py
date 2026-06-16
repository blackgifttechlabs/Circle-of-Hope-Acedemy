from playwright.sync_api import sync_playwright, expect
import time

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # 1. Login as Admin
        page.goto("http://localhost:5173/#/login")
        page.get_by_role("button", name="Admin").click()
        page.get_by_placeholder("••••").fill("1111")
        page.get_by_role("button", name="Login").click()

        # Wait for dashboard
        expect(page).to_have_url(lambda url: "admin/dashboard" in url, timeout=10000)

        # 2. Go to Homeworks
        page.goto("http://localhost:5173/#/admin/homeworks")
        time.sleep(2)
        page.screenshot(path="verification/admin_homeworks_bulk.png")

        # 3. Login as Teacher
        # I'll use a new context for teacher
        teacher_page = context.new_page()
        teacher_page.goto("http://localhost:5173/#/login")
        teacher_page.get_by_role("button", name="Teacher").click()
        # Search for a teacher (assuming one exists or using name search)
        teacher_page.get_by_placeholder("Start typing...").fill("Teacher")
        time.sleep(1)
        # If any teacher exists, select the first one
        results = teacher_page.locator("button:has-text('Teacher')")
        if results.count() > 0:
            results.first.click()
            # Fill PIN (default 1234)
            for i in range(4):
                teacher_page.locator(f"#pin-{i}").fill("1234"[i])
            teacher_page.get_by_role("button", name="Authenticate").click()
            expect(teacher_page).to_have_url(lambda url: "teacher/dashboard" in url, timeout=10000)

            # Go to Homework
            teacher_page.goto("http://localhost:5173/#/teacher/homework")
            time.sleep(2)
            # Switch to REVIEW mode
            teacher_page.get_by_role("button", name="Review").click()
            time.sleep(1)
            teacher_page.screenshot(path="verification/teacher_homework_splitview.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
