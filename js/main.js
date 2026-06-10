// ===== 和易云电力工程ERP 官网交互 =====

// 1. 滚动时导航栏变实色
const header = document.getElementById('siteHeader');
const onScroll = () => {
    if (window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
};
window.addEventListener('scroll', onScroll);
onScroll();

// 2. 移动端菜单开关
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
if (navToggle) {
    navToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
    mainNav.querySelectorAll('a').forEach(a =>
        a.addEventListener('click', () => mainNav.classList.remove('open'))
    );
}

// 3. 数字滚动动画
function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const duration = 1400;
    const start = performance.now();
    function step(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = target * eased;
        el.textContent = Number.isInteger(target)
            ? Math.floor(val).toLocaleString()
            : val.toFixed(1);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(step);
}

// 4. 进入视口时触发：数字 + 区块淡入
const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const t = entry.target;
        if (t.dataset.count !== undefined) animateCount(t);
        if (t.classList.contains('reveal')) t.classList.add('show');
        io.unobserve(t);
    });
}, { threshold: 0.25 });

document.querySelectorAll('[data-count]').forEach(el => io.observe(el));

// 给主要区块加淡入动画
document.querySelectorAll('.section, .stats, .cta').forEach(sec => {
    sec.classList.add('reveal');
    io.observe(sec);
});

// 5. 表单提交（演示用，无后端）
function handleContact(e) {
    e.preventDefault();
    const form = e.target;
    const tip = document.getElementById('formTip');
    const name = form.name.value.trim();
    tip.textContent = `感谢 ${name}，我们的顾问将尽快与您联系！（演示提交，未对接后端）`;
    form.reset();
    return false;
}
