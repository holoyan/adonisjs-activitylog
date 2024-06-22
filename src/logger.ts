import { BaseModel } from '@adonisjs/lucid/orm'
import {
  LucidModel,
  ModelAdapterOptions,
  ModelQueryBuilderContract,
} from '@adonisjs/lucid/types/model'
import { LogModel, MorphInterface } from './types.js'

export class LogManager {
  static _modelClass: typeof BaseModel

  private static _map: MorphInterface

  static setModelClass(modelClass: typeof BaseModel) {
    this._modelClass = modelClass
  }

  static setMorphMap(map: MorphInterface) {
    this._map = map
  }

  static morphMap() {
    return this._map
  }
}

export class ActivityBuilder {
  private _adapterOptions?: ModelAdapterOptions
  private _queryBuilder: ModelQueryBuilderContract<LucidModel, LucidModel> | null = null

  queryOptions(options?: ModelAdapterOptions) {
    this._adapterOptions = options
    return this
  }

  private _name: string | null = null
  private _description: string | null = null

  private _modelId: string | number | null = null
  private _modelType: string | null = null

  private _event: string | null = null

  private _entityId: string | number | null = null
  private _entityType: string | null = null

  private _properties: Object | null = null
  private _batchId: string | null = null

  name(name: string) {
    this._name = name
    return this
  }

  by(model: string, modelId: string | number): ActivityBuilder
  by(model: LogModel): ActivityBuilder
  by(model: LogModel | string, modelId?: string | number) {
    if (typeof model !== 'string') {
      this._modelId = model.getModelId()
      this._modelType = LogManager.morphMap().getAlias(model)
    } else if (typeof modelId === 'string' || typeof modelId === 'number') {
      this._modelId = modelId
      this._modelType = model
    } else {
      throw new Error('Invalid arguments provided')
    }
    return this
  }

  making(event: string) {
    this._event = event
    return this
  }

  on(entity: string, entityId: string | number): ActivityBuilder
  on(entity: LogModel): ActivityBuilder
  on(entity: LogModel | string, entityId?: string | number) {
    if (typeof entity !== 'string') {
      this._entityId = entity.getModelId()
      this._entityType = LogManager.morphMap().getAlias(entity)
    } else if (typeof entityId === 'string' || typeof entityId === 'number') {
      this._entityId = entityId
      this._entityType = entity
    } else {
      throw new Error('Invalid arguments provided')
    }
    return this
  }

  havingProperties(state: Object) {
    this._properties = state
    return this
  }

  withBatch(batchId: string) {
    this._batchId = batchId
    return this
  }

  log(message: string) {
    const state = this.state()
    state.description = message
    // Here you would typically save the log to the database or perform the logging operation
    console.log(state)
  }

  state() {
    return {
      name: this._name,
      model_id: this._modelId,
      model_type: this._modelType,
      event: this._event,
      entity_id: this._entityId,
      entity_type: this._entityType,
      properties: this._properties,
      batch_id: this._batchId,
      description: this._description,
    }
  }

  customQuery(callback: (query: ModelQueryBuilderContract<LucidModel, LucidModel>) => void) {
    callback(this.getBuilder())
    return this
  }

  private getBuilder() {
    if (!this._queryBuilder) {
      this._queryBuilder = LogManager._modelClass.query(this._adapterOptions)
    }
    return this._queryBuilder
  }
}

export function activity() {
  return new ActivityBuilder()
}

// Example usage:
activity()
  .by('User', 1)
  .making('edit')
  .on('Product', 2)
  .havingProperties({})
  .customQuery((query) => {
    query.where('status', 'active')
    query.where('created_at', '>=', new Date('2023-01-01'))
  })
  .log('Edited product')
