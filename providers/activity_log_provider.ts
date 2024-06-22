import { ApplicationService } from '@adonisjs/core/types'
import MorphMap from '../src/morph_map.js'
import { LogManager } from '../src/logger.js'
import ActivityLog from '../src/models/activity_log.js'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    morphMap: MorphMap
  }
}
export default class ActivityLogProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('morphMap', async () => {
      return new MorphMap()
    })
  }

  async boot() {
    LogManager.setModelClass(ActivityLog)
    const map = await this.app.container.make('morphMap')
    LogManager.setMorphMap(map)
  }
}
