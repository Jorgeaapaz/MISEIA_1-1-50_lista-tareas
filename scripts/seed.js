// Populates the tareas collection with 27 sample tasks (mixed completion statuses).
// Skips seeding if the collection already has 25+ documents.
// Usage: node scripts/seed.js
const { MongoClient } = require('mongodb')
const fs = require('fs')
const path = require('path')

// Load .env.local so the script uses the same DB as the app
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .forEach((line) => {
      const eq = line.indexOf('=')
      if (eq > 0) {
        const key = line.slice(0, eq).trim()
        const val = line.slice(eq + 1).trim()
        if (key && !process.env[key]) process.env[key] = val
      }
    })
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const MONGODB_DB  = process.env.MONGODB_DB  || 'lista-tareas'

const TAREAS = [
  { titulo: 'Comprar leche y pan',                     completada: false },
  { titulo: 'Llamar al médico para cita',              completada: true  },
  { titulo: 'Hacer ejercicio por 30 minutos',          completada: false },
  { titulo: 'Leer 20 páginas del libro actual',        completada: true  },
  { titulo: 'Revisar correos pendientes',              completada: false },
  { titulo: 'Pagar factura de electricidad',           completada: true  },
  { titulo: 'Preparar presentación del lunes',         completada: false },
  { titulo: 'Lavar el coche',                         completada: false },
  { titulo: 'Estudiar capítulo 3 de TypeScript',       completada: true  },
  { titulo: 'Organizar el escritorio',                 completada: false },
  { titulo: 'Llamar a mamá',                          completada: true  },
  { titulo: 'Comprar regalo de cumpleaños',            completada: false },
  { titulo: 'Hacer la compra semanal',                 completada: false },
  { titulo: 'Revisar el presupuesto del mes',          completada: true  },
  { titulo: 'Actualizar el currículum',                completada: false },
  { titulo: 'Ir al gimnasio',                         completada: true  },
  { titulo: 'Preparar cena especial',                  completada: false },
  { titulo: 'Arreglar la bicicleta',                  completada: false },
  { titulo: 'Ver película pendiente',                  completada: true  },
  { titulo: 'Programar cita con el dentista',          completada: false },
  { titulo: 'Ordenar el armario',                     completada: false },
  { titulo: 'Hacer backup del ordenador',              completada: true  },
  { titulo: 'Aprender una receta nueva',               completada: false },
  { titulo: 'Revisar las notas del curso',             completada: true  },
  { titulo: 'Completar el proyecto de prueba',         completada: false },
  { titulo: 'Enviar informe semanal',                  completada: true  },
  { titulo: 'Comprar plantas para el balcón',          completada: false },
]

async function seed() {
  const client = new MongoClient(MONGODB_URI)
  try {
    await client.connect()
    const db = client.db(MONGODB_DB)
    const col = db.collection('tareas')

    const existing = await col.countDocuments()
    if (existing >= 25) {
      console.log(`✓ Ya hay ${existing} tareas — no se siembra de nuevo. Usa --force para forzar.`)
      return
    }

    const docs = TAREAS.map((t, i) => ({
      ...t,
      creadoEn: new Date(Date.now() - i * 60_000),
    }))

    const result = await col.insertMany(docs)
    console.log(`✓ Se insertaron ${result.insertedCount} tareas en "${MONGODB_DB}".`)
  } finally {
    await client.close()
  }
}

seed().catch((err) => {
  console.error('Error al sembrar la base de datos:', err.message)
  process.exit(1)
})
