
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Loader2, AlertCircle } from 'lucide-react';

interface STLViewerProps {
  stlContent: string;
  backgroundColor?: string;
}

export const STLViewer: React.FC<STLViewerProps> = ({ stlContent, backgroundColor = '#f8fafc' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !stlContent) return;

    // Check dimensions to prevent crash
    if (container.clientWidth === 0 || container.clientHeight === 0) {
        return;
    }

    setLoading(true);
    setError(null);

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    
    // Handle Background
    if (backgroundColor === 'transparent' || backgroundColor === 'rgba(0,0,0,0)') {
        scene.background = null;
    } else {
        scene.background = new THREE.Color(backgroundColor);
    }

    // --- CAMERA ---
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000);
    camera.position.set(0, 0, 50); // Initial position, updated later

    // --- RENDERER ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    container.innerHTML = ''; 
    container.appendChild(renderer.domElement);

    // --- LIGHTING (Studio Setup) ---
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const backLight = new THREE.DirectionalLight(0x6366f1, 0.8); // Slight indigo rim light
    backLight.position.set(-10, 0, -20);
    scene.add(backLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(0, -10, 10);
    scene.add(fillLight);

    // --- CONTROLS ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enableZoom = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;

    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.Material | null = null;
    let mesh: THREE.Mesh | null = null;
    let animationId: number;

    // --- LOAD STL ---
    try {
      const loader = new STLLoader();
      
      // Clean content just in case
      let cleanContent = stlContent;
      if (cleanContent.toLowerCase().includes('solid') && cleanContent.includes('```')) {
          cleanContent = cleanContent.replace(/```(?:stl)?/gi, '').replace(/```/g, '').trim();
      }

      geometry = loader.parse(cleanContent);
      
      // Center Geometry
      geometry.computeBoundingBox();
      geometry.center();
      geometry.computeVertexNormals();

      // Material
      material = new THREE.MeshStandardMaterial({ 
        color: 0x6366f1, // Indigo Primary
        roughness: 0.4,
        metalness: 0.1,
        side: THREE.DoubleSide
      });
      
      mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      // Smart Camera Positioning based on Bounding Box
      const box = geometry.boundingBox;
      if (box) {
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Ensure the object isn't tiny or huge relative to camera
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2));
        cameraZ *= 2.0; // Zoom factor
        
        // Prevent camera being inside or too far
        camera.position.set(cameraZ, cameraZ * 0.5, cameraZ);
        camera.lookAt(0, 0, 0);
        
        // Adjust control limits
        controls.minDistance = maxDim * 0.5;
        controls.maxDistance = maxDim * 5;
      }

      scene.add(mesh);
      setLoading(false);

      // --- ANIMATION LOOP ---
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

    } catch (err) {
      console.error("Error parsing STL:", err);
      setError("Format 3D invalide ou corrompu.");
      setLoading(false);
    }

    // --- CLEANUP ---
    return () => {
        if (animationId) cancelAnimationFrame(animationId);
        
        if (container && renderer.domElement) {
            if (container.contains(renderer.domElement)) {
               container.removeChild(renderer.domElement);
            }
        }
        
        if (geometry) geometry.dispose();
        if (material) material.dispose();
        renderer.dispose();
    };
  }, [stlContent, backgroundColor]);

  return (
      <div className="w-full h-full relative group bg-transparent">
          <div ref={mountRef} className="w-full h-full cursor-move" />
          
          {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                  <Loader2 className="animate-spin text-indigo-600" size={24} />
              </div>
          )}
          
          {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-red-500 p-4 text-center z-20">
                  <AlertCircle size={24} className="mb-2" />
                  <p className="text-xs font-medium">{error}</p>
              </div>
          )}
      </div>
  );
};
