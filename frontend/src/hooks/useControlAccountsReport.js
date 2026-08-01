import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function sum(arr) {
  return arr.reduce((s, v) => s + (Number(v) || 0), 0)
}

function isReconciled(control, subsidiary) {
  if (control === null) return subsidiary < 0.01
  return Math.abs(control - subsidiary) < 0.01
}

export function useControlAccountsReport() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!user) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const [coaRes, customersRes, suppliersRes, productsRes, accountsRes] = await Promise.all([
      supabase.from('chart_of_accounts_balances').select('coa_id,name,system_key,account_id,balance'),
      supabase.from('customer_balances').select('balance'),
      supabase.from('supplier_balances').select('balance'),
      supabase.from('products').select('stock_quantity,cost'),
      supabase.from('account_balances').select('account_id,name,balance,type'),
    ])

    const firstError = [coaRes, customersRes, suppliersRes, productsRes, accountsRes].find(r => r.error)
    if (firstError) {
      setError(firstError.error.message)
      setLoading(false)
      return
    }

    const coaData      = coaRes.data ?? []
    const customersData = customersRes.data ?? []
    const suppliersData = suppliersRes.data ?? []
    const productsData  = productsRes.data ?? []
    const accountsData  = accountsRes.data ?? []

    const coaByKey  = Object.fromEntries(coaData.filter(a => a.system_key).map(a => [a.system_key, a]))
    const coaByAcct = Object.fromEntries(coaData.filter(a => a.account_id).map(a => [a.account_id, a]))

    const arControl    = coaByKey['accounts_receivable']?.balance ?? null
    const arSubsidiary = sum(customersData.map(c => c.balance))

    const apControl    = coaByKey['accounts_payable']?.balance ?? null
    const apSubsidiary = sum(suppliersData.map(s => s.balance))

    const inventoryControl    = coaByKey['inventory']?.balance ?? null
    const inventorySubsidiary = sum(productsData.map(p => (p.stock_quantity ?? 0) * (p.cost ?? 0)))

    const cashAccounts = accountsData.map(acct => {
      const control = coaByAcct[acct.account_id]?.balance ?? null
      const subsidiary = Number(acct.balance) || 0
      return {
        name:       acct.name,
        type:       acct.type,
        subsidiary,
        control,
        diff:       control !== null ? Math.abs(control - subsidiary) : null,
        reconciled: isReconciled(control, subsidiary),
      }
    })

    setData({
      ar: {
        control:    arControl,
        subsidiary: arSubsidiary,
        diff:       arControl !== null ? Math.abs(arControl - arSubsidiary) : null,
        reconciled: isReconciled(arControl, arSubsidiary),
      },
      ap: {
        control:    apControl,
        subsidiary: apSubsidiary,
        diff:       apControl !== null ? Math.abs(apControl - apSubsidiary) : null,
        reconciled: isReconciled(apControl, apSubsidiary),
      },
      inventory: {
        control:    inventoryControl,
        subsidiary: inventorySubsidiary,
        diff:       inventoryControl !== null ? Math.abs(inventoryControl - inventorySubsidiary) : null,
        reconciled: isReconciled(inventoryControl, inventorySubsidiary),
      },
      cashAccounts,
    })
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
