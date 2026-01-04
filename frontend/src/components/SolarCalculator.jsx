import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

const SolarCalculator = () => {
    const [formData, setFormData] = useState({
        system_capacity: 4,
        module_type: 0,
        losses: 14,
        array_type: 1,
        tilt: 20,
        azimuth: 180,
        lat: 20.5937,
        lon: 78.9629,
        cost: 200000
    });

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(null);
    };

    const validateInputs = () => {
        const lat = parseFloat(formData.lat);
        const lon = parseFloat(formData.lon);
        if (lat < -90 || lat > 90) return "Latitude must be between -90 and 90.";
        if (lon < -180 || lon > 180) return "Longitude must be between -180 and 180.";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validateInputs();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await axios.post('http://localhost:8081/api/calculator/calculate', formData);
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

            const annualGeneration = parseFloat(data.outputs.ac_annual);
            const savings = annualGeneration * 8;
            const breakeven = formData.cost / savings;

            setResult({
                outputs: {
                    ac_annual: annualGeneration.toFixed(2),
                    solrad_annual: data.outputs.solrad_annual
                },
                financial: {
                    savings: savings.toFixed(2),
                    breakeven: breakeven.toFixed(1)
                }
            });
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

    return (
        <div className="max-w-6xl mx-auto py-12">
            <h2 className="text-4xl font-bold mb-12 text-center text-gray-900">Solar ROI Calculator</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-8 rounded-lg shadow-sm border border-gray-200"
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">System Capacity (kW)</label>
                            <input
                                type="number"
                                name="system_capacity"
                                value={formData.system_capacity}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Project Cost (INR)</label>
                            <input
                                type="number"
                                name="cost"
                                value={formData.cost}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                                <input
                                    type="number"
                                    name="lat"
                                    value={formData.lat}
                                    onChange={handleChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                                <input
                                    type="number"
                                    name="lon"
                                    value={formData.lon}
                                    onChange={handleChange}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-md transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Calculating...' : 'Calculate Savings'}
                        </button>
                    </form>
                </motion.div>

                <div className="relative">
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col justify-center"
                        >
                            <h3 className="text-2xl font-semibold mb-6 text-gray-900">Financial Breakdown</h3>

                            <div className="space-y-6">
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Annual Generation</p>
                                    <p className="text-3xl font-bold text-gray-900">{result.outputs.ac_annual} kWh</p>
                                </div>

                                <div className="bg-green-50 p-6 rounded-lg">
                                    <p className="text-sm text-green-700 mb-1">Estimated Annual Savings</p>
                                    <p className="text-3xl font-bold text-green-700">₹ {result.financial.savings}</p>
                                </div>

                                <div className="bg-blue-50 p-6 rounded-lg">
                                    <p className="text-sm text-blue-700 mb-1">Breakeven Period</p>
                                    <p className="text-3xl font-bold text-blue-700">{result.financial.breakeven} Years</p>
                                </div>

                                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                                    <p className="text-sm text-gray-700 text-center">
                                        Based on your location and system size, this project is
                                        <span className="text-green-600 font-semibold ml-1">Financially Feasible</span>.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {!result && !loading && (
                        <div className="h-full flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-12">
                            <p className="text-center">Enter details to see financial breakdown</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SolarCalculator;
