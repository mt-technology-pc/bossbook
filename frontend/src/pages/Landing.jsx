import MainLayout from '../layouts/MainLayout'
import Hero from '../components/sections/Hero'
import IndustriesStrip from '../components/sections/IndustriesStrip'
import Features from '../components/sections/Features'
import SerialTracking from '../components/sections/SerialTracking'
import HowItWorks from '../components/sections/HowItWorks'
import AboutPreview from '../components/sections/AboutPreview'
import Pricing from '../components/sections/Pricing'
import CTA from '../components/sections/CTA'

export default function Landing() {
  return (
    <MainLayout>
      <Hero />
      <IndustriesStrip />
      <Features />
      <SerialTracking />
      <HowItWorks />
      <AboutPreview />
      <Pricing />
      <CTA />
    </MainLayout>
  )
}
