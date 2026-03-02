import java.util.Scanner;

public class Main {

    public static void main(String[] args) {
        // Inicialización de servicios
        WeatherService weatherService = new WeatherService();
        OraculoService oraculoService = new OraculoService();
        Scanner scanner = new Scanner(System.in);

        System.out.println("=================================================");
        System.out.println("       🌞 ORÁCULO ANCESTRAL DEL ECUADOR 🌚       ");
        System.out.println("   Conectando saberes milenarios con el clima    ");
        System.out.println("=================================================");

        boolean continuar = true;

        while (continuar) {
            try {
                // 1. Obtener Ciudad
                System.out.print("\nIngrese una ciudad del Ecuador (ej. Quito, Cuenca, Tena, Esmeraldas, Puerto Ayora): ");
                String ciudad = scanner.nextLine().trim();
                if (ciudad.isEmpty()) ciudad = "Quito"; // Default

                // 2. Obtener Nacionalidad
                String nacionalidad = seleccionarNacionalidad(scanner);

                System.out.println("\n⏳ Consultando a los astros y la red...");

                // 3. Obtener Clima y Fase Lunar
                WeatherService.WeatherInfo clima = weatherService.getWeatherAndMoonPhase(ciudad);
                
                if (clima.getCondition().equals("Error")) {
                    System.out.println("❌ No se pudo conectar con el clima. Verifique su conexión o API Key.");
                } else {
                    // Mostrar Estado Actual
                    System.out.println("\n--- ESTADO ACTUAL EN " + ciudad.toUpperCase() + " ---");
                    System.out.printf("🌡️  Temperatura: %.1f°C%n", clima.getTemperature());
                    System.out.printf("☁️  Condición:   %s%n", clima.getCondition());
                    System.out.printf("🌑  Fase Lunar:  %s%n", clima.getMoonPhase());

                    // 4. Generar Recomendación Ancestral
                    OraculoService.Recomendacion recomendacion = oraculoService.generarRecomendacionBioclimatica(clima, nacionalidad);

                    // Mostrar Recomendación
                    System.out.println("\n--- 📜 SABIDURÍA " + nacionalidad.toUpperCase() + " ---");
                    System.out.println("🌱 Labores de Tierra: " + recomendacion.laboresTierra);
                    System.out.println("🔥 Rituales y Danzas: " + recomendacion.ritualesDanzas);
                    System.out.println("👕 Vestimenta:        " + recomendacion.vestimenta);
                }

            } catch (Exception e) {
                System.out.println("❌ Ocurrió un error inesperado: " + e.getMessage());
                e.printStackTrace();
            }

            // Preguntar si desea continuar
            System.out.print("\n¿Desea realizar otra consulta? (S/N): ");
            String respuesta = scanner.nextLine().trim();
            if (!respuesta.equalsIgnoreCase("S")) {
                continuar = false;
            }
        }

        System.out.println("\nGracias por usar el Oráculo Ancestral. ¡Hasta pronto!");
        scanner.close();
    }

    private static String seleccionarNacionalidad(Scanner scanner) {
        while (true) {
            System.out.println("\nSeleccione la cosmovisión para la recomendación:");
            System.out.println("1. Kichwa (Sierra)");
            System.out.println("2. Shuar (Amazonía)");
            System.out.println("3. Montubio (Costa)");
            System.out.println("4. Afroecuatoriano (Costa Norte/Valle)");
            System.out.println("5. Galapagueño (Región Insular)");
            System.out.print("Opción (1-5): ");

            String input = scanner.nextLine().trim();

            switch (input) {
                case "1": return "Kichwa";
                case "2": return "Shuar";
                case "3": return "Montubio";
                case "4": return "Afroecuatoriano";
                case "5": return "Galapagueño";
                default: System.out.println("⚠️ Opción no válida. Intente de nuevo.");
            }
        }
    }
}
