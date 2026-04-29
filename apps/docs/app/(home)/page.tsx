import { FeatureClaims } from '@/components/landing/FeatureClaims'
import { FrameworksRow } from '@/components/landing/FrameworksRow'
import { Hero } from '@/components/landing/Hero'
import { LandingCTA } from '@/components/landing/LandingCTA'
import { PackageCards } from '@/components/landing/PackageCards'

export default function LandingPage() {
	return (
		<main>
			<Hero />
			<FrameworksRow />
			<PackageCards />
			<FeatureClaims />
			<LandingCTA />
		</main>
	)
}
