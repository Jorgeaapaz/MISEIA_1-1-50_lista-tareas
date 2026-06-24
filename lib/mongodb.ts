import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'lista_tareas'

const CLIENT_OPTIONS = {
  serverSelectionTimeoutMS: 3000,
  connectTimeoutMS: 3000,
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined
  // eslint-disable-next-line no-var
  var _mongoDb: Db | undefined
}

let prodClient: MongoClient | null = null
let prodDb: Db | null = null

export async function connectToDatabase(): Promise<{ db: Db }> {
  if (process.env.NODE_ENV === 'development') {
    if (global._mongoDb) return { db: global._mongoDb }
    if (!global._mongoClient) {
      global._mongoClient = new MongoClient(uri, CLIENT_OPTIONS)
      await global._mongoClient.connect()
    }
    global._mongoDb = global._mongoClient.db(dbName)
    return { db: global._mongoDb }
  }

  if (prodDb) return { db: prodDb }
  prodClient = new MongoClient(uri, CLIENT_OPTIONS)
  await prodClient.connect()
  prodDb = prodClient.db(dbName)
  return { db: prodDb }
}

export function resetConnection(): void {
  if (process.env.NODE_ENV === 'development') {
    global._mongoClient = undefined
    global._mongoDb = undefined
  } else {
    prodClient = null
    prodDb = null
  }
}
