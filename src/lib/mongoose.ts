const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable")
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
// Define the mongoose global type
declare global {
  var mongoose: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}

let cached = global.mongoose || { conn: null, promise: null }

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null }
  cached = global.mongoose
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI must be defined");
    }
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m: typeof import("mongoose")): typeof import("mongoose") => {
      return m
    })
  }
  cached.conn = await cached.promise
  return cached.conn
}

export default dbConnect
