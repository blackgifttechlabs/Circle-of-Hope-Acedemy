from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173/#/login")
            page.wait_for_timeout(5000)  # Wait for dev server to be ready and page to load
            page.screenshot(path="verification/login_page.png")

            # Check for Matron button
            matron_button = page.get_by_role("button", name="Matron")
            if matron_button.is_visible():
                print("Matron button is visible")
                matron_button.click()
                page.wait_for_timeout(1000)
                page.screenshot(path="verification/matron_login_step1.py.png")
            else:
                print("Matron button NOT visible")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
