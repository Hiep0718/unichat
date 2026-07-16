/**
 * Landing page — public home screen (unauthenticated visitors).
 * Composes the Hero, Features, and How-It-Works sections.
 */

import { Footer } from '../../components/footer';
import { TopNavBar } from '../../components/top-nav-bar';

import { FeaturesSection } from './components/features-section';
import { HeroSection } from './components/hero-section';
import { HowItWorksSection } from './components/how-it-works-section';

/**
 * Renders the full landing page with navigation, hero, features, how-it-works, and footer.
 */
function LandingPage() {
  return (
    <>
      <TopNavBar />
      <main style={{ paddingTop: 64 }}>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
      </main>
      <Footer />
    </>
  );
}

export default LandingPage;
