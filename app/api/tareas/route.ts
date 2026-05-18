import { NextRequest } from 'next/server'
import getDb from '@/lib/mongodb'

export async function GET() {
  const db = await getDb()
  const tareas = await db
    .collection('tareas')
    .find({})
    .sort({ creadoEn: -1 })
    .toArray()

  const serialized = tareas.map((t) => ({
    ...t,
    _id: t._id.toString(),
  }))

  return Response.json(serialized)
}

export async function POST(request: NextRequest) {
  const { titulo } = await request.json()

  if (!titulo?.trim()) {
    return Response.json({ error: 'El título es requerido' }, { status: 400 })
  }

  const db = await getDb()
  const result = await db.collection('tareas').insertOne({
    titulo: titulo.trim(),
    completada: false,
    creadoEn: new Date(),
  })

  return Response.json({ _id: result.insertedId.toString(), titulo: titulo.trim(), completada: false }, { status: 201 })
}
