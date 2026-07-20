import React, { useState } from 'react';
import SolarCalculator from './components/SolarCalculator';
import PredictionDashboard from './components/PredictionDashboard';
import MaintenanceAlert from './components/MaintenanceAlert';
import SunCalcLearnMore from './components/SunCalcLearnMore';
import PanelGuardLearnMore from './components/PanelGuardLearnMore';
import ChatWidget from './components/ChatWidget';
import { ChevronDown, Sun, Menu, X } from 'lucide-react';
import { motion } from 'framer-motion';

function App() {
    const [activePage, setActivePage] = useState('home');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const closeMobile = () => setMobileMenuOpen(false);

    // Inner-page navbar (calculator / prediction / maintenance)
    const InnerNav = () => (
        <nav className="nav-glass">
            <div className="nav-inner">
                <button onClick={() => setActivePage('home')} className="nav-brand">
                    <Sun size={22} /> SOLAR.agent
                </button>
                <button onClick={() => setActivePage('home')} className="nav-back">
                    ← Back to Home
                </button>
            </div>
        </nav>
    );

    if (activePage !== 'home') {
        return (
            <div className="min-h-screen bg-white">
                {activePage === 'suncalc-learn' && <SunCalcLearnMore onBack={() => setActivePage('home')} />}
                {activePage === 'panelguard-learn' && <PanelGuardLearnMore onBack={() => setActivePage('home')} />}

                {(activePage === 'calculator' || activePage === 'prediction' || activePage === 'maintenance') && (
                    <>
                        <InnerNav />
                        <main className="pt-20 px-6 pb-12">
                            {activePage === 'calculator' && <SolarCalculator />}
                            {activePage === 'prediction' && <PredictionDashboard />}
                            {activePage === 'maintenance' && <MaintenanceAlert />}
                        </main>
                    </>
                )}
                <ChatWidget />
            </div>
        );
    }

    return (
        <div className="scroll-container">
            {/* ── Glassmorphism Navbar ── */}
            <nav className="nav-glass">
                <div className="nav-inner">
                    <button onClick={() => window.scrollTo({ top: 0 })} className="nav-brand">
                        <Sun size={22} /> SOLAR.agent
                    </button>

                    {/* Desktop links */}
                    <div className="nav-links">
                        <a href="#suncalc" className="nav-link">SunCalc</a>
                        <a href="#gridsmart" className="nav-link">GridSmart</a>
                        <a href="#panelguard" className="nav-link">PanelGuard</a>
                        <a href="#about" className="nav-link">About</a>
                    </div>

                    {/* Mobile hamburger */}
                    <button className="nav-hamburger" onClick={() => setMobileMenuOpen(true)}>
                        <Menu size={24} />
                    </button>
                </div>
            </nav>

            {/* ── Mobile slide-in menu ── */}
            {mobileMenuOpen && (
                <div className="mobile-menu-overlay active" onClick={closeMobile} />
            )}
            <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
                <button className="mobile-menu-close" onClick={closeMobile}>
                    <X size={24} />
                </button>
                <a href="#suncalc" className="nav-link" onClick={closeMobile}>☀️ SunCalc</a>
                <a href="#gridsmart" className="nav-link" onClick={closeMobile}>⚡ GridSmart</a>
                <a href="#panelguard" className="nav-link" onClick={closeMobile}>🛡️ PanelGuard</a>
                <a href="#about" className="nav-link" onClick={closeMobile}>ℹ️ About</a>
            </div>

            {/* ── Section 1: SunCalc ── */}
            <section id="suncalc" className="snap-section">
                <div className="section-image" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}image1st.jpg)` }} />
                <div className="section-overlay" />
                <div className="section-content">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center"
                    >
                        <h1 className="section-title">Unlock the Power of the Sun</h1>
                        <p className="section-subtitle">Estimate Your Solar Energy Potential Effortlessly</p>
                        <div className="cta-buttons">
                            <button onClick={() => setActivePage('calculator')} className="cta-primary">
                                Try SunCalc
                            </button>
                            <button onClick={() => setActivePage('suncalc-learn')} className="cta-secondary">
                                Learn More
                            </button>
                        </div>
                    </motion.div>
                </div>
                <a href="#gridsmart" className="scroll-indicator">
                    <ChevronDown className="animate-bounce" size={32} />
                </a>
            </section>

            {/* ── Section 2: GridSmart ── */}
            <section id="gridsmart" className="snap-section">
                <div className="section-image" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}image2.jpg)` }} />
                <div className="section-overlay" />
                <div className="section-content">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="text-center"
                    >
                        <h1 className="section-title">Optimize Your Energy Consumption</h1>
                        <p className="section-subtitle">Lightweight Oneshot Forecasting for the Grid</p>
                        <div className="cta-buttons">
                            <button onClick={() => setActivePage('prediction')} className="cta-primary">
                                Explore GridSmart
                            </button>
                        </div>
                    </motion.div>
                </div>
                <a href="#panelguard" className="scroll-indicator">
                    <ChevronDown className="animate-bounce" size={32} />
                </a>
            </section>

            {/* ── Section 3: PanelGuard ── */}
            <section id="panelguard" className="snap-section">
                <div className="section-image" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}image3.jpg)` }} />
                <div className="section-overlay" />
                <div className="section-content">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="text-center"
                    >
                        <h1 className="section-title">Safeguard Your Solar Panels</h1>
                        <p className="section-subtitle">Identify and Mitigate Defects Early</p>
                        <div className="cta-buttons">
                            <button onClick={() => setActivePage('maintenance')} className="cta-primary">
                                Get Started
                            </button>
                            <button onClick={() => setActivePage('panelguard-learn')} className="cta-secondary">
                                How It Works
                            </button>
                        </div>
                    </motion.div>
                </div>
                <a href="#about" className="scroll-indicator">
                    <ChevronDown className="animate-bounce" size={32} />
                </a>
            </section>

            {/* ── Section 4: About ── */}
            <section id="about" className="snap-section bg-white">
                <div className="section-content">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="max-w-4xl mx-auto text-center"
                    >
                        <h1 className="text-5xl font-bold text-gray-900 mb-6">About SOLAR.agent</h1>
                        <p className="text-xl text-gray-700 leading-relaxed mb-8">
                            SOLAR.agent helps Indian homeowners make confident rooftop solar decisions — from
                            estimating costs and savings, to forecasting energy generation, to checking
                            panel health with a single photo.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                            <div className="p-6">
                                <h3 className="text-2xl font-semibold text-gray-900 mb-3">☀️ SunCalc</h3>
                                <p className="text-gray-600">Get your solar ROI, subsidy eligibility, and payback period in seconds</p>
                            </div>
                            <div className="p-6">
                                <h3 className="text-2xl font-semibold text-gray-900 mb-3">⚡ GridSmart</h3>
                                <p className="text-gray-600">See hourly energy generation forecasts to plan usage and maximise savings</p>
                            </div>
                            <div className="p-6">
                                <h3 className="text-2xl font-semibold text-gray-900 mb-3">🛡️ PanelGuard</h3>
                                <p className="text-gray-600">Upload a photo of your panel and get instant defect detection with maintenance advice</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── Global Chat Widget ── */}
            <ChatWidget />
        </div>
    );
}

export default App;
