import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class OraculoService {

    private static final String JSON_PATH = "reglas_ancestrales.json";

    public Recomendacion generarRecomendacionBioclimatica(WeatherService.WeatherInfo clima, String nacionalidad) {
        String contenidoJson = leerArchivoJson();
        if (contenidoJson == null) {
            return new Recomendacion("Error al leer reglas", "Error", "Error", "Error", "Error");
        }

        // Normalizar datos de entrada
        String faseLunar = clima.getMoonPhase(); 
        String condicionClima = mapConditionToKey(clima.getCondition()); 

        // Intentar búsqueda exacta
        Recomendacion recomendacion = buscarEnJson(contenidoJson, nacionalidad, faseLunar, condicionClima);

        if (recomendacion != null) {
            return recomendacion;
        } else {
            return generarFallback(nacionalidad);
        }
    }

    private String mapConditionToKey(String weatherCondition) {
        if (weatherCondition == null) return "Despejado";
        if (weatherCondition.equalsIgnoreCase("Rain") || 
            weatherCondition.equalsIgnoreCase("Drizzle") || 
            weatherCondition.equalsIgnoreCase("Thunderstorm") ||
            weatherCondition.equalsIgnoreCase("Snow")) {
            return "Lluvia";
        }
        return "Despejado"; 
    }

    private String leerArchivoJson() {
        try {
            Path path = Paths.get(JSON_PATH);
            if (!Files.exists(path)) {
                path = Paths.get(System.getProperty("user.dir"), JSON_PATH);
            }
            return Files.readString(path);
        } catch (IOException e) {
            System.err.println("Error leyendo el archivo JSON: " + e.getMessage());
            return null;
        }
    }

    private Recomendacion buscarEnJson(String json, String nacionalidad, String fase, String clima) {
        try {
            String bloqueReglas = extraerBloque(json, "\"reglas\": {");
            if (bloqueReglas == null) return null;

            String bloqueNacionalidad = extraerBloque(bloqueReglas, "\"" + nacionalidad + "\": {");
            if (bloqueNacionalidad == null) return null;

            String bloqueFases = extraerBloque(bloqueNacionalidad, "\"fases_lunares\": {");
            if (bloqueFases == null) return null;

            String bloqueFase = extraerBloque(bloqueFases, "\"" + fase + "\": {");
            if (bloqueFase == null) return null;

            String bloqueClima = extraerBloque(bloqueFase, "\"" + clima + "\": {");
            if (bloqueClima == null) return null;

            String labores = extraerValor(bloqueClima, "labores_tierra");
            String rituales = extraerValor(bloqueClima, "rituales_danzas");
            String vestimenta = extraerValor(bloqueClima, "vestimenta");
            String gastronomia = extraerValor(bloqueClima, "gastronomia");
            String medicina = extraerValor(bloqueClima, "medicina");

            return new Recomendacion(labores, rituales, vestimenta, gastronomia, medicina);
        } catch (Exception e) {
            System.err.println("Error parseando JSON: " + e.getMessage());
            return null;
        }
    }

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
        return (i > inicio) ? texto.substring(inicio, i - 1) : null;
    }

    private String extraerValor(String texto, String clave) {
        String patron = "\"" + clave + "\": \"";
        int inicio = texto.indexOf(patron);
        if (inicio == -1) return "No disponible";
        inicio += patron.length();
        int fin = texto.indexOf("\"", inicio);
        if (fin == -1) return "No disponible";
        return texto.substring(inicio, fin);
    }

    private Recomendacion generarFallback(String nacionalidad) {
        String labores = "Observar la naturaleza y actuar con prudencia.";
        String rituales = "Conexión personal con los elementos.";
        String vestimenta = "Ropa cómoda y adecuada al clima actual.";
        String gastronomia = "Alimentos de temporada.";
        String medicina = "Mantenerse hidratado y descansar.";

        // Mantengo los fallbacks por nacionalidad para robustez
        if ("Kichwa".equalsIgnoreCase(nacionalidad)) {
            labores = "Mantenimiento general de cultivos.";
            rituales = "Agradecimiento a la Pachamama.";
            vestimenta = "Ropa abrigada.";
        } else if ("Shuar".equalsIgnoreCase(nacionalidad)) {
            labores = "Recolección y pesca.";
            rituales = "Meditación en la naturaleza.";
            vestimenta = "Ropa ligera.";
        }
        // ... (se podrían añadir más fallbacks si se desea, por ahora es suficiente)

        return new Recomendacion(labores, rituales, vestimenta, gastronomia, medicina);
    }

    public static class Recomendacion {
        public String laboresTierra;
        public String ritualesDanzas;
        public String vestimenta;
        public String gastronomia;
        public String medicina;

        public Recomendacion(String laboresTierra, String ritualesDanzas, String vestimenta, String gastronomia, String medicina) {
            this.laboresTierra = laboresTierra;
            this.ritualesDanzas = ritualesDanzas;
            this.vestimenta = vestimenta;
            this.gastronomia = gastronomia;
            this.medicina = medicina;
        }

        public String toJson() {
            return String.format(
                "{\"labores_tierra\": \"%s\", \"rituales_danzas\": \"%s\", \"vestimenta\": \"%s\", \"gastronomia\": \"%s\", \"medicina\": \"%s\"}",
                laboresTierra, ritualesDanzas, vestimenta, gastronomia, medicina
            );
        }

        @Override
        public String toString() {
            return String.format(
                "🌱 Labores: %s\n🔥 Rituales: %s\n👕 Vestimenta: %s\n🍲 Gastronomía: %s\n🌿 Medicina: %s",
                laboresTierra, ritualesDanzas, vestimenta, gastronomia, medicina
            );
        }
    }

}
