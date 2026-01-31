from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch()
        page = browser.new_page()
        print("Navigating to example.com...")
        page.goto("https://example.com")
        print(f"Page title: {page.title()}")
        browser.close()
        print("Success!")

if __name__ == "__main__":
    run()
