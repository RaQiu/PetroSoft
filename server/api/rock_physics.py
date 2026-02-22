"""Rock physics calculation API endpoints."""

import math
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from db import get_connection, get_or_create_well

router = APIRouter(prefix="/rock-physics", tags=["rock-physics"])


# ── helper: read one curve ────────────────────────────────────────────
async def _read_curve(db, well_id: int, curve_name: str):
    """Read curve data, return (depths, values). Raise if not found."""
    cursor = await db.execute(
        "SELECT c.id, c.sample_interval FROM curves c "
        "WHERE c.well_id = ? AND c.name = ?",
        (well_id, curve_name),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"曲线 '{curve_name}' 不存在")
    cursor = await db.execute(
        "SELECT depth, value FROM curve_data WHERE curve_id = ? ORDER BY depth",
        (row[0],),
    )
    rows = await cursor.fetchall()
    return [r[0] for r in rows], [r[1] for r in rows], row[1]


async def _save_curve(db, well_id: int, name: str, depths, values, sample_interval):
    """Save (or overwrite) a result curve."""
    await db.execute(
        """INSERT INTO curves (well_id, name, unit, sample_interval) VALUES (?, ?, '', ?)
           ON CONFLICT(well_id, name) DO UPDATE SET sample_interval=?""",
        (well_id, name, sample_interval, sample_interval),
    )
    cursor = await db.execute(
        "SELECT id FROM curves WHERE well_id = ? AND name = ?", (well_id, name)
    )
    cid = (await cursor.fetchone())[0]
    await db.execute("DELETE FROM curve_data WHERE curve_id = ?", (cid,))
    batch = [(cid, d, v) for d, v in zip(depths, values)]
    await db.executemany(
        "INSERT INTO curve_data (curve_id, depth, value) VALUES (?, ?, ?)", batch
    )


# ══════════════════════════════════════════════════════════════════════
# 1. 泥质含量 Vsh (4 methods: single-curve + 3 crossplot)
# ══════════════════════════════════════════════════════════════════════
class VshRequest(BaseModel):
    workarea_path: str
    method: str = "single_curve"  # single_curve / neutron_sonic / neutron_density / density_sonic
    # ── 单曲线法参数 ──
    gr_curve: str = "GR"
    gr_clean: float = 0.0       # 纯砂岩段测井值
    gr_clay: float = 100.0      # 纯泥岩段测井值
    regional_coeff: float = 2.0 # 地区经验系数 (1=线性, 2=Larionov老, 3.7=Larionov新)
    # ── 中子参数(交会法共用) ──
    cnl_curve: str = "CNL"
    cnl_matrix: float = -0.02   # 骨架中子值
    cnl_clay: float = 0.28      # 泥质中子值
    # ── 声波参数 ──
    dt_curve: str = "DT"
    dt_matrix: float = 182.0    # 骨架声波时差值(us/m)
    dt_fluid: float = 620.0     # 流体声波时差值
    dt_clay: float = 328.0      # 泥质声波时差值
    # ── 密度参数 ──
    den_curve: str = "DEN"
    den_matrix: float = 2.65
    den_fluid: float = 1.0
    den_clay: float = 2.6
    # ── 输出 ──
    result_curve_name: str = "VSH"
    as_percent: bool = False     # 按百分数输出


def _clamp01(v):
    return max(0.0, min(1.0, v))


@router.post("/{well_name}/vsh")
async def calc_vsh(well_name: str, req: VshRequest):
    """Calculate clay volume (Vsh) using one of 4 methods."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)

        if req.method == "single_curve":
            # ── 单曲线法 ──
            depths, gr_vals, si = await _read_curve(db, well_id, req.gr_curve)
            rng = req.gr_clay - req.gr_clean
            if abs(rng) < 1e-10:
                raise HTTPException(status_code=400, detail="纯泥岩值必须大于纯砂岩值")
            coeff = req.regional_coeff
            result = []
            for v in gr_vals:
                if v is None:
                    result.append(None)
                    continue
                igr = _clamp01((v - req.gr_clean) / rng)
                if abs(coeff - 1.0) < 1e-6:
                    vsh = igr  # 线性
                else:
                    vsh = (2 ** (coeff * igr) - 1) / (2 ** coeff - 1)
                result.append(_clamp01(vsh))

        elif req.method == "neutron_sonic":
            # ── 中子-声波交会法 ──
            depths_n, cnl_vals, si = await _read_curve(db, well_id, req.cnl_curve)
            depths_d, dt_vals, _ = await _read_curve(db, well_id, req.dt_curve)
            dt_map = {round(d, 4): v for d, v in zip(depths_d, dt_vals)}
            cnl_denom = req.cnl_clay - req.cnl_matrix
            dt_denom = req.dt_clay - req.dt_matrix
            if abs(cnl_denom) < 1e-10 or abs(dt_denom) < 1e-10:
                raise HTTPException(status_code=400, detail="泥质值与骨架值不能相等")
            depths = depths_n
            result = []
            for d, cnl in zip(depths_n, cnl_vals):
                dt = dt_map.get(round(d, 4))
                if cnl is None or dt is None:
                    result.append(None)
                    continue
                vsh_n = (cnl - req.cnl_matrix) / cnl_denom
                vsh_dt = (dt - req.dt_matrix) / dt_denom
                result.append(_clamp01(min(vsh_n, vsh_dt)))

        elif req.method == "neutron_density":
            # ── 中子-密度交会法 ──
            depths_n, cnl_vals, si = await _read_curve(db, well_id, req.cnl_curve)
            depths_d, den_vals, _ = await _read_curve(db, well_id, req.den_curve)
            den_map = {round(d, 4): v for d, v in zip(depths_d, den_vals)}
            cnl_denom = req.cnl_clay - req.cnl_matrix
            den_denom = req.den_clay - req.den_matrix
            if abs(cnl_denom) < 1e-10 or abs(den_denom) < 1e-10:
                raise HTTPException(status_code=400, detail="泥质值与骨架值不能相等")
            depths = depths_n
            result = []
            for d, cnl in zip(depths_n, cnl_vals):
                den = den_map.get(round(d, 4))
                if cnl is None or den is None:
                    result.append(None)
                    continue
                vsh_n = (cnl - req.cnl_matrix) / cnl_denom
                vsh_den = (den - req.den_matrix) / den_denom
                result.append(_clamp01(min(vsh_n, vsh_den)))

        elif req.method == "density_sonic":
            # ── 密度-声波交会法 ──
            depths_d, den_vals, si = await _read_curve(db, well_id, req.den_curve)
            depths_t, dt_vals, _ = await _read_curve(db, well_id, req.dt_curve)
            dt_map = {round(d, 4): v for d, v in zip(depths_t, dt_vals)}
            den_denom = req.den_clay - req.den_matrix
            dt_denom = req.dt_clay - req.dt_matrix
            if abs(den_denom) < 1e-10 or abs(dt_denom) < 1e-10:
                raise HTTPException(status_code=400, detail="泥质值与骨架值不能相等")
            depths = depths_d
            result = []
            for d, den in zip(depths_d, den_vals):
                dt = dt_map.get(round(d, 4))
                if den is None or dt is None:
                    result.append(None)
                    continue
                vsh_den = (den - req.den_matrix) / den_denom
                vsh_dt = (dt - req.dt_matrix) / dt_denom
                result.append(_clamp01(min(vsh_den, vsh_dt)))

        else:
            raise HTTPException(status_code=400, detail=f"不支持的方法: {req.method}")

        # 百分数输出
        if req.as_percent:
            result = [v * 100 if v is not None else None for v in result]

        await _save_curve(db, well_id, req.result_curve_name, depths, result, si)
        await db.commit()
        return {"status": "ok", "message": f"泥质含量计算完成 → 曲线 '{req.result_curve_name}'"}


# ══════════════════════════════════════════════════════════════════════
# 2. 孔隙度 Porosity (4 methods with clay correction)
# ══════════════════════════════════════════════════════════════════════
class PorosityRequest(BaseModel):
    workarea_path: str
    method: str = "sonic"  # sonic / density / neutron / neutron_density_mean
    # ── 声波法参数 ──
    dt_curve: str = "DT"
    dt_matrix: float = 182.0
    dt_fluid: float = 620.0
    dt_clay: float = 328.0
    compaction_factor: float = 1.0  # 地层压实校正系数
    # ── 密度法参数 ──
    den_curve: str = "DEN"
    den_matrix: float = 2.65
    den_fluid: float = 1.0
    den_clay: float = 2.6
    # ── 中子法参数 ──
    cnl_curve: str = "CNL"
    cnl_clay: float = 0.28
    # ── 泥质校正(声波/密度/中子共用) ──
    vsh_curve: str = "VSH"
    vsh_cutoff: float = 0.4
    # ── 中子-密度几何平均 ──
    phi_neutron_curve: str = ""
    phi_density_curve: str = ""
    # ── 输出 ──
    result_curve_name: str = "POR"
    as_percent: bool = False


@router.post("/{well_name}/porosity")
async def calc_porosity(well_name: str, req: PorosityRequest):
    """Calculate porosity using one of 4 methods with optional clay correction."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)

        if req.method == "sonic":
            # ── 声波时差法 ──
            depths, dt_vals, si = await _read_curve(db, well_id, req.dt_curve)
            dt_fl_ma = req.dt_fluid - req.dt_matrix
            if abs(dt_fl_ma) < 1e-10:
                raise HTTPException(status_code=400, detail="流体声波与骨架声波不能相等")
            # Try to read Vsh for clay correction
            vsh_map = {}
            try:
                depths_v, vsh_vals, _ = await _read_curve(db, well_id, req.vsh_curve)
                vsh_map = {round(d, 4): v for d, v in zip(depths_v, vsh_vals)}
            except HTTPException:
                pass
            dt_sh_corr = (req.dt_clay - req.dt_matrix) / dt_fl_ma
            result = []
            for d, dt in zip(depths, dt_vals):
                if dt is None:
                    result.append(None)
                    continue
                phi = (dt - req.dt_matrix) / dt_fl_ma / req.compaction_factor
                vsh = vsh_map.get(round(d, 4))
                if vsh is not None and vsh < req.vsh_cutoff:
                    phi = phi - vsh * dt_sh_corr
                result.append(_clamp01(phi))

        elif req.method == "density":
            # ── 密度法 ──
            depths, den_vals, si = await _read_curve(db, well_id, req.den_curve)
            den_ma_fl = req.den_matrix - req.den_fluid
            if abs(den_ma_fl) < 1e-10:
                raise HTTPException(status_code=400, detail="骨架密度与流体密度不能相等")
            vsh_map = {}
            try:
                depths_v, vsh_vals, _ = await _read_curve(db, well_id, req.vsh_curve)
                vsh_map = {round(d, 4): v for d, v in zip(depths_v, vsh_vals)}
            except HTTPException:
                pass
            den_sh_corr = (req.den_matrix - req.den_clay) / den_ma_fl
            result = []
            for d, den in zip(depths, den_vals):
                if den is None:
                    result.append(None)
                    continue
                phi = (req.den_matrix - den) / den_ma_fl
                vsh = vsh_map.get(round(d, 4))
                if vsh is not None and vsh < req.vsh_cutoff:
                    phi = phi - vsh * den_sh_corr
                result.append(_clamp01(phi))

        elif req.method == "neutron":
            # ── 补偿中子法 ──
            depths, cnl_vals, si = await _read_curve(db, well_id, req.cnl_curve)
            vsh_map = {}
            try:
                depths_v, vsh_vals, _ = await _read_curve(db, well_id, req.vsh_curve)
                vsh_map = {round(d, 4): v for d, v in zip(depths_v, vsh_vals)}
            except HTTPException:
                pass
            result = []
            for d, cnl in zip(depths, cnl_vals):
                if cnl is None:
                    result.append(None)
                    continue
                phi = cnl
                vsh = vsh_map.get(round(d, 4))
                if vsh is not None and vsh < req.vsh_cutoff:
                    phi = cnl - vsh * req.cnl_clay
                result.append(_clamp01(phi))

        elif req.method == "neutron_density_mean":
            # ── 中子-密度几何平均 ──
            if not req.phi_neutron_curve or not req.phi_density_curve:
                raise HTTPException(status_code=400, detail="中子-密度几何平均法需要指定两条孔隙度曲线")
            depths_n, phi_n_vals, si = await _read_curve(db, well_id, req.phi_neutron_curve)
            depths_d, phi_d_vals, _ = await _read_curve(db, well_id, req.phi_density_curve)
            phi_d_map = {round(d, 4): v for d, v in zip(depths_d, phi_d_vals)}
            depths = depths_n
            result = []
            for d, phi_n in zip(depths_n, phi_n_vals):
                phi_d = phi_d_map.get(round(d, 4))
                if phi_n is None or phi_d is None or phi_n <= 0 or phi_d <= 0:
                    result.append(None)
                    continue
                result.append(_clamp01(math.sqrt(phi_n * phi_d)))

        else:
            raise HTTPException(status_code=400, detail=f"不支持的方法: {req.method}")

        if req.as_percent:
            result = [v * 100 if v is not None else None for v in result]

        await _save_curve(db, well_id, req.result_curve_name, depths, result, si)
        await db.commit()
        return {"status": "ok", "message": f"孔隙度计算完成 → 曲线 '{req.result_curve_name}'"}


# ══════════════════════════════════════════════════════════════════════
# 2b. 总孔隙度 Total Porosity (density-based with Vsh correction)
# ══════════════════════════════════════════════════════════════════════
class TotalPorosityRequest(BaseModel):
    workarea_path: str
    den_curve: str = "DEN"
    vsh_curve: str = "VSH"
    den_fluid: float = 1.0
    den_matrix: float = 2.65
    den_clay: float = 2.6
    result_curve_name: str = "PHIT"
    as_percent: bool = False


@router.post("/{well_name}/total-porosity")
async def calc_total_porosity(well_name: str, req: TotalPorosityRequest):
    """Calculate total porosity: PHIT = (DEN_ma - DEN) / (DEN_ma - DEN_fl) - Vsh * (DEN_ma - DEN_sh) / (DEN_ma - DEN_fl)."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)
        depths, den_vals, si = await _read_curve(db, well_id, req.den_curve)
        depths_v, vsh_vals, _ = await _read_curve(db, well_id, req.vsh_curve)
        vsh_map = {round(d, 4): v for d, v in zip(depths_v, vsh_vals)}

        den_ma_fl = req.den_matrix - req.den_fluid
        if abs(den_ma_fl) < 1e-10:
            raise HTTPException(status_code=400, detail="骨架密度与流体密度不能相等")
        den_sh_corr = (req.den_matrix - req.den_clay) / den_ma_fl

        result = []
        for d, den in zip(depths, den_vals):
            vsh = vsh_map.get(round(d, 4))
            if den is None or vsh is None:
                result.append(None)
                continue
            phit = (req.den_matrix - den) / den_ma_fl - vsh * den_sh_corr
            result.append(_clamp01(phit))

        if req.as_percent:
            result = [v * 100 if v is not None else None for v in result]

        await _save_curve(db, well_id, req.result_curve_name, depths, result, si)
        await db.commit()
        return {"status": "ok", "message": f"总孔隙度计算完成 → 曲线 '{req.result_curve_name}'"}


# ══════════════════════════════════════════════════════════════════════
# 3. 渗透率 Permeability (from porosity, Kozeny-Carman empirical)
# ══════════════════════════════════════════════════════════════════════
class PermeabilityRequest(BaseModel):
    workarea_path: str
    phi_curve: str = "PHI"
    coeff_a: float = 1e4            # K = a * PHI^b
    coeff_b: float = 3.0
    result_curve_name: str = "PERM"


@router.post("/{well_name}/permeability")
async def calc_permeability(well_name: str, req: PermeabilityRequest):
    """Calculate permeability from porosity using K = a * PHI^b."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)
        depths, phi_vals, si = await _read_curve(db, well_id, req.phi_curve)

        result = []
        for v in phi_vals:
            if v is None or v <= 0:
                result.append(None)
                continue
            result.append(req.coeff_a * (v ** req.coeff_b))

        await _save_curve(db, well_id, req.result_curve_name, depths, result, si)
        await db.commit()
        return {"status": "ok", "message": f"渗透率计算完成 → 曲线 '{req.result_curve_name}'"}


# ══════════════════════════════════════════════════════════════════════
# 4. 含水饱和度 Sw (Archie equation)
# ══════════════════════════════════════════════════════════════════════
class SaturationRequest(BaseModel):
    workarea_path: str
    rt_curve: str = "RT"            # deep resistivity
    phi_curve: str = "PHI"          # porosity
    rw: float = 0.05                # formation water resistivity (ohm·m)
    a: float = 1.0                  # tortuosity factor
    m: float = 2.0                  # cementation exponent
    n: float = 2.0                  # saturation exponent
    result_curve_name: str = "SW"


@router.post("/{well_name}/saturation")
async def calc_saturation(well_name: str, req: SaturationRequest):
    """Calculate water saturation using Archie equation: Sw = (a*Rw / (PHI^m * Rt))^(1/n)."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)
        depths_rt, rt_vals, si = await _read_curve(db, well_id, req.rt_curve)
        depths_phi, phi_vals, _ = await _read_curve(db, well_id, req.phi_curve)

        # Build depth-indexed lookup for PHI
        phi_map = {}
        for d, v in zip(depths_phi, phi_vals):
            phi_map[round(d, 4)] = v

        result = []
        for d, rt in zip(depths_rt, rt_vals):
            phi = phi_map.get(round(d, 4))
            if rt is None or phi is None or phi <= 0 or rt <= 0:
                result.append(None)
                continue
            sw = (req.a * req.rw / (phi ** req.m * rt)) ** (1.0 / req.n)
            result.append(max(0.0, min(1.0, sw)))

        await _save_curve(db, well_id, req.result_curve_name, depths_rt, result, si)
        await db.commit()
        return {"status": "ok", "message": f"含水饱和度计算完成 → 曲线 '{req.result_curve_name}'"}


# ══════════════════════════════════════════════════════════════════════
# 5. 横波预测 (Castagna mudrock line or linear regression)
# ══════════════════════════════════════════════════════════════════════
class PredictVsRequest(BaseModel):
    workarea_path: str
    dt_curve: str = "DT"            # P-wave slowness (us/ft)
    method: str = "castagna"        # castagna / custom
    coeff_a: float = 0.8621         # Vs = a * Vp + b (m/s)
    coeff_b: float = -1172.4
    result_curve_name: str = "DTS"  # result is S-wave slowness (us/ft)


@router.post("/{well_name}/predict-vs")
async def predict_vs(well_name: str, req: PredictVsRequest):
    """Predict S-wave slowness from P-wave slowness using Castagna or custom model."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)
        depths, dt_vals, si = await _read_curve(db, well_id, req.dt_curve)

        # Castagna default: Vs(m/s) = 0.8621 * Vp(m/s) - 1172.4
        a = req.coeff_a
        b = req.coeff_b

        result = []
        for v in dt_vals:
            if v is None or v <= 0:
                result.append(None)
                continue
            # DT (us/ft) → Vp (m/s): Vp = 304800 / DT
            vp = 304800.0 / v
            vs = a * vp + b
            if vs <= 0:
                result.append(None)
                continue
            # Vs (m/s) → DTS (us/ft): DTS = 304800 / Vs
            dts = 304800.0 / vs
            result.append(dts)

        await _save_curve(db, well_id, req.result_curve_name, depths, result, si)
        await db.commit()
        return {"status": "ok", "message": f"横波预测完成 → 曲线 '{req.result_curve_name}'"}


# ══════════════════════════════════════════════════════════════════════
# 6. 弹性参数 (from DT, DTS, DEN)
# ══════════════════════════════════════════════════════════════════════
class ElasticParamsRequest(BaseModel):
    workarea_path: str
    dt_curve: str = "DT"            # P-wave slowness (us/ft)
    dts_curve: str = "DTS"          # S-wave slowness (us/ft)
    den_curve: str = "DEN"          # density (g/cc)
    calc_items: list[str] = [       # which to compute
        "AI", "SI", "PR", "YM", "LR", "MR"
    ]
    # AI=纵波阻抗, SI=横波阻抗, PR=泊松比, YM=杨氏模量, LR=λρ, MR=μρ
    # Extended: VPVS=纵横波速度比, E=杨氏模量, K=体积模量, Mu=剪切模量,
    #   Lambda=拉梅常数, LambdaRhob=Lambda*ρ, MuRhob=Mu*ρ
    custom_names: dict[str, str] = {}  # optional custom output curve names


@router.post("/{well_name}/elastic-params")
async def calc_elastic_params(well_name: str, req: ElasticParamsRequest):
    """Calculate elastic parameters from DT, DTS, DEN."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)

        depths_dt, dt_vals, si = await _read_curve(db, well_id, req.dt_curve)
        depths_dts, dts_vals, _ = await _read_curve(db, well_id, req.dts_curve)
        depths_den, den_vals, _ = await _read_curve(db, well_id, req.den_curve)

        # Build depth-indexed lookups
        dts_map = {round(d, 4): v for d, v in zip(depths_dts, dts_vals)}
        den_map = {round(d, 4): v for d, v in zip(depths_den, den_vals)}

        # Prepare result arrays
        results = {item: [] for item in req.calc_items}

        for d, dt in zip(depths_dt, dt_vals):
            dk = round(d, 4)
            dts = dts_map.get(dk)
            den = den_map.get(dk)

            if dt is None or dts is None or den is None or dt <= 0 or dts <= 0 or den <= 0:
                for item in req.calc_items:
                    results[item].append(None)
                continue

            # Convert: DT(us/ft) → Vp(m/s), DTS(us/ft) → Vs(m/s), DEN(g/cc) → ρ(kg/m³)
            vp = 304800.0 / dt
            vs = 304800.0 / dts
            rho = den * 1000.0  # g/cc → kg/m³

            vp2 = vp * vp
            vs2 = vs * vs

            for item in req.calc_items:
                if item == "AI":
                    results[item].append(vp * den)           # (m/s)·(g/cc)
                elif item == "SI":
                    results[item].append(vs * den)
                elif item == "VPVS":
                    if abs(vs) < 1e-10:
                        results[item].append(None)
                    else:
                        results[item].append(vp / vs)
                elif item == "PR":
                    denom = 2 * (vp2 - vs2)
                    if abs(denom) < 1e-10:
                        results[item].append(None)
                    else:
                        results[item].append((vp2 - 2 * vs2) / denom)
                elif item == "YM" or item == "E":
                    denom = vp2 - vs2
                    if abs(denom) < 1e-10:
                        results[item].append(None)
                    else:
                        ym = rho * vs2 * (3 * vp2 - 4 * vs2) / denom
                        results[item].append(ym / 1e9)       # Pa → GPa
                elif item == "K":
                    k_val = rho * (vp2 - 4.0/3.0 * vs2)
                    results[item].append(k_val / 1e9)         # Pa → GPa
                elif item == "Mu":
                    mu_val = rho * vs2
                    results[item].append(mu_val / 1e9)        # Pa → GPa
                elif item == "Lambda":
                    lam = rho * (vp2 - 2 * vs2)
                    results[item].append(lam / 1e9)           # Pa → GPa
                elif item == "LR" or item == "LambdaRhob":
                    lr = rho * (vp2 - 2 * vs2)
                    results[item].append(lr / 1e9)
                elif item == "MR" or item == "MuRhob":
                    mr = rho * vs2
                    results[item].append(mr / 1e9)
                else:
                    results[item].append(None)

        saved = []
        for item in req.calc_items:
            curve_name = req.custom_names.get(item, item)
            await _save_curve(db, well_id, curve_name, depths_dt, results[item], si)
            saved.append(curve_name)

        await db.commit()
        return {
            "status": "ok",
            "message": f"弹性参数计算完成 → 曲线 {', '.join(saved)}",
        }


# ══════════════════════════════════════════════════════════════════════
# 7. 流体替换 (simplified Gassmann)
# ══════════════════════════════════════════════════════════════════════
class FluidSubRequest(BaseModel):
    workarea_path: str
    dt_curve: str = "DT"
    dts_curve: str = "DTS"
    den_curve: str = "DEN"
    phi_curve: str = "PHI"
    k_mineral: float = 38.0         # 骨架体积模量 (GPa), quartz ~38
    k_fluid_orig: float = 2.2       # 原始流体体积模量 (GPa), brine ~2.2
    rho_fluid_orig: float = 1.05    # 原始流体密度 (g/cc)
    k_fluid_new: float = 0.7        # 新流体体积模量 (GPa), oil ~0.7, gas ~0.02
    rho_fluid_new: float = 0.8      # 新流体密度 (g/cc)
    result_dt: str = "DT_FS"
    result_den: str = "DEN_FS"


@router.post("/{well_name}/fluid-sub")
async def fluid_substitution(well_name: str, req: FluidSubRequest):
    """Gassmann fluid substitution: replace pore fluid and recalculate Vp & density."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)

        depths_dt, dt_vals, si = await _read_curve(db, well_id, req.dt_curve)
        depths_dts, dts_vals, _ = await _read_curve(db, well_id, req.dts_curve)
        depths_den, den_vals, _ = await _read_curve(db, well_id, req.den_curve)
        depths_phi, phi_vals, _ = await _read_curve(db, well_id, req.phi_curve)

        # Index maps
        dts_map = {round(d, 4): v for d, v in zip(depths_dts, dts_vals)}
        den_map = {round(d, 4): v for d, v in zip(depths_den, den_vals)}
        phi_map = {round(d, 4): v for d, v in zip(depths_phi, phi_vals)}

        k_min = req.k_mineral * 1e9     # GPa → Pa
        k_fl_o = req.k_fluid_orig * 1e9
        k_fl_n = req.k_fluid_new * 1e9

        result_dt_vals = []
        result_den_vals = []

        for d, dt in zip(depths_dt, dt_vals):
            dk = round(d, 4)
            dts = dts_map.get(dk)
            den = den_map.get(dk)
            phi = phi_map.get(dk)

            if any(x is None or x <= 0 for x in [dt, dts, den]) or phi is None or phi <= 0:
                result_dt_vals.append(dt)
                result_den_vals.append(den)
                continue

            vp = 304800.0 / dt
            vs = 304800.0 / dts
            rho = den * 1000.0  # kg/m³

            mu = rho * vs * vs                  # shear modulus (Pa)
            k_sat = rho * (vp * vp - 4.0/3.0 * vs * vs)  # bulk modulus saturated

            # Gassmann: compute K_dry
            a_term = k_sat / (k_min - k_sat)
            b_term = k_fl_o / (phi * (k_min - k_fl_o))
            k_dry_term = a_term - b_term
            if abs(1 + k_dry_term) < 1e-15:
                result_dt_vals.append(dt)
                result_den_vals.append(den)
                continue
            k_dry = k_min * k_dry_term / (1 + k_dry_term)

            # New saturated bulk modulus with new fluid
            a2 = k_dry / (k_min - k_dry)
            b2 = k_fl_n / (phi * (k_min - k_fl_n))
            k_sat_new = k_min * (a2 + b2) / (1 + a2 + b2)

            # New density
            rho_new = rho + phi * (req.rho_fluid_new - req.rho_fluid_orig) * 1000.0

            # New Vp
            vp_new_sq = (k_sat_new + 4.0/3.0 * mu) / rho_new
            if vp_new_sq <= 0:
                result_dt_vals.append(dt)
                result_den_vals.append(den)
                continue
            vp_new = math.sqrt(vp_new_sq)
            dt_new = 304800.0 / vp_new

            result_dt_vals.append(dt_new)
            result_den_vals.append(rho_new / 1000.0)  # back to g/cc

        await _save_curve(db, well_id, req.result_dt, depths_dt, result_dt_vals, si)
        await _save_curve(db, well_id, req.result_den, depths_dt, result_den_vals, si)
        await db.commit()

        return {
            "status": "ok",
            "message": f"流体替换完成 → 曲线 '{req.result_dt}', '{req.result_den}'",
        }


# ══════════════════════════════════════════════════════════════════════
# 8. 校正纵波速度 (Faust)
# ══════════════════════════════════════════════════════════════════════
class CorrectVpRequest(BaseModel):
    workarea_path: str
    rt_curve: str = "RT"
    coefficient: float = 2000.0
    result_curve_name: str = "VP_Faust"


@router.post("/{well_name}/correct-vp")
async def correct_vp(well_name: str, req: CorrectVpRequest):
    """Correct Vp using Faust formula: VP = coefficient * (depth * RT)^(1/6)."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)
        depths, rt_vals, si = await _read_curve(db, well_id, req.rt_curve)

        result = []
        for d, rt in zip(depths, rt_vals):
            if rt is None or rt <= 0 or d <= 0:
                result.append(None)
                continue
            vp = req.coefficient * (d * rt) ** (1.0 / 6.0)
            result.append(vp)

        await _save_curve(db, well_id, req.result_curve_name, depths, result, si)
        await db.commit()
        return {"status": "ok", "message": f"纵波速度校正完成 → 曲线 '{req.result_curve_name}'"}


# ══════════════════════════════════════════════════════════════════════
# 9. 校正密度曲线 (Castagna / Gardner)
# ══════════════════════════════════════════════════════════════════════
class CorrectDensityRequest(BaseModel):
    workarea_path: str
    method: str = "castagna"  # castagna / gardner
    vp_curve: str = "VP"
    lithology: str = "泥岩"    # 泥岩 / 砂岩 / 石灰岩
    # Castagna coefficients (presets by lithology, can be overridden)
    a: float = -0.0261
    b: float = 0.373
    c: float = 1.458
    # Gardner coefficients
    d: float = 1.75
    f: float = 0.265
    result_curve_name: str = "RHOB_Casta"


@router.post("/{well_name}/correct-density")
async def correct_density(well_name: str, req: CorrectDensityRequest):
    """Correct density using Castagna or Gardner formula."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)
        depths, vp_vals, si = await _read_curve(db, well_id, req.vp_curve)

        result = []
        if req.method == "castagna":
            # RHOB = A*(VP/1000)² + B*(VP/1000) + C
            for vp in vp_vals:
                if vp is None or vp <= 0:
                    result.append(None)
                    continue
                vp_km = vp / 1000.0
                rhob = req.a * vp_km * vp_km + req.b * vp_km + req.c
                result.append(max(0.1, rhob))
        elif req.method == "gardner":
            # RHOB = D * VP^F  (VP in m/s)
            for vp in vp_vals:
                if vp is None or vp <= 0:
                    result.append(None)
                    continue
                rhob = req.d * (vp ** req.f)
                result.append(max(0.1, rhob))
        else:
            raise HTTPException(status_code=400, detail=f"不支持的方法: {req.method}")

        await _save_curve(db, well_id, req.result_curve_name, depths, result, si)
        await db.commit()
        return {"status": "ok", "message": f"密度校正完成 → 曲线 '{req.result_curve_name}'"}


# ══════════════════════════════════════════════════════════════════════
# 10. 特征曲线重构
# ══════════════════════════════════════════════════════════════════════
class CurveReconstructRequest(BaseModel):
    workarea_path: str
    low_freq_curve: str
    high_freq_curve: str
    method: str = "reconstruct"  # reconstruct / sonic_correct
    max_freq: float = 80.0
    invert_high: bool = False
    log_high: bool = False
    correction_factor: float = 0.1
    result_curve_name: str = "RECON"


@router.post("/{well_name}/curve-reconstruct")
async def curve_reconstruct(well_name: str, req: CurveReconstructRequest):
    """Reconstruct characteristic curve from low and high frequency components."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)
        depths_lo, lo_vals, si = await _read_curve(db, well_id, req.low_freq_curve)
        depths_hi, hi_vals, _ = await _read_curve(db, well_id, req.high_freq_curve)
        hi_map = {round(d, 4): v for d, v in zip(depths_hi, hi_vals)}

        result = []
        for d, lo in zip(depths_lo, lo_vals):
            hi = hi_map.get(round(d, 4))
            if lo is None or hi is None:
                result.append(lo)
                continue
            # Process high-freq component
            processed = hi
            if req.invert_high:
                processed = -processed if processed != 0 else 0
            if req.log_high and processed > 0:
                processed = math.log10(processed)

            if req.method == "reconstruct":
                out = lo + req.correction_factor * processed
            elif req.method == "sonic_correct":
                # Normalize high-freq relative to its value
                if abs(hi) > 1e-10:
                    norm = processed / abs(hi)
                else:
                    norm = 0
                out = lo * (1 + req.correction_factor * norm)
            else:
                out = lo
            result.append(out)

        await _save_curve(db, well_id, req.result_curve_name, depths_lo, result, si)
        await db.commit()
        return {"status": "ok", "message": f"特征曲线重构完成 → 曲线 '{req.result_curve_name}'"}


# ══════════════════════════════════════════════════════════════════════
# 11. 自适应模型 (经验岩石物理)
# ══════════════════════════════════════════════════════════════════════
class AdaptiveModelRequest(BaseModel):
    workarea_path: str
    rock_type: str = "sand_shale"  # sand_shale / carbonate
    fluid_type: str = "oil_water"  # oil_water / gas_water / oil
    phi_curve: str = "PHI"
    sw_curve: str = "SW"
    dt_curve: str = "DT"
    den_curve: str = "DEN"
    output_items: list[str] = ["VP_em", "VS_em", "RHOB_em"]


@router.post("/{well_name}/adaptive-model")
async def adaptive_model(well_name: str, req: AdaptiveModelRequest):
    """Adaptive rock physics model using empirical relations (Han/Castagna)."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)
        depths, phi_vals, si = await _read_curve(db, well_id, req.phi_curve)

        d_sw, sw_vals, _ = await _read_curve(db, well_id, req.sw_curve)
        d_dt, dt_vals, _ = await _read_curve(db, well_id, req.dt_curve)
        d_den, den_vals, _ = await _read_curve(db, well_id, req.den_curve)
        sw_map = {round(d, 4): v for d, v in zip(d_sw, sw_vals)}
        dt_map = {round(d, 4): v for d, v in zip(d_dt, dt_vals)}
        den_map = {round(d, 4): v for d, v in zip(d_den, den_vals)}

        results = {item: [] for item in req.output_items}

        for d, phi in zip(depths, phi_vals):
            dk = round(d, 4)
            sw = sw_map.get(dk)
            dt = dt_map.get(dk)
            den = den_map.get(dk)

            if phi is None or sw is None or phi < 0:
                for item in req.output_items:
                    results[item].append(None)
                continue

            phi_c = max(0.001, min(phi, 0.5))
            sw_c = max(0.0, min(sw if sw is not None else 1.0, 1.0))

            # Empirical VP model (Han-like)
            if req.rock_type == "sand_shale":
                vp = 5590 - 6930 * phi_c - 2180 * (1 - sw_c) * 0.3
            else:  # carbonate
                vp = 5800 - 5100 * phi_c

            # Fluid effect
            if req.fluid_type == "gas_water":
                vp -= 300 * (1 - sw_c)
            elif req.fluid_type == "oil":
                vp -= 100 * (1 - sw_c)

            # VS from mudrock line
            vs = 0.8621 * vp - 1172.4
            vs = max(vs, 100)

            # Density from mixing
            rho_ma = 2.65 if req.rock_type == "sand_shale" else 2.71
            rho_fl = 1.0 * sw_c + 0.8 * (1 - sw_c)
            if req.fluid_type == "gas_water":
                rho_fl = 1.0 * sw_c + 0.15 * (1 - sw_c)
            rhob = (1 - phi_c) * rho_ma + phi_c * rho_fl

            rho_kg = rhob * 1000
            k_val = rho_kg * (vp * vp - 4.0 / 3.0 * vs * vs) / 1e9
            mu_val = rho_kg * vs * vs / 1e9

            for item in req.output_items:
                if item == "VP_em":
                    results[item].append(vp)
                elif item == "VS_em":
                    results[item].append(vs)
                elif item == "RHOB_em":
                    results[item].append(rhob)
                elif item == "K_em":
                    results[item].append(k_val)
                elif item == "Mu_em":
                    results[item].append(mu_val)
                else:
                    results[item].append(None)

        saved = []
        for item in req.output_items:
            await _save_curve(db, well_id, item, depths, results[item], si)
            saved.append(item)
        await db.commit()
        return {"status": "ok", "message": f"自适应模型计算完成 → 曲线 {', '.join(saved)}"}


# ══════════════════════════════════════════════════════════════════════
# 12. 砂泥岩模型 (VRH + Gassmann)
# ══════════════════════════════════════════════════════════════════════
class SandShaleModelRequest(BaseModel):
    workarea_path: str
    phi_curve: str = "PHI"
    vsh_curve: str = "VSH"
    sw_curve: str = "SW"
    # Sand parameters
    sand_rho: float = 2.65
    sand_vp: float = 6040.0
    sand_vs: float = 4120.0
    sand_aspect: float = 0.12
    # Shale parameters
    shale_rho: float = 2.6
    shale_vp: float = 3410.0
    shale_vs: float = 1630.0
    shale_aspect: float = 0.03
    # Fluid parameters
    fluid_type: str = "oil_water"  # oil_water / gas_water
    oil_rho: float = 0.8
    oil_vp: float = 1200.0
    water_rho: float = 1.02
    water_vp: float = 1600.0
    output_items: list[str] = ["VP_sm", "VS_sm", "RHOB_sm"]


@router.post("/{well_name}/sand-shale-model")
async def sand_shale_model(well_name: str, req: SandShaleModelRequest):
    """Sand-shale model using VRH mixing + simplified Gassmann."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)
        depths, phi_vals, si = await _read_curve(db, well_id, req.phi_curve)
        d_vsh, vsh_vals, _ = await _read_curve(db, well_id, req.vsh_curve)
        d_sw, sw_vals, _ = await _read_curve(db, well_id, req.sw_curve)
        vsh_map = {round(d, 4): v for d, v in zip(d_vsh, vsh_vals)}
        sw_map = {round(d, 4): v for d, v in zip(d_sw, sw_vals)}

        # Compute mineral moduli
        sand_K = req.sand_rho * 1000 * (req.sand_vp**2 - 4/3 * req.sand_vs**2) / 1e9
        sand_Mu = req.sand_rho * 1000 * req.sand_vs**2 / 1e9
        shale_K = req.shale_rho * 1000 * (req.shale_vp**2 - 4/3 * req.shale_vs**2) / 1e9
        shale_Mu = req.shale_rho * 1000 * req.shale_vs**2 / 1e9

        # Fluid moduli
        K_water = req.water_rho * 1000 * req.water_vp**2 / 1e9
        K_oil = req.oil_rho * 1000 * req.oil_vp**2 / 1e9

        results = {item: [] for item in req.output_items}

        for d, phi in zip(depths, phi_vals):
            dk = round(d, 4)
            vsh = vsh_map.get(dk)
            sw = sw_map.get(dk)

            if phi is None or vsh is None or sw is None or phi < 0:
                for item in req.output_items:
                    results[item].append(None)
                continue

            phi_c = max(0.001, min(phi, 0.45))
            vsh_c = max(0.0, min(vsh, 1.0))
            sw_c = max(0.0, min(sw, 1.0))

            # VRH average for mineral mixture
            f_sand = 1.0 - vsh_c
            K_voigt = f_sand * sand_K + vsh_c * shale_K
            K_reuss = 1.0 / (f_sand / max(sand_K, 0.01) + vsh_c / max(shale_K, 0.01)) if (sand_K > 0 and shale_K > 0) else K_voigt
            K_vrh = 0.5 * (K_voigt + K_reuss)

            Mu_voigt = f_sand * sand_Mu + vsh_c * shale_Mu
            Mu_reuss = 1.0 / (f_sand / max(sand_Mu, 0.01) + vsh_c / max(shale_Mu, 0.01)) if (sand_Mu > 0 and shale_Mu > 0) else Mu_voigt
            Mu_vrh = 0.5 * (Mu_voigt + Mu_reuss)

            rho_ma = f_sand * req.sand_rho + vsh_c * req.shale_rho

            # Dry rock moduli (simplified critical porosity model)
            phi_c_crit = 0.4
            K_dry = K_vrh * (1 - phi_c / phi_c_crit) if phi_c < phi_c_crit else 0.01
            Mu_dry = Mu_vrh * (1 - phi_c / phi_c_crit) if phi_c < phi_c_crit else 0.01
            K_dry = max(K_dry, 0.01)
            Mu_dry = max(Mu_dry, 0.01)

            # Fluid mixing (Wood's equation)
            K_fl = 1.0 / (sw_c / max(K_water, 0.001) + (1 - sw_c) / max(K_oil, 0.001))
            rho_fl = sw_c * req.water_rho + (1 - sw_c) * req.oil_rho

            # Gassmann fluid substitution
            K_min = K_vrh
            if abs(K_min - K_dry) < 1e-10 or abs(K_min - K_fl) < 1e-10:
                K_sat = K_dry
            else:
                a_g = K_dry / (K_min - K_dry)
                b_g = K_fl / (phi_c * (K_min - K_fl))
                K_sat = K_min * (a_g + b_g) / (1 + a_g + b_g)
            Mu_sat = Mu_dry

            # Bulk density
            rhob = (1 - phi_c) * rho_ma + phi_c * rho_fl

            # VP, VS
            rho_kg = rhob * 1000
            vp_sq = (K_sat * 1e9 + 4.0/3.0 * Mu_sat * 1e9) / rho_kg
            vs_sq = Mu_sat * 1e9 / rho_kg
            vp = math.sqrt(max(vp_sq, 0))
            vs = math.sqrt(max(vs_sq, 0))

            for item in req.output_items:
                if item == "VP_sm":
                    results[item].append(vp)
                elif item == "VS_sm":
                    results[item].append(vs)
                elif item == "RHOB_sm":
                    results[item].append(rhob)
                elif item == "K_sm":
                    results[item].append(K_sat)
                elif item == "Mu_sm":
                    results[item].append(Mu_sat)
                else:
                    results[item].append(None)

        saved = []
        for item in req.output_items:
            await _save_curve(db, well_id, item, depths, results[item], si)
            saved.append(item)
        await db.commit()
        return {"status": "ok", "message": f"砂泥岩模型计算完成 → 曲线 {', '.join(saved)}"}


# ══════════════════════════════════════════════════════════════════════
# 13. 计算弹性阻抗 (Connolly 1999)
# ══════════════════════════════════════════════════════════════════════
class AngleItem(BaseModel):
    angle: float = 15.0
    result_name: str = "EI_15"


class ElasticImpedanceRequest(BaseModel):
    workarea_path: str
    vp_curve: str = "VP"
    vs_curve: str = "VS"
    den_curve: str = "DEN"
    angles: List[AngleItem] = [AngleItem(angle=15, result_name="EI_15")]


@router.post("/{well_name}/elastic-impedance")
async def calc_elastic_impedance(well_name: str, req: ElasticImpedanceRequest):
    """Calculate elastic impedance using Connolly (1999) formula."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)
        depths, vp_vals, si = await _read_curve(db, well_id, req.vp_curve)
        d_vs, vs_vals, _ = await _read_curve(db, well_id, req.vs_curve)
        d_den, den_vals, _ = await _read_curve(db, well_id, req.den_curve)
        vs_map = {round(d, 4): v for d, v in zip(d_vs, vs_vals)}
        den_map = {round(d, 4): v for d, v in zip(d_den, den_vals)}

        # Compute averages for K = (VS_avg/VP_avg)²
        vp_sum, vs_sum, count = 0, 0, 0
        for d, vp in zip(depths, vp_vals):
            vs = vs_map.get(round(d, 4))
            if vp and vs and vp > 0 and vs > 0:
                vp_sum += vp
                vs_sum += vs
                count += 1
        if count == 0:
            raise HTTPException(status_code=400, detail="没有有效数据点")
        K = (vs_sum / count / (vp_sum / count)) ** 2

        saved = []
        for angle_item in req.angles:
            theta = math.radians(angle_item.angle)
            sin2 = math.sin(theta) ** 2
            tan2 = math.tan(theta) ** 2

            a_exp = 1 + tan2
            b_exp = -8 * K * sin2
            c_exp = 1 - 4 * K * sin2

            result = []
            for d, vp in zip(depths, vp_vals):
                dk = round(d, 4)
                vs = vs_map.get(dk)
                den = den_map.get(dk)
                if vp is None or vs is None or den is None or vp <= 0 or vs <= 0 or den <= 0:
                    result.append(None)
                    continue
                ei = (vp ** a_exp) * (vs ** b_exp) * (den ** c_exp)
                result.append(ei)

            await _save_curve(db, well_id, angle_item.result_name, depths, result, si)
            saved.append(angle_item.result_name)

        await db.commit()
        return {"status": "ok", "message": f"弹性阻抗计算完成 → 曲线 {', '.join(saved)}"}


# ══════════════════════════════════════════════════════════════════════
# 14. 流体替换 - 简化模型
# ══════════════════════════════════════════════════════════════════════
class FluidSubSimplifiedRequest(BaseModel):
    workarea_path: str
    phi_curve: str = "PHI"
    den_curve: str = "DEN"
    vp_curve: str = "VP"
    vs_curve: str = "VS"
    vsh_curve: str = "VSH"
    sw_curve: str = "SW"
    # SW mode
    sw_mode: str = "iterate_add"  # iterate_add / custom_range / from_curve
    sw_step: float = 0.05
    sw_iterations: int = 5
    sw_start: float = 0.0
    sw_end: float = 1.0
    sw_steps: int = 6
    target_sw_curve: str = ""
    # Skeleton parameters
    sand_rho: float = 2.65
    sand_vp: float = 6040.0
    sand_vs: float = 4120.0
    shale_rho: float = 2.6
    shale_vp: float = 3410.0
    shale_vs: float = 1630.0
    # Fluid parameters
    fluid_type: str = "oil_water"
    oil_rho: float = 0.8
    oil_vp: float = 1200.0
    water_rho: float = 1.02
    water_vp: float = 1600.0
    output_items: list[str] = ["VP", "VS", "RHOB"]


@router.post("/{well_name}/fluid-sub-simplified")
async def fluid_sub_simplified(well_name: str, req: FluidSubSimplifiedRequest):
    """Simplified fluid substitution model with iterative SW."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)
        depths, phi_vals, si = await _read_curve(db, well_id, req.phi_curve)
        d_den, den_vals, _ = await _read_curve(db, well_id, req.den_curve)
        d_vp, vp_vals, _ = await _read_curve(db, well_id, req.vp_curve)
        d_vs, vs_vals, _ = await _read_curve(db, well_id, req.vs_curve)
        d_vsh, vsh_vals, _ = await _read_curve(db, well_id, req.vsh_curve)
        d_sw, sw_vals, _ = await _read_curve(db, well_id, req.sw_curve)

        den_map = {round(d, 4): v for d, v in zip(d_den, den_vals)}
        vp_map = {round(d, 4): v for d, v in zip(d_vp, vp_vals)}
        vs_map = {round(d, 4): v for d, v in zip(d_vs, vs_vals)}
        vsh_map = {round(d, 4): v for d, v in zip(d_vsh, vsh_vals)}
        sw_map = {round(d, 4): v for d, v in zip(d_sw, sw_vals)}

        # Compute mineral moduli
        sand_K = req.sand_rho * 1000 * (req.sand_vp**2 - 4/3 * req.sand_vs**2) / 1e9
        sand_Mu = req.sand_rho * 1000 * req.sand_vs**2 / 1e9
        shale_K = req.shale_rho * 1000 * (req.shale_vp**2 - 4/3 * req.shale_vs**2) / 1e9
        K_water = req.water_rho * 1000 * req.water_vp**2 / 1e9
        K_oil = req.oil_rho * 1000 * req.oil_vp**2 / 1e9

        # Determine target SW values
        if req.sw_mode == "iterate_add":
            sw_targets = [i * req.sw_step for i in range(1, req.sw_iterations + 1)]
        elif req.sw_mode == "custom_range":
            if req.sw_steps <= 1:
                sw_targets = [req.sw_start]
            else:
                sw_targets = [req.sw_start + i * (req.sw_end - req.sw_start) / (req.sw_steps - 1) for i in range(req.sw_steps)]
        elif req.sw_mode == "from_curve":
            sw_targets = [None]  # will use target curve per-sample
            if req.target_sw_curve:
                d_tsw, tsw_vals, _ = await _read_curve(db, well_id, req.target_sw_curve)
                tsw_map = {round(d, 4): v for d, v in zip(d_tsw, tsw_vals)}
        else:
            sw_targets = [0.5]

        all_saved = []
        for idx, sw_target in enumerate(sw_targets):
            suffix = f"_{idx+1}" if len(sw_targets) > 1 else ""
            results = {item: [] for item in req.output_items}

            for d, phi in zip(depths, phi_vals):
                dk = round(d, 4)
                den = den_map.get(dk)
                vp = vp_map.get(dk)
                vs = vs_map.get(dk)
                vsh = vsh_map.get(dk)
                sw_orig = sw_map.get(dk)

                if any(x is None for x in [phi, den, vp, vs]) or phi <= 0 or den <= 0 or vp <= 0 or vs <= 0:
                    for item in req.output_items:
                        results[item].append(None)
                    continue

                phi_c = max(0.001, min(phi, 0.45))
                vsh_c = max(0.0, min(vsh if vsh is not None else 0, 1.0))

                # Determine new SW
                if req.sw_mode == "from_curve":
                    new_sw = tsw_map.get(dk, sw_orig) if req.target_sw_curve else sw_orig
                elif req.sw_mode == "iterate_add":
                    new_sw = min(1.0, (sw_orig if sw_orig else 0) + sw_target)
                else:
                    new_sw = sw_target
                new_sw = max(0.0, min(new_sw if new_sw is not None else 0.5, 1.0))
                old_sw = max(0.0, min(sw_orig if sw_orig is not None else 1.0, 1.0))

                rho = den * 1000
                mu = rho * vs * vs
                k_sat = rho * (vp * vp - 4.0/3.0 * vs * vs)

                # VRH mineral modulus
                f_sand = 1.0 - vsh_c
                K_min = 0.5 * (f_sand * sand_K + vsh_c * shale_K + 1.0 / (f_sand / max(sand_K, 0.01) + vsh_c / max(shale_K, 0.01)))
                K_min_pa = K_min * 1e9

                # Original fluid modulus
                K_fl_orig = 1.0 / (old_sw / max(K_water, 0.001) + (1 - old_sw) / max(K_oil, 0.001))
                K_fl_orig_pa = K_fl_orig * 1e9

                # Compute K_dry via Gassmann inverse
                a_t = k_sat / (K_min_pa - k_sat) if abs(K_min_pa - k_sat) > 1e-10 else 0
                b_t = K_fl_orig_pa / (phi_c * (K_min_pa - K_fl_orig_pa)) if abs(K_min_pa - K_fl_orig_pa) > 1e-10 else 0
                k_dry_t = a_t - b_t
                if abs(1 + k_dry_t) < 1e-15:
                    for item in req.output_items:
                        results[item].append(None)
                    continue
                k_dry = K_min_pa * k_dry_t / (1 + k_dry_t)

                # New fluid
                K_fl_new = 1.0 / (new_sw / max(K_water, 0.001) + (1 - new_sw) / max(K_oil, 0.001))
                K_fl_new_pa = K_fl_new * 1e9
                rho_fl_new = new_sw * req.water_rho + (1 - new_sw) * req.oil_rho
                rho_fl_orig = old_sw * req.water_rho + (1 - old_sw) * req.oil_rho

                # New K_sat via Gassmann forward
                a2 = k_dry / (K_min_pa - k_dry) if abs(K_min_pa - k_dry) > 1e-10 else 0
                b2 = K_fl_new_pa / (phi_c * (K_min_pa - K_fl_new_pa)) if abs(K_min_pa - K_fl_new_pa) > 1e-10 else 0
                k_sat_new = K_min_pa * (a2 + b2) / (1 + a2 + b2) if abs(1 + a2 + b2) > 1e-15 else k_sat

                rho_new = rho + phi_c * (rho_fl_new - rho_fl_orig) * 1000

                vp_new_sq = (k_sat_new + 4.0/3.0 * mu) / rho_new if rho_new > 0 else 0
                vs_new_sq = mu / rho_new if rho_new > 0 else 0
                vp_new = math.sqrt(max(vp_new_sq, 0))
                vs_new = math.sqrt(max(vs_new_sq, 0))

                k_new_gpa = k_sat_new / 1e9
                mu_gpa = mu / 1e9

                for item in req.output_items:
                    if item == "VP":
                        results[item].append(vp_new)
                    elif item == "VS":
                        results[item].append(vs_new)
                    elif item == "RHOB":
                        results[item].append(rho_new / 1000)
                    elif item == "K":
                        results[item].append(k_new_gpa)
                    elif item == "Mu":
                        results[item].append(mu_gpa)
                    else:
                        results[item].append(None)

            for item in req.output_items:
                name = f"{item}{suffix}"
                await _save_curve(db, well_id, name, depths, results[item], si)
                all_saved.append(name)

        await db.commit()
        return {"status": "ok", "message": f"流体替换(简化模型)完成 → 曲线 {', '.join(all_saved)}"}
