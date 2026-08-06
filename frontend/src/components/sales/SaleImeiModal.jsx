import Modal from '../ui/Modal'
import Button from '../ui/Button'
import ImeiSearchList from '../dashboard/ImeiSearchList'

// The Sales equivalent of ImeiPicker, but as a popup (like Purchase's
// serial modal) rather than inline — and searching/selecting from
// already-in-stock units instead of blank manual entry, since a sale
// draws from existing inventory rather than adding new units to it.
// `units` is handed in already resolved (available stock for this
// product, plus this sale's own already-tied units in edit mode, minus
// whatever's picked on the sale's other lines) rather than fetched here —
// that data already lives in the page via useAvailableUnits/mergedAvailableUnits.
export default function SaleImeiModal({ open, onClose, product, units, value, onChange, requiredCount }) {
  if (!product) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Serial / IMEI numbers"
      subtitle={`${product.name} — select ${requiredCount} unit${requiredCount === 1 ? '' : 's'}`}
    >
      <div className="mt-4">
        <ImeiSearchList
          units={units}
          value={value}
          onChange={onChange}
          requiredCount={requiredCount}
        />
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="primary" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  )
}
