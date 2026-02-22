import apiClient from './client'

// ── 泥质含量 (enhanced: 4 methods) ──
export interface VshParams {
  workarea_path: string
  method: string // single_curve / neutron_sonic / neutron_density / density_sonic
  // 单曲线法参数
  gr_curve?: string
  gr_clean?: number
  gr_clay?: number
  regional_coeff?: number
  // 中子参数
  cnl_curve?: string
  cnl_matrix?: number
  cnl_clay?: number
  // 声波参数
  dt_curve?: string
  dt_matrix?: number
  dt_fluid?: number
  dt_clay?: number
  // 密度参数
  den_curve?: string
  den_matrix?: number
  den_fluid?: number
  den_clay?: number
  // 输出
  result_curve_name: string
  as_percent?: boolean
}

export async function calcVsh(
  wellName: string,
  params: VshParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/vsh`, params)
  return res.data
}

// ── 孔隙度 (enhanced: 4 methods with clay correction) ──
export interface PorosityParams {
  workarea_path: string
  method: string // sonic / density / neutron / neutron_density_mean
  // 声波法参数
  dt_curve?: string
  dt_matrix?: number
  dt_fluid?: number
  dt_clay?: number
  compaction_factor?: number
  // 密度法参数
  den_curve?: string
  den_matrix?: number
  den_fluid?: number
  den_clay?: number
  // 中子法参数
  cnl_curve?: string
  cnl_clay?: number
  // 泥质校正
  vsh_curve?: string
  vsh_cutoff?: number
  // 中子-密度几何平均
  phi_neutron_curve?: string
  phi_density_curve?: string
  // 输出
  result_curve_name: string
  as_percent?: boolean
}

export async function calcPorosity(
  wellName: string,
  params: PorosityParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/porosity`, params)
  return res.data
}

// ── 总孔隙度 ──
export interface TotalPorosityParams {
  workarea_path: string
  den_curve: string
  vsh_curve: string
  den_fluid: number
  den_matrix: number
  den_clay: number
  result_curve_name: string
  as_percent?: boolean
}

export async function calcTotalPorosity(
  wellName: string,
  params: TotalPorosityParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/total-porosity`, params)
  return res.data
}

// ── 渗透率 ──
export interface PermeabilityParams {
  workarea_path: string
  phi_curve: string
  coeff_a: number
  coeff_b: number
  result_curve_name: string
}

export async function calcPermeability(
  wellName: string,
  params: PermeabilityParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/permeability`, params)
  return res.data
}

// ── 含水饱和度 ──
export interface SaturationParams {
  workarea_path: string
  rt_curve: string
  phi_curve: string
  rw: number
  a: number
  m: number
  n: number
  result_curve_name: string
}

export async function calcSaturation(
  wellName: string,
  params: SaturationParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/saturation`, params)
  return res.data
}

// ── 横波预测 ──
export interface PredictVsParams {
  workarea_path: string
  dt_curve: string
  method: string
  coeff_a: number
  coeff_b: number
  result_curve_name: string
}

export async function predictVs(
  wellName: string,
  params: PredictVsParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/predict-vs`, params)
  return res.data
}

// ── 弹性参数 ──
export interface ElasticParamsRequest {
  workarea_path: string
  dt_curve: string
  dts_curve: string
  den_curve: string
  calc_items: string[]
  custom_names?: Record<string, string>
}

export async function calcElasticParams(
  wellName: string,
  params: ElasticParamsRequest
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/elastic-params`, params)
  return res.data
}

// ── 流体替换 ──
export interface FluidSubParams {
  workarea_path: string
  dt_curve: string
  dts_curve: string
  den_curve: string
  phi_curve: string
  k_mineral: number
  k_fluid_orig: number
  rho_fluid_orig: number
  k_fluid_new: number
  rho_fluid_new: number
  result_dt: string
  result_den: string
}

export async function fluidSubstitution(
  wellName: string,
  params: FluidSubParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/fluid-sub`, params)
  return res.data
}

// ── 校正纵波速度 (Faust) ──
export interface CorrectVpParams {
  workarea_path: string
  rt_curve: string
  coefficient: number
  result_curve_name: string
}

export async function correctVp(
  wellName: string,
  params: CorrectVpParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/correct-vp`, params)
  return res.data
}

// ── 校正密度曲线 (Castagna/Gardner) ──
export interface CorrectDensityParams {
  workarea_path: string
  method: string
  vp_curve: string
  lithology: string
  a: number
  b: number
  c: number
  d: number
  f: number
  result_curve_name: string
}

export async function correctDensity(
  wellName: string,
  params: CorrectDensityParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/correct-density`, params)
  return res.data
}

// ── 特征曲线重构 ──
export interface CurveReconstructParams {
  workarea_path: string
  low_freq_curve: string
  high_freq_curve: string
  method: string
  max_freq: number
  invert_high: boolean
  log_high: boolean
  correction_factor: number
  result_curve_name: string
}

export async function curveReconstruct(
  wellName: string,
  params: CurveReconstructParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/curve-reconstruct`, params)
  return res.data
}

// ── 自适应模型 ──
export interface AdaptiveModelParams {
  workarea_path: string
  rock_type: string
  fluid_type: string
  phi_curve: string
  sw_curve: string
  dt_curve: string
  den_curve: string
  output_items: string[]
}

export async function adaptiveModel(
  wellName: string,
  params: AdaptiveModelParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/adaptive-model`, params)
  return res.data
}

// ── 砂泥岩模型 ──
export interface SandShaleModelParams {
  workarea_path: string
  phi_curve: string
  vsh_curve: string
  sw_curve: string
  sand_rho: number
  sand_vp: number
  sand_vs: number
  sand_aspect: number
  shale_rho: number
  shale_vp: number
  shale_vs: number
  shale_aspect: number
  fluid_type: string
  oil_rho: number
  oil_vp: number
  water_rho: number
  water_vp: number
  output_items: string[]
}

export async function sandShaleModel(
  wellName: string,
  params: SandShaleModelParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/sand-shale-model`, params)
  return res.data
}

// ── 计算弹性阻抗 ──
export interface AngleItem {
  angle: number
  result_name: string
}

export interface ElasticImpedanceParams {
  workarea_path: string
  vp_curve: string
  vs_curve: string
  den_curve: string
  angles: AngleItem[]
}

export async function elasticImpedance(
  wellName: string,
  params: ElasticImpedanceParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/elastic-impedance`, params)
  return res.data
}

// ── 流体替换-简化模型 ──
export interface FluidSubSimplifiedParams {
  workarea_path: string
  phi_curve: string
  den_curve: string
  vp_curve: string
  vs_curve: string
  vsh_curve: string
  sw_curve: string
  sw_mode: string
  sw_step: number
  sw_iterations: number
  sw_start: number
  sw_end: number
  sw_steps: number
  target_sw_curve: string
  sand_rho: number
  sand_vp: number
  sand_vs: number
  shale_rho: number
  shale_vp: number
  shale_vs: number
  fluid_type: string
  oil_rho: number
  oil_vp: number
  water_rho: number
  water_vp: number
  output_items: string[]
}

export async function fluidSubSimplified(
  wellName: string,
  params: FluidSubSimplifiedParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/rock-physics/${encodeURIComponent(wellName)}/fluid-sub-simplified`, params)
  return res.data
}
