export type PricingLeafLink = {
  href: string;
  label: string;
  description: string;
};

export type PricingSection = PricingLeafLink & {
  children?: PricingLeafLink[];
};

export const pricingSections: PricingSection[] = [
  {
    href: '/admin/pricing/labor-rates',
    label: 'Labor Rates',
    description: 'Manage placeholder labor rate tables and future labor pricing rules.',
  },
  {
    href: '/admin/pricing/machine-rates',
    label: 'Machine Rates',
    description: 'Manage baseline machine-rate records used by pricing workflows.',
  },
  {
    href: '/admin/pricing/discounts',
    label: 'Discounts',
    description: 'Define discount structures and placeholder admin controls.',
  },
  {
    href: '/admin/pricing/discount-codes',
    label: 'Discount Codes',
    description: 'Maintain promo and internal discount code placeholders.',
  },
  {
    href: '/admin/pricing/modifiers',
    label: 'Modifiers',
    description: 'Configure pricing modifiers, markups, and adjustment placeholders.',
  },
  {
    href: '/admin/pricing/pricing-formulas',
    label: 'Pricing Formulas',
    description: 'Review and manage formula definitions that pricing will reference.',
  },
  {
    href: '/admin/pricing/material-pricing-levels',
    label: 'Material Pricing Levels',
    description: 'Create pricing tier placeholders for materials and material classes.',
  },
  {
    href: '/admin/pricing/materials',
    label: 'Materials',
    description: 'Browse material setup areas and related placeholder configuration pages.',
    children: [
      {
        href: '/admin/pricing/materials/list',
        label: 'Material List',
        description: 'Placeholder landing page for individual material records.',
      },
      {
        href: '/admin/pricing/materials/types',
        label: 'Material Types',
        description: 'Placeholder landing page for material type definitions.',
      },
      {
        href: '/admin/pricing/materials/categories',
        label: 'Material Categories',
        description: 'Placeholder landing page for material category definitions.',
      },
    ],
  },
];

export function getPricingSectionByHref(href: string) {
  for (const section of pricingSections) {
    if (section.href === href) return section;
    const child = section.children?.find((item) => item.href === href);
    if (child) return { ...child };
  }
  return null;
}
