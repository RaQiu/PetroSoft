export interface SeismicVolumeInfo {
  id: number
  name: string
  file_path: string
  n_inlines: number | null
  n_crosslines: number | null
  n_samples: number | null
  sample_interval: number | null
  inline_min: number | null
  inline_max: number | null
  crossline_min: number | null
  crossline_max: number | null
  format_code: number | null
}

export interface SegyHeaderInfo {
  text_header: string
  binary_header: Record<string, number>
  sample_traces: Record<string, number | string>[]
  total_traces: number
}

export interface SeismicSectionData {
  data: number[][]
  times: number[]
  positions: number[]
  amp_min: number
  amp_max: number
}

export interface SurveyOutlinePoint {
  x: number
  y: number
  inline: number
  crossline: number
}

export interface SurveyOutline {
  outline: SurveyOutlinePoint[]
}

export interface SurveyInfo {
  id: number
  name: string
  inline_min: number
  inline_max: number
  inline_step: number
  crossline_min: number
  crossline_max: number
  crossline_step: number
  origin_x: number
  origin_y: number
  inline_dx: number
  inline_dy: number
  crossline_dx: number
  crossline_dy: number
  created_at: string
}
