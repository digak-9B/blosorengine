// --- GAME ENGINE & HUD LOGIC ---
let activeGameInstance = null;
let activeChatBubble = null;
let chatTimer = null;

function toggleChatBox() {
    const box = document.getElementById("chat-box-container");
    const input = document.getElementById("chat-input");
    if (box.style.display === "flex") {
        box.style.display = "none";
    } else {
        box.style.display = "flex";
        input.focus();
    }
}

const badWords = ["babi", "anjing", "kontol", "memek", "tolol", "goblog", "idiot", "stupid"];
const safeContexts = ["ada babi", "lihat babi", "anak babi", "ada anjing", "lihat anjing", "wild babi"];

function processChatFilter(rawText) {
    let text = rawText.trim();
    if (text === "") return null;
    const words = text.split(/\s+/);
    if (words.length > 25) return "⚠️ Message too long (Max 25 words)!";
    let lowerText = text.toLowerCase();
    if (safeContexts.some(p => lowerText.includes(p))) return text;
    for (let bw of badWords) {
        if (lowerText.includes(bw)) return "### [Message censored due to profanity]";
    }
    return text;
}

document.addEventListener("DOMContentLoaded", () => {
    const chatInput = document.getElementById("chat-input");
    if(chatInput) {
        chatInput.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                const filteredMessage = processChatFilter(this.value);
                if (filteredMessage) triggerChatBubble(filteredMessage);
                this.value = "";
                document.getElementById("chat-box-container").style.display = "none";
            }
        });
    }
});

function triggerChatBubble(text) {
    const container = document.getElementById("chat-bubbles-container");
    if (activeChatBubble) { activeChatBubble.remove(); clearTimeout(chatTimer); }
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.textContent = text;
    container.appendChild(bubble);
    activeChatBubble = bubble;
    chatTimer = setTimeout(() => {
        if (activeChatBubble === bubble) {
            bubble.style.opacity = "0";
            setTimeout(() => bubble.remove(), 300);
            activeChatBubble = null;
        }
    }, 4000);
}

function launchGame(mapId) {
    document.getElementById("sidebar").style.display = "none";
    document.getElementById("main-content").style.display = "none";

    document.getElementById("canvas-container").style.display = "block";
    document.getElementById("ui").style.display = "block";
    document.getElementById("roblox-topbar").style.display = "flex";
    document.getElementById("chat-bubbles-container").style.display = "block";
    document.getElementById("side-btns").style.display = "flex";
    document.getElementById("joystick-zone").style.display = "block";
    document.getElementById("btn-jump").style.display = "flex";

    if (!activeGameInstance) {
        activeGameInstance = initBlosorEngine(mapId);
    }
}

function returnToMenu() {
    if (activeGameInstance && typeof activeGameInstance.destroy === 'function') {
        activeGameInstance.destroy();
        activeGameInstance = null;
    }

    document.getElementById("sidebar").style.display = "flex";
    document.getElementById("main-content").style.display = "flex";

    document.getElementById("canvas-container").style.display = "none";
    document.getElementById("ui").style.display = "none";
    document.getElementById("roblox-topbar").style.display = "none";
    document.getElementById("chat-box-container").style.display = "none";
    document.getElementById("chat-bubbles-container").style.display = "none";
    document.getElementById("side-btns").style.display = "none";
    document.getElementById("joystick-zone").style.display = "none";
    document.getElementById("btn-jump").style.display = "none";
    
    fetchCommunityGamesFromCloud();
}

function initBlosorEngine(mapId) {
    try {
        if (!window.THREE) throw new Error("Three.js library failed to load!");

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);

        const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.style.touchAction = "none";
        
        const canvasContainer = document.getElementById("canvas-container");
        canvasContainer.innerHTML = "";
        canvasContainer.appendChild(renderer.domElement);

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(20, 40, 20);
        sun.castShadow = true;
        scene.add(sun);

        const colliders = [];
        const ladders = [];
        const mapBlocks = BlosorDataStore.getMapBlocks(mapId);

        mapBlocks.forEach(item => {
            const geo = new THREE.BoxGeometry(item.size[0], item.size[1], item.size[2]);
            const mat = new THREE.MeshLambertMaterial({ color: item.color });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(item.pos[0], item.pos[1], item.pos[2]);
            mesh.castShadow = true; mesh.receiveShadow = true;
            scene.add(mesh);

            const bounds = {
                minX: item.pos[0] - item.size[0] / 2, maxX: item.pos[0] + item.size[0] / 2,
                minY: item.pos[1] - item.size[1] / 2, maxY: item.pos[1] + item.size[1] / 2,
                minZ: item.pos[2] - item.size[2] / 2, maxZ: item.pos[2] + item.size[2] / 2,
                isLadder: item.isLadder || false
            };
            if (bounds.isLadder) ladders.push(bounds);
            else colliders.push(bounds);
        });

        // R6 CHARACTER RIG
        const playerGroup = new THREE.Group();
        function mkPart(w, h, d, color, x = 0, y = 0, z = 0) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
            mesh.position.set(x, y, z);
            mesh.castShadow = true; mesh.receiveShadow = true;
            return mesh;
        }

        const S = 0.48, BODY_Y = 2 * S, YELLOW = 0xf5cd2f, SEA_BLUE = 0x1f4e9c, LEAF_GREEN = 0x3fa34d;
        const torso = mkPart(2 * S, 2 * S, 1 * S, SEA_BLUE, 0, S, 0);

        const faceCanvas = document.createElement("canvas");
        faceCanvas.width = 128; faceCanvas.height = 128;
        const ctxCanvas = faceCanvas.getContext("2d");
        ctxCanvas.fillStyle = "#f5cd2f"; ctxCanvas.fillRect(0, 0, 128, 128);
        ctxCanvas.fillStyle = "#000";
        ctxCanvas.beginPath(); ctxCanvas.ellipse(46, 48, 4, 8, 0, 0, Math.PI * 2); ctxCanvas.fill();
        ctxCanvas.beginPath(); ctxCanvas.ellipse(82, 48, 4, 8, 0, 0, Math.PI * 2); ctxCanvas.fill();
        ctxCanvas.lineWidth = 5; ctxCanvas.strokeStyle = "#000"; ctxCanvas.lineCap = "round";
        ctxCanvas.beginPath(); ctxCanvas.arc(64, 60, 22, 0.15 * Math.PI, 0.85 * Math.PI); ctxCanvas.stroke();

        const headMat = new THREE.MeshLambertMaterial({ color: YELLOW });
        const faceMat = new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(faceCanvas) });
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), [headMat, headMat, headMat, headMat, faceMat, headMat]);
        head.position.set(0, 2 * S + 0.3, 0);
        head.castShadow = true; head.receiveShadow = true;

        const upperBody = new THREE.Group();
        upperBody.position.set(0, BODY_Y, 0);
        upperBody.add(torso); upperBody.add(head);
        playerGroup.add(upperBody);

        function mkLimb(x, y, w, h, d, color) {
            const pivot = new THREE.Group();
            pivot.position.set(x, y, 0);
            pivot.add(mkPart(w, h, d, color, 0, -h / 2, 0));
            playerGroup.add(pivot);
            return pivot;
        }

        const legL = mkLimb(-0.245, BODY_Y, S, 2 * S, S, LEAF_GREEN);
        const legR = mkLimb(0.245, BODY_Y, S, 2 * S, S, LEAF_GREEN);
        const armL = mkLimb(-0.72, 4 * S, S, 2 * S, S, YELLOW);
        const armR = mkLimb(0.72, 4 * S, S, 2 * S, S, YELLOW);
        scene.add(playerGroup);

        const player = { hp: 200, isDead: false, pos: new THREE.Vector3(0, 4, 0), vel: new THREE.Vector3() };
        const SPEED = 10, CLIMB_SPEED = 7, GRAVITY = -38, JUMP = 13.5, RADIUS = 0.35, HEIGHT = 2.4;
        let grounded = false, isClimbing = false, yaw = 0, pitch = 0.4, camDist = 8;

        function pressJump() {
            if (isClimbing) { isClimbing = false; player.vel.y = JUMP * 0.8; }
            else if (grounded && !player.isDead) { player.vel.y = JUMP; grounded = false; }
        }

        const keys = {}; const joy = { x: 0, z: 0 };
        window.addEventListener("keydown", e => { keys[e.code] = true; if (e.code === "Space") { e.preventDefault(); pressJump(); } });
        window.addEventListener("keyup", e => { keys[e.code] = false; });

        const joyZone = document.getElementById("joystick-zone");
        const joyKnob = document.getElementById("joystick-knob");
        let joyId = null, joyCenter = { x: 0, y: 0 };

        joyZone.addEventListener("pointerdown", e => {
            e.preventDefault(); if (joyId !== null || player.isDead) return;
            joyId = e.pointerId;
            const r = joyZone.getBoundingClientRect();
            joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            updateJoy(e);
        });

        function updateJoy(e) {
            if (player.isDead) return;
            const dx = e.clientX - joyCenter.x, dy = e.clientY - joyCenter.y;
            const dist = Math.min(Math.hypot(dx, dy), 50), ang = Math.atan2(dy, dx);
            joyKnob.style.transform = `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px))`;
            joy.x = Math.cos(ang) * dist / 50; joy.z = Math.sin(ang) * dist / 50;
        }

        function resetJoy() { joyId = null; joyKnob.style.transform = "translate(-50%,-50%)"; joy.x = 0; joy.z = 0; }
        document.getElementById("btn-jump").addEventListener("pointerdown", e => { e.preventDefault(); pressJump(); });

        let camId = null, lastX = 0, lastY = 0;
        renderer.domElement.addEventListener("pointerdown", e => {
            if (camId !== null || player.isDead) return;
            camId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
        });

        window.addEventListener("pointermove", e => {
            if (e.pointerId === joyId) updateJoy(e);
            if (e.pointerId === camId && !player.isDead) {
                yaw -= (e.clientX - lastX) * 0.006;
                pitch = Math.max(-0.1, Math.min(1.4, pitch + (e.clientY - lastY) * 0.006));
                lastX = e.clientX; lastY = e.clientY;
            }
        });

        function releasePointer(e) {
            if (e.pointerId === joyId) resetJoy();
            if (e.pointerId === camId) camId = null;
        }
        window.addEventListener("pointerup", releasePointer);
        window.addEventListener("pointercancel", releasePointer);

        document.getElementById("btn-zin").onclick = () => { camDist = Math.max(3, camDist - 2); };
        document.getElementById("btn-zout").onclick = () => { camDist = Math.min(18, camDist + 2); };

        document.getElementById("respawn-btn").onclick = () => {
            player.hp = 200; player.isDead = false; isClimbing = false;
            player.pos.set(0, 4, 0); player.vel.set(0, 0, 0);
            grounded = false; yaw = 0; pitch = 0.4; camId = null;
            resetJoy(); playerGroup.visible = true;
            document.getElementById("death-screen").style.display = "none";
        };

        function resolvePhysics(dt) {
            let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
            let iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
            ix += joy.x; iz += joy.z;
            const len = Math.hypot(ix, iz);
            if (len > 1) { ix /= len; iz /= len; }

            const targetDirX = Math.cos(yaw) * ix + Math.sin(yaw) * iz;
            const targetDirZ = -Math.sin(yaw) * ix + Math.cos(yaw) * iz;
            const moving = Math.hypot(targetDirX, targetDirZ) > 0.1;

            let touchingLadder = false;
            for (const lad of ladders) {
                if (
                    player.pos.x + RADIUS + 0.2 > lad.minX && player.pos.x - RADIUS - 0.2 < lad.maxX &&
                    player.pos.z + RADIUS + 0.2 > lad.minZ && player.pos.z - RADIUS - 0.2 < lad.maxZ &&
                    player.pos.y < lad.maxY && player.pos.y + HEIGHT > lad.minY
                ) { touchingLadder = true; break; }
            }

            if (touchingLadder && moving) isClimbing = true;
            else if (!touchingLadder) isClimbing = false;

            if (isClimbing) {
                player.vel.y = -iz * CLIMB_SPEED;
                player.vel.x = targetDirX * (SPEED * 0.3);
                player.vel.z = targetDirZ * (SPEED * 0.3);
            } else {
                if (moving) {
                    const accel = grounded ? 14 : 6;
                    player.vel.x += (targetDirX * SPEED - player.vel.x) * Math.min(dt * accel, 1);
                    player.vel.z += (targetDirZ * SPEED - player.vel.z) * Math.min(dt * accel, 1);
                } else {
                    const friction = grounded ? 12 : 2;
                    player.vel.x -= player.vel.x * Math.min(dt * friction, 1);
                    player.vel.z -= player.vel.z * Math.min(dt * friction, 1);
                }
                player.vel.y += GRAVITY * dt;
            }

            const oldX = player.pos.x;
            player.pos.x += player.vel.x * dt;
            for (const b of colliders) {
                const cx = Math.max(b.minX, Math.min(player.pos.x, b.maxX));
                const cz = Math.max(b.minZ, Math.min(player.pos.z, b.maxZ));
                if (player.pos.y < b.maxY && player.pos.y + HEIGHT > b.minY && Math.hypot(player.pos.x - cx, player.pos.z - cz) < RADIUS) {
                    player.pos.x = oldX; player.vel.x = 0; break;
                }
            }

            const oldZ = player.pos.z;
            player.pos.z += player.vel.z * dt;
            for (const b of colliders) {
                const cx = Math.max(b.minX, Math.min(player.pos.x, b.maxX));
                const cz = Math.max(b.minZ, Math.min(player.pos.z, b.maxZ));
                if (player.pos.y < b.maxY && player.pos.y + HEIGHT > b.minY && Math.hypot(player.pos.x - cx, player.pos.z - cz) < RADIUS) {
                    player.pos.z = oldZ; player.vel.z = 0; break;
                }
            }

            const oldY = player.pos.y;
            player.pos.y += player.vel.y * dt;
            grounded = false;

            for (const b of colliders) {
                if (player.pos.x + RADIUS > b.minX && player.pos.x - RADIUS < b.maxX && player.pos.z + RADIUS > b.minZ && player.pos.z - RADIUS < b.maxZ) {
                    if (player.vel.y <= 0 && oldY >= b.maxY && player.pos.y <= b.maxY) {
                        player.pos.y = b.maxY; player.vel.y = 0; grounded = true; isClimbing = false;
                    } else if (player.vel.y > 0 && oldY + HEIGHT <= b.minY && player.pos.y + HEIGHT >= b.minY) {
                        player.pos.y = b.minY - HEIGHT; player.vel.y = 0;
                    }
                }
            }
            return { moving, targetDirX, targetDirZ };
        }

        const clock = new THREE.Clock();
        let walkPhase = 0;
        let animationFrameId = null;
        const vector3Screen = new THREE.Vector3();

        function animate() {
            animationFrameId = requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.05);

            if (!player.isDead) {
                const { moving, targetDirX, targetDirZ } = resolvePhysics(dt);

                if (player.pos.y < -60) {
                    player.hp = 0; player.isDead = true;
                    document.getElementById("death-screen").style.display = "flex";
                    resetJoy(); camId = null;
                    if (activeChatBubble) { activeChatBubble.remove(); activeChatBubble = null; }
                }

                document.getElementById("hp-text").textContent = player.hp;
                playerGroup.position.copy(player.pos);

                if (activeChatBubble) {
                    const headPos = player.pos.clone().add(new THREE.Vector3(0, 2.6, 0));
                    vector3Screen.copy(headPos);
                    vector3Screen.project(camera);
                    const x = (vector3Screen.x *  .5 + .5) * window.innerWidth;
                    const y = (vector3Screen.y * -.5 + .5) * window.innerHeight;
                    activeChatBubble.style.left = `${x}px`;
                    activeChatBubble.style.top = `${y}px`;
                }

                if (moving) {
                    const targetRot = Math.atan2(targetDirX, targetDirZ);
                    let diff = targetRot - playerGroup.rotation.y;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    playerGroup.rotation.y += diff * Math.min(dt * 12, 1);
                }

                const time = clock.getElapsedTime();

                if (isClimbing) {
                    walkPhase += dt * 12;
                    const sw = Math.sin(walkPhase) * 0.5;
                    armL.rotation.x = -1.2 + sw; armR.rotation.x = -1.2 - sw;
                    legL.rotation.x = sw; legR.rotation.x = -sw;
                } else if (!grounded) {
                    armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, -0.6, dt * 10);
                    armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, -0.6, dt * 10);
                    legL.rotation.x = THREE.MathUtils.lerp(legL.rotation.x, 0.3, dt * 10);
                    legR.rotation.x = THREE.MathUtils.lerp(legR.rotation.x, -0.3, dt * 10);
                    upperBody.position.y = THREE.MathUtils.lerp(upperBody.position.y, BODY_Y, dt * 10);
                } else if (moving) {
                    walkPhase += dt * 18;
                    const sw = Math.sin(walkPhase) * 0.85;
                    legL.rotation.x = THREE.MathUtils.lerp(legL.rotation.x, sw, dt * 15);
                    legR.rotation.x = THREE.MathUtils.lerp(legR.rotation.x, -sw, dt * 15);
                    armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, -sw, dt * 15);
                    armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, sw, dt * 15);
                    upperBody.position.y = BODY_Y + Math.abs(Math.sin(walkPhase * 2)) * 0.09;
                } else {
                    const breath = Math.sin(time * 4) * 0.03;
                    upperBody.position.y = THREE.MathUtils.lerp(upperBody.position.y, BODY_Y + breath, dt * 10);
                    legL.rotation.x = THREE.MathUtils.lerp(legL.rotation.x, 0, dt * 10);
                    legR.rotation.x = THREE.MathUtils.lerp(legR.rotation.x, 0, dt * 10);
                    armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, 0, dt * 10);
                    armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, 0, dt * 10);
                }

                const playerHeadPos = new THREE.Vector3(player.pos.x, player.pos.y + 1.2, player.pos.z);
                const idealCamX = player.pos.x + Math.sin(yaw) * Math.cos(pitch) * camDist;
                const idealCamY = player.pos.y + 1.2 + Math.sin(pitch) * camDist;
                co
