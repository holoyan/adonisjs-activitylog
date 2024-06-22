import { DateTime } from 'luxon'
import { BaseModel, column, scope } from '@adonisjs/lucid/orm'

export default class ActivityLog extends BaseModel {
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
  declare properties: Object

  @column()
  declare batch_id: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static published = scope((query) => {
    query.where('publishedOn', '<=', DateTime.utc().toSQLDate())
  })
}

const a = ActivityLog.query()
a.where('a', 4).withScopes((scopes) => scopes.published())
