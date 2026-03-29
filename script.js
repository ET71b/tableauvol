let allFlights = [];
const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

// 1. Chargement des données au démarrage
fetch('vols.json')
    .then(response => response.json())
    .then(data => {
        const todayIso = moment().isoWeekday(); // 1=Lundi, 7=Dimanche
        // On ne garde que les vols qui opèrent aujourd'hui
        allFlights = data.filter(vol => vol.jours_operation.includes(todayIso));
        populateFilters();
        renderTable();
        // Mise à jour de l'horloge toutes les 60 secondes
        setInterval(renderTable, 60000);
    });

// 2. Remplissage initial des filtres (Extraction des valeurs uniques)
function populateFilters() {
    const filters = {
        'filter-continent-dep': 'continent_dep',
        'filter-pays-dep': 'pays_dep',
        'filter-apt-dep': 'nom_dep',
        'filter-continent-arr': 'continent_arr',
        'filter-pays-arr': 'pays_arr',
        'filter-apt-arr': 'nom_arr',
        'filter-compagnie': 'compagnie'
    };

    for (const [id, key] of Object.entries(filters)) {
        const select = document.getElementById(id);
        const uniqueValues = [...new Set(allFlights.map(f => f[key]))].sort();
        uniqueValues.forEach(val => {
            select.innerHTML += `<option value="${val}">${val}</option>`;
        });
        // Ajouter un écouteur d'événement pour relancer l'affichage quand on filtre
        select.addEventListener('change', renderTable);
    }
    document.getElementById('filter-appareil').addEventListener('change', renderTable);
    document.getElementById('filter-temps-vol').addEventListener('change', renderTable);
    document.getElementById('filter-temps-restant').addEventListener('change', renderTable);
}

// 3. Calculs des temps et affichage du tableau
function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    const nowZulu = moment.utc();

    // Récupération des valeurs des filtres
    const fContDep = document.getElementById('filter-continent-dep').value;
    const fPaysDep = document.getElementById('filter-pays-dep').value;
    const fAptDep = document.getElementById('filter-apt-dep').value;
    const fContArr = document.getElementById('filter-continent-arr').value;
    const fPaysArr = document.getElementById('filter-pays-arr').value;
    const fAptArr = document.getElementById('filter-apt-arr').value;
    const fCompagnie = document.getElementById('filter-compagnie').value;
    const fAppareil = document.getElementById('filter-appareil').value;
    const fTempsVol = document.getElementById('filter-temps-vol').value;
    const fTempsRest = document.getElementById('filter-temps-restant').value;

    allFlights.forEach(vol => {
        // --- CALCULS DES HEURES ---
        // On part du principe que le vol part aujourd'hui (en ZULU)
        const depTimeSplit = vol.heure_dep_zulu.split(':');
        let depMomentZ = moment.utc().hours(depTimeSplit[0]).minutes(depTimeSplit[1]).seconds(0);
        
        // Si l'heure est déjà passée de plus de 12h, c'est probablement le vol de demain
        if (nowZulu.diff(depMomentZ, 'hours') > 12) depMomentZ.add(1, 'days');

        const volTimeSplit = vol.temps_vol.split(':');
        const tempsVolMinutes = parseInt(volTimeSplit[0]) * 60 + parseInt(volTimeSplit[1]);
        
        // Heure d'arrivée ZULU
        const arrMomentZ = depMomentZ.clone().add(tempsVolMinutes, 'minutes');
        
        // Temps restant en minutes
        const minutesRestantes = depMomentZ.diff(nowZulu, 'minutes');
        
        // Heure locale de départ
        const heureLocaleDep = nowZulu.clone().tz(vol.fuseau_dep).format('HH:mm');

        // --- APPLICATION DES FILTRES ---
        if (fContDep && vol.continent_dep !== fContDep) return;
        if (fPaysDep && vol.pays_dep !== fPaysDep) return;
        if (fAptDep && vol.nom_dep !== fAptDep) return;
        if (fContArr && vol.continent_arr !== fContArr) return;
        if (fPaysArr && vol.pays_arr !== fPaysArr) return;
        if (fAptArr && vol.nom_arr !== fAptArr) return;
        if (fCompagnie && vol.compagnie !== fCompagnie) return;
        if (fAppareil && vol.appareil !== fAppareil) return;

        // Filtre Temps de vol
        if (fTempsVol === '<2h' && tempsVolMinutes >= 120) return;
        if (fTempsVol === '2h-4h' && (tempsVolMinutes < 120 || tempsVolMinutes > 240)) return;
        if (fTempsVol === '4h-6h' && (tempsVolMinutes < 240 || tempsVolMinutes > 360)) return;
        if (fTempsVol === '6h-8h' && (tempsVolMinutes < 360 || tempsVolMinutes > 480)) return;
        if (fTempsVol === '>8h' && tempsVolMinutes <= 480) return;

        // Filtre Temps Restant
        if (fTempsRest === '30m-1h' && (minutesRestantes < 30 || minutesRestantes > 60)) return;
        if (fTempsRest === '1h-2h' && (minutesRestantes <= 60 || minutesRestantes > 120)) return;
        if (fTempsRest === '>2h' && minutesRestantes <= 120) return;

        // Formatage de l'affichage du temps restant
        let tempsRestantDisplay = "";
        let timeClass = "positive-time";
        if (minutesRestantes < 0) {
            tempsRestantDisplay = "Expiré (" + Math.abs(Math.floor(minutesRestantes/60)) + "h " + Math.abs(minutesRestantes%60) + "m)";
            timeClass = "negative-time";
        } else {
            tempsRestantDisplay = Math.floor(minutesRestantes/60) + "h " + (minutesRestantes%60) + "m";
        }

        // Formatage des jours en texte
        const joursTexte = vol.jours_operation.map(j => dayNames[j === 7 ? 0 : j]).join(', ');

        // --- INJECTION HTML ---
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${joursTexte}</td>
            <td>${vol.continent_dep}</td>
            <td>${vol.pays_dep}</td>
            <td>${vol.nom_dep}</td>
            <td>${vol.oaci_dep}</td>
            <td>${vol.compagnie}</td>
            <td>${vol.vol}</td>
            <td>${vol.appareil}</td>
            <td>${vol.heure_dep_zulu}</td>
            <td>${vol.temps_vol}</td>
            <td>${arrMomentZ.format('HH:mm')}</td>
            <td>${vol.nom_arr}</td>
            <td>${vol.oaci_arr}</td>
            <td>${vol.pays_arr}</td>
            <td>${vol.continent_arr}</td>
            <td class="${timeClass}">${tempsRestantDisplay}</td>
            <td>${heureLocaleDep}</td>
        `;
        tbody.appendChild(tr);
    });
}