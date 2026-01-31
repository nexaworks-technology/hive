from playwright.sync_api import sync_playwright

def run():
    # User provided proxy - might block, so let's try WITHOUT proxy first for this direct site test 
    # as direct access is usually safer for standard corporate sites unless they strict geo-block.
    # We can try with proxy if direct fails.
    
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(
             user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        
        url = "https://nexaworks.tech/"
        print(f"Navigating to {url}...")
        try:
            page.goto(url, timeout=30000)
            
            # 1. Page Title
            print(f"Page Title: {page.title()}")
            
            # 2. Meta Description
            meta_desc = page.locator('meta[name="description"]').get_attribute("content") if page.locator('meta[name="description"]').count() > 0 else "No description"
            print(f"Meta Description: {meta_desc}")
            
            # 3. Headings
            h1s = page.locator("h1").all_inner_texts()
            print(f"H1 Tags: {h1s}")
            
            h2s = page.locator("h2").all_inner_texts()
            print(f"H2 Tags: {h2s[:5]}") # First 5
            
            # 4. Text Content Snippet
            body_text = page.inner_text("body")
            print("--- Body Text Snippet (First 500 chars) ---")
            print(body_text[:500].replace("\n", " "))
            print("-----------------------------------------")

        except Exception as e:
            print(f"Error: {e}")
            
        browser.close()

if __name__ == "__main__":
    run()
