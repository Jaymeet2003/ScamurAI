import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Button } from "../components/button";
import { Card } from "../components/card";
import { Container } from "../components/container";
import './landing.css';
import finalLogo from '../assets/finalLogo.png'; // Adjust the path as necessary
import 'bootstrap-icons/font/bootstrap-icons.css';

const Landing = () => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const starsRef = useRef([]);

  useEffect(() => {
    console.log("canvasRef", canvasRef.current); // Debugging canvasRef

    if (canvasRef.current) {
      // Clear any existing canvas before appending a new one
      while (canvasRef.current.firstChild) {
        canvasRef.current.removeChild(canvasRef.current.firstChild);
      }

      const initThree = () => {
        // Initialize the scene, camera, and renderer
        sceneRef.current = new THREE.Scene();
        cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraRef.current.position.z = 50;

        rendererRef.current = new THREE.WebGLRenderer({ alpha: true });
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        rendererRef.current.setClearColor(0x000000, 1);  // Set background color to black
        canvasRef.current.appendChild(rendererRef.current.domElement);

        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x4F46E5 });

        // Add stars to the scene
        for (let i = 0; i < 500; i++) {
          const star = new THREE.Mesh(geometry, material);
          const x = THREE.MathUtils.randFloatSpread(100);
          const y = THREE.MathUtils.randFloatSpread(100);
          const z = THREE.MathUtils.randFloatSpread(100);
          star.position.set(x, y, z);
          sceneRef.current.add(star);
          starsRef.current.push(star);
        }

        // Animation loop
        const animate = () => {
          requestAnimationFrame(animate);
          starsRef.current.forEach(star => {
            star.rotation.x += 0.005;
            star.rotation.y += 0.005;
          });

          // Smooth camera movement
          cameraRef.current.position.x = Math.sin(Date.now() * 0.0001) * 3;
          cameraRef.current.position.y = Math.cos(Date.now() * 0.0001) * 3;

          // Render the scene
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        };

        animate();
      };

      initThree();

      const handleResize = () => {
        if (cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = window.innerWidth / window.innerHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  const handleLogin = () => {
    window.location.href = 'http://localhost:5050/login';
  };

  return (
    <div className="landing-root">
      <div ref={canvasRef} className="three-background" />

      <div className="navbar">
        <div className="navbar-content">
          <img src={finalLogo} alt="ScamurAI Logo" className="brand-logo" /> {/* Logo with class for styling */}
        </div>
        <div className="navbar-logout">
          <button onClick = {handleLogin} className="navbar-logout-btn">Login</button>
        </div>
      </div>

            <main className="main-section">
        <Container>
          <div className="hero-section">
            <div className="hero-text">
              <h1 className="hero-title">
                Protect Yourself from <br />Scams with AI
              </h1>
              <p className="hero-description">
                ScamurAI uses advanced artificial intelligence to detect and prevent online scams in real-time. Stay safe with our cutting-edge technology.
              </p>
            </div>
      
            <div className="hero-image">
              <div className="cyber-border"></div>
            </div>
          </div>
      
          <div className="cyber-line"></div>
      
          <div className="features-section">
  {[
    {
      icon: "shield-check",
      title: "Real-time Protection",
      description: "Instant scanning and analysis of potential threats as they happen.",
    },
    {
      icon: "graph-up",
      title: "Smart Detection",
      description: "Advanced AI algorithms to identify sophisticated scam attempts.",
    },
    {
      icon: "phone",
      title: "Mobile Ready",
      description: "Protect yourself on any device, anywhere, anytime.",
    },
  ].map((feature, index) => (
    <Card key={index} className="feature-card">
      <div className="feature-icon">
        <i className={`bi bi-${feature.icon}`}></i> {/* Ensure the icon class is correct */}
      </div>
      <h3 className="feature-title">{feature.title}</h3>
      <p className="feature-description">{feature.description}</p>
    </Card>
  ))}
</div>
        </Container>
      </main>

      <footer className="footer mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-indigo-300">
            &copy; 2023 ScamurAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
