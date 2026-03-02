const API_KEY = "ed837b064312b708aa0afe18c2b91aca"; // Tu API Key
let map;
let marker;

const ICONOS_LUNARES = {
    "Luna Nueva": "🌑",
    "Luna Creciente": "🌓",
    "Luna Llena": "🌕",
    "Luna Menguante": "🌗"
};

document.addEventListener('DOMContentLoaded', () => {
    inicializarMapa();
    
    document.getElementById('nacionalidad').addEventListener('change', validarFormulario);
    document.getElementById('btn-consultar').addEventListener('click', consultarOraculo);
    
    document.getElementById('btn-info').addEventListener('click', toggleInfo);
    document.getElementById('btn-close-info').addEventListener('click', toggleInfo);
    document.getElementById('btn-close-sheet').addEventListener('click', cerrarResultados);
});

function inicializarMapa() {
    const bounds = L.latLngBounds(
        L.latLng(-6.0, -92.0), 
        L.latLng(2.5, -75.0)
    );

    map = L.map('map-background', {
        zoomControl: false,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
        minZoom: 6
    }).setView([-1.8312, -78.1834], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('click', seleccionarLugarPorCoordenadas);
}

async function seleccionarLugarPorCoordenadas(e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    document.getElementById('selected-location').textContent = "Verificando ubicación...";
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
        const data = await response.json();

        if (data && data.address) {
            if (data.address.country_code !== 'ec') {
                showToast("⚠️ El Oráculo solo funciona en territorio ecuatoriano.");
                document.getElementById('selected-location').textContent = "Fuera de Ecuador";
                const btn = document.getElementById('btn-consultar');
                btn.disabled = true;
                btn.style.opacity = "0.5";
                if (marker) map.removeLayer(marker);
                return;
            }

            if (marker) map.removeLayer(marker);
            marker = L.marker([lat, lon]).addTo(map);

            const ciudad = data.address.city || data.address.town || data.address.village || data.address.county || "Ubicación rural";
            
            document.getElementById('selected-location').textContent = ciudad;
            marker.bindPopup(`<b>${ciudad}</b>`).openPopup();
            
            const btn = document.getElementById('btn-consultar');
            btn.dataset.ciudad = ciudad;
            
            validarFormulario();
        } else {
            showToast("⚠️ No se pudo identificar el lugar. Intenta en tierra firme.");
        }
    } catch (error) {
        console.error("Error en geocodificación inversa:", error);
        showToast("Error de conexión al verificar ubicación.");
    }
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "show";
    toast.style.visibility = "visible";
    toast.style.opacity = "1";
    setTimeout(function(){ 
        toast.className = toast.className.replace("show", "");
        toast.style.visibility = "hidden";
        toast.style.opacity = "0";
    }, 3000);
}

function validarFormulario() {
    const ciudad = document.getElementById('btn-consultar').dataset.ciudad;
    const nacionalidad = document.getElementById('nacionalidad').value;
    const btn = document.getElementById('btn-consultar');

    if (ciudad && nacionalidad) {
        btn.disabled = false;
        btn.style.opacity = "1";
    } else {
        btn.disabled = true;
        btn.style.opacity = "0.5";
    }
}

async function consultarOraculo() {
    const ciudad = document.getElementById('btn-consultar').dataset.ciudad;
    const nacionalidad = document.getElementById('nacionalidad').value;
    const loadingDiv = document.getElementById('loading');

    loadingDiv.classList.remove('hidden');

    try {
        const climaData = await obtenerClima(ciudad);
        const faseLunar = calcularFaseLunar(new Date());
        const recomendacion = obtenerRecomendacion(nacionalidad, faseLunar, climaData.condicion);
        
        actualizarFondoDinamico(climaData);
        mostrarResultados(climaData, faseLunar, recomendacion, nacionalidad);

    } catch (error) {
        console.error("Error detallado:", error);
        showToast("Error: " + error.message);
    } finally {
        loadingDiv.classList.add('hidden');
    }
}

function mostrarResultados(clima, fase, recomendacion, nacionalidad) {
    const tempText = clima.esSimulado ? `${clima.temp}°C (Sim)` : `${clima.temp.toFixed(1)}°C`;
    const faseLunarConIcono = `${ICONOS_LUNARES[fase] || ''} ${fase}`;

    document.getElementById('res-temp').textContent = tempText;
    document.getElementById('res-cond').textContent = clima.desc.charAt(0).toUpperCase() + clima.desc.slice(1);
    document.getElementById('res-luna').textContent = faseLunarConIcono;

    document.getElementById('card-labores').textContent = recomendacion.labores_tierra;
    document.getElementById('card-rituales').textContent = recomendacion.rituales_danzas;
    document.getElementById('card-vestimenta').textContent = recomendacion.vestimenta;
    
    // --- NUEVO: Llenar Gastronomía y Medicina ---
    document.getElementById('card-gastronomia').textContent = recomendacion.gastronomia || "No disponible";
    document.getElementById('card-medicina').textContent = recomendacion.medicina || "No disponible";

    document.getElementById('titulo-sabiduria').textContent = `Sabiduría ${nacionalidad}`;

    const sheet = document.getElementById('results-sheet');
    sheet.classList.add('active');
}

function cerrarResultados() {
    const sheet = document.getElementById('results-sheet');
    sheet.classList.remove('active');
}

function toggleInfo() {
    const panel = document.getElementById('info-panel');
    panel.classList.toggle('hidden');
}

async function obtenerClima(ciudadOriginal) {
    let ciudadBusqueda = ciudadOriginal;
    if (ciudadOriginal.includes("Puerto Ayora")) ciudadBusqueda = "Puerto Ayora";
    else if (ciudadOriginal.includes("Puerto Baquerizo")) ciudadBusqueda = "Puerto Baquerizo Moreno";
    else if (ciudadOriginal.includes("Puerto Villamil")) ciudadBusqueda = "Puerto Villamil";
    else if (ciudadOriginal.includes("Santa Cruz")) ciudadBusqueda = "Puerto Ayora";
    else if (ciudadOriginal.includes("San Cristóbal")) ciudadBusqueda = "Puerto Baquerizo Moreno";
    else if (ciudadOriginal.includes("Isabela")) ciudadBusqueda = "Puerto Villamil";

    try {
        let url = `https://api.openweathermap.org/data/2.5/weather?q=${ciudadBusqueda},EC&appid=${API_KEY}&units=metric&lang=es`;
        let response = await fetch(url);
        if (response.status === 401) throw new Error("API_KEY_INVALIDA");
        if (!response.ok && response.status === 404) {
            url = `https://api.openweathermap.org/data/2.5/weather?q=${ciudadBusqueda}&appid=${API_KEY}&units=metric&lang=es`;
            response = await fetch(url);
        }
        if (response.status === 401) throw new Error("API_KEY_INVALIDA");
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error de conexión");
        }
        const data = await response.json();
        let condicionGeneral = "Despejado";
        if (data.weather && data.weather.length > 0) {
            if (["Rain", "Drizzle", "Thunderstorm", "Snow"].includes(data.weather[0].main)) {
                condicionGeneral = "Lluvia";
            }
        }
        return {
            temp: data.main.temp,
            desc: data.weather[0].description,
            condicion: condicionGeneral,
            icon: data.weather[0].icon,
            esSimulado: false
        };
    } catch (e) {
        if (e.message === "API_KEY_INVALIDA") {
            console.warn("⚠️ API Key no activa. Activando MODO SIMULACIÓN.");
            showToast("⚠️ API Key activándose. Usando datos simulados.");
            const esLluvia = Math.random() > 0.5;
            const esNoche = Math.random() > 0.5;
            return {
                temp: parseFloat((Math.random() * (28 - 10) + 10).toFixed(1)),
                desc: esLluvia ? "lluvia ligera (simulado)" : "cielo claro (simulado)",
                condicion: esLluvia ? "Lluvia" : "Despejado",
                icon: esNoche ? (esLluvia ? "10n" : "01n") : (esLluvia ? "10d" : "01d"),
                esSimulado: true
            };
        }
        throw e;
    }
}

function calcularFaseLunar(date) {
    const knownNewMoon = new Date('2024-01-11');
    const diffTime = Math.abs(date - knownNewMoon);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const lunarCycle = 29.53;
    let currentCycleDay = diffDays % lunarCycle;
    if (currentCycleDay < 1.8) return "Luna Nueva";
    if (currentCycleDay < 9.2) return "Luna Creciente";
    if (currentCycleDay < 16.6) return "Luna Llena";
    if (currentCycleDay < 24.0) return "Luna Menguante";
    return "Luna Nueva";
}

function obtenerRecomendacion(nacionalidad, fase, condicion) {
    try {
        if (REGLAS_ANCESTRALES[nacionalidad]['fases_lunares'][fase][condicion]) {
            return REGLAS_ANCESTRALES[nacionalidad]['fases_lunares'][fase][condicion];
        }
        throw new Error("Regla no encontrada");
    } catch (e) {
        return {
            labores_tierra: "Observar la naturaleza con prudencia.",
            rituales_danzas: "Conexión personal con los elementos.",
            vestimenta: "Ropa cómoda y adecuada al clima.",
            gastronomia: "Alimentos de temporada.",
            medicina: "Descanso y agua."
        };
    }
}

function actualizarFondoDinamico(clima) {
    // Placeholder
}
