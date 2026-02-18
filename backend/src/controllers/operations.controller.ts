import { Request, Response } from 'express'
import prisma from '../prisma'

export const getOperations = async (req: Request, res: Response) => {
  try {
    const ops = await prisma.operacionCatalog.findMany({ orderBy: { orden: 'asc' } })
    res.json(ops)
  } catch (error) {
    console.error('Error fetching operations catalog', error)
    res.status(500).json({ error: 'Error fetching operations' })
  }
}
