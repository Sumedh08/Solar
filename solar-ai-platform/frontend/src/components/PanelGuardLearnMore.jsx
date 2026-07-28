import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, Droplet, Cloud, Zap, Wrench, ArrowRight } from 'lucide-react';

const PanelGuardLearnMore = ({ onBack }) => {
    const defectTypes = [
        {
            name: 'Clean',
            icon: CheckCircle,
            color: 'green',
            description: 'Panel is in optimal condition with no visible defects',
            impact: 'No impact - 100% efficiency'
        },
        {
            name: 'Bird-drop',
            icon: Droplet,
            color: 'yellow',
            description: 'Bird droppings covering panel surface',
            impact: '5-25% efficiency loss depending on coverage'
        },
        {
            name: 'Dusty',
            icon: Cloud,
            color: 'orange',
            description: 'Accumulated dust and dirt on panel surface',
            impact: '7-40% efficiency loss in severe cases'
        },
        {
            name: 'Snow-Covered',
            icon: Cloud,
            color: 'blue',
            description: 'Snow accumulation blocking sunlight',
            impact: '90-100% efficiency loss until cleared'
        },
        {
            name: 'Electrical-damage',
            icon: Zap,
            color: 'red',
            description: 'Electrical faults, hot spots, or connection issues',
            impact: '20-100% efficiency loss, potential safety hazard'
        },
        {
            name: 'Physical-Damage',
            icon: Wrench,
            color: 'red',
            description: 'Cracks, breaks, or structural damage to panel',
            impact: '30-100% efficiency loss, may worsen over time'
        },
    ];

    const getColorClasses = (color) => {
        const colors = {
            green: 'bg-green-50 border-green-200 text-green-900',
            yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
            orange: 'bg-orange-50 border-orange-200 text-orange-900',
            blue: 'bg-blue-50 border-blue-200 text-blue-900',
            red: 'bg-red-50 border-red-200 text-red-900',
        };
        return colors[color] || colors.green;
    };

    const getIconColor = (color) => {
        const colors = {
            green: 'text-green-600',
            yellow: 'text-yellow-600',
            orange: 'text-orange-600',
            blue: 'text-blue-600',
            red: 'text-red-600',
        };
        return colors[color] || colors.green;
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
            <div className="max-w-6xl mx-auto px-6 py-16">
                <button
                    onClick={onBack}
                    className="mb-8 text-orange-600 hover:text-orange-700 font-medium flex items-center gap-2 transition-colors"
                >
                    ← Back
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Shield className="text-orange-600" size={48} />
                        <h1 className="text-5xl font-bold text-gray-900">Understanding PanelGuard</h1>
                    </div>
                    <p className="text-xl text-gray-600">
                        AI-powered defect detection for maximum solar panel efficiency
                    </p>
                </motion.div>

                {/* What is PanelGuard */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8"
                >
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">What is PanelGuard?</h2>
                    <p className="text-lg text-gray-700 leading-relaxed mb-6">
                        PanelGuard is an advanced deep learning system that automatically detects and classifies
                        defects in solar panels using computer vision. Our MobileNetV2-based model has been trained
                        on thousands of solar panel images to identify issues that can significantly impact your
                        system's performance.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-gray-900 mb-2">🎯 High Accuracy</h3>
                            <p className="text-sm text-gray-600">
                                Advanced neural network trained on diverse panel conditions
                            </p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-gray-900 mb-2">⚡ Instant Analysis</h3>
                            <p className="text-sm text-gray-600">
                                Get results in seconds with confidence scores
                            </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-gray-900 mb-2">💡 Actionable Insights</h3>
                            <p className="text-sm text-gray-600">
                                Receive specific maintenance recommendations
                            </p>
                        </div>
                    </div>
                </motion.section>

                {/* 6 Defect Classifications */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                >
                    <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                        6 Defect Classifications
                    </h2>
                    <p className="text-center text-gray-600 mb-8">
                        Our AI model can identify and classify the following panel conditions:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {defectTypes.map((defect, index) => {
                            const Icon = defect.icon;
                            return (
                                <motion.div
                                    key={defect.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + index * 0.1 }}
                                    className={`border-2 rounded-xl p-6 ${getColorClasses(defect.color)}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-lg bg-white`}>
                                            <Icon className={getIconColor(defect.color)} size={32} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold mb-2">{defect.name}</h3>
                                            <p className="text-sm mb-3 opacity-90">{defect.description}</p>
                                            <div className="bg-white/50 rounded-lg p-3">
                                                <p className="text-xs font-semibold mb-1">Performance Impact:</p>
                                                <p className="text-sm font-medium">{defect.impact}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.section>

                {/* Why Defect Detection Matters */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8"
                >
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">
                        Why Defect Detection Matters
                    </h2>
                    <div className="space-y-4 text-gray-700">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="text-orange-500 flex-shrink-0 mt-1" size={24} />
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-1">Prevent Revenue Loss</h4>
                                <p>
                                    Even minor defects can reduce panel efficiency by 20-40%. Early detection
                                    prevents thousands of rupees in lost energy production.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Shield className="text-blue-500 flex-shrink-0 mt-1" size={24} />
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-1">Extend Panel Lifespan</h4>
                                <p>
                                    Identifying and addressing issues early prevents minor problems from becoming
                                    major failures, extending your panels' 25+ year lifespan.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Zap className="text-yellow-500 flex-shrink-0 mt-1" size={24} />
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-1">Optimize Maintenance</h4>
                                <p>
                                    Know exactly what needs attention instead of scheduling unnecessary inspections.
                                    Save time and maintenance costs with targeted interventions.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* How It Works */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl shadow-lg p-8 text-white"
                >
                    <h2 className="text-3xl font-bold mb-6">How PanelGuard Works</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="text-center">
                            <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl font-bold">1</span>
                            </div>
                            <h4 className="font-semibold mb-2">Upload Image</h4>
                            <p className="text-orange-100 text-sm">
                                Take a photo of your solar panel and upload it to our platform
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl font-bold">2</span>
                            </div>
                            <h4 className="font-semibold mb-2">AI Analysis</h4>
                            <p className="text-orange-100 text-sm">
                                Our MobileNetV2 model analyzes the image in real-time
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl font-bold">3</span>
                            </div>
                            <h4 className="font-semibold mb-2">Get Results</h4>
                            <p className="text-orange-100 text-sm">
                                Receive defect classification, confidence score, and recommendations
                            </p>
                        </div>
                    </div>
                    <div className="text-center">
                        <button
                            onClick={onBack}
                            className="bg-white text-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors inline-flex items-center gap-2"
                        >
                            Try PanelGuard Now <ArrowRight size={20} />
                        </button>
                    </div>
                </motion.section>
            </div>
        </div>
    );
};

export default PanelGuardLearnMore;
