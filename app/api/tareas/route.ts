import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase, resetConnection } from '@/lib/mongodb'

const MOCK_TAREAS = [
  { _id: 'mock-1', titulo: 'Revisar correos (sin conexión)', completada: false },
  { _id: 'mock-2', titulo: 'Preparar informe semanal (sin conexión)', completada: true },
  { _id: 'mock-3', titulo: 'Actualizar documentación (sin conexión)', completada: false },
]

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    const tareas = await db
      .collection('tareas')
      .find({})
      .sort({ creadoEn: -1 })
      .toArray()

    const serialized = tareas.map((t) => ({
      ...t,
      _id: t._id.toString(),
    }))

    return NextResponse.json(serialized, {
      headers: { 'X-DB-Status': 'connected' },
    })
  } catch {
    resetConnection()
    return NextResponse.json(MOCK_TAREAS, {
      headers: { 'X-DB-Status': 'disconnected' },
    })
  }
}

export async function POST(request: NextRequest) {
  const { titulo } = await request.json()

  if (!titulo?.trim()) {
    return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
  }

  try {
    const { db } = await connectToDatabase()
    const result = await db.collection('tareas').insertOne({
      titulo: titulo.trim(),
      completada: false,
      creadoEn: new Date(),
    })

    return NextResponse.json(
      { _id: result.insertedId.toString(), titulo: titulo.trim(), completada: false },
      { status: 201 },
    )
  } catch {
    resetConnection()
    return NextResponse.json(
      { error: 'Base de datos no disponible' },
      { status: 503 },
    )
  }
}
