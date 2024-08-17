import { JSONObject } from './types.js'

export function changes(obj1: JSONObject, obj2: JSONObject): JSONObject {
  obj1 = initObject(obj1)
  obj2 = initObject(obj2)
  const diffs: JSONObject = {}
  const visited = new WeakSet<object>()

  function compareObjects(o1: JSONObject, o2: JSONObject, result: JSONObject): void {
    if (visited.has(o1) || visited.has(o2)) {
      return
    }
    visited.add(o1)
    visited.add(o2)

    const keys = new Set([...Object.keys(o1), ...Object.keys(o2)])

    keys.forEach((key) => {
      const val1 = o1[key]
      const val2 = o2[key]

      if (
        val1 &&
        typeof val1 === 'object' &&
        val2 &&
        typeof val2 === 'object' &&
        !Array.isArray(val1) &&
        !Array.isArray(val2)
      ) {
        result[key] = {}
        compareObjects(val1 as JSONObject, val2 as JSONObject, result[key] as JSONObject)
        if (Object.keys(result[key] as JSONObject).length === 0) {
          delete result[key]
        }
      } else if (val1 !== val2) {
        result[key] = { oldValue: val1, newValue: val2 }
      }
    })
  }

  compareObjects(obj1, obj2, diffs)

  return diffs
}

export function diff(obj1: JSONObject, obj2: JSONObject): JSONObject {
  const diffs: JSONObject = {}
  obj1 = initObject(obj1)
  obj2 = initObject(obj2)

  function compareObjects(o1: JSONObject, o2: JSONObject, result: JSONObject) {
    const keys = new Set([...Object.keys(o1), ...Object.keys(o2)])

    keys.forEach((key) => {
      const val1 = o1[key]
      const val2 = o2[key]

      if (
        typeof val1 === 'object' &&
        val1 !== null &&
        typeof val2 === 'object' &&
        val2 !== null &&
        !Array.isArray(val1) &&
        !Array.isArray(val2)
      ) {
        const nestedDiffs: JSONObject = {}
        compareObjects(val1 as JSONObject, val2 as JSONObject, nestedDiffs)
        if (Object.keys(nestedDiffs).length > 0) {
          result[key] = nestedDiffs
        }
      } else if (val1 !== val2) {
        result[key] = val2
      }
    })
  }

  compareObjects(obj1, obj2, diffs)

  return diffs
}

function initObject(obj: JSONObject): JSONObject {
  return obj || {}
}
