(function () {
    "use strict";

    const ChainLabs = window.ChainLabs = window.ChainLabs || {};

    const state = {
        initialized: false,
        ready: false,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        libraries: {
            jquery: typeof window.jQuery !== "undefined",
            gsap: typeof window.gsap !== "undefined",
            scrollTrigger: typeof window.ScrollTrigger !== "undefined",
            splitText: typeof window.SplitText !== "undefined",
            scrambleText: typeof window.ScrambleTextPlugin !== "undefined",
            lenis: typeof window.Lenis !== "undefined",
            swiper: typeof window.Swiper !== "undefined",
            unicornStudio: typeof window.UnicornStudio !== "undefined"
        }
    };

    ChainLabs.runtime = state;

    function logRuntime() {
        console.groupCollapsed("[ChainLabs] Runtime");

        console.table({
            initialized: state.initialized,
            ready: state.ready,
            reducedMotion: state.reducedMotion,
            jquery: state.libraries.jquery,
            gsap: state.libraries.gsap,
            scrollTrigger: state.libraries.scrollTrigger,
            splitText: state.libraries.splitText,
            scrambleText: state.libraries.scrambleText,
            lenis: state.libraries.lenis,
            swiper: state.libraries.swiper,
            unicornStudio: state.libraries.unicornStudio
        });

        console.groupEnd();
    }

    function getElement(selector) {
        return document.querySelector(selector);
    }

    function hidePreloader() {
        const preloader = getElement("#preloader");

        if (!preloader) {
            return;
        }

        preloader.style.display = "none";
        preloader.setAttribute("aria-hidden", "true");
    }

    function revealPreloader() {
        const preloader = getElement("#preloader");

        if (!preloader) {
            return;
        }

        preloader.style.display = "block";
        preloader.removeAttribute("aria-hidden");
    }

    function startLenis() {
        if (!state.libraries.lenis || state.reducedMotion) {
            return null;
        }

        if (ChainLabs.lenis) {
            ChainLabs.lenis.start();
            return ChainLabs.lenis;
        }

        const lenis = new window.Lenis({
            autoRaf: true,
            smoothWheel: true,
            syncTouch: false
        });

        ChainLabs.lenis = lenis;

        return lenis;
    }

    function stopLenis() {
        if (ChainLabs.lenis && typeof ChainLabs.lenis.stop === "function") {
            ChainLabs.lenis.stop();
        }
    }

    function getPixels() {
        const preloader = getElement("#preloader");

        if (!preloader) {
            return [];
        }

        return Array.from(
            preloader.querySelectorAll(".pixel")
        );
    }

    function hideZeroCounters() {
        document.querySelectorAll("#zero1, #zero2, #zero3").forEach(function (element) {
            element.style.display = "none";
        });
    }

    function prepareZeroCounters() {
        document.querySelectorAll("#zero1, #zero2, #zero3").forEach(function (element, index) {
            element.style.display = "flex";
            element.style.opacity = "1";

            const existingSpan = element.querySelector("span");

            if (existingSpan) {
                existingSpan.remove();
            }

            const value = element.textContent.trim() || "0";

            element.textContent = "";

            const span = document.createElement("span");
            span.textContent = value;
            span.id = "zeroText" + (index + 1);

            element.appendChild(span);
        });
    }

    function flickerCounters() {
        if (!state.libraries.gsap) {
            return Promise.resolve();
        }

        const spans = [
            getElement("#zeroText1"),
            getElement("#zeroText2"),
            getElement("#zeroText3")
        ].filter(Boolean);

        if (spans.length === 0) {
            return Promise.resolve();
        }

        if (!state.libraries.splitText) {
            return new Promise(function (resolve) {
                window.gsap.fromTo(
                    spans,
                    {
                        opacity: 0
                    },
                    {
                        opacity: 1,
                        duration: 0.8,
                        stagger: 0.08,
                        ease: "power2.out",
                        onComplete: resolve
                    }
                );
            });
        }

        const characters = [];

        spans.forEach(function (span) {
            const split = new window.SplitText(span, {
                type: "chars"
            });

            characters.push.apply(characters, split.chars);
        });

        return new Promise(function (resolve) {
            window.gsap.fromTo(
                characters,
                {
                    autoAlpha: 0
                },
                {
                    autoAlpha: 1,
                    duration: 0.7,
                    stagger: {
                        each: 0.05,
                        from: "random"
                    },
                    ease: "power2.out",
                    onComplete: resolve
                }
            );
        });
    }

    function runCounterSequence() {
        const counterElements = [
            getElement("#zeroText1"),
            getElement("#zeroText2"),
            getElement("#zeroText3")
        ];

        if (counterElements.some(function (element) {
            return !element;
        })) {
            return Promise.resolve();
        }

        return new Promise(function (resolve) {
            let count = 0;

            const interval = window.setInterval(function () {
                count += 1;

                counterElements[1].textContent = String(count);

                if (count >= 9) {
                    window.clearInterval(interval);

                    counterElements[1].textContent = "0";
                    counterElements[0].textContent = "1";

                    window.setTimeout(resolve, 250);
                }
            }, 120);
        });
    }

    function pixelatePreloader() {
        const pixels = getPixels();

        if (pixels.length === 0) {
            hidePreloader();
            if (typeof window.runPageLoadTransition === "function") {
                window.runPageLoadTransition();
            }
            return Promise.resolve();
        }

        if (!state.libraries.gsap || state.reducedMotion) {
            hidePreloader();
            if (typeof window.runPageLoadTransition === "function") {
                window.runPageLoadTransition();
            }
            return Promise.resolve();
        }

        return new Promise(function (resolve) {
            window.gsap.to(pixels, {
                opacity: 0,
                backgroundColor: "transparent",
                duration: 0.75,
                stagger: {
                    amount: 0.45,
                    from: "random",
                    grid: "auto",
                },
                ease: "power2.inOu",
                onComplete: function () {
                    hidePreloader();
                    // 👇 ADD THESE 3 LINES — triggers the page-transition columns
                    if (typeof window.runPageLoadTransition === "function") {
                        window.runPageLoadTransition();
                    }
                    resolve();
                }
            });
        });
    }

    function animateHero() {
        if (!state.libraries.gsap || state.reducedMotion) {
            return;
        }

        const heroTriggers = document.querySelectorAll("[anim-hero-trigger]");

        if (heroTriggers.length === 0) {
            return;
        }

        heroTriggers.forEach(function (element) {
            if (state.libraries.splitText) {
                const split = new window.SplitText(element, {
                    type: "words, chars"
                });

                window.gsap.fromTo(
                    split.chars,
                    {
                        autoAlpha: 0
                    },
                    {
                        autoAlpha: 1,
                        duration: 0.75,
                        stagger: {
                            each: 0.04,
                            from: "random"
                        },
                        ease: "power2.out"
                    }
                );
            } else {
                window.gsap.fromTo(
                    element,
                    {
                        autoAlpha: 0
                    },
                    {
                        autoAlpha: 1,
                        duration: 0.75,
                        ease: "power2.out"
                    }
                );
            }
        });
    }

    async function runPreloader() {
        const preloader = getElement("#preloader");

        if (!preloader) {
            startLenis();
            return;
        }

        const hasAlreadyRun =
            sessionStorage.getItem("chainlabs-preloader-complete") === "true";

        if (hasAlreadyRun) {
            hidePreloader();
            startLenis();
            animateHero();
            if (typeof window.runPageLoadTransition === "function") {
                window.runPageLoadTransition();
            }
            return;
        }

        revealPreloader();
        stopLenis();

        prepareZeroCounters();

        await flickerCounters();

        if (!state.reducedMotion) {
            await runCounterSequence();
        }

        await pixelatePreloader();

        sessionStorage.setItem("chainlabs-preloader-complete", "true");

        startLenis();
        animateHero();
    }

    async function initialize() {
        if (state.initialized) {
            return;
        }

        state.initialized = true;

        logRuntime();

        await runPreloader();

        state.ready = true;

        console.log("[ChainLabs] Initialization complete.");
    }

    function bootstrap() {
        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                initialize,
                {
                    once: true
                }
            );

            return;
        }

        initialize();
    }

    ChainLabs.initialize = initialize;
    ChainLabs.hidePreloader = hidePreloader;
    ChainLabs.revealPreloader = revealPreloader;
    ChainLabs.startLenis = startLenis;
    ChainLabs.stopLenis = stopLenis;

    bootstrap();
})();