import warnings
warnings.filterwarnings("ignore", category=UserWarning)

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import matplotlib.pyplot as plt
import pickle
import io
import base64
from prophet import Prophet
import numpy as np

print("All modules imported successfully.")

# Load the saved Prophet model
try:
    with open(r"C:\Users\Sumed\Downloads\brazil_e_model.pkl", 'rb') as f:
        loaded_model = pickle.load(f)
    print("Prophet model loaded successfully.")
except Exception as e:
    print(f"Error loading Prophet model: {str(e)}")
    loaded_model = None

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

@app.route('/predict', methods=['POST'])
def predict_demand():
    print("Received prediction request.")
    # Get user input (start_date, end_date) from the request
    data = request.get_json()
    start_date = pd.to_datetime(data.get('start_date'))
    end_date = pd.to_datetime(data.get('end_date'))

    print(f"Prediction requested for period: {start_date} to {end_date}")

    # Generate future dates for prediction
    future_dates = pd.DataFrame({'ds': pd.date_range(start=start_date, end=end_date, freq='H')})
    
    # Use the model to predict the demand
    try:
        forecast = loaded_model.predict(future_dates)
        print("Forecast generated successfully.")
    except Exception as e:
        print(f"Error generating forecast: {str(e)}")
        return jsonify({'error': str(e)}), 500

    # Create a plot of the forecast
    try:
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Convert datetime to numpy array to avoid deprecation warning
        fcst_t = forecast['ds'].to_numpy()
        ax.plot(fcst_t, forecast['yhat'], ls='-', c='#0072B2')
        ax.fill_between(fcst_t, forecast['yhat_lower'], forecast['yhat_upper'], color='#0072B2', alpha=0.2)

        # Plot historical data if available
        if hasattr(loaded_model, 'history') and 'ds' in loaded_model.history and 'y' in loaded_model.history:
            history_dates = loaded_model.history['ds'].to_numpy()
            ax.plot(history_dates, loaded_model.history['y'], 'k.')

        plt.title('Hourly Energy Demand Forecast')
        plt.xlabel('Date')
        plt.ylabel('Energy Demand')

        # Save the plot to a PNG image in memory
        img = io.BytesIO()
        plt.savefig(img, format='png', bbox_inches='tight')
        img.seek(0)

        # Convert the image to base64 so it can be returned as JSON
        graph_url = base64.b64encode(img.getvalue()).decode()

        # Close the plot to free up memory
        plt.close(fig)

        print("Forecast plot generated successfully.")
        return jsonify({'forecast_graph': f'data:image/png;base64,{graph_url}'})
    except Exception as e:
        print(f"Error generating plot: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    print("Starting Flask app...")
    # Start the Flask app
    app.run(host='0.0.0.0', port=5005, debug=True)