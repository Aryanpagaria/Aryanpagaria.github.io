(function () {
    "use strict";

    // Reloads and fresh visits begin at the introduction with the full preloader.
    // Back/forward keeps the browser's own restoration. This runs before DOMContentLoaded,
    // so initialization.js reads the cleared preloader flag.
    (function startAtIntroduction() {
        const entry = performance.getEntriesByType("navigation")[0];
        if (entry && entry.type === "back_forward") return;
        let introduction = true;
        // ScrollTrigger caches this setting and re-applies it on every refresh, so set it through its API.
        if (window.ScrollTrigger) window.ScrollTrigger.clearScrollMemory("manual");
        else if ("scrollRestoration" in history) history.scrollRestoration = "manual";
        document.addEventListener("chainlabs:revealed", function () {
            introduction = false;
        }, { once: true });
        // Hand restoration back to the browser when leaving so back/forward still works.
        window.addEventListener("pagehide", function () {
            if (window.ScrollTrigger) window.ScrollTrigger.clearScrollMemory("auto");
            else if ("scrollRestoration" in history) history.scrollRestoration = "auto";
        });
        sessionStorage.removeItem("chainlabs-preloader-complete");
        if (location.hash) history.replaceState(null, "", location.pathname + location.search);
        window.scrollTo(0, 0);
        // Chrome can still apply the saved offset once layout settles; undo it while the intro runs.
        window.addEventListener("load", function () {
            if (introduction) window.scrollTo(0, 0);
        }, { once: true });
    })();

    function initializeSite() {
        const hero = document.querySelector("#hero-section");
        if (!hero) return;

        const site = window.ChainLabs = window.ChainLabs || {};
        if (site.disposeHero) site.disposeHero();

        const controller = new AbortController();
        const options = { signal: controller.signal };
        const stage = hero.querySelector(".hero-stage");
        const video = hero.querySelector(".hero-video video");

        const button = hero.querySelector(".hero-motion-toggle");
        const status = hero.querySelector(".hero-action-status");
        const transition = document.querySelector(".page-transition-container");
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const gsap = window.gsap;
        let revealed = false;
        let inView = true;
        let userPaused = false;
        let unavailable = false;
        let pulse;
        let progression;
        let context;
        let entrance;

        function active() {
            return revealed && inView && !document.hidden && !reducedMotion.matches && !userPaused;
        }

        function synchronizeMotion() {
            const moving = active();

            button.disabled = reducedMotion.matches || unavailable;
            button.setAttribute("aria-pressed", String(userPaused || reducedMotion.matches));
            button.textContent = unavailable ? "VISUAL UNAVAILABLE" : reducedMotion.matches ? "MOTION REDUCED" : userPaused ? "PLAY VISUAL" : "PAUSE VISUAL";

            if (moving && !unavailable) {
                const playback = video.play();
                if (playback) playback.catch(function (error) {
                    if (error.name === "AbortError" || !active()) return;
                    userPaused = true;
                    if (error.name === "NotSupportedError") unavailable = true;
                    synchronizeMotion();
                });
            } else {
                video.pause();
            }

            if (pulse) moving ? pulse.resume() : pulse.pause();
            if (progression) {
                if (moving) progression.scrollTrigger.enable();
                else progression.scrollTrigger.disable(false);
            }
        }

        function configureAnimation() {
            if (context) context.revert();
            pulse = null;
            progression = null;
            if (!gsap || reducedMotion.matches) return;

            context = gsap.context(function () {
                pulse = gsap.to(".hero-tracer-pulse", {
                    strokeDashoffset: -1,
                    autoRound: false,
                    duration: 7,
                    repeat: -1,
                    ease: "none",
                    paused: true
                });
                if (window.ScrollTrigger) {
                    gsap.registerPlugin(window.ScrollTrigger);
                    progression = gsap.timeline({
                        scrollTrigger: {
                            id: "portfolio-hero",
                            trigger: hero,
                            start: "top top",
                            end: "bottom top",
                            scrub: 0.6,
                            invalidateOnRefresh: true
                        }
                    })
                        .to(stage, { y: 16, ease: "none" }, 0)
                        .to(".hero-scan", { y: 650, ease: "none" }, 0);
                }
            }, hero);
        }

        function onReveal() {
            if (revealed) return;
            revealed = true;
            revealObserver.disconnect();
            if (gsap && !reducedMotion.matches) {
                entrance = gsap.from(hero.querySelectorAll(".hero-info > :not(.hero-action-status)"), {
                    y: 12,
                    opacity: 0,
                    duration: 0.55,
                    stagger: 0.045,
                    ease: "power2.out",
                    clearProps: "transform,opacity"
                });
            }
            synchronizeMotion();
        }

        const revealObserver = new MutationObserver(function () {
            if (!transition || getComputedStyle(transition).display === "none") onReveal();
        });
        if (transition) revealObserver.observe(transition, { attributes: true, attributeFilter: ["style"] });
        document.addEventListener("chainlabs:revealed", onReveal, options);
        if (!transition || getComputedStyle(transition).display === "none") onReveal();

        const observer = new IntersectionObserver(function (entries) {
            inView = entries[0].isIntersecting;
            synchronizeMotion();
        }, { threshold: 0.05 });
        observer.observe(hero);

        button.addEventListener("click", function () {
            userPaused = !userPaused;
            synchronizeMotion();
        }, options);
        video.addEventListener("error", function () {
            unavailable = true;
            synchronizeMotion();
        }, options);

        document.addEventListener("visibilitychange", synchronizeMotion, options);

        function onMotionPreferenceChange() {
            if (entrance) entrance.progress(1).kill();
            configureAnimation();
            synchronizeMotion();
        }
        reducedMotion.addEventListener("change", onMotionPreferenceChange);

        // Future sections are intentionally not fabricated during the hero phase.
        // Explain unavailable destinations instead of leaving silent, dead hash links.
        document.querySelectorAll('.portfolio-apply-header a[href^="#"], #hero-section a[href^="#"]').forEach(function (link) {
            link.addEventListener("click", function (event) {
                const id = link.getAttribute("href").slice(1);
                if (document.getElementById(id)) return;
                event.preventDefault();
                status.textContent = id === "contact" ? "Contact details are not published yet." : link.textContent.trim() + " is not published yet.";
                status.scrollIntoView({ block: "nearest", behavior: "instant" });
            }, options);
        });

        configureAnimation();
        synchronizeMotion();

        site.disposeHero = function () {
            controller.abort();
            observer.disconnect();
            revealObserver.disconnect();
            reducedMotion.removeEventListener("change", onMotionPreferenceChange);
            if (entrance) entrance.progress(1).kill();
            if (context) context.revert();
            video.pause();

            delete site.disposeHero;
        };
        window.addEventListener("pagehide", site.disposeHero, options);
    }

    function initializeAbout() {
        const about = document.querySelector("#about");
        if (!about || !window.gsap || !window.ScrollTrigger) return;

        const site = window.ChainLabs = window.ChainLabs || {};
        if (site.disposeAbout) site.disposeAbout();
        const media = window.gsap.matchMedia();
        window.gsap.registerPlugin(window.ScrollTrigger);
        media.add("(prefers-reduced-motion: no-preference)", function () {
            window.gsap.from(about.querySelectorAll(".about-introduction, .about-portrait"), {
                y: 16,
                opacity: 0,
                duration: 0.45,
                ease: "power2.out",
                clearProps: "transform,opacity",
                scrollTrigger: { trigger: about, start: "top 85%", once: true }
            });
        });
        site.disposeAbout = function () {
            media.revert();
            window.removeEventListener("pagehide", site.disposeAbout);
            delete site.disposeAbout;
        };
        window.addEventListener("pagehide", site.disposeAbout);
    }

    function initializeScramble() {
        const site = window.ChainLabs = window.ChainLabs || {};
        if (site.disposeScramble) site.disposeScramble();
        const gsap = window.gsap;
        if (!gsap || !window.ScrambleTextPlugin) return;
        gsap.registerPlugin(window.ScrambleTextPlugin);

        const controller = new AbortController();
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const states = new Map();
        const selector = 'a[href], button, [role="button"]';

        function restore(state) {
            state.tweens.forEach(function (tween) { tween.kill(); });
            state.labels.forEach(function (label) {
                label.visual.textContent = label.text;
            });
        }

        function prepare(control) {
            const current = states.get(control);
            if (current && current.labels.every(function (label) { return control.contains(label.wrapper); })) return current;
            if (current) restore(current);
            const labels = [];
            const walker = document.createTreeWalker(control, NodeFilter.SHOW_TEXT, {
                acceptNode: function (node) {
                    const parent = node.parentElement;
                    return node.textContent.trim() && parent.closest(selector) === control &&
                        !parent.closest('svg, script, style, [aria-hidden="true"], .scramble-label, [contenteditable="true"]')
                        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            });
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach(function (node) {
                const wrapper = document.createElement("span");
                const original = document.createElement("span");
                const visual = document.createElement("span");
                wrapper.className = "scramble-label";
                original.className = "scramble-original";
                visual.className = "scramble-visual";
                visual.setAttribute("aria-hidden", "true");
                const text = node.textContent;
                visual.textContent = text;
                node.replaceWith(wrapper);
                original.append(node);
                wrapper.append(original, visual);
                labels.push({ wrapper, original, visual, text });
            });
            const state = { labels, tweens: [] };
            states.set(control, state);
            return state;
        }

        function scramble(event) {
            if (reducedMotion.matches || !(event.target instanceof Element)) return;
            const control = event.target.closest(selector);
            if (!control || control.matches(':disabled, [aria-disabled="true"]')) return;
            if (event.type === "pointerover" && (event.pointerType === "touch" || control.contains(event.relatedTarget))) return;
            const state = prepare(control);
            if (state.tweens.some(function (tween) { return tween.progress() < 1; })) return;
            state.tweens = state.labels.map(function (label) {
                return gsap.to(label.visual, {
                    duration: .38,
                    scrambleText: { text: label.text, chars: "01XRTN", speed: .5 },
                    onComplete: function () { label.visual.textContent = label.text; }
                });
            });
        }

        ["pointerover", "focus", "click"].forEach(function (type) {
            document.addEventListener(type, scramble, { capture: true, signal: controller.signal });
        });
        reducedMotion.addEventListener("change", function () {
            if (reducedMotion.matches) states.forEach(restore);
        }, { signal: controller.signal });
        site.disposeScramble = function () {
            controller.abort();
            states.forEach(function (state) {
                restore(state);
                state.labels.forEach(function (label) { label.wrapper.replaceWith(...label.original.childNodes); });
            });
            states.clear();
            window.removeEventListener("pagehide", site.disposeScramble);
            delete site.disposeScramble;
        };
        window.addEventListener("pagehide", site.disposeScramble);
    }

    function initializeNameplate() {
        const site = window.ChainLabs = window.ChainLabs || {};
        if (site.disposeNameplate) site.disposeNameplate();
        const nameplate = document.querySelector("#contact .nameplate");
        const gsap = window.gsap;
        if (!nameplate || !gsap) return;
        const letters = Array.from(nameplate.querySelectorAll(".nameplate-letter"));
        if (!letters.length) return;

        const media = gsap.matchMedia();
        media.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", function () {
            const controller = new AbortController();
            const options = { signal: controller.signal, passive: true };
            const namespace = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(namespace, "svg");
            svg.classList.add("nameplate-filters");
            svg.setAttribute("aria-hidden", "true");
            svg.setAttribute("focusable", "false");
            const filter = document.createElementNS(namespace, "filter");
            filter.id = "aryan-ripple";
            filter.setAttribute("filterUnits", "userSpaceOnUse");
            filter.setAttribute("color-interpolation-filters", "sRGB");
            const image = document.createElementNS(namespace, "feImage");
            image.setAttribute("result", "ripples");
            image.setAttribute("preserveAspectRatio", "none");
            const displacement = document.createElementNS(namespace, "feDisplacementMap");
            displacement.setAttribute("in", "SourceGraphic");
            displacement.setAttribute("in2", "ripples");
            displacement.setAttribute("xChannelSelector", "R");
            displacement.setAttribute("yChannelSelector", "G");
            filter.append(image, displacement);
            svg.append(filter);
            nameplate.append(svg);

            // The tiny offscreen map displaces ink only; it is never a visible water layer.
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 96;
            const context = canvas.getContext("2d");
            if (!context) {
                svg.remove();
                return;
            }
            const map = context.createImageData(96, 96);
            let letter;
            let bounds;
            let origin;
            let started = 0;
            let frame = 0;
            let lastInput = 0;

            function stop() {
                cancelAnimationFrame(frame);
                frame = 0;
                if (letter) letter.style.removeProperty("filter");
                letter = null;
            }

            function draw(now) {
                frame = 0;
                const age = (now - started) / 650;
                if (age >= 1 || document.hidden) {
                    stop();
                    return;
                }
                const radius = Math.min(128, bounds.width * 1.1);
                for (let y = 0; y < 96; y++) {
                    for (let x = 0; x < 96; x++) {
                        const dx = x / 95 * bounds.width - origin.x;
                        const dy = y / 95 * bounds.height - origin.y;
                        const distance = Math.hypot(dx, dy);
                        const envelope = Math.pow(Math.max(0, 1 - distance / radius), 2);
                        const wave = Math.sin(distance * .32 - age * 14) * envelope * Math.pow(1 - age, 2);
                        const offset = (y * 96 + x) * 4;
                        map.data[offset] = 128 + wave * dx / (distance || 1) * 110;
                        map.data[offset + 1] = 128 + wave * dy / (distance || 1) * 110;
                        map.data[offset + 2] = 128;
                        map.data[offset + 3] = 255;
                    }
                }
                context.putImageData(map, 0, 0);
                image.setAttribute("href", canvas.toDataURL());
                displacement.setAttribute("scale", String(9 * Math.pow(1 - age, 2)));
                letter.style.filter = "url(#aryan-ripple)";
                frame = requestAnimationFrame(draw);
            }

            nameplate.addEventListener("pointermove", function (event) {
                if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
                const panel = event.target.closest(".nameplate-panel");
                if (!panel) return;
                const next = panel.querySelector(".nameplate-letter");
                const now = performance.now();
                if (now - lastInput < 32 && next === letter) return;
                lastInput = now;
                if (next !== letter) {
                    stop();
                    letter = next;
                    bounds = letter.getBoundingClientRect();
                    filter.setAttribute("x", "-4");
                    filter.setAttribute("y", "-4");
                    filter.setAttribute("width", String(bounds.width + 8));
                    filter.setAttribute("height", String(bounds.height + 8));
                    image.setAttribute("width", String(bounds.width));
                    image.setAttribute("height", String(bounds.height));
                }
                origin = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
                started = now;
                if (!frame) frame = requestAnimationFrame(draw);
            }, options);
            nameplate.addEventListener("pointercancel", stop, options);
            window.addEventListener("blur", stop, options);
            window.addEventListener("resize", stop, options);
            document.addEventListener("scroll", stop, options);
            document.addEventListener("visibilitychange", stop, options);

            return function () {
                controller.abort();
                stop();
                svg.remove();
            };
        }, nameplate);

        site.disposeNameplate = function () {
            media.revert();
            window.removeEventListener("pagehide", site.disposeNameplate);
            delete site.disposeNameplate;
        };
        window.addEventListener("pagehide", site.disposeNameplate);
    }

    window.addEventListener("pageshow", function (event) {
        if (event.persisted) initializePage();
    });

    function initializePage() {
        initializeSite();
        initializeAbout();
        initializeScramble();
        initializeNameplate();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializePage, { once: true });
    } else {
        initializePage();
    }
})();
