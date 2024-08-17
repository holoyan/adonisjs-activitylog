import { test } from '@japa/runner'

import {
  createDatabase,
  createTables,
  defineModels,
  makeId,
  morphMap,
  seedDb,
} from '../test-helpers/index.js'

import { LogManager, activity } from '../src/logger.js'
import { BaseModel } from '@adonisjs/lucid/orm'

test.group('Activity log | writing', (group) => {
  group.setup(async () => {})

  group.teardown(async () => {})

  // group.each.setup(async () => {})
  group.each.disableTimeout()

  test('Creating first log', async ({ assert }) => {
    const db = await createDatabase()
    await createTables(db)
    const { ActivityLog }: { ActivityLog: typeof BaseModel } = await defineModels()

    LogManager.setModelClass(ActivityLog)
    LogManager.setMorphMap(morphMap)

    const desc = 'First log data'
    const log = await activity().log(desc)

    assert.equal(log.description, desc)
  })

  test('Create log for a user', async ({ assert }) => {
    const db = await createDatabase()
    await createTables(db)
    const { User, ActivityLog } = await defineModels()

    LogManager.setModelClass(ActivityLog)
    LogManager.setMorphMap(morphMap)

    await seedDb({ User })

    const user = await User.first()

    if (!user) {
      throw new Error('user not found')
    }

    const desc = 'User log data'
    const log = await activity().by(user).log(desc)

    assert.equal(log.description, desc)
    assert.equal(log.model_id, user.id)
  })

  test('Create full log model', async ({ assert }) => {
    const db = await createDatabase()
    await createTables(db)
    const { User, Product, Post, ActivityLog } = await defineModels()

    LogManager.setModelClass(ActivityLog)
    LogManager.setMorphMap(morphMap)

    await seedDb({ User, Product, Post })

    const user = await User.first()

    if (!user) {
      throw new Error('user not found')
    }

    const post = await Post.first()
    if (!post) {
      throw new Error('Post not found')
    }

    const desc = 'User log data'
    const props = post.serialize()

    const log = await activity()
      .named('info')
      .by(user)
      .making('update')
      .on(post)
      .havingCurrent(props)
      .log(desc)

    assert.equal(log.description, desc)
    assert.equal(log.model_id, user.id)
    assert.equal(log.name, 'info')
    assert.equal(log.event, 'update')
    assert.equal(log.entity_id, post.id)
    assert.equal(log.current, props)
  })

  test('Ensure multiple logs not conflicting', async ({ assert }) => {
    const db = await createDatabase()
    await createTables(db)
    const { User, Product, Post, ActivityLog } = await defineModels()

    LogManager.setModelClass(ActivityLog)
    LogManager.setMorphMap(morphMap)

    await seedDb({ User, Product, Post })

    const user = await User.first()

    if (!user) {
      throw new Error('user not found')
    }

    const post = await Post.first()
    if (!post) {
      throw new Error('Post not found')
    }

    const product = await Product.first()
    if (!product) {
      throw new Error('Product not found')
    }

    const desc1 = 'User log data'
    const desc2 = 'log2 desc'
    const postData = post.serialize()
    const productData = product.serialize()

    const log1 = await activity()
      .named('info')
      .by(user)
      .making('update')
      .on(post)
      .havingCurrent(postData)
      .log(desc1)

    const log2 = await activity()
      .named('info')
      .by(user)
      .making('update')
      .on(product)
      .havingCurrent(productData)
      .log(desc2)

    assert.notEqual(log1.id, log2.id)
  })

  test('Create multiple logs with same batch', async ({ assert }) => {
    const db = await createDatabase()
    await createTables(db)
    const { User, Product, Post, ActivityLog } = await defineModels()

    LogManager.setModelClass(ActivityLog)
    LogManager.setMorphMap(morphMap)

    await seedDb({ User, Product, Post })

    const user = await User.first()

    if (!user) {
      throw new Error('user not found')
    }

    const post = await Post.first()
    if (!post) {
      throw new Error('Post not found')
    }

    const product = await Product.first()
    if (!product) {
      throw new Error('Product not found')
    }

    const batchId = makeId()

    const desc1 = 'User log data'
    const desc2 = 'log2 desc'
    const postData = post.serialize()
    const productData = product.serialize()

    const log1 = await activity()
      .named('info')
      .by(user)
      .making('update')
      .on(post)
      .havingCurrent(postData)
      .groupedBy(batchId)
      .log(desc1)

    const log2 = await activity()
      .named('info')
      .by(user)
      .making('update')
      .on(product)
      .havingCurrent(productData)
      .groupedBy(batchId)
      .log(desc2)

    assert.equal(log1.batch_id, log2.batch_id)
  })

  test('get changes and diffs', async ({ assert }) => {
    const db = await createDatabase()
    await createTables(db)
    const { User, Product, Post, ActivityLog } = await defineModels()

    LogManager.setModelClass(ActivityLog)
    LogManager.setMorphMap(morphMap)

    await seedDb({ User, Product, Post })

    const user = await User.first()

    if (!user) {
      throw new Error('user not found')
    }

    const post = await Post.create({
      title: 'Weather on Monday',
      body: 'Today we have +23C',
    })

    const desc = 'Updating post data'
    const oldState = post.serialize()
    await post
      .merge({
        title: 'Weather on Sunday',
      })
      .save()
    const currentData = post.serialize()

    const log1 = await activity()
      .named('info')
      .by(user)
      .making('update')
      .on(post)
      .havingCurrent(currentData)
      .previousState(oldState)
      .log(desc)

    assert.deepEqual(log1.diff(), {
      title: post.title,
      updatedAt: post.updatedAt.toString(),
    })

    assert.deepEqual(log1.changes(), {
      title: { oldValue: oldState.title, newValue: post.title },
      updatedAt: { oldValue: oldState.updatedAt, newValue: post.updatedAt.toString() },
    })
  })

  test('Writing custom query with custom model', async ({ assert }) => {
    const db = await createDatabase()
    await createTables(db)
    const { User, Product, Post, CustomActivityLog } = await defineModels()

    LogManager.setModelClass(CustomActivityLog)
    LogManager.setMorphMap(morphMap)

    await seedDb({ User, Product, Post })

    const user = await User.first()

    if (!user) {
      throw new Error('user not found')
    }

    const log = await activity()
      .named('info')
      .by(user)
      .making('update')
      .values({ email: 'myemail@test.com' })
      .log('my log description')

    // @ts-ignore
    assert.deepEqual(log.email, 'myemail@test.com')
  })

  test('Writing logs inside transaction', async ({ assert }) => {
    const db = await createDatabase()
    await createTables(db)
    const { User, Product, Post, ActivityLog } = await defineModels()

    LogManager.setModelClass(ActivityLog)
    LogManager.setMorphMap(morphMap)

    await seedDb({ User, Product, Post })

    const user = await User.first()

    if (!user) {
      throw new Error('user not found')
    }

    const post = await Post.first()
    if (!post) {
      throw new Error('Post not found')
    }

    const desc1 = 'User log data'
    const postData = post.serialize()

    const trx = await db.transaction()

    const log1 = await activity()
      .queryOptions({ client: trx })
      .named('info')
      .by(user)
      .making('update')
      .on(post)
      .havingCurrent(postData)
      .log(desc1)

    await trx.commit()

    const trx2 = await db.transaction()

    await activity().queryOptions({ client: trx2 }).named('outside-trx').log('outside transaction')

    trx2.rollback()

    assert.equal(log1.name, 'info')

    const rollbacked = await ActivityLog.query().where('name', 'outside-trx').first()
    assert.isNull(rollbacked)
  })

  test('Test automatic log', async ({ assert }) => {
    const db = await createDatabase()
    await createTables(db)
    const { User, ActivityLog, AutoLogModel } = await defineModels()

    LogManager.setModelClass(ActivityLog)
    LogManager.setMorphMap(morphMap)

    await seedDb({ User, AutoLogModel })

    const user = await User.first()

    if (!user) {
      throw new Error('user not found')
    }

    const autoLog = await AutoLogModel.first()

    if (!autoLog) {
      throw new Error('AutoLogModel not found')
    }

    const log = await activity()
      .named('autolog')
      .by(user)
      .making('update')
      .on(autoLog)
      .log('my log description')

    assert.deepEqual(log.current, {
      id: autoLog.id,
      title: autoLog.title,
    })
  })
})
