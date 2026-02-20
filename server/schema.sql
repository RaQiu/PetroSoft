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
