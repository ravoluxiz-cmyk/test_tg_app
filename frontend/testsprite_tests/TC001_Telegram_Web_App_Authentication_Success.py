import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Submit valid Telegram Web App initData to the authentication endpoint.
        await page.goto('http://localhost:3000/api/auth/telegram', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Navigate to http://localhost:3000 to reload the app and look for Telegram Web App authentication UI or form.
        await page.goto('http://localhost:3000', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Check the 'Мой профиль' (My Profile) button for possible authentication or Telegram login options.
        frame = context.pages[-1]
        # Click on 'Мой профиль' (My Profile) button to check for authentication or Telegram login options
        elem = frame.locator('xpath=html/body/div[2]/div[4]/div/div/div[2]/button[4]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Attempt to submit valid Telegram Web App initData with correct HMAC signature programmatically to the backend authentication endpoint.
        await page.goto('http://localhost:3000/api/auth/telegram', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Return to the main page and look for any Telegram login button or alternative authentication method to submit valid Telegram Web App initData.
        await page.goto('http://localhost:3000', timeout=10000)
        await asyncio.sleep(3)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(frame.locator('text=Authentication Failed: Invalid Telegram Web App initData')).to_be_visible(timeout=1000)
        except AssertionError:
            raise AssertionError("Test case failed: Authentication using valid Telegram Web App initData with correct HMAC signature did not succeed as expected.")
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    