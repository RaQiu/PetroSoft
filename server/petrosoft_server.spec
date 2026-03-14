# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for PetroSoft backend (FastAPI + uvicorn).

Build:
  cd server
  pyinstaller petrosoft_server.spec --clean
"""

block_cipher = None

# uvicorn has many lazy imports that PyInstaller misses
hiddenimports = [
    # uvicorn internals
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.loops.asyncio',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.http.httptools_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.protocols.websockets.wsproto_impl',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'uvicorn.lifespan.off',
    # async
    'aiosqlite',
    'asyncio',
    'multiprocessing',
    # starlette / fastapi internals
    'starlette.responses',
    'starlette.routing',
    'starlette.middleware',
    'starlette.middleware.cors',
    # our own modules (sometimes missed if imported dynamically)
    'config',
    'db',
    'models',
    'calculator',
    'exporters',
    'filters',
    'interpolation',
    'api',
    'api.health',
    'api.workarea',
    'api.data',
    'api.export',
    'api.well',
    'api.processing',
    'api.calculator',
    'api.seismic',
    'api.rock_physics',
    'api.tag',
    'api.task',
    'api.chart',
    'api.horizon',
    'api.window_state',
    'parsers',
    'parsers.coordinates',
    'parsers.curves',
    'parsers.discrete',
    'parsers.interpretation',
    'parsers.layers',
    'parsers.lithology',
    'parsers.time_depth',
    'parsers.trajectory',
    'parsers.well_attributes',
    # segyio C extension
    'segyio',
    'segyio._segyio',
    # pkg_resources / setuptools vendored deps (needed by pyi_rth_pkgres)
    'pkg_resources',
    'jaraco',
    'jaraco.text',
    'jaraco.functools',
    'jaraco.context',
]

a = Analysis(
    ['entry.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('schema.sql', '.'),
        ('api', 'api'),
        ('parsers', 'parsers'),
    ],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter', 'matplotlib', 'scipy', 'pandas',
        'PIL', 'IPython', 'jupyter', 'notebook',
        'pytest', 'pip', 'wheel',
    ],
    noarchive=False,
    cipher=block_cipher,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='petrosoft-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='petrosoft-server',
)
