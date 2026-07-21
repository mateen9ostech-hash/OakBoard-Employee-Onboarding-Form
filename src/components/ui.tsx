import type { AnchorHTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type IconName =
  | 'arrow-left'
  | 'check'
  | 'close'
  | 'download'
  | 'email'
  | 'info'
  | 'plus'
  | 'print'
  | 'warning'

type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger'

type ButtonBaseProps = {
  children: ReactNode
  className?: string
  icon?: IconName
  trailingIcon?: IconName
  variant?: ButtonVariant
}

type ButtonAsButton = ButtonBaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { to?: never }
type ButtonAsLink = ButtonBaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; disabled?: boolean }

function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const common = {
    className: `ob-icon ${className}`.trim(),
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'arrow-left':
      return <svg {...common} strokeWidth="1.7"><path d="M10 4 6 8l4 4" /><path d="M6.5 8H14" /></svg>
    case 'check':
      return <svg {...common} strokeWidth="1.7"><path d="M3 8.2 6.4 11.5 13 4.8" /></svg>
    case 'close':
      return <svg {...common} strokeWidth="1.8"><path d="m4.5 4.5 7 7M11.5 4.5l-7 7" /></svg>
    case 'download':
      return <svg {...common} strokeWidth="1.6"><path d="M8 2v7" /><path d="m5.2 6.2 2.8 2.8 2.8-2.8" /><path d="M3 12.5h10" /></svg>
    case 'email':
      return <svg {...common} strokeWidth="1.6"><path d="M2.5 4.5h11v7h-11z" /><path d="m3 5 5 3.8L13 5" /></svg>
    case 'info':
      return <svg {...common} strokeWidth="1.7"><circle cx="8" cy="8" r="5.5" /><path d="M8 7.5v3.2M8 5.2h.01" /></svg>
    case 'plus':
      return <svg {...common} strokeWidth="1.7"><path d="M8 3v10M3 8h10" /></svg>
    case 'print':
      return <svg {...common} strokeWidth="1.6"><path d="M4 6V2h8v4" /><path d="M4 12H2.8A1.8 1.8 0 0 1 1 10.2V7.8A1.8 1.8 0 0 1 2.8 6h10.4A1.8 1.8 0 0 1 15 7.8v2.4a1.8 1.8 0 0 1-1.8 1.8H12" /><path d="M4 10h8v4H4z" /></svg>
    case 'warning':
      return <svg {...common} strokeWidth="1.7"><path d="M8 2.4 14 13H2L8 2.4Z" /><path d="M8 6.2v3.1M8 11.2h.01" /></svg>
  }
}

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { children, className = '', icon, trailingIcon, variant = 'secondary' } = props
  const classes = `ob-button ob-button--${variant} ${className}`.trim()
  const content = (
    <>
      {icon && <Icon name={icon} />}
      <span>{children}</span>
      {trailingIcon && <Icon name={trailingIcon} />}
    </>
  )

  if ('to' in props && props.to) {
    const linkButton = props as ButtonAsLink
    const { disabled, to } = linkButton
    const linkProps: Partial<ButtonAsLink> = { ...linkButton }
    delete linkProps.children
    delete linkProps.className
    delete linkProps.disabled
    delete linkProps.icon
    delete linkProps.to
    delete linkProps.trailingIcon
    delete linkProps.variant
    return (
      <Link
        {...(linkProps as AnchorHTMLAttributes<HTMLAnchorElement>)}
        aria-disabled={disabled || undefined}
        className={`${classes}${disabled ? ' is-disabled' : ''}`}
        href={to}
      >
        {content}
      </Link>
    )
  }

  const button = props as ButtonAsButton
  const buttonProps: Partial<ButtonAsButton> = { ...button }
  delete buttonProps.children
  delete buttonProps.className
  delete buttonProps.icon
  delete buttonProps.trailingIcon
  delete buttonProps.variant
  return (
    <button {...(buttonProps as ButtonHTMLAttributes<HTMLButtonElement>)} className={classes}>
      {content}
    </button>
  )
}

export function PageToolbar({
  actions,
  backLabel = 'Back',
  backTo,
  subtitle,
  title,
}: {
  actions: ReactNode
  backLabel?: string
  backTo?: string
  subtitle?: ReactNode
  title: ReactNode
}) {
  return (
    <div className="ob-toolbar">
      {backTo && <Button icon="arrow-left" to={backTo} variant="ghost">{backLabel}</Button>}
      <div className="ob-toolbar__title-wrap">
        <div className="ob-toolbar__title">{title}</div>
        {subtitle && <div className="ob-toolbar__subtitle">{subtitle}</div>}
      </div>
      <div className="ob-toolbar__actions">{actions}</div>
    </div>
  )
}

export function Modal({
  children,
  footer,
  icon,
  onClose,
  open,
  subtitle,
  title,
}: {
  children: ReactNode
  footer?: ReactNode
  icon?: IconName
  onClose: () => void
  open: boolean
  subtitle?: ReactNode
  title: ReactNode
}) {
  if (!open) return null

  return (
    <div className="ob-modal-overlay open" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="ob-modal" role="dialog" aria-modal="true" aria-labelledby="ob-modal-title">
        <div className="ob-modal__head">
          {icon && <div className="ob-modal__icon"><Icon name={icon} /></div>}
          <div>
            <h3 id="ob-modal-title">{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="ob-modal__close" onClick={onClose} type="button" aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        <div className="ob-modal__body">{children}</div>
        {footer && <div className="ob-modal__foot">{footer}</div>}
      </div>
    </div>
  )
}

export function StatusBanner({
  children,
  tone = 'info',
}: {
  children: ReactNode
  tone?: 'error' | 'info' | 'success' | 'warning'
}) {
  const icon: IconName = tone === 'success' ? 'check' : tone === 'error' || tone === 'warning' ? 'warning' : 'info'
  return (
    <div className={`ob-status ob-status--${tone}`}>
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  )
}

export function TextField({
  label,
  multiline,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: ReactNode
  multiline?: boolean
}) {
  return (
    <label className="ob-field">
      <span>{label}</span>
      {multiline ? <textarea {...props} /> : <input {...props} />}
    </label>
  )
}

export function BrandLogo({ label = 'OakBoard' }: { label?: string }) {
  return (
    <div className="ob-brand">
      <span className="ob-brand__mark">
        <Image src="/oakboard-logo.svg" alt="" height={40} width={40} unoptimized />
      </span>
      <span>{label}</span>
    </div>
  )
}
