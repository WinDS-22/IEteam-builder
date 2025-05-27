// Global variables
var playerToChange, playerToChangeId, customSprite;

//NEW ORIGINAL VARIABLES
let draftInProgress = false;
let draftStep = 0; // 0: formación, 1: coach, 2: jugadores de campo, 3: jugadores de banquillo
let draftSelectedFormation = null;
let draftSelectedCoach = null;
let draftSelectedPlayers = []; // Array de objetos de jugadores ya seleccionados en el draft
let draftFieldPlayerSlotsToFill = []; // e.g., [{slotId: 'player-1', position: 'GK'}, {slotId: 'player-2', position: 'DF'}, ...]
let draftCurrentFieldIndex = 0; // Para llevar la cuenta de qué jugador de campo estamos eligiendo
let draftBenchSlotsToFill = 5;
let draftCurrentBenchIndex = 0;


// NEW OWN FUNCTIONS
/**
 * Get a random element from an array
 * @param {array} arr The array to get a random element from
 * @return {any} A random element from the array
 */
function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get a certain number of random unique elements from an array
 * @param {array} arr The array to get random unique elements from
 * @param {number} count The number of unique elements to get
 * @return {array} An array containing the random unique elements
 */
function getRandomUniqueElements(arr, count) {
    if (count > arr.length) {
        console.warn(`Requested ${count} unique elements, but only ${arr.length} are available. Returning all available.`);
        return [...arr]; // Devuelve todos los disponibles si se piden más de los que hay
    }
    const shuffled = [...arr].sort(() => 0.5 - Math.random()); // Mezcla el array
    return shuffled.slice(0, count); // Toma los primeros 'count' elementos
}

/**
 * Get the current language selected by the user
 * @return {string} The current language, either 'English' or 'Japanese'
 */
function getCurrentLanguage() {
    if (document.getElementById('english-names-input').checked) {
        return 'English';
    } else {
        return 'Japanese';
    }
}

/**
 * Set a player in a specific slot
 * @param {string} slotId The ID of the slot where the player will be set (e.g., "player-1", "sub-1")
 * @param {object} playerObject The player object from the `players` array
 */
function setPlayerInSlot(slotId, playerObject, animate = false) { // Nuevo parámetro 'animate'
    const language = getCurrentLanguage();
    const playerName = playerObject[language + 'Name'];
    const playerSprite = playerObject.Sprite;
    const playerTeamSprite = playerObject.TeamSprite;

    let playerTypePrefix = "player";
    if (slotId.startsWith("sub")) {
        playerTypePrefix = "sub";
    }

    const slotContainer = document.getElementById(slotId + '-container');
    if (!slotContainer) {
        console.error("Slot container not found for:", slotId);
        return;
    }

    // Si se va a animar, añadir clase de inicio para el fade-in
    if (animate) {
        slotContainer.classList.add('fade-in-start');
        // Forzar un reflow para que la transición se aplique correctamente
        // A veces es necesario para que el navegador detecte el cambio de opacidad de 0 a 1
        void slotContainer.offsetWidth;
    } else {
        // Asegurarse de que no tenga la clase de opacidad 0 si no se anima
        slotContainer.classList.remove('fade-in-start');
        slotContainer.classList.remove('visible'); // También quitar visible por si acaso
    }


    let htmlInsert =
        `<div id="drag-box-${slotId}-container" class="drag-box-container">
            <div class="drag-box" id="drag-box-${slotId}" data-toggle="modal" data-target="#myModal" data-id="${slotId}" style="background-image: none">
                <img src="${playerSprite}" id="${slotId}-sprite" data-pg-name="${slotId}-sprite" class="${playerTypePrefix}-sprite"/>
            </div>
            <div class="icon">✎</div>
            <div class="${playerTypePrefix}-info-container" id="${slotId}-info-container" data-pg-name="${slotId}-info-container">`;

    if (playerTeamSprite) {
        htmlInsert +=
            `<div id="${slotId}-element-container" class="${playerTypePrefix}-element-container" style="background-image: none">
                <img id="${slotId}-element" data-pg-name="${slotId}-element" class="${playerTypePrefix}-element" src="${playerTeamSprite}"/>
            </div>`;
    }

    htmlInsert +=
        `<span id="${slotId}-name" data-pg-name="${slotId}-name" class="${playerTypePrefix}-name">${playerName.replace('<', '<').replace('>', '>')}</span>
            </div>
        </div>`;

    slotContainer.innerHTML = htmlInsert;

    const newDragBox = document.getElementById(`drag-box-${slotId}`);
    if (newDragBox) {
        newDragBox.addEventListener("click", () => {
            playerToChange = newDragBox;
            playerToChangeId = newDragBox.dataset.id;
        });
    }

    // Si se anima, después de un pequeño delay, añadir la clase 'visible' para activar el fade-in
    if (animate) {
        setTimeout(() => {
            slotContainer.classList.add('visible');
            // Opcionalmente, quitar fade-in-start después de que la animación podría haber comenzado
            // setTimeout(() => slotContainer.classList.remove('fade-in-start'), 500); // 500ms es la duración de la transición
        }, 50); // Un pequeño delay para asegurar que el DOM se actualizó con opacity: 0 antes de cambiar a 1
    } else {
        // Si no se anima, asegurarse de que sea visible inmediatamente
         slotContainer.classList.add('visible'); // O simplemente no hacer nada si por defecto es visible
    }
}

/**
 * Start a draft process
 * This function will:
 * 1. Reset the draft state.
 * 2. Show the draft modal.
 * 3. Allow the user to select a formation.
 * 4. Allow the user to select a coach.
 * 5. Allow the user to select players for the field and bench.
 * @returns {void}
 */
function startDraft() {
    if (draftInProgress) {
        alert("A draft is already in progress!");
        return;
    }
    draftInProgress = true;
    draftStep = 0;
    draftSelectedFormation = null;
    draftSelectedCoach = null;
    draftSelectedPlayers = [];
    draftFieldPlayerSlotsToFill = [];
    draftCurrentFieldIndex = 0;
    draftBenchSlotsToFill = 5; // o el número de suplentes que tengas
    draftCurrentBenchIndex = 0;

    // Opcional: Limpiar el equipo actual en la UI si es necesario
    clearTeam(); // O una versión más ligera que solo limpie jugadores y coach

    showDraftFormationSelection();
    $('#draftModal').modal('show'); // Asumiendo que usas Bootstrap modal
}

/**
 * Show the draft formation selection modal
 * This function will:
 * 1. Set the modal title.
 * 2. Get 5 random unique formations from the `formations` array.
 * 3. Render the draft options in the modal.
 * 4. Set the selected formation when a user clicks on one.
 * @return {void}
 */
function showDraftFormationSelection() {
    $('#draftModalTitle').text('Draft: Select Formation');
    const randomFormations = getRandomUniqueElements(formations, 5);

    renderDraftOptions(randomFormations, 'name', (selectedFormation) => {
        draftSelectedFormation = selectedFormation;
        // Actualizar UI principal
        const formationDropdown = document.getElementById('formation-dropdown');
        formationDropdown.value = selectedFormation.name;
        changeFormation(); // Esto debe asegurar que los slots player-1 a player-11 estén en el DOM

        draftStep = 1;
        showDraftCoachSelection();
    });
}

/**
 * Show the draft coach selection modal
 * This function will:
 * 1. Set the modal title.
 * 2. Get 5 random unique coaches from the `coaches` array.
 * 3. Render the draft options in the modal.
 * 4. Set the selected coach when a user clicks on one.
 * @return {void}
 */
function showDraftCoachSelection() {
    $('#draftModalTitle').text('Draft: Select Coach');
    const randomCoaches = getRandomUniqueElements(coaches, 5);
    const language = getCurrentLanguage();

    renderDraftOptions(randomCoaches, (coach) => coach[language + 'Name'], (selectedCoach) => {
        draftSelectedCoach = selectedCoach;
        // Actualizar UI principal
        const coachDropdown = document.getElementById('coach-dropdown');
        coachDropdown.value = selectedCoach[language + 'Name'];
        updateSprite('coach');

        draftStep = 2;
        // Preparar slots de campo
        draftFieldPlayerSlotsToFill = draftSelectedFormation.positions.map((pos, index) => {
            return { slotId: `player-${index + 1}`, position: pos };
        });
        draftCurrentFieldIndex = 0;
        showDraftFieldPlayerSelection();
    });
}

/**
 * Show the draft field player selection modal
 * This function will:
 * 1. Set the modal title.
 * 2. Get 5 random unique players for the current field slot.
 * 3. Render the draft options in the modal.
 * 4. Set the selected player when a user clicks on one.
 * @return {void}
 */
function showDraftFieldPlayerSelection() {
    if (draftCurrentFieldIndex >= draftFieldPlayerSlotsToFill.length) {
        draftStep = 3;
        draftCurrentBenchIndex = 0;
        showDraftBenchPlayerSelection();
        return;
    }

    const currentSlotInfo = draftFieldPlayerSlotsToFill[draftCurrentFieldIndex];
    $('#draftModalTitle').text(`Draft: Select ${currentSlotInfo.position} for Player #${draftCurrentFieldIndex + 1}`);

    const availableFieldPlayers = players.filter(p =>
        p.Position === currentSlotInfo.position &&
        !draftSelectedPlayers.some(dsp => dsp.EnglishName === p.EnglishName) // Asegurar unicidad por nombre
    );

    if (availableFieldPlayers.length === 0) {
        alert(`No more ${currentSlotInfo.position} players available for this slot. Draft might be incomplete or consider a different strategy for this case.`);
        // Podrías terminar el draft aquí o permitir elegir de cualquier posición
        // Por ahora, se mostrará una lista vacía si no hay candidatos.
        // O se podría llamar a endDraft();
         $('#draftModalBody').html('<p>No players available for this position. Draft cannot continue as designed.</p>');
        return;
    }


    const candidatePlayers = getRandomUniqueElements(availableFieldPlayers, 5);
    const language = getCurrentLanguage();

    renderDraftOptions(candidatePlayers, (player) => player[language + 'Name'], (selectedPlayer) => {
        draftSelectedPlayers.push(selectedPlayer);
        setPlayerInSlot(currentSlotInfo.slotId, selectedPlayer); // Ya tienes esta función

        draftCurrentFieldIndex++;
        showDraftFieldPlayerSelection(); // Recursivo para el siguiente jugador de campo
    });
}

/**
 * Show the draft bench player selection modal
 * This function will:
 * 1. Set the modal title.
 * 2. Get 5 random unique players for the current bench slot.
 * 3. Render the draft options in the modal.
 * 4. Set the selected player when a user clicks on one.
 * @return {void}
 */
function showDraftBenchPlayerSelection() {
    if (draftCurrentBenchIndex >= draftBenchSlotsToFill) {
        endDraft();
        return;
    }

    $('#draftModalTitle').text(`Draft: Select Bench Player #${draftCurrentBenchIndex + 1}`);

    const availableBenchPlayers = players.filter(p =>
        !draftSelectedPlayers.some(dsp => dsp.EnglishName === p.EnglishName) // Unicidad por nombre
    );
    
    if (availableBenchPlayers.length === 0) {
        alert(`No more players available for the bench. Draft might be incomplete.`);
        $('#draftModalBody').html('<p>No players available for the bench. Draft cannot continue as designed.</p>');
        return;
    }

    const candidatePlayers = getRandomUniqueElements(availableBenchPlayers, 5);
    const language = getCurrentLanguage();

    renderDraftOptions(candidatePlayers, (player) => player[language + 'Name'], (selectedPlayer) => {
        draftSelectedPlayers.push(selectedPlayer);
        setPlayerInSlot(`sub-${draftCurrentBenchIndex + 1}`, selectedPlayer);

        draftCurrentBenchIndex++;
        showDraftBenchPlayerSelection(); // Recursivo para el siguiente jugador de banquillo
    });
}

/**
 * End the draft process
 * This function will:
 * 1. Set the draftInProgress flag to false.
 * 2. Hide the draft modal.
 * 3. Optionally, show a message or update the UI to reflect the end of the draft.
 * @returns {void}
 */
function endDraft() {
    draftInProgress = false;
    $('#draftModal').modal('hide');
    alert("Draft Complete!"); // O un mensaje más elegante
    // Aquí también podrías querer re-adjuntar todos los listeners si es necesario.
    // addPlayerBoxActions(); // Si los listeners de los slots se pierden.
                           // setPlayerInSlot ya debería manejarlos individualmente.
}

/**
 * Delay function to pause execution for a certain amount of time
 * @param {number} ms The number of milliseconds to delay
 * @return {Promise} A promise that resolves after the specified delay
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Set a random team with random formation, coach and players
 * This function will:
 * 1. Choose a random formation from the `formations` array.
 * 2. Choose a random coach from the `coaches` array.
 * 3. Fill the player slots with random players from the `players` array, ensuring that:
 *    - The players respect their required positions based on the chosen formation.
 *   - No player is repeated in the team.
 *  - The bench players can be any available players, not necessarily respecting their positions.
 * * @returns {void}
 */
async function handleRandomTeam() { // Marcada como async
    const animate = document.getElementById('Animations').checked;
    const animationDelay = animate ? 800 : 0; // Retraso en ms entre cada jugador si se anima

    // 1. Elegir una formación al azar
    const randomFormationObject = getRandomElement(formations);
    const formationDropdown = document.getElementById('formation-dropdown');
    formationDropdown.value = randomFormationObject.name;
    changeFormation(); // Esto actualiza la UI del campo

    // 2. Elegir un entrenador al azar
    const randomCoachObject = getRandomElement(coaches);
    const coachDropdown = document.getElementById('coach-dropdown');
    coachDropdown.value = randomCoachObject[getCurrentLanguage() + 'Name'];
    updateSprite('coach');

    // 3. Elegir jugadores
    let availablePlayers = [...players];
    let selectedPlayersForTeam = [];

    // Primero, ocultar todos los slots si vamos a animar
    if (animate) {
        for (let i = 1; i <= 11; i++) {
            const slotContainer = document.getElementById(`player-${i}-container`);
            if (slotContainer) slotContainer.classList.add('fade-in-start');
        }
        for (let i = 1; i <= 5; i++) { // Asumiendo 5 suplentes
            const subContainer = document.getElementById(`sub-${i}-container`);
            if (subContainer) subContainer.classList.add('fade-in-start');
        }
        // Forzar reflow para asegurar que la opacidad 0 se aplique antes de empezar
        await delay(10); // Pequeña pausa para que el DOM se actualice
    }


    // Rellenar los 11 jugadores del campo
    for (let i = 1; i <= 11; i++) {
        const slotId = `player-${i}`;
        const requiredPosition = randomFormationObject.positions[i - 1];

        let candidates = availablePlayers.filter(p =>
            p.Position === requiredPosition && !selectedPlayersForTeam.some(sp => sp.EnglishName === p.EnglishName)
        );

        if (candidates.length === 0) {
            console.warn(`No more ${requiredPosition} available for slot ${slotId}. Picking any available player.`);
            candidates = availablePlayers.filter(p => !selectedPlayersForTeam.some(sp => sp.EnglishName === p.EnglishName));
            if (candidates.length === 0) {
                console.error("Ran out of unique players for the field!");
                break;
            }
        }
        
        const selectedPlayer = getRandomElement(candidates);
        setPlayerInSlot(slotId, selectedPlayer, animate); // Pasar 'animate'
        selectedPlayersForTeam.push(selectedPlayer);
        availablePlayers = availablePlayers.filter(p => p.EnglishName !== selectedPlayer.EnglishName);
        
        if (animate) {
            await delay(animationDelay); // Esperar antes de mostrar el siguiente
        }
    }

    // Rellenar los 5 jugadores del banquillo
    for (let i = 1; i <= 5; i++) { // Asume 5 suplentes
        const slotId = `sub-${i}`;
        
        let benchCandidates = availablePlayers.filter(p => !selectedPlayersForTeam.some(sp => sp.EnglishName === p.EnglishName));
        if (benchCandidates.length === 0) {
            console.error("Ran out of unique players for the bench!");
            break;
        }

        const selectedBenchPlayer = getRandomElement(benchCandidates);
        setPlayerInSlot(slotId, selectedBenchPlayer, animate); // Pasar 'animate'
        selectedPlayersForTeam.push(selectedBenchPlayer);
        availablePlayers = availablePlayers.filter(p => p.EnglishName !== selectedBenchPlayer.EnglishName);

        if (animate) {
            await delay(animationDelay); // Esperar antes de mostrar el siguiente
        }
    }
}

/**
 * Handle ultra random team generation
 * This function will:
 * 1. Choose a random formation from the `formations` array.
 * 2. Choose a random coach from the `coaches` array.
 * 3. Fill the player slots with random players from the `players` array, ensuring that:
 *    - The players can be any position, not respecting the formation.
 *   - No player is repeated in the team.
 *  - The bench players can be any available players, not necessarily respecting their positions.
 * * @returns {void}
 */
async function handleUltraRandomTeam() { // Marcada como async
    const animate = document.getElementById('Animations').checked;
    const animationDelay = animate ? 800 : 0; // Retraso en ms

    // 1. Formación
    const randomFormationObject = getRandomElement(formations);
    const formationDropdown = document.getElementById('formation-dropdown');
    formationDropdown.value = randomFormationObject.name;
    changeFormation();

    // 2. Coach
    const randomCoachObject = getRandomElement(coaches);
    const coachDropdown = document.getElementById('coach-dropdown');
    coachDropdown.value = randomCoachObject[getCurrentLanguage() + 'Name'];
    updateSprite('coach');

    // 3. Jugadores
    let availablePlayers = [...players];
    let selectedPlayersForTeam = [];
    
    // Primero, ocultar todos los slots si vamos a animar
    if (animate) {
        for (let i = 1; i <= 11; i++) {
            const slotContainer = document.getElementById(`player-${i}-container`);
            if (slotContainer) slotContainer.classList.add('fade-in-start');
        }
        for (let i = 1; i <= 5; i++) { // Asumiendo 5 suplentes
            const subContainer = document.getElementById(`sub-${i}-container`);
            if (subContainer) subContainer.classList.add('fade-in-start');
        }
        await delay(10);
    }


    // Campo
    for (let i = 1; i <= 11; i++) {
        const slotId = `player-${i}`;
        let candidates = availablePlayers.filter(p => !selectedPlayersForTeam.some(sp => sp.EnglishName === p.EnglishName));
        if (candidates.length === 0) {
            console.error("Ran out of unique players for the field (Ultra Random)!");
            break; 
        }
        const selectedPlayer = getRandomElement(candidates);
        setPlayerInSlot(slotId, selectedPlayer, animate);
        selectedPlayersForTeam.push(selectedPlayer);
        availablePlayers = availablePlayers.filter(p => p.EnglishName !== selectedPlayer.EnglishName);
        if (animate) {
            await delay(animationDelay);
        }
    }

    // Banquillo
    for (let i = 1; i <= 5; i++) { // Asume 5 suplentes
        const slotId = `sub-${i}`;
        let benchCandidates = availablePlayers.filter(p => !selectedPlayersForTeam.some(sp => sp.EnglishName === p.EnglishName));
        if (benchCandidates.length === 0) {
            console.error("Ran out of unique players for the bench (Ultra Random)!");
            break;
        }
        const selectedBenchPlayer = getRandomElement(benchCandidates);
        setPlayerInSlot(slotId, selectedBenchPlayer, animate);
        selectedPlayersForTeam.push(selectedBenchPlayer);
        availablePlayers = availablePlayers.filter(p => p.EnglishName !== selectedBenchPlayer.EnglishName);
        if (animate) {
            await delay(animationDelay);
        }
    }
}

/**
 * Render draft options in the modal
 * @param {array} items Array of items to render (players, coaches, formations)
 * @param {function|string} displayPropertyKeyGenerator Function or string to get the display property of each item
 * @param {function} callbackOnClick Callback function to execute when an item is clicked
 */
function renderDraftOptions(items, displayPropertyKeyGenerator, callbackOnClick) {
    const modalBody = $('#draftModalBody');
    modalBody.empty();
    const language = getCurrentLanguage();

    items.forEach(item => {
        let itemHtml;

        // Detectar si el item es un jugador
        if (item.Sprite && item.Position && item.Element && item.Gender) {
            // ... (código para renderizar jugadores, como lo hicimos antes - SIN CAMBIOS AQUÍ) ...
            const playerName = item[language + 'Name'];
            const playerPosition = item.Position;
            const playerElement = item.Element;
            const playerGender = item.Gender;
            const playerSprite = item.Sprite;

            itemHtml = $(`
                <div class="modal-player-box draft-option-item">
                    <p class="modal-player-name">${playerName.replace('<', '<').replace('>', '>')}</p>
                    <div class="modal-player-box-container">
                        <div class="modal-player-props-container">
                            <div class='modal-player-position' style='background-image: url("./images/positions/${playerPosition}.png");'></div>
                            <div class='modal-player-element' style='background-image: url("./images/elements/${playerElement}.png");'></div>
                            <div class='modal-player-gender' style='background-image: url("./images/genders/${playerGender}.png");'></div>
                        </div>
                        <div class="modal-player-sprite-container">
                            <img src="${playerSprite}" alt="${playerName}.png" class="modal-player-sprite"/>
                        </div>
                    </div>
                </div>
            `);

        } else if (item.name && item.image && item.html) { // Detectar si el item es una FORMACIÓN (tiene nombre, imagen y html)
            const formationName = item.name;
            const formationImage = item.image; // La nueva propiedad que has añadido

            itemHtml = $(`
                <div class="draft-formation-option draft-option-item">
                    <img src="${formationImage}" alt="${formationName}" class="draft-formation-preview-image"/>
                    <p class="draft-formation-name">${formationName}</p>
                </div>
            `);

        } else { // Para coaches o cualquier otro tipo de item ( fallback al botón simple)
            let displayValue;
            if (typeof displayPropertyKeyGenerator === 'function') {
                // Para coaches, displayPropertyKeyGenerator sería (item, lang) => item[lang + 'Name']
                displayValue = displayPropertyKeyGenerator(item, language);
            } else {
                 // Esto podría ser un coach si displayPropertyKeyGenerator no es una función
                 // o un tipo de item no reconocido. Por seguridad, asumimos que es el nombre.
                displayValue = item.EnglishName || item.JapaneseName || item.name || "Unknown Item";
            }
            // Botón simple para coaches u otros
            itemHtml = $(`<button class="draft-option-button draft-option-item"></button>`).text(displayValue);
             // Si los coaches también tienen sprite, podrías añadirlo aquí similar a los jugadores/formaciones
            if (item.Sprite && (item.EnglishName || item.JapaneseName)) { // Asumiendo que esto es un coach
                itemHtml.html(`
                    <img src="${item.Sprite}" alt="${displayValue}" style="width: 50px; height: auto; vertical-align: middle; margin-right: 10px;">
                    ${displayValue}
                `);
            }
        }

        // Adjuntar el evento de clic al elemento raíz que acabamos de crear
        itemHtml.on('click', function() {
            callbackOnClick(item);
        });
        modalBody.append(itemHtml);
    });
}

// ORIGINAL FUNCTIONS

/**
 * Render players to choose from inside modal
 * @param {array} players Players to be rendered inside of modal
 * @param {string} language Chosen language of player names
 */
function renderPlayers(players, language) {
    var modal = document.getElementById('modal');
    // HTML to insert inside of modal
    var htmlInsert = '';

    // List of games
    var games = [
        {
            'IE1': 'Inazuma Eleven',
            'IE2': 'Inazuma Eleven 2',
            'IE3': 'Inazuma Eleven 3',
            'GO1': 'Inazuma Eleven GO',
            'GO2': 'Inazuma Eleven GO Chrono Stones',
            'GO3': 'Inazuma Eleven GO Galaxy',
            'Ares': 'Inazuma Eleven Ares',
            'Orion': 'Inazuma Eleven Orion',
            'VR': 'Inazuma Eleven Victory Road',
            'Scouts': 'Scout Characters',
        }
    ];

    htmlInsert += '<h4 class="custom">Select from the player list!</h4><div class="btn-group" role="group" aria-label="game-buttons">';
    for (var i = 0; i < Object.keys(games[0]).length; i++) {
        htmlInsert += '<button type="button" onClick=toggle("game-' + i + '"); class="game-title" id="game-' + i + '-button"><img src="./images/logos/' + i + '.png" alt="' + Object.values(games[0])[i] + '"/></button>';
    }

    // Cycle through all games and add a panel for each game
    for (var x = 0; x < Object.keys(games[0]).length; x++) {
        htmlInsert += '<div class="hidden game-player-panel" id="game-' + x + '">';

        // Cycle through all teams and add an accordion panel for each team
        for (var j = 0; j < teams.length; j++) {
            var team = teams[j];
            if (team.Game == Object.keys(games[0])[x]) {
                htmlInsert +=
                    '<button class="accordion"><img src="' + team.Sprite + '" class="modal-team-sprite">' + team[language + 'Name'] + '</button>' +
                    '<div class="panel">';
                // Cycle through all players and add them to the teams panel
                for (var k = 0; k < players.length; k++) {
                    var player = players[k];
                    // If current player is in the current team add a player box
                    if (player[language + 'Team'] == team[language + 'Name']) {
                        if (player.Game == team.Game) {
                            htmlInsert +=
                                '<div class="modal-player-box">' +
                                '<p class="modal-player-name">' + player[language + 'Name'] + '</p>' +
                                '<div class="modal-player-box-container">' +
                                '<div class="modal-player-props-container">' +
                                `<div class='modal-player-position' style='background-image: url("./images/positions/` + player.Position + `.png");'></div>` +
                                `<div class='modal-player-element' style='background-image: url("./images/elements/` + player.Element + `.png");'></div>` +
                                `<div class='modal-player-gender' style='background-image: url("./images/genders/` + player.Gender + `.png");'></div>` +
                                '</div>' +
                                '<div class="modal-player-sprite-container" data-dismiss="modal" data-name="' + player[language + 'Name'] + '" data-sprite="' + player.Sprite + '" data-team-sprite="' + player.TeamSprite + '">' +
                                '<img src="' + player.Sprite + '" alt="' + player[language + 'Name'] + '.png" class="modal-player-sprite"/>' +
                                '<div class="icon">+</div>' +
                                '</div>' +
                                '</div>' +
                                '</div>';
                        }
                    }
                }
                htmlInsert += '</div>';
            }
        }
        htmlInsert += '</div></div></div>';
    }
    // Insert HTML inside modal
    modal.innerHTML = htmlInsert;

    // Initialize
    initializeModal();
    addModalPlayerActions();
}

/**
 * Toggle visibility of the games
 * @param {string} game - Game that has been clicked
 */
function toggle(game) {
    // Show game (hide all others)
    if ($('#' + game).css('display') == 'none') {
        $('.game-title').css('background-color', '#eee');
        $('#' + game + '-button').css('background-color', '#ccc');
        $('.game-player-panel').addClass('hidden');
        $('#' + game).removeClass('hidden');
    } // Hide game
    else {
        $('#' + game + '-button').css('background-color', '#eee');
        $('#' + game).addClass('hidden');
    }
}

/**
 * Initialize modal script
 */
function initializeModal() {
    var acc = document.getElementsByClassName("accordion");
    var i;

    for (i = 0; i < acc.length; i++) {
        acc[i].addEventListener("click", function () {
            this.classList.toggle("active");
            var panel = this.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    }

    $(".game-title").first().click();
}

/**
 * Render formations in formation dropdown
 * @param {array} formations Formations to be rendered inside of dropdown
 */
function renderFormations(formations) {
    var formationDropdown = $("#formation-dropdown");
    var formation;

    // Add a dropdown option for each formation, and store some information in data attributes depending on which device is being used
    if ($(window).width() <= 479) {
        for (var i = 0; i < formations.length; i++) {
            formation = formations[i];
            $(formationDropdown).append('<option value="' + formation.name + '" data-html="' + he.encode(formation.phone_html) + '" class="formation-option">' + formation.name + '</option>');
        }
    } else if ($(window).width() > 479 && $(window).width() < 1600) {
        for (var j = 0; j < formations.length; j++) {
            formation = formations[j];
            $(formationDropdown).append('<option value="' + formation.name + '" data-html="' + he.encode(formation.laptop_html) + '" class="formation-option">' + formation.name + '</option>');
        }
    } else {
        for (var k = 0; k < formations.length; k++) {
            formation = formations[k];
            $(formationDropdown).append('<option value="' + formation.name + '" data-html="' + he.encode(formation.html) + '" class="formation-option">' + formation.name + '</option>');
        }
    }

    // Select 4-4-2 (F-Basic)
    document.querySelectorAll('[value="4-4-2 (F-Basic)"]')[0].selected = true;
}

/**
 * Render coaches in coach dropdown
 * @param {array} coaches Array of coaches
 * @param {string} language Chosen language
 */
function renderCoaches(coaches, language) {
    var coachDropdown = $("#coach-dropdown");
    coachDropdown.empty();

    // Add a dropdown option for each coach, and store some information in data attributes
    for (var i = 0; i < coaches.length; i++) {
        var coach = coaches[i];
        $(coachDropdown).append('<option value="' + coach[language + 'Name'] + '" data-coachSprite="' + coach.Sprite + '" class="coach-option">' + coach[language + 'Name'] /*+ " (" + coach[language + 'Team'] + ')*/ + '</option>');
    }
}

/**
 * Change field's formation to the selected formation
 */
function changeFormation() {
    var formationDropdown = document.getElementById('formation-dropdown');
    var selectedOption = formationDropdown.options[formationDropdown.selectedIndex];

    $("#field-players-container").html(he.decode(selectedOption.dataset.html));

    addPlayerBoxActions();
}

/**
 * Render emblems in emblem dropdown
 * @param {array} emblems Array of emblems
 * @param {string} language Chosen language
 */
function renderEmblems(emblems, language) {
    emblems.sort((a, b) => (a[language + 'Team'] > b[language + 'Team']) ? 1 : ((b[language + 'Team'] > a[language + 'Team']) ? -1 : 0));

    var emblemDropdown = $("#emblem-dropdown");
    emblemDropdown.empty();

    // Add a dropdown option for each emblem, and store some information in data attributes
    for (var i = 0; i < emblems.length; i++) {
        var emblem = emblems[i];
        $(emblemDropdown).append('<option value="' + emblem[language + 'Team'] + '" data-emblemSprite="' + emblem.Sprite + '" class="emblem-option">' + emblem[language + 'Team'] + '</option>');
    }
}

/**
 * Update sprite when selecting a different option
 * @param {string} type Type of sprite e.g. coach or emblem
 */
function updateSprite(type) {
    var dropdown = document.getElementById([type] + '-dropdown');
    var selectedOption = dropdown.options[dropdown.selectedIndex];

    // Set source of the sprite equal to the image url of the selected option
    var spriteToChange = document.getElementById([type + "-sprite"]);
    spriteToChange.src = selectedOption.dataset[type + 'sprite'];
}

/**
 * Change the selected player with a player selected in the modal
 * @param {array} newPlayer New player to add to team
 */
function changePlayer(newPlayer) {
    // Define player name, sprite and emblem
    var newPlayerName = newPlayer.dataset.name.replace('<', '&lt;').replace('>', '&gt;');
    var newPlayerSprite = newPlayer.dataset.sprite;
    var newPlayerTeamSprite = newPlayer.dataset.teamSprite;

    // Define new player box
    var playerBoxToChange = document.getElementById(playerToChange.id).parentElement;
    // console.log(playerBoxToChange);
    var playerType;
    if (playerBoxToChange.id.includes("sub")) {
        playerType = "sub";
    } else if (playerBoxToChange.id.includes("player")) {
        playerType = "player";
    }
    var htmlInsert = "";

    htmlInsert +=
        '<div id="drag-box-' + playerToChangeId + '-container" class="drag-box-container">' +
        '<div class="drag-box" id="drag-box-' + playerToChangeId + '" data-toggle="modal" data-target="#myModal"  data-id="' + playerToChangeId + '" style="background-image: none">' +
        '<img src="' + newPlayerSprite + '" id="' + playerToChangeId + '-sprite" data-pg-name="' + playerToChangeId + '-sprite" class="' + playerType + '-sprite"/>' +
        '</div>' +
        '<div class="icon">✎</div>' +
        '<div class="' + playerType + '-info-container" id="' + playerToChangeId + '-info-container" data-pg-name="' + playerToChangeId + '-info-container">';
    if (newPlayerTeamSprite) {
        htmlInsert +=
            '<div id="' + playerToChangeId + '-element-container" class="' + playerType + '-element-container" style="background-image: none">' +
            '<img id="' + playerToChangeId + '-element" data-pg-name="' + playerToChangeId + '-element" class="' + playerType + '-element" src="' + newPlayerTeamSprite + '"/>' +
            '</div>';
    }
    htmlInsert +=
        '<span id="' + playerToChangeId + '-name" data-pg-name="' + playerToChangeId + '-name" class="' + playerType + '-name">' + newPlayerName + '</span>' +
        '</div>' +
        '</div>';

    // Change selected playerbox to new playerbox
    playerBoxToChange.outerHTML = htmlInsert;

    // Add button actions again to make new player box clickable
    addPlayerBoxActions();
}

/**
 * Load the uploaded image and store in temporary data URL
 * @param {object} file Uploaded image
 */
function loadSprite(file) {
    var input = file.target;

    var reader = new FileReader();
    reader.onload = function () {
        var dataURL = reader.result;

        customSprite = dataURL;
    };
    reader.readAsDataURL(input.files[0]);
}

/**
 * Add custom player to custom player panel
 */
function addCustomPlayer() {
    var name = $('#custom-player-name').val();
    var cleanName = name.toLowerCase().replace(/[^0-9a-z]/gi, '');
    var sprite = customSprite;
    var container = $('#custom-player-panel');

    var htmlInsert = '<div class="modal-player-box">' +
        '<p class="modal-player-name">' + name.replace('<', '&lt;').replace('>', '&gt;') + '</p>' +
        '<div class="modal-player-sprite-container custom-modal-player-sprite-container" id="custom-player-' + cleanName + '" data-dismiss="modal" data-name="' + name.replace('<', '&lt;').replace('>', '&gt;') + '" data-sprite="' + sprite + '">' +
        '<img src="' + sprite + '" alt="' + cleanName + '.png" class="modal-player-sprite"/>' +
        '<div class="icon">+</div>' +
        '</div>' +
        '</div>';

    container.prepend(htmlInsert);

    var customPlayer = document.getElementById('custom-player-' + cleanName);
    customPlayer.addEventListener("click", () => {
        changePlayer(customPlayer);
    });
}

/**
 * Reset entire team to original state
 */
function clearTeam() {
    var playerContainers = $('.player-container');
    var subContainers = $('.sub-container');

    // Clear all field players
    for (var i = 0; i < playerContainers.length; i++) {
        var j = i + 1;
        playerContainers[i].innerHTML =
            '<div id="drag-box-player-' + j + '-container" class="drag-box-container">' +
            '<div class="drag-box" id="drag-box-player-' + j + '" data-toggle="modal" data-target="#myModal"  data-id="player-' + j + '"></div>' +
            '<div class="icon">✎</div>' +
            '<div class="player-info-container" id="player-' + j + '-info-container" data-pg-name="player-' + j + '-info-container">' +
            '<div class="player-element-container" id="player-' + j + '-element-container"></div>' +
            '<span id="player-' + j + '-name" data-pg-name="player-' + j + '-name" class="player-name">Player #' + j + '</span>' +
            '</div>' +
            '</div>';
    }
    // Clear all bench players
    for (var k = 0; k < subContainers.length; k++) {
        var l = k + 1;
        subContainers[k].innerHTML =
            '<div id="drag-box-sub-' + l + '-container"  class="drag-box-container">' +
            '<div class="drag-box" id="drag-box-sub-' + l + '" data-toggle="modal" data-target="#myModal"  data-id="sub-' + l + '"></div>' +
            '<div class="icon">✎</div>' +
            '<div class="sub-info-container" id="sub-' + l + '-info-container" data-pg-name="sub-' + l + '-info-container">' +
            '<div class="sub-element-container" id="sub-' + l + '-element-container"></div>' +
            '<span id="sub-' + l + '-name" data-pg-name="sub-' + l + '-name" class="sub-name">Sub #' + l + '</span>' +
            '</div>' +
            '</div>';
    }
    // Reset formation
    // document.getElementById('formation-dropdown').selectedIndex = 2;
    document.getElementById('formation-dropdown').value = '4-4-2 (F-Basic)';
    changeFormation();

    // Reset coach
    document.getElementById('coach-sprite').src = "./images/character-placeholder.png";

    // Reset name
    document.getElementById('team-name').value = "";

    addPlayerBoxActions();
}

/**
 * Save team as image
 */
function saveTeam(screen) {
    var modalImage = $("#image-modal-body");
    modalImage.html('<img src="./images/loading.gif" id="loading-gif"/>');

    if (screen < 1600 && screen > 479) {
        $('#team-name').css({ 'padding': '0px 0px', 'padding-bottom': '10px' });
    } else if (screen > 1600) {
        $('#body-grid').css({ 'margin-top': '0' });
    }

    var watermark = document.createElement('div');
    watermark.id = 'watermark';
    watermark.innerHTML = 'inazuma-eleven.fr';

    document.getElementById('field-players-container').parentElement.appendChild(watermark);
    var element = document.getElementsByTagName('BODY')[0];
    // var teamName = $('#team-name').val() + '.png';
    html2canvas(element, { allowTaint: true, useCORS: true, width: 1280, height: 500 }).then(function (canvas) {
        canvas.setAttribute("id", "canvas");
        canvas.setAttribute("crossOrigin", "anonymous");
        // canvas.setAttribute("width", "1280");
        // canvas.setAttribute("height", "500");
        canvas.getContext('2d').imageSmoothingEnabled = false;
        modalImage.html('<p id="save-instructions">To save: right click + "Save image as"</p>');
        modalImage.append(canvas);
        if (screen < 1600 && screen > 479) {
            teamName.css({ 'padding-bottom': '0px', 'padding': '3px 0px' });
        } else if (screen > 1600) {
            $('#body-grid').css({ 'margin-top': '-2%' });
        }
        watermark.remove();
        console.log(canvas);
        $("#canvas").click(function () {
            window.open(canvas.toDataURL(), '_blank').focus();
        });
    });
}

/**
 * Add button actions for all modal player boxes
 */
function addModalPlayerActions() {
    var modalPlayers = Array.from(document.getElementsByClassName('modal-player-sprite-container'));
    modalPlayers.forEach(modalPlayer => {
        modalPlayer.addEventListener("click", () => {
            changePlayer(modalPlayer);
        });
    });
}

/**
 * Add button actions for all player boxes
 */
function addPlayerBoxActions() {
    // Select all player boxes (11 on the pitch and 5 on the bench) and store into a variable  
    var fieldPlayers = Array.from(document.getElementsByClassName('drag-box'));
    // Collect data for each player when clicked on
    fieldPlayers.forEach(fieldPlayer => {
        fieldPlayer.addEventListener("click", () => {
            playerToChange = fieldPlayer;
            playerToChangeId = fieldPlayer.dataset.id;
        });
    });
}

/**
 * Add actions to buttons
 */
function addButtonActions() {
    // Render coaches, players and emblems again when changing language to English 
    $("#english-names-input").unbind("click").click(function () {
        renderCoaches(coaches, "English");
        renderPlayers(players, "English");
        renderEmblems(emblems, "English");
    });

    // Render coaches, players and emblems again when changing language to Japanese
    $("#japanese-names-input").unbind("click").click(function () {
        renderCoaches(coaches, "Japanese");
        renderPlayers(players, "Japanese");
        renderEmblems(emblems, "Japanese");
    });

    $("#reset-button").unbind("click").click(function () {
        clearTeam();
    });

    $("#save-button").unbind("click").click(function () {
        saveTeam($(window).width());
    });

    $('#add-button').unbind('click').click(function () {
        addCustomPlayer();
    });
    $('#random-button').unbind('click').click(function () {
        handleRandomTeam();
    });
    $('#ultra-random-button').unbind('click').click(function () {
        handleUltraRandomTeam();
    });
    $("#draft-button").unbind("click").click(function () {
        startDraft();
    });
}

// Initialize
renderFormations(formations);
changeFormation();
renderCoaches(coaches, "English");
renderEmblems(emblems, "English");
renderPlayers(players, "English");
addPlayerBoxActions();
addButtonActions();

document.addEventListener("DOMContentLoaded", function () {
    const downloadButton = document.getElementById("download-image-btn");

    downloadButton.addEventListener("click", function () {
        const canvas = document.querySelector("canvas"); // Sélectionne le canvas généré
        if (canvas) {
            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = "team-image.png"; // Nom du fichier téléchargé
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert("No image to download !");
        }
    });
});