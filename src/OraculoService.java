import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class OraculoService {

    private static final String JSON_PATH = "reglas_ancestrales.json";

    public Recomendacion generarRecomendacionBioclimatica(WeatherService.WeatherInfo clima, String nacionalidad) {
        String contenidoJson = leerArchivoJson();
        if (contenidoJson == null) {
            return new Recomendacion("Error al leer reglas", "Error", "Error");
        }

        // Normalizar datos de entrada
        String faseLunar = clima.getMoonPhase(); // "Luna Nueva", "Luna Creciente", etc.
        String condicionClima = mapConditionToKey(clima.getCondition()); // "Lluvia" o "Despejado"

        // Intentar búsqueda exacta
        Recomendacion recomendacion = buscarEnJson(contenidoJson, nacionalidad, faseLunar, condicionClima);

        if (recomendacion != null) {
            return recomendacion;
        } else {
            // Lógica por defecto (Fallback)
            return generarFallback(nacionalidad);
        }
    }

    private String mapConditionToKey(String weatherCondition) {
        // Mapear condiciones de OpenWeatherMap a las claves del JSON
        if (weatherCondition.equalsIgnoreCase("Rain") || 
            weatherCondition.equalsIgnoreCase("Drizzle") || 
            weatherCondition.equalsIgnoreCase("Thunderstorm") ||
            weatherCondition.equalsIgnoreCase("Snow")) {
            return "Lluvia";
        }
        return "Despejado"; // Clouds, Clear, etc. se asumen como tiempo seco/despejado para efectos prácticos o se podría refinar
    }

    private String leerArchivoJson() {
        try {
            Path path = Paths.get(JSON_PATH);
            // Intentar leer desde la raíz del proyecto
            if (!Files.exists(path)) {
                // Intentar ruta absoluta si la relativa falla (ajuste para entornos IDE)
                path = Paths.get(System.getProperty("user.dir"), JSON_PATH);
            }
            return Files.readString(path);
        } catch (IOException e) {
            System.err.println("Error leyendo el archivo JSON: " + e.getMessage());
            return null;
        }
    }

    // Método de extracción "artesanal" para evitar dependencias externas (Gson/Jackson)
    private Recomendacion buscarEnJson(String json, String nacionalidad, String fase, String clima) {
        try {
            // Buscar bloque de nacionalidad
            String bloqueNacionalidad = extraerBloque(json, "\"" + nacionalidad + "\": {");
            if (bloqueNacionalidad == null) return null;

            // Buscar bloque de fase lunar dentro de nacionalidad
            String bloqueFase = extraerBloque(bloqueNacionalidad, "\"" + fase + "\": {");
            if (bloqueFase == null) return null;

            // Buscar bloque de clima dentro de fase
            String bloqueClima = extraerBloque(bloqueFase, "\"" + clima + "\": {");
            if (bloqueClima == null) return null;

            // Extraer valores finales
            String labores = extraerValor(bloqueClima, "\"labores_tierra\": \"");
            String rituales = extraerValor(bloqueClima, "\"rituales_danzas\": \"");
            String vestimenta = extraerValor(bloqueClima, "\"vestimenta\": \"");

            return new Recomendacion(labores, rituales, vestimenta);
        } catch (Exception e) {
            System.err.println("Error parseando JSON manualmente: " + e.getMessage());
            return null;
        }
    }

    // Ayudante para extraer un bloque {...} dado un inicio
    private String extraerBloque(String texto, String llaveInicio) {
        int inicio = texto.indexOf(llaveInicio);
        if (inicio == -1) return null;
        inicio += llaveInicio.length();

        int contadorLlaves = 1;
        int i = inicio;
        while (contadorLlaves > 0 && i < texto.length()) {
            char c = texto.charAt(i);
            if (c == '{') contadorLlaves++;
            if (c == '}') contadorLlaves--;
            i++;
        }
        return texto.substring(inicio, i - 1);
    }

    // Ayudante para extraer valor de una clave simple "clave": "valor"
    private String extraerValor(String texto, String llave) {
        int inicio = texto.indexOf(llave);
        if (inicio == -1) return "No disponible";
        inicio += llave.length();
        int fin = texto.indexOf("\"", inicio);
        return texto.substring(inicio, fin);
    }

    private Recomendacion generarFallback(String nacionalidad) {
        // Recomendaciones genéricas si falla la búsqueda específica
        String labores = "Observar la naturaleza y actuar con prudencia.";
        String rituales = "Conexión personal con los elementos.";
        String vestimenta = "Ropa cómoda y adecuada al clima actual.";

        if ("Kichwa".equalsIgnoreCase(nacionalidad)) {
            labores = "Mantenimiento general de cultivos.";
            rituales = "Agradecimiento a la Pachamama.";
            vestimenta = "Ropa abrigada.";
        } else if ("Shuar".equalsIgnoreCase(nacionalidad)) {
            labores = "Recolección y pesca.";
            rituales = "Meditación en la naturaleza.";
            vestimenta = "Ropa ligera.";
        } else if ("Montubio".equalsIgnoreCase(nacionalidad)) {
            labores = "Cuidado del ganado.";
            rituales = "Tradición oral.";
            vestimenta = "Sombrero y ropa fresca.";
        } else if ("Afroecuatoriano".equalsIgnoreCase(nacionalidad)) {
            labores = "Pesca y recolección de conchas.";
            rituales = "Música de marimba y arrullos.";
            vestimenta = "Ropa blanca y fresca.";
        } else if ("Galapagueño".equalsIgnoreCase(nacionalidad)) {
            labores = "Conservación y pesca sustentable.";
            rituales = "Respeto a la vida silvestre.";
            vestimenta = "Protección solar y ropa de playa.";
        }

        return new Recomendacion(labores, rituales, vestimenta);
    }

    public static class Recomendacion {
        public String laboresTierra;
        public String ritualesDanzas;
        public String vestimenta;

        public Recomendacion(String laboresTierra, String ritualesDanzas, String vestimenta) {
            this.laboresTierra = laboresTierra;
            this.ritualesDanzas = ritualesDanzas;
            this.vestimenta = vestimenta;
        }

        @Override
        public String toString() {
            return String.format(
                "--- RECOMENDACIÓN ANCESTRAL ---\n" +
                "🌱 Labores de Tierra: %s\n" +
                "🔥 Rituales y Danzas: %s\n" +
                "👕 Vestimenta: %s",
                laboresTierra, ritualesDanzas, vestimenta
            );
        }
    }
}
