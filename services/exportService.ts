
import { Project, Page, PageElement, ElementType } from '../types';

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const MAX_TOC_ITEMS = 22; // Must match App.tsx

// --- UTILS ---

const escapeHtml = (unsafe: string) => {
    if (!unsafe) return "";
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

// Helper to safely encode strings for insertion into JS strings or HTML attributes
const safeEncode = (str: string): string => {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        console.error("Encoding error", e);
        return "";
    }
};

const getPageBackgroundCss = (page: Page) => {
    const bgColor = page.backgroundColor || '#ffffff';
    let css = `background-color: ${bgColor};`;
    
    let imgParts: string[] = [];
    let sizeParts: string[] = [];

    // 1. Pattern (Top Layer)
    if (page.background === 'lines') {
        imgParts.push('linear-gradient(#94a3b8 1px, transparent 1px)');
        sizeParts.push('100% 2rem');
    } else if (page.background === 'grid') {
        imgParts.push('linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)');
        sizeParts.push('20px 20px');
    } else if (page.background === 'dots') {
        imgParts.push('radial-gradient(#94a3b8 1px, transparent 1px)');
        sizeParts.push('20px 20px');
    } else if (page.background === 'seyes') {
        imgParts.push('linear-gradient(90deg, #ef4444 0.5px, transparent 0.5px), linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(#e2e8f0 1px, transparent 1px)');
        sizeParts.push('8rem 100%, 100% 2rem, 100% 0.5rem');
    }

    // 2. AI Texture / Custom Image (Bottom Layer)
    if (page.backgroundImage) {
        // Robust sanitization for CSS string injection
        // 1. Trim whitespace
        // 2. Remove line breaks (critical for base64 strings which might be chunked)
        // 3. Escape single quotes to prevent breaking the url('') syntax within double-quoted style attribute
        const cleanUrl = page.backgroundImage.trim().replace(/[\r\n]+/g, "");
        const safeUrl = cleanUrl.replace(/'/g, "\\'");
        
        imgParts.push(`url('${safeUrl}')`);
        sizeParts.push('cover');
    }

    if (imgParts.length > 0) {
        // Important: background-image property allows multiple comma-separated images (Top to Bottom)
        css += ` background-image: ${imgParts.join(', ')};`;
        css += ` background-size: ${sizeParts.join(', ')};`;
        // background-repeat is repeat by default, which works for patterns.
        // For the 'cover' image layer, CSS background-size: cover handles the scaling.
    }
    
    return css;
};

// --- STRUCTURE COMPUTATION ---

const computeStructure = (pages: Page[]) => {
    const numberingMap: Record<string, string> = {};
    const tocList: any[] = [];
    
    let sequenceCount = 0;
    let partCount = 0;
    let h3Count = 0;
    let h4Count = 0;
    let standardPageCount = 0;

    pages.forEach((page, pageIndex) => {
        if (page.type === 'standard') {
            standardPageCount++;
            const sortedElements = [...(page.elements || [])].sort((a, b) => a.y - b.y);
            
            sortedElements.forEach(el => {
                if (el.type === ElementType.SEQUENCE_TITLE) {
                    sequenceCount++;
                    partCount = 0; // Reset
                    h3Count = 0;
                    h4Count = 0;
                    const label = `SÉQUENCE ${sequenceCount}`;
                    numberingMap[el.id] = label;
                    tocList.push({ 
                        pageIndex: pageIndex, 
                        pageNum: standardPageCount, 
                        title: el.content, 
                        label, 
                        type: ElementType.SEQUENCE_TITLE,
                        targetPageId: page.id
                    });
                } else if (el.type === ElementType.PART_TITLE) {
                    partCount++;
                    h3Count = 0; // Reset
                    h4Count = 0;
                    const label = `${partCount} -`;
                    numberingMap[el.id] = label;
                    tocList.push({ 
                        pageIndex: pageIndex,
                        pageNum: standardPageCount, 
                        title: el.content, 
                        label, 
                        type: ElementType.PART_TITLE,
                        targetPageId: page.id
                    });
                } else if (el.type === ElementType.H3_TITLE) {
                    h3Count++;
                    h4Count = 0; // Reset
                    const label = `${partCount}.${h3Count} -`;
                    numberingMap[el.id] = label;
                } else if (el.type === ElementType.H4_TITLE) {
                    h4Count++;
                    const label = `${partCount}.${h3Count}.${h4Count} -`;
                    numberingMap[el.id] = label;
                }
            });
        }
    });

    return { numberingMap, tocList };
};

// --- ELEMENT GENERATION ---

const generateElementHTML = (el: PageElement, numberingMap: Record<string, string>, tocList: any[], tocPageIndex: number = 1, tocTotalPages: number = 1): string => {
    const style = el.style || { zIndex: 1 };
    
    const commonStyle = `
        position: absolute;
        left: ${el.x}px;
        top: ${el.y}px;
        width: ${el.width}px;
        height: ${el.height}px;
        z-index: ${style.zIndex};
        border-radius: ${style.borderRadius || 0}px;
        border: ${style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor}` : 'none'};
        background-color: ${style.backgroundColor || 'transparent'};
        box-shadow: ${style.boxShadow || 'none'};
        overflow: hidden;
    `;

    const labelPrefix = numberingMap[el.id] || '';

    switch (el.type) {
        case ElementType.TEXT:
            return `
                <div style="${commonStyle} 
                    font-size: ${style.fontSize}px; 
                    font-weight: ${style.fontWeight || 'normal'}; 
                    color: ${style.color}; 
                    font-family: ${style.fontFamily === 'Merriweather' ? 'Merriweather, serif' : 'Inter, sans-serif'}; 
                    text-align: ${style.textAlign || 'left'}; 
                    padding: 8px; 
                    white-space: pre-wrap;">${escapeHtml(el.content)}</div>
            `;
        
        case ElementType.COLUMNS:
            let columns: string[] = [];
            try { columns = JSON.parse(el.content || '[]'); } catch(e) { columns = []; }
            if (columns.length === 0) return '';

            const colsHtml = columns.map(colText => `
                <div style="flex: 1; word-wrap: break-word; white-space: pre-wrap;">${escapeHtml(colText)}</div>
            `).join('');

            return `
                <div style="${commonStyle} 
                    padding: 16px; 
                    display: grid; 
                    grid-template-columns: repeat(${columns.length}, 1fr); 
                    gap: ${style.gap || 20}px; 
                    font-size: ${style.fontSize}px; 
                    color: ${style.color}; 
                    text-align: ${style.textAlign || 'left'};
                    font-family: ${style.fontFamily === 'Merriweather' ? 'Merriweather, serif' : 'Inter, sans-serif'};">
                    ${colsHtml}
                </div>
            `;

        case ElementType.SEQUENCE_TITLE:
            return `
                <div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; z-index: ${style.zIndex}; display: flex; flex-direction: column; justify-content: start; padding-top: 16px; overflow: hidden;">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position: absolute; inset: 0; width: 100%; height: 100%;">
                        <path d="M0 0 L100 0 L100 85 Q50 100 0 85 Z" fill="${style.backgroundColor || '#4f46e5'}" />
                    </svg>
                    <div style="position: relative; z-index: 10; padding: 0 40px; display: flex; flex-direction: column; align-items: center; text-align: center; width: 100%;">
                        <span style="font-size: 10px; color: ${style.color || '#ffffff'}; opacity: 0.8; font-family: monospace; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 4px;">Module Éducatif</span>
                        ${labelPrefix ? `<span style="font-size: 14px; font-weight: bold; color: ${style.color || '#ffffff'}; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; opacity: 0.9;">${labelPrefix}</span>` : ''}
                        <h1 style="font-size: 30px; font-weight: bold; color: ${style.color || '#ffffff'}; text-transform: uppercase; letter-spacing: 0.05em; font-family: '${style.fontFamily === 'Merriweather' ? 'Merriweather, serif' : 'Inter, sans-serif'}'; margin: 0;">
                            ${escapeHtml(el.content)}
                        </h1>
                    </div>
                </div>
            `;

        case ElementType.PART_TITLE:
            return `
                <div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; z-index: ${style.zIndex}; display: flex; align-items: center; background-color: ${style.backgroundColor || '#f8fafc'}; border-left: 4px solid ${style.borderColor || '#4f46e5'}; padding-left: 24px; box-sizing: border-box;">
                    <h2 style="font-size: 20px; font-weight: bold; text-transform: uppercase; font-family: 'Inter', sans-serif; margin: 0; position: relative; z-index: 10; display: flex; gap: 12px; color: ${style.color || '#1e293b'};">
                        ${labelPrefix ? `<span style="color: ${style.borderColor || '#4f46e5'};">${labelPrefix}</span>` : ''}
                        <span>${escapeHtml(el.content)}</span>
                    </h2>
                    <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 1px; background-color: #e2e8f0;"></div>
                </div>
            `;

        case ElementType.H3_TITLE:
            return `
                <div style="${commonStyle} display: flex; align-items: flex-end; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">
                    <h3 style="font-size: 18px; font-weight: bold; color: ${style.color || '#334155'}; font-family: ${style.fontFamily || 'Inter, sans-serif'}; margin: 0; display: flex; gap: 8px; align-items: center;">
                        ${labelPrefix ? `<span style="color: #64748b; opacity: 0.8;">${labelPrefix}</span>` : ''}
                        ${escapeHtml(el.content)}
                    </h3>
                </div>
            `;
        
        case ElementType.H4_TITLE:
            return `
                <div style="${commonStyle} display: flex; align-items: center;">
                    <h4 style="font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: ${style.color || '#475569'}; font-family: ${style.fontFamily || 'Inter, sans-serif'}; margin: 0; display: flex; gap: 8px; align-items: center;">
                        ${labelPrefix ? `<span style="color: #94a3b8; font-weight: normal;">${labelPrefix}</span>` : ''}
                        ${escapeHtml(el.content)}
                    </h4>
                </div>
            `;

        case ElementType.TOC:
            const tocItemsHtml = tocList.map(item => `
                <div onclick="window.flipBook.flip(${item.pageIndex})" style="cursor: pointer; display: flex; align-items: baseline; gap: 16px; ${item.type === ElementType.SEQUENCE_TITLE ? 'margin-top: 16px; margin-bottom: 8px;' : 'padding-left: 24px;'} transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                    <div style="flex: 1; border-bottom: 1px dotted #cbd5e1; position: relative; ${item.type === ElementType.SEQUENCE_TITLE ? 'font-weight: bold; color: #1e293b; font-size: 18px;' : 'color: #475569; font-size: 14px;'}">
                        <span style="background-color: white; padding-right: 8px; position: relative; z-index: 10;">
                            ${item.label ? `<span style="margin-right: 8px; ${item.type === ElementType.SEQUENCE_TITLE ? 'color: #4f46e5;' : 'color: #94a3b8;'}">${item.label}</span>` : ''}
                            ${escapeHtml(item.title)}
                        </span>
                    </div>
                    <div style="position: relative; z-index: 10; background-color: white; padding-left: 8px; font-weight: bold; ${item.type === ElementType.SEQUENCE_TITLE ? 'color: #0f172a;' : 'color: #64748b;'}">
                        ${item.pageNum}
                    </div>
                </div>
            `).join('');

            return `
                <div style="${commonStyle} padding: 48px; background-color: white; font-family: sans-serif;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        ${tocTotalPages > 1 ? `
                            <h2 style="font-size: 24px; font-weight: bold; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Merriweather', serif; border-bottom: 1px solid #e2e8f0; display: inline-block; padding-bottom: 8px;">
                                Sommaire (${tocPageIndex}/${tocTotalPages})
                            </h2>
                        ` : `
                            <h1 style="font-size: 30px; font-weight: bold; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Merriweather', serif;">Sommaire</h1>
                            <div style="width: 100px; height: 4px; background-color: #4f46e5; margin: 0 auto;"></div>
                        `}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        ${tocList.length === 0 && tocTotalPages === 1 ? '<div style="color: #94a3b8; font-style: italic; font-size: 14px;">Aucun titre de séquence ou de partie détecté.</div>' : tocItemsHtml}
                    </div>
                </div>
            `;

        case ElementType.IMAGE:
            return `<img src="${el.content}" style="${commonStyle} object-fit: cover;" alt="" />`;

        case ElementType.VIDEO:
             let videoSrc = el.content;
             let isIframe = false;

             if (videoSrc) {
                 // Detect YouTube URL (including Shorts)
                 const ytMatch = videoSrc.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                 if (ytMatch && ytMatch[1]) {
                     // Add safe params for export
                     videoSrc = `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
                     isIframe = true;
                 } else if (videoSrc.match(/(?:vimeo\.com\/)(\d+)/i)) {
                     const vimeoMatch = videoSrc.match(/(?:vimeo\.com\/)(\d+)/i);
                     videoSrc = `https://player.vimeo.com/video/${vimeoMatch![1]}`;
                     isIframe = true;
                 } else if (videoSrc.match(/(?:dailymotion\.com\/video\/)([^"&?\/\s]+)/i)) {
                     const dmMatch = videoSrc.match(/(?:dailymotion\.com\/video\/)([^"&?\/\s]+)/i);
                     videoSrc = `https://www.dailymotion.com/embed/video/${dmMatch![1]}`;
                     isIframe = true;
                 } else if (videoSrc.trim().startsWith('<iframe')) {
                     // Raw iframe code - extract src if possible or wrap
                     // For export simplicity, we inject it directly if it's an iframe string
                     return `
                        <div style="${commonStyle}">
                            ${videoSrc}
                        </div>
                     `;
                 }
             }

             if (isIframe) {
                 return `
                    <div style="${commonStyle}">
                        <iframe 
                            src="${videoSrc}" 
                            style="width: 100%; height: 100%; border: none; background: black;" 
                            allowFullScreen 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        ></iframe>
                    </div>
                 `;
             }

             // Fallback for native video
             return `<video src="${el.content}" controls style="${commonStyle} object-fit: cover; background: black;"></video>`;

        case ElementType.AUDIO:
            const audioId = `audio-${el.id}`;
            return `
                <div style="${commonStyle} display: flex; align-items: center; gap: 12px; padding: 0 16px; background: white; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);">
                    <button onclick="document.getElementById('${audioId}').play()" style="width: 32px; height: 32px; background: #4f46e5; border-radius: 50%; color: white; display: flex; items-center; justify-content: center; border: none; cursor: pointer;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
                         <span style="font-size: 12px; font-weight: bold; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Audio / Voix IA</span>
                         <span style="font-size: 10px; color: #94a3b8;">Cliquez pour écouter</span>
                    </div>
                    <audio id="${audioId}" src="${el.content}" style="display: none;"></audio>
                </div>
            `;

        case ElementType.QR_CODE:
            return `
                <div style="${commonStyle} display: flex; flex-direction: column; align-items: center; justify-content: center; background: white; padding: 8px;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(el.content)}" style="width: 100%; height: 100%; object-fit: contain;" alt="QR Code" />
                </div>
            `;

        case ElementType.SHAPE:
            return `<div style="${commonStyle}"></div>`;

        case ElementType.SVG:
            return `<div style="${commonStyle} display: flex; align-items: center; justify-content: center;">${el.content}</div>`;

        case ElementType.HTML:
        case ElementType.FILL_IN_THE_BLANKS:
        case ElementType.MATCHING:
        case ElementType.TIMELINE:
        case ElementType.FLASHCARDS:
        case ElementType.TRUE_FALSE:
        case ElementType.MIND_MAP:
            // Safely embed HTML using base64 srcdoc to handle quotes/newlines correctly
            const b64Html = safeEncode(el.content);
            return `
                <div style="${commonStyle}">
                    <iframe src="data:text/html;base64,${b64Html}" style="width: 100%; height: 100%; border: none;" sandbox="allow-scripts allow-popups allow-same-origin"></iframe>
                </div>
            `;
        
        case ElementType.SECTION:
             return `<div style="${commonStyle} border-style: dashed; opacity: 0.5; background: rgba(0,0,0,0.02);"></div>`;

        case ElementType.THREED_MODEL:
            const stlId = `stl-${el.id}`;
            const b64Stl = safeEncode(el.content);
            
            return `
                <div id="${stlId}" style="${commonStyle} overflow: hidden;"></div>
                <script>
                    (function() {
                        const container = document.getElementById('${stlId}');
                        if (!container || typeof THREE === 'undefined') return;

                        const scene = new THREE.Scene();
                        // Handle transparent background
                        ${(style.backgroundColor === 'transparent' || style.backgroundColor === 'rgba(0,0,0,0)') ? 'scene.background = null;' : `scene.background = new THREE.Color('${style.backgroundColor || '#f8fafc'}');`}

                        const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000);
                        camera.position.set(0, 0, 50);

                        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
                        renderer.setSize(container.clientWidth, container.clientHeight);
                        renderer.setPixelRatio(window.devicePixelRatio);
                        renderer.shadowMap.enabled = true;
                        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                        container.appendChild(renderer.domElement);

                        // --- LIGHTING (Studio Setup) ---
                        const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
                        scene.add(ambientLight);

                        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
                        mainLight.position.set(10, 20, 10);
                        mainLight.castShadow = true;
                        scene.add(mainLight);

                        const backLight = new THREE.DirectionalLight(0x6366f1, 0.8);
                        backLight.position.set(-10, 0, -20);
                        scene.add(backLight);

                        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
                        fillLight.position.set(0, -10, 10);
                        scene.add(fillLight);

                        const controls = new THREE.OrbitControls(camera, renderer.domElement);
                        controls.enableDamping = true;
                        controls.autoRotate = true;
                        controls.autoRotateSpeed = 1.5;

                        try {
                            const loader = new THREE.STLLoader();
                            // Decode base64 STL content
                            const stlContent = decodeURIComponent(escape(atob('${b64Stl}')));
                            
                            const geometry = loader.parse(stlContent);
                            geometry.computeBoundingBox();
                            geometry.center();
                            geometry.computeVertexNormals();

                            // Enhanced Material
                            const material = new THREE.MeshStandardMaterial({ 
                                color: 0x6366f1, 
                                roughness: 0.4,
                                metalness: 0.1,
                                side: THREE.DoubleSide
                            });
                            
                            const mesh = new THREE.Mesh(geometry, material);
                            mesh.castShadow = true;
                            mesh.receiveShadow = true;
                            
                            // Adjust Camera Smartly
                            const box = geometry.boundingBox;
                            if (box) {
                                const size = new THREE.Vector3();
                                box.getSize(size);
                                const maxDim = Math.max(size.x, size.y, size.z);
                                
                                const fov = camera.fov * (Math.PI / 180);
                                let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2));
                                cameraZ *= 2.0; 
                                
                                camera.position.set(cameraZ, cameraZ * 0.5, cameraZ);
                                camera.lookAt(0, 0, 0);
                                controls.maxDistance = maxDim * 5;
                            }

                            scene.add(mesh);
                            
                            function animate() {
                                requestAnimationFrame(animate);
                                controls.update();
                                renderer.render(scene, camera);
                            }
                            animate();
                        } catch(e) {
                            container.innerHTML = 'Erreur 3D';
                            console.error(e);
                        }
                    })();
                </script>
            `;

        case ElementType.CONNECT_DOTS:
            const dotsId = `dots-${el.id}`;
            let dotsData = [];
            try { dotsData = JSON.parse(el.content); } catch(e) {}
            // Direct JSON injection prevents syntax errors
            const dotsJson = JSON.stringify(dotsData);

            // Using proper JS variable prefix to avoid SyntaxError if ID starts with number
            const safeFnId = `fn_${el.id.replace(/-/g,'')}`;

            return `
                <div id="${dotsId}" style="${commonStyle} user-select: none;">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width: 100%; height: 100%; cursor: crosshair;">
                         <polyline points="" fill="none" stroke="#4f46e5" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round" class="lines"></polyline>
                    </svg>
                    <div style="position: absolute; top: 10px; left: 10px; display: none;" class="win-msg">
                         <div style="background: white; padding: 10px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; text-align: center;">
                            <div style="font-weight: bold; color: #ca8a04; font-size: 16px;">Bravo !</div>
                            <button onclick="this.closest('.win-msg').style.display='none'; window.${safeFnId}();" style="margin-top: 5px; background: #4f46e5; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Rejouer</button>
                         </div>
                    </div>
                </div>
                <script>
                    window.${safeFnId} = function() {}; // Placeholder
                    (function() {
                        const container = document.getElementById('${dotsId}');
                        const svg = container.querySelector('svg');
                        const lineEl = container.querySelector('.lines');
                        const winMsg = container.querySelector('.win-msg');
                        
                        const points = ${dotsJson};
                        if(!points || !points.length) return;

                        let nextNum = 1;
                        let drawnPoints = [];
                        
                        // Render Dots
                        points.forEach(p => {
                            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                            g.style.cursor = "pointer";
                            
                            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                            circle.setAttribute("cx", p.x);
                            circle.setAttribute("cy", p.y);
                            circle.setAttribute("r", "1.5");
                            circle.setAttribute("fill", "#cbd5e1");
                            circle.setAttribute("stroke", "white");
                            circle.setAttribute("stroke-width", "0.2");
                            
                            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                            text.setAttribute("x", p.x);
                            text.setAttribute("y", p.y - 2);
                            text.setAttribute("text-anchor", "middle");
                            text.setAttribute("font-size", "3");
                            text.setAttribute("fill", "#64748b");
                            text.textContent = p.label;
                            
                            g.appendChild(circle);
                            g.appendChild(text);
                            svg.appendChild(g);
                            
                            // Interaction
                            g.addEventListener('click', () => {
                                if (p.label === nextNum) {
                                    circle.setAttribute("fill", "#4f46e5");
                                    if (p.label > 1) {
                                       drawnPoints.push(p);
                                       updateLine();
                                    } else {
                                        drawnPoints.push(p);
                                    }
                                    
                                    if (p.label === points.length) {
                                        // Close loop
                                        drawnPoints.push(points[0]);
                                        updateLine();
                                        winMsg.style.display = 'block';
                                    } else {
                                        nextNum++;
                                    }
                                }
                            });
                        });

                        function updateLine() {
                            const pointsStr = drawnPoints.map(pt => pt.x + ',' + pt.y).join(' ');
                            lineEl.setAttribute("points", pointsStr);
                        }

                        window.${safeFnId} = function() {
                            nextNum = 1;
                            drawnPoints = [];
                            lineEl.setAttribute("points", "");
                            svg.querySelectorAll('circle').forEach(c => c.setAttribute("fill", "#cbd5e1"));
                        };
                    })();
                </script>
            `;

        case ElementType.QCM:
            const qcmId = `qcm-${el.id}`;
            let questions = [];
            try { questions = JSON.parse(el.content); } catch(e) {}
            const qcmJson = JSON.stringify(questions);

            return `
                <div id="${qcmId}" style="${commonStyle} font-family: sans-serif; display: flex; flex-direction: column;">
                    <div style="flex: 1; padding: 20px; display: flex; flex-direction: column; overflow-y: auto;" class="content-area"></div>
                </div>
                <script>
                    (function() {
                        const container = document.getElementById('${qcmId}');
                        const contentArea = container.querySelector('.content-area');
                        const questions = ${qcmJson};
                        
                        let currentStep = 0;
                        let answers = {};
                        
                        function render() {
                            contentArea.innerHTML = '';
                            if (!questions || !questions.length) {
                                contentArea.innerHTML = 'QCM Vide';
                                return;
                            }

                            // Progress bar
                            const progress = document.createElement('div');
                            progress.style.cssText = "display: flex; gap: 2px; margin-bottom: 20px; height: 6px; border-radius: 3px; overflow: hidden;";
                            questions.forEach((_, i) => {
                                const bar = document.createElement('div');
                                bar.style.cssText = "flex: 1; background: " + (i === currentStep ? '#4f46e5' : (i < currentStep ? (answers[i] === questions[i].correctIndex ? '#22c55e' : '#ef4444') : '#e2e8f0'));
                                progress.appendChild(bar);
                            });
                            contentArea.appendChild(progress);

                            if (currentStep >= questions.length) {
                                // Results
                                let score = 0;
                                Object.keys(answers).forEach(k => { if(answers[k] === questions[k].correctIndex) score++; });
                                
                                const res = document.createElement('div');
                                res.style.textAlign = 'center';
                                res.innerHTML = '<h3 style="color: #1e293b; font-size: 24px; margin-bottom: 10px;">Terminé !</h3>' +
                                                '<div style="font-size: 18px; color: #64748b;">Score: <b style="color: #4f46e5">' + score + '</b> / ' + questions.length + '</div>' +
                                                '<button class="restart-btn" style="margin-top: 20px; padding: 10px 20px; background: #0f172a; color: white; border: none; border-radius: 8px; cursor: pointer;">Recommencer</button>';
                                contentArea.appendChild(res);
                                res.querySelector('.restart-btn').onclick = () => {
                                    currentStep = 0;
                                    answers = {};
                                    render();
                                };
                                return;
                            }

                            const q = questions[currentStep];
                            const qEl = document.createElement('div');
                            qEl.innerHTML = '<div style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">Question ' + (currentStep + 1) + '</div>' +
                                            '<h3 style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 0 0 20px 0;">' + q.question + '</h3>';
                            
                            const optsEl = document.createElement('div');
                            optsEl.style.cssText = "display: flex; flex-direction: column; gap: 10px;";
                            
                            if(q.options) {
                                q.options.forEach((opt, idx) => {
                                    const btn = document.createElement('button');
                                    btn.textContent = opt;
                                    btn.style.cssText = "padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; background: white; text-align: left; font-size: 14px; cursor: pointer; transition: all 0.2s; color: #475569;";
                                    
                                    const hasAnswered = answers[currentStep] !== undefined;
                                    if (hasAnswered) {
                                        if (idx === q.correctIndex) {
                                            btn.style.borderColor = '#22c55e';
                                            btn.style.backgroundColor = '#dcfce7';
                                            btn.style.color = '#14532d';
                                        } else if (idx === answers[currentStep]) {
                                            btn.style.borderColor = '#ef4444';
                                            btn.style.backgroundColor = '#fee2e2';
                                            btn.style.color = '#7f1d1d';
                                        }
                                    } else {
                                        btn.onmouseover = () => btn.style.borderColor = '#6366f1';
                                        btn.onmouseout = () => btn.style.borderColor = '#e2e8f0';
                                        btn.onclick = () => {
                                            answers[currentStep] = idx;
                                            render();
                                        };
                                    }
                                    optsEl.appendChild(btn);
                                });
                            }
                            qEl.appendChild(optsEl);
                            contentArea.appendChild(qEl);

                            if (answers[currentStep] !== undefined) {
                                const nextBtn = document.createElement('button');
                                nextBtn.textContent = (currentStep === questions.length - 1) ? "Voir Résultats" : "Suivant";
                                nextBtn.style.cssText = "margin-top: 20px; align-self: flex-end; padding: 8px 16px; background: #0f172a; color: white; border: none; border-radius: 6px; cursor: pointer;";
                                nextBtn.onclick = () => {
                                    currentStep++;
                                    render();
                                };
                                contentArea.appendChild(nextBtn);
                            }
                        }
                        render();
                    })();
                </script>
            `;

        default:
            return '';
    }
};

export const generateFlipbookHtml = (project: Project): string => {
    const { numberingMap, tocList } = computeStructure(project.pages);
    let standardPageCounter = 0;
    
    // Calculate total summary pages for pagination
    const summaryPagesCount = project.pages.filter(p => p.type === 'summary').length;
    let summaryPageCounter = 0;

    const pagesHtml = project.pages.map((page) => {
        let pageNumberLabel = '';
        if (page.type === 'standard') {
            standardPageCounter++;
            pageNumberLabel = `<div style="position: absolute; bottom: 16px; right: 16px; font-size: 12px; color: #94a3b8; font-family: sans-serif; z-index: 20;">${standardPageCounter}</div>`;
        }

        const bgCss = getPageBackgroundCss(page);
        
        // Generate elements with special handling for TOC slicing and pagination
        const elsHtml = (page.elements || []).map(el => {
            if (el.type === ElementType.TOC) {
                const start = summaryPageCounter * MAX_TOC_ITEMS;
                const slice = tocList.slice(start, start + MAX_TOC_ITEMS);
                summaryPageCounter++;
                // Pass pagination data: slice, current page (1-based), total pages
                return generateElementHTML(el, numberingMap, slice, summaryPageCounter, summaryPagesCount); 
            }
            return generateElementHTML(el, numberingMap, tocList);
        }).join('');

        // Force dimensions to A4 pixel size for the internal content, scaling will be handled by the library/wrapper.
        // Important: .page css class in HTML head also forces these dimensions.
        return `
        <div class="page" data-density="${page.type === 'cover' || page.type === 'back_cover' ? 'hard' : 'soft'}">
            <!-- Background Layer (Absolute to ensure coverage and z-indexing below content) -->
            <div class="page-background" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; ${bgCss}"></div>
            
            <!-- Content Layer -->
            <div class="page-content" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;">
                ${elsHtml}
            </div>
            ${pageNumberLabel}
        </div>
    `}).join('');

    // SVG Icons
    const iconPrev = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
    const iconNext = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
    const iconZoomIn = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>`;
    const iconZoomOut = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></svg>`;
    const iconTOC = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(project.name)} - Liseuse Interactive</title>
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
    
    <!-- Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/page-flip/dist/js/page-flip.browser.min.js"></script>
    
    <!-- ThreeJS for 3D Models -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>

    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #0f172a;
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', sans-serif;
            overflow: hidden;
            user-select: none;
        }

        .header-title {
            position: fixed;
            top: 20px;
            left: 20px;
            color: white;
            z-index: 100;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 600;
            opacity: 0.8;
            pointer-events: none;
        }

        /* Zoom Wrapper to allow scaling */
        #book-zoom-wrapper {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            transform-origin: center center;
            transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .flip-book {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        }

        /* Bottom Control Bar */
        .bottom-controls {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 8px 12px;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 200;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
            transition: all 0.3s;
        }
        
        .bottom-controls:hover {
            transform: translateX(-50%) translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }

        button.ctrl-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }

        button.ctrl-btn:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }

        button.ctrl-btn:active {
            transform: scale(0.95);
        }

        .page-counter {
            background: rgba(0,0,0,0.4);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            min-width: 80px;
            text-align: center;
            margin: 0 4px;
            font-variant-numeric: tabular-nums;
        }

        .divider {
            width: 1px;
            height: 20px;
            background: rgba(255,255,255,0.1);
            margin: 0 4px;
        }

        /* FORCE EXACT PAGE DIMENSIONS for fidelity */
        .page {
            width: ${A4_WIDTH_PX}px !important;
            height: ${A4_HEIGHT_PX}px !important;
            background-color: white;
            overflow: hidden;
        }
    </style>
</head>
<body>
    <div class="header-title">
        <span>${escapeHtml(project.name)}</span>
        <span style="font-size: 10px; background: rgba(255,255,255,0.1); padding: 2px 6px; rounded: 4px; color: #94a3b8;">${project.version}</span>
    </div>

    <div id="book-zoom-wrapper">
        <div id="book" class="flip-book">
            ${pagesHtml}
        </div>
    </div>

    <div class="bottom-controls">
        <button class="ctrl-btn" onclick="window.flipBook.flip(2)" title="Sommaire">
            ${iconTOC}
        </button>
        <div class="divider"></div>
        
        <button class="ctrl-btn" id="btnPrev" title="Page Précédente">
            ${iconPrev}
        </button>
        
        <div class="page-counter" id="pageCounter">
            ...
        </div>

        <button class="ctrl-btn" id="btnNext" title="Page Suivante">
            ${iconNext}
        </button>

        <div class="divider"></div>

        <button class="ctrl-btn" id="btnZoomOut" title="Zoom Arrière">
            ${iconZoomOut}
        </button>
        
        <button class="ctrl-btn" id="btnZoomIn" title="Zoom Avant">
            ${iconZoomIn}
        </button>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const pageFlip = new St.PageFlip(document.getElementById('book'), {
                width: ${A4_WIDTH_PX}, 
                height: ${A4_HEIGHT_PX},
                size: 'fixed',
                minWidth: 300,
                maxWidth: 2000,
                minHeight: 400,
                maxHeight: 2500,
                showCover: true,
                maxShadowOpacity: 0.5,
                mobileScrollSupport: false,
                usePortrait: false, // Force spread view even on smaller screens
                startPage: 0
            });

            const pages = document.querySelectorAll('.page');
            pageFlip.loadFromHTML(pages);
            
            // Expose globally
            window.flipBook = pageFlip;

            // --- Navigation ---
            document.getElementById('btnPrev').addEventListener('click', () => pageFlip.flipPrev());
            document.getElementById('btnNext').addEventListener('click', () => pageFlip.flipNext());

            // --- Page Counter ---
            const pageCounter = document.getElementById('pageCounter');
            
            const updatePageInfo = () => {
                const count = pageFlip.getPageCount();
                let idx = pageFlip.getCurrentPageIndex();
                const isPortrait = pageFlip.getOrientation() === 'portrait';
                
                // Adjust for cover page logic
                if (isPortrait || idx === 0) {
                     pageCounter.innerText = (idx + 1) + ' / ' + count;
                } else {
                     pageCounter.innerText = (idx + 1) + ' - ' + (idx + 2) + ' / ' + count;
                }
            };

            pageFlip.on('flip', (e) => {
                updatePageInfo();
            });
            
            pageFlip.on('init', () => {
                updatePageInfo();
            });

            // --- Auto-Scale Logic (Fit to Screen) ---
            let currentZoom = 1;
            const wrapper = document.getElementById('book-zoom-wrapper');
            const pageWidth = ${A4_WIDTH_PX};
            const pageHeight = ${A4_HEIGHT_PX};
            
            function resizeBook() {
                // Calculate scale to fit 2 pages (width * 2) in landscape or 1 page in strict portrait (though we try to force spread)
                const winW = window.innerWidth - 40; // margins
                const winH = window.innerHeight - 100; // controls space
                
                const totalWidth = pageWidth * 2; 
                const totalHeight = pageHeight;

                // Determine scale based on the most constraining dimension
                const scaleX = winW / totalWidth;
                const scaleY = winH / totalHeight;
                
                let scale = Math.min(scaleX, scaleY);
                
                // Cap max zoom to avoid pixelation
                if (scale > 1.2) scale = 1.2;
                
                currentZoom = scale;
                wrapper.style.transform = "scale(" + currentZoom + ")";
            }

            // Initial Resize
            resizeBook();
            window.addEventListener('resize', resizeBook);

            // --- Manual Zoom ---
            const zoomStep = 0.1;
            const maxZoom = 2.5;
            const minZoom = 0.2;

            document.getElementById('btnZoomIn').addEventListener('click', () => {
                if (currentZoom < maxZoom) {
                    currentZoom += zoomStep;
                    wrapper.style.transform = "scale(" + currentZoom + ")";
                }
            });

            document.getElementById('btnZoomOut').addEventListener('click', () => {
                if (currentZoom > minZoom) {
                    currentZoom -= zoomStep;
                    wrapper.style.transform = "scale(" + currentZoom + ")";
                }
            });
            
            // Add keyboard support
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') pageFlip.flipPrev();
                if (e.key === 'ArrowRight') pageFlip.flipNext();
            });
        });
    </script>
</body>
</html>
    `;
};
