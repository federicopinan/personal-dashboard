import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const secretToken = process.env.INGEST_TOKEN

    // If INGEST_TOKEN is set in environment, require Bearer token
    if (secretToken) {
      if (!authHeader || authHeader.replace('Bearer ', '') !== secretToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await req.json()
    const { tile, data } = body ?? {}

    if (!tile || typeof tile !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "tile" identifier (e.g. "vitals", "train", "fuel")' }, { status: 400 })
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Missing or invalid "data" payload object' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const isoNow = new Date().toISOString()

    let synced = false
    if (url && anonKey) {
      const supabase = createClient(url, anonKey)
      
      // Load current tile data to merge if object
      const { data: existing } = await supabase
        .from('tile_data')
        .select('data')
        .eq('tile_id', tile)
        .maybeSingle()

      const mergedData = existing?.data && typeof existing.data === 'object'
        ? { ...existing.data, ...data }
        : data

      const { error } = await supabase
        .from('tile_data')
        .upsert({ tile_id: tile, data: mergedData, updated_at: isoNow }, { onConflict: 'tile_id' })

      if (!error) synced = true
    }

    return NextResponse.json({
      success: true,
      tile,
      data,
      synced,
      timestamp: isoNow,
      message: synced
        ? `Data for ${tile} successfully merged & synced to Supabase`
        : `Data for ${tile} accepted (configure Supabase for cross-device sync)`,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/ingest',
    method: 'POST',
    description: 'Ingest metrics from iOS Shortcuts, Apple Health, or external webhooks.',
    examplePayload: {
      tile: 'vitals',
      data: {
        waterMl: 2500,
        steps: 8500,
        sleepHours: 7.5,
      },
    },
  })
}
