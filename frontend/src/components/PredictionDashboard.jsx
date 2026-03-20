import React, { useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Zap, UploadCloud } from 'lucide-react';
import { motion } from 'framer-motion';

const PredictionDashboard = () => {
    const [startDate, setStartDate] = useState('2024-01-01');
    const [endDate, setEndDate] = useState('2024-01-07');
    const [selectedFile, setSelectedFile] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fetchPrediction = async () => {
        setLoading(true);
        setError(null);
        try {
            // Hardcoded backend URL as requested by user
            const backendUrl = 'https://solar-ai-backend.onrender.com';
            let response;
            
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                response = await axios.post(`${backendUrl}/api/prediction/custom`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                response = await axios.post(`${backendUrl}/api/prediction/generate`, {
                    start_date: startDate,
                    end_date: endDate
                });
            }
            
            // Handle proxy response format (might be wrapped or raw depending on Mono type)
            const forecastData = response.data.forecast || response.data;
            const chartData = forecastData.map(item => ({
                time: new Date(item.time).toLocaleDateString() + ' ' + new Date(item.time).getHours() + ':00',
                value: item.prediction,
                lower: item.lower_bound,
                upper: item.upper_bound
            }));

            setData(chartData);
        } catch (err) {
            console.error(err);
            setError(`Prediction failed. Check if Backend is live at: https://solar-ai-backend-lfi2.onrender.com`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 relative">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <div className="flex items-center justify-center gap-3 mb-4">
                    <TrendingUp className="text-blue-600" size={40} />
                    <h1 className="text-5xl font-bold text-gray-900">GridSmart Predictor</h1>
                </div>
                <p className="text-xl text-gray-600">AI-driven energy generation forecasting for your solar array</p>
            </motion.div>

            {/* Input Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8"
            >
                <div className="flex flex-col md:flex-row items-end justify-center gap-6">
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar size={18} className="text-gray-500" />
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full md:w-56 bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                        />
                    </div>

                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar size={18} className="text-gray-500" />
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full md:w-56 bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                        />
                    </div>

                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <UploadCloud size={18} className="text-gray-500" />
                            Custom Data (CSV)
                        </label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setSelectedFile(e.target.files[0])}
                            className="w-full md:w-56 bg-gray-50 border border-gray-300 rounded-lg p-[9px] focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-gray-900 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>

                    <button
                        onClick={fetchPrediction}
                        disabled={loading}
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-10 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                {selectedFile ? "Training Custom Model..." : "Running Model..."}
                            </>
                        ) : (
                            <>
                                <TrendingUp size={20} />
                                {selectedFile ? "Train & Predict" : "Predict Generation"}
                            </>
                        )}
                    </button>
                </div>
            </motion.div>

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-8 text-center"
                >
                    {error}
                </motion.div>
            )}

            {/* Chart Section */}
            {data.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-semibold text-gray-900">Forecast Results</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                            <span>Predicted Output (MW)</span>
                        </div>
                    </div>

                    <div className="h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="time"
                                    stroke="#6b7280"
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    minTickGap={50}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    label={{ value: 'Energy (MW)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        borderColor: '#e5e7eb',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    itemStyle={{ color: '#3b82f6', fontWeight: 600 }}
                                    labelStyle={{ color: '#374151', fontWeight: 600 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                    name="Predicted Output (MW)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-700 font-medium">Total Data Points</p>
                            <p className="text-2xl font-bold text-blue-900">{data.length}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-green-700 font-medium">Peak Prediction</p>
                            <p className="text-2xl font-bold text-green-900">
                                {Math.max(...data.map(d => d.value)).toFixed(2)} MW
                            </p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <p className="text-sm text-purple-700 font-medium">Average Output</p>
                            <p className="text-2xl font-bold text-purple-900">
                                {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(2)} MW
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Empty State */}
            {data.length === 0 && !loading && !error && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center"
                >
                    <TrendingUp className="mx-auto mb-4 text-gray-400" size={64} />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Predictions Yet</h3>
                    <p className="text-gray-500">Select a date range and click "Predict Generation" to see AI-powered forecasts</p>
                </motion.div>
            )}
        </div>
    );
};

export default PredictionDashboard;
