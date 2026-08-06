import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import ImeiSearchList from './ImeiSearchList'

export default function ImeiPicker({
  productId, saleId, purchaseId, value = [], onChange, mode, requiredCount, creditNoteId,
}) {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!productId) return
    const fetchUnits = async () => {
      setLoading(true)
      let query = supabase
        .from('product_units')
        .select('id, serial_number, status')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })

      if (mode === 'credit_note' && saleId) {
        // Units this exact credit note already returned are sitting at
        // 'returned_by_customer', not 'sold' — editing the credit note
        // must still let those be (re)selected, or a user could never
        // save an edit that touches a serialized line without first
        // being able to pick the units it already has.
        let ownIds = []
        if (creditNoteId) {
          const { data: events } = await supabase
            .from('product_unit_events')
            .select('product_unit_id')
            .eq('source_table', 'credit_notes')
            .eq('source_id', creditNoteId)
            .eq('event_type', 'customer_return')
          ownIds = (events ?? []).map((e) => e.product_unit_id).filter(Boolean)
        }
        query = query.eq('sale_id', saleId)
        query = ownIds.length > 0
          ? query.or(`status.eq.sold,id.in.(${ownIds.join(',')})`)
          : query.eq('status', 'sold')
      } else if (mode === 'purchase_return' && purchaseId) {
        query = query.eq('purchase_id', purchaseId).eq('status', 'in_stock')
      }

      const { data } = await query
      setUnits(data ?? [])
      setLoading(false)
    }
    fetchUnits()
  }, [productId, saleId, purchaseId, mode, creditNoteId])

  if (!productId) return null

  return (
    <div className="mt-2 rounded-xl border border-ink-400/15 bg-cream-100 p-3">
      {loading ? (
        <div className="flex justify-center py-3">
          <span className="h-4 w-4 animate-spin rounded-full border border-clay-500/30 border-t-clay-500" />
        </div>
      ) : (
        <ImeiSearchList
          units={units}
          value={value}
          onChange={onChange}
          requiredCount={requiredCount}
          notFoundLabel={mode === 'credit_note' ? 'invoice unit' : 'unit'}
        />
      )}
    </div>
  )
}
