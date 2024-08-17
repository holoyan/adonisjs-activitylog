import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { ActivityLogInterface, JSONObject } from '../types.js'
import { changes, diff } from '../helpers.js'

export default class ActivityLog extends BaseModel implements ActivityLogInterface {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare model_type: string

  @column()
  declare model_id: string

  @column()
  declare event: string

  @column()
  declare entity_type: string

  @column()
  declare entity_id: string

  @column()
  declare current: JSONObject

  @column()
  declare previous: JSONObject

  @column()
  declare batch_id: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  changes() {
    return changes(this.previous, this.current)
  }

  diff() {
    return diff(this.previous, this.current)
  }
}
