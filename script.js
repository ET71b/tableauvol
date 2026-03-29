let allFlights = [];
const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

// 1. Chargement des données au démarrage
fetch('vols.json')
    .then(response => {
        if (!response.ok) throw new Error("Erreur réseau lors du chargement de vols.json");
        return response.json();
    })
    .then(data => {
        const todayIso = moment().isoWeekday(); // 1=Lundi, 7=Dimanche
        console.log("Jour de la semaine actuel (1-7):", todayIso);
        console.log("Nombre total de vols dans le fichier:", data.length);

        // On ne garde que les vols qui opèrent aujourd'hui
        allFlights = data.filter(vol => vol.jours_operation.includes(todayIso));
        console.log("Vols retenus pour aujourd'hui:", allFlights.length);

        const statusMessage = document.getElementById('status-message');
        const table = document.getElementById('flights-table');

        if (allFlights.length === 0) {
            statusMessage.innerHTML = `Aucun vol n'est programmé pour aujourd'hui (Jour ${todayIso}).<br>Vérifie ton fichier vols.json !`;
            statusMessage.style.color = "var(--danger)";
        } else {
            statusMessage.style.display = 'none'; // Cacher le message
            table.style.display = 'table';        // Afficher le tableau
            populateFilters();
            renderTable();
            // Mise à jour de l'horloge toutes les 60 secondes
            setInterval(renderTable, 60000);
        }
    })
    .catch(error => {
        console.error("Erreur détaillée:", error);
        document.getElementById('status-message').innerText = "Erreur: Impossible de lire le fichier vols.json. Vérifie la console (F12).";
        document.getElementById('status-message').style.color = "var(--danger)";
    });

// 2. Remplissage initial des filtres dynamiques
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
        if (!select) continue; 
        
        const uniqueValues = [...new Set(allFlights.map(f => f[key]))].sort();
        uniqueValues.forEach(val => {
            select.innerHTML += `<option value="${val}">${val}</option>`;
        });
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
        // --- CALCULS ---
        const depTimeSplit = vol.heure_dep_zulu.split(':');
        let depMomentZ = moment.utc().hours(depTimeSplit[0]).minutes(depTimeSplit[1]).seconds(0);
        
        if (nowZulu.diff(depMomentZ, 'hours') > 12) {
            depMomentZ.add(1, 'days');
        } else if (depMomentZ.diff(nowZulu, 'hours') > 12) {
            depMomentZ.subtract(1, 'days');
        }

        const volTimeSplit = vol.temps_vol.split(':');
        const tempsVolMinutes = parseInt(volTimeSplit[0]) * 60 + parseInt(volTimeSplit[1]);
        const arrMomentZ = depMomentZ.clone().add(tempsVolMinutes, 'minutes');
        const minutesRestantes = depMomentZ.diff(nowZulu, 'minutes');
        const heureLocaleDep = nowZulu.clone().tz(vol.fuseau_dep).format('HH:mm');

        // --- FILTRES ---
        if (fContDep && vol.continent_dep !== fContDep) return;
        if (fPaysDep && vol.pays_dep !== fPaysDep) return;
        if (fAptDep && vol.nom_dep !== fAptDep) return;
        if (fContArr && vol.continent_arr !== fContArr) return;
        if (fPaysArr && vol.pays_arr !== fPaysArr) return;
        if (fAptArr && vol.nom_arr !== fAptArr) return;
        if (fCompagnie && vol.compagnie !== fCompagnie) return;
        if (fAppareil && vol.appareil !== fAppareil) return;

        if (fTempsVol === '<2h' && tempsVolMinutes >= 120) return;
        if (fTempsVol === '2h-4h' && (tempsVolMinutes < 120 || tempsVolMinutes > 240)) return;
        if (fTempsVol === '4h-6h' && (tempsVolMinutes < 240 || tempsVolMinutes > 360)) return;
        if (fTempsVol === '6h-8h' && (tempsVolMinutes < 360 || tempsVolMinutes > 480)) return;
        if (fTempsVol === '>8h' && tempsVolMinutes <= 480) return;

        if (fTempsRest === '30m-1h' && (minutesRestantes < 30 || minutesRestantes > 60)) return;
        if (fTempsRest === '1h-2h' && (minutesRestantes <= 60 || minutesRestantes > 120)) return;
        if (fTempsRest === '>2h' && minutesRestantes <= 120) return;

        // --- AFFICHAGE ---
        let tempsRestantDisplay = "";
        let timeClass = "positive-time";
        
        if (minutesRestantes < 0) {
            tempsRestantDisplay = "Expiré (-" + Math.abs(Math.floor(minutesRestantes/60)) + "h " + Math.abs(minutesRestantes%60) + "m)";
            timeClass = "negative-time";
        } else {
            tempsRestantDisplay = "Dans " + Math.floor(minutesRestantes/60) + "h " + (minutesRestantes%60) + "m";
        }

        const joursTexte = vol.jours_operation.map(j => dayNames[j === 7 ? 0 : j]).join(', ');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${joursTexte}</td>
            <td>${vol.continent_dep}</td>
            <td>${vol.pays_dep}</td>
            <td>${vol.nom_dep}</td>
            <td style="font-weight: bold;">${vol.oaci_dep}</td>
            <td class="compagnie-nom">${vol.compagnie}</td>
            <td>${vol.vol}</td>
            <td>${vol.appareil}</td>
            <td style="font-weight: bold; color: var(--accent-color);">${vol.heure_dep_zulu}</td>
            <td>${vol.temps_vol}</td>
            <td style="color: #8b949e;">${arrMomentZ.format('HH:mm')}</td>
            <td>${vol.nom_arr}</td>
            <td style="font-weight: bold;">${vol.oaci_arr}</td>
            <td>${vol.pays_arr}</td>
            <td>${vol.continent_arr}</td>
            <td class="${timeClass}">${tempsRestantDisplay}</td>
            <td style="color: #8b949e;">${heureLocaleDep}</td>
        `;
        tbody.appendChild(tr);
    });
}