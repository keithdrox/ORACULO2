import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class WeatherService {

    private static final String API_KEY = "ed837b064312b708aa0afe18c2b91aca"; // API Key actualizada
    private static final String BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
    private final HttpClient httpClient;

    public WeatherService() {
        this.httpClient = HttpClient.newHttpClient();
    }

    public WeatherInfo getWeatherAndMoonPhase(String city) {
        try {
            WeatherInfo weatherInfo = fetchWeatherData(city);
            String moonPhase = calculateMoonPhase(LocalDate.now());
            weatherInfo.setMoonPhase(moonPhase);
            return weatherInfo;
        } catch (Exception e) {
            System.err.println("Error al obtener datos del clima: " + e.getMessage());
            return new WeatherInfo("Error", 0.0, "Desconocida");
        }
    }

    private WeatherInfo fetchWeatherData(String city) throws IOException, InterruptedException {
        String url = String.format("%s?q=%s,EC&appid=%s&units=metric", BASE_URL, city, API_KEY);
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IOException("Error en la respuesta de la API: " + response.statusCode());
        }

        return parseWeatherJson(response.body());
    }

    // Parseo manual simple para evitar dependencias externas como Jackson/Gson en este ejemplo
    private WeatherInfo parseWeatherJson(String json) {
        String condition = extractJsonValue(json, "\"main\":\"", "\"");
        if (condition == null) condition = extractJsonValue(json, "\"description\":\"", "\""); // Fallback
        
        // Extracción simplificada del clima principal (Rain, Clear, Clouds)
        String mainWeather = "Clear";
        if (json.contains("\"main\":\"Rain\"")) mainWeather = "Rain";
        else if (json.contains("\"main\":\"Clouds\"")) mainWeather = "Clouds";
        else if (json.contains("\"main\":\"Drizzle\"")) mainWeather = "Rain";
        else if (json.contains("\"main\":\"Thunderstorm\"")) mainWeather = "Rain";
        
        double temp = 0.0;
        String tempStr = extractJsonValue(json, "\"temp\":", ",");
        if (tempStr != null) {
            try {
                temp = Double.parseDouble(tempStr);
            } catch (NumberFormatException e) {
                // Ignorar error de parseo
            }
        }

        return new WeatherInfo(mainWeather, temp, "");
    }

    private String extractJsonValue(String json, String keyStart, String keyEnd) {
        int startIndex = json.indexOf(keyStart);
        if (startIndex == -1) return null;
        startIndex += keyStart.length();
        int endIndex = json.indexOf(keyEnd, startIndex);
        if (endIndex == -1) return null;
        return json.substring(startIndex, endIndex);
    }

    // Algoritmo simple de Conway para fase lunar
    private String calculateMoonPhase(LocalDate date) {
        // Fecha base conocida de Luna Nueva: 11 de Enero de 2024
        LocalDate knownNewMoon = LocalDate.of(2024, 1, 11);
        long daysSinceNewMoon = ChronoUnit.DAYS.between(knownNewMoon, date);
        double lunarCycle = 29.53;
        
        double currentCycleDay = daysSinceNewMoon % lunarCycle;
        if (currentCycleDay < 0) currentCycleDay += lunarCycle;

        if (currentCycleDay < 1.8) return "Luna Nueva";
        if (currentCycleDay < 9.2) return "Luna Creciente"; // Cuarto Creciente aprox
        if (currentCycleDay < 16.6) return "Luna Llena";
        if (currentCycleDay < 24.0) return "Luna Menguante"; // Cuarto Menguante aprox
        return "Luna Nueva"; // Ciclo finalizando
    }

    public static class WeatherInfo {
        private String condition; // Rain, Clear, Clouds
        private double temperature;
        private String moonPhase;

        public WeatherInfo(String condition, double temperature, String moonPhase) {
            this.condition = condition;
            this.temperature = temperature;
            this.moonPhase = moonPhase;
        }

        public String getCondition() { return condition; }
        public double getTemperature() { return temperature; }
        public String getMoonPhase() { return moonPhase; }
        public void setMoonPhase(String moonPhase) { this.moonPhase = moonPhase; }

        @Override
        public String toString() {
            return String.format("Clima: %s, Temp: %.1f°C, Fase Lunar: %s", condition, temperature, moonPhase);
        }
    }
}
