import asyncio

async def run_test():
    # TC004: Generate Pairings Using Built-in Swiss System
    # Disabled in BBP-only mode. The application no longer supports the built-in simple Swiss pairing.
    # Refer to TC011 (BBP Dutch) and TC012 (BBP Burstein) for current pairing generation tests.
    print("SKIP: BBP-only mode – built-in simple Swiss pairing test (TC004) disabled. See TC011/TC012 for BBP Dutch/Burstein.")
    return

asyncio.run(run_test())
    