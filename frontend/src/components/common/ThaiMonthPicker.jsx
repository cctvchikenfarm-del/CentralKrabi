import { useState } from 'react'
import { THAI_MONTHS_FULL } from '../../lib/periods.js'

/**
 * Custom Thai Month & Year Picker Component
 * Displays Thai Month names (มกราคม - ธันวาคม) and Thai BE Years (พ.ศ. 2569)
 */
export default function ThaiMonthPicker({ value, onChange, label, style, alignRight = false }) {
  const currentADYear = new Date().getFullYear()

  // Parse YYYY-MM
  const parts = (value || '').split('-')
  const selectedYearAD = Number(parts[0]) || currentADYear
  const selectedMonthIdx = Math.max(0, (Number(parts[1]) || 1) - 1)

  const [isOpen, setIsOpen] = useState(false)
  const [activeYearAD, setActiveYearAD] = useState(selectedYearAD)

  const thaiYear = selectedYearAD + 543
  const activeThaiYear = activeYearAD + 543
  const monthName = THAI_MONTHS_FULL[selectedMonthIdx]

  const yearOptions = [
    currentADYear + 1,
    currentADYear,
    currentADYear - 1,
    currentADYear - 2,
    currentADYear - 3,
  ]

  function handleSelectMonth(mIdx) {
    const mStr = String(mIdx + 1).padStart(2, '0')
    const nextValue = `${activeYearAD}-${mStr}-01`
    onChange(nextValue)
    setIsOpen(false)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      {label && (
        <label className="form-label mb-1" style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold' }}>
          {label}
        </label>
      )}

      {/* Picker Trigger Button */}
      <button
        type="button"
        className="form-input flex-between"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          minWidth: 180,
          background: '#ffffff',
          cursor: 'pointer',
          padding: 'var(--space-2) var(--space-3)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          fontWeight: 'var(--fw-semibold)',
          color: 'var(--text-primary)',
        }}
      >
        <span>📅 {monthName} {thaiYear}</span>
        <span style={{ fontSize: 10, color: 'var(--gray-400)', marginLeft: 8 }}>▼</span>
      </button>

      {/* Thai Month Picker Modal Popover */}
      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: alignRight ? 'auto' : 0,
              right: alignRight ? 0 : 'auto',
              marginTop: 6,
              zIndex: 9999,
              width: 320,
              background: '#ffffff',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
              padding: 'var(--space-4)',
            }}
          >
            {/* Year Selector Header */}
            <div className="flex-between mb-4" style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveYearAD(activeYearAD - 1)}
              >
                ◀
              </button>
              <select
                className="form-select form-select-sm mb-0"
                style={{ width: 'auto', fontWeight: 'bold', fontSize: 'var(--text-sm)' }}
                value={activeYearAD}
                onChange={e => setActiveYearAD(Number(e.target.value))}
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>พ.ศ. {y + 543} ({y})</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveYearAD(activeYearAD + 1)}
              >
                ▶
              </button>
            </div>

            {/* 12 Thai Month Buttons Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
              {THAI_MONTHS_FULL.map((mName, idx) => {
                const isSelected = activeYearAD === selectedYearAD && idx === selectedMonthIdx
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectMonth(idx)}
                    style={{
                      padding: 'var(--space-2) var(--space-1)',
                      border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-default)',
                      background: isSelected ? 'var(--blue-50)' : '#ffffff',
                      color: isSelected ? 'var(--primary-dark)' : 'var(--text-primary)',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {mName}
                  </button>
                )
              })}
            </div>

            {/* Today / Current Month Shortcut */}
            <div style={{ marginTop: 'var(--space-3)', pt: 'var(--space-2)', borderTop: '1px solid var(--border-default)', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                style={{ color: 'var(--primary)', fontWeight: 'bold' }}
                onClick={() => {
                  const now = new Date()
                  const nowYear = now.getFullYear()
                  const nowMonthStr = String(now.getMonth() + 1).padStart(2, '0')
                  onChange(`${nowYear}-${nowMonthStr}-01`)
                  setIsOpen(false)
                }}
              >
                เดือนปัจจุบัน (พ.ศ. {currentADYear + 543})
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
