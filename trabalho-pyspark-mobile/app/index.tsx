import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import 'react-native-get-random-values';
import axios from "axios";

const GOOGLE_API_KEY = "AIzaSyA-2XFzDy7dyDk_rQ0MVOTuhZeL_C1cxlA";

const CustomPlacesAutocomplete = ({ placeholder, onSelect }: any) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const fetchPlaces = async (text: any) => {
    setQuery(text);
    if (!text) {
      setResults([]);
      return;
    }

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${text}&key=${GOOGLE_API_KEY}&language=pt-BR`
      );
      setResults(response.data.predictions);
    } catch (error) {
      console.error("Erro ao buscar locais:", error);
    }
  };

  return (
    <View>
      <TextInput
        style={styles.input}
        value={query}
        placeholder={placeholder}
        onChangeText={fetchPlaces}
      />
      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item: any) => item.place_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => {
                onSelect(item);
                setQuery(item.description); // Atualiza o campo com o endereço selecionado
                setResults([]); // Limpa os resultados após a seleção
              }}
            >
              <Text>{item.description}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};


interface Address {
  address: string;
  prediction: string
}

type DayMapType = {
  [key: string]: number;
};

export default function Index() {


  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);

  function getPredictionColor(prediction: string) {
    switch (prediction) {
      case 'BAIXA':
        return 'green';
      case 'MEDIA':
        return 'orange';
      case 'ALTA':
        return 'red';
      default:
        return 'black'; // cor padrão se a predição não for reconhecida
    }
  };

  function getDayOfWeek() {
    const days = [
      "DOMINGO", "SEGUNDA-FEIRA", "TERÇA-FEIRA", "QUARTA-FEIRA",
      "QUINTA-FEIRA", "SEXTA-FEIRA", "SÁBADO"
    ];
    const today = new Date();
    return days[today.getDay()];
  };

  function getTimeOfDay() {
    const currentHour = new Date().getHours();
    if (currentHour >= 18 || currentHour < 4) {
      return "NOITE";
    }
    return "DIA";
  };

  const dayMap: DayMapType = {
    "DOMINGO": 0,
    "SEGUNDA-FEIRA": 1,
    "TERÇA-FEIRA": 2,
    "QUARTA-FEIRA": 3,
    "QUINTA-FEIRA": 4,
    "SEXTA-FEIRA": 5,
    "SÁBADO": 6
  };

  const timeOfDayMap: DayMapType = {
    "DIA": 0,
    "NOITE": 1
  };

  async function sendDataToApi(lat: any, lng: any, address: string) {
    try {
      const requestData = {
        lat: String(lat),
        lng: String(lng),
        dia_sem: dayMap['QUINTA-FEIRA'],
        noite_dia: timeOfDayMap['DIA']
      };


      console.log("requestData", requestData);

      if (Object.values(requestData).some(value => value == null)) {
        console.error("Todos os campos devem ser preenchidos.");
        return;
      }

      const response = await fetch('http://192.168.0.111:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();

      console.log("responseData", responseData);

      setAddresses(prevAddresses => [
        ...prevAddresses,
        {
          address: address,
          prediction: responseData.prediction
        }
      ]);

    } catch (error: any) {
      console.error('Erro na requisição:', error);

    }
  }

  async function fetchDirections() {
    try {

      setAddresses([]);

      const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_API_KEY}`);
      const data = await response.json();

      if (data.routes.length) {
        const waypoints = await Promise.all(data.routes[0].legs[0].steps.map(async (step: any) => {
          let lat = step.end_location.lat;
          let lng = step.end_location.lng;

          try {
            // Fetch the address from the OpenCage API
            const responseAddress = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
              params: {
                key: `${GOOGLE_API_KEY}`,
                latlng: `${lat},${lng}`,
                language: 'pt-BR'
              }
            });

            if (responseAddress.data.results.length > 0) {
              await sendDataToApi(lat, lng, responseAddress.data.results[0].formatted_address)
              //console.log(`Endereço para a localização (${lat}, ${lng}): ${responseAddress.data.results[0].formatted_address}`);

            }
          } catch (error) {
            console.error(`Erro ao buscar endereço para (${lat}, ${lng}):`, error);

          }
        }));

      } else {
        console.log("Nenhuma rota encontrada");
      }
    } catch (error) {
      console.error("Erro ao buscar rotas:", error);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} // Ajuste para iOS
    >

      <Text style={styles.title}>Planejar Rota</Text>

      <CustomPlacesAutocomplete
        placeholder="Origem"
        onSelect={(place: any) => setOrigin(place.description)}
      />

      <CustomPlacesAutocomplete
        placeholder="Destino"
        onSelect={(place: any) => setDestination(place.description)}
      />

      <TouchableOpacity onPress={fetchDirections} style={styles.button}>
        <Text style={styles.buttonText}>Traçar Rotas</Text>
      </TouchableOpacity>
      <FlatList
        data={addresses}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <>
            <Text style={styles.address}>{item.address} - </Text>
            <Text style={{ color: getPredictionColor(item.prediction) }}>
              {`Predição: ${item.prediction}`}
            </Text>
          </>
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
      />

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007BFF',
    color: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  resultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  address: {
    fontSize: 16,
    marginTop: 12,
    marginVertical: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 5,
  },
});