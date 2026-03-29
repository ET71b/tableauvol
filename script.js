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
    })
    .catch(error => console.error("Erreur lors du chargement des vols:", error));

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
        if (!select) continue; // Sécurité si un ID manque
        
        // Extraire les valeurs uniques et les trier par ordre alphabétique
        const uniqueValues = [...new Set(allFlights.map(f => f[key]))].sort();
        uniqueValues.forEach(val => {
            select.innerHTML += `<option value="${val}">${val}</option>`;
        });
        
        // Relancer l'affichage quand on change un filtre
        select.addEventListener('change', renderTable);
    }
    
    // Ajout des écouteurs pour les filtres statiques
    document.getElementById('filter-appareil').addEventListener('change', renderTable);
    document.getElementById('filter-temps-vol').addEventListener('change', renderTable);
    document.getElementById('filter-temps-restant').addEventListener('change', renderTable);
}

// 3. Calculs des temps et affichage du tableau
function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    const nowZulu = moment.utc();

    // Récupération de l'état actuel de tous les filtres
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
        const depTimeSplit = vol.heure_dep_zulu.split(':');
        let depMomentZ = moment.utc().hours(depTimeSplit[0]).minutes(depTimeSplit[1]).seconds(0);
        
        // Ajustement jour suivant : si l'heure calculée est passée de plus de 12h, 
        // c'est que le vol part demain (ex: il est 23h Zulu, le vol est à 01h Zulu)
        if (nowZulu.diff(depMomentZ, 'hours') > 12) {
            depMomentZ.add(1, 'days');
        } else if (depMomentZ.diff(nowZulu, 'hours') > 12) {
             // Cas inverse : il est 01h, le vol était à 23h hier
            depMomentZ.subtract(1, 'days');
        }

        const volTimeSplit = vol.temps_vol.split(':');
        const tempsVolMinutes = parseInt(volTimeSplit[0]) * 60 + parseInt(volTimeSplit[1]);
        
        // Heure d'arrivée ZULU
        const arrMomentZ = depMomentZ.clone().add(tempsVolMinutes, 'minutes');
        
        // Temps restant en minutes (négatif = déjà parti)
        const minutesRestantes = depMomentZ.diff(nowZulu, 'minutes');
        
        // Heure locale de départ calculée automatiquement avec moment-timezone
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

        // Filtre Temps de vol (conversion du temps de vol en minutes)
        if (fTempsVol === '<2h' && tempsVolMinutes >= 120) return;
        if (fTempsVol === '2h-4h' && (tempsVolMinutes < 120 || tempsVolMinutes > 240)) return;
        if (fTempsVol === '4h-6h' && (tempsVolMinutes < 240 || tempsVolMinutes > 360)) return;
        if (fTempsVol === '6h-8h' && (tempsVolMinutes < 360 || tempsVolMinutes > 480)) return;
        if (f