export type OrgRole = 'owner' | 'admin' | 'member'
export type OrgPlan = 'free' | 'pro'

export interface Project {
  id: string
  org_id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface OrgContext {
  org_id: string
  role: OrgRole
  plan: OrgPlan
  org_name: string
}
