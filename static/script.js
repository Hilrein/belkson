/* Tailwind theme config (must load after CDN) */
tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        "colors": {
                "surface-tint": "#8a4193",
                "surface-container": "#f2ebff",
                "tertiary-fixed-dim": "#e9c266",
                "on-tertiary-container": "#fcd475",
                "on-primary-fixed-variant": "#6f2879",
                "on-primary-fixed": "#36003f",
                "secondary": "#006a63",
                "tertiary-container": "#775a00",
                "primary-fixed-dim": "#faabff",
                "on-error-container": "#93000a",
                "background": "#fdf7ff",
                "on-surface-variant": "#4f434e",
                "on-tertiary-fixed": "#251a00",
                "surface-bright": "#fdf7ff",
                "surface": "#fdf7ff",
                "secondary-container": "#9deee5",
                "surface-container-low": "#f7f1ff",
                "on-tertiary": "#ffffff",
                "primary": "#6f2879",
                "gold-fixed": "#ffdf98",
                "surface-variant": "#e6dff8",
                "secondary-fixed": "#a0f1e8",
                "inverse-on-surface": "#f5eeff",
                "surface-container-highest": "#e6dff8",
                "on-primary-container": "#ffc7ff",
                "outline": "#81737f",
                "surface-container-high": "#ece4fe",
                "on-primary": "#ffffff",
                "lavender-tint": "#ce7ed5",
                "primary-container": "#8a4193",
                "surface-dim": "#ded6ef",
                "on-secondary": "#ffffff",
                "error": "#ba1a1a",
                "surface-lowest": "#ffffff",
                "tertiary": "#5a4300",
                "on-surface": "#1d192b",
                "secondary-fixed-dim": "#84d5cc",
                "inverse-primary": "#faabff",
                "tertiary-fixed": "#ffdf99",
                "on-secondary-container": "#0c6f67",
                "error-container": "#ffdad6",
                "on-error": "#ffffff",
                "surface-container-lowest": "#ffffff",
                "primary-fixed": "#ffd6fd",
                "on-tertiary-fixed-variant": "#5a4300",
                "on-background": "#1d192b",
                "inverse-surface": "#322e41",
                "on-secondary-fixed": "#00201d",
                "outline-variant": "#d2c2cf",
                "mint-container": "#80f6e9",
                "on-secondary-fixed-variant": "#00504a"
        },
        "borderRadius": {
                "DEFAULT": "1rem",
                "lg": "2rem",
                "xl": "3rem",
                "full": "9999px"
        },
        "spacing": {
                "margin-mobile": "16px",
                "unit": "8px",
                "margin-desktop": "48px",
                "touch-target": "48px",
                "gutter": "24px"
        },
        "fontFamily": {
                "headline-md": [
                        "Quicksand"
                ],
                "display-lg-mobile": [
                        "Quicksand"
                ],
                "body-md": [
                        "Quicksand"
                ],
                "label-sm": [
                        "Quicksand"
                ],
                "label-xs": [
                        "Quicksand"
                ],
                "body-lg": [
                        "Quicksand"
                ],
                "display-lg": [
                        "Quicksand"
                ]
        },
        "fontSize": {
                "headline-md": [
                        "24px",
                        {
                                "lineHeight": "32px",
                                "fontWeight": "600"
                        }
                ],
                "display-lg-mobile": [
                        "32px",
                        {
                                "lineHeight": "40px",
                                "letterSpacing": "-0.02em",
                                "fontWeight": "700"
                        }
                ],
                "body-md": [
                        "16px",
                        {
                                "lineHeight": "24px",
                                "fontWeight": "500"
                        }
                ],
                "label-sm": [
                        "14px",
                        {
                                "lineHeight": "20px",
                                "letterSpacing": "0.05em",
                                "fontWeight": "700"
                        }
                ],
                "label-xs": [
                        "10px",
                        {
                                "lineHeight": "12px",
                                "fontWeight": "700"
                        }
                ],
                "body-lg": [
                        "18px",
                        {
                                "lineHeight": "28px",
                                "fontWeight": "500"
                        }
                ],
                "display-lg": [
                        "48px",
                        {
                                "lineHeight": "56px",
                                "letterSpacing": "-0.02em",
                                "fontWeight": "700"
                        }
                ]
        }
},
    },
  }

/* App logic */
// Simple Carousel Logic for Hero
    document.addEventListener('DOMContentLoaded', () => {
        const track = document.getElementById('hero-carousel');
        if(track) {
            const slides = track.children;
            const indicators = document.querySelectorAll('.absolute.bottom-6 button');
            let currentIndex = 0;

            function updateCarousel() {
                track.style.transform = `translateX(-${currentIndex * 100}%)`;
                indicators.forEach((ind, index) => {
                    if (index === currentIndex) {
                        ind.classList.remove('bg-outline-variant');
                        ind.classList.add('bg-primary');
                    } else {
                        ind.classList.add('bg-outline-variant');
                        ind.classList.remove('bg-primary');
                    }
                });
            }

            setInterval(() => {
                currentIndex = (currentIndex + 1) % slides.length;
                updateCarousel();
            }, 6000);

            indicators.forEach((ind, index) => {
                ind.addEventListener('click', () => {
                    currentIndex = index;
                    updateCarousel();
                });
            });
        }
    });

    // Toggle Search Bar
    function toggleSearch() {
        const input = document.getElementById('header-search-input');
        if (input.classList.contains('w-0')) {
            input.classList.remove('w-0', 'opacity-0');
            input.classList.add('w-48', 'md:w-64', 'opacity-100');
            input.focus();
        } else {
            input.classList.add('w-0', 'opacity-0');
            input.classList.remove('w-48', 'md:w-64', 'opacity-100');
            input.blur();
            input.value = '';
        }
    }

    // Toggle Shopping Cart Overlay
    function toggleCart() {
        const overlay = document.getElementById('cart-overlay');
        const backdrop = document.getElementById('cart-backdrop');
        const panel = document.getElementById('cart-panel');
        const body = document.body;

        const isOpen = !overlay.classList.contains('pointer-events-none');

        if (isOpen) {
            // Close
            backdrop.classList.remove('opacity-100');
            backdrop.classList.add('opacity-0');
            panel.classList.add('translate-x-full');
            panel.classList.remove('translate-x-0');
            
            setTimeout(() => {
                overlay.classList.add('pointer-events-none');
                body.style.overflow = '';
            }, 300);
        } else {
            // Open
            overlay.classList.remove('pointer-events-none');
            body.style.overflow = 'hidden';
            
            // tiny delay to ensure display block is registered before opacity transition
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                backdrop.classList.add('opacity-100');
                panel.classList.remove('translate-x-full');
                panel.classList.add('translate-x-0');
            }, 10);
        }
    }
    
    // Toggle Navigation Drawer Overlay
    function toggleNavDrawer() {
        const overlay = document.getElementById('nav-overlay');
        const backdrop = document.getElementById('nav-backdrop');
        const panel = document.getElementById('nav-panel');
        const body = document.body;

        const isOpen = !overlay.classList.contains('pointer-events-none');

        if (isOpen) {
            // Close
            backdrop.classList.remove('opacity-100');
            backdrop.classList.add('opacity-0');
            panel.classList.add('-translate-x-full');
            panel.classList.remove('translate-x-0');
            
            setTimeout(() => {
                overlay.classList.add('pointer-events-none');
                body.style.overflow = '';
            }, 300);
        } else {
            // Open
            overlay.classList.remove('pointer-events-none');
            body.style.overflow = 'hidden';
            
            // tiny delay to ensure display block is registered before opacity transition
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                backdrop.classList.add('opacity-100');
                panel.classList.remove('-translate-x-full');
                panel.classList.add('translate-x-0');
            }, 10);
        }
    }

    // Scroll New Arrivals Carousel
    function scrollNewArrivals(direction) {
        const container = document.getElementById('new-arrivals-container');
        if(container) {
            const scrollAmount = container.clientWidth * 0.8;
            container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
        }
    }

