export interface MenuItem {
  id: string
  label: string
  shortcut?: string
  disabled?: boolean
  divider?: boolean
  children?: MenuItem[]
}

export interface MenuGroup {
  id: string
  label: string
  children: MenuItem[]
}
