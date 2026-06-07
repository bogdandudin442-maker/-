(function(){
    // === АБСОЛЮТНАЯ СИМУЛЯЦИЯ БОЕВОЙ СИСТЕМЫ ===
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    const W = 1000, H = 600;
    
    let player = {
        x: W/2, y: H/2,
        health: 100, maxHealth: 100,
        ammo: 30, maxAmmo: 30,
        invincibleFrames: 0,
        score: 0
    };
    
    let enemies = [];
    let bullets = [];
    let effects = [];
    let shootCooldown = 0;
    let superCooldown = 0;
    let mouseX = player.x, mouseY = player.y;
    
    function clamp(value, min, max){
        return Math.min(max, Math.max(min, value));
    }
    
    function spawnEnemy(){
        let side = Math.floor(Math.random() * 4);
        let x, y;
        const padding = 30;
        if(side === 0){
            x = -padding;
            y = Math.random() * H;
        } else if(side === 2){
            x = W + padding;
            y = Math.random() * H;
        } else if(side === 1){
            x = Math.random() * W;
            y = -padding;
        } else {
            x = Math.random() * W;
            y = H + padding;
        }
        
        let type = Math.floor(Math.random() * 10);
        let enemyType = 0, size = 24, speed = 1.2, hp = 1, color = "#ff3355";
        if(type < 6){
            enemyType = 0; size = 24; speed = 1.2; hp = 1; color = "#ff3355";
        } else if(type < 9){
            enemyType = 1; size = 20; speed = 2.4; hp = 1; color = "#ffaa44";
        } else {
            enemyType = 2; size = 34; speed = 0.9; hp = 2; color = "#aa44ff";
        }
        
        enemies.push({
            x, y, type: enemyType,
            hp: hp, maxHp: hp,
            size: size, speed: speed,
            color: color
        });
    }
    
    function addEffect(x, y, color = "#ff6600"){
        effects.push({ x, y, radius: 12, life: 8, color: color });
    }
    
    function shoot(targetX, targetY, isSuper = false){
        if(shootCooldown > 0 && !isSuper) return;
        if(!isSuper && player.ammo <= 0) return;
        
        if(isSuper){
            if(superCooldown > 0) return;
            superCooldown = 15;
            let dx = targetX - player.x;
            let dy = targetY - player.y;
            let len = Math.hypot(dx, dy);
            if(len === 0) return;
            let dirX = dx / len;
            let dirY = dy / len;
            for(let i=0; i<enemies.length; i++){
                const e = enemies[i];
                let toEnemyX = e.x - player.x;
                let toEnemyY = e.y - player.y;
                let proj = toEnemyX * dirX + toEnemyY * dirY;
                if(proj > 0 && proj < len + e.size){
                    let perpX = toEnemyX - proj * dirX;
                    let perpY = toEnemyY - proj * dirY;
                    let dist = Math.hypot(perpX, perpY);
                    if(dist < e.size + 15){
                        e.hp = 0;
                        addEffect(e.x, e.y, "#ff00ff");
                        player.score += (e.type === 2 ? 30 : 10);
                    }
                }
            }
            addEffect(targetX, targetY, "#ff00aa");
            return;
        }
        
        shootCooldown = 8;
        player.ammo--;
        
        let dx = targetX - player.x;
        let dy = targetY - player.y;
        let angle = Math.atan2(dy, dx);
        let speedX = Math.cos(angle) * 10;
        let speedY = Math.sin(angle) * 10;
        
        bullets.push({
            x: player.x, y: player.y,
            vx: speedX, vy: speedY,
            radius: 5, life: true, damage: 1
        });
    }
    
    function reload(){
        player.ammo = player.maxAmmo;
    }
    
    function resetGame(){
        player.health = player.maxHealth;
        player.ammo = player.maxAmmo;
        player.score = 0;
        player.invincibleFrames = 0;
        enemies = [];
        bullets = [];
        effects = [];
        shootCooldown = 0;
        superCooldown = 0;
        for(let i=0; i<5; i++) spawnEnemy();
    }
    
    function damagePlayer(amount){
        if(player.invincibleFrames > 0) return;
        player.health = Math.max(0, player.health - amount);
        player.invincibleFrames = 20;
        if(player.health <= 0){
            alert("☠️ ВЫ УНИЧТОЖЕНЫ ☠️\nСчет обнулен. СИМУЛЯЦИЯ ПЕРЕЗАПУЩЕНА");
            resetGame();
        }
    }
    
    function update(){
        if(shootCooldown > 0) shootCooldown--;
        if(superCooldown > 0) superCooldown--;
        if(player.invincibleFrames > 0) player.invincibleFrames--;
        
        for(let i=0; i<enemies.length; i++){
            const e = enemies[i];
            let dx = player.x - e.x;
            let dy = player.y - e.y;
            let dist = Math.hypot(dx, dy);
            if(dist > 0.01){
                let move = e.speed;
                e.x += (dx / dist) * move;
                e.y += (dy / dist) * move;
            }
            let playerDist = Math.hypot(player.x - e.x, player.y - e.y);
            if(playerDist < e.size + 20){
                damagePlayer(10);
                let angle = Math.atan2(e.y - player.y, e.x - player.x);
                e.x += Math.cos(angle) * 30;
                e.y += Math.sin(angle) * 30;
            }
            e.x = clamp(e.x, -50, W+50);
            e.y = clamp(e.y, -50, H+50);
        }
        
        for(let i=0; i<bullets.length; i++){
            const b = bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            if(b.x < -100 || b.x > W+100 || b.y < -100 || b.y > H+100){
                bullets.splice(i,1);
                i--;
                continue;
            }
            let hit = false;
            for(let j=0; j<enemies.length; j++){
                const e = enemies[j];
                if(Math.hypot(b.x - e.x, b.y - e.y) < e.size){
                    e.hp -= b.damage;
                    hit = true;
                    addEffect(b.x, b.y, "#ffff00");
                    if(e.hp <= 0){
                        let points = (e.type === 2 ? 30 : (e.type === 1 ? 15 : 10));
                        player.score += points;
                        addEffect(e.x, e.y, "#ff0000");
                        enemies.splice(j,1);
                        j--;
                    }
                    break;
                }
            }
            if(hit){
                bullets.splice(i,1);
                i--;
            }
        }
        
        for(let i=0; i<effects.length; i++){
            effects[i].life--;
            effects[i].radius *= 0.96;
            if(effects[i].life <= 0){
                effects.splice(i,1);
                i--;
            }
        }
        
        if(enemies.length < 8 && Math.random() < 0.02 + (player.score/2000)) spawnEnemy();
        if(enemies.length === 0) for(let i=0;i<3;i++) spawnEnemy();
    }
    
    function draw(){
        ctx.clearRect(0,0,W,H);
        ctx.fillStyle = "#03050f";
        ctx.fillRect(0,0,W,H);
        ctx.strokeStyle = "#0ff1";
        ctx.lineWidth = 1;
        for(let i=0;i<W+20;i+=40){
            ctx.beginPath();
            ctx.moveTo(i,0);
            ctx.lineTo(i,H);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0,i%H);
            ctx.lineTo(W,i%H);
            ctx.stroke();
        }
        
        for(const e of enemies){
            let grad = ctx.createRadialGradient(e.x-5, e.y-5, 5, e.x, e.y, e.size);
            grad.addColorStop(0, e.color);
            grad.addColorStop(1, "#aa0000");
            ctx.shadowBlur = 12;
            ctx.shadowColor = "#ff0000aa";
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size-2, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.font = "bold 18 monospace";
            ctx.shadowBlur = 0;
            if(e.type === 2){
                ctx.fillStyle = "#ffccff";
                ctx.fillText("💀", e.x-12, e.y-12);
                for(let i=0;i<e.hp;i++){
                    ctx.fillStyle = "#ff66ff";
                    ctx.fillRect(e.x-15 + i*10, e.y-18, 6, 6);
                }
            } else if(e.type === 1){
                ctx.fillStyle = "#ffaa44";
                ctx.fillText("⚡", e.x-8, e.y-12);
            } else {
                ctx.fillStyle = "#ff7788";
                ctx.fillText("👹", e.x-10, e.y-12);
            }
        }
        
        for(const b of bullets){
            ctx.shadowBlur = 8;
            ctx.fillStyle = "#ffff00";
            ctx.beginPath();
            ctx.arc(b.x, b.y, 5, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = "orange";
            ctx.beginPath();
            ctx.arc(b.x, b.y, 2, 0, Math.PI*2);
            ctx.fill();
        }
        
        for(const ef of effects){
            ctx.globalAlpha = ef.life / 8;
            ctx.fillStyle = ef.color;
            ctx.beginPath();
            ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#0ff";
        ctx.fillStyle = "#88ffdd";
        ctx.beginPath();
        ctx.arc(player.x, player.y, 22, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = "#2266aa";
        ctx.beginPath();
        ctx.arc(player.x, player.y, 15, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 30 monospace";
        ctx.fillText("⛧", player.x-13, player.y+12);
        ctx.fillStyle = "#0ff";
        ctx.font = "bold 12 monospace";
        ctx.fillText("NETERRROR", player.x-30, player.y-18);
        
        ctx.beginPath();
        ctx.strokeStyle = "#0ff";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.arc(mouseX, mouseY, 12, 0, Math.PI*2);
        ctx.stroke();
        ctx.moveTo(mouseX-20, mouseY);
        ctx.lineTo(mouseX-8, mouseY);
        ctx.moveTo(mouseX+20, mouseY);
        ctx.lineTo(mouseX+8, mouseY);
        ctx.moveTo(mouseX, mouseY-20);
        ctx.lineTo(mouseX, mouseY-8);
        ctx.moveTo(mouseX, mouseY+20);
        ctx.lineTo(mouseX, mouseY+8);
        ctx.stroke();
        
        document.getElementById('healthValue').innerText = player.health;
        document.getElementById('ammoValue').innerText = player.ammo;
        document.getElementById('scoreValue').innerText = player.score;
        let hpElement = document.getElementById('healthValue');
        if(player.health < 30) hpElement.classList.add('low-hp');
        else hpElement.classList.remove('low-hp');
    }
    
    function onMouseMove(e){
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let canvasX = (e.clientX - rect.left) * scaleX;
        let canvasY = (e.clientY - rect.top) * scaleY;
        mouseX = clamp(canvasX, 0, W);
        mouseY = clamp(canvasY, 0, H);
    }
    
    function onMouseDown(e){
        e.preventDefault();
        if(e.button === 0){
            shoot(mouseX, mouseY, e.shiftKey);
        }
    }
    
    function onKeyDown(e){
        if(e.code === 'Space'){
            e.preventDefault();
            shoot(mouseX, mouseY, false);
        }
        if(e.code === 'KeyR'){
            e.preventDefault();
            reload();
        }
        if(e.code === 'Home'){
            resetGame();
        }
    }
    
    function init(){
        resetGame();
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('keydown', onKeyDown);
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        document.getElementById('resetBtn').addEventListener('click', () => resetGame());
        
        function gameLoop(){
            update();
            draw();
            requestAnimationFrame(gameLoop);
        }
        gameLoop();
    }
    
    init();
})();
