// --- MODULAR DATASTORE & STUDIO MAP STORAGE DENGAN LOCALSTORAGE ---
const BlosorDataStore = {
    // Default data awal jika belum ada data tersimpan di HP
    defaultMaps: {
        "map_1": {
            title: "My First Map",
            maxPlayers: 10,
            thumbBg: "linear-gradient(45deg, #1f4e9c, #219ebc)",
            blocks: [
                { pos: [0, -2, 0], size: [40, 2, 40], color: 3355443, isLadder: false },
                { pos: [0, 1, 8], size: [6, 1, 6], color: 15073280, isLadder: false }
            ]
        },
        "map_2": {
            title: "Parkour Challenge",
            maxPlayers: 10,
            thumbBg: "linear-gradient(45deg, #e63946, #ffb703)",
            blocks: [
                { pos: [0, -2, 0], size: [20, 2, 20], color: 1979135, isLadder: false },
                { pos: [0, 2, 6], size: [4, 1, 4], color: 16753920, isLadder: false },
                { pos: [0, 6, 14], size: [3, 1, 3], color: 16711680, isLadder: false }
            ]
        }
    },
    
    maps: {},
    publishedMaps: [],

    // 1. Load data dari LocalStorage HP agar tidak hilang saat di-refresh
    initStorage: function() {
        const savedMaps = localStorage.getItem("blosor_saved_maps");
        const savedPublished = localStorage.getItem("blosor_published_maps");

        if (savedMaps) {
            this.maps = JSON.parse(savedMaps);
        } else {
            this.maps = JSON.parse(JSON.stringify(this.defaultMaps));
            this.saveToStorage();
        }

        if (savedPublished) {
            this.publishedMaps = JSON.parse(savedPublished);
        }
    },

    // 2. Simpan data otomatis ke memori HP
    saveToStorage: function() {
        localStorage.setItem("blosor_saved_maps", JSON.stringify(this.maps));
        localStorage.setItem("blosor_published_maps", JSON.stringify(this.publishedMaps));
    },

    getMapBlocks: function(mapId) {
        return this.maps[mapId] ? this.maps[mapId].blocks : [];
    }
};

// Inisialisasi penyimpanan saat file dimuat
BlosorDataStore.initStorage();

function getCurrentSelectedMapId() {
    return document.getElementById("map-selector").value;
}

function updateStudioInfo() {
    const mapId = getCurrentSelectedMapId();
    const mapData = BlosorDataStore.maps[mapId];
    if(mapData) {
        document.getElementById("active-map-info").textContent = `Active Blocks: ${mapData.blocks.length} items loaded in "${mapData.title}"`;
        document.getElementById("input-map-title").value = mapData.title;
    }
}

function onSelectMapToEdit() {
    updateStudioInfo();
}

function testPlayCurrentStudioMap() {
    const mapId = getCurrentSelectedMapId();
    launchGame(mapId);
}

function openPublishModal() {
    updateStudioInfo();
    document.getElementById("publish-modal").style.display = "flex";
}

function closePublishModal() {
    document.getElementById("publish-modal").style.display = "none";
}

function submitPublishMap() {
    const mapId = getCurrentSelectedMapId();
    const customTitle = document.getElementById("input-map-title").value.trim() || "Untitled Map";
    const maxPlayers = parseInt(document.getElementById("input-max-players").value);

    // Update data map dan simpan permanen ke HP
    BlosorDataStore.maps[mapId].title = customTitle;
    BlosorDataStore.maps[mapId].maxPlayers = maxPlayers;
    BlosorDataStore.saveToStorage();

    const selectElem = document.getElementById("map-selector");
    for (let opt of selectElem.options) {
        if (opt.value === mapId) {
            opt.text = `${customTitle} (${mapId === 'map_1' ? 'Slot 1' : 'Slot 2'})`;
        }
    }

    const existingIndex = BlosorDataStore.publishedMaps.findIndex(m => m.mapId === mapId);
    const mapPayload = {
        mapId: mapId,
        gameTitle: customTitle,
        author: "Player_01",
        maxPlayers: maxPlayers,
        thumbBg: BlosorDataStore.maps[mapId].thumbBg,
        blocks: BlosorDataStore.maps[mapId].blocks
    };

    if (existingIndex >= 0) {
        BlosorDataStore.publishedMaps[existingIndex] = mapPayload;
    } else {
        BlosorDataStore.publishedMaps.push(mapPayload);
    }

    // Simpan daftar published ke storage juga
    BlosorDataStore.saveToStorage();

    alert(`Berhasil mem-publish "${customTitle}"!\nData map tersimpan aman di perangkatmu dan muncul di Discover.`);
    closePublishModal();
    updateStudioInfo();
}

async function fetchCommunityGamesFromCloud() {
    const cloudDatabaseResponse = BlosorDataStore.publishedMaps;
    const gridContainer = document.getElementById("games-grid-container");
    gridContainer.innerHTML = "";

    if (cloudDatabaseResponse.length === 0) {
        gridContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #80879a;">
                <h3 style="color: #fff; margin-bottom: 8px; font-size: 18px;">No community games published yet</h3>
                <p style="font-size: 13px; margin-bottom: 20px;">Open the <b>Studio</b> tab, select a map, and click <b>Publish Map</b> to make it playable here!</p>
            </div>
        `;
    } else {
        cloudDatabaseResponse.forEach(game => {
            const card = document.createElement("div");
            card.className = "game-card";
            card.innerHTML = `
                <div class="game-thumb" style="background: ${game.thumbBg};">${game.gameTitle.toUpperCase()}</div>
                <div class="game-info">
                    <div class="game-title">${game.gameTitle}</div>
                    <div class="game-author">by ${game.author} (Max: ${game.maxPlayers}P)</div>
                    <button class="btn-play" onclick="launchGame('${game.mapId}')">PLAY</button>
                </div>
            `;
            gridContainer.appendChild(card);
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    fetchCommunityGamesFromCloud();
    updateStudioInfo();
});

function switchTab(tabName, el) {
    document.querySelectorAll('.panel-section').forEach(p => p.classList.remove('active-panel'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    if(tabName === 'discover') {
        document.getElementById('panel-discover').classList.add('active-panel');
        fetchCommunityGamesFromCloud();
    } else if(tabName === 'studio') {
        document.getElementById('panel-studio').classList.add('active-panel');
        updateStudioInfo();
    }
    el.classList.add('active');
}
