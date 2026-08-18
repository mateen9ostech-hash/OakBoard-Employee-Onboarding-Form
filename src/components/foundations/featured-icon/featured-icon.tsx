import type { ComponentType, SVGProps } from 'react'

type FeaturedIconColor = 'brand' | 'gray' | 'success' | 'error'
type FeaturedIconSize = 'xs' | 'sm' | 'md'

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

export function FeaturedIcon({
  color = 'brand',
  icon: Icon,
  size = 'md',
  theme = 'outline',
}: {
  color?: FeaturedIconColor
  icon: IconComponent
  size?: FeaturedIconSize
  theme?: 'outline'
}) {
  return (
    <span aria-hidden="true" className={`featured-icon featured-icon--${color} featured-icon--${size} featured-icon--${theme}`}>
      <Icon />
    </span>
  )
}
