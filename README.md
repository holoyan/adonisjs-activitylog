# Log activity inside your AdonisJS app

Checkout other AdonisJS packages

- [AdonisJS permissions](https://github.com/holoyan/adonisjs-permissions)


## Beta version

## Table of Contents

<details><summary>Click to expand</summary><p>

- [Introduction](#introduction)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Writing logs](#writing-logs)
  - [Automatic logging](#automatic-logging)
  - [Specifying batch id (Group id)](#specifying-batch-id-group-id)
  - [Full log example](#full-log-example)
  - [Retrieving logs](#retrieving-logs)
  - [Changes vs Diff](#changes-vs-diff)
- [Transactions](#transactions)
- [Test](#test)
- [Version map](#verion-map)
- [License](#license)
</p></details>

## Introduction

The `@holoyan/adonisjs-activitylog` package provides easy to use functions to log the activities of the models(not only) of your app. The Package stores all activity in the `activity_logs` table.

Here's a demo of how you can use it:

```typescript
import { activity } from '@holoyan/adonisjs-activitylog'

const a = await activity().by(user).log('Look, I logged something')

```

## Installation

    npm i @holoyan/adonisjs-activitylog@0.1.5

Next, publish config file

    node ace configure @holoyan/adonisjs-activitylog

this will create migration file in the `database/migrations` directory

Next run migration

    node ace migration:run


## Configuration

All models that will interact with `logs` MUST use the `@MorphMap('AliasForClass')` decorator and implement `LogModelInterface` interface  decorator.

Example.

```typescript

import { BaseModel, column } from '@adonisjs/lucid/orm'
import { MorphMap } from '@holoyan/adonisjs-activitylog'
import { LogModelInterface } from '@holoyan/adonisjs-activitylog'

@MorphMap('users')
export default class User extends BaseModel implements LogModelInterface {
  getModelId(): string {
    return String(this.id)
  }
  // other code goes here
}

@MorphMap('posts')
export default class Post extends BaseModel implements LogModelInterface {
  getModelId(): string {
    return String(this.id)
  }
  // model code goes here
}

```
## Support

### App version
Only AdonisJs v6+ app

### Database Support

Currently supported databases: `postgres`, `mysql`, `mssql`, `sqlite`

### UUID support
By default package supports `UUID` models, just don't forget to implement `getModelId` method

## Usage

### Writing logs

The simplest way to log something is to call the `log` method

```typescript

import { activity } from '@holoyan/adonisjs-activitylog'

const myLog = await activity().log('Look, I logged something')

```

If you need to specify the user call `by` method

```typescript

import { activity } from '@holoyan/adonisjs-activitylog'

const myLog = await activity().by(user).log('Log by user')
// or you can manually pass user alias and id
// const myLog = await activity().by('users', 1).log('Log by user')

```
> Important! User model MUST use @MorphMap decorator. Check [configuration](#configuration)

To specify event name call `making` method

```typescript

import { activity } from '@holoyan/adonisjs-activitylog'

const myLog = await activity()
  .by(user)
  .making('update') // you can specify anything you want
  .log('Post successfully updated')

```

To specify entity use `on` method

```typescript

import { activity } from '@holoyan/adonisjs-activitylog'

const post = await Post.find(id)

const myLog = await activity()
  .by(user)
  .making('update')
  .on(post) // you can pass post model instance or model alias and id
  .log('Post successfully updated')

```
> Important! Post model MUST use @MorphMap decorator. Check [configuration](#configuration)

To specify attributes you need to call `havingCurrent` method

```typescript

import { activity } from '@holoyan/adonisjs-activitylog'

const myLog = await activity().by(user).making('update').on(post).havingCurrent({
  title: 'new title',
}).log('Post successfully updated')

```

And of course you can save previous as well

```typescript

import { activity } from '@holoyan/adonisjs-activitylog'

const myLog = await activity().by(user).making('update').on(post).havingCurrent({
  title: 'new title',
}).previousState({
  title: 'old title',
}).log('Post successfully updated')

```

### Automatic logging

You can create `toLog` method inside the model in that case it will be automatically called

```typescript

import { MorphMap } from '@holoyan/adonisjs-activitylog'


@MorphMap('posts')
export default class Post extends BaseModel {
  // attributes
  
  toLog(){
    return {
      title: this.title,
      body: this.body,
      // and so on
    }
  }
}

// PostsController.ts

// toLogs will be called and it's value will be stored as currentState
const myLog = await activity()
  .by(user)
  .making('update')
  .on(post) // behind the scenes it will call post.toLog() and store it as currentState
  .log('Post successfully updated')

```

### Specifying batch id (Group id)

Sometimes you may want to group logs, or you need a way to log multiple entries `under current request`. To do so you can use `groupedBy` method and specify batch id

```typescript

import { activity } from '@holoyan/adonisjs-activitylog'

const batchId = uuid4();

const myLog1 = await activity().groupedBy(batchId).by(user).log('Log 1')
const myLog2 = await activity().groupedBy(batchId).by(user).log('Log 2')
// and so on

```

### Full log example

```typescript

import { activity } from '@holoyan/adonisjs-activitylog'

const batchId = uuid4();

const myLog = await activity()
  .named('new-car')
  .by(user)
  .making('update')
  .on(product)
  .groupedBy(batchId)
  .havingCurrent({
    brand: 'Mercedes',
    color: 'black'
  })
  .previousState({
    brand: 'BMW',
    color: 'black'
  })
  .log('New car added')
// and so on

console.log(myLog)

```

### Retrieving logs

To retrieve log simply use `ActivityLog` model and make `lucid` [queries](https://lucid.adonisjs.com/docs/model-query-builder)

```typescript

import { ActivityLog } from '@holoyan/adonisjs-activitylog'

const log = await ActivityLog.query().where('model_type', 'users').where('model_id', user.id).first()
console.log(log)


```

### Changes vs Diff

The package stores `previous` and `current` states of the model. You can retrieve changes by calling `changes` and `diff` methods, let's see an example

```typescript

import { activity } from '@holoyan/adonisjs-activitylog'

const myLog = await activity().by(user).making('update').on('post').havingCurrent({
  title: 'new title',
  description: 'new description',
}).previousState({
  title: 'old title',
  description: 'old description',
}).log('Post successfully updated')

console.log(myLog.changes())
/**
 {
  title: {
    oldValue: 'old title',
    newValue: 'new title'
  },
  description: {
    oldValue: 'old description',
    newValue: 'new description'
  }
 }
 */
console.log(myLog.diff())
// { title: 'new title', description: 'new description' }

```

You can do same on the model instance

```typescript

import { ActivityLog } from '@holoyan/adonisjs-activitylog'

const log = await ActivityLog.find(id)
console.log(log.toString())
console.log(log.diff())

```

### Transactions

In case you want to use `activity` inside the transaction then you can pass `options` directly to query method.

```typescript

const trx = await db.transaction()

const a = await activity().queryOptions({ client: trx }).log('bla bla')
// you other code

await trx.commit()

```

## Test

    npm run test

## Version map


| AdonisJS Lucid version | Package version |
|------------------------|-----------------|
| v20.x                  | 0.1.x           |
| v21.x                  | 0.2.x           |


## License


MIT
