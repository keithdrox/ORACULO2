import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Servidor REST minimalista usando la librería interna de Java.
 * Permite que el Frontend consulte la sabiduría ancestral directamente al Backend.
 */
public class OraculoRESTServer {

    private static final int PORT = 8080;

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        
        // Endpoint: /consultar?ciudad=Quito&nacionalidad=Kichwa
        server.createContext("/api/consultar", new ConsultarHandler());
        
        server.setExecutor(null);
        System.out.println("🚀 Servidor Oráculo Ancestral iniciado en http://localhost:" + PORT);
        server.start();
    }

    static class ConsultarHandler implements HttpHandler {
        private final WeatherService weatherService = new WeatherService();
        private final OraculoService oraculoService = new OraculoService();

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            // Configurar CORS para permitir que el Frontend local acceda
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Content-Type", "application/json; charset=UTF-8");

            if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> params = getQueryParams(exchange.getRequestURI().getQuery());
                String ciudad = params.getOrDefault("ciudad", "Quito");
                String nacionalidad = params.getOrDefault("nacionalidad", "Kichwa");

                System.out.println("📥 Consulta recibida: Ciudad=" + ciudad + ", Nacionalidad=" + nacionalidad);

                // 1. Obtener Clima
                WeatherService.WeatherInfo clima = weatherService.getWeatherAndMoonPhase(ciudad);
                
                // 2. Generar Recomendación
                OraculoService.Recomendacion rec = oraculoService.generarRecomendacionBioclimatica(clima, nacionalidad);

                // 3. Construir JSON de respuesta
                String jsonResponse = String.format(
                    "{\"clima\": {\"temp\": %.1f, \"condicion\": \"%s\", \"fase_lunar\": \"%s\"}, \"recomendacion\": %s}",
                    clima.getTemperature(), clima.getCondition(), clima.getMoonPhase(), rec.toJson()
                );

                sendResponse(exchange, 200, jsonResponse);
            } else {
                sendResponse(exchange, 405, "{\"error\": \"Metodo no permitido\"}");
            }
        }

        private Map<String, String> getQueryParams(String query) {
            Map<String, String> params = new HashMap<>();
            if (query == null) return params;
            for (String param : query.split("&")) {
                String[] entry = param.split("=");
                if (entry.length > 1) {
                    params.put(entry[0], entry[1]);
                }
            }
            return params;
        }

        private void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(statusCode, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }
}
