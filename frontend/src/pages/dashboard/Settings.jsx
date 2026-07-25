import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Palette, ImagePlus, Trash2, RotateCcw, AlertCircle, Check, ShieldAlert, Building2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/currency'
import { useCompany } from '../../hooks/useCompany'
import { useCompanyRole } from '../../hooks/useCompanyRole'
import { deriveShades, isValidHex, getContrastRatio } from '../../lib/brandColor'
import Button from '../../components/ui/Button'

const DEFAULT_COLOR = '#0047ab'
const PRESET_COLORS = ['#0047ab', '#b3541e', '#1f7a4d', '#7a1f6e', '#1f1b16']
const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']

export default function Settings() {
  const { company, refetch } = useCompany()
  const { isOwner, loading: roleLoading } = useCompanyRole()

  const [initialized, setInitialized] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [brandColor, setBrandColor] = useState(DEFAULT_COLOR)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef(null)

  // Sync the draft from the saved company exactly once, when it first
  // loads — not on every refetch, so a Save-triggered refetch mid-edit
  // can't clobber unsaved changes the user is still looking at.
  useEffect(() => {
    if (company && !initialized) {
      setCompanyName(company.name || '')
      setAddress(company.address || '')
      setEmail(company.email || '')
      setPhone(company.phone || '')
      setBrandColor(company.brand_color || DEFAULT_COLOR)
      setInitialized(true)
    }
  }, [company, initialized])

  const isDirty =
    logoFile !== null ||
    removeLogo ||
    (initialized && (
      brandColor !== (company?.brand_color || DEFAULT_COLOR) ||
      companyName !== (company?.name || '') ||
      address !== (company?.address || '') ||
      email !== (company?.email || '') ||
      phone !== (company?.phone || '')
    ))

  const shades = deriveShades(isValidHex(brandColor) ? brandColor : DEFAULT_COLOR)
  const contrastRatio = getContrastRatio(isValidHex(brandColor) ? brandColor : DEFAULT_COLOR, '#ffffff')
  const lowContrast = contrastRatio < 3

  const currentLogoSrc = logoPreviewUrl || (removeLogo ? null : company?.logo_url)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setError('Logo must be a PNG, JPG, or SVG file.')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError('Logo must be 2MB or smaller.')
      return
    }

    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setError(null)
    setRemoveLogo(false)
    setLogoFile(file)
    setLogoPreviewUrl(URL.createObjectURL(file))
  }

  const handleRemoveLogo = () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setLogoFile(null)
    setLogoPreviewUrl(null)
    setRemoveLogo(true)
  }

  const handleDiscard = () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setLogoFile(null)
    setLogoPreviewUrl(null)
    setRemoveLogo(false)
    setBrandColor(company?.brand_color || DEFAULT_COLOR)
    setCompanyName(company?.name || '')
    setAddress(company?.address || '')
    setEmail(company?.email || '')
    setPhone(company?.phone || '')
    setError(null)
  }

  const handleSave = async () => {
    if (!company) return
    if (!companyName.trim()) {
      setError('Company name cannot be empty.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      let logoUrl = company.logo_url || null

      if (removeLogo) {
        await supabase.storage.from('company-logos').remove([`${company.id}/logo`])
        logoUrl = null
      } else if (logoFile) {
        const { error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(`${company.id}/logo`, logoFile, { upsert: true, contentType: logoFile.type })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('company-logos').getPublicUrl(`${company.id}/logo`)
        logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`
      }

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          logo_url: logoUrl,
          brand_color: isValidHex(brandColor) ? brandColor : null,
          name: companyName.trim(),
          address: address.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        })
        .eq('id', company.id)
      if (updateError) throw updateError

      setLogoFile(null)
      setLogoPreviewUrl(null)
      setRemoveLogo(false)
      await refetch()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message || 'Could not save branding.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = async () => {
    if (!company) return
    setSaving(true)
    setError(null)
    try {
      await supabase.storage.from('company-logos').remove([`${company.id}/logo`])
      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: null, brand_color: null })
        .eq('id', company.id)
      if (updateError) throw updateError

      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
      setLogoFile(null)
      setLogoPreviewUrl(null)
      setRemoveLogo(false)
      setBrandColor(DEFAULT_COLOR)
      await refetch()
    } catch (err) {
      setError(err.message || 'Could not reset branding.')
    } finally {
      setSaving(false)
    }
  }

  if (!company || roleLoading) {
    return (
      <div className="flex justify-center py-24">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
        Settings
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Company info and branding — shown across the app, invoices, and receipts.
      </p>

      {!isOwner && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-ink-400/20 bg-cream-200/60 px-3.5 py-2.5 text-sm text-ink-600">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          Only the account owner can change these settings — ask an owner to update this.
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
                <Building2 size={16} />
              </span>
              <h2 className="font-heading text-base font-semibold text-ink-900">Company info</h2>
            </div>

            <div className="mt-4 space-y-4">
              <Field
                label="Company name *"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={!isOwner}
                placeholder="Your business name"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isOwner}
                  placeholder="07X XXX XXXX"
                />
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isOwner}
                  placeholder="Optional"
                />
              </div>
              <Field
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!isOwner}
                placeholder="Optional"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
                <ImagePlus size={16} />
              </span>
              <h2 className="font-heading text-base font-semibold text-ink-900">Logo</h2>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-16 w-32 shrink-0 items-center justify-center rounded-xl border border-dashed border-ink-400/25 bg-cream-100 p-2">
                {currentLogoSrc ? (
                  <img src={currentLogoSrc} alt="Company logo" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-ink-400">No logo</span>
                )}
              </div>
              {isOwner && (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus size={14} /> Upload logo
                  </Button>
                  {currentLogoSrc && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-red-500"
                    >
                      <Trash2 size={12} /> Remove logo
                    </button>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <p className="mt-3 text-xs text-ink-400">
              PNG, JPG, or SVG — up to 2MB. Shown in the sidebar, invoices, and receipts.
            </p>
          </section>

          <section className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
                <Palette size={16} />
              </span>
              <h2 className="font-heading text-base font-semibold text-ink-900">Color tone</h2>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                type="color"
                value={isValidHex(brandColor) ? brandColor : DEFAULT_COLOR}
                onChange={(e) => setBrandColor(e.target.value)}
                disabled={!isOwner}
                className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-ink-400/20 bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                disabled={!isOwner}
                placeholder="#0047ab"
                className="w-32 rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 font-mono text-sm text-ink-900 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 disabled:opacity-50"
              />
            </div>

            {!isValidHex(brandColor) && (
              <p className="mt-2 text-xs text-red-500">Enter a valid hex color, e.g. #0047ab.</p>
            )}
            {isValidHex(brandColor) && lowContrast && (
              <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle size={12} /> This color is quite light — text may be hard to read on top of it.
              </p>
            )}

            {isOwner && (
              <div className="mt-4 flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBrandColor(c)}
                    aria-label={`Use preset color ${c}`}
                    style={{ backgroundColor: c }}
                    className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      brandColor.toLowerCase() === c ? 'border-ink-900' : 'border-white shadow'
                    }`}
                  />
                ))}
              </div>
            )}
          </section>

          {isOwner && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="primary" disabled={!isDirty || saving} onClick={handleSave}>
                {saving ? 'Saving…' : saved ? <><Check size={15} /> Saved</> : 'Save changes'}
              </Button>
              <Button type="button" variant="ghost" disabled={!isDirty || saving} onClick={handleDiscard}>
                Discard changes
              </Button>
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={saving}
                className="ml-auto flex items-center gap-1.5 text-xs font-medium text-ink-400 hover:text-red-500 disabled:opacity-50"
              >
                <RotateCcw size={13} /> Reset to default
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
          <h2 className="font-heading text-base font-semibold text-ink-900">Live preview</h2>
          <p className="mt-1 text-xs text-ink-400">Updates as you edit — nothing changes for real until you save.</p>

          <div
            style={{
              '--color-clay-400': shades[400],
              '--color-clay-500': shades[500],
              '--color-clay-600': shades[600],
              '--color-clay-700': shades[700],
            }}
            className="mt-4 space-y-4 rounded-xl border border-ink-400/10 bg-cream-100 p-5"
          >
            <div className="flex items-center gap-3">
              {currentLogoSrc ? (
                <img src={currentLogoSrc} alt="Logo preview" className="h-8 w-auto object-contain" />
              ) : (
                <span className="font-heading text-sm font-semibold text-ink-900">{companyName || company.name}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-clay-500 px-4 py-2 text-xs font-medium text-cream-50 shadow">
                Save & Print
              </span>
              <span className="rounded-lg bg-clay-500/10 px-3 py-2 text-xs font-medium text-clay-600">
                Sales
              </span>
            </div>

            <div className="rounded-lg border border-ink-900/10 bg-white p-3">
              <div className="flex items-center justify-between border-t-2 border-ink-900/20 pt-2 text-sm font-semibold text-ink-900">
                <span>Total</span>
                <span>{formatCurrency(45000)}</span>
              </div>
              <div className="mt-1 text-xs text-clay-600 underline">View invoice</div>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: isDirty && isOwner ? 1 : 0 }}
        className="pointer-events-none fixed inset-x-0 bottom-4 flex justify-center print:hidden"
      >
        {isDirty && isOwner && (
          <div className="pointer-events-auto rounded-full border border-ink-400/15 bg-ink-900 px-4 py-2 text-xs font-medium text-cream-50 shadow-lg">
            You have unsaved changes.
          </div>
        )}
      </motion.div>
    </div>
  )
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-500">{label}</span>
      <input
        {...props}
        className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 disabled:opacity-50"
      />
    </label>
  )
}
