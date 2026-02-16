// Buttery smooth scroll animations and transitions
(function() {
    // Smooth scroll observer with intersection API
    const observerOptions = {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
        rootMargin: '-10% 0px -10% 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add visible class with delay based on index
                const delay = parseInt(entry.target.dataset.delay || 0);
                setTimeout(() => {
                    entry.target.classList.add('is-visible');
                }, delay);
            }
        });
    }, observerOptions);

    // Observe all animated elements
    function initScrollAnimations() {
        // Hero section elements
        const heroTitle = document.querySelector('#hero h1');
        const heroSubtitle = document.querySelector('#hero p');
        const heroButtons = document.querySelectorAll('#hero .btn-primary, #hero .btn-secondary');

        if (heroTitle) {
            heroTitle.classList.add('animate-fade-up');
            heroTitle.dataset.delay = '100';
            observer.observe(heroTitle);
        }

        if (heroSubtitle) {
            heroSubtitle.classList.add('animate-fade-up');
            heroSubtitle.dataset.delay = '200';
            observer.observe(heroSubtitle);
        }

        heroButtons.forEach((btn, i) => {
            btn.classList.add('animate-fade-up');
            btn.dataset.delay = (300 + i * 100).toString();
            observer.observe(btn);
        });

        // Demo section
        const demoHeader = document.querySelector('#demo-section .demo-header');
        const demoContainer = document.getElementById('demo-container');

        if (demoHeader) {
            demoHeader.classList.add('animate-fade-up');
            observer.observe(demoHeader);
        }

        if (demoContainer) {
            demoContainer.classList.add('animate-scale-up');
            observer.observe(demoContainer);
        }

        // Tech section
        const techTitle = document.querySelector('#tech h2');
        const techCards = document.querySelectorAll('.tech-card');
        const statsBar = document.querySelector('#tech > div > div > div:last-child');

        if (techTitle) {
            techTitle.classList.add('animate-fade-up');
            observer.observe(techTitle);
        }

        techCards.forEach((card, i) => {
            card.classList.add('animate-slide-right');
            card.dataset.delay = (i * 100).toString();
            observer.observe(card);
        });

        if (statsBar) {
            statsBar.classList.add('animate-fade-up');
            statsBar.dataset.delay = '200';
            observer.observe(statsBar);
        }

        // Download section
        const downloadSection = document.querySelector('#download');
        if (downloadSection) {
            const downloadTitle = downloadSection.querySelector('h2');
            const downloadButtons = downloadSection.querySelector('#download-buttons');

            if (downloadTitle) {
                downloadTitle.classList.add('animate-fade-up');
                observer.observe(downloadTitle);
            }

            if (downloadButtons) {
                downloadButtons.classList.add('animate-fade-up');
                downloadButtons.dataset.delay = '150';
                observer.observe(downloadButtons);
            }
        }
    }

    // Parallax scroll effect for hero
    let ticking = false;
    let lastScrollY = window.scrollY;

    function updateParallax() {
        const scrollY = window.scrollY;
        const hero = document.querySelector('#hero');
        const heroContent = document.querySelector('#hero > div');

        if (hero && heroContent && scrollY < window.innerHeight) {
            // Subtle parallax
            const offset = scrollY * 0.5;
            heroContent.style.transform = `translateY(${offset}px)`;

            // Fade out hero as you scroll
            const opacity = 1 - (scrollY / window.innerHeight) * 0.7;
            heroContent.style.opacity = Math.max(0.3, opacity);
        }

        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick, { passive: true });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add floating effect to hero audio viz
    const audioViz = document.getElementById('audio-viz');
    if (audioViz) {
        let floatOffset = 0;

        function animateFloat() {
            floatOffset += 0.01;
            const y = Math.sin(floatOffset) * 3;
            audioViz.style.transform = `translateY(${y}px)`;
            requestAnimationFrame(animateFloat);
        }

        animateFloat();
    }

    // Magnetic effect for buttons
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');

    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        });

        btn.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            const moveX = x * 0.1;
            const moveY = y * 0.1;

            this.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });

        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translate(0, 0)';
        });
    });

    // Reveal header on scroll up
    let lastScroll = 0;
    const header = document.querySelector('nav');

    if (header) {
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;

            if (currentScroll <= 0) {
                header.style.transform = 'translateY(0)';
                header.style.boxShadow = 'none';
            } else if (currentScroll > lastScroll && currentScroll > 100) {
                // Scrolling down
                header.style.transform = 'translateY(-100%)';
            } else {
                // Scrolling up
                header.style.transform = 'translateY(0)';
                header.style.boxShadow = '0 1px 0 rgba(168, 162, 158, 0.08)';
            }

            lastScroll = currentScroll;
        }, { passive: true });
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollAnimations);
    } else {
        initScrollAnimations();
    }

    // Stagger animation for stats
    const stats = document.querySelectorAll('#tech .mono.accent');
    if (stats.length > 0) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    const finalValue = target.textContent;

                    // Animate numbers
                    if (finalValue.includes('ms') || finalValue.includes('MB') || finalValue.includes('%')) {
                        target.style.opacity = '0';
                        setTimeout(() => {
                            target.style.transition = 'opacity 0.6s ease';
                            target.style.opacity = '1';
                        }, parseInt(target.closest('div').parentElement.dataset.delay || 0));
                    }

                    statsObserver.unobserve(target);
                }
            });
        }, { threshold: 0.5 });

        stats.forEach((stat, i) => {
            stat.closest('div').parentElement.dataset.delay = (i * 100).toString();
            statsObserver.observe(stat);
        });
    }
})();
