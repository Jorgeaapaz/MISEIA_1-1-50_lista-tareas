import { NextRequest } from 'next/server'
import { ObjectId } from 'mongodb'
import getDb from '@/lib/mongodb'

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<'/api/tareas/[id]'>
) {
  const { id } = await ctx.params

  if (!ObjectId.isValid(id)) {
    return Response.json({ error: 'ID inválido' }, { status: 400 })
  }

  const body = await request.json()
  const update: Record<string, unknown> = {}

  if (body.titulo !== undefined) update.titulo = body.titulo.trim()
  if (body.completada !== undefined) update.completada = body.completada

  if (Object.keys(update).length === 0) {
    return Response.json({ error: 'Sin campos para actualizar' }, { status: 400 })
  }

  const db = await getDb()
  const result = await db
    .collection('tareas')
    .updateOne({ _id: new ObjectId(id) }, { $set: update })

  if (result.matchedCount === 0) {
    return Response.json({ error: 'Tarea no encontrada' }, { status: 404 })
  }

  return Response.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<'/api/tareas/[id]'>
) {
  const { id } = await ctx.params

  if (!ObjectId.isValid(id)) {
    return Response.json({ error: 'ID inválido' }, { status: 400 })
  }

  const db = await getDb()
  const result = await db
    .collection('tareas')
    .deleteOne({ _id: new ObjectId(id) })

  if (result.deletedCount === 0) {
    return Response.json({ error: 'Tarea no encontrada' }, { status: 404 })
  }

  return Response.json({ ok: true })
}
