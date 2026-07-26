import { useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Real-time lookup for a single scanned serial/IMEI — no such endpoint
// existed before this (the only prior validation was bulk, at final
// sale-submit time, inside the create_sale RPC). Exact match, not ilike:
// serials are unique per company, and whitespace-trimming is the only
// normalization worth doing — case-folding risks matching the wrong unit.
export function useSerialSlotValidation() {
  const validate = useCallback(async ({ serial, productId }) => {
    const trimmed = serial.trim()
    if (!trimmed) return { ok: false, reason: 'empty', message: 'Scan or enter a serial/IMEI.' }

    const { data, error } = await supabase
      .from('product_units')
      .select('id, product_id, status')
      .eq('serial_number', trimmed)
      .eq('product_id', productId)
      .maybeSingle()

    if (error) return { ok: false, reason: 'query-error', message: 'Could not verify this unit — try again.' }
    if (!data) return { ok: false, reason: 'not-found', message: 'No matching serial/IMEI for this product.' }
    if (data.status !== 'in_stock') return { ok: false, reason: 'not-in-stock', message: 'This unit is already sold.' }

    return { ok: true, unitId: data.id }
  }, [])

  return { validate }
}
