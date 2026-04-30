from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173/#/login")
            page.wait_for_selector("text=Matron")
            page.click("text=Matron")
            page.wait_for_timeout(2000)
            page.screenshot(path="verification/matron_login_step.png")

            # Type something in search
            page.type("input[placeholder='Start typing...']", "Mary")
            page.wait_for_timeout(1000)
            page.screenshot(path="verification/matron_search.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
