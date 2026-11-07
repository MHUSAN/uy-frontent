import {
  Briefcase,
  Building2,
  Hotel,
  House,
  LandPlot,
  Store,
  Tag,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'

const ICON_MATCHERS: Array<{ keywords: string[]; icon: LucideIcon }> = [
  { keywords: ['apartment', 'flat', 'kvartira'], icon: Building2 },
  { keywords: ['house', 'home', 'uy', 'cottage', 'dacha'], icon: House },
  { keywords: ['land', 'plot', 'yer', 'ground'], icon: LandPlot },
  { keywords: ['commercial', 'shop', 'store', 'do‘kon'], icon: Store },
  { keywords: ['office', 'ofis', 'business'], icon: Briefcase },
  { keywords: ['hotel', 'mehmonxona'], icon: Hotel },
  { keywords: ['warehouse', 'ombor', 'storage'], icon: Warehouse },
]

export function getCategoryIcon(slug: string): LucideIcon {
  const normalizedSlug = slug.toLowerCase()

  const match = ICON_MATCHERS.find(({ keywords }) =>
    keywords.some((keyword) => normalizedSlug.includes(keyword)),
  )

  return match?.icon ?? Tag
}
