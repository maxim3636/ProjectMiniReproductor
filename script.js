document.addEventListener('DOMContentLoaded', () => {
    // Referències DOM
    const contentList = document.getElementById('content-list');
    const historyList = document.getElementById('history-list');
    const playerScreen = document.getElementById('player-screen');
    const homeScreen = document.getElementById('home-screen');
    const videoEl = document.getElementById('main-video');

    // Variables d'Estat
    let allData = []; // Guardarem tot el JSON aquí
    let currentVideoId = null;

    // --- 1. Càrrega de Dades ---
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allData = data;
            renderHome(allData);
            renderHistory();
        })
        .catch(err => console.error("Error carregant JSON:", err));

    // --- 2. Renderitzat de la Pantalla Principal ---
    function renderHome(dataToRender) {
        const contentList = document.getElementById('content-list');
        contentList.innerHTML = ''; // Netejar llista prèvia

        // Comprovem si hi ha dades; si no, mostrem missatge
        if (!dataToRender || dataToRender.length === 0) {
            contentList.innerHTML = '<p style="text-align:center; padding:20px;">No s\'han trobat jocs.</p>';
            return;
        }

        dataToRender.forEach(edicio => {
            // 1. Creem el títol de l'Any (ex: 2025)
            const section = document.createElement('div');
            section.className = 'year-section';

            const title = document.createElement('h2');
            title.className = 'year-title';
            title.innerText = edicio.any_edicio;
            section.appendChild(title);

            // 2. Creem el contenidor de targetes (scroll horitzontal)
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'cards-container';

            // 3. Generem cada targeta de joc
            edicio.nominats.forEach(joc => {
                // Recuperem estats del LocalStorage
                const isLiked = localStorage.getItem(`like_${joc.id}`) === 'true';
                const timePlayed = parseFloat(localStorage.getItem(`time_${joc.id}`)) || 0;
                const isSeen = timePlayed > 10; // Considerem "vist" si s'ha reproduït més de 10 segons

                const card = document.createElement('div');
                card.className = 'card';

                // Event: Al fer clic a la targeta, obrim el reproductor
                card.onclick = (e) => {
                    // Si fem clic al cor, no obrim el vídeo
                    if (e.target.classList.contains('card-heart')) return;
                    openPlayer(joc);
                };

                // HTML INTERN DE LA TARGETA
                // Inclou: Imatge, Títol, Categoria, Cor (Me gusta) i Ull (Vist)
                card.innerHTML = `
                    <div class="card-badges">
                        ${isSeen ? '<span class="badge-seen" title="Vist">👁</span>' : ''}
                    </div>
                    <div class="card-heart ${isLiked ? 'liked' : ''}" onclick="toggleLike('${joc.id}', this)">
                        ${isLiked ? '♥' : '♡'}
                    </div>
                    
                    <img src="${joc.miniatura}" class="card-thumb" alt="${joc.titol}">
                    
                    <div class="card-content">
                        <h3 class="card-title">${joc.titol}</h3>
                        <p class="card-cat">${joc.categoria}</p>
                    </div>
                `;
                cardsContainer.appendChild(card);
            });

            section.appendChild(cardsContainer);
            contentList.appendChild(section);
        });
    }

    // --- 3. Funcions del Reproductor ---
    window.openPlayer = function (joc) {
        // Navegació
        homeScreen.classList.remove('active');
        homeScreen.classList.add('hidden');
        playerScreen.classList.remove('hidden');
        playerScreen.classList.add('active');

        // Carregar Dades
        currentVideoId = joc.id;
        document.getElementById('player-title').innerText = joc.titol;
        document.getElementById('player-desc').innerText = joc.descripcio;
        document.getElementById('player-category').innerText = joc.categoria;
        videoEl.src = joc.video_url;

        // Gestió 'Like' al reproductor
        const likeBtn = document.getElementById('player-like-btn');
        const isLiked = localStorage.getItem(`like_${joc.id}`) === 'true';
        likeBtn.className = isLiked ? 'like-btn liked' : 'like-btn';
        likeBtn.innerText = isLiked ? '♥' : '♡';
        likeBtn.onclick = () => { toggleLike(joc.id, likeBtn); };

        // Recuperar punt de reproducció (LocalStorage)
        const savedTime = localStorage.getItem(`time_${joc.id}`);
        if (savedTime) {
            videoEl.currentTime = parseFloat(savedTime);
        }

        // Afegir a Historial
        addToHistory(joc);
    };

    document.getElementById('back-btn').addEventListener('click', () => {
        videoEl.pause();
        playerScreen.classList.remove('active');
        playerScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
        homeScreen.classList.add('active');
        renderHome(allData); // Re-render per actualitzar estats
        renderHistory();
    });

    // --- 4. Controls de Vídeo Personalitzats ---
    const playBtn = document.getElementById('play-pause-btn');
    const muteBtn = document.getElementById('mute-btn');
    const progressBar = document.getElementById('progress-fill');
    const progressContainer = document.getElementById('progress-container');
    const timeDisplay = document.getElementById('time-display');

    playBtn.addEventListener('click', () => {
        if (videoEl.paused) {
            videoEl.play();
            playBtn.innerText = '⏸';
        } else {
            videoEl.pause();
            playBtn.innerText = '▶';
        }
    });

    muteBtn.addEventListener('click', () => {
        videoEl.muted = !videoEl.muted;
        muteBtn.innerText = videoEl.muted ? '🔇' : '🔊';
    });

    videoEl.addEventListener('timeupdate', () => {
        // Actualitzar barra
        const percentage = (videoEl.currentTime / videoEl.duration) * 100;
        progressBar.style.width = `${percentage}%`;

        // Actualitzar text temps
        timeDisplay.innerText = `${formatTime(videoEl.currentTime)} / ${formatTime(videoEl.duration || 0)}`;

        // Guardar progrés a LocalStorage
        if (currentVideoId) {
            localStorage.setItem(`time_${currentVideoId}`, videoEl.currentTime);
        }
    });

    // Clic a la barra de progrés
    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        videoEl.currentTime = pos * videoEl.duration;
    });

    // --- 5. Funcionalitats Extres (LocalStorage & Filtres) ---

    // M'agrada Global
    window.toggleLike = function (id, btnElement) {
        const key = `like_${id}`;
        const current = localStorage.getItem(key) === 'true';
        localStorage.setItem(key, !current);

        // Actualitzar UI visualment sense recarregar tot
        if (btnElement) {
            btnElement.classList.toggle('liked');
            btnElement.innerText = !current ? '♥' : '♡';
        }
    };

    // Historial
    function addToHistory(joc) {
        let history = JSON.parse(localStorage.getItem('videoHistory')) || [];
        // Eliminar si ja existeix (per posar-lo al principi)
        history = history.filter(item => item.id !== joc.id);
        // Afegir al principi
        history.unshift({ id: joc.id, titol: joc.titol, miniatura: joc.miniatura });
        // Mantenir només els últims 6
        if (history.length > 6) history.pop();

        localStorage.setItem('videoHistory', JSON.stringify(history));
    }

    function renderHistory() {
        const history = JSON.parse(localStorage.getItem('videoHistory')) || [];
        historyList.innerHTML = '';
        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `<img src="${item.miniatura}"><span>${item.titol}</span>`;
            div.onclick = () => {
                // Busquem el joc sencer a allData per obrir-lo
                let foundGame = null;
                allData.forEach(y => y.nominats.forEach(g => { if (g.id === item.id) foundGame = g; }));
                if (foundGame) openPlayer(foundGame);
            };
            historyList.appendChild(div);
        });
    }

    // Filtres
    document.getElementById('category-filter').addEventListener('change', (e) => {
        const filter = e.target.value;
        if (filter === 'all') {
            renderHome(allData);
        } else if (filter === 'favorites') {
            // Filtrar només favorits
            const filteredData = allData.map(edicio => {
                return {
                    ...edicio,
                    nominats: edicio.nominats.filter(g => localStorage.getItem(`like_${g.id}`) === 'true')
                };
            }).filter(e => e.nominats.length > 0);
            renderHome(filteredData);
        } else {
            // Filtrar per categoria
            const filteredData = allData.map(edicio => {
                return {
                    ...edicio,
                    nominats: edicio.nominats.filter(g => g.categoria === filter)
                };
            }).filter(e => e.nominats.length > 0);
            renderHome(filteredData);
        }
    });

    // Helper temps
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' + s : s}`;
    }
});