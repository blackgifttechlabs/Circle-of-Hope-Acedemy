import os
import time
from playwright.sync_api import sync_playwright

def verify_matron_and_admin(page):
    # 1. Admin Login & Config Hostels
    page.goto("http://localhost:5175/#/login")
    page.wait_for_selector("text=Admin")
    page.click("text=Admin")
    # New Admin PIN field uses placeholder "••••"
    page.fill("input[placeholder='••••']", "1111")
    page.click("button:has-text('Login')")

    # Go to Settings
    page.goto("http://localhost:5175/#/admin/settings")
    # Wait for the school config section or button
    page.click("button:has-text('School Config')")

    # Add Hostel
    page.fill("input[placeholder='Add Hostel (e.g. Dorm A)']", "Vanguard Hall")
    page.click("button:has-text('Add')")
    page.click("button:has-text('Save All Changes')")
    time.sleep(1)

    # Add Student with Hostel
    page.goto("http://localhost:5175/#/admin/students")
    page.click("button:has-text('Add Student')")
    page.fill("input[placeholder='Student name']", "John")
    page.fill("input[placeholder='Student surname']", "Hostel")
    page.fill("input[type='date']", "2015-05-05")
    # Class selector
    page.select_option("select", label="Grade 1")
    page.check("text=Requires Hostel Accommodation")
    # Select the hostel from the list
    page.click("text=Vanguard Hall")
    page.click("button:has-text('Add Student')")
    time.sleep(1)

    # Screenshot of Student Directory with Filter
    page.screenshot(path="verification/admin_students.png")

    # 2. Matron View
    # Logout Admin
    page.goto("http://localhost:5175/#/login")
    page.reload()
    page.wait_for_selector("text=Matron")

    # Create a matron via admin first
    page.click("text=Admin")
    page.fill("input[placeholder='••••']", "1111")
    page.click("button:has-text('Login')")
    page.goto("http://localhost:5175/#/admin/dashboard")
    page.click("button:has-text('Add matron')")
    page.fill("input[placeholder='Full name']", "Matron Jane")
    page.fill("input[placeholder='4-digit PIN']", "2222")
    page.fill("input[placeholder='Confirm PIN']", "2222")
    page.click("button:has-text('Create matron')")
    time.sleep(1)

    # Now login as Matron
    page.goto("http://localhost:5175/#/login")
    page.click("text=Matron")
    page.fill("input[placeholder='Start typing...']", "Matron Jane")
    page.wait_for_selector("text=Matron Jane")
    page.click("text=Matron Jane")

    # 4-digit PIN boxes
    # wait for the inputs to appear
    page.wait_for_selector("input[inputmode='numeric']")
    pin_inputs = page.query_selector_all("input[inputmode='numeric']")
    for i, char in enumerate("2222"):
        pin_inputs[i].fill(char)
    page.click("button:has-text('Authenticate')")
    time.sleep(1)

    # Matron Student List
    page.click("text=Students")
    time.sleep(1)
    page.screenshot(path="verification/matron_list.png")

    # Matron Profile & History
    page.click("text=John Hostel")
    time.sleep(1)
    page.click("text=Eating")
    page.click("text=Good")
    page.check("text=Breakfast")
    page.click("button:has-text('Save Log')")
    time.sleep(1)

    # Check History
    page.click("button:has-text('History')")
    time.sleep(1)
    page.screenshot(path="verification/matron_history.png")

    # 3. Admin Records View
    page.goto("http://localhost:5175/#/login")
    page.click("text=Admin")
    page.fill("input[placeholder='••••']", "1111")
    page.click("button:has-text('Login')")
    page.goto("http://localhost:5175/#/admin/matron-records")
    time.sleep(1)
    page.screenshot(path="verification/admin_records.png")

    # Expand Student
    page.click("text=John Hostel")
    time.sleep(1)
    page.screenshot(path="verification/admin_records_expanded.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        try:
            verify_matron_and_admin(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
