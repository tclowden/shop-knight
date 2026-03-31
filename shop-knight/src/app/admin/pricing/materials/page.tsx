import { PricingPlaceholderPage } from '@/components/admin-pricing';
import { pricingSections } from '@/lib/admin-pricing';

const materialsSection = pricingSections.find((section) => section.href === '/admin/pricing/materials');

export default function MaterialsPricingPage() {
  return (
    <PricingPlaceholderPage
      title="Materials"
      description="Placeholder admin page for material setup and related pricing records."
      relatedLinks={materialsSection?.children || []}
    />
  );
}
