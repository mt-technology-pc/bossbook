
// Every tool here wraps a query or RPC the frontend already calls directly
// (create_sale, create_purchase, receive_payment, pay_bill, and read-only
// selects against the same tables/views) — the assistant has no capability
// the human UI doesn't already have, and every call runs through the
// caller's own RLS-scoped Supabase client, so it can only ever see or
// touch that one user's data.
//
// v1 is deliberately create + search/read only — no update or delete tools,
// so the assistant can never remove or rewrite a record on its own. Editing
// and deleting stay a human-in-the-UI action.

async function resolveOne(supabase, table, nameColumn, name, extraSelect = '') {
  const select = extraSelect ? `id, ${nameColumn}, ${extraSelect}` : `id, ${nameColumn}`
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .ilike(nameColumn, `%${name}%`)
    .limit(6)

  if (error) return { error: error.message }
  if (data.length === 0) return { error: `No ${table.slice(0, -1)} found matching "${name}".` }
  if (data.length > 1) {
    return {
      error: `"${name}" matches more than one ${table.slice(0, -1)}: ${data.map((d) => d[nameColumn]).join(', ')}. Ask which one they mean.`,
    }
  }
  return { row: data[0] }
}

async function resolveProduct(supabase, name) {
  return resolveOne(supabase, 'products', 'name', name, 'price, cost, stock_quantity, tracks_serial')
}

async function resolveAccount(supabase, name) {
  const { data, error } = await supabase
    .from('account_balances')
    .select('account_id, name, type, balance')
    .ilike('name', `%${name}%`)
    .limit(6)
  if (error) return { error: error.message }
  if (data.length === 0) return { error: `No account found matching "${name}".` }
  if (data.length > 1) {
    return { error: `"${name}" matches more than one account: ${data.map((d) => d.name).join(', ')}. Ask which one they mean.` }
  }
  return { row: data[0] }
}

async function buildSaleItems(supabase, items) {
  const built = []
  for (const item of items) {
    const { row: product, error } = await resolveProduct(supabase, item.product_name)
    if (error) return { error }

    const quantity = Number(item.quantity)
    if (!quantity || quantity <= 0) return { error: `Enter a quantity for ${product.name}.` }
    if (quantity > product.stock_quantity) {
      return { error: `Only ${product.stock_quantity} of ${product.name} in stock.` }
    }

    const line = {
      product_id: product.id,
      quantity,
      unit_price: item.unit_price != null ? Number(item.unit_price) : Number(product.price),
    }

    if (product.tracks_serial) {
      const { data: units, error: unitsError } = await supabase
        .from('product_units')
        .select('id')
        .eq('product_id', product.id)
        .eq('status', 'in_stock')
        .order('created_at', { ascending: true })
        .limit(quantity)
      if (unitsError) return { error: unitsError.message }
      if (units.length < quantity) {
        return { error: `Only ${units.length} serial/IMEI unit(s) of ${product.name} in stock.` }
      }
      line.unit_ids = units.map((u) => u.id)
    }

    built.push(line)
  }
  return { items: built }
}

async function buildPurchaseItems(supabase, items) {
  const built = []
  for (const item of items) {
    const { row: product, error } = await resolveProduct(supabase, item.product_name)
    if (error) return { error }

    const quantity = Number(item.quantity)
    if (!quantity || quantity <= 0) return { error: `Enter a quantity for ${product.name}.` }

    const line = {
      product_id: product.id,
      quantity,
      unit_cost: item.unit_cost != null ? Number(item.unit_cost) : Number(product.cost),
    }

    if (product.tracks_serial) {
      const serials = item.serials
      if (!Array.isArray(serials) || serials.length !== quantity) {
        return { error: `${product.name} tracks serial/IMEI numbers — provide exactly ${quantity} serial number(s) for it.` }
      }
      line.serials = serials
    }

    built.push(line)
  }
  return { items: built }
}

const itemSchema = {
  type: 'object',
  properties: {
    product_name: { type: 'string', description: 'Product name as the user said it, doesn\'t need to be exact.' },
    quantity: { type: 'number' },
    unit_price: { type: 'number', description: 'Optional — defaults to the product\'s own price if omitted.' },
  },
  required: ['product_name', 'quantity'],
}

const purchaseItemSchema = {
  type: 'object',
  properties: {
    product_name: { type: 'string' },
    quantity: { type: 'number' },
    unit_cost: { type: 'number', description: 'Optional — defaults to the product\'s own cost if omitted.' },
    serials: {
      type: 'array',
      items: { type: 'string' },
      description: 'Required only for products that track serial/IMEI numbers — one entry per unit.',
    },
  },
  required: ['product_name', 'quantity'],
}

export const toolDeclarations = [
  {
    name: 'list_customers',
    description: 'Search the customer list by (partial) name. Use this to look up a customer before creating a document, or to answer questions about who a customer is / their balance.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Optional name filter, leave empty to list all.' } },
    },
  },
  {
    name: 'list_suppliers',
    description: 'Search the supplier list by (partial) name.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Optional name filter, leave empty to list all.' } },
    },
  },
  {
    name: 'create_customer',
    description: 'Add a new customer. Use this when the customer named in a request doesn\'t already exist (list_customers/search found no match), then proceed with whatever the user actually asked for.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        address: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_supplier',
    description: 'Add a new supplier. Use this when the supplier named in a request doesn\'t already exist (list_suppliers/search found no match), then proceed with whatever the user actually asked for.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        address: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_products',
    description: 'Search the product catalog by (partial) name. Returns price, cost, stock on hand, and whether it tracks serial/IMEI numbers.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Optional name filter, leave empty to list all.' } },
    },
  },
  {
    name: 'list_accounts',
    description: 'List cash/bank accounts and their current balances — needed to know which account a receipt/payment should go to or from.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'search_sales',
    description: 'Search invoices and sales receipts by customer name, type, reference, or date range.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string' },
        type: { type: 'string', description: '"invoice" or "receipt"' },
        reference: { type: 'string' },
        from_date: { type: 'string', description: 'YYYY-MM-DD' },
        to_date: { type: 'string', description: 'YYYY-MM-DD' },
        only_unpaid: { type: 'boolean', description: 'Only invoices with an outstanding balance.' },
      },
    },
  },
  {
    name: 'search_purchases',
    description: 'Search purchase bills by supplier name, reference, or date range.',
    parameters: {
      type: 'object',
      properties: {
        supplier_name: { type: 'string' },
        reference: { type: 'string' },
        from_date: { type: 'string', description: 'YYYY-MM-DD' },
        to_date: { type: 'string', description: 'YYYY-MM-DD' },
        only_unpaid: { type: 'boolean', description: 'Only bills with an outstanding balance.' },
      },
    },
  },
  {
    name: 'create_invoice',
    description: 'Create a credit invoice for a customer — the amount is owed, not paid yet. Use create_sales_receipt instead if they were paid on the spot.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string' },
        items: { type: 'array', items: itemSchema },
        reference: { type: 'string', description: 'Optional invoice number, auto-generated if omitted.' },
        notes: { type: 'string' },
        sale_date: { type: 'string', description: 'YYYY-MM-DD, defaults to today.' },
        due_date: { type: 'string', description: 'YYYY-MM-DD, defaults to 30 days out.' },
      },
      required: ['customer_name', 'items'],
    },
  },
  {
    name: 'create_sales_receipt',
    description: 'Create a sales receipt for a cash/bank sale paid on the spot — money is deposited immediately, nothing is owed.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Optional — omit for a walk-in customer.' },
        deposit_account_name: { type: 'string', description: 'Which cash/bank account the money goes into.' },
        items: { type: 'array', items: itemSchema },
        reference: { type: 'string' },
        notes: { type: 'string' },
        sale_date: { type: 'string', description: 'YYYY-MM-DD, defaults to today.' },
      },
      required: ['deposit_account_name', 'items'],
    },
  },
  {
    name: 'create_purchase',
    description: 'Record a supplier bill — this brings stock into inventory.',
    parameters: {
      type: 'object',
      properties: {
        supplier_name: { type: 'string' },
        items: { type: 'array', items: purchaseItemSchema },
        reference: { type: 'string' },
        notes: { type: 'string' },
        bill_date: { type: 'string', description: 'YYYY-MM-DD, defaults to today.' },
        due_date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['supplier_name', 'items'],
    },
  },
  {
    name: 'receive_payment',
    description: 'Record a payment received from a customer against their balance, optionally against one specific invoice.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string' },
        account_name: { type: 'string', description: 'Which cash/bank account the money is deposited to.' },
        amount: { type: 'number' },
        note: { type: 'string' },
        invoice_reference: { type: 'string', description: 'Optional — links the payment to one specific outstanding invoice.' },
      },
      required: ['customer_name', 'account_name', 'amount'],
    },
  },
  {
    name: 'pay_bill',
    description: 'Record a payment made to a supplier against a bill balance, optionally against one specific bill.',
    parameters: {
      type: 'object',
      properties: {
        supplier_name: { type: 'string' },
        account_name: { type: 'string', description: 'Which cash/bank account the money is paid from.' },
        amount: { type: 'number' },
        note: { type: 'string' },
        bill_reference: { type: 'string', description: 'Optional — links the payment to one specific outstanding bill.' },
      },
      required: ['supplier_name', 'account_name', 'amount'],
    },
  },
]

export async function executeTool(name, args, supabase, ownerId) {
  switch (name) {
    case 'list_customers': {
      let q = supabase.from('customer_balances').select('customer_id, name, balance').order('name')
      if (args.query) q = q.ilike('name', `%${args.query}%`)
      const { data, error } = await q.limit(25)
      return error ? { error: error.message } : { customers: data }
    }

    case 'list_suppliers': {
      let q = supabase.from('supplier_balances').select('supplier_id, name, balance').order('name')
      if (args.query) q = q.ilike('name', `%${args.query}%`)
      const { data, error } = await q.limit(25)
      return error ? { error: error.message } : { suppliers: data }
    }

    case 'create_customer': {
      const customerName = args.name?.trim()
      if (!customerName) return { error: 'Enter a customer name.' }
      const { data, error } = await supabase
        .from('customers')
        .insert({
          owner_id: ownerId,
          name: customerName,
          phone: args.phone || null,
          email: args.email || null,
          address: args.address || null,
          notes: args.notes || null,
        })
        .select('id, code, name')
        .single()
      if (error) return { error: error.message }
      return { success: true, customer_id: data.id, code: data.code, name: data.name }
    }

    case 'create_supplier': {
      const supplierName = args.name?.trim()
      if (!supplierName) return { error: 'Enter a supplier name.' }
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          owner_id: ownerId,
          name: supplierName,
          phone: args.phone || null,
          email: args.email || null,
          address: args.address || null,
          notes: args.notes || null,
        })
        .select('id, name')
        .single()
      if (error) return { error: error.message }
      return { success: true, supplier_id: data.id, name: data.name }
    }

    case 'list_products': {
      let q = supabase.from('products').select('id, name, sku, price, cost, stock_quantity, tracks_serial').order('name')
      if (args.query) q = q.ilike('name', `%${args.query}%`)
      const { data, error } = await q.limit(25)
      return error ? { error: error.message } : { products: data }
    }

    case 'list_accounts': {
      const { data, error } = await supabase.from('account_balances').select('account_id, name, type, balance').order('name')
      return error ? { error: error.message } : { accounts: data }
    }

    case 'search_sales': {
      let q = supabase
        .from('sales')
        .select('id, type, reference, sale_date, due_date, total_amount, notes, customers(name)')
        .order('sale_date', { ascending: false })
        .limit(25)
      if (args.type) q = q.eq('type', args.type)
      if (args.reference) q = q.ilike('reference', `%${args.reference}%`)
      if (args.from_date) q = q.gte('sale_date', args.from_date)
      if (args.to_date) q = q.lte('sale_date', args.to_date)
      if (args.customer_name) {
        const { row, error } = await resolveOne(supabase, 'customers', 'name', args.customer_name)
        if (error) return { error }
        q = q.eq('customer_id', row.id)
      }
      const { data, error } = await q
      if (error) return { error: error.message }

      if (!args.only_unpaid) return { sales: data }

      const ids = data.map((s) => s.id)
      const { data: balances, error: balError } = await supabase
        .from('sale_balances')
        .select('sale_id, outstanding')
        .in('sale_id', ids)
        .gt('outstanding', 0)
      if (balError) return { error: balError.message }
      const unpaidIds = new Set(balances.map((b) => b.sale_id))
      const outstandingBySale = Object.fromEntries(balances.map((b) => [b.sale_id, b.outstanding]))
      return {
        sales: data
          .filter((s) => unpaidIds.has(s.id))
          .map((s) => ({ ...s, outstanding: outstandingBySale[s.id] })),
      }
    }

    case 'search_purchases': {
      let q = supabase
        .from('purchases')
        .select('id, reference, bill_date, due_date, total_amount, notes, suppliers(name)')
        .order('bill_date', { ascending: false })
        .limit(25)
      if (args.reference) q = q.ilike('reference', `%${args.reference}%`)
      if (args.from_date) q = q.gte('bill_date', args.from_date)
      if (args.to_date) q = q.lte('bill_date', args.to_date)
      if (args.supplier_name) {
        const { row, error } = await resolveOne(supabase, 'suppliers', 'name', args.supplier_name)
        if (error) return { error }
        q = q.eq('supplier_id', row.id)
      }
      const { data, error } = await q
      if (error) return { error: error.message }

      if (!args.only_unpaid) return { purchases: data }

      const ids = data.map((p) => p.id)
      const { data: balances, error: balError } = await supabase
        .from('purchase_balances')
        .select('purchase_id, outstanding')
        .in('purchase_id', ids)
        .gt('outstanding', 0)
      if (balError) return { error: balError.message }
      const unpaidIds = new Set(balances.map((b) => b.purchase_id))
      const outstandingByPurchase = Object.fromEntries(balances.map((b) => [b.purchase_id, b.outstanding]))
      return {
        purchases: data
          .filter((p) => unpaidIds.has(p.id))
          .map((p) => ({ ...p, outstanding: outstandingByPurchase[p.id] })),
      }
    }

    case 'create_invoice': {
      const { row: customer, error: custError } = await resolveOne(supabase, 'customers', 'name', args.customer_name)
      if (custError) return { error: custError }

      const { items, error: itemsError } = await buildSaleItems(supabase, args.items)
      if (itemsError) return { error: itemsError }

      const { data: saleId, error } = await supabase.rpc('create_sale', {
        p_customer_id: customer.id,
        p_type: 'invoice',
        p_reference: args.reference || null,
        p_notes: args.notes || null,
        p_sale_date: args.sale_date || null,
        p_due_date: args.due_date || null,
        p_deposit_account_id: null,
        p_items: items,
      })
      if (error) return { error: error.message }

      const { data: created } = await supabase.from('sales').select('reference, total_amount').eq('id', saleId).single()
      return { success: true, sale_id: saleId, reference: created?.reference, total_amount: created?.total_amount }
    }

    case 'create_sales_receipt': {
      const { row: account, error: accError } = await resolveAccount(supabase, args.deposit_account_name)
      if (accError) return { error: accError }

      let customerId = null
      if (args.customer_name) {
        const { row: customer, error: custError } = await resolveOne(supabase, 'customers', 'name', args.customer_name)
        if (custError) return { error: custError }
        customerId = customer.id
      }

      const { items, error: itemsError } = await buildSaleItems(supabase, args.items)
      if (itemsError) return { error: itemsError }

      const { data: saleId, error } = await supabase.rpc('create_sale', {
        p_customer_id: customerId,
        p_type: 'receipt',
        p_reference: args.reference || null,
        p_notes: args.notes || null,
        p_sale_date: args.sale_date || null,
        p_due_date: null,
        p_deposit_account_id: account.account_id,
        p_items: items,
      })
      if (error) return { error: error.message }

      const { data: created } = await supabase.from('sales').select('reference, total_amount').eq('id', saleId).single()
      return { success: true, sale_id: saleId, reference: created?.reference, total_amount: created?.total_amount }
    }

    case 'create_purchase': {
      const { row: supplier, error: supError } = await resolveOne(supabase, 'suppliers', 'name', args.supplier_name)
      if (supError) return { error: supError }

      const { items, error: itemsError } = await buildPurchaseItems(supabase, args.items)
      if (itemsError) return { error: itemsError }

      const { data: purchaseId, error } = await supabase.rpc('create_purchase', {
        p_supplier_id: supplier.id,
        p_reference: args.reference || null,
        p_notes: args.notes || null,
        p_items: items,
        p_bill_date: args.bill_date || null,
        p_due_date: args.due_date || null,
      })
      if (error) return { error: error.message }

      const { data: created } = await supabase.from('purchases').select('reference, total_amount').eq('id', purchaseId).single()
      return { success: true, purchase_id: purchaseId, reference: created?.reference, total_amount: created?.total_amount }
    }

    case 'receive_payment': {
      const { row: customer, error: custError } = await resolveOne(supabase, 'customers', 'name', args.customer_name)
      if (custError) return { error: custError }
      const { row: account, error: accError } = await resolveAccount(supabase, args.account_name)
      if (accError) return { error: accError }

      let saleId = null
      if (args.invoice_reference) {
        const { data: sale, error } = await supabase
          .from('sales')
          .select('id')
          .eq('customer_id', customer.id)
          .ilike('reference', `%${args.invoice_reference}%`)
          .maybeSingle()
        if (error) return { error: error.message }
        if (!sale) return { error: `No invoice matching "${args.invoice_reference}" found for ${customer.name}.` }
        saleId = sale.id
      }

      const { data: paymentId, error } = await supabase.rpc('receive_payment', {
        p_customer_id: customer.id,
        p_account_id: account.account_id,
        p_amount: Number(args.amount),
        p_note: args.note || null,
        p_payment_date: null,
        p_sale_id: saleId,
      })
      if (error) return { error: error.message }
      return { success: true, payment_id: paymentId, amount: Number(args.amount), customer: customer.name }
    }

    case 'pay_bill': {
      const { row: supplier, error: supError } = await resolveOne(supabase, 'suppliers', 'name', args.supplier_name)
      if (supError) return { error: supError }
      const { row: account, error: accError } = await resolveAccount(supabase, args.account_name)
      if (accError) return { error: accError }

      let purchaseId = null
      if (args.bill_reference) {
        const { data: purchase, error } = await supabase
          .from('purchases')
          .select('id')
          .eq('supplier_id', supplier.id)
          .ilike('reference', `%${args.bill_reference}%`)
          .maybeSingle()
        if (error) return { error: error.message }
        if (!purchase) return { error: `No bill matching "${args.bill_reference}" found for ${supplier.name}.` }
        purchaseId = purchase.id
      }

      const { data: paymentId, error } = await supabase.rpc('pay_bill', {
        p_supplier_id: supplier.id,
        p_account_id: account.account_id,
        p_amount: Number(args.amount),
        p_note: args.note || null,
        p_payment_date: null,
        p_purchase_id: purchaseId,
      })
      if (error) return { error: error.message }
      return { success: true, payment_id: paymentId, amount: Number(args.amount), supplier: supplier.name }
    }

    default:
      return { error: `Unknown tool "${name}".` }
  }
}
