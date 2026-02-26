const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let blocks = [];
let particles = [];

function createBlock() {
    return {
        x: Math.random() * canvas.width,
        y: -20,
        size: 20,
        speed: 2 + Math.random() * 2
    };
}

function createExplosion(x, y) {
    for (let i = 0; i < 40; i++) {
        particles.push({
            x: x,
            y: y,
            radius: 2,
            dx: (Math.random() - 0.5) * 6,
            dy: (Math.random() - 0.5) * 6,
            life: 60
        });
    }
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (blocks.length < 40) {
        blocks.push(createBlock());
    }

    blocks.forEach(block => {
        block.y += block.speed;
        ctx.fillStyle = "#5aa9ff";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#5aa9ff";
        ctx.fillRect(block.x, block.y, block.size, block.size);

        if (block.y > canvas.height - 40) {
            createExplosion(block.x, block.y);
        }
    });

    particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        ctx.fillStyle = "#5aa9ff";
        ctx.fillRect(p.x, p.y, p.radius, p.radius);
    });

    particles = particles.filter(p => p.life > 0);
    blocks = blocks.filter(block => block.y < canvas.height);

    requestAnimationFrame(update);
}

update();

setTimeout(() => {
    document.getElementById("intro").style.display = "none";
    document.getElementById("content").style.opacity = "1";
}, 4000);

const faders = document.querySelectorAll(".fade");

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
        }
    });
});

faders.forEach(section => {
    observer.observe(section);
});