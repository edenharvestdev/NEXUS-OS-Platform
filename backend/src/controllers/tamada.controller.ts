import { Request, Response } from 'express'
import { queryAll } from '../lib/db'
import {
  TAMADA_DICTIONARY_SEED,
  TAMADA_DOMAIN_SUMMARY,
  getTamadaMetricsByDomain,
  getTamadaMetricsByPriority,
  type DataPriority,
} from '../lib/tamada-data-taxonomy'
import { TAMADA_ENTITIES, TAMADA_BRANCHES } from '../lib/tamada-entities'
import { TAMADA_INGEST_MAPPINGS } from '../lib/tamada-ingest-mapping'
import { applyTamadaFullSeed } from '../lib/tamada-seed'

export async function getTaxonomy(req: Request, res: Response): Promise<void> {
  const domain = req.query.domain as string | undefined
  const priority = req.query.priority as string | undefined
  let metrics = TAMADA_DICTIONARY_SEED
  if (domain) metrics = getTamadaMetricsByDomain(domain)
  else if (priority) metrics = getTamadaMetricsByPriority(priority as DataPriority)
  res.json({
    version: '2.0',
    source: 'Data_Driven_Org_By Nexus OS.pdf',
    total: TAMADA_DICTIONARY_SEED.length,
    domains: TAMADA_DOMAIN_SUMMARY,
    metrics,
  })
}

export async function getEntities(req: Request, res: Response): Promise<void> {
  const rows = await queryAll(
    'SELECT * FROM entities WHERE company_id = $1 ORDER BY entity_key',
    [req.user.company_id],
  )
  res.json({ template: TAMADA_ENTITIES, entities: rows })
}

export async function getBranches(req: Request, res: Response): Promise<void> {
  const rows = await queryAll(
    'SELECT * FROM branches WHERE company_id = $1 ORDER BY code',
    [req.user.company_id],
  )
  res.json({ template: TAMADA_BRANCHES, branches: rows })
}

export async function getIngestMapping(_req: Request, res: Response): Promise<void> {
  res.json({ mappings: TAMADA_INGEST_MAPPINGS })
}

export async function seedTamada(req: Request, res: Response): Promise<void> {
  const result = await applyTamadaFullSeed(req.user.company_id, req.user.id)
  res.json({ success: true, ...result })
}
