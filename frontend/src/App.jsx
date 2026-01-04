import React, { useState } from 'react';
import SolarCalculator from './components/SolarCalculator';
import PredictionDashboard from './components/PredictionDashboard';
import MaintenanceAlert from './components/MaintenanceAlert';
import SunCalcLearnMore from './components/SunCalcLearnMore';
import PanelGuardLearnMore from './components/PanelGuardLearnMore';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

function App() {
    const [activePage, setActivePage] = useState('home');

    if (activePage !== 'home') {
        return (
            <div className="min-h-screen bg-white">
                {/* Render Learn More pages without header */}
                {activePage === 'suncalc-learn' && <SunCalcLearnMore onBack={() => setActivePage('home')} />}
                {activePage === 'panelguard-learn' && <PanelGuardLearnMore onBack={() => setActivePage('home')} />}

                {/* Regular feature pages with header */}
                {(activePage === 'calculator' || activePage === 'prediction' || activePage === 'maintenance') && (
                    <>
                        <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
                            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                                <button
                                    onClick={() => setActivePage('home')}
                                    className="text-2xl font-semibold text-gray-900 tracking-tight"
                                >
                                    SOLAR.ai
                                </button>
                                <button
                                    onClick={() => setActivePage('home')}
                                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    ← Back to Home
                                </button>
                            </div>
                        </nav>

                        <main className="pt-20 px-6 pb-12">
                            {activePage === 'calculator' && <SolarCalculator />}
                            {activePage === 'prediction' && <PredictionDashboard />}
                            {activePage === 'maintenance' && <MaintenanceAlert />}
                        </main>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="scroll-container">
            {/* Fixed Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="text-2xl font-semibold text-gray-900 tracking-tight">
                        SOLAR.ai
                    </div>
                    <div className="hidden md:flex space-x-8">
                        <a href="#suncalc" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">SunCalc</a>
                        <a href="#gridsmart" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">GridSmart</a>
                        <a href="#panelguard" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">PanelGuard</a>
                        <a href="#about" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">About</a>
                    </div>
                </div>
            </nav>

            {/* Hero Section - SunCalc */}
            <section id="suncalc" className="snap-section">
                <div className="section-image" style={{ backgroundImage: 'url(/image1st.jpg)' }} />
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
                        <p className="section-description">
                            With SunCalc, harness the full potential of solar energy. Our intuitive solar calculator provides accurate estimates tailored to your location.
                        </p>
                        <div className="cta-buttons">
                            <button
                                onClick={() => setActivePage('calculator')}
                                className="cta-primary"
                            >
                                Try SunCalc
                            </button>
                            <button
                                onClick={() => setActivePage('suncalc-learn')}
                                className="cta-secondary"
                            >
                                Learn More
                            </button>
                        </div>
                    </motion.div>
                </div>
                <a href="#gridsmart" className="scroll-indicator">
                    <ChevronDown className="animate-bounce" size={32} />
                </a>
            </section>

            {/* GridSmart Section */}
            <section id="gridsmart" className="snap-section">
                <div className="section-image" style={{ backgroundImage: 'url(/image2.jpg)' }} />
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
                        <p className="section-subtitle">Forecasting Energy Demand for a Sustainable Future</p>
                        <p className="section-description">
                            GridSmart uses advanced AI to predict energy demand, enabling efficient grid optimization and better resource allocation.
                        </p>
                        <div className="cta-buttons">
                            <button
                                onClick={() => setActivePage('prediction')}
                                className="cta-primary"
                            >
                                Explore GridSmart
                            </button>
                            <button className="cta-secondary">View Demo</button>
                        </div>
                    </motion.div>
                </div>
                <a href="#panelguard" className="scroll-indicator">
                    <ChevronDown className="animate-bounce" size={32} />
                </a>
            </section>

            {/* PanelGuard Section */}
            <section id="panelguard" className="snap-section">
                <div className="section-image" style={{ backgroundImage: 'url(/image3.jpg)' }} />
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
                        <p className="section-description">
                            PanelGuard uses deep learning to classify defects like bird waste, snow, and dust, helping you maintain peak efficiency.
                        </p>
                        <div className="cta-buttons">
                            <button
                                onClick={() => setActivePage('maintenance')}
                                className="cta-primary"
                            >
                                Get Started
                            </button>
                            <button
                                onClick={() => setActivePage('panelguard-learn')}
                                className="cta-secondary"
                            >
                                How It Works
                            </button>
                        </div>
                    </motion.div>
                </div>
                <a href="#about" className="scroll-indicator">
                    <ChevronDown className="animate-bounce" size={32} />
                </a>
            </section>

            {/* About Section */}
            <section id="about" className="snap-section bg-white">
                <div className="section-content">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="max-w-4xl mx-auto text-center"
                    >
                        <h1 className="text-5xl font-bold text-gray-900 mb-6">About SOLAR.ai</h1>
                        <p className="text-xl text-gray-700 leading-relaxed mb-8">
                            At SOLAR.ai, our mission is to empower communities with sustainable solar energy solutions.
                            We combine cutting-edge AI technology with easy-to-use tools that make solar energy management
                            accessible to everyone. From forecasting energy demand to protecting your solar investment,
                            our comprehensive services support every step of your solar journey.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                            <div className="p-6">
                                <h3 className="text-2xl font-semibold text-gray-900 mb-3">AI-Powered</h3>
                                <p className="text-gray-600">Advanced machine learning models for accurate predictions</p>
                            </div>
                            <div className="p-6">
                                <h3 className="text-2xl font-semibold text-gray-900 mb-3">User-Friendly</h3>
                                <p className="text-gray-600">Intuitive interfaces designed for everyone</p>
                            </div>
                            <div className="p-6">
                                <h3 className="text-2xl font-semibold text-gray-900 mb-3">Sustainable</h3>
                                <p className="text-gray-600">Contributing to a greener future for India</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <style jsx>{`
                .scroll-container {
                    scroll-snap-type: y mandatory;
                    overflow-y: scroll;
                    height: 100vh;
                }

                .snap-section {
                    scroll-snap-align: start;
                    height: 100vh;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .section-image {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-size: cover;
                    background-position: center;
                    z-index: 0;
                }

                .section-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.3));
                    z-index: 1;
                }

                .section-content {
                    position: relative;
                    z-index: 2;
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .section-title {
                    font-size: 4rem;
                    font-weight: 700;
                    color: white;
                    margin-bottom: 1rem;
                    letter-spacing: -0.02em;
                }

                .section-subtitle {
                    font-size: 1.5rem;
                    color: rgba(255,255,255,0.95);
                    margin-bottom: 1.5rem;
                    font-weight: 300;
                }

                .section-description {
                    font-size: 1.125rem;
                    color: rgba(255,255,255,0.9);
                    margin-bottom: 2rem;
                    max-width: 700px;
                    margin-left: auto;
                    margin-right: auto;
                    line-height: 1.6;
                }

                .cta-buttons {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    flex-wrap: wrap;
                }

                .cta-primary {
                    background-color: white;
                    color: #111;
                    padding: 0.875rem 2.5rem;
                    border-radius: 4px;
                    font-weight: 600;
                    font-size: 0.875rem;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .cta-primary:hover {
                    background-color: rgba(255,255,255,0.9);
                    transform: translateY(-2px);
                }

                .cta-secondary {
                    background-color: transparent;
                    color: white;
                    padding: 0.875rem 2.5rem;
                    border-radius: 4px;
                    font-weight: 600;
                    font-size: 0.875rem;
                    border: 2px solid white;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .cta-secondary:hover {
                    background-color: rgba(255,255,255,0.1);
                }

                .scroll-indicator {
                    position: absolute;
                    bottom: 2rem;
                    left: 50%;
                    transform: translateX(-50%);
                    color: white;
                    z-index: 3;
                    opacity: 0.8;
                    transition: opacity 0.3s;
                }

                .scroll-indicator:hover {
                    opacity: 1;
                }

                @media (max-width: 768px) {
                    .section-title {
                        font-size: 2.5rem;
                    }
                    
                    .section-subtitle {
                        font-size: 1.125rem;
                    }
                    
                    .section-description {
                        font-size: 1rem;
                    }
                }
            `}</style>
        </div>
    );
}

export default App;
