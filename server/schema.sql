-- PetroSoft V1.0 Database Schema

CREATE TABLE IF NOT EXISTS wells (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    x REAL,
    y REAL,
    kb REAL,
    td REAL
);

CREATE TABLE IF NOT EXISTS trajectories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    well_id INTEGER NOT NULL,
    depth REAL NOT NULL,
    inclination REAL,
    azimuth REAL,
    FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS curves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    well_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    unit TEXT DEFAULT '',
    sample_interval REAL DEFAULT 0.125,
    FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
    UNIQUE(well_id, name)
);

CREATE TABLE IF NOT EXISTS curve_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curve_id INTEGER NOT NULL,
    depth REAL NOT NULL,
    value REAL,
    FOREIGN KEY (curve_id) REFERENCES curves(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS layers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    well_id INTEGER NOT NULL,
    formation TEXT,
    top_depth REAL NOT NULL,
    bottom_depth REAL NOT NULL,
    FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lithology (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    well_id INTEGER NOT NULL,
    top_depth REAL NOT NULL,
    bottom_depth REAL NOT NULL,
    description TEXT,
    FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interpretations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    well_id INTEGER NOT NULL,
    top_depth REAL NOT NULL,
    bottom_depth REAL NOT NULL,
    conclusion TEXT,
    category TEXT,
    FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS discrete_curves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    well_id INTEGER NOT NULL,
    curve_name TEXT NOT NULL,
    depth REAL NOT NULL,
    value REAL,
    FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_curve_data_curve_id ON curve_data(curve_id);
CREATE INDEX IF NOT EXISTS idx_curve_data_depth ON curve_data(curve_id, depth);
CREATE INDEX IF NOT EXISTS idx_trajectories_well ON trajectories(well_id);
CREATE INDEX IF NOT EXISTS idx_layers_well ON layers(well_id);
CREATE INDEX IF NOT EXISTS idx_lithology_well ON lithology(well_id);
CREATE INDEX IF NOT EXISTS idx_interpretations_well ON interpretations(well_id);
CREATE INDEX IF NOT EXISTS idx_discrete_curves_well ON discrete_curves(well_id);

-- Time-depth relationship table
CREATE TABLE IF NOT EXISTS time_depth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    well_id INTEGER NOT NULL,
    depth REAL NOT NULL,
    time REAL NOT NULL,
    FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_time_depth_well ON time_depth(well_id);

-- Well point attributes table
CREATE TABLE IF NOT EXISTS well_attributes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    well_id INTEGER NOT NULL,
    attribute_name TEXT NOT NULL,
    attribute_value TEXT,
    FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_well_attributes_well ON well_attributes(well_id);
CREATE INDEX IF NOT EXISTS idx_well_attributes_name ON well_attributes(well_id, attribute_name);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#409eff',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 井-标签关联表
CREATE TABLE IF NOT EXISTS well_tags (
    well_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (well_id, tag_id),
    FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 任务记录表
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_type TEXT NOT NULL,
    well_name TEXT NOT NULL,
    params TEXT DEFAULT '{}',
    status TEXT DEFAULT 'success',
    result_message TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 成果图表
CREATE TABLE IF NOT EXISTS result_charts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    chart_type TEXT NOT NULL,
    thumbnail TEXT,
    config TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Horizons table
CREATE TABLE IF NOT EXISTS horizons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    domain TEXT DEFAULT 'time',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Horizon data points (inline/crossline grid or scattered)
CREATE TABLE IF NOT EXISTS horizon_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    horizon_id INTEGER NOT NULL,
    inline_no INTEGER,
    crossline_no INTEGER,
    x REAL,
    y REAL,
    value REAL NOT NULL,
    FOREIGN KEY (horizon_id) REFERENCES horizons(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_horizon_data_horizon ON horizon_data(horizon_id);
CREATE INDEX IF NOT EXISTS idx_horizon_data_grid ON horizon_data(horizon_id, inline_no, crossline_no);

-- Seismic survey grids (测网)
CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    inline_min INTEGER NOT NULL,
    inline_max INTEGER NOT NULL,
    inline_step INTEGER NOT NULL DEFAULT 1,
    crossline_min INTEGER NOT NULL,
    crossline_max INTEGER NOT NULL,
    crossline_step INTEGER NOT NULL DEFAULT 1,
    origin_x REAL DEFAULT 0,
    origin_y REAL DEFAULT 0,
    inline_dx REAL DEFAULT 0,
    inline_dy REAL DEFAULT 0,
    crossline_dx REAL DEFAULT 0,
    crossline_dy REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Open child windows state (for workarea restore)
CREATE TABLE IF NOT EXISTS open_windows (
    window_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    pos_x REAL,
    pos_y REAL,
    width REAL,
    height REAL,
    preset_data TEXT DEFAULT '{}'
);

-- Seismic volumes table
CREATE TABLE IF NOT EXISTS seismic_volumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    n_inlines INTEGER,
    n_crosslines INTEGER,
    n_samples INTEGER,
    sample_interval REAL,
    inline_min INTEGER,
    inline_max INTEGER,
    crossline_min INTEGER,
    crossline_max INTEGER,
    format_code INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);
