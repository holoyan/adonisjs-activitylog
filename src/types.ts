import { LucidModel } from '@adonisjs/lucid/types/model'

export interface LogModelInterface {
  getModelId(): string | number
}

// export type LogModel = InstanceType<LucidModel> & LogModelInterface
export interface LogModel extends LucidModel, LogModelInterface {}

export interface MorphMapInterface {
  [key: string]: any
}

export interface MorphInterface {
  set(alias: string, target: any): void
  get(alias: string): any
  has(alias: string): boolean
  hasTarget(target: any): boolean
  getAlias(target: any): string
}
