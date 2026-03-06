document.addEventListener('DOMContentLoaded', () => {
    const contentList = document.getElementById('content-list');
    const historyList = document.getElementById('history-list');
    const playerScreen = document.getElementById('player-screen');
    const homeScreen = document.getElementById('home-screen');
    const videoEl = document.getElementById('main-video');
    
    let allData = [];
    let currentVideoId = null;

    // Icones SVGs per reproducció i volum
    const svgPlay = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    const svgPause = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    const svgVolOn = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>';
    const svgVolOff = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';

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

        // 1. Ordenació per edicions
        let edicionsArray = [...dataToRender];
        if (currentSort === 'newest') edicionsArray.sort((a, b) => b.any_edicio - a.any_edicio);
        else if (currentSort === 'oldest') edicionsArray.sort((a, b) => a.any_edicio - b.any_edicio);
        else edicionsArray.sort((a, b) => b.any_edicio - a.any_edicio);

        // 2. Renderitzat dels anys
        edicionsArray.forEach(edicio => {
            let jocsArray = [...edicio.guanyadors];

            // 3. Ordenació per títol o estat (ara mirant si la targeta s'ha obert)
            if (currentSort === 'az') jocsArray.sort((a, b) => a.titol.localeCompare(b.titol));
            else if (currentSort === 'za') jocsArray.sort((a, b) => b.titol.localeCompare(a.titol));
            else if (currentSort === 'unseen') {
                jocsArray.sort((a, b) => {
                    const vistA = localStorage.getItem(`opened_${a.id}`) === 'true' ? 1 : 0;
                    const vistB = localStorage.getItem(`opened_${b.id}`) === 'true' ? 1 : 0;
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
                const isSeen = localStorage.getItem(`opened_${joc.id}`) === 'true';

                // Etiqueta dinàmica ✨ NEW o 👁 Vist
                const badgeHTML = isSeen 
                    ? '<span class="badge-seen">👁 Vist</span>' 
                    : '<span class="badge-seen badge-new">✨ NEW</span>';

                const card = document.createElement('div');
                card.className = 'card';
                card.onclick = (e) => {
                    if(e.target.classList.contains('card-heart')) return;
                    openPlayer(joc);
                };

                const tagsHTML = joc.categories.map(c => `<span class="card-cat">${c}</span>`).join('');

                card.innerHTML = `
                    <div class="card-badges">
                        ${badgeHTML}
                    </div>
                    <div class="card-heart ${isLiked ? 'liked' : ''}" onclick="toggleLike('${joc.id}', this)">
                        ${isLiked ? '♥' : '♡'}
                    </div>
                    <img src="${joc.miniatura}" class="card-thumb" alt="${joc.titol}">
                    <div class="card-content">
                        <h3 class="card-title">${joc.titol}</h3>
                        <div class="card-categories">
                            ${tagsHTML}
                        </div>
                    </div>
                `;
                cardsContainer.appendChild(card);
            });
            section.appendChild(cardsContainer);
            contentList.appendChild(section);
        });
    }

    // Filtres per a l'Array de Categories
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
                return { ...edicio, guanyadors: edicio.guanyadors.filter(g => g.categories.includes(filter)) };
             });
             renderHome(filteredData);
        }
    });

    document.getElementById('sort-filter').addEventListener('change', () => {
        document.getElementById('category-filter').dispatchEvent(new Event('change'));
    });

    // Funció per a quan cliquem un tag dins del reproductor
    window.applyCategoryFilter = function(category) {
        // Pausa el vídeo i canvia a la pantalla principal
        videoEl.pause();
        playerScreen.classList.remove('active');
        playerScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
        homeScreen.classList.add('active');

        // Canvia el valor del select de categories al valor del tag clicat
        const filterDropdown = document.getElementById('category-filter');
        let optionExists = Array.from(filterDropdown.options).some(opt => opt.value === category);
        
        if(optionExists) {
            filterDropdown.value = category;
        } else {
            filterDropdown.value = 'all'; // Seguretat
        }

        // Força l'actualització de la llista cridant l'esdeveniment 'change'
        filterDropdown.dispatchEvent(new Event('change'));
        renderHistory();
        
        // Torna suaument a la part de dalt de la pàgina
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Navegació Reproductor
    window.openPlayer = function(joc) {
        // MARQUEM COM A OBERT DEFINITIVAMENT AL LOCALSTORAGE
        localStorage.setItem(`opened_${joc.id}`, 'true');

        homeScreen.classList.remove('active');
        homeScreen.classList.add('hidden');
        playerScreen.classList.remove('hidden');
        playerScreen.classList.add('active');

        currentVideoId = joc.id;
        document.getElementById('player-title').innerText = joc.titol;
        document.getElementById('player-desc').innerText = joc.descripcio;
        videoEl.src = joc.video_url;

        // Renderitzem les etiquetes múltiples AMB CLIC
        const playerTagsHTML = joc.categories.map(c => 
            `<span class="category-tag" onclick="applyCategoryFilter('${c}')">${c}</span>`
        ).join('');
        document.getElementById('player-categories-container').innerHTML = playerTagsHTML;

        // Com que acabem d'obrir-lo, al reproductor SEMPRE serà "Vist"
        const seenBadge = document.getElementById('player-seen-badge');
        seenBadge.classList.remove('hidden'); 
        seenBadge.innerText = '👁 Vist';
        seenBadge.className = 'badge-seen'; 

        const likeBtn = document.getElementById('player-like-btn');
        const isLiked = localStorage.getItem(`like_${joc.id}`) === 'true';
        likeBtn.className = isLiked ? 'like-btn liked' : 'like-btn';
        likeBtn.innerText = isLiked ? '♥' : '♡';
        likeBtn.onclick = () => { toggleLike(joc.id, likeBtn); };

        // Recuperem el temps si ja l'havíem vist abans
        const timePlayed = parseFloat(localStorage.getItem(`time_${joc.id}`)) || 0;
        if(timePlayed) videoEl.currentTime = timePlayed;
        
        document.getElementById('time-display').innerText = `${formatTime(timePlayed)} / ${formatTime(joc.durada_segons)}`;
        addToHistory(joc);
        
        document.getElementById('play-pause-btn').innerHTML = svgPlay;
        
        if(joc.durada_segons && timePlayed) {
            const perc = (timePlayed / joc.durada_segons) * 100;
            document.getElementById('progress-slider').value = perc;
            document.getElementById('progress-slider').style.background = `linear-gradient(to right, #ff4500 ${perc}%, rgba(255, 255, 255, 0.3) ${perc}%)`;
        } else {
            document.getElementById('progress-slider').value = 0;
            document.getElementById('progress-slider').style.background = 'rgba(255, 255, 255, 0.3)';
        }
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

    // Controls del Vídeo
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

    // Funció que comprova si ha de posar l'icona normal o ratllada
    function updateVolumeIcon() {
        if (videoEl.muted || videoEl.volume === 0) {
            muteBtn.innerHTML = svgVolOff;
        } else {
            muteBtn.innerHTML = svgVolOn;
        }
    }

    volumeSlider.addEventListener('input', (e) => {
        videoEl.volume = e.target.value;
        videoEl.muted = (videoEl.volume === 0);
        updateVolumeIcon(); // Actualitza gràficament
    });

    muteBtn.addEventListener('click', () => {
        videoEl.muted = !videoEl.muted;
        volumeSlider.value = videoEl.muted ? 0 : (videoEl.volume || 1);
        updateVolumeIcon(); // Actualitza gràficament
    });

    fullscreenBtn.addEventListener('click', () => {
        if (videoEl.requestFullscreen) {
            videoEl.requestFullscreen();
        } else if (videoEl.webkitRequestFullscreen) {
            videoEl.webkitRequestFullscreen();
        } else if (videoEl.webkitEnterFullscreen) {
            videoEl.webkitEnterFullscreen();
        }
    });

    // Quan el navegador llegeix el vídeo, actualitza el text de forma nativa
    videoEl.addEventListener('loadedmetadata', () => {
        timeDisplay.innerText = `${formatTime(videoEl.currentTime)} / ${formatTime(videoEl.duration || 0)}`;
    });

    videoEl.addEventListener('timeupdate', () => {
        if(videoEl.duration) {
            const percentage = (videoEl.currentTime / videoEl.duration) * 100;
            progressSlider.value = percentage;
            progressSlider.style.background = `linear-gradient(to right, #ff4500 ${percentage}%, rgba(255, 255, 255, 0.3) ${percentage}%)`;
        }
        timeDisplay.innerText = `${formatTime(videoEl.currentTime)} / ${formatTime(videoEl.duration || 0)}`;
        if(currentVideoId) localStorage.setItem(`time_${currentVideoId}`, videoEl.currentTime);
    });

    progressSlider.addEventListener('input', (e) => {
        if(videoEl.duration) {
            const val = e.target.value;
            videoEl.currentTime = (val / 100) * videoEl.duration;
            progressSlider.style.background = `linear-gradient(to right, #ff4500 ${val}%, rgba(255, 255, 255, 0.3) ${val}%)`;
        }
    });

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