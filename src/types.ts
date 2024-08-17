import { LucidModel } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import { BaseModel } from '@adonisjs/lucid/orm'

export interface LogModelInterface {
  getModelId(): string
}

export interface ActivityLogInterface {
  id: number
  name: string
  description: string
  model_type: string
  model_id: string
  event: string
  entity_type: string
  entity_id: string
  current: JSONObject
  previous: JSONObject
  batch_id: string
  createdAt: DateTime
  updatedAt: DateTime
  changes(): JSONObject
  diff(): JSONObject
}

export type JSONValue = string | number | boolean | null | JSONObject | JSONArray
export interface JSONObject {
  [key: string]: JSONValue
}
export interface JSONArray extends Array<JSONValue> {}

export type LogModel = InstanceType<LucidModel> & LogModelInterface

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

export type MyType = typeof BaseModel
