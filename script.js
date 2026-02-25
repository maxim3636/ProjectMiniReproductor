document.addEventListener('DOMContentLoaded', () => {
    const contentList = document.getElementById('content-list');
    const historyList = document.getElementById('history-list');
    const playerScreen = document.getElementById('player-screen');
    const homeScreen = document.getElementById('home-screen');
    const videoEl = document.getElementById('main-video');
    
    let allData = [];
    let currentVideoId = null;

    const svgPlay = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    const svgPause = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allData = data;
            renderHome(allData);
            renderHistory();
        })
        .catch(err => console.error("Error carregant JSON:", err));

    function renderHome(dataToRender) {
        contentList.innerHTML = '';
        if (!dataToRender || dataToRender.length === 0) {
            contentList.innerHTML = '<p style="text-align:center; padding:20px;">No hi ha resultats.</p>';
            return;
        }

        const currentSort = document.getElementById('sort-filter').value;

        // 1. Ordenació per anys/edicions
        let edicionsArray = [...dataToRender];
        if (currentSort === 'newest') {
            edicionsArray.sort((a, b) => b.any_edicio - a.any_edicio);
        } else if (currentSort === 'oldest') {
            edicionsArray.sort((a, b) => a.any_edicio - b.any_edicio);
        } else {
            edicionsArray.sort((a, b) => b.any_edicio - a.any_edicio); // Per defecte: Més nous a dalt
        }

        // 2. Renderitzat dels anys
        edicionsArray.forEach(edicio => {
            let jocsArray = [...edicio.guanyadors];

            // 3. Ordenació per títol o estat a dins de cada any
            if (currentSort === 'az') {
                jocsArray.sort((a, b) => a.titol.localeCompare(b.titol));
            } else if (currentSort === 'za') {
                jocsArray.sort((a, b) => b.titol.localeCompare(a.titol));
            } else if (currentSort === 'unseen') {
                jocsArray.sort((a, b) => {
                    const vistA = (parseFloat(localStorage.getItem(`time_${a.id}`)) || 0) > 5 ? 1 : 0;
                    const vistB = (parseFloat(localStorage.getItem(`time_${b.id}`)) || 0) > 5 ? 1 : 0;
                    return vistA - vistB;
                });
            }

            if(jocsArray.length === 0) return;

            const section = document.createElement('div');
            section.className = 'year-section';
            section.innerHTML = `<h2 class="year-title">${edicio.any_edicio}</h2>`;
            
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'cards-container';

            jocsArray.forEach(joc => {
                const isLiked = localStorage.getItem(`like_${joc.id}`) === 'true';
                const timePlayed = parseFloat(localStorage.getItem(`time_${joc.id}`)) || 0;
                const isSeen = timePlayed > 5;

                const card = document.createElement('div');
                card.className = 'card';
                card.onclick = (e) => {
                    if(e.target.classList.contains('card-heart')) return;
                    openPlayer(joc);
                };

                card.innerHTML = `
                    <div class="card-badges">
                        ${isSeen ? '<span class="badge-seen">👁 Vist</span>' : ''}
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

    // Filtres
    document.getElementById('category-filter').addEventListener('change', (e) => {
        const filter = e.target.value;
        if(filter === 'all') {
            renderHome(allData);
        } else if (filter === 'favorites') {
             const filteredData = allData.map(edicio => {
                return { ...edicio, guanyadors: edicio.guanyadors.filter(g => localStorage.getItem(`like_${g.id}`) === 'true') };
             });
             renderHome(filteredData);
        } else {
            const filteredData = allData.map(edicio => {
                return { ...edicio, guanyadors: edicio.guanyadors.filter(g => g.categoria === filter) };
             });
             renderHome(filteredData);
        }
    });

    document.getElementById('sort-filter').addEventListener('change', () => {
        document.getElementById('category-filter').dispatchEvent(new Event('change'));
    });

    // Funcionalitat de Navegació
    window.openPlayer = function(joc) {
        homeScreen.classList.remove('active');
        homeScreen.classList.add('hidden');
        playerScreen.classList.remove('hidden');
        playerScreen.classList.add('active');

        currentVideoId = joc.id;
        document.getElementById('player-title').innerText = joc.titol;
        document.getElementById('player-desc').innerText = joc.descripcio;
        document.getElementById('player-category').innerText = joc.categoria;
        videoEl.src = joc.video_url;

        const timePlayed = parseFloat(localStorage.getItem(`time_${joc.id}`)) || 0;
        const seenBadge = document.getElementById('player-seen-badge');
        if (timePlayed > 5) {
            seenBadge.classList.remove('hidden');
        } else {
            seenBadge.classList.add('hidden');
        }

        const likeBtn = document.getElementById('player-like-btn');
        const isLiked = localStorage.getItem(`like_${joc.id}`) === 'true';
        likeBtn.className = isLiked ? 'like-btn liked' : 'like-btn';
        likeBtn.innerText = isLiked ? '♥' : '♡';
        likeBtn.onclick = () => { toggleLike(joc.id, likeBtn); };

        if(timePlayed) videoEl.currentTime = timePlayed;
        addToHistory(joc);
        
        document.getElementById('play-pause-btn').innerHTML = svgPlay;
        
        // Reiniciar visualment la barra
        document.getElementById('progress-slider').value = 0;
        document.getElementById('progress-slider').style.background = '#3a3a3c';
    };

    document.getElementById('back-btn').addEventListener('click', () => {
        videoEl.pause();
        playerScreen.classList.remove('active');
        playerScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
        homeScreen.classList.add('active');
        document.getElementById('category-filter').dispatchEvent(new Event('change')); 
        renderHistory();
    });

    // Controls Reproductor
    const playBtn = document.getElementById('play-pause-btn');
    const muteBtn = document.getElementById('mute-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const progressSlider = document.getElementById('progress-slider');
    const volumeSlider = document.getElementById('volume-slider');
    const timeDisplay = document.getElementById('time-display');

    playBtn.addEventListener('click', () => {
        if(videoEl.paused) {
            videoEl.play();
            playBtn.innerHTML = svgPause;
        } else {
            videoEl.pause();
            playBtn.innerHTML = svgPlay;
        }
    });

    volumeSlider.addEventListener('input', (e) => {
        videoEl.volume = e.target.value;
        videoEl.muted = (videoEl.volume === 0);
    });

    muteBtn.addEventListener('click', () => {
        videoEl.muted = !videoEl.muted;
        if(videoEl.muted) {
            volumeSlider.value = 0;
        } else {
            volumeSlider.value = videoEl.volume || 1;
        }
    });

    // iOS iPhone Compatible Fullscreen
    fullscreenBtn.addEventListener('click', () => {
        if (videoEl.requestFullscreen) {
            videoEl.requestFullscreen();
        } else if (videoEl.webkitRequestFullscreen) {
            videoEl.webkitRequestFullscreen();
        } else if (videoEl.webkitEnterFullscreen) {
            videoEl.webkitEnterFullscreen(); // iOS Màgia
        }
    });

    // Control Slider de Temps
    videoEl.addEventListener('timeupdate', () => {
        if(videoEl.duration) {
            const percentage = (videoEl.currentTime / videoEl.duration) * 100;
            progressSlider.value = percentage;
            
            // Pinta la barra de Taronja a mesura que avança
            progressSlider.style.background = `linear-gradient(to right, #ff4500 ${percentage}%, #3a3a3c ${percentage}%)`;
        }
        timeDisplay.innerText = `${formatTime(videoEl.currentTime)} / ${formatTime(videoEl.duration || 0)}`;
        if(currentVideoId) localStorage.setItem(`time_${currentVideoId}`, videoEl.currentTime);
    });

    progressSlider.addEventListener('input', (e) => {
        if(videoEl.duration) {
            const val = e.target.value;
            videoEl.currentTime = (val / 100) * videoEl.duration;
            progressSlider.style.background = `linear-gradient(to right, #ff4500 ${val}%, #3a3a3c ${val}%)`;
        }
    });

    // Funcions de Dades (Historial i Likes)
    window.toggleLike = function(id, btnElement) {
        const key = `like_${id}`;
        const current = localStorage.getItem(key) === 'true';
        localStorage.setItem(key, !current);
        if(btnElement) {
            btnElement.classList.toggle('liked');
            btnElement.innerText = !current ? '♥' : '♡';
        }
    };

    function addToHistory(joc) {
        let history = JSON.parse(localStorage.getItem('videoHistory')) || [];
        history = history.filter(item => item.id !== joc.id);
        history.unshift({ id: joc.id, titol: joc.titol, miniatura: joc.miniatura });
        if(history.length > 6) history.pop();
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
                let foundGame = null;
                allData.forEach(y => y.guanyadors.forEach(g => { if(g.id === item.id) foundGame = g; }));
                if(foundGame) openPlayer(foundGame);
            };
            historyList.appendChild(div);
        });
    }

    function formatTime(seconds) {
        if(isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0'+s : s}`;
    }
});