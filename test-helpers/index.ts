import { configDotenv } from 'dotenv'
import { getActiveTest } from '@japa/runner'
import { Emitter } from '@adonisjs/core/events'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { Database } from '@adonisjs/lucid/database'
import { Encryption } from '@adonisjs/core/encryption'
import { AppFactory } from '@adonisjs/core/factories/app'
import { LoggerFactory } from '@adonisjs/core/factories/logger'
import { EncryptionFactory } from '@adonisjs/core/factories/encryption'
import { join } from 'node:path'
import fs from 'node:fs'
import { DateTime } from 'luxon'
import {
  ActivityLogInterface,
  JSONObject,
  LogModelInterface,
  MorphInterface,
  MorphMapInterface,
} from '../src/types.js'
import { ApplicationService } from '@adonisjs/core/types'
import { v4 as uuidv4 } from 'uuid'
import { changes, diff } from '../src/helpers.js'

export const encryption: Encryption = new EncryptionFactory().create()
configDotenv()

const BASE_URL = new URL('./tmp/', import.meta.url)

const app = new AppFactory().create(BASE_URL, () => {}) as ApplicationService
await app.init()
await app.boot()

const logger = new LoggerFactory().create()
const emitter = new Emitter(app)

class MorphMap implements MorphInterface {
  _map: MorphMapInterface = {}

  static _instance?: MorphMap

  static create() {
    if (this._instance) {
      return this._instance
    }

    return new MorphMap()
  }

  set(alias: string, target: any) {
    this._map[alias] = target
  }

  get(alias: string) {
    if (!(alias in this._map)) {
      throw new Error('morph map not found for ' + alias)
    }

    return this._map[alias] || null
  }

  has(alias: string) {
    return alias in this._map
  }

  hasTarget(target: any) {
    const keys = Object.keys(this._map)
    for (const key of keys) {
      if (this._map[key] === target) {
        return true
      }
    }

    return false
  }

  getAlias(target: any) {
    const keys = Object.keys(this._map)
    for (const key of keys) {
      if (target instanceof this._map[key] || target === this._map[key]) {
        return key
      }
    }

    throw new Error('Target not found')
  }
}

export const morphMap = MorphMap.create()
export function MorphMapDecorator(param: string) {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    target.prototype.__morphMapName = param
    morphMap.set(param, target)
  }
}

/**
 * Creates an instance of the database class for making queries
 */
export async function createDatabase() {
  const test = getActiveTest()

  if (!test) {
    throw new Error('Cannot use "createDatabase" outside of a Japa test')
  }

  var dir = '../tmp'

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  const db = new Database(
    {
      connection: process.env.DB || 'sqlite',
      connections: {
        sqlite: {
          client: 'sqlite3',
          connection: {
            filename: join('../tmp', 'db.sqlite3'),
          },
        },
        pg: {
          client: 'pg',
          connection: {
            host: process.env.PG_HOST as string,
            port: Number(process.env.PG_PORT),
            database: process.env.PG_DATABASE as string,
            user: process.env.PG_USER as string,
            password: process.env.PG_PASSWORD as string,
          },
        },
        mssql: {
          client: 'mssql',
          connection: {
            server: process.env.MSSQL_HOST as string,
            port: Number(process.env.MSSQL_PORT! as string),
            user: process.env.MSSQL_USER as string,
            password: process.env.MSSQL_PASSWORD as string,
            database: 'master',
            options: {
              enableArithAbort: true,
            },
          },
        },
        mysql: {
          client: 'mysql2',
          connection: {
            host: process.env.MYSQL_HOST as string,
            port: Number(process.env.MYSQL_PORT),
            database: process.env.MYSQL_DATABASE as string,
            user: process.env.MYSQL_USER as string,
            password: process.env.MYSQL_PASSWORD as string,
          },
        },
      },
    },
    logger,
    emitter
  )

  test.cleanup(() => db.manager.closeAll())
  BaseModel.useAdapter(db.modelAdapter())
  return db
}

/**
 * Creates needed database tables
 */
export async function createTables(db: Database) {
  const test = getActiveTest()
  if (!test) {
    throw new Error('Cannot use "createTables" outside of a Japa test')
  }

  test.cleanup(async () => {
    await db.connection().schema.dropTableIfExists('activity_logs')
    await db.connection().schema.dropTableIfExists('custom_activity_log')
    await db.connection().schema.dropTableIfExists('users')
    await db.connection().schema.dropTableIfExists('admins')
    await db.connection().schema.dropTableIfExists('products')
    await db.connection().schema.dropTableIfExists('posts')
    await db.connection().schema.dropTableIfExists('auto_log_models')
  })

  await db.connection().schema.createTableIfNotExists('activity_logs', (table) => {
    table.increments('id')

    table.string('name').nullable().index()
    table.text('description')
    table.string('model_type').nullable()
    table.string('model_id').nullable()
    table.string('event').nullable()
    table.string('entity_type').nullable()
    table.string('entity_id').nullable()
    table.json('current').nullable()
    table.json('previous').nullable()
    table.string('batch_id').nullable().index()

    table.index(['model_type', 'model_id'])
    table.index(['entity_type', 'entity_id'])

    table.timestamp('created_at')
    table.timestamp('updated_at')
  })
  await db.connection().schema.createTableIfNotExists('custom_activity_log', (table) => {
    table.increments('id')

    table.string('name').nullable().index()
    table.text('description')
    table.string('model_type').nullable()
    table.string('model_id').nullable()
    table.string('event').nullable()
    table.string('entity_type').nullable()
    table.string('entity_id').nullable()
    table.json('current').nullable()
    table.json('previous').nullable()
    table.string('batch_id').nullable().index()
    table.string('email').nullable().index()

    table.index(['model_type', 'model_id'])
    table.index(['entity_type', 'entity_id'])

    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  await db.connection().schema.createTableIfNotExists('users', (table) => {
    table.increments('id').notNullable()
    table.timestamp('created_at').notNullable()
    table.timestamp('updated_at').nullable()
  })
  await db.connection().schema.createTableIfNotExists('admins', (table) => {
    table.increments('id').notNullable()
    table.timestamp('created_at').notNullable()
    table.timestamp('updated_at').nullable()
  })

  await db.connection().schema.createTableIfNotExists('products', (table) => {
    PrimaryKey(table, 'id')

    /**
     * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
     */
    table.timestamp('created_at', { useTz: true })
    table.timestamp('updated_at', { useTz: true })
  })

  await db.connection().schema.createTableIfNotExists('posts', (table) => {
    PrimaryKey(table, 'id')
    table.string('title').nullable()
    table.string('body').nullable()

    /**
     * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
     */
    table.timestamp('created_at', { useTz: true })
    table.timestamp('updated_at', { useTz: true })
  })
  await db.connection().schema.createTableIfNotExists('auto_log_models', (table) => {
    PrimaryKey(table, 'id')
    table.string('title').nullable()

    /**
     * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
     */
    table.timestamp('created_at', { useTz: true })
    table.timestamp('updated_at', { useTz: true })
  })
}
function PrimaryKey(table: any, columnName: string) {
  return wantsUUID() ? table.string(columnName).primary() : table.bigIncrements(columnName)
}

export function wantsUUID() {
  return process.env.UUID_SUPPORT === 'true'
}

export async function defineModels() {
  class ActivityLog extends BaseModel implements ActivityLogInterface {
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

  class CustomActivityLog extends ActivityLog implements ActivityLogInterface {
    static table = 'custom_activity_log'

    @column()
    declare email: string
  }

  @MorphMapDecorator('users')
  class User extends BaseModel implements LogModelInterface {
    @column({ isPrimary: true })
    declare id: number

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime | null

    getModelId(): string {
      return String(this.id)
    }
  }

  @MorphMapDecorator('admins')
  class Admin extends BaseModel implements LogModelInterface {
    @column({ isPrimary: true })
    declare id: number

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime | null

    getModelId(): string {
      return String(this.id)
    }
  }

  @MorphMapDecorator('products')
  class Product extends BaseModel implements LogModelInterface {
    @column({ isPrimary: true })
    declare id: number

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    getModelId(): string {
      return String(this.id)
    }
  }

  @MorphMapDecorator('posts')
  class Post extends BaseModel implements LogModelInterface {
    @column({ isPrimary: true })
    declare id: string

    @column()
    declare title: string | null

    @column()
    declare body: string | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    getModelId(): string {
      return String(this.id)
    }
  }

  @MorphMapDecorator('AutoLogModels')
  class AutoLogModel extends BaseModel implements LogModelInterface {
    static table = 'auto_log_models'

    @column({ isPrimary: true })
    declare id: string

    @column()
    declare title: string | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    getModelId(): string {
      return String(this.id)
    }

    toLog() {
      return {
        id: this.id,
        title: this.title,
      }
    }
  }

  return {
    User: User,
    Product: Product,
    Post: Post,
    Admin: Admin,
    ActivityLog: ActivityLog,
    CustomActivityLog: CustomActivityLog,
    AutoLogModel: AutoLogModel,
  }
}

export async function seedDb(models: any) {
  await models.User.createMany(getUsers(100))
  if (models.Post) {
    await models.Post.createMany(getPosts(20))
  }
  if (models.Product) {
    await models.Product.createMany(getProduts(20))
  }
  if (models.AutoLogModel) {
    await models.AutoLogModel.createMany(getAutoLogModels(20))
  }
}

/**
 * Returns an array of users filled with random data
 */
export function getUsers(count: number) {
  // const chance = new Chance()
  return [...new Array(count)].map(() => {
    return {}
  })
}

/**
 * Returns an array of posts for a given user, filled with random data
 */
export function getPosts(count: number) {
  return [...new Array(count)].map(() => {
    if (wantsUUID()) {
      return {
        id: uuidv4(),
      }
    }
    return {}
  })
}

/**
 * Returns an array of posts for a given user, filled with random data
 */
export function getProduts(count: number) {
  return [...new Array(count)].map(() => {
    return {}
  })
}

export function getAutoLogModels(count: number) {
  return [...new Array(count)].map(() => {
    return {
      id: Math.floor(Math.random() * 1000),
      title: 'Auto log model' + Math.floor(Math.random() * 1000),
    }
  })
}

export function makeId() {
  return uuidv4()
}
