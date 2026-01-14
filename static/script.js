var map = L.map('map').setView([45.815, 15.981], 7); 

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

var myChart = null; 
var sveLokacije = []; 

const postavkeKategorija = {
    'Grad':        '#FF9F40', 
    'Priroda':     '#4BC0C0', 
    'Park':        '#1D8348', 
    'Muzej':       '#FF6384', 
    'Restoran':    '#C0392B', 
    'Znamenitost': '#F4D03F', 
    'Ostalo':      '#9966FF'  
};

const standardneKategorije = ['Grad', 'Priroda', 'Park', 'Muzej', 'Restoran', 'Znamenitost'];

function createColorIcon(color) {
    const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
            <path fill="${color}" stroke="#FFFFFF" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5" fill="#FFFFFF"/>
        </svg>`;
    
    return L.divIcon({
        className: 'custom-pin', 
        html: svgString,
        iconSize: [36, 36],     
        iconAnchor: [18, 36],  
        popupAnchor: [0, -30]    
    });
}

function crtajMarkere(listaPodataka) {
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) { map.removeLayer(layer); }
    });

    listaPodataka.forEach(loc => {
        let boja = postavkeKategorija[loc.kategorija];
        if (!boja) { boja = postavkeKategorija['Ostalo']; }

        let icon = createColorIcon(boja);

        L.marker([loc.geo.coordinates[1], loc.geo.coordinates[0]], {icon: icon})
            .addTo(map)
            .bindPopup(`<b>${loc.naziv}</b><br><span style="color:${boja}; font-weight:bold;">●</span> <i>${loc.kategorija}</i><br>${loc.opis}`);
    });
}

function primijeniFilter(kategorija) {
    let filtrirano = [];

    if (kategorija === 'Ostalo') {
        filtrirano = sveLokacije.filter(loc => !standardneKategorije.includes(loc.kategorija));
    } else {
        filtrirano = sveLokacije.filter(loc => loc.kategorija === kategorija);
    }

    crtajMarkere(filtrirano);

    document.getElementById('filter-info').style.display = 'flex'; 
    document.getElementById('naziv-filtera').innerText = kategorija;
}

function ponistiFilter() {
    crtajMarkere(sveLokacije);
    document.getElementById('filter-info').style.display = 'none';
}

function osvjeziMapu() {
    fetch('/api/lokacije')
        .then(res => res.json())
        .then(data => {
            sveLokacije = data; 
            crtajMarkere(sveLokacije); 
        });

    fetch('/api/statistika')
        .then(res => res.json())
        .then(data => {
            document.getElementById('broj-posjeta').innerText = data.ukupno;
            document.getElementById('km-text').innerText = data.km;

            var ctx = document.getElementById('mojGraf').getContext('2d');
            var labels = Object.keys(data.detalji);
            var values = Object.values(data.detalji);

            var bojeGrafa = labels.map(kategorija => {
                return postavkeKategorija[kategorija] || postavkeKategorija['Ostalo'];
            });

            if (myChart) { myChart.destroy(); } 

            myChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: bojeGrafa,
                        borderWidth: 1
                    }]
                },
                options: { 
                    plugins: { legend: { position: 'bottom' } },
                    onClick: (evt, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const odabranaKategorija = labels[index];
                            primijeniFilter(odabranaKategorija);
                        }
                    }
                }
            });
        });
}

function provjeriOstalo() {
    var select = document.getElementById('inp-kategorija');
    var customInput = document.getElementById('custom-kat-container');
    
    if (select.value === 'Ostalo') {
        customInput.style.display = 'block';
        document.getElementById('inp-custom-kat').focus();
    } else {
        customInput.style.display = 'none';
    }
}

map.on('click', function(e) {
    document.getElementById('form-container').style.display = 'block';
    
    document.getElementById('inp-lat').value = e.latlng.lat;
    document.getElementById('inp-lng').value = e.latlng.lng;
    
    document.getElementById('inp-naziv').focus();
    document.getElementById('inp-kategorija').value = "Grad";
    provjeriOstalo(); 
});

function spremilokaciju() {
    var odabranaKategorija = document.getElementById('inp-kategorija').value;
    
    if (odabranaKategorija === 'Ostalo') {
        var rucniUnos = document.getElementById('inp-custom-kat').value;
        odabranaKategorija = rucniUnos.trim() !== "" ? rucniUnos : "Ostalo";
    }

    var podaci = {
        naziv: document.getElementById('inp-naziv').value,
        kategorija: odabranaKategorija,
        opis: document.getElementById('inp-opis').value,
        lat: document.getElementById('inp-lat').value,
        lng: document.getElementById('inp-lng').value
    };

    fetch('/api/dodaj', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(podaci)
    }).then(res => res.json()).then(response => {
        if (response.status === 'uspjeh') {
            odustani(); 
            osvjeziMapu(); 
        } else {
            alert('Greška pri spremanju!');
        }
    });
}

function odustani() {
    document.getElementById('form-container').style.display = 'none';
    document.getElementById('inp-naziv').value = '';
    document.getElementById('inp-opis').value = '';
    document.getElementById('inp-custom-kat').value = ''; 
}

osvjeziMapu();