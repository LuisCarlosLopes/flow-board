export type ChangeType = 'feature' | 'fix' | 'improvement' | 'breaking'

export type Change = {
  id: string
  type: ChangeType
  title: string
  description: string
}

export type Release = {
  version: string
  releaseDate: string
  archived: boolean
  changes: Change[]
}

export type CurrentVersion = {
  version: string
}
