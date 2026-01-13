import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Zap, IndianRupee, TrendingUp, ArrowRight, CheckCircle, Info } from 'lucide-react';

const SolarCalculator = () => {
    // Step 1: Location & System
    const [step, setStep] = useState(1);
    const [locationData, setLocationData] = useState({
        system_capacity: 3,
        module_type: 0,
        losses: 14,
        array_type: 1,
        tilt: 20,
        azimuth: 180,
        lat: 20.5937,
        lon: 78.9629,
    });

    // Step 2: Financial Details
    const [financialData, setFinancialData] = useState({
        upfront_cost: 180000, // ₹60k per kW × 3kW
        annual_consumption: 3600, // kWh per year
        electricity_rate: 8, // ₹ per kWh
    });

    const [nrelData, setNrelData] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLocationChange = (e) => {
        setLocationData({ ...locationData, [e.target.name]: e.target.value });
        setError(null);
    };

    const handleFinancialChange = (e) => {
        setFinancialData({ ...financialData, [e.target.name]: e.target.value });
    };

    const validateInputs = () => {
        const lat = parseFloat(locationData.lat);
        const lon = parseFloat(locationData.lon);
        if (lat < -90 || lat > 90) return "Latitude must be between -90 and 90.";
        if (lon < -180 || lon > 180) return "Longitude must be between -180 and 180.";
        return null;
    };

    // Step 1: Fetch NREL Data
    const fetchNRELData = async () => {
        const validationError = validateInputs();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('https://solar-ai-backend-lfi2.onrender.com/api/calculator/calculate', locationData);
            let data = response.data;
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.error("Failed to parse JSON string:", e);
                }
            }

            if (data.errors && data.errors.length > 0) {
                throw new Error(data.errors.join(", "));
            }

            setNrelData(data.outputs);
            setStep(2);
            setLoading(false);
        } catch (err) {
            console.error("Error calculating:", err);
            let errorMessage = "Failed to calculate. Please check your inputs and try again.";

            if (err.response) {
                if (err.response.status === 429) {
                    errorMessage = "API Rate Limit Exceeded. Please try again later.";
                } else if (err.response.status === 422) {
                    errorMessage = "Invalid Location Data. Please check your Latitude and Longitude.";
                } else if (err.response.data && err.response.data.message) {
                    errorMessage = err.response.data.message;
                }
            }
            setError(errorMessage);
            setLoading(false);
        }
    };

    // Calculate Government Subsidy (PM Surya Ghar)
    const calculateSubsidy = (capacity) => {
        const kw = parseFloat(capacity);
        if (kw <= 2) {
            return kw * 30000; // ₹30,000 per kW up to 2kW
        } else {
            return 78000; // Fixed ₹78,000 for 3kW and above
        }
    };

    // Step 2: Calculate Final ROI
    const calculateROI = () => {
        if (!nrelData) return;

        const annualGeneration = parseFloat(nrelData.ac_annual); // kWh/year from NREL
        const annualConsumption = parseFloat(financialData.annual_consumption);
        const upfrontCost = parseFloat(financialData.upfront_cost);
        const electricityRate = parseFloat(financialData.electricity_rate);
        const subsidy = calculateSubsidy(locationData.system_capacity);

        // Calculate savings and grid export
        const selfConsumption = Math.min(annualGeneration, annualConsumption);
        const excessEnergy = Math.max(0, annualGeneration - annualConsumption);

        const savingsFromSelfUse = selfConsumption * electricityRate; // ₹8/kWh saved
        const earningsFromExport = excessEnergy * 3; // ₹3/kWh from grid
        const totalAnnualBenefit = savingsFromSelfUse + earningsFromExport;

        // Net cost after subsidy
        const netCost = upfrontCost - subsidy;
        const breakeven = netCost / totalAnnualBenefit;

        setResult({
            annualGeneration: annualGeneration.toFixed(0),
            selfConsumption: selfConsumption.toFixed(0),
            excessEnergy: excessEnergy.toFixed(0),
            savingsFromSelfUse: savingsFromSelfUse.toFixed(0),
            earningsFromExport: earningsFromExport.toFixed(0),
            totalAnnualBenefit: totalAnnualBenefit.toFixed(0),
            upfrontCost: upfrontCost.toFixed(0),
            subsidy: subsidy.toFixed(0),
            netCost: netCost.toFixed(0),
            breakeven: breakeven.toFixed(1),
            roi25Years: ((totalAnnualBenefit * 25) - netCost).toFixed(0)
        });
    };

    return (
        <div className="max-w-7xl mx-auto py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <h1 className="text-5xl font-bold text-gray-900 mb-4">Solar ROI Calculator</h1>
                <p className="text-xl text-gray-600">Calculate your real savings with government subsidies & grid export</p>
            </motion.div>

            {/* Progress Indicator */}
            <div className="flex items-center justify-center mb-12">
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                            {step > 1 ? <CheckCircle size={20} /> : '1'}
                        </div>
                        <span className="font-medium hidden md:block">Location & System</span>
                    </div>
                    <div className="w-16 h-1 bg-gray-300"></div>
                    <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                            2
                        </div>
                        <span className="font-medium hidden md:block">Financial Details</span>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {/* STEP 1: Location & System */}
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8"
                    >
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <MapPin className="text-blue-600" />
                            Step 1: Location & System Details
                        </h2>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    System Capacity (kW) *
                                </label>
                                <input
                                    type="number"
                                    name="system_capacity"
                                    value={locationData.system_capacity}
                                    onChange={handleLocationChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Typical: 2-5 kW for homes</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Panel Tilt Angle (degrees)
                                </label>
                                <input
                                    type="number"
                                    name="tilt"
                                    value={locationData.tilt}
                                    onChange={handleLocationChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Optimal: 15-25° for India</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Latitude *
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    name="lat"
                                    value={locationData.lat}
                                    onChange={handleLocationChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Longitude *
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    name="lon"
                                    value={locationData.lon}
                                    onChange={handleLocationChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={fetchNRELData}
                            disabled={loading}
                            className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Fetching Solar Data...
                                </>
                            ) : (
                                <>
                                    Continue to Financial Details <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </motion.div>
                )}

                {/* STEP 2: Financial Details */}
                {step === 2 && nrelData && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Input Section */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <IndianRupee className="text-green-600" />
                                    Step 2: Financial Details
                                </h2>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                    <p className="text-sm text-blue-900 flex items-start gap-2">
                                        <Info size={16} className="mt-0.5 flex-shrink-0" />
                                        <span>
                                            <strong>Annual Generation:</strong> {parseFloat(nrelData.ac_annual).toFixed(0)} kWh/year
                                            <br />Based on your location ({locationData.lat}, {locationData.lon})
                                        </span>
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Upfront System Cost (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            name="upfront_cost"
                                            value={financialData.upfront_cost}
                                            onChange={handleFinancialChange}
                                            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Typical: ₹50,000-70,000 per kW</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Your Annual Electricity Consumption (kWh) *
                                        </label>
                                        <input
                                            type="number"
                                            name="annual_consumption"
                                            value={financialData.annual_consumption}
                                            onChange={handleFinancialChange}
                                            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Check your electricity bill for annual usage</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Current Electricity Rate (₹/kWh)
                                        </label>
                                        <input
                                            type="number"
                                            name="electricity_rate"
                                            value={financialData.electricity_rate}
                                            onChange={handleFinancialChange}
                                            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Average in India: ₹6-10/kWh</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-all"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        onClick={calculateROI}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        Calculate ROI <TrendingUp size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Results Section */}
                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl shadow-lg border border-green-200 p-8"
                                >
                                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Your Solar Investment Analysis</h3>

                                    <div className="space-y-4">
                                        {/* Annual Generation */}
                                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                                            <p className="text-sm text-gray-600">Annual Solar Generation</p>
                                            <p className="text-2xl font-bold text-blue-600">{result.annualGeneration} kWh</p>
                                        </div>

                                        {/* Energy Breakdown */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                                <p className="text-xs text-gray-600">Self-Consumed</p>
                                                <p className="text-lg font-bold text-gray-900">{result.selfConsumption} kWh</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-green-200 bg-green-50">
                                                <p className="text-xs text-green-700">Exported to Grid</p>
                                                <p className="text-lg font-bold text-green-700">{result.excessEnergy} kWh</p>
                                            </div>
                                        </div>

                                        {/* Financial Benefits */}
                                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                                            <p className="text-sm text-gray-600 mb-2">Annual Benefits</p>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Savings (Self-use):</span>
                                                    <span className="font-semibold">₹{result.savingsFromSelfUse}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Grid Export (@₹3/kWh):</span>
                                                    <span className="font-semibold text-green-600">₹{result.earningsFromExport}</span>
                                                </div>
                                                <div className="flex justify-between pt-2 border-t">
                                                    <span className="font-semibold">Total Annual Benefit:</span>
                                                    <span className="font-bold text-green-600 text-lg">₹{result.totalAnnualBenefit}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cost Breakdown */}
                                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                                            <p className="text-sm text-gray-600 mb-2">Investment Breakdown</p>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Upfront Cost:</span>
                                                    <span className="font-semibold">₹{result.upfrontCost}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">PM Surya Ghar Subsidy:</span>
                                                    <span className="font-semibold text-blue-600">- ₹{result.subsidy}</span>
                                                </div>
                                                <div className="flex justify-between pt-2 border-t">
                                                    <span className="font-semibold">Net Investment:</span>
                                                    <span className="font-bold text-lg">₹{result.netCost}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ROI Metrics */}
                                        <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-lg p-6 text-white">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm opacity-90">Breakeven Period</p>
                                                    <p className="text-3xl font-bold">{result.breakeven} years</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm opacity-90">25-Year Profit</p>
                                                    <p className="text-3xl font-bold">₹{(parseFloat(result.roi25Years) / 100000).toFixed(1)}L</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
                                            <p className="text-sm text-green-800">
                                                ✅ <strong>Financially Viable!</strong> You'll recover your investment in {result.breakeven} years and earn ₹{(parseFloat(result.roi25Years) / 100000).toFixed(1)} lakhs over 25 years.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SolarCalculator;
