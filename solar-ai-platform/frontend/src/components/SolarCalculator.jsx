import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Zap, IndianRupee, TrendingUp, ArrowRight, CheckCircle, Info } from 'lucide-react';
import { endpoints } from '../config';

const SolarCalculator = () => {
    const [step, setStep] = useState(1);
    const [locationData, setLocationData] = useState({
        system_capacity: 3,
        tilt: 20,
        azimuth: 180,
        lat: 20.5937,
        lon: 78.9629,
        panel_type: 'mono',
        inverter_type: 'string',
        structure_type: 'standard',
        array_type: 1,
    });

    const [financialData, setFinancialData] = useState({
        annual_consumption: 3600,
        electricity_rate: 8,
        upfront_cost: 0,
    });

    const [nrelData, setNrelData] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [shadingStatus, setShadingStatus] = useState('Low');
    const [shadingLoss, setShadingLoss] = useState(3);

    const handleLocationChange = (e) => {
        const { name, value, type } = e.target;
        setLocationData({
            ...locationData,
            [name]: type === 'number' ? value : value,
        });
        setError(null);
    };

    const handleFinancialChange = (e) => {
        setFinancialData({ ...financialData, [e.target.name]: e.target.value });
    };

    const validateInputs = () => {
        const lat = parseFloat(locationData.lat);
        const lon = parseFloat(locationData.lon);
        const cap = parseFloat(locationData.system_capacity);
        if (Number.isNaN(lat) || lat < -90 || lat > 90) return 'Latitude must be between -90 and 90.';
        if (Number.isNaN(lon) || lon < -180 || lon > 180) return 'Longitude must be between -180 and 180.';
        if (Number.isNaN(cap) || cap <= 0 || cap > 1000) return 'System capacity must be between 0 and 1000 kW.';
        return null;
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const estimateShading = async (lat, lon) => {
        let shading = 3;
        try {
            const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(way["building"](around:50,${lat},${lon}););out center;`;
            const osmResponse = await axios.get(overpassUrl, { timeout: 8000 });
            const buildings = osmResponse.data?.elements || [];
            buildings.forEach((b) => {
                if (!b.center) return;
                const dist = calculateDistance(lat, lon, b.center.lat, b.center.lon);
                if (dist < 20) shading += 8;
                else if (dist < 40) shading += 4;
            });
            shading = Math.min(shading, 35);
            if (shading > 15) setShadingStatus('High (Obstructions Detected)');
            else if (shading > 3) setShadingStatus('Moderate (Nearby Structures)');
            else setShadingStatus('Low (Clear Sky View)');
        } catch {
            setShadingStatus('Unknown (Using Heuristic)');
        }
        setShadingLoss(shading);
        return shading;
    };

    // Step 1: generation estimate from backend (NREL)
    const fetchGeneration = async () => {
        const validationError = validateInputs();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const lat = parseFloat(locationData.lat);
            const lon = parseFloat(locationData.lon);
            const shading = await estimateShading(lat, lon);

            const body = {
                system_capacity: parseFloat(locationData.system_capacity),
                tilt: parseFloat(locationData.tilt) || 20,
                azimuth: parseFloat(locationData.azimuth) || 180,
                lat,
                lon,
                panel_type: locationData.panel_type,
                inverter_type: locationData.inverter_type,
                structure_type: locationData.structure_type,
                array_type: parseInt(locationData.array_type, 10) || 1,
                shading_loss: shading,
                generation_only: true,
            };

            const response = await axios.post(endpoints.calculate, body, { timeout: 60000 });
            const data = response.data;

            if (data.errors?.length) {
                throw new Error(data.errors.join(', '));
            }
            if (!data.outputs?.ac_annual && data.outputs?.ac_annual !== 0) {
                throw new Error('No generation data returned. Check location and try again.');
            }

            setNrelData(data.outputs);
            setFinancialData((prev) => ({
                ...prev,
                upfront_cost: data.suggested_upfront_cost_inr || prev.upfront_cost,
            }));
            setStep(2);
        } catch (err) {
            console.error(err);
            let msg = 'Failed to calculate. Please check your inputs and try again.';
            if (err.response?.status === 429) msg = 'API rate limit exceeded. Try again later.';
            else if (err.response?.data?.detail) msg = String(err.response.data.detail);
            else if (err.message) msg = err.message;
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: full ROI from backend
    const calculateROI = async () => {
        if (!nrelData) return;
        setLoading(true);
        setError(null);

        try {
            const body = {
                system_capacity: parseFloat(locationData.system_capacity),
                tilt: parseFloat(locationData.tilt) || 20,
                azimuth: parseFloat(locationData.azimuth) || 180,
                lat: parseFloat(locationData.lat),
                lon: parseFloat(locationData.lon),
                panel_type: locationData.panel_type,
                inverter_type: locationData.inverter_type,
                structure_type: locationData.structure_type,
                array_type: parseInt(locationData.array_type, 10) || 1,
                shading_loss: shadingLoss,
                annual_consumption: parseFloat(financialData.annual_consumption) || 3600,
                electricity_rate: parseFloat(financialData.electricity_rate) || 8,
                upfront_cost: parseFloat(financialData.upfront_cost) || 0,
                generation_only: false,
            };

            const response = await axios.post(endpoints.calculate, body, { timeout: 60000 });
            const data = response.data;
            const roi = data.roi;

            if (!roi) {
                // Fallback local ROI if backend only returned generation
                const annualGeneration = parseFloat(data.outputs?.ac_annual || nrelData.ac_annual);
                const annualConsumption = parseFloat(financialData.annual_consumption);
                const rate = parseFloat(financialData.electricity_rate);
                const upfront = parseFloat(financialData.upfront_cost);
                const kw = parseFloat(locationData.system_capacity);
                const subsidy = kw <= 2 ? kw * 30000 : kw <= 3 ? 60000 + (kw - 2) * 18000 : 78000;
                const selfUse = Math.min(annualGeneration, annualConsumption);
                const excess = Math.max(0, annualGeneration - annualConsumption);
                const annualBenefit = selfUse * rate + excess * 3;
                const netCost = Math.max(0, upfront - subsidy);
                setResult({
                    annualGeneration: annualGeneration.toFixed(0),
                    selfConsumption: selfUse.toFixed(0),
                    excessEnergy: excess.toFixed(0),
                    savingsFromSelfUse: (selfUse * rate).toFixed(0),
                    earningsFromExport: (excess * 3).toFixed(0),
                    totalAnnualBenefit: annualBenefit.toFixed(0),
                    upfrontCost: upfront.toFixed(0),
                    subsidy: subsidy.toFixed(0),
                    netCost: netCost.toFixed(0),
                    breakeven: annualBenefit > 0 ? (netCost / annualBenefit).toFixed(1) : '—',
                    roi25Years: (annualBenefit * 25 - netCost).toFixed(0),
                    spaceRequired: (kw * (locationData.panel_type === 'mono' ? 70 : 100)).toFixed(0),
                });
            } else {
                if (data.outputs) setNrelData(data.outputs);
                setResult({
                    annualGeneration: Number(roi.annual_generation_kwh).toFixed(0),
                    selfConsumption: Number(roi.self_consumption_kwh).toFixed(0),
                    excessEnergy: Number(roi.excess_energy_kwh).toFixed(0),
                    savingsFromSelfUse: Number(roi.savings_from_self_use_inr).toFixed(0),
                    earningsFromExport: Number(roi.earnings_from_export_inr).toFixed(0),
                    totalAnnualBenefit: Number(roi.total_annual_benefit_inr).toFixed(0),
                    upfrontCost: Number(roi.upfront_cost_inr).toFixed(0),
                    subsidy: Number(roi.subsidy_inr).toFixed(0),
                    netCost: Number(roi.net_cost_inr).toFixed(0),
                    breakeven: roi.breakeven_years != null ? Number(roi.breakeven_years).toFixed(1) : '—',
                    roi25Years: Number(roi.roi_25_years_inr).toFixed(0),
                    spaceRequired: Number(roi.space_required_sqft).toFixed(0),
                });
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || err.message || 'ROI calculation failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                <h1 className="text-5xl font-bold text-gray-900 mb-4">Solar ROI Calculator</h1>
                <p className="text-xl text-gray-600">
                    Real savings with PM Surya Ghar subsidy & grid export
                </p>
            </motion.div>

            <div className="flex items-center justify-center mb-12">
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                step > 1 ? 'bg-blue-600 text-white' : step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                            }`}
                        >
                            {step > 1 ? <CheckCircle size={20} /> : '1'}
                        </div>
                        <span className="font-medium hidden md:block">Location & System</span>
                    </div>
                    <div className="w-16 h-1 bg-gray-300" />
                    <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                            }`}
                        >
                            2
                        </div>
                        <span className="font-medium hidden md:block">Financial Details</span>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
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
                            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">{error}</div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">System Capacity (kW) *</label>
                                <input
                                    type="number"
                                    name="system_capacity"
                                    min="0.5"
                                    step="0.5"
                                    value={locationData.system_capacity}
                                    onChange={handleLocationChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Typical: 2–5 kW for homes</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Panel Tilt (°)</label>
                                <input
                                    type="number"
                                    name="tilt"
                                    value={locationData.tilt}
                                    onChange={handleLocationChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Optimal: 15–25° for India</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Solar Panel Type *</label>
                                <select
                                    name="panel_type"
                                    value={locationData.panel_type}
                                    onChange={handleLocationChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="mono">Monocrystalline (Premium)</option>
                                    <option value="poly">Polycrystalline (Budget)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Inverter *</label>
                                <select
                                    name="inverter_type"
                                    value={locationData.inverter_type}
                                    onChange={handleLocationChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="string">String Inverter (Standard)</option>
                                    <option value="micro">Microinverters (Better with shade)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Mounting Structure *</label>
                                <select
                                    name="structure_type"
                                    value={locationData.structure_type}
                                    onChange={handleLocationChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="standard">Standard Rooftop</option>
                                    <option value="elevated">Elevated Structure</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude *</label>
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
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude *</label>
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
                            onClick={fetchGeneration}
                            disabled={loading}
                            className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
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

                {step === 2 && nrelData && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <IndianRupee className="text-green-600" />
                                    Step 2: Financial Details
                                </h2>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
                                        {error}
                                    </div>
                                )}

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                    <p className="text-sm text-blue-900 flex items-start gap-2">
                                        <Info size={16} className="mt-0.5 flex-shrink-0" />
                                        <span>
                                            <strong>Solar Intelligence:</strong>
                                            <br />• Generation: {parseFloat(nrelData.ac_annual).toFixed(0)} kWh/yr
                                            <br />• Shading:{' '}
                                            <span
                                                className={
                                                    shadingStatus.includes('High')
                                                        ? 'text-red-600 font-bold'
                                                        : shadingStatus.includes('Moderate')
                                                          ? 'text-yellow-600 font-bold'
                                                          : 'text-green-600 font-bold'
                                                }
                                            >
                                                {shadingStatus}
                                            </span>
                                            <br />• Location: ({parseFloat(locationData.lat).toFixed(3)},{' '}
                                            {parseFloat(locationData.lon).toFixed(3)})
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
                                            <Info size={12} /> Auto-estimated from hardware. You can override.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Electricity Rate (₹/kWh)
                                        </label>
                                        <input
                                            type="number"
                                            name="electricity_rate"
                                            step="0.1"
                                            value={financialData.electricity_rate}
                                            onChange={handleFinancialChange}
                                            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Annual Consumption (kWh)
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
                                            onClick={() => {
                                                setStep(1);
                                                setResult(null);
                                            }}
                                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg"
                                        >
                                            ← Back
                                        </button>
                                        <button
                                            onClick={calculateROI}
                                            disabled={loading}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {loading ? (
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                            ) : (
                                                <>
                                                    Calculate ROI <TrendingUp size={20} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 flex flex-col gap-6"
                                >
                                    <div className="flex justify-between items-center border-b pb-4">
                                        <h3 className="text-2xl font-bold text-gray-900">Investment Analysis</h3>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">
                                            <Zap size={14} /> Viability
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                                            <p className="text-xs text-blue-600 font-semibold uppercase mb-1">
                                                Annual Generation
                                            </p>
                                            <p className="text-3xl font-bold text-blue-900">
                                                {result.annualGeneration}{' '}
                                                <span className="text-lg font-medium opacity-60">kWh</span>
                                            </p>
                                        </div>
                                        <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                                            <p className="text-xs text-indigo-600 font-semibold uppercase mb-1">
                                                Estimated Space
                                            </p>
                                            <p className="text-3xl font-bold text-indigo-900">
                                                {result.spaceRequired}{' '}
                                                <span className="text-lg font-medium opacity-60">sq. ft.</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                                            <div>
                                                <p className="text-sm text-gray-500">Upfront Investment</p>
                                                <p className="text-xl font-bold text-gray-900">
                                                    ₹{(result.upfrontCost / 100000).toFixed(2)} Lakhs
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-blue-600 font-semibold">
                                                    − ₹{Number(result.subsidy).toLocaleString('en-IN')} Subsidy
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Effective: ₹{(result.netCost / 100000).toFixed(2)}L
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg shadow-green-200">
                                            <div className="flex justify-between items-end mb-4">
                                                <div>
                                                    <p className="text-sm opacity-90 uppercase font-semibold">
                                                        Annual Benefit
                                                    </p>
                                                    <p className="text-4xl font-bold">
                                                        ₹{Number(result.totalAnnualBenefit).toLocaleString('en-IN')}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm opacity-90">Breakeven</p>
                                                    <p className="text-2xl font-bold text-green-100">
                                                        {result.breakeven} Years
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-xs mt-3 opacity-80 italic">
                                                Self-use savings + export @ ₹3/kWh · PM Surya Ghar subsidy applied
                                            </p>
                                        </div>

                                        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                                            <p className="text-sm text-yellow-800">
                                                <strong>25-Year Projection:</strong> ~₹
                                                {(result.roi25Years / 100000).toFixed(1)} Lakhs net benefit (excl.
                                                degradation/inflation).
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
