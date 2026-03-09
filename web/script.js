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

    document.getElementById('nacionalidad').addEventListener('change', (e) => {
        validarFormulario();
        actualizarDescripcionCosmovision(e.target.value);
    });
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

    // ACTUALIZAR COORDENADAS INMEDIATAMENTE
    // Esto asegura que aunque Nominatim falle, la consulta de clima use el punto nuevo.
    const btn = document.getElementById('btn-consultar');
    btn.dataset.lat = lat;
    btn.dataset.lon = lon;
    btn.dataset.ciudad = "Ubicación seleccionada"; // Nombre genérico temporal

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
            btn.dataset.lat = lat;
            btn.dataset.lon = lon;

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
    setTimeout(function () {
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

function actualizarDescripcionCosmovision(nacionalidad) {
    const descContainer = document.getElementById('cosmovision-desc-container');
    const descText = document.getElementById('cosmovision-desc');

    if (nacionalidad && REGLAS_ANCESTRALES[nacionalidad]) {
        descText.textContent = `"${REGLAS_ANCESTRALES[nacionalidad].descripcion}"`;
        descContainer.classList.remove('hidden');
    } else {
        descContainer.classList.add('hidden');
    }
}

async function consultarOraculo() {
    const btn = document.getElementById('btn-consultar');
    const lat = btn.dataset.lat;
    const lon = btn.dataset.lon;
    const ciudad = btn.dataset.ciudad;
    const nacionalidad = document.getElementById('nacionalidad').value;
    const loadingDiv = document.getElementById('loading');

    loadingDiv.classList.remove('hidden');

    try {
        const climaData = await obtenerClima(ciudad, lat, lon);
        const datosLunares = calcularFaseLunar(new Date());
        const recomendacion = obtenerRecomendacion(nacionalidad, datosLunares.faseActual, climaData.condicion);

        actualizarFondoDinamico(climaData);
        mostrarResultados(climaData, datosLunares, recomendacion, nacionalidad);

    } catch (error) {
        console.error("Error detallado:", error);
        showToast("Error: " + error.message);
    } finally {
        loadingDiv.classList.add('hidden');
    }
}

function mostrarResultados(clima, datosLunares, recomendacion, nacionalidad) {
    const tempText = clima.esSimulado ? `${clima.temp}°C (Sim)` : `${clima.temp.toFixed(1)}°C`;
    const faseLunarConIcono = `${ICONOS_LUNARES[datosLunares.faseActual] || ''} ${datosLunares.faseActual}`;
    const detalleFase = `Faltan ${datosLunares.diasRestantes} días para ${datosLunares.proximaFase}`;

    document.getElementById('res-temp').textContent = tempText;
    document.getElementById('res-cond').textContent = clima.desc.charAt(0).toUpperCase() + clima.desc.slice(1);
    
    // Asignar fase y detalle
    document.getElementById('res-luna').textContent = faseLunarConIcono;
    const elemDetalleLuna = document.getElementById('res-luna-detalle');
    if(elemDetalleLuna) {
        elemDetalleLuna.textContent = detalleFase;
    }

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

async function obtenerClima(ciudad, lat, lon) {
    console.log(`🌐 Consultando clima para: ${ciudad} (${lat}, ${lon})`);

    try {
        let url;
        const cacheBuster = `&_cb=${new Date().getTime()}`; // Evitar cache
        
        if (lat && lon) {
            url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es${cacheBuster}`;
        } else {
            const ciudadLimpia = (ciudad || "").split(',')[0].trim();
            url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(ciudadLimpia)},EC&appid=${API_KEY}&units=metric&lang=es${cacheBuster}`;
        }

        const response = await fetch(url);
        if (response.status === 401) throw new Error("API_KEY_INVALIDA");
        if (!response.ok) throw new Error("Ubicación no encontrada");

        return procesarResponseOWM(await response.json());

    } catch (e) {
        if (e.message === "API_KEY_INVALIDA") return simularClima();
        throw e;
    }
}

function procesarResponseOWM(data) {
    const main = data.weather[0].main;
    const desc = data.weather[0].description.toLowerCase();
    
    console.log(`🌦️ API Response: ${main} (${desc})`);

    let condicionGeneral = "Despejado";
    
    // Lógica de mapeo más granular para evitar "diluvios" constantes
    // Si es llovizna muy ligera o hay nubes, lo tomamos como despejado/seco
    const lloviznaLeve = main === "Drizzle" || desc.includes("llovizna ligera") || desc.includes("llovizna débil");
    
    if (["Rain", "Thunderstorm"].includes(main) && !lloviznaLeve) {
        condicionGeneral = "Lluvia";
    } else {
        condicionGeneral = "Despejado";
    }

    return {
        temp: data.main.temp,
        desc: data.weather[0].description,
        condicion: condicionGeneral,
        icon: data.weather[0].icon,
        esSimulado: false
    };
}

function simularClima() {
    const esLluvia = Math.random() > 0.7; // Bajamos la probabilidad de lluvia al 30% en simulación
    const esNoche = new Date().getHours() < 6 || new Date().getHours() > 18;
    return {
        temp: parseFloat((Math.random() * (32 - 12) + 12).toFixed(1)),
        desc: esLluvia ? "lluvia ligera" : "cielo despejado",
        condicion: esLluvia ? "Lluvia" : "Despejado",
        icon: esNoche ? (esLluvia ? "10n" : "01n") : (esLluvia ? "10d" : "01d"),
        esSimulado: true
    };
}

function calcularFaseLunar(date) {
    const knownNewMoon = new Date('2024-01-11');
    const diffTime = Math.abs(date - knownNewMoon);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const lunarCycle = 29.53;
    let currentCycleDay = diffDays % lunarCycle;
    
    // Umbrales de fases en días dentro del ciclo de 29.53
    const UMBRAL_NUEVA = 1.8;
    const UMBRAL_CRECIENTE = 9.2;
    const UMBRAL_LLENA = 16.6;
    const UMBRAL_MENGUANTE = 24.0;
    
    let faseActual = "Luna Nueva";
    let proximaFase = "";
    let diasRestantes = 0;

    if (currentCycleDay < UMBRAL_NUEVA) {
        faseActual = "Luna Nueva";
        proximaFase = "Luna Creciente";
        diasRestantes = Math.ceil(UMBRAL_NUEVA - currentCycleDay);
    } else if (currentCycleDay < UMBRAL_CRECIENTE) {
        faseActual = "Luna Creciente";
        proximaFase = "Luna Llena";
        diasRestantes = Math.ceil(UMBRAL_CRECIENTE - currentCycleDay);
    } else if (currentCycleDay < UMBRAL_LLENA) {
        faseActual = "Luna Llena";
        proximaFase = "Luna Menguante";
        diasRestantes = Math.ceil(UMBRAL_LLENA - currentCycleDay);
    } else if (currentCycleDay < UMBRAL_MENGUANTE) {
        faseActual = "Luna Menguante";
        proximaFase = "Luna Nueva";
        diasRestantes = Math.ceil(UMBRAL_MENGUANTE - currentCycleDay);
    } else {
        faseActual = "Luna Nueva";
        proximaFase = "Luna Creciente";
        diasRestantes = Math.ceil(lunarCycle - currentCycleDay + UMBRAL_NUEVA);
    }

    return {
        faseActual: faseActual,
        proximaFase: proximaFase,
        diasRestantes: diasRestantes === 0 ? 1 : diasRestantes // Evitar decir "Faltan 0 días"
    };
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

// Referencia a los drops para poder limpiarlos
let raindrops = [];

function actualizarFondoDinamico(clima) {
    console.log('🌦️ actualizarFondoDinamico llamada con:', clima);

    const overlay = document.getElementById('climate-overlay');
    const rainBox = document.getElementById('rain-container');
    const badge = document.getElementById('climate-badge');
    const mapDiv = document.getElementById('map-background');

    if (!overlay || !rainBox || !badge || !mapDiv) {
        console.error('❌ Faltan elementos del DOM para el fondo dinámico:', { overlay, rainBox, badge, mapDiv });
        return;
    }

    // Limpiar estado anterior exhaustivamente
    overlay.className = '';
    badge.className = '';
    rainBox.classList.remove('active');
    // Eliminar gotas anteriores del DOM
    while (rainBox.firstChild) {
        rainBox.removeChild(rainBox.firstChild);
    }
    raindrops = [];

    // Determinar si es de noche usando el código de icono de OWM ('01n', '10n', etc.)
    const esNoche = clima.icon && clima.icon.endsWith('n');

    let claseOverlay, filtroMapa, badgeTexto, esLluvia = false;

    switch (clima.condicion) {
        case 'Lluvia':
            if (clima.desc && (clima.desc.includes('tormenta') || clima.desc.includes('thunder'))) {
                claseOverlay = 'storm';
                filtroMapa = 'brightness(0.45) saturate(0.5) hue-rotate(210deg)';
                badgeTexto = '⛈️ Tormenta';
            } else {
                claseOverlay = 'rain';
                filtroMapa = 'brightness(0.55) saturate(0.6) hue-rotate(190deg)';
                badgeTexto = '🌧️ Lluvia';
            }
            esLluvia = true;
            break;

        case 'Despejado':
            // Las reglas del JSON agrupan todo en Despejado o Lluvia,
            // pero visualmente queremos diferenciar si está nublado.
            const esNublado = clima.desc && (clima.desc.includes('nuboso') || clima.desc.includes('nubes') || clima.desc.includes('nublado'));
            const iconoNublado = clima.icon && (clima.icon.startsWith('02') || clima.icon.startsWith('03') || clima.icon.startsWith('04'));

            if (esNublado || iconoNublado) {
                claseOverlay = 'clouds';
                filtroMapa = esNoche
                    ? 'brightness(0.45) saturate(0.5)'
                    : 'brightness(0.75) saturate(0.65)';
                badgeTexto = esNoche ? '🌑 Noche nublada' : '☁️ Nublado';
            } else {
                if (esNoche) {
                    claseOverlay = 'clear-night';
                    filtroMapa = 'brightness(0.45) saturate(0.4)';
                    badgeTexto = '🌙 Noche despejada';
                } else {
                    claseOverlay = 'clear-day';
                    filtroMapa = 'brightness(1.15) saturate(1.25) sepia(0.1)';
                    badgeTexto = '☀️ Día despejado';
                }
            }
            break;

        default:
            claseOverlay = 'clouds';
            filtroMapa = esNoche
                ? 'brightness(0.45) saturate(0.5)'
                : 'brightness(0.75) saturate(0.65)';
            badgeTexto = esNoche ? '🌑 Noche nublada' : '☁️ Nublado';
    }

    // 1. Filtro al mapa
    mapDiv.style.filter = filtroMapa;
    console.log('🗺️ Filtro mapa aplicado:', filtroMapa);

    // 2. Overlay de color
    overlay.classList.add(claseOverlay);
    console.log('🎨 Clase overlay aplicada:', claseOverlay);

    // 3. Badge
    badge.textContent = badgeTexto;
    badge.classList.add(claseOverlay, 'visible');
    console.log('🏷️ Badge:', badgeTexto);

    // 4. Lluvia
    if (esLluvia) {
        const cantidad = claseOverlay === 'storm' ? 120 : 70;
        generarLluvia(rainBox, cantidad);
        console.log('🌧️ Lluvia generada:', cantidad, 'gotas');
    }
}

function generarLluvia(contenedor, cantidad) {
    contenedor.classList.add('active');
    for (let i = 0; i < cantidad; i++) {
        const drop = document.createElement('div');
        drop.classList.add('raindrop');

        const leftPct = Math.random() * 100;
        const height = Math.random() * 70 + 40;
        const duration = Math.random() * 0.8 + 0.4;
        const delay = Math.random() * 2;
        const opacity = Math.random() * 0.4 + 0.5; // más opaco: 0.5-0.9

        drop.style.cssText = `
            left: ${leftPct}%;
            height: ${height}px;
            animation-duration: ${duration}s;
            animation-delay: -${delay}s;
            opacity: ${opacity};
        `;

        contenedor.appendChild(drop);
        raindrops.push(drop);
    }
}

