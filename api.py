from flask import Flask, request, jsonify
import numpy as np
import pickle 
import joblib 
app = Flask(__name__)

model = joblib.load("./model/classification_model.pkl")

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json

    lat_original = data.get("lat")
    lng_original = data.get("lng")
    dia_sem = data.get("dia_sem")
    noite_dia = data.get("noite_dia")
    
    def ajustar_latlong(val):
        if val is None:
            return np.nan
        try:
            val = val.replace(',', '.')
            val = float(val)
            if val > 180 or val < -180:
                return np.nan
            return val / 180
        except (ValueError, TypeError):
            return np.nan 
        
    lat = ajustar_latlong(lat_original)
    lng = ajustar_latlong(lng_original)

    dia_sem = (dia_sem / 6)

    if None in [lat, lng, dia_sem, noite_dia]:
        return jsonify({"error": "Dados incompletos, forneça lat, lng, dia_sem e noite_dia"}), 400

    features = [[lat, lng, dia_sem, noite_dia]]

    predict = model.predict(features)[0] 

    return jsonify({"prediction": predict})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
