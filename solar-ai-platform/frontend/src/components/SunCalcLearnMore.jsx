import React from 'react';
import { motion } from 'framer-motion';
import { Sun, TrendingUp, Home, Zap, ArrowRight, CheckCircle } from 'lucide-react';

const SunCalcLearnMore = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            <div className="max-w-5xl mx-auto px-6 py-16">
                <button
                    onClick={onBack}
                    className="mb-8 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 transition-colors"
                >
                    ← Back
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Sun className="text-yellow-500" size={48} />
                        <h1 className="text-5xl font-bold text-gray-900">Understanding SunCalc</h1>
                    </div>
                    <p className="text-xl text-gray-600">
                        Making informed decisions about solar energy for your home
                    </p>
                </motion.div>

                {/* What is SunCalc */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8"
                >
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">What is SunCalc?</h2>
                    <p className="text-lg text-gray-700 leading-relaxed mb-4">
                        SunCalc is our AI-powered solar calculator that helps you analyze whether solar energy is
                        suitable and economically viable for your home. Using data from the NREL PVWatts API and
                        advanced algorithms, we provide accurate estimates of:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <Zap className="text-blue-600 mb-2" size={32} />
                            <h3 className="font-semibold text-gray-900 mb-1">Energy Generation</h3>
                            <p className="text-sm text-gray-600">Annual kWh production based on your location</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <TrendingUp className="text-green-600 mb-2" size={32} />
                            <h3 className="font-semibold text-gray-900 mb-1">Cost Savings</h3>
                            <p className="text-sm text-gray-600">Estimated annual savings on electricity bills</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <CheckCircle className="text-purple-600 mb-2" size={32} />
                            <h3 className="font-semibold text-gray-900 mb-1">ROI Analysis</h3>
                            <p className="text-sm text-gray-600">Breakeven period and financial feasibility</p>
                        </div>
                    </div>
                </motion.section>

                {/* India's Solar Market Potential */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8"
                >
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">
                        India's Residential Solar Market Potential
                    </h2>
                    <p className="text-gray-700 mb-6">
                        According to the CEEW (Council on Energy, Environment and Water) report, India's residential
                        solar market can be understood through three key perspectives:
                    </p>

                    <div className="space-y-6">
                        {/* Technical Potential */}
                        <div className="border-l-4 border-yellow-500 pl-6 py-2">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                1. Technical Potential: 637 GW
                            </h3>
                            <p className="text-gray-700">
                                This represents the maximum capacity if <strong>all suitable rooftops</strong> in India
                                were covered end-to-end with solar panels. While impressive, this scenario isn't
                                practically achievable.
                            </p>
                        </div>

                        {/* Economic Potential */}
                        <div className="border-l-4 border-blue-500 pl-6 py-2">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                2. Economic Potential: 102 GW
                            </h3>
                            <p className="text-gray-700">
                                When we factor in <strong>economic viability</strong> - considering installation costs,
                                maintenance, and electricity savings - the realistic market narrows significantly to 102 GW.
                            </p>
                        </div>

                        {/* Market Potential */}
                        <div className="border-l-4 border-green-500 pl-6 py-2">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                3. True Market Potential: 11 GW
                            </h3>
                            <p className="text-gray-700 mb-3">
                                This is the <strong>realistic adoption rate</strong> when households analyze the trade-off
                                between upfront costs and long-term savings. Without subsidies, only 11 GW represents
                                viable market potential.
                            </p>
                            <div className="bg-green-50 p-4 rounded-lg mt-3">
                                <p className="text-green-900 font-semibold mb-2">What does this mean?</p>
                                <p className="text-green-800 text-sm">
                                    Assuming an average household needs 2 KW of solar capacity (accounting for both
                                    rural and urban areas), this translates to approximately <strong>55 lakh (5.5 million)
                                        households</strong> with genuine market potential.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* How SunCalc Helps */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg p-8 text-white"
                >
                    <h2 className="text-3xl font-bold mb-4">How SunCalc Helps You Decide</h2>
                    <p className="text-blue-100 mb-6 text-lg">
                        Our calculator performs the exact analysis that determines whether your household falls
                        into the economically viable segment:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="text-blue-200 flex-shrink-0 mt-1" size={24} />
                            <div>
                                <h4 className="font-semibold mb-1">Location-Specific Analysis</h4>
                                <p className="text-blue-100 text-sm">
                                    Solar radiation and weather patterns for your exact coordinates
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle className="text-blue-200 flex-shrink-0 mt-1" size={24} />
                            <div>
                                <h4 className="font-semibold mb-1">Cost-Benefit Calculation</h4>
                                <p className="text-blue-100 text-sm">
                                    Upfront investment vs. long-term electricity savings
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle className="text-blue-200 flex-shrink-0 mt-1" size={24} />
                            <div>
                                <h4 className="font-semibold mb-1">Breakeven Timeline</h4>
                                <p className="text-blue-100 text-sm">
                                    How many years until your investment pays for itself
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle className="text-blue-200 flex-shrink-0 mt-1" size={24} />
                            <div>
                                <h4 className="font-semibold mb-1">System Optimization</h4>
                                <p className="text-blue-100 text-sm">
                                    Recommended panel tilt, azimuth, and capacity for maximum efficiency
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 text-center">
                        <button
                            onClick={onBack}
                            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
                        >
                            Try SunCalc Now <ArrowRight size={20} />
                        </button>
                    </div>
                </motion.section>

                {/* Key Assumptions */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gray-50 rounded-2xl p-8 mt-8"
                >
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Key Assumptions</h3>
                    <ul className="space-y-3 text-gray-700">
                        <li className="flex items-start gap-3">
                            <Home className="text-gray-500 flex-shrink-0 mt-1" size={20} />
                            <span>A typical urban household requires <strong>3 KW</strong> of solar capacity</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Home className="text-gray-500 flex-shrink-0 mt-1" size={20} />
                            <span>Average across rural and urban areas: <strong>2 KW per household</strong></span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Zap className="text-gray-500 flex-shrink-0 mt-1" size={20} />
                            <span>Electricity savings calculated at <strong>₹8 per kWh</strong> (average rate)</span>
                        </li>
                    </ul>
                </motion.section>
            </div>
        </div>
    );
};

export default SunCalcLearnMore;
