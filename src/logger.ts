import { ModelAssignOptions } from '@adonisjs/lucid/types/model'
import { ActivityLogInterface, LogModel, MorphInterface, MyType } from './types.js'

export class LogManager {
  static _modelClass: MyType

  private static _map: MorphInterface

  static setModelClass(modelClass: MyType) {
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
  private _adapterOptions?: ModelAssignOptions

  private _state = {}
  queryOptions(options?: ModelAssignOptions) {
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

  private _current: Object | null = null
  private _previous: Object | null = null

  private _batchId: string | null = null

  named(name: string) {
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

      if ('toLog' in entity && typeof entity.toLog === 'function') {
        const toLog = entity.toLog() as Object
        this.havingCurrent(toLog)
      }
    } else if (typeof entityId === 'string' || typeof entityId === 'number') {
      this._entityId = entityId
      this._entityType = entity
    } else {
      throw new Error('Invalid arguments provided')
    }
    return this
  }

  havingCurrent(state: Object) {
    this._current = state
    return this
  }

  previousState(state: Object) {
    this._previous = state
    return this
  }

  groupedBy(batchId: string) {
    this._batchId = batchId
    return this
  }

  log(message: string) {
    this._description = message

    // @ts-ignore
    return LogManager._modelClass.create(
      this.state(),
      this._adapterOptions
    ) as unknown as Promise<ActivityLogInterface>
  }

  values(values: Object) {
    this._state = { ...this._state, ...values }
    return this
  }

  state() {
    this._state = {
      ...this._state,
      name: this._name,
      model_id: this._modelId,
      model_type: this._modelType,
      event: this._event,
      entity_id: this._entityId,
      entity_type: this._entityType,
      current: this._current,
      previous: this._previous,
      batch_id: this._batchId,
      description: this._description,
    }

    return this._state
  }
}

export function activity() {
  return new ActivityBuilder()
}
