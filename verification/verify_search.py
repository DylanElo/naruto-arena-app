from playwright.sync_api import sync_playwright
import time

def verify_search(page):
    # Set viewport to desktop size as per memory guidelines
    page.set_viewport_size({"width": 1280, "height": 720})

    page.goto("http://localhost:5173/naruto-arena-app/")

    # Wait for the search input to be visible
    page.wait_for_selector('input[placeholder="Search archive..."]')

    # Type into the search box
    page.fill('input[placeholder="Search archive..."]', "Naruto")

    # Wait a bit for debounce and filtering (300ms debounce + render time)
    time.sleep(1)

    # Take screenshot
    page.screenshot(path="verification/search_results.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_search(page)
        finally:
            browser.close()
