import React, { useState } from 'react';
import axios from 'axios';
import { Upload, AlertTriangle, CheckCircle, Shield, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

const MaintenanceAlert = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
            setResult(null);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await axios.post('http://localhost:5000/predict/defect', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setResult(response.data);
        } catch (err) {
            console.error(err);
            setError("Analysis failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const getDefectIcon = (isDefective) => {
        return isDefective ? <AlertTriangle size={48} /> : <CheckCircle size={48} />;
    };

    const getRecommendation = (defectType) => {
        const recommendations = {
            'Bird-drop': 'Schedule cleaning to remove bird droppings and restore efficiency.',
            'Dusty': 'Panel cleaning recommended to improve energy output.',
            'Snow-Covered': 'Remove snow cover carefully or wait for natural melting.',
            'Electrical-damage': '⚠️ URGENT: Contact maintenance team immediately for inspection and repair.',
            'Physical-Damage': '⚠️ URGENT: Contact maintenance team immediately for inspection and repair.',
            'Clean': 'Panel is in excellent condition. Continue regular monitoring for optimal performance.'
        };
        return recommendations[defectType] || 'Please consult with a solar panel technician.';
    };

    return (
        <div className="max-w-7xl mx-auto py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <div className="flex items-center justify-center gap-3 mb-4">
                    <Shield className="text-orange-600" size={40} />
                    <h1 className="text-5xl font-bold text-gray-900">Solar Panel Defect Guard</h1>
                </div>
                <p className="text-xl text-gray-600">AI-powered defect detection for optimal panel performance</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Upload Section */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                >
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                            <Camera size={24} className="text-gray-600" />
                            Upload Panel Image
                        </h3>

                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center transition-all hover:border-blue-400 hover:bg-blue-50/50 bg-gray-50">
                            <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                onChange={handleFileSelect}
                                accept="image/*"
                            />
                            <label
                                htmlFor="file-upload"
                                className="cursor-pointer flex flex-col items-center gap-4"
                            >
                                {preview ? (
                                    <div className="relative">
                                        <img
                                            src={preview}
                                            alt="Preview"
                                            className="max-h-80 rounded-lg shadow-md object-contain"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setPreview(null);
                                                setSelectedFile(null);
                                            }}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                                            <Upload className="text-blue-600 w-10 h-10" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-medium text-gray-700">Click to upload panel image</p>
                                            <p className="text-sm text-gray-500 mt-1">Supports JPG, PNG (Max 10MB)</p>
                                        </div>
                                    </>
                                )}
                            </label>
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={!selectedFile || loading}
                            className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 ${!selectedFile
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-orange-600 text-white shadow-lg hover:bg-orange-700'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                    Analyzing Panel...
                                </>
                            ) : (
                                <>
                                    <Shield size={20} />
                                    Analyze for Defects
                                </>
                            )}
                        </button>

                        {error && (
                            <div className="mt-4 bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm text-center">
                                {error}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Result Section */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col justify-center"
                >
                    {result ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                            <div className={`flex items-center gap-4 mb-6 p-6 rounded-xl ${result.is_defective
                                    ? 'bg-red-50 border-2 border-red-200'
                                    : 'bg-green-50 border-2 border-green-200'
                                }`}>
                                <div className={result.is_defective ? 'text-red-500' : 'text-green-500'}>
                                    {getDefectIcon(result.is_defective)}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">
                                        {result.is_defective ? 'Defect Detected' : 'Panel Healthy'}
                                    </h3>
                                    <p className={`text-lg ${result.is_defective ? 'text-red-700' : 'text-green-700'}`}>
                                        {result.is_defective ? 'Requires Attention' : 'Optimal Performance'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-gray-50 rounded-xl p-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-medium text-gray-600">Classification</span>
                                        <span className={`px-4 py-1 rounded-full text-sm font-semibold ${result.defect_type === 'Clean' ? 'bg-green-100 text-green-800' :
                                                result.defect_type === 'Bird-drop' ? 'bg-yellow-100 text-yellow-800' :
                                                    result.defect_type === 'Dusty' ? 'bg-orange-100 text-orange-800' :
                                                        'bg-red-100 text-red-800'
                                            }`}>
                                            {result.defect_type}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-600">Confidence</span>
                                        <span className="text-2xl font-bold text-gray-900">
                                            {(result.confidence * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${result.confidence * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {result.is_defective && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                                        <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                                            <AlertTriangle size={20} />
                                            Recommended Action
                                        </h4>
                                        <p className="text-sm text-orange-800">
                                            {getRecommendation(result.defect_type)}
                                        </p>
                                    </div>
                                )}

                                {!result.is_defective && (
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                                        <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                                            <CheckCircle size={20} />
                                            Status
                                        </h4>
                                        <p className="text-sm text-green-800">
                                            {getRecommendation(result.defect_type)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center h-full flex flex-col items-center justify-center">
                            <Shield className="mx-auto mb-4 text-gray-400" size={64} />
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Analysis Yet</h3>
                            <p className="text-gray-500">Upload a solar panel image to detect defects</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default MaintenanceAlert;
