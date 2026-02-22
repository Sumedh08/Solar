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
        panel_type: 'mono',
        inverter_type: 'string',
        structure_type: 'standard',
    });

    // Step 2: Financial Details
    const [financialData, setFinancialData] = useState({
        annual_consumption: 3600, // kWh per year
        electricity_rate: 8, // ₹ per kWh
        upfront_cost: 0, // Will be calculated after Step 1
    });

    const [nrelData, setNrelData] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [shadingStatus, setShadingStatus] = useState("Low"); // Low, Moderate, High

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

    // Step 1: Fetch NREL Data & OSM Shading
    const fetchNRELData = async () => {
        const validationError = validateInputs();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Technical BOM Logic (Physics)
            const moduleType = locationData.panel_type === 'mono' ? 1 : 0; // 1 = Premium (Mono), 0 = Standard (Poly)

            // Base Losses (Wiring, Inverter, Dirt)
            let baseLosses = 14;
            if (locationData.inverter_type === 'micro') baseLosses -= 4; // Microinverters optimize shade/mismatch

            // 2. Fetch OSM Shading Loss Heuristic
            let shadingLoss = 3;
            try {
                const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(way["building"](around:50,${locationData.lat},${locationData.lon}););out center;`;
                const osmResponse = await axios.get(overpassUrl);
                const buildings = osmResponse.data.elements;

                if (buildings && buildings.length > 0) {
                    buildings.forEach(b => {
                        const dist = calculateDistance(locationData.lat, locationData.lon, b.center.lat, b.center.lon);
                        if (dist < 20) shadingLoss += 8;
                        else if (dist < 40) shadingLoss += 4;
                    });
                }
                shadingLoss = Math.min(shadingLoss, 35);
                if (shadingLoss > 15) setShadingStatus("High (Obstructions Detected)");
                else if (shadingLoss > 3) setShadingStatus("Moderate (Nearby Structures)");
                else setShadingStatus("Low (Clear Sky View)");
            } catch (osmErr) {
                console.warn("OSM Shading check failed:", osmErr);
                setShadingStatus("Unknown (Using Heuristic)");
            }

            const finalLosses = baseLosses + (shadingLoss - 3);

            // Console log for transparency (User can see this in F12)
            console.log(`[Physics Engine] BaseLoss: ${baseLosses}%, Shading: ${shadingLoss}%, Total: ${finalLosses}%`);

            // NREL Request with Technical Parameters
            const nrelRequest = {
                ...locationData,
                module_type: moduleType,
                losses: finalLosses
            };

            // 3. Fetch NREL Data
            const response = await axios.post('https://solar-ai-backend-lfi2.onrender.com/api/calculator/calculate', nrelRequest);
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

            // 4. Calculate Suggested Upfront Cost for Step 2
            const packageCosts = {
                mono: 55000,
                poly: 45000,
                micro: 15000,
                elevated: 10000
            };
            let costPerKw = locationData.panel_type === 'mono' ? packageCosts.mono : packageCosts.poly;
            if (locationData.inverter_type === 'micro') costPerKw += packageCosts.micro;
            if (locationData.structure_type === 'elevated') costPerKw += packageCosts.elevated;

            setFinancialData(prev => ({
                ...prev,
                upfront_cost: costPerKw * locationData.system_capacity
            }));

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

    // Helper: Haversine Distance
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
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
        const electricityRate = parseFloat(financialData.electricity_rate);
        const subsidy = calculateSubsidy(locationData.system_capacity);

        const upfrontCost = parseFloat(financialData.upfront_cost);

        // Calculate savings and grid export
        const selfConsumption = Math.min(annualGeneration, annualConsumption);
        const excessEnergy = Math.max(0, annualGeneration - annualConsumption);

        const savingsFromSelfUse = selfConsumption * electricityRate;
        const earningsFromExport = excessEnergy * 3; // ₹3/kWh from grid (Export Rate)
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
            roi25Years: ((totalAnnualBenefit * 25) - netCost).toFixed(0),
            spaceRequired: (locationData.system_capacity * (locationData.panel_type === 'mono' ? 70 : 100)).toFixed(0)
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

                            {/* BOM Selection in Step 1 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Solar Panel Type *
                                </label>
                                <select
                                    name="panel_type"
                                    value={locationData.panel_type}
                                    onChange={handleLocationChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="mono">Monocrystalline (Premium - High Yield)</option>
                                    <option value="poly">Polycrystalline (Budget - Lower Yield)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Inverter & Efficiency *
                                </label>
                                <select
                                    name="inverter_type"
                                    value={locationData.inverter_type}
                                    onChange={handleLocationChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="string">String Inverter (Standard)</option>
                                    <option value="micro">Microinverters (Optimized for Shading)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Mounting Structure *
                                </label>
                                <select
                                    name="structure_type"
                                    value={locationData.structure_type}
                                    onChange={handleLocationChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="standard">Standard Rooftop Fix</option>
                                    <option value="elevated">Elevated Structure (G+1 height)</option>
                                </select>
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
                                            <strong>Solar Intelligence:</strong>
                                            <br />• Generation: {parseFloat(nrelData.ac_annual).toFixed(0)} kWh/yr
                                            <br />• Shading Analysis: <span className={shadingStatus.includes("High") ? "text-red-600 font-bold" : shadingStatus.includes("Moderate") ? "text-yellow-600 font-bold" : "text-green-600 font-bold"}>{shadingStatus}</span>
                                            <br />Location: ({parseFloat(locationData.lat).toFixed(3)}, {parseFloat(locationData.lon).toFixed(3)})
                                        </span>
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Upfront System Cost (₹)
                                        </label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                            <input
                                                type="number"
                                                name="upfront_cost"
                                                value={financialData.upfront_cost}
                                                onChange={handleFinancialChange}
                                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-green-500 outline-none font-bold"
                                            />
                                        </div>
                                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                            <Info size={12} /> Auto-estimated based on hardware. You can manually override.
                                        </p>
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

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Annual Electricity Consumption (kWh)
                                        </label>
                                        <input
                                            type="number"
                                            name="annual_consumption"
                                            value={financialData.annual_consumption}
                                            onChange={handleFinancialChange}
                                            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none"
                                        />
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
                            </div>

                            {/* Results Section */}
                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 flex flex-col gap-6"
                                >
                                    <div className="flex justify-between items-center border-b pb-4">
                                        <h3 className="text-2xl font-bold text-gray-900">Investment Analysis</h3>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                            <Zap size={14} /> High Viability
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                                            <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Annual Generation</p>
                                            <p className="text-3xl font-bold text-blue-900">{result.annualGeneration} <span className="text-lg font-medium opacity-60">kWh</span></p>
                                        </div>
                                        <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                                            <p className="text-xs text-indigo-600 font-semibold uppercase mb-1">Estimated Space</p>
                                            <p className="text-3xl font-bold text-indigo-900">{result.spaceRequired} <span className="text-lg font-medium opacity-60">sq. ft.</span></p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                                            <div>
                                                <p className="text-sm text-gray-500">Upfront Investment</p>
                                                <p className="text-xl font-bold text-gray-900">₹{(result.upfrontCost / 100000).toFixed(2)} Lakhs</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-blue-600 font-semibold">- ₹{result.subsidy} Subsidy</p>
                                                <p className="text-xs text-gray-500">Effective: ₹{(result.netCost / 100000).toFixed(2)}L</p>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg shadow-green-200">
                                            <div className="flex justify-between items-end mb-4">
                                                <div>
                                                    <p className="text-sm opacity-90 uppercase font-semibold">Annual Profit</p>
                                                    <p className="text-4xl font-bold">₹{result.totalAnnualBenefit}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm opacity-90">Breakeven</p>
                                                    <p className="text-2xl font-bold text-green-100">{result.breakeven} Years</p>
                                                </div>
                                            </div>
                                            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                                                <div className="h-full bg-white w-3/4 rounded-full"></div>
                                            </div>
                                            <p className="text-xs mt-3 opacity-80 italic">Calculated using industry-standard grid export @₹3/kWh</p>
                                        </div>

                                        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                                            <p className="text-sm text-yellow-800">
                                                <strong>25-Year Projection:</strong> You will generate approximately <strong>₹{(result.roi25Years / 100000).toFixed(1)} Lakhs</strong> in total benefits and save ~90,000kg of CO2 emissions.
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
