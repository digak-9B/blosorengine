// --- MODULAR DATASTORE & STUDIO MAP STORAGE ---
const BlosorDataStore = {
    maps: {
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
    publishedMaps: [],

    getMapBlocks: function(mapId) {
        return this.maps[mapId] ? this.maps[mapId].blocks : [];
    }
};

function getCurrentSelectedMapId() {
    return document.getElementById("map-selector").value;
}

function updateStudioInfo() {
    const mapId = getCurrentSelectedMapId();
    const mapData = BlosorDataStore.maps[mapId];
    document.getElementById("active-map-info").textContent = `Active Blocks: ${mapData.blocks.length} items loaded in "${mapData.title}"`;
    document.getElementById("input-map-title").value = mapData.title;
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

    BlosorDataStore.maps[mapId].title = customTitle;
    BlosorDataStore.maps[mapId].maxPlayers = maxPlayers;

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

    alert(`Berhasil mem-publish "${customTitle}"!\nMap sekarang sudah muncul di menu Discover.`);
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
  
