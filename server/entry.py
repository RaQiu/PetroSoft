"""
PyInstaller entry point for PetroSoft backend server.
Must call freeze_support() before anything else on Windows.
"""
import multiprocessing
import os
import sys


def main():
    multiprocessing.freeze_support()

    # When running as a PyInstaller bundle, add _MEIPASS to sys.path
    # so that source modules (main, config, api.*, etc.) can be imported.
    if getattr(sys, 'frozen', False):
        meipass = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
        if meipass not in sys.path:
            sys.path.insert(0, meipass)

    # Read port from env (Electron main process passes this)
    port = int(os.environ.get('PETROSOFT_PORT', '20022'))

    # Import app object directly (string import doesn't work in frozen builds)
    from main import app  # noqa: E402

    import uvicorn
    uvicorn.run(
        app,
        host='127.0.0.1',
        port=port,
        workers=1,         # Must be 1 for PyInstaller
        log_level='warning',
        reload=False,       # No reload in production
    )


if __name__ == '__main__':
    main()
